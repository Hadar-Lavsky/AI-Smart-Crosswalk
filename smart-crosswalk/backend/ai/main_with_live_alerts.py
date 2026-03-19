"""
YOLO detection with real-time alert sending to backend.

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
import cv2
from dotenv import load_dotenv

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

ALERTS_CLOUDINARY_FOLDER = "smart-crosswalk/alerts"

API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:3000/api/alerts')
API_BASE_URL = API_URL.rsplit('/api/alerts', 1)[0]
CROSSWALKS_URL = f"{API_BASE_URL}/api/crosswalks"
REQUEST_TIMEOUT_SECONDS = 10
RISK_HEIGHT_HIGH_THRESHOLD = 40
RISK_HEIGHT_MEDIUM_THRESHOLD = 20
ENABLE_DISTANCE_DEMO_VARIANTS = False
DISTANCE_DEMO_VARIANTS = [
    ("close", 1.00),
    ("medium", 0.70),
    ("far", 0.50),
]

RISK_DEMO_CASES = [
    {
        "name": "Single far pedestrian",
        "relative_height": 12.0,
        "num_detections": 1,
        "expected": "LOW",
    },
    {
        "name": "Single medium-distance pedestrian",
        "relative_height": 28.0,
        "num_detections": 1,
        "expected": "MEDIUM",
    },
    {
        "name": "Single very-close pedestrian",
        "relative_height": 47.0,
        "num_detections": 1,
        "expected": "HIGH",
    },
    {
        "name": "Crowded crosswalk",
        "relative_height": 19.0,
        "num_detections": 4,
        "expected": "HIGH",
    },
]

# Load model
model = YOLO('yolov8n-pose.pt')

def get_relative_height(box, image_height):
    """Get relative height percentage of bounding box"""
    # YOLO gives pixel coordinates; convert to percent of full frame height.
    x1, y1, x2, y2 = box.xyxy[0].tolist()
    bbox_height = y2 - y1
    return (bbox_height / image_height) * 100


def determine_danger_level(relative_height, num_detections):
    """
    Determine danger level based on pedestrian height and count.
    - HIGH: Person very close (>40% of image height) or multiple people detected
    - MEDIUM: Person at medium distance (20-40%)
    - LOW: Person far away (<20%)
    """
    if relative_height > RISK_HEIGHT_HIGH_THRESHOLD or num_detections > 2:
        return "HIGH"
    elif relative_height > RISK_HEIGHT_MEDIUM_THRESHOLD:
        return "MEDIUM"
    else:
        return "LOW"


def describe_danger_level(relative_height, num_detections):
    """Return level + short reason for logging/demo readability."""
    level = determine_danger_level(relative_height, num_detections)
    if level == "HIGH":
        if num_detections > 2:
            reason = f"multiple pedestrians detected ({num_detections})"
        else:
            reason = (
                "pedestrian too close "
                f"({relative_height:.1f}% > {RISK_HEIGHT_HIGH_THRESHOLD}%)"
            )
    elif level == "MEDIUM":
        reason = (
            "mid-range distance "
            f"({RISK_HEIGHT_MEDIUM_THRESHOLD}% - {RISK_HEIGHT_HIGH_THRESHOLD}%)"
        )
    else:
        reason = f"far distance ({relative_height:.1f}% <= {RISK_HEIGHT_MEDIUM_THRESHOLD}%)"

    return level, reason


def print_risk_demo_examples():
    """Print fixed examples so demos clearly show risk rule behavior."""
    print("\n🧪 Risk level demo examples (rule-based):")
    for case in RISK_DEMO_CASES:
        level, reason = describe_danger_level(
            case["relative_height"],
            case["num_detections"],
        )
        print(
            "   "
            f"- {case['name']}: "
            f"height={case['relative_height']}%, "
            f"count={case['num_detections']} "
            f"=> {level} ({reason})"
        )


def generate_distance_demo_frames(image_path):
    """Generate camera-distance variants from one frame for richer risk demos."""
    image = cv2.imread(image_path)
    if image is None:
        raise RuntimeError(f"Could not read image: {image_path}")

    h, w = image.shape[:2]
    variants = []

    for label, scale in DISTANCE_DEMO_VARIANTS:
        if scale >= 1.0:
            variants.append((label, image.copy()))
            continue

        resized_w = max(1, int(w * scale))
        resized_h = max(1, int(h * scale))
        resized = cv2.resize(image, (resized_w, resized_h), interpolation=cv2.INTER_AREA)

        canvas = cv2.GaussianBlur(image, (51, 51), 0)
        y_offset = (h - resized_h) // 2
        x_offset = (w - resized_w) // 2
        canvas[y_offset:y_offset + resized_h, x_offset:x_offset + resized_w] = resized
        variants.append((label, canvas))

    return variants


def resolve_target_crosswalk():
    """Pick a real crosswalk from the backend so alerts stay linked in the UI."""
    # We fetch existing crosswalks first so the alert appears in real frontend pages.
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
    """Send alert to backend via HTTP POST"""
    try:
        data = {
            'dangerLevel': danger_level.upper(),
        }
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
    """Process mock camera frames, then upload alert images to Cloudinary."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_folder = os.path.join(script_dir, 'mocks_img')

    if not os.path.exists(input_folder):
        print(f"❌ Input folder not found: {input_folder}")
        return

    configure_cloudinary_from_env()
    print_risk_demo_examples()

    target_crosswalk = resolve_target_crosswalk()
    target_crosswalk_id = target_crosswalk.get('_id')
    target_location = target_crosswalk.get('location')
    target_camera = target_crosswalk.get('cameraId') or {}
    target_camera_id = target_camera.get('_id') if isinstance(target_camera, dict) else target_camera

    print(f"\n🚀 Starting YOLO detection with live alerts...")
    print(f"📁 Camera-source frames (read-only): {input_folder}")
    print("🧠 No local output files are generated for detected alerts")
    print("☁️  Post-detection annotated frames are uploaded to Cloudinary")
    print(f"🌐 Backend URL: {API_URL}\n")
    print(
        "🎯 Target crosswalk: "
        f"{target_crosswalk_id} | "
        f"{target_location.get('city', '')}, {target_location.get('street', '')}, {target_location.get('number', '')}"
    )
    if target_camera_id:
        print(f"📷 Target camera: {target_camera_id}\n")

    run_summary = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    skipped_no_detection = 0

    for filename in sorted(os.listdir(input_folder)):
        if filename.endswith(('.jpg', '.jpeg', '.png')):
            img_path = os.path.join(input_folder, filename)

            frame_variants = [("raw", None)]
            if ENABLE_DISTANCE_DEMO_VARIANTS:
                frame_variants = generate_distance_demo_frames(img_path)

            for variant_label, variant_frame in frame_variants:
                source_name = (
                    filename
                    if variant_label == "raw"
                    else f"{os.path.splitext(filename)[0]}__{variant_label}.jpg"
                )

                print(f"\n📸 Processing: {source_name}")
                source = img_path if variant_frame is None else variant_frame
                results = model.predict(source=source)

                for r in results:
                    img_height, img_width = r.orig_shape
                    boxes = r.boxes
                    num_detections = len(boxes)

                    print(f"   Detected {num_detections} person(s)")

                    if num_detections == 0:
                        skipped_no_detection += 1
                        print("   ✓ No pedestrians detected -> no alert image uploaded")
                        continue

                    heights = []
                    for i, box in enumerate(boxes):
                        relative_height = get_relative_height(box, img_height)
                        heights.append(relative_height)
                        print(f"   Person {i+1}: {relative_height:.1f}% of image height")

                    # Determine overall danger level
                    max_height = max(heights)
                    danger_level, danger_reason = describe_danger_level(
                        max_height,
                        num_detections,
                    )

                    # Keep frame in memory and upload to cloud without local file writes.
                    im_array = r.plot(kpt_radius=1, line_width=1)

                    # Send alert for all detected pedestrians (LOW/MEDIUM/HIGH).
                    if danger_level in ["HIGH", "MEDIUM", "LOW"]:
                        run_summary[danger_level] += 1
                        alert_source_name = f"detected__{source_name}"
                        print(f"   ⚠️  {danger_level} danger detected ({danger_reason})")
                        print(f"   ☁️  Uploading annotated image to Cloudinary...")

                        try:
                            image_url = upload_alert_image_to_cloudinary(
                                im_array,
                                alert_source_name,
                            )
                            print(f"   ✅ Cloudinary URL ready")

                            print(f"   📤 Sending alert to backend (live)...")
                            # This API call triggers DB save and Socket.IO broadcast on backend.
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

                        # Small delay to see console output
                        time.sleep(0.5)

    print(
        "\n📊 Run summary by risk level: "
        f"HIGH={run_summary['HIGH']} | "
        f"MEDIUM={run_summary['MEDIUM']} | "
        f"LOW={run_summary['LOW']}"
    )
    print(f"📉 Frames without detections (not uploaded): {skipped_no_detection}")

    print(f"\n✅ All images processed!\n")


if __name__ == "__main__":
    try:
        process_folder_with_live_alerts()
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
