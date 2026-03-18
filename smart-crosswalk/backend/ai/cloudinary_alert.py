"""
Upload image to Cloudinary and create alert in MongoDB using the secure_url.

Usage:
    python cloudinary_test.py --image path/to/image.jpg --danger-level HIGH
    python cloudinary_test.py --image path/to/image.jpg --camera-id <id>
"""

import os
import sys
import argparse
import requests
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:3000/api/alerts')
API_BASE_URL = API_URL.rsplit('/api/alerts', 1)[0]
CROSSWALKS_URL = f"{API_BASE_URL}/api/crosswalks"
REQUEST_TIMEOUT_SECONDS = 10


def upload_to_cloudinary(image_path):
    """Upload image to Cloudinary and return secure_url."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")

    response = cloudinary.uploader.upload(image_path)
    return response["secure_url"]


def resolve_target_crosswalk(preferred_crosswalk_id=None):
    """Pick a real crosswalk from the backend so alert payloads are linked."""
    response = requests.get(CROSSWALKS_URL, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()

    crosswalks = response.json().get('data', [])
    if not crosswalks:
        raise RuntimeError('No crosswalks found in backend. Seed or create one first.')

    if preferred_crosswalk_id:
        for crosswalk in crosswalks:
            if crosswalk.get('_id') == preferred_crosswalk_id:
                return crosswalk

    for crosswalk in crosswalks:
        if crosswalk.get('cameraId'):
            return crosswalk

    return crosswalks[0]


def create_alert_with_url(image_url, crosswalk_id=None, camera_id=None, location=None, danger_level=None):
    """
    Create an alert in MongoDB using the Cloudinary secure_url (no binary upload).
    """
    try:
        data = {
            'imageUrl': image_url,
            'dangerLevel': (danger_level or 'MEDIUM').upper(),
        }
        if crosswalk_id:
            data['crosswalkId'] = crosswalk_id
        elif location:
            data['location'] = location
        if camera_id:
            data['cameraId'] = camera_id

        headers = {'Content-Type': 'application/json'}
        response = requests.post(API_URL, json=data, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)

        if response.status_code in [200, 201]:
            result = response.json()
            alert_data = result.get('data', {}) or result
            alert_id = alert_data.get('_id', 'N/A')
            return alert_id
        else:
            print(f"❌ Backend Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Error creating alert: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def main():
    parser = argparse.ArgumentParser(
        description='Upload image to Cloudinary and create alert in MongoDB using secure_url'
    )
    parser.add_argument('--image', type=str, required=True, help='Path to image file')
    parser.add_argument('--camera-id', type=str, help='Camera ID (optional)')
    parser.add_argument('--crosswalk-id', type=str, help='Crosswalk ID (optional)')
    parser.add_argument('--danger-level', type=str, choices=['LOW', 'MEDIUM', 'HIGH'], help='Danger level')

    args = parser.parse_args()

    target_crosswalk = resolve_target_crosswalk(args.crosswalk_id or os.getenv('AI_CROSSWALK_ID'))
    location = target_crosswalk.get('location')
    target_camera = target_crosswalk.get('cameraId') or {}
    resolved_camera_id = target_camera.get('_id') if isinstance(target_camera, dict) else target_camera
    camera_id = args.camera_id or resolved_camera_id

    print(f"\n📤 Uploading to Cloudinary...")
    print(f"   Image: {os.path.basename(args.image)}")
    print(f"   Danger: {args.danger_level or 'MEDIUM'}")
    print(f"   Crosswalk: {target_crosswalk.get('_id')}")
    if camera_id:
        print(f"   Camera: {camera_id}")

    try:
        secure_url = upload_to_cloudinary(args.image)
        print(f"   ✅ Cloudinary URL: {secure_url}")

        print(f"\n📤 Creating alert in MongoDB...")
        alert_id = create_alert_with_url(
            image_url=secure_url,
            crosswalk_id=target_crosswalk.get('_id'),
            camera_id=camera_id,
            location=location,
            danger_level=args.danger_level
        )

        if alert_id:
            print(f"\n✅ Alert saved in MongoDB successfully!")
            print(f"   DB ID: {alert_id}")
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
