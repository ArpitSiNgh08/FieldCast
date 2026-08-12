"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";

/** Access the shared Socket.io connection and its connected state. */
export function useSocket() {
  const [socket] = useState<Socket>(() => getSocket());
  // Keep SSR and the browser's first render identical. The real connection
  // state is synchronized after hydration in the effect below.
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) queueMicrotask(onConnect);
    else socket.connect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  return { socket, connected };
}
