"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// Temporary manual holdback while we evaluate HLS program-date-time sync.
const SCORE_SYNC_DELAY_MS = 15_000;

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
  const pendingStates = useRef<MatchState[]>([]);
  const streamTime = useRef<number | null>(null);

  const receiveState = useCallback((next: MatchState) => {
    const updatedAt = next.updatedAt ? Date.parse(next.updatedAt) : NaN;
    const cutoff = streamTime.current ?? Date.now() - SCORE_SYNC_DELAY_MS;
    if (!Number.isFinite(updatedAt) || updatedAt <= cutoff) {
      setState(next);
      return;
    }
    pendingStates.current = [...pendingStates.current.filter((candidate) => candidate.updatedAt !== next.updatedAt), next];
  }, []);

  useEffect(() => {
    if (!matchId) return;

    const onScore = (p: ScoreUpdated) => {
      if (p.matchId === matchId && p.state) receiveState(p.state);
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
  }, [socket, matchId, connected, receiveState]);

  useEffect(() => {
    const onStreamTime = (event: Event) => {
      const detail = (event as CustomEvent<{ matchId: number; streamTime: number }>).detail;
      if (detail.matchId !== matchId) return;
      streamTime.current = detail.streamTime;
      const ready = pendingStates.current.filter((candidate) => candidate.updatedAt && Date.parse(candidate.updatedAt) <= detail.streamTime);
      if (ready.length) {
        pendingStates.current = pendingStates.current.filter((candidate) => !ready.includes(candidate));
        setState(ready[ready.length - 1]);
      }
    };
    window.addEventListener("fieldcast:stream-time", onStreamTime);
    return () => window.removeEventListener("fieldcast:stream-time", onStreamTime);
  }, [matchId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = streamTime.current ?? Date.now() - SCORE_SYNC_DELAY_MS;
      const ready = pendingStates.current.filter((candidate) => {
        const updatedAt = candidate.updatedAt ? Date.parse(candidate.updatedAt) : NaN;
        return Number.isFinite(updatedAt) && updatedAt <= cutoff;
      });
      if (!ready.length) return;
      pendingStates.current = pendingStates.current.filter((candidate) => !ready.includes(candidate));
      setState(ready[ready.length - 1]);
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  return { state, activeCamera, connected };
}
