"""
Batch-run YOLOv8-pose on images in mocks_img/ and save annotated frames to mocks_img_output/.

Traffic-light safety:
  - CHILD: bbox height < 20% of image height → red, "CHILD - DANGER".
  - ADULT: torso-relative hand lift ratio vs hips; ratio > 0.25 → yellow "ADULT - DISTRACTED", else green "ADULT - SAFE".
    Missing/low-confidence keypoints (5,6,9,10,11,12) → default SAFE for adults.
"""

from __future__ import annotations

import os
import sys
from typing import Any

import cv2
import numpy as np
from ultralytics import YOLO

# --- COCO pose indices ---
KPT_LEFT_SHOULDER = 5
KPT_RIGHT_SHOULDER = 6
KPT_LEFT_WRIST = 9
KPT_RIGHT_WRIST = 10
KPT_LEFT_HIP = 11
KPT_RIGHT_HIP = 12

# Indices required for adult distraction score (all must be conf >= threshold)
ADULT_SCORE_KPT_INDICES = (
    KPT_LEFT_SHOULDER,
    KPT_RIGHT_SHOULDER,
    KPT_LEFT_WRIST,
    KPT_RIGHT_WRIST,
    KPT_LEFT_HIP,
    KPT_RIGHT_HIP,
)

CHILD_HEIGHT_FRACTION = 0.20
KEYPOINT_CONF_THRESHOLD = 0.3
HAND_LIFT_DISTRACTED_THRESHOLD = 0.25
MIN_TORSO_HEIGHT_PX = 1e-3

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")

COLOR_CHILD = (0, 0, 255)
COLOR_DISTRACTED = (0, 255, 255)
COLOR_SAFE = (0, 255, 0)
COLOR_TEXT_BG = (40, 40, 40)

LABEL_CHILD = "CHILD - DANGER"
LABEL_DISTRACTED = "ADULT - DISTRACTED"
LABEL_SAFE = "ADULT - SAFE"


def _to_numpy_xy_conf(kpts_data: Any, det_idx: int) -> tuple[np.ndarray | None, np.ndarray | None]:
    try:
        row = kpts_data[det_idx]
    except (IndexError, TypeError):
        return None, None
    if row is None:
        return None, None

    arr = row
    if hasattr(arr, "detach"):
        arr = arr.detach().cpu().numpy()
    elif hasattr(arr, "cpu"):
        arr = arr.cpu().numpy()
    else:
        arr = np.asarray(arr)

    if arr.ndim != 2 or arr.shape[0] < 17:
        return None, None

    xy = arr[:, :2].astype(np.float32)
    conf = arr[:, 2].astype(np.float32) if arr.shape[1] >= 3 else np.ones(17, dtype=np.float32)
    return xy, conf


def bbox_height_px(xyxy: np.ndarray) -> float:
    return float(xyxy[3] - xyxy[1])


def adult_keypoints_sufficient(conf: np.ndarray) -> bool:
    """True if all joints needed for distraction score meet confidence threshold."""
    for i in ADULT_SCORE_KPT_INDICES:
        if i >= len(conf) or conf[i] < KEYPOINT_CONF_THRESHOLD:
            return False
    return True


def torso_height_L(xy: np.ndarray) -> float:
    """|avg(shoulder y) - avg(hip y)| in pixels."""
    sy = (float(xy[KPT_LEFT_SHOULDER, 1]) + float(xy[KPT_RIGHT_SHOULDER, 1])) / 2.0
    hy = (float(xy[KPT_LEFT_HIP, 1]) + float(xy[KPT_RIGHT_HIP, 1])) / 2.0
    return abs(sy - hy)


def max_hand_lift_ratio(xy: np.ndarray) -> float | None:
    """
    Hand lift ratio = (avg_hip_y - wrist_y) / L with L = torso height.
    Y=0 at top; larger hip_y - wrist_y means hand is higher in the frame.
    Returns None if L is degenerate.
    """
    L = torso_height_L(xy)
    if L < MIN_TORSO_HEIGHT_PX:
        return None
    avg_hip_y = (float(xy[KPT_LEFT_HIP, 1]) + float(xy[KPT_RIGHT_HIP, 1])) / 2.0
    r_l = (avg_hip_y - float(xy[KPT_LEFT_WRIST, 1])) / L
    r_r = (avg_hip_y - float(xy[KPT_RIGHT_WRIST, 1])) / L
    return max(r_l, r_r)


def classify_person(
    bbox_h: float,
    img_h: int,
    xy: np.ndarray | None,
    conf: np.ndarray | None,
) -> tuple[str, tuple[int, int, int]]:
    """Return (label, bgr_color)."""
    child_px = CHILD_HEIGHT_FRACTION * float(img_h)
    if bbox_h < child_px:
        return LABEL_CHILD, COLOR_CHILD

    if xy is None or conf is None or not adult_keypoints_sufficient(conf):
        return LABEL_SAFE, COLOR_SAFE

    ratio = max_hand_lift_ratio(xy)
    if ratio is None:
        return LABEL_SAFE, COLOR_SAFE

    if ratio > HAND_LIFT_DISTRACTED_THRESHOLD:
        return LABEL_DISTRACTED, COLOR_DISTRACTED
    return LABEL_SAFE, COLOR_SAFE


def draw_labeled_box(
    img: np.ndarray,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    label: str,
    color_bgr: tuple[int, int, int],
    line_thickness: int = 2,
) -> None:
    cv2.rectangle(img, (x1, y1), (x2, y2), color_bgr, line_thickness)
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.55
    thickness = 2
    (tw, th), baseline = cv2.getTextSize(label, font, font_scale, thickness)
    ty = max(y1 - 4, th + 6)
    cv2.rectangle(
        img,
        (x1, ty - th - 6),
        (x1 + tw + 8, ty + baseline - 2),
        COLOR_TEXT_BG,
        -1,
    )
    cv2.putText(img, label, (x1 + 4, ty - 4), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)


def process_frame(r: Any, img_h: int) -> tuple[np.ndarray, list[str]]:
    """
    Draw skeletons then custom safety boxes. Returns (annotated_bgr, per-person status labels).
    """
    annotated = r.plot(
        boxes=False,
        labels=False,
        conf=False,
        kpt_radius=2,
    )
    if annotated is None or not isinstance(annotated, np.ndarray):
        raise RuntimeError("result.plot() did not return a numpy image")

    statuses: list[str] = []
    boxes = r.boxes
    if boxes is None or len(boxes) == 0:
        return annotated, statuses

    xyxy_all = boxes.xyxy
    if hasattr(xyxy_all, "cpu"):
        xyxy_all = xyxy_all.cpu().numpy()
    else:
        xyxy_all = np.asarray(xyxy_all)

    kpts_data = r.keypoints.data if r.keypoints is not None else None

    for i in range(len(boxes)):
        xyxy = xyxy_all[i]
        x1, y1, x2, y2 = [int(round(v)) for v in xyxy]
        h_px = bbox_height_px(xyxy)

        xy, conf = (None, None)
        if kpts_data is not None:
            xy, conf = _to_numpy_xy_conf(kpts_data, i)

        label, color = classify_person(h_px, img_h, xy, conf)
        statuses.append(label)
        draw_labeled_box(annotated, x1, y1, x2, y2, label, color)

    return annotated, statuses


def print_image_summary(filename: str, statuses: list[str]) -> None:
    n = len(statuses)
    print(f"  File: {filename}")
    print(f"  People detected: {n}")
    if n == 0:
        print("  (no persons)")
        return
    for j, st in enumerate(statuses, start=1):
        print(f"    Person {j}: {st}")
    print()


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

    try:
        model = YOLO(model_path)
    except Exception as e:
        print(f"Failed to load model {model_path}: {e}", file=sys.stderr)
        sys.exit(1)

    print("YOLOv8-pose traffic-light batch")
    print(f"  Input:  {input_folder}")
    print(f"  Output: {output_folder}")
    print(
        f"  Child if bbox_h < {CHILD_HEIGHT_FRACTION:.0%} image height; "
        f"adult distraction if hand-lift ratio > {HAND_LIFT_DISTRACTED_THRESHOLD} "
        f"(keypoints {list(ADULT_SCORE_KPT_INDICES)} conf ≥ {KEYPOINT_CONF_THRESHOLD})."
    )
    print()

    names = sorted(f for f in os.listdir(input_folder) if f.lower().endswith(IMAGE_EXTS))
    if not names:
        print("No image files found.")
        return

    ok = 0
    for filename in names:
        img_path = os.path.join(input_folder, filename)
        try:
            results = model.predict(source=img_path, verbose=False)
        except Exception as e:
            print(f"SKIP predict: {filename} — {e}", file=sys.stderr)
            continue

        for r in results:
            try:
                img_h, _ = r.orig_shape
                im_array, statuses = process_frame(r, img_h)
            except Exception as e:
                print(f"SKIP process: {filename} — {e}", file=sys.stderr)
                break

            print_image_summary(filename, statuses)

            out_path = os.path.join(output_folder, filename)
            try:
                if not cv2.imwrite(out_path, im_array):
                    print(f"FAIL imwrite: {out_path}", file=sys.stderr)
                    continue
            except Exception as e:
                print(f"FAIL imwrite: {out_path} — {e}", file=sys.stderr)
                continue
            ok += 1

    print(f"Done. {ok}/{len(names)} image(s) saved to {output_folder}")


if __name__ == "__main__":
    main()
