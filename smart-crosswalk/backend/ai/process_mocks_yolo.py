"""
process_mocks_yolo.py — YOLOv8-pose traffic-light classifier (recalibrated).

Labels / colors / danger mapping (unchanged):
  CHILD - DANGER     red    -> HIGH
  CHILD - LINKED     orange -> MEDIUM   (child standing with an adult)
  ADULT - DISTRACTED yellow -> MEDIUM
  ADULT - SAFE       green  -> LOW

Recalibrated from real detections on the Train Images (all ~2089x753):
  1. CHILD test: box height < 44% of image height (was 20%). Children measured
     37-39% imgH, adults 48-60%, so 20% misread every child as an adult.
  2. ACCOMPANIMENT: a child is "linked" when an adult stands with them
     (boxes adjacent/overlapping + feet at similar depth), replacing the brittle
     "both inner wrists within 15px at >0.5 conf".
  3. CROSSWALK ZONE: people whose feet fall outside the crossing zone are
     treated as ADULT - SAFE. Front edge at y=0.853 sits between the at-crossing
     feet (<=0.845) and the not-near feet (>=0.861).
  4. DISTRACTION: also flags a bowed head (looking down at a phone), since a
     phone held low produces no "hand lift".

`process_frame(r)` derives the image size from the frame and returns
(annotated_image, status_labels) — the same 2-value contract the rest of the
AI module (e.g. main_with_live_alerts.py) already expects.

    python process_mocks_yolo.py            # processes ./mocks_img -> ./mocks_img_output
    python process_mocks_yolo.py <folder>   # processes a different folder
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
KPT_NOSE = 0
KPT_LEFT_SHOULDER = 5
KPT_RIGHT_SHOULDER = 6
KPT_LEFT_WRIST = 9
KPT_RIGHT_WRIST = 10
KPT_LEFT_HIP = 11
KPT_RIGHT_HIP = 12

ADULT_SCORE_KPT_INDICES = (
    KPT_LEFT_SHOULDER, KPT_RIGHT_SHOULDER,
    KPT_LEFT_WRIST, KPT_RIGHT_WRIST,
    KPT_LEFT_HIP, KPT_RIGHT_HIP,
)

# ------------------------- TUNABLE RULES -------------------------
# Child if bounding-box height is below this fraction of image height.
# (Calibrated: children 37-39% imgH, adults 48-60% imgH on this camera.)
CHILD_HEIGHT_FRACTION = 0.44

# Distraction (raised hand): wrist lifted above the hips by > this fraction of torso.
KEYPOINT_CONF_THRESHOLD = 0.3
HAND_LIFT_DISTRACTED_THRESHOLD = 0.25
MIN_TORSO_HEIGHT_PX = 20

# Distraction (looking down): nose low relative to the shoulders. head_up =
# (shoulder_y - nose_y) / torso; upright faces score high, bowed heads low.
# Applied only when the face is visible, so people facing away don't false-fire.
HEAD_DOWN_RATIO_THRESHOLD = 0.35
HEAD_VISIBLE_CONF = 0.40

# Accompaniment ("CHILD - LINKED"): an adult is "with" the child if their boxes
# are adjacent (gap <= this fraction of the adult's width; overlap = 0) AND their
# feet are within this fraction of image height in depth.
LINK_X_GAP_FRACTION = 0.60
LINK_FEET_DY_FRACTION = 0.12

# Optional neon wrist-to-wrist line drawn for linked children (cosmetic).
WRIST_LINE_CONF_THRESHOLD = 0.20

# Crosswalk danger-zone polygon in NORMALIZED (x/W, y/H) coords. Front edge at
# y=0.853 separates at-crossing feet (<=0.845) from not-near feet (>=0.861).
ZONE_POLYGON_NORM = [
    (0.26, 0.50),   # top-left (up the road)
    (0.66, 0.50),   # top-right
    (0.66, 0.853),  # front-right (near curb edge)
    (0.26, 0.853),  # front-left
]

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")

# BGR colors (unchanged)
COLOR_CHILD = (0, 0, 255)           # red
COLOR_CHILD_LINKED = (0, 165, 255)  # orange
COLOR_DISTRACTED = (0, 255, 255)    # yellow
COLOR_SAFE = (0, 255, 0)            # green
COLOR_ZONE = (255, 255, 0)          # cyan (zone outline)
LINE_NEON_MARKER = (0, 255, 255)

LABEL_CHILD = "CHILD - DANGER"
LABEL_CHILD_LINKED = "CHILD - LINKED"
LABEL_DISTRACTED = "ADULT - DISTRACTED"
LABEL_SAFE = "ADULT - SAFE"


@dataclass
class Person:
    xyxy: np.ndarray
    is_child: bool
    in_zone: bool
    xy: np.ndarray | None
    conf: np.ndarray | None


# ------------------------- geometry helpers -------------------------
def bbox_height_px(b: np.ndarray) -> float:
    return float(b[3] - b[1])


def bbox_width_px(b: np.ndarray) -> float:
    return float(b[2] - b[0])


def foot_point(b: np.ndarray) -> tuple[float, float]:
    """Bottom-center of the box = where the person stands."""
    return (float(b[0] + b[2]) / 2.0, float(b[3]))


def point_in_polygon(px: float, py: float, poly: list[tuple[float, float]]) -> bool:
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi):
            inside = not inside
        j = i
    return inside


def zone_polygon_px(w: int, h: int) -> list[tuple[int, int]]:
    return [(int(round(nx * w)), int(round(ny * h))) for nx, ny in ZONE_POLYGON_NORM]


def horizontal_gap(a: np.ndarray, b: np.ndarray) -> float:
    """0 if the boxes overlap in x, else the horizontal gap between them."""
    if a[2] < b[0]:
        return float(b[0] - a[2])
    if b[2] < a[0]:
        return float(a[0] - b[2])
    return 0.0


# ------------------------- keypoint helpers -------------------------
def to_numpy_xy_conf(kpts_data: Any, idx: int):
    try:
        row = kpts_data[idx]
    except (IndexError, TypeError):
        return None, None
    if row is None:
        return None, None
    arr = row.detach().cpu().numpy() if hasattr(row, "detach") else (
        row.cpu().numpy() if hasattr(row, "cpu") else np.asarray(row))
    if arr.ndim != 2 or arr.shape[0] < 17:
        return None, None
    xy = arr[:, :2].astype(np.float32)
    conf = arr[:, 2].astype(np.float32) if arr.shape[1] >= 3 else np.ones(17, np.float32)
    return xy, conf


def torso_height(xy: np.ndarray) -> float:
    sy = (float(xy[KPT_LEFT_SHOULDER, 1]) + float(xy[KPT_RIGHT_SHOULDER, 1])) / 2.0
    hy = (float(xy[KPT_LEFT_HIP, 1]) + float(xy[KPT_RIGHT_HIP, 1])) / 2.0
    return abs(sy - hy)


def adult_keypoints_sufficient(conf: np.ndarray) -> bool:
    return all(i < len(conf) and conf[i] >= KEYPOINT_CONF_THRESHOLD for i in ADULT_SCORE_KPT_INDICES)


def max_hand_lift_ratio(xy: np.ndarray):
    L = torso_height(xy)
    if L < MIN_TORSO_HEIGHT_PX:
        return None
    avg_hip_y = (float(xy[KPT_LEFT_HIP, 1]) + float(xy[KPT_RIGHT_HIP, 1])) / 2.0
    r_l = (avg_hip_y - float(xy[KPT_LEFT_WRIST, 1])) / L
    r_r = (avg_hip_y - float(xy[KPT_RIGHT_WRIST, 1])) / L
    return max(r_l, r_r)


def head_up_ratio(xy, conf):
    """How far the nose sits above the shoulder line, scaled by torso height.
    Returns (nose_conf, ratio | None)."""
    if xy is None or conf is None or len(conf) <= KPT_NOSE:
        return 0.0, None
    nose_c = float(conf[KPT_NOSE])
    for i in (KPT_LEFT_SHOULDER, KPT_RIGHT_SHOULDER, KPT_LEFT_HIP, KPT_RIGHT_HIP):
        if i >= len(conf) or conf[i] < KEYPOINT_CONF_THRESHOLD:
            return nose_c, None
    L = torso_height(xy)
    if L < MIN_TORSO_HEIGHT_PX:
        return nose_c, None
    avg_sh_y = (float(xy[KPT_LEFT_SHOULDER, 1]) + float(xy[KPT_RIGHT_SHOULDER, 1])) / 2.0
    return nose_c, (avg_sh_y - float(xy[KPT_NOSE, 1])) / L


def is_head_down(xy, conf) -> bool:
    nose_c, ratio = head_up_ratio(xy, conf)
    return nose_c >= HEAD_VISIBLE_CONF and ratio is not None and ratio < HEAD_DOWN_RATIO_THRESHOLD


def classify_adult(xy, conf):
    if xy is None or conf is None:
        return LABEL_SAFE, COLOR_SAFE
    if is_head_down(xy, conf):                      # looking down at a phone
        return LABEL_DISTRACTED, COLOR_DISTRACTED
    if adult_keypoints_sufficient(conf):            # hand raised (phone-to-ear)
        ratio = max_hand_lift_ratio(xy)
        if ratio is not None and ratio > HAND_LIFT_DISTRACTED_THRESHOLD:
            return LABEL_DISTRACTED, COLOR_DISTRACTED
    return LABEL_SAFE, COLOR_SAFE


# ------------------------- accompaniment (linking) -------------------------
def child_is_accompanied(child: Person, adults: list[Person], img_h: int):
    """A child is 'with' an in-zone adult standing beside them: boxes
    adjacent/overlapping in x AND feet at similar depth."""
    _, c_feet_y = foot_point(child.xyxy)
    for a in adults:
        if not a.in_zone:
            continue
        if horizontal_gap(child.xyxy, a.xyxy) > LINK_X_GAP_FRACTION * bbox_width_px(a.xyxy):
            continue
        _, a_feet_y = foot_point(a.xyxy)
        if abs(c_feet_y - a_feet_y) > LINK_FEET_DY_FRACTION * img_h:
            continue
        return a
    return None


def inner_wrist_points(child: Person, adult: Person):
    if child.xy is None or adult.xy is None or child.conf is None or adult.conf is None:
        return None
    c_cx = (child.xyxy[0] + child.xyxy[2]) / 2.0
    a_cx = (adult.xyxy[0] + adult.xyxy[2]) / 2.0
    ai, ci = (KPT_LEFT_WRIST, KPT_RIGHT_WRIST) if a_cx > c_cx else (KPT_RIGHT_WRIST, KPT_LEFT_WRIST)
    if adult.conf[ai] < WRIST_LINE_CONF_THRESHOLD or child.conf[ci] < WRIST_LINE_CONF_THRESHOLD:
        return None
    pa = (int(round(float(adult.xy[ai, 0]))), int(round(float(adult.xy[ai, 1]))))
    pc = (int(round(float(child.xy[ci, 0]))), int(round(float(child.xy[ci, 1]))))
    return pa, pc


# ------------------------- per-frame processing -------------------------
def process_frame(r: Any, *_ignored):
    """Classify everyone in one YOLO result. Returns (annotated_image, statuses).
    Image size is taken from the frame, so callers can pass just `r`."""
    img_h, img_w = r.orig_shape

    annotated = r.plot(boxes=False, labels=False, conf=False, kpt_radius=2)
    if annotated is None or not isinstance(annotated, np.ndarray):
        raise RuntimeError("result.plot() did not return an image")

    # draw the danger zone so it is visible
    poly = np.array(zone_polygon_px(img_w, img_h), dtype=np.int32)
    cv2.polylines(annotated, [poly], isClosed=True, color=COLOR_ZONE, thickness=2)

    statuses: list[str] = []
    boxes = r.boxes
    if boxes is None or len(boxes) == 0:
        return annotated, statuses

    xyxy_all = boxes.xyxy.cpu().numpy() if hasattr(boxes.xyxy, "cpu") else np.asarray(boxes.xyxy)
    kpts_data = r.keypoints.data if r.keypoints is not None else None

    people: list[Person] = []
    for i in range(len(boxes)):
        b = xyxy_all[i]
        fx, fy = foot_point(b)
        in_zone = point_in_polygon(fx / img_w, fy / img_h, list(ZONE_POLYGON_NORM))
        is_child = bbox_height_px(b) < CHILD_HEIGHT_FRACTION * float(img_h)
        xy, conf = (None, None)
        if kpts_data is not None:
            xy, conf = to_numpy_xy_conf(kpts_data, i)
        people.append(Person(xyxy=b, is_child=is_child, in_zone=in_zone, xy=xy, conf=conf))

    adults = [p for p in people if not p.is_child]

    for p in people:
        x1, y1, x2, y2 = (int(round(v)) for v in p.xyxy)
        line_seg = None

        if not p.in_zone:
            label, color = LABEL_SAFE, COLOR_SAFE          # outside the crossing
        elif p.is_child:
            adult = child_is_accompanied(p, adults, img_h)
            if adult is not None:
                label, color = LABEL_CHILD_LINKED, COLOR_CHILD_LINKED
                line_seg = inner_wrist_points(p, adult)
            else:
                label, color = LABEL_CHILD, COLOR_CHILD
        else:
            label, color = classify_adult(p.xy, p.conf)

        statuses.append(label)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        cv2.putText(annotated, label, (x1, max(0, y1 - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2, cv2.LINE_AA)
        if line_seg is not None:
            cv2.line(annotated, line_seg[0], line_seg[1], LINE_NEON_MARKER, 2, cv2.LINE_AA)

    return annotated, statuses


def main() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    in_dir = sys.argv[1] if len(sys.argv) > 1 else "mocks_img"
    if not os.path.isabs(in_dir):
        in_dir = os.path.join(here, in_dir)
    out_dir = in_dir.rstrip("/\\") + "_output"
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.isdir(in_dir):
        print(f"Input folder not found: {in_dir}", file=sys.stderr)
        sys.exit(1)

    model = YOLO(os.path.join(here, "yolov8n-pose.pt"))
    names = sorted(f for f in os.listdir(in_dir) if f.lower().endswith(IMAGE_EXTS))
    if not names:
        print("No images found.")
        return

    print(f"Input:  {in_dir}\nOutput: {out_dir}\n")
    for filename in names:
        for r in model.predict(source=os.path.join(in_dir, filename), verbose=False):
            annotated, statuses = process_frame(r)
            print(f"{filename}: {statuses if statuses else 'no persons'}")
            cv2.imwrite(os.path.join(out_dir, filename), annotated)
    print(f"\nDone. Annotated images in: {out_dir}")


if __name__ == "__main__":
    main()
