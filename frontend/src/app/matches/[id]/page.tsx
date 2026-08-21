import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { SPORT_EMOJI, SPORT_LABEL } from "@/lib/format";
import { LiveBadge, Badge } from "@/ui/Badge";
import { HlsPlayer } from "@/components/HlsPlayer";
import { ScoreOverlay } from "@/components/ScoreOverlay";
import { ScorecardLiveRefresh } from "@/components/ScorecardLiveRefresh";
import { FootballTimeline } from "@/components/FootballTimeline";
import type { FootballEvent } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // always SSR for live match

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const match = await api.getMatch(id);
    return {
      title: `${match.teamA.shortName} vs ${match.teamB.shortName} — FieldCast`,
      description: `Watch the live ${SPORT_LABEL[match.sport]} match between ${match.teamA.name} and ${match.teamB.name} on FieldCast.`,
    };
  } catch {
    return { title: "Match — FieldCast" };
  }
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  let match;
  let footballEvents: FootballEvent[] = [];
  try {
    match = await api.getMatch(id);
  } catch {
    notFound();
  }

  if (match.sport === "football") {
    try {
      const scorecard = await api.getScorecard(id);
      footballEvents = scorecard.footballEvents || [];
    } catch {
      // Keep the stream available if event history is temporarily unavailable.
    }
  }

  const isLive = match.status === "live";
  const isDone = match.status === "completed";
  const liveUrl = match.liveUrl || "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
        <ScorecardLiveRefresh matchId={match.id} />
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-sm text-muted">
              <span>{SPORT_EMOJI[match.sport]}</span>
              <span>{SPORT_LABEL[match.sport]}</span>
              {match.tournamentName && (
                <>
                  <span>·</span>
                  <span>{match.tournamentName}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {match.teamA.name}{" "}
              <span className="text-muted font-normal">vs</span>{" "}
              {match.teamB.name}
            </h1>
            {(match.poolName || match.knockoutStage) && <p className="mt-2 text-sm font-semibold text-accent">{match.poolName || match.knockoutStage}</p>}
            {match.venue && <p className="mt-2 text-sm text-muted">{match.venue}</p>}
          </div>
          <div>
            {isLive ? (
              <LiveBadge />
            ) : isDone ? (
              <Badge tone="muted">{match.resultType === "washout" ? "Washout" : "Full time"}</Badge>
            ) : (
              <Badge tone="accent">Upcoming</Badge>
            )}
          </div>
        </div>

        {/* Main content: video + overlay side-by-side on desktop */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Video player — takes 2/3 width on desktop */}
          <div className="lg:col-span-2">
            {isLive ? (
              <HlsPlayer match={match} liveUrl={liveUrl} />
            ) : isDone && match.replayUrl ? (
              <HlsPlayer match={match} liveUrl={match.replayUrl} />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface text-center px-6">
                <span className="mb-3 text-4xl">{SPORT_EMOJI[match.sport]}</span>
                <p className="text-base font-medium text-foreground">{isDone ? "Live stream has ended" : "Stream not started yet"}</p>
                <p className="mt-1 text-sm text-muted">
                  {isDone ? "This match has been finalized by the organiser." : "The live feed will appear here once cameras go live."}
                </p>
              </div>
            )}
            {match.sport === "football" && (
              <div className="mt-6">
                <FootballTimeline events={footballEvents} />
              </div>
            )}
          </div>

          {/* Score overlay — 1/3 width on desktop */}
          <div className="flex flex-col gap-4">
            {isLive ? (
              <ScoreOverlay match={match} footballEvents={footballEvents} />
            ) : isDone ? (
              match.resultType === "washout" ? <WashoutSummary match={match} /> : <CompletedSummary match={match} />
            ) : (
              <UpcomingCard match={match} />
            )}
            {isLive && <a href={`/scorecard/${match.id}`} className="rounded-lg border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-accent hover:bg-surface-2">Open full match stats →</a>}
          </div>
        </div>
    </div>
  );
}

function WashoutSummary({ match }: { match: Awaited<ReturnType<typeof api.getMatch>> }) {
  return <div className="rounded-xl border border-border bg-surface p-5 shadow-sm"><Badge tone="muted">Washout</Badge><p className="mt-4 font-medium">{match.teamA.shortName} vs {match.teamB.shortName}</p><p className="mt-2 text-sm text-muted">This fixture ended without a result and does not affect the standings.</p></div>;
}

function CompletedSummary({ match }: { match: Awaited<ReturnType<typeof api.getMatch>> }) {
  const { teamA, teamB, state, winnerTeamId } = match;
  const winnerName =
    winnerTeamId === teamA.id
      ? teamA.name
      : winnerTeamId === teamB.id
        ? teamB.name
        : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <Badge tone="muted" className="mb-4">Full time</Badge>
      <div className="flex flex-col gap-3">
        <ScoreRow
          name={teamA.name}
          short={teamA.shortName}
          score={state.teamAScore}
          winner={winnerTeamId === teamA.id}
        />
        <ScoreRow
          name={teamB.name}
          short={teamB.shortName}
          score={state.teamBScore}
          winner={winnerTeamId === teamB.id}
        />
      </div>
      {winnerName && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          Winner: <span className="font-semibold text-accent">{winnerName}</span>
        </p>
      )}
      {match.replayUrl && (
        <a
          href={match.replayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-xs text-accent hover:underline"
        >
          Watch replay →
        </a>
      )}
    </div>
  );
}

function ScoreRow({
  name,
  short,
  score,
  winner,
}: {
  name: string;
  short: string;
  score: number;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-bold text-muted">
          {short}
        </span>
        <span className={`truncate text-sm ${winner ? "font-semibold text-foreground" : "text-muted"}`}>
          {name}
        </span>
      </div>
      <span className={`tabular-nums text-sm ${winner ? "font-bold text-foreground" : "text-muted"}`}>
        {score}
      </span>
    </div>
  );
}

function UpcomingCard({ match }: { match: Awaited<ReturnType<typeof api.getMatch>> }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <Badge tone="accent" className="mb-4">Upcoming</Badge>
      <div className="text-sm text-muted">
        <p>
          {match.teamA.name} <span className="font-semibold text-foreground">vs</span> {match.teamB.name}
        </p>
        {match.scheduledAt && (
          <p className="mt-2 text-xs">
            Scheduled:{" "}
            <span className="font-medium text-foreground">
              {new Date(match.scheduledAt).toLocaleString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
