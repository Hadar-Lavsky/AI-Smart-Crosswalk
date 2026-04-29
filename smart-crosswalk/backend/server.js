import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { initSocket } from "./socket/index.js";
import {
  alertRoutes,
  crosswalkRoutes,
  cameraRoutes,
  ledRoutes,
} from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

// Load environment variables
dotenv.config();

console.log(
  "MONGODB_URI:",
  process.env.MONGODB_URI ? "✅ Found" : "❌ Missing",
);

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));

// API Routes
app.use("/api/alerts", alertRoutes);
app.use("/api/crosswalks", crosswalkRoutes);
app.use("/api/cameras", cameraRoutes);
app.use("/api/leds", ledRoutes);

// Keep-alive endpoint for UptimeRobot (pings every 5 min to prevent Render sleep)
app.get("/api/awake", (req, res) => {
  res.json({ success: true, message: "Server is awake", timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  res.json({
    success: isDbConnected,
    message: isDbConnected
      ? "Smart Crosswalk API is running"
      : "Smart Crosswalk API is running but MongoDB is not connected",
    timestamp: new Date().toISOString(),
    database: {
      connected: isDbConnected,
      state: dbState,
    },
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Smart Crosswalk API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      alerts: "/api/alerts",
      crosswalks: "/api/crosswalks",
      cameras: "/api/cameras",
      leds: "/api/leds",
    },
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 3000;
  const httpServer = createServer(app);

  initSocket(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    },
  });

  httpServer.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use.`);
      process.exit(1);
    }
    console.error(`❌ HTTP Server Error: ${error.message}`);
    process.exit(1);
  });

  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
    );
  });
};

startServer().catch((error) => {
  console.error(`❌ Startup Error: ${error.message}`);
  process.exit(1);
});
