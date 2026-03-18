import { Server } from "socket.io";

let ioInstance = null;

export const TRAFFIC_NAMESPACE = "/traffic";
const DASHBOARD_ROOM = "dashboard";

function toCrosswalkRoom(crosswalkId) {
  return `crosswalk:${crosswalkId}`;
}

function toCrosswalkLEDRoom(crosswalkId) {
  return `crosswalk:${crosswalkId}:leds`;
}

function toLedRoom(ledId) {
  return `led:${ledId}`;
}

function parseCrosswalkId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

function getTrafficNamespaceOrThrow() {
  if (!ioInstance) {
    throw new Error("Socket.IO is not initialized");
  }

  return ioInstance.of(TRAFFIC_NAMESPACE);
}

export function initSocket(server, options = {}) {
  // Prevent creating multiple Socket.IO servers in hot-reload scenarios.
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(server, options);

  ioInstance.on("connection", (socket) => {
    console.log(`Socket connected on / : ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected on / : ${socket.id}`);
    });
  });

  const traffic = ioInstance.of(TRAFFIC_NAMESPACE);

  traffic.on("connection", (socket) => {
    console.log(`Socket connected on ${TRAFFIC_NAMESPACE}: ${socket.id}`);

    socket.on("subscribe:dashboard", (ack) => {
      // Dashboard clients join one shared room for global alert updates.
      socket.join(DASHBOARD_ROOM);
      if (typeof ack === "function") {
        ack({ success: true, room: DASHBOARD_ROOM });
      }
    });

    socket.on("subscribe:crosswalk", (payload, ack) => {
      const crosswalkId = parseCrosswalkId(payload?.crosswalkId);
      if (!crosswalkId) {
        if (typeof ack === "function") {
          ack({ success: false, message: "crosswalkId is required" });
        }
        return;
      }

      const room = toCrosswalkRoom(crosswalkId);
      socket.join(room);

      if (typeof ack === "function") {
        ack({ success: true, room });
      }
    });

    socket.on("device:register", (payload, ack) => {
      const crosswalkId = parseCrosswalkId(payload?.crosswalkId);
      const ledId = parseCrosswalkId(payload?.ledId);

      if (ledId) {
        socket.join(toLedRoom(ledId));
      }

      if (crosswalkId) {
        socket.join(toCrosswalkLEDRoom(crosswalkId));
      }

      if (typeof ack === "function") {
        ack({
          success: true,
          ledRoom: ledId ? toLedRoom(ledId) : null,
          crosswalkRoom: crosswalkId ? toCrosswalkLEDRoom(crosswalkId) : null,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected on ${TRAFFIC_NAMESPACE}: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function emitAlertRealtime(alert) {
  if (!ioInstance) {
    throw new Error("Socket.IO is not initialized");
  }
  const traffic = getTrafficNamespaceOrThrow();

  const payload = {
    type: "alert:new",
    data: alert,
  };

  // Broadcast to all root clients (kept for compatibility with existing listeners).
  ioInstance.emit("alert:new", payload);

  const crosswalkId = parseCrosswalkId(alert?.crosswalkId);
  if (crosswalkId) {
    // Crosswalk room gets only alerts related to this crosswalk.
    traffic.to(toCrosswalkRoom(crosswalkId)).emit("alert:new", payload);
  }

  // Dashboard room receives every new alert.
  traffic.to(DASHBOARD_ROOM).emit("alert:new", payload);
}

export async function requestLEDCommandAck({
  ledId,
  crosswalkId,
  state,
  timeoutMs = 5000,
  metadata = {},
}) {
  const traffic = getTrafficNamespaceOrThrow();

  const normalizedCrosswalkId = parseCrosswalkId(crosswalkId);
  const normalizedLedId = parseCrosswalkId(ledId);

  const room = normalizedCrosswalkId
    ? toCrosswalkLEDRoom(normalizedCrosswalkId)
    : normalizedLedId
      ? toLedRoom(normalizedLedId)
      : null;

  if (!room) {
    throw new Error("Cannot send LED command without crosswalkId or ledId");
  }

  const subscribers = traffic.adapter.rooms.get(room)?.size || 0;
  if (subscribers === 0) {
    throw new Error(`No LED clients subscribed to room ${room}`);
  }

  const commandPayload = {
    ledId: normalizedLedId,
    crosswalkId: normalizedCrosswalkId,
    state,
    sentAt: new Date().toISOString(),
    ...metadata,
  };

  const responses = await new Promise((resolve, reject) => {
    traffic
      .to(room)
      .timeout(timeoutMs)
      .emit("led:command", commandPayload, (err, clientResponses) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(clientResponses || []);
      });
  });

  return {
    room,
    subscriberCount: subscribers,
    ackCount: responses.length,
    responses,
  };
}

