import express from "express";
import {
  getAllLEDs,
  getLEDById,
  createLED,
  deleteLED,
} from "../controllers/ledControllers.js";
import { validateObjectId } from "../middleware/common/validateObjectId.js";

const router = express.Router();

// GET /api/leds - Get all LEDs
router.get("/", getAllLEDs);

// GET /api/leds/:id - Get LED by ID
router.get("/:id", validateObjectId(), getLEDById);

// POST /api/leds - Create new LED
router.post("/", createLED);

// DELETE /api/leds/:id - Delete LED
router.delete("/:id", validateObjectId(), deleteLED);

export default router;
