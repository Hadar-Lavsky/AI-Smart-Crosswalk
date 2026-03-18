# Explainer Document: The New Socket.IO Flow

Goal: explain in simple terms what changed, how the flow now works end-to-end, and which code locations to show your instructor.

## Big Picture in One Sentence

The flow is now: detection script processes an image -> creates an alert on the backend -> backend broadcasts a live event -> frontend updates immediately without manual refresh.

## 1) Starting Point: Script Detects and Calculates Risk

The script reads images, runs detection, calculates person relative height, and determines the danger level.

-   Select target crosswalk from backend: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L64)
-   Start processing the image folder: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L124)
-   Run detection per image: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L158)
-   Send only medium/high danger alerts: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L187)
-   Actual backend POST call: [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py#L196)

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

## 7) Main Files to Present to Instructor

1.  [backend/ai/main_with_live_alerts.py](../backend/ai/main_with_live_alerts.py)
2.  [backend/routes/alertRoutes.js](../backend/routes/alertRoutes.js)
3.  [backend/controllers/alertControllers.js](../backend/controllers/alertControllers.js)
4.  [backend/socket/index.js](../backend/socket/index.js)
5.  [backend/server.js](../backend/server.js)
6.  [frontend/src/socket/index.js](../frontend/src/socket/index.js)
7.  [frontend/src/realtime/SocketBridge.jsx](../frontend/src/realtime/SocketBridge.jsx)
8.  [frontend/src/App.jsx](../frontend/src/App.jsx)

## 8) One-Line Presentation Summary

"We added a real-time layer that connects backend alert creation to immediate frontend updates, so the system behaves like a live stream instead of periodic refresh only."