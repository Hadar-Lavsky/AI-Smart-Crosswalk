import mongoose from "mongoose";
import Crosswalk from "../models/Crosswalk.js";
import Camera from "../models/Camera.js";
import LED from "../models/LED.js";
import Alert from "../models/Alert.js";
import {
  alertCrosswalkPopulate,
  parsePagination,
  buildPagination,
  notFound,
} from "./controllerHelpers.js";

// ─────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────

/** Populate cameraId and ledId refs on any Crosswalk query. */
function withDevices(query) {
  return query.populate("cameraId").populate("ledId");
}

// ─────────────────────────────────────────────────────────────────
// CRUD Operations
// ─────────────────────────────────────────────────────────────────

// GET /api/crosswalks - Get all crosswalks (paginated)
export async function getAllCrosswalks(req, res, next) {
  try {
    const { parsedPage, parsedLimit, skip } = parsePagination(req.query);

    const [crosswalks, total] = await Promise.all([
      withDevices(Crosswalk.find())
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Crosswalk.countDocuments(),
    ]);

    res.json({
      success: true,
      count: crosswalks.length,
      total,
      data: crosswalks,
      pagination: buildPagination(parsedPage, parsedLimit, total),
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/crosswalks/search - Search crosswalks
export async function searchCrosswalks(req, res, next) {
  try {
    const { q } = req.query;
    const parsedLimit = parseInt(req.query.limit) || 10;
    const searchRegex = new RegExp(q, "i");

    const results = await withDevices(
      Crosswalk.find({
        $or: [
          { "location.street": searchRegex },
          { "location.city": searchRegex },
          { "location.number": searchRegex },
        ],
      })
    )
      .limit(parsedLimit)
      .sort({ "location.street": 1 });

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
}

// GET /api/crosswalks/stats - Get crosswalk statistics
export async function getStats(req, res, next) {
  try {
    const total = await Crosswalk.countDocuments();
    res.json({ success: true, data: { total } });
  } catch (error) {
    next(error);
  }
}

// GET /api/crosswalks/:id - Get single crosswalk
export async function getCrosswalkById(req, res, next) {
  try {
    const crosswalk = await withDevices(Crosswalk.findById(req.params.id));

    if (!crosswalk) notFound(res, "Crosswalk not found");

    res.json({ success: true, data: crosswalk });
  } catch (error) {
    next(error);
  }
}

// POST /api/crosswalks - Create crosswalk
export async function createCrosswalk(req, res, next) {
  try {
    const crosswalk = await Crosswalk.create(req.body);
    res.status(201).json({ success: true, data: crosswalk });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/crosswalks/:id - Update crosswalk
export async function updateCrosswalk(req, res, next) {
  try {
    const crosswalk = await withDevices(
      Crosswalk.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      })
    );

    if (!crosswalk) notFound(res, "Crosswalk not found");

    res.json({ success: true, data: crosswalk });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/crosswalks/:id - Delete crosswalk
export async function deleteCrosswalk(req, res, next) {
  try {
    const crosswalk = await Crosswalk.findByIdAndDelete(req.params.id);

    if (!crosswalk) notFound(res, "Crosswalk not found");

    res.json({ success: true, message: "Crosswalk deleted successfully" });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────
// Device Linking Operations
// ─────────────────────────────────────────────────────────────────

// PATCH /api/crosswalks/:id/camera - Link camera to crosswalk
export async function linkCamera(req, res, next) {
  try {
    const { cameraId } = req.body;

    const camera = await Camera.findById(cameraId);
    if (!camera) notFound(res, "Camera not found");

    const crosswalk = await withDevices(
      Crosswalk.findByIdAndUpdate(
        req.params.id,
        { cameraId },
        { new: true, runValidators: true }
      )
    );

    if (!crosswalk) notFound(res, "Crosswalk not found");

    res.json({ success: true, message: "Camera linked successfully", data: crosswalk });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/crosswalks/:id/camera - Unlink camera from crosswalk
export async function unlinkCamera(req, res, next) {
  try {
    const crosswalk = await withDevices(
      Crosswalk.findByIdAndUpdate(
        req.params.id,
        { $unset: { cameraId: 1 } },
        { new: true }
      )
    );

    if (!crosswalk) notFound(res, "Crosswalk not found");

    res.json({ success: true, message: "Camera unlinked successfully", data: crosswalk });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/crosswalks/:id/led - Link LED to crosswalk
export async function linkLED(req, res, next) {
  try {
    const { ledId } = req.body;

    const led = await LED.findById(ledId);
    if (!led) notFound(res, "LED not found");

    const crosswalk = await withDevices(
      Crosswalk.findByIdAndUpdate(
        req.params.id,
        { ledId },
        { new: true, runValidators: true }
      )
    );

    if (!crosswalk) notFound(res, "Crosswalk not found");

    res.json({ success: true, message: "LED linked successfully", data: crosswalk });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/crosswalks/:id/led - Unlink LED from crosswalk
export async function unlinkLED(req, res, next) {
  try {
    const crosswalk = await withDevices(
      Crosswalk.findByIdAndUpdate(
        req.params.id,
        { $unset: { ledId: 1 } },
        { new: true }
      )
    );

    if (!crosswalk) notFound(res, "Crosswalk not found");

    res.json({ success: true, message: "LED unlinked successfully", data: crosswalk });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────
// Crosswalk Alerts & Statistics
// ─────────────────────────────────────────────────────────────────

// GET /api/crosswalks/:id/alerts - Get alerts for specific crosswalk
export async function getCrosswalkAlerts(req, res, next) {
  try {
    const crosswalkId = req.params.id;
    const { startDate, endDate, dangerLevel, sortBy } = req.query;

    const crosswalk = await Crosswalk.findById(crosswalkId);
    if (!crosswalk) notFound(res, "Crosswalk not found");

    const query = { crosswalkId: new mongoose.Types.ObjectId(crosswalkId) };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (dangerLevel && dangerLevel !== "all") {
      query.dangerLevel = dangerLevel.toUpperCase();
    }

    let sort = { timestamp: -1 };
    if (sortBy === "oldest") sort = { timestamp: 1 };
    else if (sortBy === "danger") sort = { dangerLevel: -1, timestamp: -1 };

    const { parsedPage, parsedLimit, skip } = parsePagination(req.query, 50);

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit)
        .populate(alertCrosswalkPopulate),
      Alert.countDocuments(query),
    ]);

    res.json({
      success: true,
      crosswalk: { _id: crosswalk._id, location: crosswalk.location },
      alerts,
      pagination: {
        ...buildPagination(parsedPage, parsedLimit, total),
        totalAlerts: total,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/crosswalks/:id/stats - Get alert statistics for specific crosswalk
export async function getCrosswalkAlertStats(req, res, next) {
  try {
    const crosswalkObjectId = new mongoose.Types.ObjectId(req.params.id);

    const [total, dangerStats, timeStats] = await Promise.all([
      Alert.countDocuments({ crosswalkId: crosswalkObjectId }),
      Alert.aggregate([
        { $match: { crosswalkId: crosswalkObjectId } },
        { $group: { _id: "$dangerLevel", count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $match: { crosswalkId: crosswalkObjectId } },
        {
          $facet: {
            last24Hours: [
              { $match: { timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
              { $count: "count" },
            ],
            last7Days: [
              { $match: { timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
              { $count: "count" },
            ],
            last30Days: [
              { $match: { timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
              { $count: "count" },
            ],
          },
        },
      ]),
    ]);

    const byDangerLevel = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    dangerStats.forEach((stat) => {
      byDangerLevel[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        total,
        byDangerLevel,
        last24Hours: timeStats[0]?.last24Hours[0]?.count || 0,
        last7Days: timeStats[0]?.last7Days[0]?.count || 0,
        last30Days: timeStats[0]?.last30Days[0]?.count || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
