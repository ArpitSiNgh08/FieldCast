"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";

export function ScorecardLiveRefresh({ matchId }: { matchId: number }) {
  const { socket, connected } = useSocket();
  const router = useRouter();

  useEffect(() => {
    const refresh = (payload: { matchId: number }) => {
      if (payload.matchId === matchId) router.refresh();
    };
    socket.on("score:updated", refresh);
    socket.on("match:status", refresh);
    socket.emit("match:join", { matchId });
    return () => {
      socket.emit("match:leave", { matchId });
      socket.off("score:updated", refresh);
      socket.off("match:status", refresh);
    };
  }, [socket, matchId, connected, router]);

  return null;
}
