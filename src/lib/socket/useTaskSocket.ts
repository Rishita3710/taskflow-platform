"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import Cookies from "js-cookie";

/**
 * NOTE: the access token cookie is httpOnly (set by the server),
 * so client JS cannot read it directly for the socket handshake.
 * In this skeleton we additionally expose a short-lived, non-httpOnly
 * "tf_socket_token" cookie set right after login specifically for
 * this purpose. See src/app/(auth)/login/page.tsx for how it's set,
 * and consider replacing this with a dedicated /api/auth/socket-token
 * endpoint in production for tighter scoping.
 */
export function useTaskSocket(
  taskId: string | undefined,
  onNewComment: (payload: { taskId: string; comment: unknown }) => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const token = Cookies.get("tf_socket_token");
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
      path: "/api/socket.io",
      auth: { token },
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.emit("task:join", taskId);
    socket.on("comment:new", onNewComment);

    return () => {
      socket.emit("task:leave", taskId);
      socket.off("comment:new", onNewComment);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  return socketRef;
}
