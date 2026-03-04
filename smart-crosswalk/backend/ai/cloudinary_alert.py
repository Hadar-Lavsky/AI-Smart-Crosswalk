"""
Upload image to Cloudinary and create alert in MongoDB using the secure_url.

Usage:
    python cloudinary_test.py --image path/to/image.jpg --danger-level HIGH
    python cloudinary_test.py --image path/to/image.jpg --camera-id <id>
"""

import os
import sys
import argparse
import json
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

DEFAULT_LOCATION = {
    'city': 'Tel Aviv',
    'street': 'Dizengoff',
    'number': '50'
}
DEFAULT_CAMERA_ID = '69617b55eb7ffca4f1000bb5'


def upload_to_cloudinary(image_path):
    """Upload image to Cloudinary and return secure_url."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")

    response = cloudinary.uploader.upload(image_path)
    return response["secure_url"]


def create_alert_with_url(image_url, camera_id=None, location=None, danger_level=None):
    """
    Create an alert in MongoDB using the Cloudinary secure_url (no binary upload).
    """
    try:
        data = {
            'imageUrl': image_url,
            'dangerLevel': (danger_level or 'MEDIUM').upper(),
            'location': json.dumps(location) if isinstance(location, dict) else location
        }
        if camera_id:
            data['cameraId'] = camera_id

        headers = {'Content-Type': 'application/json'}
        response = requests.post(API_URL, json=data, headers=headers)

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
    parser.add_argument('--danger-level', type=str, choices=['LOW', 'MEDIUM', 'HIGH'], help='Danger level')

    args = parser.parse_args()

    location = DEFAULT_LOCATION.copy()
    camera_id = args.camera_id or DEFAULT_CAMERA_ID

    print(f"\n📤 Uploading to Cloudinary...")
    print(f"   Image: {os.path.basename(args.image)}")
    print(f"   Danger: {args.danger_level or 'MEDIUM'}")

    try:
        secure_url = upload_to_cloudinary(args.image)
        print(f"   ✅ Cloudinary URL: {secure_url}")

        print(f"\n📤 Creating alert in MongoDB...")
        alert_id = create_alert_with_url(
            image_url=secure_url,
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
