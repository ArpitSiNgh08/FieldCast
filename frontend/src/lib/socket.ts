// Socket.io client singleton. The JWT (if present) is sent in the handshake so
// the backend can grant admin abilities; viewers connect anonymously.

import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      auth: { token: getToken() || undefined },
      // Establish a reliable polling connection first, then upgrade to
      // WebSocket when the reverse proxy supports the upgrade correctly.
      // This keeps live score controls working if only the WebSocket path is
      // misconfigured while polling remains available.
      transports: ["polling", "websocket"],
      tryAllTransports: true,
    });
  }
  return socket;
}

/** Re-establish the connection with a fresh token (after login/logout). */
export function refreshSocketAuth() {
  if (socket) {
    socket.auth = { token: getToken() || undefined };
    socket.disconnect().connect();
  }
}
