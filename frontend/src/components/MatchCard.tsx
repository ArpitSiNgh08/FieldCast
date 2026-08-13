import Link from "next/link";
import type { Match } from "@/lib/types";
import { Badge, LiveBadge } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import { SPORT_EMOJI, SPORT_LABEL, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

function TeamRow({
  name,
  short,
  score,
  bold,
}: {
  name: string;
  short: string;
  score?: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-bold text-muted">
          {short}
        </span>
        <span className={cn("truncate text-sm", bold && "font-semibold")}>
          {name}
        </span>
      </div>
      {score !== undefined ? (
        <span className={cn("tabular-nums text-sm", bold && "font-bold")}>
          {score}
        </span>
      ) : null}
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "live";
  const isDone = match.status === "completed";
  const href = isLive
    ? `/matches/${match.id}`
    : isDone
      ? `/scorecard/${match.id}`
      : `/matches/${match.id}`;

  const showScores = isLive || isDone;
  const winA = isDone && match.winnerTeamId === match.teamA.id;
  const winB = isDone && match.winnerTeamId === match.teamB.id;

  return (
    <Link href={href} className="block">
      <Card className="p-4 transition-colors hover:border-accent/40 hover:bg-surface-2">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{SPORT_EMOJI[match.sport]}</span>
            <span>{SPORT_LABEL[match.sport]}</span>
            {match.tournamentName ? (
              <>
                <span>·</span>
                <span className="truncate max-w-[10rem]">
                  {match.tournamentName}
                </span>
              </>
            ) : null}
          </div>
          {isLive ? (
            <LiveBadge />
          ) : isDone ? (
            <Badge tone="muted">{match.resultType === "washout" ? "Washout" : "Full time"}</Badge>
          ) : (
            <Badge tone="accent">Upcoming</Badge>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <TeamRow
            name={match.teamA.name}
            short={match.teamA.shortName}
            score={showScores ? match.state.teamAScore : undefined}
            bold={winA}
          />
          <TeamRow
            name={match.teamB.name}
            short={match.teamB.shortName}
            score={showScores ? match.state.teamBScore : undefined}
            bold={winB}
          />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span>
            {isLive
              ? match.state.periodLabel || "In progress"
              : formatDateTime(match.scheduledAt)}
          </span>
          <span className="text-accent">
            {isLive ? "Watch live →" : isDone ? "Scorecard →" : "Details →"}
          </span>
        </div>
      </Card>
    </Link>
  );
}
