import { io } from "socket.io-client";

function resolveSocketUrl() {
  const explicitUrl = import.meta.env.VITE_SOCKET_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
    try {
      return new URL(apiUrl).origin;
    } catch (_error) {
      return window.location.origin;
    }
  }

  return window.location.origin;
}

export const trafficSocket = io(`${resolveSocketUrl()}/traffic`, {
  path: "/socket.io",
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.5,
  transports: ["polling", "websocket"],
  upgrade: true,
});