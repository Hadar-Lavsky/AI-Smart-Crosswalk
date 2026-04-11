"""
YOLO detection with real-time alert sending to backend.

Uses the updated process_mocks_yolo detection model:
  - CHILD - DANGER  -> HIGH alert
  - CHILD - LINKED  -> MEDIUM alert  (child holding adult's hand)
  - ADULT - DISTRACTED -> MEDIUM alert
  - ADULT - SAFE    -> LOW alert

Process images from mocks_img folder, detect pedestrians,
and immediately send alerts for detected risk levels.

Usage:
    python main_with_live_alerts.py
"""

import os
import sys
import time

import requests
import cloudinary
import cloudinary.uploader
from ultralytics import YOLO
from dotenv import load_dotenv

# Import the updated detection model
from process_mocks_yolo import process_frame, IMAGE_EXTS

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

ALERTS_CLOUDINARY_FOLDER = "smart-crosswalk/alerts"

API_URL = os.getenv('BACKEND_API_URL')
if not API_URL:
    print("⚠️  BACKEND_API_URL not set. Using default: http://localhost:3000/api/alerts")
    API_URL = 'http://localhost:3000/api/alerts'

API_BASE_URL = API_URL.rsplit('/api/alerts', 1)[0]
CROSSWALKS_URL = f"{API_BASE_URL}/api/crosswalks"
REQUEST_TIMEOUT_SECONDS = 10

# Map detection labels to danger levels
STATUS_TO_DANGER: dict[str, str] = {
    "CHILD - DANGER":     "HIGH",
    "CHILD - LINKED":     "MEDIUM",
    "ADULT - DISTRACTED": "MEDIUM",
    "ADULT - SAFE":       "LOW",
}

DANGER_PRIORITY = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}


def statuses_to_danger_level(statuses: list[str]) -> str:
    """Return the worst danger level across all detected persons in the frame."""
    if not statuses:
        return "LOW"
    levels = [STATUS_TO_DANGER.get(s, "LOW") for s in statuses]
    return max(levels, key=lambda l: DANGER_PRIORITY[l])


# Load model
model = YOLO(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'yolov8n-pose.pt'))


def resolve_target_crosswalk():
    """Pick a real crosswalk from the backend so alerts stay linked in the UI."""
    response = requests.get(CROSSWALKS_URL, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()

    crosswalks = response.json().get('data', [])
    if not crosswalks:
        raise RuntimeError('No crosswalks found in backend. Seed or create one first.')

    preferred_crosswalk_id = os.getenv('AI_CROSSWALK_ID')
    if preferred_crosswalk_id:
        for crosswalk in crosswalks:
            if crosswalk.get('_id') == preferred_crosswalk_id:
                return crosswalk

    for crosswalk in crosswalks:
        if crosswalk.get('cameraId'):
            return crosswalk

    return crosswalks[0]


def configure_cloudinary_from_env():
    """Configure Cloudinary from backend/.env and fail fast if credentials are missing."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
    api_key = os.getenv("CLOUDINARY_API_KEY", "").strip()
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip()

    missing = [
        key
        for key, value in [
            ("CLOUDINARY_CLOUD_NAME", cloud_name),
            ("CLOUDINARY_API_KEY", api_key),
            ("CLOUDINARY_API_SECRET", api_secret),
        ]
        if not value
    ]
    if missing:
        raise RuntimeError(
            f"Missing Cloudinary configuration: {', '.join(missing)}"
        )

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )


def upload_alert_image_to_cloudinary(image_array, source_name):
    """Upload annotated frame to Cloudinary directly from memory and return secure_url."""
    import cv2
    basename, _ = os.path.splitext(source_name)
    public_id = f"{basename}-{int(time.time() * 1000)}"

    success, encoded_image = cv2.imencode('.jpg', image_array)
    if not success:
        raise RuntimeError("Failed to encode image for Cloudinary upload")

    result = cloudinary.uploader.upload(
        encoded_image.tobytes(),
        folder=ALERTS_CLOUDINARY_FOLDER,
        public_id=public_id,
        overwrite=False,
        resource_type="image",
    )
    secure_url = result.get("secure_url")
    if not secure_url:
        raise RuntimeError("Cloudinary upload succeeded without secure_url")
    return secure_url


def create_alert_on_backend(image_url, danger_level, crosswalk_id=None, location=None, camera_id=None):
    """Send alert to backend via HTTP POST."""
    try:
        data = {'dangerLevel': danger_level.upper()}
        if image_url:
            data['imageUrl'] = image_url
        if crosswalk_id:
            data['crosswalkId'] = crosswalk_id
        elif location:
            data['location'] = location
        if camera_id:
            data['cameraId'] = camera_id

        response = requests.post(
            API_URL,
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )

        if response.status_code in [200, 201]:
            result = response.json()
            alert_id = result.get('data', {}).get('_id', 'N/A')
            return alert_id
        else:
            print(f"❌ Backend error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error sending alert: {str(e)}")
        return None


def process_folder_with_live_alerts():
    """Process mock camera frames using updated detection model, upload to Cloudinary, send alerts."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_folder = os.path.join(script_dir, 'mocks_img')

    if not os.path.exists(input_folder):
        print(f"❌ Input folder not found: {input_folder}")
        return

    configure_cloudinary_from_env()

    target_crosswalk = resolve_target_crosswalk()
    target_crosswalk_id = target_crosswalk.get('_id')
    target_location = target_crosswalk.get('location')
    target_camera = target_crosswalk.get('cameraId') or {}
    target_camera_id = target_camera.get('_id') if isinstance(target_camera, dict) else target_camera

    print(f"\n🚀 Starting YOLO detection with live alerts (updated model)...")
    print(f"📁 Camera-source frames: {input_folder}")
    print(f"🌐 Backend URL: {API_URL}")
    print(
        f"🎯 Target crosswalk: {target_crosswalk_id} | "
        f"{target_location.get('city', '')}, {target_location.get('street', '')}, {target_location.get('number', '')}"
    )
    if target_camera_id:
        print(f"📷 Target camera: {target_camera_id}")
    print()
    print("Detection labels:")
    print("  CHILD - DANGER     -> HIGH alert  (unaccompanied child)")
    print("  CHILD - LINKED     -> MEDIUM alert (child holding adult hand)")
    print("  ADULT - DISTRACTED -> MEDIUM alert (phone/raised hand)")
    print("  ADULT - SAFE       -> LOW alert")
    print()

    run_summary = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    skipped_no_detection = 0

    for filename in sorted(os.listdir(input_folder)):
        if not filename.lower().endswith(IMAGE_EXTS):
            continue

        img_path = os.path.join(input_folder, filename)
        print(f"\n📸 Processing: {filename}")

        try:
            results = model.predict(source=img_path, verbose=False)
        except Exception as e:
            print(f"   ❌ Predict error: {e}")
            continue

        for r in results:
            img_h, _ = r.orig_shape

            try:
                im_array, statuses = process_frame(r, img_h)
            except Exception as e:
                print(f"   ❌ Process error: {e}")
                continue

            num_detections = len(statuses)
            print(f"   Detected {num_detections} person(s)")

            if num_detections == 0:
                skipped_no_detection += 1
                print("   ✓ No pedestrians detected -> no alert sent")
                continue

            for i, st in enumerate(statuses):
                print(f"   Person {i+1}: {st}")

            danger_level = statuses_to_danger_level(statuses)
            print(f"   ⚠️  Frame danger level: {danger_level}")

            run_summary[danger_level] += 1

            try:
                print(f"   ☁️  Uploading annotated image to Cloudinary...")
                image_url = upload_alert_image_to_cloudinary(im_array, f"detected__{filename}")
                print(f"   ✅ Cloudinary URL ready")

                print(f"   📤 Sending alert to backend...")
                alert_id = create_alert_on_backend(
                    image_url=image_url,
                    danger_level=danger_level,
                    crosswalk_id=target_crosswalk_id,
                    location=target_location,
                    camera_id=target_camera_id,
                )

                if alert_id:
                    print(f"   ✅ Alert created (ID: {alert_id[:8]}...)")
                    print(f"   🔴 Frontend should update NOW in real-time!")
                else:
                    print(f"   ❌ Failed to create alert")

            except Exception as e:
                print(f"   ❌ Error: {str(e)}")

            time.sleep(0.5)

    print(
        f"\n📊 Run summary: "
        f"HIGH={run_summary['HIGH']} | "
        f"MEDIUM={run_summary['MEDIUM']} | "
        f"LOW={run_summary['LOW']}"
    )
    print(f"📉 Frames without detections: {skipped_no_detection}")
    print(f"\n✅ All images processed!\n")


if __name__ == "__main__":
    try:
        process_folder_with_live_alerts()
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
