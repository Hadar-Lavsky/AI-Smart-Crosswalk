"""
Single-frame detection worker for Node.js orchestration (child_process).

Reads one image path from argv, runs YOLOv8-pose + process_mocks_yolo.process_frame,
writes a single JSON object to stdout (annotated JPEG as base64 + statuses).

Usage:
  python detect_frame_worker.py /absolute/path/to/frame.jpg

Stdout: one line JSON — {"ok":true,"statuses":[...],"annotated_image_base64":"..."}
Errors: {"ok":false,"error":"..."} with exit code 1
"""

from __future__ import annotations

import base64
import json
import os
import sys


def emit(payload: dict) -> None:
    print(json.dumps(payload), flush=True)


def main() -> int:
    if len(sys.argv) < 2:
        emit({"ok": False, "error": "usage: detect_frame_worker.py <image_path>"})
        return 1

    img_path = os.path.abspath(sys.argv[1])
    if not os.path.isfile(img_path):
        emit({"ok": False, "error": f"file not found: {img_path}"})
        return 1

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
        results = model.predict(source=img_path, verbose=False)
    except Exception as e:
        emit({"ok": False, "error": f"predict failed: {e}"})
        return 1

    if not results:
        emit({"ok": False, "error": "no inference results"})
        return 1

    for r in results:
        img_h, _ = r.orig_shape
        try:
            im_array, statuses = process_frame(r, img_h)
        except Exception as e:
            emit({"ok": False, "error": f"process_frame failed: {e}"})
            return 1

        ok, encoded = cv2.imencode(".jpg", im_array)
        if not ok:
            emit({"ok": False, "error": "failed to encode annotated image as JPEG"})
            return 1

        b64 = base64.b64encode(encoded.tobytes()).decode("ascii")
        emit(
            {
                "ok": True,
                "statuses": statuses,
                "annotated_image_base64": b64,
            }
        )
        return 0

    emit({"ok": False, "error": "empty results iterator"})
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
