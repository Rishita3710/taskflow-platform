import type { Server as SocketIOServer } from "socket.io";

/**
 * The Socket.io server instance is created once in server/index.js
 * (the custom Node server) and stored on globalThis so that Next.js
 * API routes — which run in the same process — can grab it and emit
 * events without spinning up a second socket server.
 */
declare global {
  var __socketIO: SocketIOServer | undefined;
}

export function getIO(): SocketIOServer | undefined {
  return globalThis.__socketIO;
}

export function setIO(io: SocketIOServer) {
  globalThis.__socketIO = io;
}
