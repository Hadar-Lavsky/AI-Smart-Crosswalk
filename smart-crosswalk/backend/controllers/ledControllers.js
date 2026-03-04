import LED from "../models/LED.js";
import Crosswalk from "../models/Crosswalk.js";

// GET /api/leds - Get all LEDs
export async function getAllLEDs(req, res, next) {
  try {
    const leds = await LED.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: leds.length,
      data: leds,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/leds/:id - Get LED by ID
export async function getLEDById(req, res, next) {
  try {
    const led = await LED.findById(req.params.id);

    if (!led) {
      res.status(404);
      throw new Error("LED not found");
    }

    res.json({
      success: true,
      data: led,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/leds - Create new LED
export async function createLED(req, res, next) {
  try {
    const led = await LED.create(req.body);

    res.status(201).json({
      success: true,
      data: led,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/leds/:id - Delete LED
export async function deleteLED(req, res, next) {
  try {
    // Check if LED is linked to any crosswalk
    const linkedCrosswalk = await Crosswalk.findOne({ ledId: req.params.id });
    if (linkedCrosswalk) {
      res.status(400);
      throw new Error("Cannot delete LED linked to crosswalk");
    }

    const led = await LED.findByIdAndDelete(req.params.id);

    if (!led) {
      res.status(404);
      throw new Error("LED not found");
    }

    res.json({
      success: true,
      message: "LED deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
