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

  // Connection: bind Socket.IO to the existing HTTP server.
  ioInstance = new Server(server, options);

  // On (Listener): runs for every new client connection on the root namespace.
  ioInstance.on("connection", (socket) => {
    // Socket: this object represents one connected client.
    console.log(`Socket connected on / : ${socket.id}`);

    // Disconnect: listener triggered when the client connection closes.
    socket.on("disconnect", () => {
      console.log(`Socket disconnected on / : ${socket.id}`);
    });
  });

  // Namespace: isolate traffic-related communication under /traffic.
  const traffic = ioInstance.of(TRAFFIC_NAMESPACE);

  // Connection + On (Listener): handles clients that connect to /traffic.
  traffic.on("connection", (socket) => {
    console.log(`Socket connected on ${TRAFFIC_NAMESPACE}: ${socket.id}`);

    // Event: custom event sent by clients that want dashboard updates.
    socket.on("subscribe:dashboard", (ack) => {
      // Dashboard clients join one shared room for global alert updates.
      // Rooms: group sockets so server can target only subscribed clients.
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
      // Rooms: subscribe this socket to a specific crosswalk stream.
      socket.join(room);

      if (typeof ack === "function") {
        ack({ success: true, room });
      }
    });

    socket.on("device:register", (payload, ack) => {
      const crosswalkId = parseCrosswalkId(payload?.crosswalkId);
      const ledId = parseCrosswalkId(payload?.ledId);

      if (ledId) {
        // Rooms: LED devices can receive LED-specific commands.
        socket.join(toLedRoom(ledId));
      }

      if (crosswalkId) {
        // Rooms: crosswalk LED group for command fan-out.
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

    // Disconnect: cleanup/debug point for traffic namespace clients.
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

  // Emit: send event data from server to connected clients.
  // Broadcast: global fan-out to all clients on root namespace.
  ioInstance.emit("alert:new", payload);

  const crosswalkId = parseCrosswalkId(alert?.crosswalkId);
  if (crosswalkId) {
    // Rooms + Emit: target one room instead of sending to everyone.
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

