# AI Smart Crosswalk

An AI-powered crosswalk safety monitoring system that uses computer vision to detect pedestrians, assess danger levels, and manage LED signals for safer crosswalks.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express 4, Mongoose 8 |
| Frontend | React 18, Vite 5, TanStack Query 5, Tailwind CSS 4 |
| AI Module | Python, YOLOv8, Google Gemini |
| Database | MongoDB Atlas |
| Media | Cloudinary (image/video storage) |
| Real-time | Socket.IO |

## Project Structure

```
smart-crosswalk/
├── backend/
│   ├── ai/                 # Python AI detection module
│   ├── config/             # Database configuration
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Validation & error handling
│   ├── models/             # MongoDB schemas (Alert, Camera, Crosswalk, LED)
│   ├── routes/             # API route definitions
│   ├── scripts/            # Database seeding
│   ├── socket/             # Socket.IO realtime layer
│   ├── utils/              # Helper functions
│   └── server.js           # Entry point
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client & API modules
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Feature-specific hooks & components
│   │   ├── hooks/          # Custom React hooks (useDialog, queryKeys)
│   │   ├── pages/          # Page components (Dashboard, Alerts, Crosswalks)
│   │   ├── realtime/       # Socket.IO client integration
│   │   ├── utils/          # Helper functions
│   │   └── App.jsx         # Main app with routing
│   └── index.html
├── docs/                    # Architecture docs
├── start-all.bat            # Start backend + frontend (Windows)
├── start-backend.bat        # Start backend only
└── start-frontend.bat       # Start frontend only
```

## Prerequisites

- Node.js 18+
- Python 3.8+ (for AI module)
- MongoDB Atlas account
- Cloudinary account (for media storage)

## Setup

### Backend

```bash
cd smart-crosswalk/backend
npm install
```

Create a `.env` file:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

Run the server:

```bash
npm run dev       # Development (auto-reload)
npm start         # Production
npm run seed      # Seed database with sample data
```

### Frontend

```bash
cd smart-crosswalk/frontend
npm install
npm run dev       # Starts at http://localhost:5173
```

Create a `.env` file (optional, see `.env.example`):

```env
VITE_API_URL=/api
# Override proxy target if needed:
# VITE_BACKEND_URL=http://192.168.1.100:3000
```

### AI Module

```bash
cd smart-crosswalk/backend/ai

# Windows
setup.bat

# Linux/Mac
chmod +x setup.sh && ./setup.sh
```

Create a `.env` file (see `.env.example`):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
BACKEND_API_URL=http://localhost:3000/api/alerts
```

Run detection:

```bash
python main.py              # Single detection
python main_with_live_alerts.py  # Continuous monitoring with alerts
```

## API Endpoints

Base URL: `http://localhost:3000/api`

| Resource | Endpoints |
|----------|-----------|
| **Alerts** `/api/alerts` | `GET /` `GET /:id` `POST /` `PATCH /:id` `DELETE /:id` `GET /stats` |
| **Crosswalks** `/api/crosswalks` | `GET /` `GET /:id` `POST /` `PATCH /:id` `DELETE /:id` `GET /search` `GET /stats` `GET /:id/alerts` `GET /:id/alert-stats` |
| **Cameras** `/api/cameras` | `GET /` `GET /:id` `POST /` `PATCH /:id/status` `DELETE /:id` |
| **LEDs** `/api/leds` | `GET /` `GET /:id` `POST /` `DELETE /:id` |
| **Health** `/api/health` | `GET /` |

**Pagination:** Endpoints accept `?page=1&limit=10` query parameters.

## Features

- **Real-time pedestrian detection** using YOLOv8 computer vision
- **Danger level assessment** (Low / Medium / High) based on detection analysis
- **LED signal management** for crosswalk guidance
- **Alert system** with filtering by date range and danger level
- **Crosswalk management** with camera and LED device association
- **Paginated lists** with "Load More" for alerts and crosswalks
- **Statistics dashboard** with aggregated metrics
- **Real-time updates** via Socket.IO for instant alert notifications
- **Responsive UI** with Tailwind CSS

## Architecture Highlights

- **Separation of Concerns:** Controllers, models, and routes neatly organized
- **Reusable Helpers:** Common logic centralized in `controllerHelpers.js`
- **Custom Hooks:** Dialog state management via `useDialog()`, data fetching with TanStack Query
- **Real-time Layer:** Socket.IO integration for instant alert broadcasting
- **Image Management:** Cloudinary integration for secure asset storage

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add your feature"`
3. Push to remote: `git push origin feature/your-feature`
4. Create a Pull Request
