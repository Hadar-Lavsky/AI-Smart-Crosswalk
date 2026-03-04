import mongoose from "mongoose";
import Crosswalk from "../models/Crosswalk.js";
import Camera from "../models/Camera.js";
import LED from "../models/LED.js";
import Alert from "../models/Alert.js";

// GET /api/crosswalks - Get all crosswalks (paginated)
export async function getAllCrosswalks(req, res, next) {
  try {
    const { page, limit } = req.query;

    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 10;
    const skip = (parsedPage - 1) * parsedLimit;

    const [crosswalks, total] = await Promise.all([
      Crosswalk.find()
        .populate("cameraId")
        .populate("ledId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Crosswalk.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
      success: true,
      count: crosswalks.length,
      total,
      data: crosswalks,
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

// GET /api/crosswalks/search - Search crosswalks
export async function searchCrosswalks(req, res, next) {
  try {
    const { q } = req.query;
    let parsedLimit = parseInt(req.query.limit) || 10;

    const searchRegex = new RegExp(q, "i");

    const results = await Crosswalk.find({
      $or: [
        { "location.street": searchRegex },
        { "location.city": searchRegex },
        { "location.number": searchRegex },
      ],
    })
      .populate("cameraId")
      .populate("ledId")
      .limit(parsedLimit)
      .sort({ "location.street": 1 });

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/crosswalks/stats - Get crosswalk statistics
export async function getStats(req, res, next) {
  try {
    const total = await Crosswalk.countDocuments();

    res.json({
      success: true,
      data: { total },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/crosswalks/:id - Get single crosswalk
export async function getCrosswalkById(req, res, next) {
  try {
    const crosswalk = await Crosswalk.findById(req.params.id)
      .populate("cameraId")
      .populate("ledId");

    if (!crosswalk) {
      res.status(404);
      throw new Error("Crosswalk not found");
    }

    res.json({
      success: true,
      data: crosswalk,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/crosswalks - Create crosswalk
export async function createCrosswalk(req, res, next) {
  try {
    const crosswalk = await Crosswalk.create(req.body);

    res.status(201).json({
      success: true,
      data: crosswalk,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/crosswalks/:id - Update crosswalk
export async function updateCrosswalk(req, res, next) {
  try {
    const crosswalk = await Crosswalk.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("cameraId")
      .populate("ledId");

    if (!crosswalk) {
      res.status(404);
      throw new Error("Crosswalk not found");
    }

    res.json({
      success: true,
      data: crosswalk,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/crosswalks/:id - Delete crosswalk
export async function deleteCrosswalk(req, res, next) {
  try {
    const crosswalk = await Crosswalk.findByIdAndDelete(req.params.id);

    if (!crosswalk) {
      res.status(404);
      throw new Error("Crosswalk not found");
    }

    res.json({
      success: true,
      message: "Crosswalk deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/crosswalks/:id/camera - Link camera to crosswalk
export async function linkCamera(req, res, next) {
  try {
    const { cameraId } = req.body;

    // Verify camera exists
    const camera = await Camera.findById(cameraId);
    if (!camera) {
      res.status(404);
      throw new Error("Camera not found");
    }

    const crosswalk = await Crosswalk.findByIdAndUpdate(
      req.params.id,
      { cameraId },
      { new: true, runValidators: true }
    )
      .populate("cameraId")
      .populate("ledId");

    if (!crosswalk) {
      res.status(404);
      throw new Error("Crosswalk not found");
    }

    res.json({
      success: true,
      message: "Camera linked successfully",
      data: crosswalk,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/crosswalks/:id/camera - Unlink camera from crosswalk
export async function unlinkCamera(req, res, next) {
  try {
    const crosswalk = await Crosswalk.findByIdAndUpdate(
      req.params.id,
      { $unset: { cameraId: 1 } },
      { new: true }
    )
      .populate("cameraId")
      .populate("ledId");

    if (!crosswalk) {
      res.status(404);
      throw new Error("Crosswalk not found");
    }

    res.json({
      success: true,
      message: "Camera unlinked successfully",
      data: crosswalk,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/crosswalks/:id/led - Link LED to crosswalk
export async function linkLED(req, res, next) {
  try {
    const { ledId } = req.body;

    // Verify LED exists
    const led = await LED.findById(ledId);
    if (!led) {
      res.status(404);
      throw new Error("LED not found");
    }

    const crosswalk = await Crosswalk.findByIdAndUpdate(
      req.params.id,
      { ledId },
      { new: true, runValidators: true }
    )
      .populate("cameraId")
      .populate("ledId");

    if (!crosswalk) {
      res.status(404);
      throw new Error("Crosswalk not found");
    }

    res.json({
      success: true,
      message: "LED linked successfully",
      data: crosswalk,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/crosswalks/:id/led - Unlink LED from crosswalk
export async function unlinkLED(req, res, next) {
  try {
    const crosswalk = await Crosswalk.findByIdAndUpdate(
      req.params.id,
      { $unset: { ledId: 1 } },
      { new: true }
    )
      .populate("cameraId")
      .populate("ledId");

    if (!crosswalk) {
      res.status(404);
      throw new Error("Crosswalk not found");
    }

    res.json({
      success: true,
      message: "LED unlinked successfully",
      data: crosswalk,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/crosswalks/:id/alerts - Get alerts for specific crosswalk
export async function getCrosswalkAlerts(req, res, next) {
  try {
    const crosswalkId = req.params.id;
    const { startDate, endDate, dangerLevel, sortBy, limit, page } = req.query;

    // Verify crosswalk exists
    const crosswalk = await Crosswalk.findById(crosswalkId);
    if (!crosswalk) {
      res.status(404);
      throw new Error("Crosswalk not found");
    }

    const query = { crosswalkId: new mongoose.Types.ObjectId(crosswalkId) };

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Danger level filter
    if (dangerLevel && dangerLevel !== "all") {
      query.dangerLevel = dangerLevel.toUpperCase();
    }

    // Sorting
    let sort = { timestamp: -1 };
    if (sortBy === "oldest") {
      sort = { timestamp: 1 };
    } else if (sortBy === "danger") {
      sort = { dangerLevel: -1, timestamp: -1 };
    }

    // Pagination
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 50;
    const skip = (parsedPage - 1) * parsedLimit;

    // Execute queries in parallel
    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit)
        .populate({
          path: "crosswalkId",
          select: "location cameraId ledId",
          populate: [
            { path: "cameraId", select: "_id status" },
            { path: "ledId", select: "_id" },
          ],
        }),
      Alert.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
      success: true,
      crosswalk: {
        _id: crosswalk._id,
        location: crosswalk.location,
      },
      alerts,
      pagination: {
        currentPage: parsedPage,
        totalPages,
        totalAlerts: total,
        hasMore: parsedPage * parsedLimit < total,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/crosswalks/:id/stats - Get alert statistics for specific crosswalk
export async function getCrosswalkAlertStats(req, res, next) {
  try {
    const crosswalkId = req.params.id;
    const crosswalkObjectId = new mongoose.Types.ObjectId(crosswalkId);

    // Get total count, counts by danger level, and time-based stats in parallel
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
              {
                $match: {
                  timestamp: {
                    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                  },
                },
              },
              { $count: "count" },
            ],
            last7Days: [
              {
                $match: {
                  timestamp: {
                    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  },
                },
              },
              { $count: "count" },
            ],
            last30Days: [
              {
                $match: {
                  timestamp: {
                    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  },
                },
              },
              { $count: "count" },
            ],
          },
        },
      ]),
    ]);

    // Format danger level stats
    const byDangerLevel = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    dangerStats.forEach((stat) => {
      byDangerLevel[stat._id] = stat.count;
    });

    // Extract time-based stats
    const last24Hours = timeStats[0]?.last24Hours[0]?.count || 0;
    const last7Days = timeStats[0]?.last7Days[0]?.count || 0;
    const last30Days = timeStats[0]?.last30Days[0]?.count || 0;

    res.json({
      success: true,
      data: {
        total,
        byDangerLevel,
        last24Hours,
        last7Days,
        last30Days,
      },
    });
  } catch (error) {
    next(error);
  }
}
