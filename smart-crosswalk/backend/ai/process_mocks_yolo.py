"""
Batch-run YOLOv8-pose on images in mocks_img/ and save annotated frames to mocks_img_output/.

Traffic-light safety:
  - CHILD: bbox height < 20% of image height → red, "CHILD - DANGER".
  - CHILD + verified hand-holding with a nearby adult → orange, "CHILD - LINKED" (see linking passes below).
  - ADULT: torso-relative hand lift ratio; ratio > 0.25 → yellow "ADULT - DISTRACTED", else green "ADULT - SAFE".
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
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
MIN_TORSO_HEIGHT_PX = 20

# Protected child (hand-holding): Phase 3 — both wrists must be strictly > 0.5, d < 15 px
WRIST_LINK_CONF_THRESHOLD = 0.5
MAX_GRIP_DISTANCE_PX = 15.0

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")

COLOR_CHILD = (0, 0, 255)
COLOR_CHILD_LINKED = (0, 165, 255)  # orange BGR
COLOR_DISTRACTED = (0, 255, 255)
COLOR_SAFE = (0, 255, 0)
COLOR_TEXT_BG = (40, 40, 40)
LINE_NEON_MARKER = (0, 255, 255)  # neon / marker yellow BGR

LABEL_CHILD = "CHILD - DANGER"
LABEL_CHILD_LINKED = "CHILD - LINKED"
LABEL_DISTRACTED = "ADULT - DISTRACTED"
LABEL_SAFE = "ADULT - SAFE"


@dataclass
class PersonPass1:
    """One detection after height-based child vs adult split (Pass 1)."""
    xyxy: np.ndarray
    is_child: bool
    xy: np.ndarray | None
    conf: np.ndarray | None


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


def bbox_center_x(xyxy: np.ndarray) -> float:
    return float((xyxy[0] + xyxy[2]) / 2.0)


def bbox_intersection_area(a: np.ndarray, b: np.ndarray) -> float:
    """Axis-aligned intersection area; 0 if disjoint (Phase 1: no overlap → skip linking)."""
    ax1, ay1, ax2, ay2 = map(float, a)
    bx1, by1, bx2, by2 = map(float, b)
    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    return float((ix2 - ix1) * (iy2 - iy1))


def adult_keypoints_sufficient(conf: np.ndarray) -> bool:
    for i in ADULT_SCORE_KPT_INDICES:
        if i >= len(conf) or conf[i] < KEYPOINT_CONF_THRESHOLD:
            return False
    return True


def torso_height_L(xy: np.ndarray) -> float:
    sy = (float(xy[KPT_LEFT_SHOULDER, 1]) + float(xy[KPT_RIGHT_SHOULDER, 1])) / 2.0
    hy = (float(xy[KPT_LEFT_HIP, 1]) + float(xy[KPT_RIGHT_HIP, 1])) / 2.0
    return abs(sy - hy)


def max_hand_lift_ratio(xy: np.ndarray) -> float | None:
    L = torso_height_L(xy)
    if L < MIN_TORSO_HEIGHT_PX:
        return None
    avg_hip_y = (float(xy[KPT_LEFT_HIP, 1]) + float(xy[KPT_RIGHT_HIP, 1])) / 2.0
    r_l = (avg_hip_y - float(xy[KPT_LEFT_WRIST, 1])) / L
    r_r = (avg_hip_y - float(xy[KPT_RIGHT_WRIST, 1])) / L
    return max(r_l, r_r)


def classify_adult(
    xy: np.ndarray | None,
    conf: np.ndarray | None,
) -> tuple[str, tuple[int, int, int]]:
    if xy is None or conf is None or not adult_keypoints_sufficient(conf):
        return LABEL_SAFE, COLOR_SAFE
    ratio = max_hand_lift_ratio(xy)
    if ratio is None:
        return LABEL_SAFE, COLOR_SAFE
    if ratio > HAND_LIFT_DISTRACTED_THRESHOLD:
        return LABEL_DISTRACTED, COLOR_DISTRACTED
    return LABEL_SAFE, COLOR_SAFE


def opposite_hands_indices(cx_adult: float, cx_child: float) -> tuple[int, int]:
    """
    Phase 2 — target pair (adult wrist idx, child wrist idx).
    A: X_adult < X_child → adult R wrist (10), child L wrist (9).
    B: X_adult > X_child → adult L wrist (9), child R wrist (10).
    Equal X centers: use Scenario A (deterministic tie-break; spec covers only < and >).
    """
    if cx_adult < cx_child:
        return KPT_RIGHT_WRIST, KPT_LEFT_WRIST
    if cx_adult > cx_child:
        return KPT_LEFT_WRIST, KPT_RIGHT_WRIST
    return KPT_RIGHT_WRIST, KPT_LEFT_WRIST


def try_validate_hand_link(adult: PersonPass1, child: PersonPass1) -> tuple[tuple[int, int], tuple[int, int]] | None:
    """
    Preconditions: caller ensures child/adult bboxes already overlap (Phase 1 ROI).
    Phase 2–3: opposite hands, conf > 0.5, Euclidean d < 15.
    Returns ((xa, ya), (xc, yc)) for drawing. None if not validated.
    """
    if adult.xy is None or adult.conf is None or child.xy is None or child.conf is None:
        return None

    cx_a = bbox_center_x(adult.xyxy)
    cx_c = bbox_center_x(child.xyxy)
    ia, ic = opposite_hands_indices(cx_a, cx_c)

    if ia >= len(adult.conf) or ic >= len(child.conf):
        return None
    # Strictly greater than 0.5 per spec
    if not (adult.conf[ia] > WRIST_LINK_CONF_THRESHOLD and child.conf[ic] > WRIST_LINK_CONF_THRESHOLD):
        return None

    ax, ay = float(adult.xy[ia, 0]), float(adult.xy[ia, 1])
    cx, cy = float(child.xy[ic, 0]), float(child.xy[ic, 1])
    d = float(np.sqrt((cx - ax) ** 2 + (cy - ay) ** 2))
    if d >= MAX_GRIP_DISTANCE_PX:
        return None

    return (int(round(ax)), int(round(ay))), (int(round(cx)), int(round(cy)))


def pass2_link_children(
    people: list[PersonPass1],
    child_indices: list[int],
    adult_indices: list[int],
) -> tuple[set[int], list[tuple[tuple[int, int], tuple[int, int]] | None]]:
    """
    For each child, only consider overlapping adults; first validating adult wins.
    Returns linked child indices and line endpoints per detection index (None if not linked).
    """
    n = len(people)
    linked: set[int] = set()
    lines: list[tuple[tuple[int, int], tuple[int, int]] | None] = [None] * n

    for ci in child_indices:
        if not people[ci].is_child:
            continue
        child = people[ci]
        # ROI: only adults whose box overlaps this child (skip distance work otherwise)
        overlapping_adults = [
            ai
            for ai in adult_indices
            if bbox_intersection_area(people[ai].xyxy, child.xyxy) > 0.0
        ]
        for ai in overlapping_adults:
            pts = try_validate_hand_link(people[ai], child)
            if pts is not None:
                linked.add(ci)
                lines[ci] = pts
                break

    return linked, lines


def final_label_and_color(
    idx: int,
    person: PersonPass1,
    linked_children: set[int],
) -> tuple[str, tuple[int, int, int]]:
    if person.is_child:
        if idx in linked_children:
            return LABEL_CHILD_LINKED, COLOR_CHILD_LINKED
        return LABEL_CHILD, COLOR_CHILD
    return classify_adult(person.xy, person.conf)


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
    Pass 1: classify each detection as child/adult; gather bbox + keypoints into `people`,
            plus explicit `child_indices` and `adult_indices` lists.
    Pass 2: for each child, overlapping adults only → opposite hands → conf + distance.
    Pass 3: skeleton, boxes/labels, neon wrist–wrist lines for LINKED children.
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

    # --- Pass 1: gathering + two index lists (children / adults) ---
    people: list[PersonPass1] = []
    child_indices: list[int] = []
    adult_indices: list[int] = []

    for i in range(len(boxes)):
        xyxy = xyxy_all[i]
        h_px = bbox_height_px(xyxy)
        is_ch = h_px < CHILD_HEIGHT_FRACTION * float(img_h)
        xy, conf = (None, None)
        if kpts_data is not None:
            xy, conf = _to_numpy_xy_conf(kpts_data, i)
        people.append(PersonPass1(xyxy=xyxy, is_child=is_ch, xy=xy, conf=conf))
        if is_ch:
            child_indices.append(i)
        else:
            adult_indices.append(i)

    # --- Pass 2: linking (overlap gates distance math) ---
    linked_children, line_segments = pass2_link_children(people, child_indices, adult_indices)

    # --- Pass 3: boxes + labels, then neon lines ---
    for i in range(len(people)):
        p = people[i]
        xyxy = p.xyxy
        x1, y1, x2, y2 = [int(round(v)) for v in xyxy]
        label, color = final_label_and_color(i, p, linked_children)
        statuses.append(label)
        draw_labeled_box(annotated, x1, y1, x2, y2, label, color)

    for seg in line_segments:
        if seg is None:
            continue
        pa, pc = seg
        cv2.line(annotated, pa, pc, LINE_NEON_MARKER, 2, cv2.LINE_AA)

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

    print("YOLOv8-pose traffic-light + CHILD - LINKED (hand-holding)")
    print(f"  Input:  {input_folder}")
    print(f"  Output: {output_folder}")
    print(
        f"  Link: bbox overlap + opposite wrists (X-adult vs X-child) + "
        f"wrist conf > {WRIST_LINK_CONF_THRESHOLD} + distance < {MAX_GRIP_DISTANCE_PX} px."
    )
    print(
        f"  Child: bbox_h < {CHILD_HEIGHT_FRACTION:.0%} image height | "
        f"Adult distraction: hand-lift ratio > {HAND_LIFT_DISTRACTED_THRESHOLD} "
        f"(kpts {list(ADULT_SCORE_KPT_INDICES)} conf ≥ {KEYPOINT_CONF_THRESHOLD})."
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
