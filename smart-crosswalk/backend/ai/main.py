import os
from ultralytics import YOLO
import cv2


# 0 usefull functions
def get_relative_height(box, image_height):
    """Get relative height percentage of bounding box"""
    x1, y1, x2, y2 = box.xyxy[0].tolist()
    bbox_height = y2 - y1
    return (bbox_height / image_height) * 100


# 1.load the model
model = YOLO('yolov8n-pose.pt')

# 2.setup data
# Getting the directory of the current script file "main.py" absolute path
script_dir = os.path.dirname(os.path.abspath(__file__))
# Getting the absolute path of the input and output folders
input_folder = os.path.join(script_dir, 'mocks_img')
output_folder = os.path.join(script_dir, 'mocks_img_output')

# 3. procees the folder
print(f"Processing folder: {input_folder}")

for filename in os.listdir(input_folder):
    if filename.endswith(('.jpg', '.jpeg', '.png')):
        img_path = os.path.join(input_folder, filename)


# 4. predict the folder and save the results
        results = model.predict(source=img_path)
        for r in results:

            img_height, img_width = r.orig_shape

            # Get bounding boxes
            boxes = r.boxes

            # Print info for each detected person
            print(f"\n📸 Image: {filename} ({img_width}x{img_height})")
            print(f"   Detected {len(boxes)} person(s):")

            for i, box in enumerate(boxes):
                # Use the function to get relative height
                relative_height = get_relative_height(box, img_height)

                # Get absolute height too
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                bbox_height = y2 - y1

                print(
                    f"   Person {i+1}: Height = {bbox_height:.1f}px ({relative_height:.2f}% of image)")

            im_array = r.plot(kpt_radius=1, line_width=1)
            output_path = os.path.join(output_folder, filename)
            cv2.imwrite(output_path, im_array)

print(f"Processed {filename}")

print("All images processed successfully")
