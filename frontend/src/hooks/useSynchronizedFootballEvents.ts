"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "./useSocket";
import { api } from "@/lib/api";
import type { FootballEvent } from "@/lib/types";

const FALLBACK_DELAY_MS = 15_000;

export function useSynchronizedFootballEvents(matchId: number, initialEvents: FootballEvent[]) {
  const { socket, connected } = useSocket();
  const [events, setEvents] = useState<FootballEvent[]>([]);
  const pending = useRef<FootballEvent[]>([]);
  const visibleIds = useRef(new Set(initialEvents.map((event) => event.id)));
  const streamTime = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cutoff = Date.now() - FALLBACK_DELAY_MS;
      const ready = initialEvents.filter((event) => !event.created_at || Date.parse(event.created_at) <= cutoff);
      const waiting = initialEvents.filter((event) => event.created_at && Date.parse(event.created_at) > cutoff);
      setEvents(ready);
      ready.forEach((event) => visibleIds.current.add(event.id));
      pending.current = waiting;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialEvents]);

  useEffect(() => {
    const receive = async () => {
      const scorecard = await api.getScorecard(matchId);
      const next = scorecard.footballEvents || [];
      const nextIds = new Set(next.map((event) => event.id));
      setEvents((current) => current.filter((event) => nextIds.has(event.id)).map((event) => next.find((candidate) => candidate.id === event.id) || event));
      const additions = next.filter((event) => !visibleIds.current.has(event.id) && !pending.current.some((candidate) => candidate.id === event.id));
      const cutoff = streamTime.current ?? Date.now() - FALLBACK_DELAY_MS;
      const ready = additions.filter((event) => !event.created_at || Date.parse(event.created_at) <= cutoff);
      const waiting = additions.filter((event) => event.created_at && Date.parse(event.created_at) > cutoff);
      if (ready.length) { setEvents((current) => [...current, ...ready]); ready.forEach((event) => visibleIds.current.add(event.id)); }
      pending.current = [...pending.current, ...waiting];
    };
    const onScore = (payload: { matchId: number }) => { if (payload.matchId === matchId) void receive().catch(() => {}); };
    socket.on("score:updated", onScore);
    if (connected) socket.emit("match:join", { matchId });
    return () => { socket.off("score:updated", onScore); socket.emit("match:leave", { matchId }); };
  }, [connected, matchId, socket]);

  useEffect(() => {
    const release = (cutoff: number) => {
      streamTime.current = cutoff;
      const ready = pending.current.filter((event) => !event.created_at || Date.parse(event.created_at) <= cutoff);
      if (!ready.length) return;
      pending.current = pending.current.filter((event) => !ready.includes(event));
      setEvents((current) => [...current, ...ready]);
      ready.forEach((event) => visibleIds.current.add(event.id));
    };
    const onStreamTime = (event: Event) => {
      const detail = (event as CustomEvent<{ matchId: number; streamTime: number }>).detail;
      if (detail.matchId === matchId) release(detail.streamTime);
    };
    window.addEventListener("fieldcast:stream-time", onStreamTime);
    const timer = window.setInterval(() => release(streamTime.current ?? Date.now() - FALLBACK_DELAY_MS), 500);
    return () => { window.removeEventListener("fieldcast:stream-time", onStreamTime); window.clearInterval(timer); };
  }, [matchId]);

  return events;
}
