"""
Long-lived detection worker for Node.js orchestration (child_process).

Loads YOLO once, then reads image paths from stdin (one absolute/relative path per line).
For each path: YOLOv8-pose + process_mocks_yolo.process_frame → one JSON line on stdout.

Usage:
  python detect_frame_worker.py < detect_paths.txt
  # or: Node spawns with stdin pipe and writes paths line-by-line

Stdout (one line per input path):
  {"ok":true,"statuses":[...],"annotated_image_base64":"..."}
  or {"ok":false,"error":"..."}

Stderr: optional library noise only (orchestrator may log it).
"""

from __future__ import annotations

import base64
import json
import os
import sys

JPEG_QUALITY = 70
PREDICT_IMGSZ = 640


def emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def run_one(
    model,
    process_frame,
    cv2,
    img_path: str,
) -> None:
    img_path = os.path.abspath(img_path.strip())
    if not img_path:
        emit({"ok": False, "error": "empty path"})
        return

    if not os.path.isfile(img_path):
        emit({"ok": False, "error": f"file not found: {img_path}"})
        return

    try:
        results = model.predict(
            source=img_path,
            verbose=False,
            imgsz=PREDICT_IMGSZ,
        )
    except Exception as e:
        emit({"ok": False, "error": f"predict failed: {e}"})
        return

    if not results:
        emit({"ok": False, "error": "no inference results"})
        return

    for r in results:
        img_h, _ = r.orig_shape
        try:
            im_array, statuses = process_frame(r, img_h)
        except Exception as e:
            emit({"ok": False, "error": f"process_frame failed: {e}"})
            return

        enc_ok, encoded = cv2.imencode(
            ".jpg",
            im_array,
            [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY],
        )
        if not enc_ok:
            emit({"ok": False, "error": "failed to encode annotated image as JPEG"})
            return

        b64 = base64.b64encode(encoded.tobytes()).decode("ascii")
        emit(
            {
                "ok": True,
                "statuses": statuses,
                "annotated_image_base64": b64,
            }
        )
        return

    emit({"ok": False, "error": "empty results iterator"})


def main() -> int:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)

    os.chdir(script_dir)

    import cv2
    from ultralytics import YOLO

    from process_mocks_yolo import process_frame

    model_path = os.path.join(script_dir, "yolov8n-pose.pt")
    if not os.path.isfile(model_path):
        emit({"ok": False, "error": f"model not found: {model_path}"})
        return 1

    try:
        model = YOLO(model_path)
    except Exception as e:
        emit({"ok": False, "error": f"failed to load model: {e}"})
        return 1

    for line in sys.stdin:
        raw = line.strip()
        if not raw:
            continue
        run_one(model, process_frame, cv2, raw)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
