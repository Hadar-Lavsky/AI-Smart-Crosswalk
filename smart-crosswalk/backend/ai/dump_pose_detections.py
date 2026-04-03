"""
Batch-run YOLOv8-pose on all images in mocks_img/ and print full detection + keypoint data to the terminal.
"""

from __future__ import annotations

import os
import sys
from typing import Any

import numpy as np
from ultralytics import YOLO

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")

# COCO pose (17 keypoints) — names aligned with indices 0–16
COCO_KEYPOINT_NAMES: tuple[str, ...] = (
    "nose",
    "L_eye",
    "R_eye",
    "L_ear",
    "R_ear",
    "L_shoulder",
    "R_shoulder",
    "L_elbow",
    "R_elbow",
    "L_wrist",
    "R_wrist",
    "L_hip",
    "R_hip",
    "L_knee",
    "R_knee",
    "L_ankle",
    "R_ankle",
)


def _to_float_array(x: Any) -> np.ndarray:
    if hasattr(x, "detach"):
        x = x.detach().cpu().numpy()
    elif hasattr(x, "cpu"):
        x = x.cpu().numpy()
    return np.asarray(x, dtype=np.float64)


def print_keypoint_table(xy_conf_row: np.ndarray | None) -> None:
    """Print a fixed-width table for one person: shape (17, 3) -> x, y, conf per row."""
    header = (
        f"{'Idx':>4}  "
        f"{'Name':<14}  "
        f"{'X':>10}  "
        f"{'Y':>10}  "
        f"{'Conf':>8}"
    )
    print(header)
    print("  " + "-" * (len(header) - 2))

    if xy_conf_row is None or xy_conf_row.size == 0:
        print("  (no keypoint data)")
        return

    arr = xy_conf_row.reshape(-1, 3) if xy_conf_row.ndim == 1 else xy_conf_row
    if arr.shape[0] < 17:
        print(f"  (incomplete keypoints: got {arr.shape[0]} rows, expected 17)")
        return

    for i in range(17):
        name = COCO_KEYPOINT_NAMES[i] if i < len(COCO_KEYPOINT_NAMES) else f"kpt_{i}"
        x, y, c = float(arr[i, 0]), float(arr[i, 1]), float(arr[i, 2])
        print(
            f"{i:>4}  "
            f"{name:<14}  "
            f"{x:>10.2f}  "
            f"{y:>10.2f}  "
            f"{c:>8.4f}"
        )


def process_image_result(filename: str, r: Any) -> None:
    """Print all detections for one Results object."""
    boxes = r.boxes
    if boxes is None or len(boxes) == 0:
        print("  No persons detected.")
        print()
        return

    n = len(boxes)
    xyxy = _to_float_array(boxes.xyxy)
    confs = _to_float_array(boxes.conf).reshape(-1)

    kpts_data = None
    if r.keypoints is not None and r.keypoints.data is not None:
        kpts_data = _to_float_array(r.keypoints.data)

    for det_i in range(n):
        pct = 100.0 * float(confs[det_i])
        x1, y1, x2, y2 = xyxy[det_i].tolist()

        print(f"  --- Person {det_i + 1} / {n} ---")
        print(f"  Filename:              {filename}")
        print(f"  Detection confidence:  {pct:5.1f}%")
        print(
            f"  Bounding box (px):     "
            f"x1={x1:8.2f}  y1={y1:8.2f}  x2={x2:8.2f}  y2={y2:8.2f}"
        )
        print("  Keypoints (COCO 17):")
        row = None
        if kpts_data is not None and det_i < kpts_data.shape[0]:
            row = kpts_data[det_i]
        print_keypoint_table(row)
        print()


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    input_folder = os.path.join(script_dir, "mocks_img")
    model_path = os.path.join(script_dir, "yolov8n-pose.pt")

    if not os.path.isdir(input_folder):
        print(f"Input folder not found: {input_folder}", file=sys.stderr)
        sys.exit(1)

    try:
        model = YOLO(model_path)
    except Exception as e:
        print(f"Failed to load model {model_path}: {e}", file=sys.stderr)
        sys.exit(1)

    names = sorted(f for f in os.listdir(input_folder) if f.lower().endswith(IMAGE_EXTS))
    if not names:
        print("No image files found in mocks_img/.")
        return

    print(f"Model: {model_path}")
    print(f"Images: {len(names)} file(s) in {input_folder}")
    print()

    for filename in names:
        img_path = os.path.join(input_folder, filename)
        sep = "=" * 80
        print(sep)
        print(f"FILE: {filename}")
        print(sep)

        try:
            results = model.predict(source=img_path, verbose=False)
        except Exception as e:
            print(f"  ERROR during predict: {e}", file=sys.stderr)
            print()
            continue

        for r in results:
            process_image_result(filename, r)

    print("Done.")


if __name__ == "__main__":
    main()
