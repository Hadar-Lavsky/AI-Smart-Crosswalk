import Camera from "../models/Camera.js";
import Crosswalk from "../models/Crosswalk.js";

// GET /api/cameras - Get all cameras
export async function getAllCameras(req, res, next) {
  try {
    const cameras = await Camera.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: cameras.length,
      data: cameras,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/cameras/:id - Get camera by ID
export async function getCameraById(req, res, next) {
  try {
    const camera = await Camera.findById(req.params.id);

    if (!camera) {
      res.status(404);
      throw new Error("Camera not found");
    }

    res.json({
      success: true,
      data: camera,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/cameras - Create new camera
export async function createCamera(req, res, next) {
  try {
    const camera = await Camera.create(req.body);

    res.status(201).json({
      success: true,
      data: camera,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/cameras/:id/status - Update camera status
export async function updateCameraStatus(req, res, next) {
  try {
    const { status } = req.body;

    const camera = await Camera.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!camera) {
      res.status(404);
      throw new Error("Camera not found");
    }

    res.json({
      success: true,
      data: camera,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/cameras/:id - Update camera (general)
export async function updateCamera(req, res, next) {
  try {
    const camera = await Camera.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!camera) {
      res.status(404);
      throw new Error("Camera not found");
    }

    res.json({
      success: true,
      data: camera,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/cameras/:id - Delete camera
export async function deleteCamera(req, res, next) {
  try {
    // Check if camera is linked to any crosswalk
    const linkedCrosswalk = await Crosswalk.findOne({ cameraId: req.params.id });
    if (linkedCrosswalk) {
      res.status(400);
      throw new Error("Cannot delete camera linked to crosswalk");
    }

    const camera = await Camera.findByIdAndDelete(req.params.id);

    if (!camera) {
      res.status(404);
      throw new Error("Camera not found");
    }

    res.json({
      success: true,
      message: "Camera deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
