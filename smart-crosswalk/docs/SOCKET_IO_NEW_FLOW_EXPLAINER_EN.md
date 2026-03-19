# Explainer Document: The New Socket.IO Flow

Goal: explain in simple terms what changed, how the flow now works end-to-end, and which code locations to show your instructor.

## Big Picture in One Sentence

The flow is now: detection script processes an image -> uploads it to

Cloudinary

(in-memory, no local files) -> creates an alert on the backend with cloud URL -> backend broadcasts a live event -> frontend updates immediately without manual refresh.

## 1) Starting Point: Script Detects and Calculates Risk

The script reads images, runs detection, calculates person relative height, and determines the danger level.

-   Select target crosswalk from backend: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L64)
-   Start processing the image folder: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L124)
-   Run detection per image: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L158)
-   Send only medium/high danger alerts: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L187)

## 1.5) NEW: Upload Detected Image to Cloudinary (In-Memory, No Local Files)

The script encodes the frame as JPEG in memory and uploads directly to

Cloudinary

without saving to disk.

-   In-memory JPEG encoding: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L**) (uses `cv2.imencode()`)
-   Cloudinary upload function: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L**) (`upload_alert_image_to_cloudinary()`)
-   Receive secure cloud URL: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L**)
-   POST alert with cloud URL: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L196)

Key point: No cv2.imwrite(), no local `/detected-image/` folder. Zero disk I/O for images.

## 2) Backend Receives and Saves the Alert

The create request reaches the route, goes to the controller, is saved in DB, then reloaded with populate.

-   Create route endpoint: [backend/routes/alertRoutes.js](../backend/routes/alertRoutes.js#L25)
-   Save to database: [backend/controllers/alertControllers.js](../backend/controllers/alertControllers.js#L115)
-   Reload full object before broadcast: [backend/controllers/alertControllers.js](../backend/controllers/alertControllers.js#L117)

## 3) Main New Change: Real-Time Broadcast

Right after saving, backend broadcasts a new event to connected clients.

Socket.IO

-   Broadcast function: [backend/socket/index.js](../backend/socket/index.js#L108)
-   Event emission line: [backend/socket/index.js](../backend/socket/index.js#L119)
-   Trigger call after alert creation: [backend/controllers/alertControllers.js](../backend/controllers/alertControllers.js#L121)

## 4) What Namespace and Subscription Mean

Namespace

A namespace is a separate logical channel inside the socket layer. It separates domains so events do not all mix together.

-   Dedicated namespace declaration: [backend/socket/index.js](../backend/socket/index.js#L5)

Subscription

A subscription is when the client tells the server: "I want these updates." Here, it is done by joining a room.

-   Dashboard subscription on backend: [backend/socket/index.js](../backend/socket/index.js#L55)
-   Dashboard subscribe request from frontend: [frontend/src/realtime/SocketBridge.jsx](../frontend/src/realtime/SocketBridge.jsx#L18)

## 5) Does Listening Open Automatically on App Startup?

Yes, but in stages:

1.  Backend starts with socket layer and is ready for connections.
2.  Frontend opens socket connection automatically.
3.  After connection, frontend subscribes to the relevant room.
4.  From that point, it listens for alert events.

Important links:

-   HTTP server + socket initialization: [backend/server.js](../backend/server.js#L84), [backend/server.js](../backend/server.js#L85)
-   Frontend socket client connection: [frontend/src/socket/index.js](../frontend/src/socket/index.js#L21)
-   Frontend listener for new alert event: [frontend/src/realtime/SocketBridge.jsx](../frontend/src/realtime/SocketBridge.jsx#L116)

## 6) What Frontend Does When Event Arrives

When an event arrives:

1.  Shows a quick visual alarm for medium/high danger.
2.  Updates cache immediately so user sees change now.
3.  Runs background revalidation for consistency.

-   Immediate cache patch: [frontend/src/realtime/SocketBridge.jsx](../frontend/src/realtime/SocketBridge.jsx#L53)
-   Background revalidation: [frontend/src/realtime/SocketBridge.jsx](../frontend/src/realtime/SocketBridge.jsx#L92)
-   Bridge mounted at app root: [frontend/src/App.jsx](../frontend/src/App.jsx#L18)

## 8) Cloudinary Configuration

The AI script requires

Cloudinary

credentials in `.env`:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

The `configure_cloudinary_from_env()` function validates these at startup. If missing, the script will fail gracefully.

-   Cloudinary setup function: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L**)

## 9) Main Files to Present to Instructor

1.  [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py) — **Cloudinary integration** (in-memory encoding, cloud upload, no local files)
2.  [backend/routes/alertRoutes.js](../backend/routes/alertRoutes.js)
3.  [backend/controllers/alertControllers.js](../backend/controllers/alertControllers.js)
4.  [backend/socket/index.js](../backend/socket/index.js)
5.  [backend/server.js](../backend/server.js)
6.  [frontend/src/socket/index.js](../frontend/src/socket/index.js)
7.  [frontend/src/realtime/SocketBridge.jsx](../frontend/src/realtime/SocketBridge.jsx)
8.  [frontend/src/App.jsx](../frontend/src/App.jsx)

## 10) One-Line Presentation Summary

"We added a cloud-first, real-time layer: detection images upload to

Cloudinary

in memory (zero disk I/O), alerts are created immediately, and

Socket.IO

broadcasts them live to all users—no refresh needed, no local file storage."