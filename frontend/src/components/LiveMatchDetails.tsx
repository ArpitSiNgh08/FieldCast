"use client";

import type { FootballEvent, Match } from "@/lib/types";
import { useSynchronizedFootballEvents } from "@/hooks/useSynchronizedFootballEvents";
import { ScoreOverlay } from "./ScoreOverlay";
import { FootballTimeline } from "./FootballTimeline";

export function LiveMatchDetails({ match, footballEvents }: { match: Match; footballEvents: FootballEvent[] }) {
  const events = useSynchronizedFootballEvents(match.id, footballEvents);
  return <><ScoreOverlay match={match} footballEvents={events} /><div className="mt-6"><FootballTimeline events={events} /></div></>;
}
