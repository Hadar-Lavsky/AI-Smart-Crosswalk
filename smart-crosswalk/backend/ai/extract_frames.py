"""
extract_frames.py — Extract frames from a video for YOLO analysis

This script takes a video file (e.g., an AI-generated crosswalk simulation from Gemini)
and extracts individual frames as JPEG images for processing with the YOLO detection pipeline.

Usage:
    python extract_frames.py video.mp4              # Extract every 10th frame (default)
    python extract_frames.py video.mp4 --every 5    # Extract every 5th frame
    python extract_frames.py video.mp4 --fps 2      # Extract 2 frames per second
    python extract_frames.py video.mp4 -o mocks_img # Save directly to mocks_img folder
"""

import cv2
import os
import argparse


def extract_frames(video_path, output_dir="extracted_frames", every_n=None, target_fps=None):
    """
    Extract frames from a video file.

    Args:
        video_path: Path to the input video file (.mp4)
        output_dir: Directory to save extracted frames
        every_n: Extract every Nth frame (e.g., every_n=10 means 1 frame per 10)
        target_fps: Extract this many frames per second (alternative to every_n)

    Returns:
        Number of frames saved, or 0 if video could not be opened
    """
    # Open the video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video '{video_path}'")
        return 0

    # Get video properties
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / video_fps if video_fps > 0 else 0

    print(f"Video: {video_path}")
    print(f"  Resolution: {width}x{height}")
    print(f"  FPS: {video_fps:.1f}")
    print(f"  Total frames: {total_frames}")
    print(f"  Duration: {duration:.1f} seconds")
    print()

    # Calculate frame interval
    if target_fps:
        every_n = max(1, int(video_fps / target_fps))
        print(f"  Extracting at {target_fps} FPS (every {every_n} frames)")
    elif every_n is None:
        every_n = 10  # Default: every 10th frame
        print(f"  Extracting every {every_n}th frame")
    else:
        print(f"  Extracting every {every_n}th frame")

    expected_output = total_frames // every_n
    print(f"  Expected output: ~{expected_output} frames")

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Extract frames
    frame_count = 0
    saved_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % every_n == 0:
            # Calculate timestamp for this frame
            timestamp_sec = frame_count / video_fps if video_fps > 0 else 0
            filename = f"frame_{frame_count:05d}.jpg"
            filepath = os.path.join(output_dir, filename)
            cv2.imwrite(filepath, frame)
            saved_count += 1

            # Progress indicator every 10 saved frames
            if saved_count % 10 == 0:
                print(f"  Saved {saved_count} frames... (at {timestamp_sec:.1f}s)")

        frame_count += 1

    cap.release()

    print(f"\n  Saved {saved_count} frames to '{output_dir}/'")
    print()
    print("  Next steps:")
    print(f"    1. Review extracted frames in '{output_dir}/'")
    print(f"    2. Run YOLO detection:")
    print(f"       python main.py")
    print(f"       (update input_folder in main.py to '{output_dir}' if needed)")

    return saved_count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Extract frames from video for YOLO pose estimation analysis",
        epilog="Example: python extract_frames.py simulation.mp4 --fps 2 -o mocks_img"
    )
    parser.add_argument("video", help="Path to the video file (.mp4)")
    parser.add_argument(
        "--output", "-o", default="extracted_frames",
        help="Output directory for extracted frames (default: extracted_frames)"
    )
    parser.add_argument(
        "--every", "-e", type=int, default=None,
        help="Extract every Nth frame (default: 10)"
    )
    parser.add_argument(
        "--fps", "-f", type=float, default=None,
        help="Extract N frames per second (alternative to --every)"
    )

    args = parser.parse_args()
    extract_frames(args.video, args.output, args.every, args.fps)
