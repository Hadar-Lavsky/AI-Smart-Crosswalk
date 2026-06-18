"""
inject_alerts.py — add the Train Images into production as scattered alerts.

It runs the v2 detector on every image in "Train Images", uploads each annotated
image to Cloudinary once, creates ONE new crosswalk (Holon, Golda Meir St), and
inserts ~TARGET_TOTAL alerts whose dates are scattered over the last 30 days.
APPEND ONLY — it never reads-and-modifies or deletes anything that exists.

Usage:
    python inject_alerts.py            # DRY RUN: detect + print the plan, write nothing
    python inject_alerts.py --commit   # upload to Cloudinary + insert the alerts
    python inject_alerts.py --commit --force   # insert even if the crosswalk already has alerts

Config — read from the environment, or a ".env" file next to this script:
    MONGODB_URI
    CLOUDINARY_CLOUD_NAME
    CLOUDINARY_API_KEY
    CLOUDINARY_API_SECRET

Needs: ultralytics, opencv-python, cloudinary, pymongo, python-dotenv
       (pip install pymongo  — the rest you already have)
"""

import os
import sys
import glob
import random
import datetime
from collections import Counter

def _load_dotenv():
    """Load KEY=VALUE lines from a .env next to this script (no dependency)."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    try:
        with open(path, encoding="utf-8-sig") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except FileNotFoundError:
        pass


_load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(HERE, "Train Images")
OUT_DIR = os.path.join(HERE, "Train Images_output")
MODEL_PATH = os.path.join(HERE, "yolov8n-pose.pt")

# -------- knobs --------
TARGET_TOTAL = 60                 # how many alerts to create from the images
SCATTER_DAYS = 30                 # dates spread across the last N days
CLOUDINARY_FOLDER = "smart-crosswalk/alerts"
CROSSWALK_LOCATION = {"city": "חולון", "street": "גולדה מאיר", "number": "1"}

# label -> danger level (same mapping the live alert script uses)
STATUS_TO_DANGER = {
    "CHILD - DANGER": "HIGH",
    "CHILD - LINKED": "MEDIUM",
    "ADULT - DISTRACTED": "MEDIUM",
    "ADULT - SAFE": "LOW",
}
PRIORITY = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}


def worst_level(statuses):
    """Worst danger level across everyone in the frame (no one -> LOW)."""
    if not statuses:
        return "LOW"
    return max((STATUS_TO_DANGER.get(s, "LOW") for s in statuses),
               key=lambda lvl: PRIORITY[lvl])


def run_detection():
    """Detect on each image; save annotated copy; return list of dicts."""
    import cv2
    from ultralytics import YOLO
    from process_mocks_yolo import process_frame  # reuse the calibrated rules

    os.makedirs(OUT_DIR, exist_ok=True)
    model = YOLO(MODEL_PATH)
    paths = sorted(glob.glob(os.path.join(IMG_DIR, "*.png")) +
                   glob.glob(os.path.join(IMG_DIR, "*.jpg")) +
                   glob.glob(os.path.join(IMG_DIR, "*.jpeg")))
    if not paths:
        sys.exit(f"No images in {IMG_DIR}")

    detected = []
    for p in paths:
        name = os.path.basename(p)
        for r in model.predict(source=p, verbose=False):
            h, w = r.orig_shape
            annotated, statuses = process_frame(r)
            out_path = os.path.join(OUT_DIR, name)
            cv2.imwrite(out_path, annotated)
            detected.append({"name": name, "level": worst_level(statuses),
                             "statuses": statuses, "out_path": out_path})
    return detected


def random_timestamp():
    now = datetime.datetime.utcnow()
    start = now - datetime.timedelta(days=SCATTER_DAYS)
    return start + (now - start) * random.random()


def build_plan(detected):
    """Round-robin the images up to TARGET_TOTAL, each with a scattered date."""
    n = len(detected)
    plan = []
    for i in range(TARGET_TOTAL):
        d = detected[i % n]
        plan.append({"name": d["name"], "level": d["level"],
                     "timestamp": random_timestamp()})
    return plan


def main():
    commit = "--commit" in sys.argv
    force = "--force" in sys.argv

    print("Running the detector on Train Images...\n")
    detected = run_detection()
    print("Per-image classification:")
    for d in detected:
        print(f"  {d['name']:30s} -> {d['level']:7s}  {d['statuses']}")

    plan = build_plan(detected)
    dist = Counter(p["level"] for p in plan)
    dates = sorted(p["timestamp"] for p in plan)
    loc = CROSSWALK_LOCATION
    print(f"\nPlan: {len(plan)} alerts on a NEW crosswalk "
          f"({loc['city']}, {loc['street']} {loc['number']})")
    print(f"  Levels: HIGH={dist['HIGH']}  MEDIUM={dist['MEDIUM']}  LOW={dist['LOW']}")
    print(f"  Dates : {dates[0].date()}  ..  {dates[-1].date()}")

    if not commit:
        print("\nDRY RUN — nothing was written. Re-run with --commit when it looks right.")
        return

    uri = os.environ.get("MONGODB_URI")
    cname = os.environ.get("CLOUDINARY_CLOUD_NAME")
    ckey = os.environ.get("CLOUDINARY_API_KEY")
    csec = os.environ.get("CLOUDINARY_API_SECRET")
    if not all([uri, cname, ckey, csec]):
        sys.exit("Missing env vars. Set MONGODB_URI and CLOUDINARY_CLOUD_NAME / "
                 "CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET (e.g. in a .env file).")

    # ---- upload each unique annotated image once ----
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(cloud_name=cname, api_key=ckey, api_secret=csec, secure=True)
    url_by_name = {}
    print("\nUploading annotated images to Cloudinary...")
    for d in detected:
        res = cloudinary.uploader.upload(d["out_path"], folder=CLOUDINARY_FOLDER)
        url_by_name[d["name"]] = res["secure_url"]
        print(f"  {d['name']} -> {res['secure_url']}")

    # ---- database (append only) ----
    from pymongo import MongoClient
    client = MongoClient(uri)
    db = client.get_default_database()
    now = datetime.datetime.utcnow()

    cw = db.crosswalks.find_one({
        "location.city": loc["city"],
        "location.street": loc["street"],
        "location.number": loc["number"],
    })
    if cw:
        crosswalk_id = cw["_id"]
        existing = db.alerts.count_documents({"crosswalkId": crosswalk_id})
        if existing and not force:
            sys.exit(f"This crosswalk already has {existing} alerts — re-running would "
                     f"duplicate them. Add --force only if you really want more.")
        print(f"\nReusing existing crosswalk {crosswalk_id}")
    else:
        cam = db.cameras.insert_one({"status": "active", "createdAt": now, "updatedAt": now, "__v": 0})
        led = db.leds.insert_one({"createdAt": now, "updatedAt": now, "__v": 0})
        cw_res = db.crosswalks.insert_one({
            "location": loc, "cameraId": cam.inserted_id, "ledId": led.inserted_id,
            "createdAt": now, "updatedAt": now, "__v": 0,
        })
        crosswalk_id = cw_res.inserted_id
        print(f"\nCreated crosswalk {crosswalk_id} ({loc['city']}, {loc['street']} {loc['number']})")

    docs = []
    for p in plan:
        ts = p["timestamp"]
    