import express from "express";
import {
  getAllCrosswalks,
  searchCrosswalks,
  getStats,
  getCrosswalkById,
  createCrosswalk,
  updateCrosswalk,
  deleteCrosswalk,
  linkCamera,
  unlinkCamera,
  linkLED,
  unlinkLED,
  getCrosswalkAlerts,
  getCrosswalkAlertStats,
} from "../controllers/crosswalkControllers.js";
import { validateObjectId } from "../middleware/common/validateObjectId.js";
import {
  validateCreateCrosswalk,
  validateLinkCamera,
  validateLinkLED,
  validateSearchQuery,
} from "../middleware/crosswalks/index.js";

const router = express.Router();

// GET /api/crosswalks - Get all crosswalks
router.get("/", getAllCrosswalks);

// GET /api/crosswalks/search - Search crosswalks
router.get("/search", validateSearchQuery, searchCrosswalks);

// GET /api/crosswalks/stats - Get crosswalk statistics
router.get("/stats", getStats);

// GET /api/crosswalks/:id - Get single crosswalk
router.get("/:id", validateObjectId(), getCrosswalkById);

// GET /api/crosswalks/:id/alerts - Get alerts for specific crosswalk
router.get("/:id/alerts", validateObjectId(), getCrosswalkAlerts);

// GET /api/crosswalks/:id/stats - Get alert statistics for specific crosswalk
router.get("/:id/stats", validateObjectId(), getCrosswalkAlertStats);

// POST /api/crosswalks - Create crosswalk
router.post("/", validateCreateCrosswalk, createCrosswalk);

// PATCH /api/crosswalks/:id - Update crosswalk
router.patch("/:id", validateObjectId(), updateCrosswalk);

// DELETE /api/crosswalks/:id - Delete crosswalk
router.delete("/:id", validateObjectId(), deleteCrosswalk);

// PATCH /api/crosswalks/:id/camera - Link camera to crosswalk
router.patch("/:id/camera", validateObjectId(), validateLinkCamera, linkCamera);

// DELETE /api/crosswalks/:id/camera - Unlink camera from crosswalk
router.delete("/:id/camera", validateObjectId(), unlinkCamera);

// PATCH /api/crosswalks/:id/led - Link LED to crosswalk
router.patch("/:id/led", validateObjectId(), validateLinkLED, linkLED);

// DELETE /api/crosswalks/:id/led - Unlink LED from crosswalk
router.delete("/:id/led", validateObjectId(), unlinkLED);

export default router;
