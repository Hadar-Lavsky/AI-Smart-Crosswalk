import Alert from "../models/Alert.js";
import Crosswalk from "../models/Crosswalk.js";
import Camera from "../models/Camera.js";
import getDangerLevelFromConfidence from "../utils/dangerLevel.js";

/** Shared populate config for crosswalk chain */
const crosswalkPopulate = {
  path: "crosswalkId",
  select: "location cameraId ledId",
  populate: [
    { path: "cameraId", select: "_id status" },
    { path: "ledId", select: "_id" },
  ],
};

// GET /api/alerts - Get all alerts (paginated)
export async function getAllAlerts(req, res, next) {
  try {
    const { dangerLevel, crosswalkId, page, limit } = req.query;
    const query = {};
    if (dangerLevel) query.dangerLevel = dangerLevel;
    if (crosswalkId) query.crosswalkId = crosswalkId;

    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 10;
    const skip = (parsedPage - 1) * parsedLimit;

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .populate(crosswalkPopulate)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Alert.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
      success: true,
      count: alerts.length,
      total,
      data: alerts,
      pagination: {
        currentPage: parsedPage,
        totalPages,
        total,
        hasMore: parsedPage * parsedLimit < total,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/alerts/:id - Get single alert
export async function getAlertById(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id).populate(
      crosswalkPopulate
    );

    if (!alert) {
      res.status(404);
      throw new Error("Alert not found");
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/alerts - Create new alert (JSON with Cloudinary imageUrl)
export async function createAlert(req, res, next) {
  try {
    const { crosswalkId, dangerLevel, imageUrl, confidence, cameraId, location } =
      req.body;

    const alertData = {};

    // Find or create crosswalk by location/camera
    if (crosswalkId) {
      alertData.crosswalkId = crosswalkId;
    } else if (
      location &&
      (location.city || location.street || location.number)
    ) {
      try {
        const crosswalk = await findOrCreateCrosswalk(location, cameraId || null);
        alertData.crosswalkId = crosswalk._id;
      } catch (err) {
        console.error("Error finding/creating crosswalk:", err.message);
      }
    }

    // Danger level
    if (dangerLevel) {
      alertData.dangerLevel = dangerLevel;
    } else if (confidence) {
      alertData.dangerLevel = getDangerLevelFromConfidence(confidence);
    } else {
      alertData.dangerLevel = "MEDIUM";
    }

    // Image: Cloudinary URL from JSON body
    if (imageUrl) {
      alertData.imageUrl = imageUrl;
    }

    const doc = new Alert(alertData);
    const alert = await doc.save();

    res.status(201).json({
      success: true,
      data: alert,
      id: alert._id,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/alerts/:id - Update alert
export async function updateAlertById(req, res, next) {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(crosswalkPopulate);

    if (!alert) {
      res.status(404);
      throw new Error("Alert not found");
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/alerts/:id - Delete alert
export async function deleteAlertById(req, res, next) {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      res.status(404);
      throw new Error("Alert not found");
    }

    res.json({
      success: true,
      message: "Alert deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/alerts/stats - Get alert statistics
export async function getStats(req, res, next) {
  try {
    const [total, low, medium, high] = await Promise.all([
      Alert.countDocuments(),
      Alert.countDocuments({ dangerLevel: "LOW" }),
      Alert.countDocuments({ dangerLevel: "MEDIUM" }),
      Alert.countDocuments({ dangerLevel: "HIGH" }),
    ]);

    res.json({
      success: true,
      data: { total, low, medium, high },
    });
  } catch (error) {
    next(error);
  }
}

// --- Helper: find or create crosswalk by location and camera ---
async function findOrCreateCrosswalk(location, cameraId) {
  if (!location?.city || !location?.street || !location?.number) {
    throw new Error("Location must have city, street, and number");
  }

  // Try to find existing crosswalk by location
  let crosswalk = await Crosswalk.findOne({
    "location.city": location.city,
    "location.street": location.street,
    "location.number": location.number,
  });

  if (crosswalk) {
    // Update cameraId if provided and different
    if (
      cameraId &&
      (!crosswalk.cameraId || crosswalk.cameraId.toString() !== cameraId)
    ) {
      const camera = await Camera.findById(cameraId);
      if (!camera) throw new Error("Camera not found");

      crosswalk.cameraId = cameraId;
      crosswalk = await crosswalk.save();
    }
  } else {
    // Create new crosswalk
    const crosswalkData = {
      location: {
        city: location.city,
        street: location.street,
        number: location.number,
      },
    };

    if (cameraId) {
      const camera = await Camera.findById(cameraId);
      if (!camera) throw new Error("Camera not found");
      crosswalkData.cameraId = cameraId;
    }

    crosswalk = await Crosswalk.create(crosswalkData);
  }

  return Crosswalk.findById(crosswalk._id)
    .populate("cameraId")
    .populate("ledId");
}
