"""
Batch-run YOLO pose on all images in mocks_img/ and save annotated frames to mocks_img_output/.
Same pipeline as main.py, without per-person console stats.
"""
import os
import sys

import cv2
from ultralytics import YOLO

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    input_folder = os.path.join(script_dir, "mocks_img")
    output_folder = os.path.join(script_dir, "mocks_img_output")
    model_path = os.path.join(script_dir, "yolov8n-pose.pt")

    os.makedirs(output_folder, exist_ok=True)

    if not os.path.isdir(input_folder):
        print(f"Input folder not found: {input_folder}", file=sys.stderr)
        sys.exit(1)

    model = YOLO(model_path)
    print(f"Processing: {input_folder} -> {output_folder}")

    names = sorted(
        f for f in os.listdir(input_folder) if f.lower().endswith(IMAGE_EXTS)
    )
    if not names:
        print("No image files found.")
        return

    for filename in names:
        img_path = os.path.join(input_folder, filename)
        results = model.predict(source=img_path, verbose=False)
        for r in results:
            im_array = r.plot(kpt_radius=1, line_width=1)
            out_path = os.path.join(output_folder, filename)
            cv2.imwrite(out_path, im_array)
        print(f"  OK: {filename}")

    print(f"Done. {len(names)} image(s) written to {output_folder}")


if __name__ == "__main__":
    main()
