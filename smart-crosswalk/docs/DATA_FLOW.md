# Smart Crosswalk — Data Flow Documentation

Complete reference mapping every frontend page to the hooks, API services, backend endpoints, and data models that power it.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Backend Endpoints Reference](#2-backend-endpoints-reference)
3. [Frontend API Services](#3-frontend-api-services)
4. [React Query Cache Keys](#4-react-query-cache-keys)
5. [Custom Hooks Reference](#5-custom-hooks-reference)
6. [Page-by-Page Data Flow](#6-page-by-page-data-flow)
7. [Cache Invalidation Map](#7-cache-invalidation-map)
8. [Middleware Reference](#8-middleware-reference)

---

## 1. Architecture Overview

```
React (Vite) ──Axios──▶ Express.js ──Mongoose──▶ MongoDB
     │                      │
     │                      ├── /api/alerts
     │                      ├── /api/crosswalks
     │                      ├── /api/cameras
     │                      └── /api/leds
     │
     ├── API layer        (frontend/src/api/)
     ├── React Query hooks (frontend/src/hooks/)
     └── Pages             (frontend/src/pages/)
```

### API Base URL

```js
// frontend/src/api/config.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Response interceptor — extracts .data automatically
api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
);
```

### React Query Global Config

```js
// frontend/src/main.jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes — garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

## 2. Backend Endpoints Reference

**Server entry:** `backend/server.js`

### Global

| Method | Path           | Description     |
| ------ | -------------- | --------------- |
| `GET`  | `/`            | Welcome message |
| `GET`  | `/api/health`  | Health check    |

> Static file serving: `/api/images` serves YOLO detection images from disk.

---

### Alerts — 6 endpoints

> **Route file:** `backend/routes/alertRoutes.js`
> **Controller:** `backend/controllers/alertControllers.js`
> **Model:** `backend/models/Alert.js`
> **Fields:** `dangerLevel` (LOW / MEDIUM / HIGH), `crosswalkId` (ref), `imageUrl` (string), `timestamp`

#### `GET /api/alerts` — Get all alerts

| Detail     | Value           |
| ---------- | --------------- |
| Controller | `getAllAlerts`   |
| Middleware | —               |

- Optional query params: `dangerLevel`, `crosswalkId`
- Sorted by `timestamp` descending
- Populates the full crosswalk chain (crosswalk → camera, LED)

#### `GET /api/alerts/stats` — Alert statistics

| Detail     | Value      |
| ---------- | ---------- |
| Controller | `getStats` |
| Middleware | —          |

- Returns `{ total, low, medium, high }`
- Uses 4 parallel `countDocuments()` calls (index-only, no document transfer)

#### `GET /api/alerts/:id` — Single alert

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `getAlertById`     |
| Middleware | `validateObjectId` |

- Populates the full crosswalk chain

#### `POST /api/alerts` — Create alert

| Detail     | Value           |
| ---------- | --------------- |
| Controller | `createAlert`   |
| Middleware | `parseAlertBody` |

- Body: `crosswalkId?`, `dangerLevel?`, `imageUrl?`, `confidence?`, `cameraId?`, `location?`
- Auto-finds or creates a crosswalk if `location` is provided

#### `PATCH /api/alerts/:id` — Update alert

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `updateAlertById`  |
| Middleware | `validateObjectId` |

#### `DELETE /api/alerts/:id` — Delete alert

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `deleteAlertById`  |
| Middleware | `validateObjectId` |

---

### Crosswalks — 12 endpoints

> **Route file:** `backend/routes/crosswalkRoutes.js`
> **Controller:** `backend/controllers/crosswalkControllers.js`
> **Model:** `backend/models/Crosswalk.js`
> **Fields:** `location` (required: `{ city, street, number }`), `cameraId` (ref → Camera), `ledId` (ref → LED)

#### `GET /api/crosswalks` — Get all crosswalks

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `getAllCrosswalks`  |
| Middleware | —                  |

- Populates camera + LED references
- Sorted by `createdAt` descending

#### `GET /api/crosswalks/search` — Search crosswalks

| Detail     | Value                |
| ---------- | -------------------- |
| Controller | `searchCrosswalks`   |
| Middleware | `validateSearchQuery` |

- Query: `q` (min 2 chars), `limit?` (default 10)
- Case-insensitive regex on `city` / `street` / `number`

#### `GET /api/crosswalks/stats` — Crosswalk statistics

| Detail     | Value      |
| ---------- | ---------- |
| Controller | `getStats` |
| Middleware | —          |

- Returns `{ total }` via `countDocuments()`

#### `GET /api/crosswalks/:id` — Single crosswalk

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `getCrosswalkById` |
| Middleware | `validateObjectId` |

- Populates camera + LED references

#### `GET /api/crosswalks/:id/alerts` — Paginated alerts for crosswalk

| Detail     | Value                |
| ---------- | -------------------- |
| Controller | `getCrosswalkAlerts` |
| Middleware | `validateObjectId`   |

- Query params: `startDate?`, `endDate?`, `dangerLevel?`, `sortBy?` (newest / oldest / danger), `limit?` (default 50), `page?` (default 1)
- Returns `{ alerts: [...], pagination: { totalPages, totalAlerts, hasMore } }`

#### `GET /api/crosswalks/:id/stats` — Alert stats for crosswalk

| Detail     | Value                    |
| ---------- | ------------------------ |
| Controller | `getCrosswalkAlertStats` |
| Middleware | `validateObjectId`       |

- Returns `{ total, byDangerLevel: { HIGH, MEDIUM, LOW }, last24h, last7d, last30d }`
- Uses MongoDB aggregation pipeline

#### `POST /api/crosswalks` — Create crosswalk

| Detail     | Value                     |
| ---------- | ------------------------- |
| Controller | `createCrosswalk`         |
| Middleware | `validateCreateCrosswalk` |

- Body: `location: { city, street, number }`, `cameraId?`, `ledId?`

#### `PATCH /api/crosswalks/:id` — Update crosswalk

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `updateCrosswalk`  |
| Middleware | `validateObjectId` |

#### `DELETE /api/crosswalks/:id` — Delete crosswalk

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `deleteCrosswalk`  |
| Middleware | `validateObjectId` |

#### `PATCH /api/crosswalks/:id/camera` — Link camera

| Detail     | Value                                    |
| ---------- | ---------------------------------------- |
| Controller | `linkCamera`                             |
| Middleware | `validateObjectId`, `validateLinkCamera` |

- Body: `{ cameraId }`
- Verifies camera exists before linking

#### `DELETE /api/crosswalks/:id/camera` — Unlink camera

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `unlinkCamera`     |
| Middleware | `validateObjectId` |

- Sets `cameraId` to `null`

#### `PATCH /api/crosswalks/:id/led` — Link LED

| Detail     | Value                                 |
| ---------- | ------------------------------------- |
| Controller | `linkLED`                             |
| Middleware | `validateObjectId`, `validateLinkLED` |

- Body: `{ ledId }`
- Verifies LED exists before linking

#### `DELETE /api/crosswalks/:id/led` — Unlink LED

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `unlinkLED`        |
| Middleware | `validateObjectId` |

- Sets `ledId` to `null`

---

### Cameras — 6 endpoints

> **Route file:** `backend/routes/cameraRoutes.js`
> **Controller:** `backend/controllers/cameraControllers.js`
> **Model:** `backend/models/Camera.js`
> **Fields:** `status` (enum: `active` | `inactive` | `error`, default: `active`)

#### `GET /api/cameras` — Get all cameras

| Detail     | Value           |
| ---------- | --------------- |
| Controller | `getAllCameras`  |
| Middleware | —               |

- Sorted by `createdAt` descending

#### `GET /api/cameras/:id` — Single camera

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `getCameraById`    |
| Middleware | `validateObjectId` |

#### `POST /api/cameras` — Create camera

| Detail     | Value          |
| ---------- | -------------- |
| Controller | `createCamera` |
| Middleware | —              |

- Body: `{ status? }`

#### `PATCH /api/cameras/:id/status` — Update camera status

| Detail     | Value                                      |
| ---------- | ------------------------------------------ |
| Controller | `updateCameraStatus`                       |
| Middleware | `validateObjectId`, `validateCameraStatus` |

- Body: `{ status }` — must be `active`, `inactive`, or `error`

#### `PATCH /api/cameras/:id` — General camera update

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `updateCamera`     |
| Middleware | `validateObjectId` |

#### `DELETE /api/cameras/:id` — Delete camera

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `deleteCamera`     |
| Middleware | `validateObjectId` |

- Blocked with 400 if camera is linked to a crosswalk

---

### LEDs — 4 endpoints

> **Route file:** `backend/routes/ledRoutes.js`
> **Controller:** `backend/controllers/ledControllers.js`
> **Model:** `backend/models/LED.js`
> **Fields:** timestamps only

#### `GET /api/leds` — Get all LEDs

| Detail     | Value        |
| ---------- | ------------ |
| Controller | `getAllLEDs`  |
| Middleware | —            |

- Sorted by `createdAt` descending

#### `GET /api/leds/:id` — Single LED

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `getLEDById`       |
| Middleware | `validateObjectId` |

#### `POST /api/leds` — Create LED

| Detail     | Value       |
| ---------- | ----------- |
| Controller | `createLED` |
| Middleware | —           |

#### `DELETE /api/leds/:id` — Delete LED

| Detail     | Value              |
| ---------- | ------------------ |
| Controller | `deleteLED`        |
| Middleware | `validateObjectId` |

- Blocked with 400 if LED is linked to a crosswalk

---

## 3. Frontend API Services

All services are in `frontend/src/api/` and use the shared Axios instance from `config.js`.

### alertsApi — `frontend/src/api/alerts.js`

| Function           | Method   | Endpoint        | Params / Body         |
| ------------------ | -------- | --------------- | --------------------- |
| `getAll(params)`   | `GET`    | `/alerts`       | Optional query params |
| `getById(id)`      | `GET`    | `/alerts/:id`   | —                     |
| `create(data)`     | `POST`   | `/alerts`       | Alert data object     |
| `update(id, data)` | `PATCH`  | `/alerts/:id`   | Update fields         |
| `delete(id)`       | `DELETE` | `/alerts/:id`   | —                     |
| `getStats()`       | `GET`    | `/alerts/stats` | —                     |

### crosswalksApi — `frontend/src/api/crosswalks.js`

| Function                   | Method   | Endpoint                 | Params / Body                         |
| -------------------------- | -------- | ------------------------ | ------------------------------------- |
| `getAll(params)`           | `GET`    | `/crosswalks`            | Optional query params                 |
| `getById(id)`              | `GET`    | `/crosswalks/:id`        | —                                     |
| `create(data)`             | `POST`   | `/crosswalks`            | `{ location, cameraId?, ledId? }`     |
| `update(id, data)`         | `PATCH`  | `/crosswalks/:id`        | Update fields                         |
| `delete(id)`               | `DELETE` | `/crosswalks/:id`        | —                                     |
| `getStats()`               | `GET`    | `/crosswalks/stats`      | —                                     |
| `search(query, limit)`     | `GET`    | `/crosswalks/search`     | `?q=...&limit=...`                    |
| `getAlerts(id, filters)`   | `GET`    | `/crosswalks/:id/alerts` | `?startDate&endDate&dangerLevel&...`  |
| `getCrosswalkStats(id)`    | `GET`    | `/crosswalks/:id/stats`  | —                                     |
| `linkCamera(id, cameraId)` | `PATCH`  | `/crosswalks/:id/camera` | `{ cameraId }`                        |
| `unlinkCamera(id)`         | `DELETE` | `/crosswalks/:id/camera` | —                                     |
| `linkLED(id, ledId)`       | `PATCH`  | `/crosswalks/:id/led`    | `{ ledId }`                           |
| `unlinkLED(id)`            | `DELETE` | `/crosswalks/:id/led`    | —                                     |

### camerasApi — `frontend/src/api/cameras.js`

| Function                   | Method   | Endpoint              | Params / Body         |
| -------------------------- | -------- | --------------------- | --------------------- |
| `getAll(params)`           | `GET`    | `/cameras`            | Optional query params |
| `getById(id)`              | `GET`    | `/cameras/:id`        | —                     |
| `create(data)`             | `POST`   | `/cameras`            | `{ status? }`         |
| `updateStatus(id, status)` | `PATCH`  | `/cameras/:id/status` | `{ status }`          |
| `update(id, data)`         | `PATCH`  | `/cameras/:id`        | Update fields         |
| `delete(id)`               | `DELETE` | `/cameras/:id`        | —                     |

### ledsApi — `frontend/src/api/leds.js`

| Function         | Method   | Endpoint    | Params / Body         |
| ---------------- | -------- | ----------- | --------------------- |
| `getAll(params)` | `GET`    | `/leds`     | Optional query params |
| `getById(id)`    | `GET`    | `/leds/:id` | —                     |
| `create(data)`   | `POST`   | `/leds`     | `{}`                  |
| `delete(id)`     | `DELETE` | `/leds/:id` | —                     |

---

## 4. React Query Cache Keys

Defined in `frontend/src/hooks/queryKeys.js`:

| Key Name                   | Cache Key Array                          | Used By                  |
| -------------------------- | ---------------------------------------- | ------------------------ |
| `alerts.all`               | `["alerts"]`                             | `useAlertList`           |
| `alerts.stats`             | `["alerts-stats"]`                       | `useAlertStats`          |
| `crosswalks.all`           | `["crosswalks"]`                         | `useCrosswalkList`       |
| `crosswalks.stats`         | `["crosswalks-stats"]`                   | `useCrosswalkStats`      |
| `crosswalks.detail(id)`    | `["crosswalk", id]`                      | `useCrosswalkDetails`    |
| `crosswalks.alerts(id,..)` | `["crosswalk-alerts", id, filters, page]`| `useCrosswalkDetails`    |
| `crosswalks.detailStats(id)` | `["crosswalk-stats", id]`              | `useCrosswalkDetails`    |
| `cameras.all`              | `["cameras"]`                            | `useCameraList`          |
| `leds.all`                 | `["leds"]`                               | `useLEDList`             |

---

## 5. Custom Hooks Reference

All hooks in `frontend/src/hooks/`, barrel-exported via `frontend/src/hooks/index.js`.

### Alerts Domain — `frontend/src/hooks/alerts/`

#### `useAlertList(options?)`

- **Type:** Query (read)
- **API call:** `alertsApi.getAll()`
- **Cache key:** `["alerts"]`
- **Auto-refresh:** `true` by default, every 5 000 ms
- **Returns:** `{ alerts, loading, error, refetch }`

#### `useAlertStats(options?)`

- **Type:** Query (read)
- **API call:** `alertsApi.getStats()`
- **Cache key:** `["alerts-stats"]`
- **Auto-refresh:** `true` by default, every 5 000 ms
- **Returns:** `{ stats: { total, low, medium, high }, loading }`

#### `useAlertMutations()`

- **Type:** Mutations (write)
- **API calls:** `alertsApi.create`, `.update`, `.delete`
- **Invalidates on success:** `["alerts"]` + `["alerts-stats"]`
- **Returns:** `{ createAlert, updateAlert, deleteAlert }`

#### `useAlerts(autoRefresh?, refreshInterval?)` — Composite

- **Combines:** `useAlertList` + `useAlertStats` + `useAlertMutations`
- **Returns:** `{ alerts, stats, loading, error, refetch, createAlert, updateAlert, deleteAlert }`

---

### Crosswalks Domain — `frontend/src/hooks/crosswalks/`

#### `useCrosswalkList()`

- **Type:** Query (read)
- **API call:** `crosswalksApi.getAll()`
- **Cache key:** `["crosswalks"]`
- **Auto-refresh:** No
- **Returns:** `{ crosswalks, loading, error, refetch }`

#### `useCrosswalkStats()`

- **Type:** Query (read)
- **API call:** `crosswalksApi.getStats()`
- **Cache key:** `["crosswalks-stats"]`
- **Auto-refresh:** No
- **Returns:** `{ stats: { total }, loading }`

#### `useCrosswalkMutations()`

- **Type:** Mutations (write)
- **API calls:** `crosswalksApi.create`, `.update`, `.delete`
- **Invalidates on success:**
  - Create / Delete → `["crosswalks"]` + `["crosswalks-stats"]`
  - Update → `["crosswalks"]` only
- **Returns:** `{ createCrosswalk, updateCrosswalk, deleteCrosswalk }`

#### `useCrosswalkLinkMutations()`

- **Type:** Mutations (write)
- **API calls:** `crosswalksApi.linkCamera`, `.unlinkCamera`, `.linkLED`, `.unlinkLED`
- **Invalidates on success:** `["crosswalks"]`
- **Returns:** `{ linkCamera, unlinkCamera, linkLED, unlinkLED }`

#### `useCrosswalks()` — Composite

- **Combines:** list + stats + CRUD + link mutations
- **Returns:** `{ crosswalks, stats, loading, error, refetch, createCrosswalk, updateCrosswalk, deleteCrosswalk, linkCamera, unlinkCamera, linkLED, unlinkLED }`

#### `useCrosswalkDetails(crosswalkId)` — `frontend/src/hooks/useCrosswalkDetails.js`

- **Type:** Composite — 3 parallel queries + local state for filters/pagination
- **Query 1 — Crosswalk:**
  - `crosswalksApi.getById(id)` → cache key `["crosswalk", id]`
  - Uses list cache (`["crosswalks"]`) as `initialData` for instant display
- **Query 2 — Alerts:**
  - `crosswalksApi.getAlerts(id, filters)` → cache key `["crosswalk-alerts", id, filters, page]`
  - Refetches when filters or page number change
- **Query 3 — Stats:**
  - `crosswalksApi.getCrosswalkStats(id)` → cache key `["crosswalk-stats", id]`
- **Local state:** `filters: { dateRange, dangerLevel, sortBy }`, `currentPage`
- **Returns:**
  ```
  { crosswalk, alerts, stats, filters, updateFilters, clearFilters,
    pagination: { currentPage, totalPages, totalAlerts, hasMore },
    goToPage, loading, isInitialLoading, error, refetch }
  ```

---

### Cameras Domain — `frontend/src/hooks/cameras/`

#### `useCameraList(options?)`

- **Type:** Query (read)
- **API call:** `camerasApi.getAll()`
- **Cache key:** `["cameras"]`
- **Auto-refresh:** `false` by default. If enabled: 10 000 ms.
- **Returns:** `{ cameras, loading, error, refetch }`

#### `useCameraMutations()`

- **Type:** Mutations (write)
- **API calls:** `camerasApi.create`, `.updateStatus`, `.delete`
- **Invalidates on success:** `["cameras"]` + `["crosswalks"]` (cameras are linked to crosswalks)
- **Returns:** `{ createCamera, updateCameraStatus, deleteCamera }`

#### `useCameras(options?)` — Composite

- **Combines:** `useCameraList` + `useCameraMutations`
- **Returns:** `{ cameras, loading, error, refetch, createCamera, updateCameraStatus, deleteCamera }`

---

### LEDs Domain — `frontend/src/hooks/leds/`

#### `useLEDList(options?)`

- **Type:** Query (read)
- **API call:** `ledsApi.getAll()`
- **Cache key:** `["leds"]`
- **Auto-refresh:** `false` by default. If enabled: 10 000 ms.
- **Returns:** `{ leds, loading, error, refetch }`

#### `useLEDMutations()`

- **Type:** Mutations (write)
- **API calls:** `ledsApi.create`, `.delete`
- **Invalidates on success:** `["leds"]` + `["crosswalks"]` (LEDs are linked to crosswalks)
- **Returns:** `{ createLED, deleteLED }`

#### `useLEDs(options?)` — Composite

- **Combines:** `useLEDList` + `useLEDMutations`
- **Returns:** `{ leds, loading, error, refetch, createLED, deleteLED }`

---

## 6. Page-by-Page Data Flow

### 6.1 Dashboard (`/`)

**File:** `frontend/src/pages/Dashboard.jsx`

```
Dashboard.jsx
  ├── useAlertStats()         ──▶ GET /api/alerts/stats
  ├── useCrosswalkStats()     ──▶ GET /api/crosswalks/stats
  ├── useCameraList()         ──▶ GET /api/cameras
  ├── useCameraMutations()    ──▶ POST / PATCH / DELETE /api/cameras/...
  ├── useLEDList()            ──▶ GET /api/leds
  ├── useLEDMutations()       ──▶ POST / DELETE /api/leds/...
  └── useToast()
```

**Data consumed:**

| Hook                  | Data Extracted                        | Rendered In                          |
| --------------------- | ------------------------------------- | ------------------------------------ |
| `useAlertStats()`     | `stats: { total, low, medium, high }` | `<StatsGrid>` — 4 stat cards        |
| `useCrosswalkStats()` | `stats: { total }`                    | `<StatsGrid>` — crosswalk count     |
| `useCameraList()`     | `cameras: Camera[]`                   | `<GenericList type="camera">`        |
| `useLEDList()`        | `leds: LED[]`                         | `<GenericList type="led">`           |

**Mutations:**

| Action               | Hook Method                      | Endpoint                        |
| -------------------- | -------------------------------- | ------------------------------- |
| Create camera        | `createCamera(data)`             | `POST /api/cameras`             |
| Update camera status | `updateCameraStatus(id, status)` | `PATCH /api/cameras/:id/status` |
| Delete camera        | `deleteCamera(id)`               | `DELETE /api/cameras/:id`       |
| Create LED           | `createLED(data)`                | `POST /api/leds`                |
| Delete LED           | `deleteLED(id)`                  | `DELETE /api/leds/:id`          |

**Dialogs:**

| Dialog           | Purpose                |
| ---------------- | ---------------------- |
| `CameraDialog`   | Create / edit camera   |
| `LEDDialog`      | Create LED             |
| `ConfirmDialog`  | Delete camera confirm  |
| `ConfirmDialog`  | Delete LED confirm     |

**Local state:** `showDevices`, `cameraForm`, `cameraDelete`, `cameraSubmitting`, `ledForm`, `ledDelete`, `ledSubmitting`

---

### 6.2 Alerts (`/alerts`)

**File:** `frontend/src/pages/Alerts.jsx`

```
Alerts.jsx
  ├── useAlerts()             ──▶ Combined hook
  │   ├── useAlertList()      ──▶ GET /api/alerts           (auto-refresh 5s)
  │   ├── useAlertStats()     ──▶ GET /api/alerts/stats     (auto-refresh 5s)
  │   └── useAlertMutations() ──▶ POST / PATCH / DELETE /api/alerts/...
  ├── useCrosswalks()         ──▶ GET /api/crosswalks       (for filter dropdown)
  └── useToast()
```

**Data consumed:**

| Hook              | Data Extracted                        | Rendered In                                        |
| ----------------- | ------------------------------------- | -------------------------------------------------- |
| `useAlerts()`     | `alerts: Alert[]`                     | `<GenericList type="alert">` (after filtering)     |
| `useAlerts()`     | `stats: { total, high, medium, low }` | `<StatsGrid>` — 4 stat cards                      |
| `useCrosswalks()` | `crosswalks: Crosswalk[]`             | `<FilterBar>` — crosswalk search dropdown          |

**Client-side filtering:**

```
filters: {
  dangerLevel:    'all' | 'HIGH' | 'MEDIUM' | 'LOW'
  crosswalkSearch: string          // matches city / street / number
  dateRange:      { startDate, endDate }
}

filteredAlerts = alerts.filter(...)  // applied before passing to GenericList
```

**Mutations:**

| Action       | Hook Method             | Endpoint                 |
| ------------ | ----------------------- | ------------------------ |
| Create alert | `createAlert(data)`     | `POST /api/alerts`       |
| Update alert | `updateAlert(id, data)` | `PATCH /api/alerts/:id`  |
| Delete alert | `deleteAlert(id)`       | `DELETE /api/alerts/:id` |

**Dialogs:**

| Dialog          | Purpose              |
| --------------- | -------------------- |
| `AlertDialog`   | Create / edit alert  |
| `ConfirmDialog` | Delete alert confirm |

**Local state:** `filters`, `formDialog`, `deleteDialog`, `submitting`

---

### 6.3 Crosswalks (`/crosswalks`)

**File:** `frontend/src/pages/Crosswalks.jsx`

```
Crosswalks.jsx
  ├── useCrosswalks()              ──▶ Combined hook
  │   ├── useCrosswalkList()       ──▶ GET /api/crosswalks
  │   ├── useCrosswalkStats()      ──▶ GET /api/crosswalks/stats
  │   ├── useCrosswalkMutations()  ──▶ POST / PATCH / DELETE /api/crosswalks/...
  │   └── useCrosswalkLinkMutations()
  │       ├── linkCamera()         ──▶ PATCH  /api/crosswalks/:id/camera
  │       ├── unlinkCamera()       ──▶ DELETE /api/crosswalks/:id/camera
  │       ├── linkLED()            ──▶ PATCH  /api/crosswalks/:id/led
  │       └── unlinkLED()          ──▶ DELETE /api/crosswalks/:id/led
  ├── useCameras()                 ──▶ GET /api/cameras
  ├── useLEDs()                    ──▶ GET /api/leds
  └── useToast()
```

**Data consumed:**

| Hook              | Data Extracted            | Rendered In                                                |
| ----------------- | ------------------------- | ---------------------------------------------------------- |
| `useCrosswalks()` | `crosswalks: Crosswalk[]` | `<GenericList type="crosswalk">` (after search filter)     |
| `useCameras()`    | `cameras: Camera[]`       | `<CrosswalkDialog>` + `<CrosswalkEditDialog>` — selects    |
| `useLEDs()`       | `leds: LED[]`             | `<CrosswalkDialog>` + `<CrosswalkEditDialog>` — selects    |

**Client-side filtering:**

```
searchQuery: string  // filters crosswalks by city / street / number
```

**Stats computed client-side:**

```
stats = [
  { title: 'Total Crosswalks', value: crosswalks.length                                },
  { title: 'Active',           value: count where cameraId?.status === 'active'        },
  { title: 'With Camera',      value: count where cameraId exists                      },
  { title: 'With LED',         value: count where ledId exists                         },
]
```

**Mutations:**

| Action                 | Hook Method                 | Endpoint                            |
| ---------------------- | --------------------------- | ----------------------------------- |
| Create crosswalk       | `createCrosswalk(data)`     | `POST /api/crosswalks`              |
| Update crosswalk       | `updateCrosswalk(id, data)` | `PATCH /api/crosswalks/:id`         |
| Delete crosswalk       | `deleteCrosswalk(id)`       | `DELETE /api/crosswalks/:id`        |
| Link camera            | `linkCamera(id, cameraId)`  | `PATCH /api/crosswalks/:id/camera`  |
| Unlink camera          | `unlinkCamera(id)`          | `DELETE /api/crosswalks/:id/camera` |
| Link LED               | `linkLED(id, ledId)`        | `PATCH /api/crosswalks/:id/led`     |
| Unlink LED             | `unlinkLED(id)`             | `DELETE /api/crosswalks/:id/led`    |
| Create camera (inline) | `createCamera(data)`        | `POST /api/cameras`                 |
| Create LED (inline)    | `createLED(data)`           | `POST /api/leds`                    |

**Dialogs:**

| Dialog                | Purpose                         |
| --------------------- | ------------------------------- |
| `CrosswalkDialog`     | Create crosswalk                |
| `CrosswalkEditDialog` | Edit + link/unlink devices      |
| `ConfirmDialog`       | Delete crosswalk confirm        |

**Navigation:** Clicking a crosswalk row calls `navigate('/crosswalks/:id')`

**Local state:** `searchQuery`, `formDialog`, `deleteDialog`, `editDialog`, `submitting`

---

### 6.4 Crosswalk Details (`/crosswalks/:id`)

**File:** `frontend/src/pages/CrosswalkDetailsPage.jsx`

```
CrosswalkDetailsPage.jsx
  └── useCrosswalkDetails(id)
      ├── Query 1: crosswalksApi.getById(id)            ──▶ GET /api/crosswalks/:id
      ├── Query 2: crosswalksApi.getAlerts(id, filters)  ──▶ GET /api/crosswalks/:id/alerts
      └── Query 3: crosswalksApi.getCrosswalkStats(id)   ──▶ GET /api/crosswalks/:id/stats
```

**Three parallel queries inside `useCrosswalkDetails`:**

| Query              | Endpoint                       | Cache Key                                  |
| ------------------ | ------------------------------ | ------------------------------------------ |
| Crosswalk detail   | `GET /api/crosswalks/:id`      | `["crosswalk", id]`                        |
| Crosswalk alerts   | `GET /api/crosswalks/:id/alerts?...` | `["crosswalk-alerts", id, filters, page]` |
| Crosswalk stats    | `GET /api/crosswalks/:id/stats` | `["crosswalk-stats", id]`                 |

> **Smart caching:** Query 1 uses the `["crosswalks"]` list cache as `initialData` — the crosswalk renders instantly while alerts load in the background.
>
> **Server-side pagination:** Query 2 refetches automatically when filters or page number change.

**Data consumed:**

| Data         | Source           | Rendered In                                          |
| ------------ | ---------------- | ---------------------------------------------------- |
| `crosswalk`  | Query 1          | `<CrosswalkDetailCard>` — location, camera, LED info |
| `alerts`     | Query 2          | `<GenericList type="alert-history">` — event list    |
| `stats`      | Query 3          | `<StatsGrid>` — Total / High / Medium / Low counts   |
| `pagination` | Query 2 response | `<Pagination>` — page controls                       |

**Server-side filtering (local state inside the hook):**

```
filters: {
  dateRange:   { startDate, endDate }
  dangerLevel: 'all' | 'HIGH' | 'MEDIUM' | 'LOW'
  sortBy:      'newest' | 'oldest' | 'danger'
}
currentPage: number
```

**Filter UI:** `DateRangePicker`, `Select` (danger level), Clear button

**Loading strategy:**
- `isInitialLoading` — true only on first load (shows skeleton)
- `loading` — true during any fetch including refetch (keeps content visible)
- If crosswalk found in list cache → shows instantly while alerts load

**No mutations on this page** — read-only view.

---

## 7. Cache Invalidation Map

When a mutation succeeds, React Query automatically invalidates the listed cache keys, triggering a refetch.

### Alert Mutations

| Mutation      | Invalidated Keys                 |
| ------------- | -------------------------------- |
| `createAlert` | `["alerts"]`, `["alerts-stats"]` |
| `updateAlert` | `["alerts"]`, `["alerts-stats"]` |
| `deleteAlert` | `["alerts"]`, `["alerts-stats"]` |

### Crosswalk Mutations

| Mutation             | Invalidated Keys                         |
| -------------------- | ---------------------------------------- |
| `createCrosswalk`    | `["crosswalks"]`, `["crosswalks-stats"]` |
| `updateCrosswalk`    | `["crosswalks"]`                         |
| `deleteCrosswalk`    | `["crosswalks"]`, `["crosswalks-stats"]` |
| `linkCamera`         | `["crosswalks"]`                         |
| `unlinkCamera`       | `["crosswalks"]`                         |
| `linkLED`            | `["crosswalks"]`                         |
| `unlinkLED`          | `["crosswalks"]`                         |

### Camera Mutations

| Mutation             | Invalidated Keys                |
| -------------------- | ------------------------------- |
| `createCamera`       | `["cameras"]`, `["crosswalks"]` |
| `updateCameraStatus` | `["cameras"]`, `["crosswalks"]` |
| `deleteCamera`       | `["cameras"]`, `["crosswalks"]` |

### LED Mutations

| Mutation    | Invalidated Keys             |
| ----------- | ---------------------------- |
| `createLED` | `["leds"]`, `["crosswalks"]` |
| `deleteLED` | `["leds"]`, `["crosswalks"]` |

> **Why camera/LED mutations also invalidate `["crosswalks"]`:**
> Crosswalks hold references to cameras and LEDs. When a camera or LED is created/deleted, the crosswalk list must refetch to reflect updated linked device data.

---

## 8. Middleware Reference

### Global Middleware (applied to all routes)

| Middleware                        | Location                                     | Purpose                                             |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| CORS                              | `server.js`                                  | Configured via `CORS_ORIGIN` env var                |
| `express.json({ limit: '10mb' })` | `server.js`                                  | Parse JSON request bodies (10 MB max)               |
| Static files                      | `server.js`                                  | Serve `/api/images` → YOLO detection images on disk |
| `notFound`                        | `middleware/common/errorMiddleware.js`        | 404 handler for unmatched routes                    |
| `errorHandler`                    | `middleware/common/errorMiddleware.js`        | Global error handler (returns JSON error response)  |

### Per-Route Middleware

| Middleware                | File                                         | Applied To                         | Purpose                                             |
| ------------------------- | -------------------------------------------- | ---------------------------------- | --------------------------------------------------- |
| `validateObjectId`        | `middleware/common/validateObjectId.js`       | All `:id` routes                   | Validates MongoDB ObjectId format                   |
| `parseAlertBody`          | `middleware/alerts/validateAlert.js`          | `POST /api/alerts`                 | Parses `rawLocation` JSON string into object        |
| `validateCameraStatus`    | `middleware/cameras/validateCamera.js`        | `PATCH /api/cameras/:id/status`    | Ensures status is `active` / `inactive` / `error`   |
| `validateCreateCrosswalk` | `middleware/crosswalks/validateCrosswalk.js`  | `POST /api/crosswalks`             | Requires `location.city`, `.street`, `.number`      |
| `validateSearchQuery`     | `middleware/crosswalks/validateCrosswalk.js`  | `GET /api/crosswalks/search`       | Requires query param `q` (min 2 chars)              |
| `validateLinkCamera`      | `middleware/crosswalks/validateCrosswalk.js`  | `PATCH /api/crosswalks/:id/camera` | Requires `cameraId` in request body                 |
| `validateLinkLED`         | `middleware/crosswalks/validateCrosswalk.js`  | `PATCH /api/crosswalks/:id/led`    | Requires `ledId` in request body                    |
