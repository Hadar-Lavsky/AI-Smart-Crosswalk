"""
YOLO detection with real-time alert sending to backend.

Process images from mocks_img folder, detect pedestrians,
and immediately send alerts for HIGH danger detections.

Usage:
    python main_with_live_alerts.py
"""

import os
import sys
import time
from urllib.parse import quote

import requests
# import cloudinary
# import cloudinary.uploader
from ultralytics import YOLO
import cv2
from dotenv import load_dotenv

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure Cloudinary (optional for testing)
# cloudinary.config(
#     cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
#     api_key=os.getenv("CLOUDINARY_API_KEY"),
#     api_secret=os.getenv("CLOUDINARY_API_SECRET"),
#     secure=True
# )

API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:3000/api/alerts')
API_BASE_URL = API_URL.rsplit('/api/alerts', 1)[0]
CROSSWALKS_URL = f"{API_BASE_URL}/api/crosswalks"
REQUEST_TIMEOUT_SECONDS = 10

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
    if relative_height > 40 or num_detections > 2:
        return "HIGH"
    elif relative_height > 20:
        return "MEDIUM"
    else:
        return "LOW"


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


def get_image_url_for_alert(output_filename):
    """Return a browser-accessible URL for the annotated YOLO output image."""
    return f"{API_BASE_URL}/api/images/{quote(output_filename)}"


def create_alert_on_backend(image_url, danger_level, crosswalk_id=None, location=None, camera_id=None):
    """Send alert to backend via HTTP POST"""
    try:
        data = {
            'imageUrl': image_url,
            'dangerLevel': danger_level.upper(),
        }
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
    """Process all images in mocks_img and send real-time alerts"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_folder = os.path.join(script_dir, 'mocks_img')
    output_folder = os.path.join(script_dir, 'mocks_img_output')

    if not os.path.exists(input_folder):
        print(f"❌ Input folder not found: {input_folder}")
        return

    os.makedirs(output_folder, exist_ok=True)

    target_crosswalk = resolve_target_crosswalk()
    target_crosswalk_id = target_crosswalk.get('_id')
    target_location = target_crosswalk.get('location')
    target_camera = target_crosswalk.get('cameraId') or {}
    target_camera_id = target_camera.get('_id') if isinstance(target_camera, dict) else target_camera

    print(f"\n🚀 Starting YOLO detection with live alerts...")
    print(f"📁 Input: {input_folder}")
    print(f"🌐 Backend URL: {API_URL}\n")
    print(
        "🎯 Target crosswalk: "
        f"{target_crosswalk_id} | "
        f"{target_location.get('city', '')}, {target_location.get('street', '')}, {target_location.get('number', '')}"
    )
    if target_camera_id:
        print(f"📷 Target camera: {target_camera_id}\n")

    for filename in sorted(os.listdir(input_folder)):
        if filename.endswith(('.jpg', '.jpeg', '.png')):
            img_path = os.path.join(input_folder, filename)

            print(f"\n📸 Processing: {filename}")
            results = model.predict(source=img_path)

            for r in results:
                img_height, img_width = r.orig_shape
                boxes = r.boxes
                num_detections = len(boxes)

                print(f"   Detected {num_detections} person(s)")

                if num_detections == 0:
                    print(f"   ✓ No pedestrians detected")
                    continue

                heights = []
                for i, box in enumerate(boxes):
                    relative_height = get_relative_height(box, img_height)
                    heights.append(relative_height)
                    print(f"   Person {i+1}: {relative_height:.1f}% of image height")

                # Determine overall danger level
                max_height = max(heights)
                danger_level = determine_danger_level(max_height, num_detections)

                # Save annotated image
                im_array = r.plot(kpt_radius=1, line_width=1)
                output_path = os.path.join(output_folder, filename)
                cv2.imwrite(output_path, im_array)

                # If danger detected, send real-time alert
                if danger_level in ["HIGH", "MEDIUM"]:
                    print(f"   ⚠️  {danger_level} danger detected!")
                    print(f"   📤 Preparing image URL...")

                    try:
                        image_url = get_image_url_for_alert(filename)
                        print(f"   ✅ Image ready")

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

    print(f"\n✅ All images processed!\n")


if __name__ == "__main__":
    try:
        process_folder_with_live_alerts()
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
