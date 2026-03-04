import express from "express";
import {
  createAlert,
  deleteAlertById,
  getAlertById,
  getAllAlerts,
  getStats,
  updateAlertById,
} from "../controllers/alertControllers.js";
import { validateObjectId } from "../middleware/common/validateObjectId.js";
import { parseAlertBody } from "../middleware/alerts/index.js";

const router = express.Router();

// GET /api/alerts - Get all alerts
router.get("/", getAllAlerts);

// GET /api/alerts/stats - Get alert statistics
router.get("/stats", getStats);

// GET /api/alerts/:id - Get single alert
router.get("/:id", validateObjectId(), getAlertById);

// POST /api/alerts - Create new alert
router.post("/", parseAlertBody, createAlert);

// PATCH /api/alerts/:id - Update alert
router.patch("/:id", validateObjectId(), updateAlertById);

// DELETE /api/alerts/:id - Delete alert
router.delete("/:id", validateObjectId(), deleteAlertById);

export default router;
