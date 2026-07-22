"use client";

import { useEffect, useState } from "react";
import { useSocket } from "./useSocket";
import type { CameraId, MatchState } from "@/lib/types";

interface ScoreUpdated {
  matchId: number;
  state: MatchState;
}
interface CameraSwitched {
  matchId: number;
  cameraId: CameraId;
  simulated: boolean;
}

/**
 * Join a match room and keep the live overlay state + active camera in sync
 * with Socket.io broadcasts. Seeded with the server-rendered initial values.
 */
export function useMatchState(
  matchId: number,
  initialState: MatchState,
  initialCamera: CameraId
) {
  const { socket, connected } = useSocket();
  const [state, setState] = useState<MatchState>(initialState);
  const [activeCamera, setActiveCamera] = useState<CameraId>(initialCamera);

  useEffect(() => {
    if (!matchId) return;

    const onScore = (p: ScoreUpdated) => {
      if (p.matchId === matchId && p.state) setState(p.state);
    };
    const onCamera = (p: CameraSwitched) => {
      if (p.matchId === matchId) setActiveCamera(p.cameraId);
    };

    socket.on("score:updated", onScore);
    socket.on("camera:switched", onCamera);
    socket.emit("match:join", { matchId });

    return () => {
      socket.emit("match:leave", { matchId });
      socket.off("score:updated", onScore);
      socket.off("camera:switched", onCamera);
    };
    // Re-join if the connection bounced (e.g. after login).
  }, [socket, matchId, connected]);

  return { state, activeCamera, connected };
}
