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

// ─────────────────────────────────────────────────────────────────
// CRUD Operations
// ─────────────────────────────────────────────────────────────────

// GET /api/alerts - Get all alerts (paginated)
export async function getAllAlerts(req, res, next) {
  try {
    const query = await buildAlertFilterQuery(req.query);

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

    const alert = await Alert.create(alertData);
    const populatedAlert = await alert.populate(alertCrosswalkPopulate);

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
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) notFound(res, "Alert not found");

    if (isCloudinaryUrl(alert.imageUrl)) {
      await deleteCloudinaryAssetByUrl(alert.imageUrl);
    }

    res.json({ success: true, message: "Alert deleted successfully" });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

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

// --- Helper: build a MongoDB filter from Alerts-page query params ---
// Supports dangerLevel, an exact crosswalkId, a free-text crosswalk location
// search (city / street / number), and a timestamp date range. The "all"
// sentinel sent by the FilterBar means "no danger-level filter".
async function buildAlertFilterQuery(q) {
  const { dangerLevel, crosswalkId, crosswalkSearch, startDate, endDate } = q;
  const query = {};

  if (dangerLevel && dangerLevel !== "all") {
    query.dangerLevel = dangerLevel;
  }

  if (crosswalkId) {
    query.crosswalkId = crosswalkId;
  }

  // Free-text search over the crosswalk location. Resolve the matching
  // crosswalk ids first, then constrain alerts to that set ($in []) so an
  // empty result correctly yields zero alerts.
  if (crosswalkSearch && crosswalkSearch.trim()) {
    const rx = new RegExp(escapeRegExp(crosswalkSearch.trim()), "i");
    const matches = await Crosswalk.find({
      $or: [
        { "location.city": rx },
        { "location.street": rx },
        { "location.number": rx },
      ],
    }).select("_id");
    query.crosswalkId = { $in: matches.map((c) => c._id) };
  }

  // Date range on the alert timestamp. The client sends absolute ISO instants
  // (end-of-day already baked in by the date picker), so compare them directly.
  const range = {};
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start && !Number.isNaN(start.getTime())) range.$gte = start;
  if (end && !Number.isNaN(end.getTime())) range.$lte = end;
  if (range.$gte || range.$lte) {
    query.timestamp = range;
  }

  return query;
}

// --- Helper: escape user input for safe literal use inside a RegExp ---
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
