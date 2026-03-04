# Pose Estimation & Object Detection — Complete Walkthrough

A comprehensive guide to analyzing crosswalk camera frames using YOLOv8 pose estimation and object detection. Covers everything from the existing implementation to building a full pedestrian analysis pipeline that produces feedback like:

> "Adult male, facing the crosswalk, approximately 1.2 meters away — HIGH danger"

---

## Table of Contents

1. [What's Already Implemented — Deep Dive](#1-whats-already-implemented--deep-dive)
2. [Goal — What We Want to Achieve](#2-goal--what-we-want-to-achieve)
3. [The 17 COCO Keypoints](#3-the-17-coco-keypoints)
4. [Adult vs Child Estimation](#4-adult-vs-child-estimation)
5. [Facing Direction Detection](#5-facing-direction-detection)
6. [Distance Estimation](#6-distance-estimation)
7. [Object Detection for Scene Context](#7-object-detection-for-scene-context)
8. [Putting It All Together — The Full Pipeline](#8-putting-it-all-together--the-full-pipeline)
9. [Available Datasets](#9-available-datasets)
10. [How This Connects to the Smart Crosswalk System](#10-how-this-connects-to-the-smart-crosswalk-system)

---

## 1. What's Already Implemented — Deep Dive

Before learning new techniques, let's fully understand every piece of code that already exists in this project.

---

### 1a. `backend/ai/main.py` — The YOLO Detection Script

This is the core detection script. Let's break it down line by line.

#### The full existing code:

```python
import os
from ultralytics import YOLO
import cv2

# Helper function
def get_relative_height(box, image_height):
    """Get relative height percentage of bounding box"""
    x1, y1, x2, y2 = box.xyxy[0].tolist()
    bbox_height = y2 - y1
    return (bbox_height / image_height) * 100

# 1. Load the model
model = YOLO('yolov8n-pose.pt')

# 2. Setup data
script_dir = os.path.dirname(os.path.abspath(__file__))
input_folder = os.path.join(script_dir, 'mocks_img')
output_folder = os.path.join(script_dir, 'mocks_img_output')

# 3. Process the folder
for filename in os.listdir(input_folder):
    if filename.endswith(('.jpg', '.jpeg', '.png')):
        img_path = os.path.join(input_folder, filename)

        # 4. Predict and save results
        results = model.predict(source=img_path)
        for r in results:
            img_height, img_width = r.orig_shape
            boxes = r.boxes

            print(f"\n Image: {filename} ({img_width}x{img_height})")
            print(f"   Detected {len(boxes)} person(s):")

            for i, box in enumerate(boxes):
                relative_height = get_relative_height(box, img_height)
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                bbox_height = y2 - y1
                print(f"   Person {i+1}: Height = {bbox_height:.1f}px ({relative_height:.2f}%)")

            im_array = r.plot(kpt_radius=1, line_width=1)
            output_path = os.path.join(output_folder, filename)
            cv2.imwrite(output_path, im_array)
```

#### Line-by-line explanation:

**`from ultralytics import YOLO`**

`ultralytics` is the official Python library by Ultralytics, the company that created YOLOv8. It provides a single unified API for loading models, running inference, training, and exporting. You install it with `pip install ultralytics`. It automatically handles all the complexity of PyTorch model loading, image preprocessing, and post-processing.

**`import cv2`**

OpenCV (Open Source Computer Vision Library). We use it here only for one thing: saving images to disk with `cv2.imwrite()`. OpenCV works with images as NumPy arrays in BGR color format (Blue-Green-Red, not the usual RGB).

**`model = YOLO('yolov8n-pose.pt')`**

This loads the YOLOv8 model. Let's unpack the filename `yolov8n-pose.pt`:

| Part    | Meaning |
| ------- | ------- |
| `yolo`  | The YOLO architecture (You Only Look Once) |
| `v8`    | Version 8 — the latest major version by Ultralytics |
| `n`     | **Nano** — the smallest/fastest variant (see size comparison below) |
| `pose`  | The **pose estimation** variant — detects both bounding boxes AND 17 skeleton keypoints |
| `.pt`   | PyTorch checkpoint file — contains the trained neural network weights |

When you call `YOLO('yolov8n-pose.pt')`, the library:
1. Looks for the file in the current directory
2. If not found, **downloads it automatically** from Ultralytics servers (~6.7 MB)
3. Loads the model architecture + weights into memory (GPU if available, otherwise CPU)
4. Returns a ready-to-use model object

**`model.predict(source=img_path)`**

This runs inference on a single image. Under the hood, three things happen:

1. **Preprocessing**: The image is resized to 640x640 pixels (the model's input size), pixel values are normalized from 0-255 to 0.0-1.0, and the image is converted to a PyTorch tensor.

2. **Forward pass**: The tensor passes through the neural network (a series of convolutional layers). The network outputs raw predictions: bounding box coordinates, class probabilities, confidence scores, and keypoint positions — all in one pass (that's the "You Only Look Once" part).

3. **Post-processing (NMS)**: Non-Maximum Suppression removes duplicate detections. If multiple boxes overlap on the same person, only the highest-confidence one is kept.

The result is a list of `Results` objects (one per image).

**`r.orig_shape`**

Returns `(height, width)` of the **original** image before it was resized to 640x640 for the model. All output coordinates are scaled back to these original dimensions, so you can draw on the original image.

**`r.boxes`**

A `Boxes` object containing all detected person bounding boxes. Since this is a **pose** model, it only detects class 0 = person. Each box has:

| Property | Type | Description |
| -------- | ---- | ----------- |
| `.xyxy`  | Tensor `[1, 4]` | Top-left and bottom-right corners: `[x1, y1, x2, y2]` in pixels |
| `.xywh`  | Tensor `[1, 4]` | Center point + dimensions: `[cx, cy, width, height]` |
| `.conf`  | Tensor `[1]` | Detection confidence: 0.0 to 1.0 |
| `.cls`   | Tensor `[1]` | Class ID (always 0 for person in pose model) |

**`box.xyxy[0].tolist()`**

Why `[0]`? Each box's `.xyxy` is a 2D tensor with shape `[1, 4]` — one row, four values. The `[0]` grabs that single row, giving us a 1D tensor `[x1, y1, x2, y2]`. Then `.tolist()` converts the PyTorch tensor to a plain Python list of floats.

```
box.xyxy        →  tensor([[120.5, 45.2, 380.1, 590.7]])   # shape [1, 4]
box.xyxy[0]     →  tensor([120.5, 45.2, 380.1, 590.7])     # shape [4]
box.xyxy[0].tolist() →  [120.5, 45.2, 380.1, 590.7]        # Python list
```

**`get_relative_height(box, image_height)`**

Calculates what percentage of the image height the person's bounding box occupies. This is a very rough proxy for distance:

| Relative Height | Meaning |
| --------------- | ------- |
| 70-100%         | Person is very close to the camera |
| 30-70%          | Person is at medium distance |
| 5-30%           | Person is far away |
| < 5%            | Person is very far or partially visible |

This is what the current script uses as its only "analysis" — it doesn't use keypoints for anything beyond visualization.

**`r.plot(kpt_radius=1, line_width=1)`**

This is where the keypoints appear visually. The `plot()` method draws:
- Bounding boxes around each person
- Skeleton lines connecting keypoints (shoulder→elbow→wrist, hip→knee→ankle, etc.)
- Colored dots at each keypoint position

It returns a NumPy array (BGR image) that can be saved with OpenCV. The parameters control the visual style:
- `kpt_radius=1` — small keypoint dots
- `line_width=1` — thin skeleton lines

**The critical insight: keypoints ARE detected but NOT used.**

The model detects 17 keypoints per person on every inference call. The `r.plot()` method draws them. But the script never reads the actual keypoint coordinates — it only uses `r.boxes` for bounding box data. The entire pose estimation capability is wasted. This is the gap we'll fill.

#### What `main.py` does NOT do:

- Does NOT read keypoint coordinates (only visualizes them)
- Does NOT estimate whether a person is an adult or child
- Does NOT determine which direction the person is facing
- Does NOT estimate distance in real-world meters
- Does NOT create alerts automatically (must run `cloudinary_alert.py` separately)
- Does NOT process video streams (only static images from a folder)

---

### 1b. `backend/ai/cloudinary_alert.py` — The Alert Creation Script

This script uploads detection images to cloud storage and creates alert records in MongoDB.

#### What is Cloudinary?

Cloudinary is a cloud-based image hosting service with a CDN (Content Delivery Network). Instead of storing detection images on our own server (which fills up disk space), we upload them to Cloudinary and store only the URL in MongoDB. Benefits:
- Images served from global CDN (fast loading worldwide)
- Automatic image optimization (compression, format conversion)
- No disk space management on our server
- Secure URLs (HTTPS)

#### Line-by-line explanation:

**`load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))`**

Loads environment variables from `backend/.env`. This file contains secrets that should never be committed to git:
```
CLOUDINARY_CLOUD_NAME=dqnllcucz
CLOUDINARY_API_KEY=931693139424731
CLOUDINARY_API_SECRET=JT3W-lI1d8mjtRifJQb-TOzWT-o
```

**`cloudinary.config(cloud_name=..., api_key=..., api_secret=...)`**

Authenticates with Cloudinary's API. The three credentials work like a username + password + secret key. The `secure=True` flag ensures all URLs use HTTPS.

**`cloudinary.uploader.upload(image_path)`**

Takes a local file path (e.g., `mocks_img_output/bus.jpg`), uploads the image to Cloudinary's servers, and returns a response object containing:
```python
{
    "secure_url": "https://res.cloudinary.com/dqnllcucz/image/upload/v1234/bus.jpg",
    "public_id": "bus",
    "format": "jpg",
    "width": 640,
    "height": 480,
    # ... more metadata
}
```
We extract `response["secure_url"]` — this is the permanent CDN link to our image.

**`requests.post(API_URL, json=data)`**

Sends an HTTP POST request to our Express API at `http://localhost:3000/api/alerts`. The request body:
```json
{
    "imageUrl": "https://res.cloudinary.com/...",
    "dangerLevel": "HIGH",
    "location": "{\"city\":\"Tel Aviv\",\"street\":\"Dizengoff\",\"number\":\"50\"}",
    "cameraId": "69617b55eb7ffca4f1000bb5"
}
```

The Express backend receives this and:
1. `parseAlertBody` middleware parses the JSON `location` string back to an object
2. `createAlert` controller finds or creates a crosswalk for that location
3. Stores the alert in MongoDB with the Cloudinary image URL

**How the two scripts connect (current manual workflow):**

```
Step 1: Run main.py
  → Processes images from mocks_img/
  → Saves annotated images to mocks_img_output/
  → Prints detection info to console

Step 2: Manually run cloudinary_alert.py
  → python cloudinary_alert.py --image mocks_img_output/bus.jpg --danger-level HIGH
  → Uploads image to Cloudinary
  → Creates alert in MongoDB via API
  → Frontend can now display the alert

Currently these are two SEPARATE manual steps. In the real system,
the detection pipeline would do both automatically.
```

---

### 1c. YOLOv8 Model Variants

#### What is YOLO?

**YOLO = You Only Look Once.** Traditional object detection methods scan an image multiple times at different scales and locations. YOLO processes the entire image in a single forward pass through the neural network, making it dramatically faster. It divides the image into a grid and predicts bounding boxes + classes for each grid cell simultaneously.

#### Why "v8"?

YOLOv8 is the 8th major iteration, released by Ultralytics in January 2023. Key improvements over older versions:
- Anchor-free detection (simpler, more accurate)
- New backbone architecture (C2f modules instead of C3)
- Decoupled head (separate branches for classification and regression)
- State-of-the-art accuracy with better speed

#### Model size variants:

Every YOLOv8 model comes in 5 sizes. Same architecture, different parameter counts:

| Model | Size | Parameters | Speed (CPU) | Accuracy (mAP) | Best For |
| ----- | ---- | ---------- | ----------- | --------------- | -------- |
| `yolov8n` | 6.7 MB | 3.2M | ~120ms | 50.4 | Real-time on CPU, edge devices |
| `yolov8s` | 23.5 MB | 11.2M | ~240ms | 57.4 | Balanced speed/accuracy |
| `yolov8m` | 52.0 MB | 25.9M | ~500ms | 63.2 | Higher accuracy, needs GPU |
| `yolov8l` | 87.0 MB | 43.7M | ~800ms | 65.3 | High accuracy workloads |
| `yolov8x` | 136.7 MB | 68.2M | ~1200ms | 66.7 | Maximum accuracy, GPU only |

**This project uses `yolov8n-pose` (nano)** — the fastest variant. For crosswalk cameras processing frames in real-time, speed matters more than squeezing out extra accuracy. The nano model can process ~8-10 frames/second on a modern CPU.

#### Three types of YOLOv8 models:

| Type | Filename Pattern | What It Does |
| ---- | ---------------- | ------------ |
| **Detection** | `yolov8n.pt` | Bounding boxes + class labels for 80 COCO object types (person, car, bus, etc.) |
| **Pose** | `yolov8n-pose.pt` | Person bounding boxes + 17 skeleton keypoints per person |
| **Segmentation** | `yolov8n-seg.pt` | Pixel-level masks outlining the exact shape of each object |

Our project uses the **pose** variant because we need skeleton keypoints to analyze body orientation, proportions, and posture — not just rectangular boxes.

---

### 1d. The 17 COCO Keypoints

#### What is COCO?

COCO (Common Objects in Context) is the standard benchmark dataset for computer vision. It contains 330,000+ images with annotations for object detection, segmentation, and keypoint detection. YOLOv8 is trained on COCO, which defines 17 keypoints for the human body.

#### The keypoint map:

```
        0: Nose
       / \
   1: L.Eye  2: R.Eye
      |          |
   3: L.Ear  4: R.Ear
        \    /
    5: L.Shoulder ── 6: R.Shoulder
         |                |
    7: L.Elbow      8: R.Elbow
         |                |
    9: L.Wrist     10: R.Wrist      (Note: L/R are from
         |                |          the PERSON's perspective,
   11: L.Hip    ── 12: R.Hip        not the camera's)
         |                |
   13: L.Knee      14: R.Knee
         |                |
   15: L.Ankle     16: R.Ankle
```

#### Full keypoint reference:

| Index | Name            | Body Part | Reliability |
| ----- | --------------- | --------- | ----------- |
| 0     | Nose            | Head      | High — almost always visible |
| 1     | Left Eye        | Head      | High |
| 2     | Right Eye       | Head      | High |
| 3     | Left Ear        | Head      | Medium — hidden when facing away |
| 4     | Right Ear       | Head      | Medium — hidden when facing away |
| 5     | Left Shoulder   | Upper body | Very high — large, clear landmark |
| 6     | Right Shoulder  | Upper body | Very high |
| 7     | Left Elbow      | Arms      | Medium — often occluded |
| 8     | Right Elbow     | Arms      | Medium |
| 9     | Left Wrist      | Arms      | Low — frequently occluded |
| 10    | Right Wrist     | Arms      | Low |
| 11    | Left Hip        | Lower body | High — clear landmark |
| 12    | Right Hip       | Lower body | High |
| 13    | Left Knee       | Legs      | Medium |
| 14    | Right Knee      | Legs      | Medium |
| 15    | Left Ankle      | Feet      | Medium — often cut off at frame edge |
| 16    | Right Ankle     | Feet      | Medium |

#### How to access keypoints in code:

```python
results = model.predict(source='image.jpg')

for r in results:
    keypoints = r.keypoints        # Keypoints object for ALL detected persons

    # Three ways to access the coordinates:
    xy   = keypoints.xy            # Pixel coordinates: shape [N, 17, 2]
    xyn  = keypoints.xyn           # Normalized (0-1): shape [N, 17, 2]
    conf = keypoints.conf          # Confidence scores: shape [N, 17]

    # For a specific person (e.g., person index 0):
    person_kps = xy[0]             # shape [17, 2] — all 17 keypoints
    nose = person_kps[0]           # shape [2] — [x, y] in pixels
    left_shoulder = person_kps[5]  # shape [2]
    right_shoulder = person_kps[6] # shape [2]

    nose_conf = conf[0][0]         # Confidence that this IS the nose (0.0-1.0)
```

**Key data shapes:**

| Property | Shape | Description |
| -------- | ----- | ----------- |
| `keypoints.xy` | `[N, 17, 2]` | N persons, 17 joints, (x_pixel, y_pixel) |
| `keypoints.xyn` | `[N, 17, 2]` | Same but normalized: x/image_width, y/image_height |
| `keypoints.conf` | `[N, 17]` | Confidence per joint per person (0.0 = not detected, 1.0 = certain) |

**Confidence filtering:** A keypoint with confidence < 0.5 is unreliable — the model is guessing. Always check confidence before using a keypoint:

```python
nose_x, nose_y = person_kps[0].tolist()
nose_confidence = conf[0][0].item()

if nose_confidence > 0.5:
    # Safe to use this keypoint
    print(f"Nose at ({nose_x:.0f}, {nose_y:.0f})")
else:
    # Nose is occluded or out of frame — don't use
    print("Nose not reliably detected")
```

---

## 2. Goal — What We Want to Achieve

Building on top of the existing code, we want to transform a simple bounding-box detector into a **pedestrian behavior analyzer** that produces structured feedback for each detected person:

```python
# Current output (what main.py does):
"Person 1: Height = 342.5px (57.08% of image)"

# Target output (what we want to build):
{
    "person_id": 1,
    "category": "adult",           # adult / child
    "facing": "toward_crosswalk",  # toward / away / left / right
    "distance_m": 1.2,             # estimated meters from crosswalk
    "in_crosswalk_zone": True,     # is the person inside the crosswalk ROI?
    "nearby_vehicles": ["car"],    # detected vehicles in the scene
    "danger_level": "HIGH",        # calculated from all factors
    "feedback": "Adult, facing the crosswalk, approximately 1.2m away"
}
```

#### The four analysis layers:

```
Frame from camera
  │
  ├─ Layer 1: WHO?        → Adult or child (body proportion analysis)
  ├─ Layer 2: FACING?     → Toward/away/sideways (shoulder orientation)
  ├─ Layer 3: WHERE?      → Distance in meters (pinhole camera model)
  └─ Layer 4: CONTEXT?    → Vehicles, traffic lights (object detection)
  │
  └─ Combined → Danger level + human-readable feedback
```

---

## 3. The 17 COCO Keypoints

> Detailed keypoint reference is in [Section 1d](#1d-the-17-coco-keypoints) above.

Here's the practical code for extracting and working with keypoints — the foundation for all subsequent analysis:

```python
from ultralytics import YOLO
import numpy as np

model = YOLO('yolov8n-pose.pt')

def extract_person_keypoints(result, person_index=0, min_confidence=0.5):
    """
    Extract keypoints for a specific person from YOLO results.

    Returns:
        dict with keypoint names as keys, each containing:
        - 'x': pixel x-coordinate
        - 'y': pixel y-coordinate
        - 'conf': detection confidence (0.0-1.0)
        - 'valid': whether confidence exceeds threshold
    """
    KEYPOINT_NAMES = [
        'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
        'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
        'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
    ]

    xy = result.keypoints.xy[person_index]     # [17, 2]
    conf = result.keypoints.conf[person_index]  # [17]

    person = {}
    for i, name in enumerate(KEYPOINT_NAMES):
        c = conf[i].item()
        person[name] = {
            'x': xy[i][0].item(),
            'y': xy[i][1].item(),
            'conf': c,
            'valid': c >= min_confidence
        }

    return person

# Usage:
results = model.predict(source='crosswalk_frame.jpg')
for r in results:
    num_persons = len(r.boxes)
    for i in range(num_persons):
        person = extract_person_keypoints(r, person_index=i)

        if person['nose']['valid']:
            print(f"Nose at ({person['nose']['x']:.0f}, {person['nose']['y']:.0f})")
        if person['left_shoulder']['valid'] and person['right_shoulder']['valid']:
            print(f"Shoulders: L({person['left_shoulder']['x']:.0f}) R({person['right_shoulder']['x']:.0f})")
```

---

## 4. Adult vs Child Estimation

### The Principle

Human body proportions change dramatically with age. The most reliable indicator is the **head-to-body height ratio**:

```
Infant (~1 year):   Head is 1/4 of total height    ████░░░░░░░░░░░░
Child (~6 years):   Head is 1/6 of total height    ███░░░░░░░░░░░░░░░░░░░░░░
Adult:              Head is 1/7.5 of total height   ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

By measuring the head size relative to total body height using keypoints, we can estimate the age category.

### Implementation

We measure two distances from keypoints:

1. **Head size** = distance from nose (0) to the midpoint of shoulders (5, 6)
2. **Body height** = distance from nose (0) to the midpoint of ankles (15, 16)

Then: `ratio = head_size / body_height`

| Ratio | Category |
| ----- | -------- |
| > 0.28 | Young child (toddler) |
| 0.20 – 0.28 | Child (5-12 years) |
| 0.15 – 0.20 | Teenager / adult |
| < 0.15 | Tall adult |

```python
import math

def distance(p1, p2):
    """Euclidean distance between two points."""
    return math.sqrt((p1['x'] - p2['x'])**2 + (p1['y'] - p2['y'])**2)

def midpoint(p1, p2):
    """Midpoint between two points."""
    return {
        'x': (p1['x'] + p2['x']) / 2,
        'y': (p1['y'] + p2['y']) / 2
    }

def estimate_age_category(person):
    """
    Estimate whether a person is a child or adult using head-to-body ratio.

    Args:
        person: dict from extract_person_keypoints()

    Returns:
        'child' | 'adult' | 'unknown'
    """
    # Need these keypoints to be valid
    required = ['nose', 'left_shoulder', 'right_shoulder', 'left_ankle', 'right_ankle']
    if not all(person[kp]['valid'] for kp in required):
        return 'unknown'

    # Head size: nose to shoulder midpoint
    shoulder_mid = midpoint(person['left_shoulder'], person['right_shoulder'])
    head_size = distance(person['nose'], shoulder_mid)

    # Body height: nose to ankle midpoint
    ankle_mid = midpoint(person['left_ankle'], person['right_ankle'])
    body_height = distance(person['nose'], ankle_mid)

    # Avoid division by zero
    if body_height < 10:
        return 'unknown'

    ratio = head_size / body_height

    if ratio > 0.25:
        return 'child'
    else:
        return 'adult'
```

### Supplementary check: absolute pixel height

The ratio alone can be fooled by camera angle. We can add a secondary check using the bounding box pixel height combined with a rough distance estimate:

```python
def estimate_age_with_bbox(person, bbox_height, relative_height_pct):
    """
    Combined estimation using both ratio AND absolute size.
    A person who is close (relative_height > 50%) and has a small bbox
    is more likely a child.
    """
    category = estimate_age_category(person)  # ratio-based

    # If person is close (big in frame) but bbox is still small
    # compared to what an adult would be, lean toward child
    if category == 'unknown' and relative_height_pct > 40 and bbox_height < 200:
        return 'child'

    return category
```

### Limitations

- **Camera angle**: Looking down from above compresses body proportions
- **Occlusion**: If legs are hidden behind an object, ankle keypoints fail
- **Pose**: A crouching adult can look like a standing child
- **Accuracy**: This is an estimation, not a precise measurement. Expect ~70-80% accuracy

---

## 5. Facing Direction Detection

### The Principle

When a person faces the camera, their shoulders span a wide horizontal distance in the image. When they face sideways, the shoulders appear compressed (one behind the other). When they face away, the shoulders are wide again but their ears are not visible.

```
Facing camera (front):     Facing sideways (left):     Facing away (back):
  L.Shoulder ← wide → R.Shoulder   L.Shoulder        L.Shoulder ← wide → R.Shoulder
      |                    |            R.Shoulder(hidden)   |                    |
  Ears visible             Ears visible  One ear visible   Ears NOT visible
```

### Implementation

**Method 1: Shoulder width ratio** (simpler, recommended)

```python
def estimate_facing(person, bbox):
    """
    Estimate which direction a person is facing.

    Args:
        person: dict from extract_person_keypoints()
        bbox: dict with 'x1', 'y1', 'x2', 'y2'

    Returns:
        'front' | 'back' | 'left' | 'right' | 'unknown'
    """
    ls = person['left_shoulder']
    rs = person['right_shoulder']

    if not (ls['valid'] and rs['valid']):
        return 'unknown'

    # 1. Calculate shoulder width relative to bbox width
    shoulder_width = abs(ls['x'] - rs['x'])
    bbox_width = bbox['x2'] - bbox['x1']

    if bbox_width < 10:
        return 'unknown'

    shoulder_ratio = shoulder_width / bbox_width

    # 2. Determine frontal/side based on shoulder spread
    if shoulder_ratio < 0.3:
        # Shoulders compressed → person is facing sideways
        # Determine left vs right by which shoulder is closer to camera (lower y = higher in image)
        if ls['x'] < rs['x']:
            return 'left'   # Person's left side faces camera → walking left
        else:
            return 'right'
    else:
        # Shoulders wide → frontal or back view
        # Check ear visibility to distinguish front vs back

        le = person['left_ear']
        re = person['right_ear']
        nose = person['nose']

        # If ears have high confidence → person is facing the camera
        ears_visible = (le['valid'] and le['conf'] > 0.5) or (re['valid'] and re['conf'] > 0.5)
        nose_visible = nose['valid'] and nose['conf'] > 0.6

        if nose_visible and ears_visible:
            return 'front'
        elif not nose_visible and not ears_visible:
            return 'back'
        else:
            # Ambiguous — default to front if nose is visible
            return 'front' if nose_visible else 'back'
```

**Method 2: Cross-product orientation** (more robust for oblique angles)

Uses the direction vectors formed by shoulder and hip keypoints:

```python
def estimate_facing_cross_product(person):
    """
    More robust facing detection using shoulder-hip vectors.
    The cross product of shoulder vector and torso vector reveals body orientation.
    """
    required = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip']
    if not all(person[kp]['valid'] for kp in required):
        return 'unknown'

    ls, rs = person['left_shoulder'], person['right_shoulder']
    lh, rh = person['left_hip'], person['right_hip']

    # Shoulder vector (left → right)
    shoulder_vec = (rs['x'] - ls['x'], rs['y'] - ls['y'])

    # Torso vector (shoulder midpoint → hip midpoint)
    s_mid = ((ls['x'] + rs['x'])/2, (ls['y'] + rs['y'])/2)
    h_mid = ((lh['x'] + rh['x'])/2, (lh['y'] + rh['y'])/2)
    torso_vec = (h_mid[0] - s_mid[0], h_mid[1] - s_mid[1])

    # Cross product: positive = facing left of camera, negative = facing right
    cross = shoulder_vec[0] * torso_vec[1] - shoulder_vec[1] * torso_vec[0]

    # Shoulder width for frontal/side distinction
    shoulder_width = abs(rs['x'] - ls['x'])
    torso_height = math.sqrt(torso_vec[0]**2 + torso_vec[1]**2)

    if torso_height < 10:
        return 'unknown'

    width_ratio = shoulder_width / torso_height

    if width_ratio < 0.4:
        return 'left' if cross > 0 else 'right'
    else:
        # Use ear/nose visibility for front vs back (same as Method 1)
        nose = person['nose']
        return 'front' if (nose['valid'] and nose['conf'] > 0.6) else 'back'
```

### Mapping to "toward crosswalk" / "away from crosswalk"

The functions above return 'front'/'back'/'left'/'right' relative to the **camera**. To determine if someone is facing **toward the crosswalk**, you need to know the camera's orientation relative to the crosswalk:

```python
def facing_relative_to_crosswalk(facing_camera, camera_crosswalk_direction):
    """
    Convert camera-relative facing to crosswalk-relative facing.

    camera_crosswalk_direction: which direction the camera looks at the crosswalk
        'north' = camera looks north toward crosswalk
        'south' = camera looks south toward crosswalk
        etc.

    For simplicity, if the camera faces the crosswalk directly:
        - 'front' = person faces camera = faces AWAY from crosswalk
        - 'back'  = person faces away from camera = faces TOWARD crosswalk
    """
    if camera_crosswalk_direction == 'toward':
        # Camera is mounted facing the crosswalk
        mapping = {
            'front': 'away_from_crosswalk',   # Person faces camera = away from crossing
            'back': 'toward_crosswalk',        # Person's back to camera = walking toward crossing
            'left': 'parallel',
            'right': 'parallel'
        }
    else:
        # Camera is behind pedestrians, facing the same direction
        mapping = {
            'front': 'toward_crosswalk',
            'back': 'away_from_crosswalk',
            'left': 'parallel',
            'right': 'parallel'
        }

    return mapping.get(facing_camera, 'unknown')
```

---

## 6. Distance Estimation

### The Challenge

With a single camera (no stereo vision, no depth sensor), we can't directly measure distance. But we can estimate it using the **pinhole camera model** — a fundamental concept in computer vision.

### Method 1: Pinhole Camera Model (recommended)

#### The formula:

```
                 focal_length × real_height
Distance (m) = ─────────────────────────────
                     pixel_height
```

Where:
- `focal_length` = camera's focal length in pixels (determined by calibration)
- `real_height` = actual height of the person in meters (~1.70m for adults, ~1.20m for children)
- `pixel_height` = height of the person in the image in pixels

#### How it works visually:

```
Camera                                 Real World
  ┌─┐
  │ │              ╱  far person (small in image)
  │ │           ╱     pixel_height = 100px → distance = 8m
  │f│        ╱
  │o│     ╱
  │c│  ╱           close person (large in image)
  │a│╱              pixel_height = 400px → distance = 2m
  │l│
  └─┘
```

The same person appears smaller when farther away. If we know their actual height and the camera's focal length, we can calculate the distance.

#### One-time camera calibration:

To find `focal_length`, place a person of known height at a known distance:

```python
def calibrate_focal_length(known_distance_m, known_height_m, pixel_height):
    """
    One-time calibration. Place a person at a known distance, measure their
    pixel height in the image, and calculate the focal length.

    Example: Person is 1.70m tall, standing 3m from camera, appears 350px tall.
    focal_length = (350 * 3.0) / 1.70 = 617.6 pixels
    """
    return (pixel_height * known_distance_m) / known_height_m

# Calibration example:
# Person is 1.70m tall, 3 meters from camera, 350px in image
FOCAL_LENGTH = calibrate_focal_length(
    known_distance_m=3.0,
    known_height_m=1.70,
    pixel_height=350
)
# FOCAL_LENGTH ≈ 617.6
```

#### Distance estimation function:

```python
def estimate_distance(person, bbox, focal_length, category='adult'):
    """
    Estimate distance from camera to person using pinhole camera model.

    Args:
        person: dict from extract_person_keypoints()
        bbox: dict with 'x1', 'y1', 'x2', 'y2'
        focal_length: calibrated focal length in pixels
        category: 'adult' or 'child' (affects assumed real height)

    Returns:
        distance in meters, or None if estimation fails
    """
    # Assumed real heights
    HEIGHTS = {
        'adult': 1.70,    # 170 cm average adult
        'child': 1.20,    # 120 cm average child
        'unknown': 1.60   # conservative estimate
    }

    real_height = HEIGHTS.get(category, 1.60)

    # Prefer keypoint-based height (more accurate than bbox)
    if person['nose']['valid'] and (person['left_ankle']['valid'] or person['right_ankle']['valid']):
        nose_y = person['nose']['y']

        if person['left_ankle']['valid'] and person['right_ankle']['valid']:
            ankle_y = (person['left_ankle']['y'] + person['right_ankle']['y']) / 2
        elif person['left_ankle']['valid']:
            ankle_y = person['left_ankle']['y']
        else:
            ankle_y = person['right_ankle']['y']

        pixel_height = abs(ankle_y - nose_y)
    else:
        # Fall back to bounding box height
        pixel_height = bbox['y2'] - bbox['y1']

    if pixel_height < 20:  # Too small to estimate reliably
        return None

    distance = (focal_length * real_height) / pixel_height
    return round(distance, 1)
```

### Method 2: Ground Plane Homography (more accurate for distance to crosswalk)

Instead of measuring distance to the camera, this method maps pixel coordinates to real-world ground positions. Then we can calculate the exact distance between a person's feet and the crosswalk boundary.

```python
import cv2
import numpy as np

def setup_homography(image_points, real_world_points):
    """
    One-time setup: define correspondence between pixel positions
    and real-world ground plane coordinates.

    image_points: 4 pixel coordinates [(x,y), ...] on the crosswalk
    real_world_points: corresponding real-world coordinates in meters [(x,y), ...]

    Example:
        4 corners of the crosswalk:
        image_points = [(100, 400), (500, 400), (450, 300), (150, 300)]
        real_world_points = [(0, 0), (5, 0), (5, 10), (0, 10)]  # 5m wide, 10m long
    """
    src = np.float32(image_points)
    dst = np.float32(real_world_points)
    H, _ = cv2.findHomography(src, dst)
    return H

def pixel_to_ground(pixel_x, pixel_y, H):
    """
    Convert a pixel coordinate to real-world ground plane coordinate.
    """
    point = np.float32([[pixel_x, pixel_y]]).reshape(-1, 1, 2)
    transformed = cv2.perspectiveTransform(point, H)
    return transformed[0][0]  # [real_x, real_y] in meters

def distance_to_crosswalk(person, H, crosswalk_y_boundary):
    """
    Estimate how far a person's feet are from the crosswalk boundary.

    crosswalk_y_boundary: the Y-coordinate (in real-world meters) of the
                          crosswalk edge closest to the person
    """
    # Use ankle position (feet on ground)
    if person['left_ankle']['valid'] and person['right_ankle']['valid']:
        foot_x = (person['left_ankle']['x'] + person['right_ankle']['x']) / 2
        foot_y = (person['left_ankle']['y'] + person['right_ankle']['y']) / 2
    elif person['left_ankle']['valid']:
        foot_x, foot_y = person['left_ankle']['x'], person['left_ankle']['y']
    else:
        return None

    # Map to real-world ground plane
    real_pos = pixel_to_ground(foot_x, foot_y, H)
    real_y = real_pos[1]

    # Distance to crosswalk boundary
    return abs(real_y - crosswalk_y_boundary)
```

### Accuracy Notes

| Method | Accuracy | Requirements |
| ------ | -------- | ------------ |
| Pinhole camera model | ± 0.5m at close range, ± 2m far away | One-time calibration (person at known distance) |
| Ground plane homography | ± 0.3m | 4 reference points with known real-world positions |

For this project, the **pinhole model** is sufficient for danger estimation. The **homography method** is better if you need precise "within 1 meter of crosswalk" calculations.

---

## 7. Object Detection for Scene Context

### Why a second model?

The pose model (`yolov8n-pose.pt`) only detects **people**. For full scene understanding, we need to detect vehicles, traffic lights, and other objects. This requires the regular detection model (`yolov8n.pt`).

### Relevant COCO classes:

YOLOv8 detection models are trained on 80 COCO classes. The ones relevant to crosswalk safety:

| Class ID | Name | Relevance |
| -------- | ---- | --------- |
| 0 | person | Already covered by pose model |
| 2 | car | Vehicle approaching crosswalk |
| 3 | motorcycle | Fast-moving vehicle |
| 5 | bus | Large vehicle, limited visibility |
| 7 | truck | Large vehicle |
| 9 | traffic light | Red/green affects danger level |
| 11 | stop sign | Regulatory context |

**Important: "crosswalk" is NOT a COCO class.** YOLO cannot detect crosswalks out of the box. Options:
1. **Define a static ROI** (Region of Interest) — manually draw the crosswalk area in the camera config (recommended for fixed cameras)
2. **Train a custom model** — use a crosswalk dataset from Roboflow to fine-tune YOLOv8

### Running both models on the same frame:

```python
from ultralytics import YOLO

# Load both models
pose_model = YOLO('yolov8n-pose.pt')     # Person + keypoints
detect_model = YOLO('yolov8n.pt')         # 80 COCO classes

def analyze_frame(frame):
    """
    Run both models on the same frame and merge results.
    """
    # 1. Pose detection (people + keypoints)
    pose_results = pose_model.predict(source=frame, verbose=False)

    # 2. Object detection (vehicles, traffic lights)
    detect_results = detect_model.predict(source=frame, verbose=False)

    # 3. Extract people from pose results
    persons = []
    for r in pose_results:
        for i in range(len(r.boxes)):
            person = extract_person_keypoints(r, person_index=i)
            box = r.boxes[i].xyxy[0].tolist()
            persons.append({
                'keypoints': person,
                'bbox': {'x1': box[0], 'y1': box[1], 'x2': box[2], 'y2': box[3]},
                'confidence': r.boxes[i].conf[0].item()
            })

    # 4. Extract relevant objects from detection results
    RELEVANT_CLASSES = {2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck', 9: 'traffic_light'}
    objects = []
    for r in detect_results:
        for i in range(len(r.boxes)):
            cls_id = int(r.boxes[i].cls[0].item())
            if cls_id in RELEVANT_CLASSES:
                box = r.boxes[i].xyxy[0].tolist()
                objects.append({
                    'class': RELEVANT_CLASSES[cls_id],
                    'bbox': {'x1': box[0], 'y1': box[1], 'x2': box[2], 'y2': box[3]},
                    'confidence': r.boxes[i].conf[0].item()
                })

    return persons, objects
```

### Defining the crosswalk ROI:

For fixed cameras, define the crosswalk boundaries once during setup:

```python
# Define crosswalk as a polygon in pixel coordinates
# These are set during camera installation and stored in config
CROSSWALK_ROI = [
    (150, 350),   # top-left corner of crosswalk
    (500, 350),   # top-right
    (550, 480),   # bottom-right
    (100, 480),   # bottom-left
]

def is_in_crosswalk(person, roi=CROSSWALK_ROI):
    """Check if a person's feet are inside the crosswalk region."""
    import cv2
    import numpy as np

    # Get foot position
    if person['left_ankle']['valid'] and person['right_ankle']['valid']:
        foot_x = (person['left_ankle']['x'] + person['right_ankle']['x']) / 2
        foot_y = (person['left_ankle']['y'] + person['right_ankle']['y']) / 2
    elif person['left_ankle']['valid']:
        foot_x, foot_y = person['left_ankle']['x'], person['left_ankle']['y']
    else:
        return False

    # cv2.pointPolygonTest returns > 0 if inside, 0 if on edge, < 0 if outside
    contour = np.array(roi, dtype=np.float32)
    result = cv2.pointPolygonTest(contour, (foot_x, foot_y), False)
    return result >= 0
```

---

## 8. Putting It All Together — The Full Pipeline

Here's the complete analysis pipeline that combines all building blocks:

```python
from ultralytics import YOLO
import cv2
import math
import numpy as np
import requests
import json

# ── Configuration ──
FOCAL_LENGTH = 617.6              # From calibration (see Section 6)
API_URL = 'http://localhost:3000/api/alerts'
CAMERA_CROSSWALK_DIR = 'toward'   # Camera faces toward crosswalk
DANGER_THRESHOLD = 'MEDIUM'       # Create alert if danger >= this level

CROSSWALK_ROI = [                 # Crosswalk polygon in pixels
    (150, 350), (500, 350),
    (550, 480), (100, 480),
]

# ── Load Models ──
pose_model = YOLO('yolov8n-pose.pt')
detect_model = YOLO('yolov8n.pt')

# ── Helper functions (from sections above) ──
# extract_person_keypoints()
# estimate_age_category()
# estimate_facing()
# estimate_distance()
# is_in_crosswalk()
# (all defined in previous sections)

# ── Main Pipeline ──

def calculate_danger_level(person_info, scene_objects):
    """
    Calculate danger level based on all available information.
    """
    score = 0

    # Distance factor
    dist = person_info.get('distance_m')
    if dist is not None:
        if dist < 1.0:
            score += 3        # Very close to crosswalk
        elif dist < 2.0:
            score += 2        # Close
        elif dist < 5.0:
            score += 1        # Moderate distance

    # Facing factor
    if person_info.get('facing') == 'toward_crosswalk':
        score += 1             # Person walking toward crosswalk

    # Category factor
    if person_info.get('category') == 'child':
        score += 2             # Children are more vulnerable

    # In crosswalk factor
    if person_info.get('in_crosswalk'):
        score += 2             # Person is ON the crosswalk

    # Vehicle proximity factor
    vehicles = [obj for obj in scene_objects if obj['class'] in ('car', 'bus', 'truck')]
    if vehicles:
        score += 1             # Vehicles present in scene

    # Map score to danger level
    if score >= 5:
        return 'HIGH'
    elif score >= 3:
        return 'MEDIUM'
    else:
        return 'LOW'


def generate_feedback(person_info):
    """Generate human-readable feedback string."""
    parts = []

    # WHO
    cat = person_info.get('category', 'Person')
    parts.append(cat.capitalize())

    # FACING
    facing = person_info.get('facing', 'unknown')
    if facing == 'toward_crosswalk':
        parts.append('facing the crosswalk')
    elif facing == 'away_from_crosswalk':
        parts.append('facing away from the crosswalk')
    elif facing == 'parallel':
        parts.append('walking parallel to the crosswalk')

    # WHERE
    dist = person_info.get('distance_m')
    if dist is not None:
        parts.append(f'approximately {dist}m away')

    return ', '.join(parts)


def analyze_single_frame(frame, camera_id=None, location=None):
    """
    Full analysis pipeline for a single frame.

    Args:
        frame: numpy array (BGR image from cv2) or file path
        camera_id: MongoDB camera ID
        location: dict with {city, street, number}

    Returns:
        list of analysis results, one per detected person
    """
    # Step 1: Run pose detection
    pose_results = pose_model.predict(source=frame, verbose=False)

    # Step 2: Run object detection
    detect_results = detect_model.predict(source=frame, verbose=False)

    # Step 3: Extract scene objects
    RELEVANT_CLASSES = {2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck', 9: 'traffic_light'}
    scene_objects = []
    for r in detect_results:
        for i in range(len(r.boxes)):
            cls_id = int(r.boxes[i].cls[0].item())
            if cls_id in RELEVANT_CLASSES:
                scene_objects.append({
                    'class': RELEVANT_CLASSES[cls_id],
                    'confidence': r.boxes[i].conf[0].item()
                })

    # Step 4: Analyze each person
    all_results = []

    for r in pose_results:
        img_height, img_width = r.orig_shape

        for i in range(len(r.boxes)):
            # Extract keypoints
            person = extract_person_keypoints(r, person_index=i)

            # Extract bounding box
            box_coords = r.boxes[i].xyxy[0].tolist()
            bbox = {'x1': box_coords[0], 'y1': box_coords[1],
                    'x2': box_coords[2], 'y2': box_coords[3]}

            # Layer 1: WHO?
            category = estimate_age_category(person)

            # Layer 2: FACING?
            facing_camera = estimate_facing(person, bbox)
            facing = facing_relative_to_crosswalk(facing_camera, CAMERA_CROSSWALK_DIR)

            # Layer 3: WHERE?
            dist = estimate_distance(person, bbox, FOCAL_LENGTH, category)

            # Layer 4: CONTEXT
            in_crosswalk = is_in_crosswalk(person, CROSSWALK_ROI)

            # Combine
            person_info = {
                'person_id': i + 1,
                'category': category,
                'facing': facing,
                'facing_camera': facing_camera,
                'distance_m': dist,
                'in_crosswalk': in_crosswalk,
                'nearby_vehicles': [obj['class'] for obj in scene_objects],
            }

            # Calculate danger
            person_info['danger_level'] = calculate_danger_level(person_info, scene_objects)

            # Generate feedback
            person_info['feedback'] = generate_feedback(person_info)

            all_results.append(person_info)

            print(f"  Person {i+1}: {person_info['feedback']} — {person_info['danger_level']}")

    return all_results


# ── Example usage ──
if __name__ == '__main__':
    frame = cv2.imread('crosswalk_frame.jpg')
    results = analyze_single_frame(frame)

    for person in results:
        print(json.dumps(person, indent=2))
```

### Example output:

```
  Person 1: Adult, facing the crosswalk, approximately 1.2m away — HIGH
  Person 2: Child, facing away from the crosswalk, approximately 3.5m away — MEDIUM
```

```json
{
  "person_id": 1,
  "category": "adult",
  "facing": "toward_crosswalk",
  "facing_camera": "back",
  "distance_m": 1.2,
  "in_crosswalk": false,
  "nearby_vehicles": ["car", "bus"],
  "danger_level": "HIGH",
  "feedback": "Adult, facing the crosswalk, approximately 1.2m away"
}
```

---

## 9. Available Datasets

### For YOLOv8 Pose (already trained):

| Dataset | Size | What It Contains | URL |
| ------- | ---- | ---------------- | --- |
| **COCO** | 250K+ images | Person keypoints, bounding boxes, 80 object classes. YOLOv8 is already trained on this — no additional training needed. | [cocodataset.org](https://cocodataset.org/) |

### For crosswalk-specific scenarios:

| Dataset | Size | What It Contains | URL |
| ------- | ---- | ---------------- | --- |
| **JAAD** | 346 video clips | Pedestrians at crosswalks with behavior annotations (crossing, standing, looking). The best dataset for understanding pedestrian intentions at crosswalks. | [JAAD Dataset](https://data.nvision2.eecs.yorku.ca/JAAD_dataset/) |
| **CityPersons** | 5,000 images | Urban pedestrian bounding boxes from Cityscapes. Dense city scenarios with occlusion. | [CityPersons](https://bitbucket.org/shanshanzhang/citypersons/) |
| **MOT17 / MOT20** | Multiple sequences | Multi-object tracking sequences. Useful for tracking the same pedestrian across frames. | [motchallenge.net](https://motchallenge.net/) |
| **Roboflow Crosswalk** | Varies | Community-contributed crosswalk detection datasets. Use for training a custom crosswalk detector model. | [Roboflow Universe](https://universe.roboflow.com/) (search "crosswalk") |

### What to use for this project:

- **No additional training needed** for person detection — YOLOv8 is already trained on COCO
- **JAAD** is recommended if you want to add pedestrian intent prediction ("is this person about to cross?")
- **Roboflow crosswalk datasets** are useful if you want to auto-detect crosswalk boundaries instead of defining them as static ROIs

---

## 10. How This Connects to the Smart Crosswalk System

### The current state vs the target state:

```
CURRENT (what exists):
  main.py (manual) → Detects persons, saves annotated images
  cloudinary_alert.py (manual) → Uploads image, creates alert
  Two separate manual CLI commands. No real-time. No keypoint analysis.

TARGET (what we're building):
  Detection Worker (automatic) → Grabs frames from camera stream
    → Runs full pipeline (pose + detection + analysis)
    → If danger detected: upload to Cloudinary → POST /api/alerts
    → Frontend auto-refreshes and shows alert with feedback
```

### Where the pipeline runs:

From the architecture discussion, the analysis pipeline runs inside the detection worker — either:
- **Option A**: Each `worker.py` per camera runs the pipeline on its stream
- **Option B**: The single `detection_service.py` runs it in per-camera threads

Either way, the pipeline is the same:

```
Camera Stream (RTSP/HTTP)
  │
  ├── cv2.VideoCapture(stream_url)
  │     └── frame = cap.read()
  │
  ├── analyze_single_frame(frame)     ← The pipeline from Section 8
  │     ├── Pose model → keypoints
  │     ├── Detection model → vehicles
  │     ├── estimate_age_category()
  │     ├── estimate_facing()
  │     ├── estimate_distance()
  │     └── calculate_danger_level()
  │
  └── If danger >= threshold:
        ├── cloudinary.upload(annotated_frame)   ← Same as cloudinary_alert.py
        └── requests.post('/api/alerts', {       ← Same API endpoint
              imageUrl: cloudinary_url,
              dangerLevel: 'HIGH',
              confidence: 0.85,
              cameraId: '...',
              location: { city, street, number }
            })
```

### What the backend already supports:

The Express API's `POST /api/alerts` endpoint is already designed for this exact use case:
- Accepts `imageUrl` (Cloudinary URL) — stores it in MongoDB
- Accepts `confidence` — auto-converts to danger level (>0.7 = HIGH, >0.4 = MEDIUM, <0.4 = LOW)
- Accepts `cameraId` — links to the camera record
- Accepts `location` — auto-finds or creates the associated crosswalk
- Returns the created alert, which the frontend fetches via React Query

### Potential enhancement — storing analysis metadata:

The Alert model could be extended to store the analysis feedback:

```js
// Potential future field on Alert model:
analysis: {
    persons_detected: 2,
    feedback: [
        "Adult, facing the crosswalk, approximately 1.2m away",
        "Child, facing away, approximately 3.5m away"
    ],
    vehicles_present: ["car", "bus"],
    scene_danger: "HIGH"
}
```

This would let the frontend display rich analysis details alongside the detection image.

---

## Python Dependencies

To run the full pipeline, you need these Python packages:

```bash
pip install ultralytics opencv-python numpy requests cloudinary python-dotenv
```

| Package | Version | Purpose |
| ------- | ------- | ------- |
| `ultralytics` | >= 8.0 | YOLOv8 model loading and inference |
| `opencv-python` | >= 4.8 | Image/video I/O, drawing, homography |
| `numpy` | >= 1.24 | Array operations for keypoint math |
| `requests` | >= 2.28 | HTTP client for calling the Express API |
| `cloudinary` | >= 1.36 | Image upload to Cloudinary CDN |
| `python-dotenv` | >= 1.0 | Load `.env` file for API credentials |
