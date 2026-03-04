# Gemini Video Generation Prompts — Smart Crosswalk Simulation

Use these prompts with **Google Gemini (Veo)** to generate realistic crosswalk simulation videos.
Upload the reference image (`crosswalk_reference.jpg` — the Google Street View screenshot of Re'uven Barkat St, Holon) alongside each prompt.

---

## How to Use

1. Go to [Google AI Studio](https://aistudio.google.com/) or [Gemini](https://gemini.google.com/)
2. Select a model that supports video generation (Gemini 2.0 Flash or above with Veo)
3. Upload the crosswalk reference image
4. Copy-paste one of the prompts below
5. Generate and download the video
6. Use the [Frame Extraction Script](#frame-extraction-script) at the bottom to extract frames for YOLO analysis

### Recommended Settings

| Setting | Value |
| ------- | ----- |
| Resolution | 1280x720 (720p) or 1920x1080 (1080p) |
| Aspect Ratio | 16:9 (landscape — simulates a traffic camera) |
| Duration | 5-8 seconds |
| Output Format | MP4 |

### Tips for Better Results

- **Be specific about camera angle** — always mention "fixed static camera", otherwise the AI may add cinematic movement
- **Fewer actors = better quality** — start with the Simple Scene prompt, then try more complex ones
- **Iterate** — if the first result isn't great, regenerate or slightly rephrase
- **Reference image is key** — always attach the crosswalk image so Gemini matches the setting
- **Avoid asking for text/signs** — AI video generators struggle with readable text

---

## Prompt 1 — Main Scene (Full Simulation)

> **Best for**: Testing the complete detection pipeline — multiple pedestrians, vehicles, varied behaviors

```
Using the attached image as a reference for the exact location and setting:

Generate a realistic 8-second video of this urban crosswalk scene filmed from a fixed elevated traffic camera mounted at approximately 5-6 meters height, angled downward at about 30 degrees. The camera must remain completely static throughout the entire video — no panning, zooming, or movement.

Scene description:
- The setting is a wide multi-lane road in an Israeli city during a clear sunny day, matching the attached reference image exactly — white crosswalk stripes on asphalt, traffic lights, palm trees lining the road, and tall residential apartment buildings in the background.

Pedestrian activity (all happening naturally within the scene):
1. An adult man in a dark shirt walks steadily across the crosswalk from left to right, reaching about halfway across during the clip.
2. A woman holding a young child's hand (the child is about 5-6 years old) stands at the curb on the near side of the crosswalk, waiting. Toward the end of the clip, they begin stepping onto the crosswalk.
3. Another person walks along the sidewalk approaching the crosswalk from the right side, looking at their phone, not yet crossing.

Vehicle activity:
- Two cars are visible on the road. One car is stopped at the crosswalk (waiting for pedestrians). Another car approaches slowly from the distance in the far lane.

Style: Photorealistic, natural lighting with shadows consistent with midday sun. The video should look like actual traffic camera CCTV footage — slightly grainy, fixed perspective, no artistic effects or color grading.
```

---

## Prompt 2 — Simple Scene (Easy Generation)

> **Best for**: First attempt — fewer actors means better AI generation quality. Good for validating your YOLO pipeline works on AI-generated footage.

```
Using the attached image as the reference setting:

Generate a 5-second realistic video from a fixed overhead traffic camera (static, no movement) showing this crosswalk scene:

- Daytime, clear sunny weather, matching the urban Israeli setting in the reference image — crosswalk stripes, traffic lights, palm trees, apartment buildings.
- One adult pedestrian walks across the crosswalk from left to right at a normal walking pace.
- One white sedan drives slowly on the road and stops just before the crosswalk to let the pedestrian pass.
- The camera is mounted high (about 5-6 meters) looking down at approximately 30 degrees. It does not move at all.

Style: Realistic security camera footage. Natural lighting. No cinematic effects.
```

---

## Prompt 3 — Night Scene

> **Best for**: Testing detection under low-light conditions — streetlights, car headlights, harder visibility.

```
Using the attached image as the reference location:

Generate a 6-second realistic video of this same crosswalk at nighttime, filmed from a fixed elevated traffic camera (completely static, no camera movement).

Night conditions:
- The scene is lit by orange-yellow streetlights and the glow from surrounding apartment building windows.
- The crosswalk stripes are partially illuminated by streetlights.
- Traffic lights are visible and glowing (showing red for cars).

Activity:
- One pedestrian in a light-colored jacket crosses the crosswalk. Their figure is partially silhouetted but still visible under the streetlight.
- A car approaches with headlights on, illuminating the road and the pedestrian as it slows down near the crosswalk.
- The palm trees and buildings from the reference image are visible as dark silhouettes against the night sky.

Style: Realistic nighttime traffic camera footage. Slight graininess typical of CCTV at night. No artificial lighting effects or lens flares.
```

---

## Prompt 4 — Danger Scenario

> **Best for**: Testing danger detection logic — a child near a moving vehicle at the crosswalk.

```
Using the attached image as the reference setting:

Generate a 6-second realistic video from a fixed elevated traffic camera (static, no movement, mounted at 5-6 meters height) showing a dangerous moment at this crosswalk:

Scene sequence:
1. (0-2 seconds) A car is driving at moderate speed toward the crosswalk from the left side of the frame.
2. (2-4 seconds) A small child (approximately 6 years old) suddenly steps off the curb onto the crosswalk from the right side, without an adult nearby.
3. (4-6 seconds) The car brakes hard, stopping just before the crosswalk. The child continues walking across slowly.

Setting: Daytime, same Israeli urban crosswalk from the reference image — white crosswalk stripes, traffic lights, palm trees, apartment buildings. Clear sunny weather.

Important: The child should be clearly smaller than an adult would be — short stature, small frame. This contrast is important for the scene.

Style: Realistic traffic camera CCTV footage. Static camera, natural lighting, no effects.
```

---

## Prompt 5 — Multiple Pedestrians with Varied Body Orientations

> **Best for**: Testing facing direction detection and pose estimation — people facing toward/away from camera, standing sideways, etc.

```
Using the attached image as the reference setting:

Generate a 7-second realistic video from a fixed overhead traffic camera (static, no camera movement) at this crosswalk:

Pedestrian positions and orientations:
1. One person stands at the near curb FACING the crosswalk (their back is toward the camera), about to cross.
2. Another person is mid-crosswalk walking TOWARD the camera (facing the camera directly).
3. A third person stands on the far sidewalk FACING SIDEWAYS (profile view), looking down the road as if checking for cars.

Vehicle: One car is parked/stopped at the intersection, engine idle, no movement.

Setting: Daytime, Israeli urban crosswalk matching the reference image. Sunny, clear weather.

Style: Realistic security camera footage from an elevated fixed angle. No camera movement. Natural lighting.
```

---

## Prompt 6 — Crowded Crosswalk

> **Best for**: Stress-testing detection with multiple overlapping people — tests occlusion handling.

```
Using the attached image as the reference location:

Generate a 6-second realistic video from a fixed elevated traffic camera (completely static) showing a busy moment at this crosswalk:

- A group of 5-6 people cross the crosswalk together — a mix of adults and at least one child. They walk at slightly different speeds, some partially overlapping/occluding each other.
- Two cars wait at the traffic light on opposite sides of the crosswalk.
- The pedestrians move from the near side to the far side of the crosswalk during the clip.

Setting: Daytime, clear weather, same Israeli urban crosswalk from the reference image.

Style: Realistic overhead traffic camera footage. Fixed angle, no movement, natural lighting.
```

---

## Frame Extraction Script

After downloading the generated video, use this Python script to extract individual frames for YOLO analysis:

```python
"""
extract_frames.py — Extract frames from a video for YOLO analysis

Usage:
    python extract_frames.py video.mp4              # Extract every 10th frame (default)
    python extract_frames.py video.mp4 --every 5    # Extract every 5th frame
    python extract_frames.py video.mp4 --fps 2      # Extract 2 frames per second
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
    """
    # Open the video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video '{video_path}'")
        return

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
            filename = f"frame_{frame_count:05d}.jpg"
            filepath = os.path.join(output_dir, filename)
            cv2.imwrite(filepath, frame)
            saved_count += 1

        frame_count += 1

    cap.release()

    print(f"\n  Saved {saved_count} frames to '{output_dir}/'")
    print(f"  Ready for YOLO analysis — run:")
    print(f"    python main.py  (after moving frames to mocks_img/)")
    return saved_count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract frames from video for YOLO analysis")
    parser.add_argument("video", help="Path to the video file (.mp4)")
    parser.add_argument("--output", "-o", default="extracted_frames",
                        help="Output directory (default: extracted_frames)")
    parser.add_argument("--every", "-e", type=int, default=None,
                        help="Extract every Nth frame (default: 10)")
    parser.add_argument("--fps", "-f", type=float, default=None,
                        help="Extract N frames per second (alternative to --every)")

    args = parser.parse_args()
    extract_frames(args.video, args.output, args.every, args.fps)
```

### Quick Usage After Generating Video

```bash
# 1. Activate your Python environment
cd backend/ai
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# 2. Extract frames from the generated video
python extract_frames.py path/to/generated_video.mp4 --fps 2

# 3. Copy frames to the mocks_img folder for YOLO processing
# (or update main.py to point to extracted_frames/)

# 4. Run YOLO detection on the extracted frames
python main.py
```
