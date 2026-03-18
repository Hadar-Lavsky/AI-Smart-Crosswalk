import json
import os
from datetime import datetime

import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ENV_PATH = os.path.join(SCRIPT_DIR, "..", ".env")
INPUT_DIRS = [
    os.path.join(SCRIPT_DIR, "mocks_img"),
    os.path.join(SCRIPT_DIR, "mocks_img_output"),
]
REPORT_PATH = os.path.join(SCRIPT_DIR, "cloudinary_upload_report.json")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def load_configuration():
    load_dotenv(BACKEND_ENV_PATH)

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
        raise RuntimeError(f"Missing Cloudinary configuration: {', '.join(missing)}")

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )


def collect_images():
    image_paths = []
    for folder in INPUT_DIRS:
        if not os.path.isdir(folder):
            continue

        for name in sorted(os.listdir(folder)):
            full_path = os.path.join(folder, name)
            ext = os.path.splitext(name)[1].lower()
            if os.path.isfile(full_path) and ext in ALLOWED_EXTENSIONS:
                image_paths.append(full_path)

    # Keep unique paths while preserving order.
    seen = set()
    unique = []
    for path in image_paths:
        if path in seen:
            continue
        seen.add(path)
        unique.append(path)

    return unique


def upload_images(paths):
    uploaded = []
    failed = []

    for path in paths:
        basename = os.path.basename(path)
        folder = "smart-crosswalk"
        public_id = os.path.splitext(basename)[0]

        try:
            result = cloudinary.uploader.upload(
                path,
                folder=folder,
                public_id=public_id,
                overwrite=True,
                resource_type="image",
            )
            uploaded.append(
                {
                    "fileName": basename,
                    "sourcePath": path,
                    "publicId": result.get("public_id"),
                    "secureUrl": result.get("secure_url"),
                    "bytes": result.get("bytes"),
                    "format": result.get("format"),
                }
            )
        except Exception as exc:
            failed.append({"fileName": basename, "sourcePath": path, "error": str(exc)})

    return uploaded, failed


def write_report(uploaded, failed):
    report = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "uploadedCount": len(uploaded),
        "failedCount": len(failed),
        "uploaded": uploaded,
        "failed": failed,
    }

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)


def main():
    load_configuration()
    paths = collect_images()
    if not paths:
        raise RuntimeError("No project images found to upload.")

    uploaded, failed = upload_images(paths)
    write_report(uploaded, failed)

    print(f"Uploaded: {len(uploaded)}")
    print(f"Failed: {len(failed)}")
    print(f"Report: {REPORT_PATH}")


if __name__ == "__main__":
    main()
