"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "./useSocket";
import { api } from "@/lib/api";
import type { FootballEvent } from "@/lib/types";

export function useSynchronizedFootballEvents(matchId: number, initialEvents: FootballEvent[]) {
  const { socket, connected } = useSocket();
  const [events, setEvents] = useState<FootballEvent[]>([]);
  const pendingEvents = useRef<FootballEvent[]>([]);
  const streamTimeRef = useRef<number | null>(null);

  const releaseEvents = (cutoffTime: number) => {
    const ready = pendingEvents.current.filter((ev) => {
      const ts = ev.created_at ? Date.parse(ev.created_at) : NaN;
      return !Number.isFinite(ts) || ts <= cutoffTime;
    });
    if (ready.length) {
      pendingEvents.current = pendingEvents.current.filter((ev) => !ready.includes(ev));
      setEvents((current) => {
        const existingIds = new Set(current.map((e) => e.id));
        const newToAdd = ready.filter((e) => !existingIds.has(e.id));
        return [...current, ...newToAdd];
      });
    }
  };

  const syncScorecard = async () => {
    try {
      const scorecard = await api.getScorecard(matchId);
      if (scorecard.footballEvents) {
        const fetched = scorecard.footballEvents;
        const currentCutoff = streamTimeRef.current ?? Date.now();
        const ready: FootballEvent[] = [];
        const pending: FootballEvent[] = [];
        for (const ev of fetched) {
          const ts = ev.created_at ? Date.parse(ev.created_at) : NaN;
          if (!Number.isFinite(ts) || ts <= currentCutoff) {
            ready.push(ev);
          } else {
            pending.push(ev);
          }
        }
        setEvents(ready);
        pendingEvents.current = pending;
      }
    } catch (err) {
      console.error("Failed to sync match timeline events:", err);
    }
  };

  useEffect(() => {
    void syncScorecard();
  }, [initialEvents, matchId]);

  useEffect(() => {
    const onScoreUpdated = (payload: { matchId: number }) => {
      if (payload.matchId === matchId) {
        void syncScorecard();
      }
    };

    socket.on("score:updated", onScoreUpdated);
    if (connected) {
      socket.emit("match:join", { matchId });
    }

    return () => {
      socket.off("score:updated", onScoreUpdated);
      socket.emit("match:leave", { matchId });
    };
  }, [connected, matchId, socket]);

  useEffect(() => {
    const onStreamTime = (event: Event) => {
      const detail = (event as CustomEvent<{ matchId: number; streamTime: number }>).detail;
      if (detail.matchId !== matchId) return;
      streamTimeRef.current = detail.streamTime;
      releaseEvents(detail.streamTime);
    };

    window.addEventListener("fieldcast:stream-time", onStreamTime);
    return () => window.removeEventListener("fieldcast:stream-time", onStreamTime);
  }, [matchId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = streamTimeRef.current ?? Date.now();
      releaseEvents(cutoff);
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  return events;
}
