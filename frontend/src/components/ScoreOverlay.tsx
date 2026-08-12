"use client";

import { useMatchState } from "@/hooks/useMatchState";
import type { FootballEvent, Match } from "@/lib/types";
import { num, str } from "@/lib/format";
import { LiveBadge } from "@/ui/Badge";

interface Props {
  match: Match;
  footballEvents?: FootballEvent[];
}

export function ScoreOverlay({ match, footballEvents = [] }: Props) {
  const { state, activeCamera, connected } = useMatchState(
    match.id,
    match.state,
    match.activeCamera
  );

  const { teamAScore, teamBScore, periodLabel, extra } = state;

  return (
    <div
      className="rounded-xl border border-border bg-surface shadow-sm p-5"
      aria-label="Live scorecard"
    >
      {/* Status row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LiveBadge />
          {periodLabel && (
            <span className="text-xs text-muted">{periodLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-accent" : "bg-muted"
            }`}
          />
          {connected ? "Live" : "Reconnecting…"}
        </div>
      </div>

      {/* Teams + scores */}
      <div className="flex items-center justify-between gap-4">
        <TeamScore
          name={match.teamA.name}
          short={match.teamA.shortName}
          score={teamAScore}
          sport={match.sport}
          extra={extra}
          side="A"
          goals={footballEvents.filter((event) => event.event_type === "goal" && event.team_id === match.teamA.id)}
        />
        <span className="text-xl font-bold text-muted">–</span>
        <TeamScore
          name={match.teamB.name}
          short={match.teamB.shortName}
          score={teamBScore}
          sport={match.sport}
          extra={extra}
          side="B"
          goals={footballEvents.filter((event) => event.event_type === "goal" && event.team_id === match.teamB.id)}
        />
      </div>

      {/* Sport-specific sub-info */}
      <SportDetail sport={match.sport} extra={extra} />

      {/* Active camera label */}
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
        Camera: <span className="font-medium text-foreground">{activeCamera}</span>
      </p>
    </div>
  );
}

function TeamScore({
  name,
  short,
  score,
  sport,
  extra,
  side,
  goals,
}: {
  name: string;
  short: string;
  score: number;
  sport: Match["sport"];
  extra: Record<string, unknown>;
  side: "A" | "B";
  goals: FootballEvent[];
}) {
  const wickets = sport === "cricket" ? num(extra, side === "A" ? "teamAWickets" : "teamBWickets") : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-sm font-bold text-foreground">
        {short}
      </span>
      <p className="text-xs text-muted truncate max-w-[6rem] text-center">{name}</p>
      <p className="text-3xl font-bold tabular-nums text-foreground">
        {score}
        {wickets !== null && (
          <span className="text-base font-normal text-muted">/{wickets}</span>
        )}
      </p>
      {sport === "football" && goals.length > 0 && (
        <div className="mt-1 max-w-[8rem] space-y-0.5 text-center text-[11px] leading-tight text-muted">
          {goals.map((goal) => (
            <p key={goal.id}>
              <span className="font-medium text-foreground">{goal.player_name || "Unknown scorer"}</span>{" "}
              <span className="tabular-nums">{goal.minute}{goal.extra_time_minute ? `+${goal.extra_time_minute}` : ""}&apos;</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
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
