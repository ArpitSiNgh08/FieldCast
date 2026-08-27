"use client";
/* eslint-disable @next/next/no-img-element -- team logos may be local data URLs. */

import { useMatchState } from "@/hooks/useMatchState";
import type { FootballEvent, Match } from "@/lib/types";
import { num, str } from "@/lib/format";

interface Props {
  match: Match;
  footballEvents?: FootballEvent[];
}

export function ScoreOverlay({ match, footballEvents = [] }: Props) {
  const { state } = useMatchState(
    match.id,
    match.state,
    match.activeCamera
  );

  const { teamAScore, teamBScore, periodLabel, extra } = state;
  const phaseLabel = periodLabel === "Halftime" || periodLabel === "Full time" ? periodLabel : "";

  return (
    <div
      className="rounded-xl border border-border bg-surface p-5 shadow-sm"
      aria-label="Live scorecard"
    >
      {/* Mirrored teams around the central score, matching a broadcast scoreboard. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        <TeamIdentity name={match.teamA.name} short={match.teamA.shortName} logoUrl={match.teamA.logoUrl} side="left" />
        <div className="min-w-[6.5rem] text-center">
          {phaseLabel && <p className="text-[11px] font-medium text-muted">{phaseLabel}</p>}
          <p className="mt-1 text-3xl font-bold tracking-wide text-foreground sm:text-4xl">{teamAScore} - {teamBScore}</p>
          <p className="mt-1 text-xs text-muted">{state.status === "completed" ? "Full Time" : "In progress"}</p>
        </div>
        <TeamIdentity name={match.teamB.name} short={match.teamB.shortName} logoUrl={match.teamB.logoUrl} side="right" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-muted">
        <GoalList goals={footballEvents.filter((event) => event.event_type === "goal" && event.team_id === match.teamA.id)} align="left" />
        <GoalList goals={footballEvents.filter((event) => event.event_type === "goal" && event.team_id === match.teamB.id)} align="right" />
      </div>

      {/* Sport-specific sub-info */}
      <SportDetail sport={match.sport} extra={extra} />

    </div>
  );
}

function TeamIdentity({ name, short, logoUrl, side }: { name: string; short: string; logoUrl?: string | null; side: "left" | "right" }) {
  return <div className={`min-w-0 ${side === "left" ? "text-left" : "text-right"}`}>
    {logoUrl ? <img src={logoUrl} alt="" className={`h-14 w-14 rounded-xl object-cover sm:h-16 sm:w-16 ${side === "right" ? "ml-auto" : ""}`} /> : <span className={`grid h-14 w-14 place-items-center rounded-xl bg-surface-2 text-xs font-bold text-foreground sm:h-16 sm:w-16 ${side === "right" ? "ml-auto" : ""}`}>{short}</span>}
    <p className="mt-2 truncate text-xs font-semibold text-foreground sm:text-sm">{name}</p>
  </div>;
}

function GoalList({ goals, align }: { goals: FootballEvent[]; align: "left" | "right" }) {
  if (!goals.length) return <span />;
  return <div className={`space-y-0.5 ${align === "right" ? "text-right" : "text-left"}`}>{goals.map((goal) => <p key={goal.id}><span className="font-medium text-foreground">{goal.player_name || "Unknown scorer"}</span>{goal.is_penalty && <span className="ml-1 text-accent">(P)</span>}{" "}<span>{goal.minute}{goal.extra_time_minute ? `+${goal.extra_time_minute}` : ""}&apos;</span></p>)}</div>;
}

function SportDetail({
  sport,
  extra,
}: {
  sport: Match["sport"];
  extra: Record<string, unknown>;
}) {
  if (sport === "cricket") {
    const overs = str(extra, "overs", "");
    const rr = str(extra, "runRate", "");
    if (!overs && !rr) return null;
    return (
      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        {overs && <span>Overs: <strong className="text-foreground">{overs}</strong></span>}
        {rr && <span>RR: <strong className="text-foreground">{rr}</strong></span>}
      </div>
    );
  }

  if (sport === "football") return null;

  if (sport === "basketball") {
    const quarter = num(extra, "quarter");
    const clock = str(extra, "clock", "");
    return (
      <div className="mt-3 flex items-center gap-3 text-xs text-muted">
        {quarter ? <span>Q<strong className="text-foreground">{quarter}</strong></span> : null}
        {clock ? <span>{clock}</span> : null}
      </div>
    );
  }

  return null;
}
