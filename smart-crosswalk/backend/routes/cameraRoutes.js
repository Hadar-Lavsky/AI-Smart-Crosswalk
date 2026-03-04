import express from "express";
import {
  getAllCameras,
  getCameraById,
  createCamera,
  updateCameraStatus,
  updateCamera,
  deleteCamera,
} from "../controllers/cameraControllers.js";
import { validateObjectId } from "../middleware/common/validateObjectId.js";
import { validateCameraStatus } from "../middleware/cameras/index.js";

const router = express.Router();

// GET /api/cameras - Get all cameras
router.get("/", getAllCameras);

// GET /api/cameras/:id - Get camera by ID
router.get("/:id", validateObjectId(), getCameraById);

// POST /api/cameras - Create new camera
router.post("/", createCamera);

// PATCH /api/cameras/:id/status - Update camera status
router.patch("/:id/status", validateObjectId(), validateCameraStatus, updateCameraStatus);

// PATCH /api/cameras/:id - Update camera (general)
router.patch("/:id", validateObjectId(), updateCamera);

// DELETE /api/cameras/:id - Delete camera
router.delete("/:id", validateObjectId(), deleteCamera);

export default router;
