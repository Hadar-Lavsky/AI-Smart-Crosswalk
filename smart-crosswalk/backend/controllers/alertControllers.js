import Alert from "../models/Alert.js";
import Crosswalk from "../models/Crosswalk.js";
import Camera from "../models/Camera.js";
import getDangerLevelFromConfidence from "../utils/dangerLevel.js";
import {
  deleteCloudinaryAssetByUrl,
  isCloudinaryUrl,
} from "../utils/cloudinary.js";
import { emitAlertRealtime } from "../socket/index.js";
import {
  alertCrosswalkPopulate,
  parsePagination,
  buildPagination,
  notFound,
} from "./controllerHelpers.js";

// GET /api/alerts - Get all alerts (paginated)
export async function getAllAlerts(req, res, next) {
  try {
    const { dangerLevel, crosswalkId } = req.query;
    const query = {};
    if (dangerLevel) query.dangerLevel = dangerLevel;
    if (crosswalkId) query.crosswalkId = crosswalkId;

    const { parsedPage, parsedLimit, skip } = parsePagination(req.query);

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .populate(alertCrosswalkPopulate)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Alert.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: alerts.length,
      total,
      data: alerts,
      pagination: buildPagination(parsedPage, parsedLimit, total),
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/alerts/:id - Get single alert
export async function getAlertById(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id).populate(
      alertCrosswalkPopulate
    );

    if (!alert) notFound(res, "Alert not found");

    res.json({ success: true, data: alert });
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
    } else if (location && (location.city || location.street || location.number)) {
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

    if (imageUrl) alertData.imageUrl = imageUrl;

    const doc = new Alert(alertData);
    const alert = await doc.save();
    // Re-read with populate so realtime clients get full related objects.
    const populatedAlert = await Alert.findById(alert._id).populate(alertCrosswalkPopulate);

    // Push the new alert immediately to Socket.IO listeners.
    emitAlertRealtime(populatedAlert);

    res.status(201).json({
      success: true,
      data: populatedAlert,
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
    }).populate(alertCrosswalkPopulate);

    if (!alert) notFound(res, "Alert not found");

    res.json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/alerts/:id - Delete alert
export async function deleteAlertById(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) notFound(res, "Alert not found");

    // Keep DB and cloud storage consistent for Cloudinary-backed alerts.
    if (isCloudinaryUrl(alert.imageUrl)) {
      await deleteCloudinaryAssetByUrl(alert.imageUrl);
    }

    await Alert.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Alert deleted successfully" });
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

    res.json({ success: true, data: { total, low, medium, high } });
  } catch (error) {
    next(error);
  }
}

// --- Helper: find or create crosswalk by location and camera ---
async function findOrCreateCrosswalk(location, cameraId) {
  if (!location?.city || !location?.street || !location?.number) {
    throw new Error("Location must have city, street, and number");
  }

  let crosswalk = await Crosswalk.findOne({
    "location.city": location.city,
    "location.street": location.street,
    "location.number": location.number,
  });

  if (crosswalk) {
    if (cameraId && (!crosswalk.cameraId || crosswalk.cameraId.toString() !== cameraId)) {
      const camera = await Camera.findById(cameraId);
      if (!camera) throw new Error("Camera not found");
      crosswalk.cameraId = cameraId;
      crosswalk = await crosswalk.save();
    }
  } else {
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

  return Crosswalk.findById(crosswalk._id).populate("cameraId").populate("ledId");
}
