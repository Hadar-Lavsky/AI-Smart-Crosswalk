import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from './config/db.js';
import { alertRoutes, crosswalkRoutes, cameraRoutes, ledRoutes } from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Load environment variables
dotenv.config();

console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Found' : '❌ Missing');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Serve YOLO detection output images as static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use('/api/images', express.static(join(__dirname, 'ai', 'mocks_img_output')));

// API Routes
app.use('/api/alerts', alertRoutes);
app.use('/api/crosswalks', crosswalkRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/leds', ledRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Crosswalk API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Smart Crosswalk API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      alerts: '/api/alerts',
      crosswalks: '/api/crosswalks',
      cameras: '/api/cameras',
      leds: '/api/leds'
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
