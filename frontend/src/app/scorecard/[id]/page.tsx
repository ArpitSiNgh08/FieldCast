/* eslint-disable @next/next/no-img-element -- team logos may be local data URLs. */
import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { SPORT_EMOJI, SPORT_LABEL, formatDateTime } from "@/lib/format";
import { Badge } from "@/ui/Badge";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import type { CricketEvent, BasketballQuarter } from "@/lib/types";
import Link from "next/link";
import { ScorecardLiveRefresh } from "@/components/ScorecardLiveRefresh";
import { ScoreOverlay } from "@/components/ScoreOverlay";
import { FootballTimeline } from "@/components/FootballTimeline";

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const { match } = await api.getScorecard(id);
    return {
      title: `${match.teamA.shortName} vs ${match.teamB.shortName} Scorecard — FieldCast`,
    };
  } catch {
    return { title: "Scorecard — FieldCast" };
  }
}

export default async function ScorecardPage({ params }: Props) {
  const { id } = await params;
  let scorecard;
  try {
    scorecard = await api.getScorecard(id);
  } catch {
    notFound();
  }

  const { match, cricketEvents, footballEvents, basketballQuarters } = scorecard;
  const winnerName =
    match.winnerTeamId === match.teamA.id
      ? match.teamA.name
      : match.winnerTeamId === match.teamB.id
        ? match.teamB.name
        : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ScorecardLiveRefresh matchId={match.id} />
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-foreground">Fixtures</Link>
        <span>›</span>
        <span>Scorecard</span>
      </nav>

      {/* Match header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted">
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
          {match.teamA.name} vs {match.teamB.name}
        </h1>
        {match.scheduledAt && (
          <p className="mt-1 text-sm text-muted">{formatDateTime(match.scheduledAt)}</p>
        )}
      </div>

      {/* Live matches use the exact same score component as the streaming page. */}
      {match.status === "live" ? <ScoreOverlay match={match} footballEvents={footballEvents || []} /> : <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Final Score</CardTitle>
            <Badge tone="muted">Full time</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
            <TeamSummary
              name={match.teamA.name}
              short={match.teamA.shortName}
              logoUrl={match.teamA.logoUrl}
              score={match.state.teamAScore}
              winner={match.winnerTeamId === match.teamA.id}
              side="left"
            />
            <span className="text-sm font-bold uppercase tracking-widest text-muted">vs</span>
            <TeamSummary
              name={match.teamB.name}
              short={match.teamB.shortName}
              logoUrl={match.teamB.logoUrl}
              score={match.state.teamBScore}
              winner={match.winnerTeamId === match.teamB.id}
              side="right"
            />
          </div>
          {winnerName && (
            <p className="mt-4 border-t border-border pt-3 text-center text-sm text-muted">
              🏆 <span className="font-semibold text-accent">{winnerName}</span> won
            </p>
          )}
        </CardBody>
      </Card>}

      {/* Sport-specific detail */}
      {match.sport === "cricket" && cricketEvents && cricketEvents.length > 0 && (
        <CricketScorecard
          events={cricketEvents}
          teamA={match.teamA}
          teamB={match.teamB}
        />
      )}

      {match.sport === "football" && footballEvents && footballEvents.length > 0 && (
        <FootballTimeline events={footballEvents} />
      )}

      {match.sport === "basketball" && basketballQuarters && basketballQuarters.length > 0 && (
        <BasketballBreakdown
          quarters={basketballQuarters}
          teamA={match.teamA}
          teamB={match.teamB}
        />
      )}

      {/* Replay link */}
      {match.replayUrl && (
        <div className="mt-8 rounded-xl border border-border bg-surface p-4 text-sm">
          <span className="text-muted">Match replay: </span>
          <a
            href={match.replayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            Watch on ImageKit →
          </a>
        </div>
      )}
    </div>
  );
}

function TeamSummary({
  name,
  short,
  logoUrl,
  score,
  winner,
  side,
}: {
  name: string;
  short: string;
  logoUrl?: string | null;
  score: number;
  winner: boolean;
  side: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 sm:gap-3 ${side === "left" ? "justify-end text-right" : "justify-start text-left"}`}>
      {side === "left" && <TeamLogo logoUrl={logoUrl} short={short} />}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">{name}</p>
        <p className={`mt-1 text-3xl font-bold tabular-nums sm:text-4xl ${winner ? "text-accent" : "text-foreground"}`}>
          {score}
          {winner && <span className="ml-1 text-base">🏆</span>}
        </p>
      </div>
      {side === "right" && <TeamLogo logoUrl={logoUrl} short={short} />}
    </div>
  );
}

function TeamLogo({ logoUrl, short }: { logoUrl?: string | null; short: string }) {
  return logoUrl ? <img src={logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover sm:h-14 sm:w-14" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-xs font-bold text-foreground sm:h-14 sm:w-14">{short}</span>;
}

function CricketScorecard({
  events,
  teamA,
  teamB,
}: {
  events: CricketEvent[];
  teamA: { id: number; name: string };
  teamB: { id: number; name: string };
}) {
  // Group by innings
  const innings = events.reduce<Record<number, CricketEvent[]>>((acc, e) => {
    if (!acc[e.innings]) acc[e.innings] = [];
    acc[e.innings].push(e);
    return acc;
  }, {});

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Over-by-Over</CardTitle>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        {Object.entries(innings).map(([inn, evts]) => {
          const battingTeam = evts[0]?.batting_team_id === teamA.id ? teamA : teamB;
          const last = evts[evts.length - 1];
          return (
            <div key={inn} className="border-b border-border last:border-b-0">
              <div className="px-5 py-3 bg-surface-2 text-xs font-semibold text-muted uppercase tracking-wider">
                Innings {inn} — {battingTeam.name} batting
                {last && (
                  <span className="ml-3 normal-case font-medium text-foreground">
                    {last.runs_total}/{last.wickets} ({last.over_number} ov)
                  </span>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border">
                    <th className="px-5 py-2 font-medium">Over</th>
                    <th className="px-5 py-2 font-medium">Score</th>
                    <th className="px-5 py-2 font-medium">RR</th>
                    <th className="px-5 py-2 font-medium">Extras</th>
                    <th className="px-5 py-2 font-medium hidden sm:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {evts.map((e) => (
                    <tr key={e.id} className="border-b border-border/50 last:border-b-0 hover:bg-surface-2/60 transition-colors">
                      <td className="px-5 py-2.5 tabular-nums text-muted">{Number(e.over_number).toFixed(1)}</td>
                      <td className="px-5 py-2.5 font-semibold tabular-nums">{e.runs_total}/{e.wickets}</td>
                      <td className="px-5 py-2.5 tabular-nums text-muted">{Number(e.run_rate).toFixed(2)}</td>
                      <td className="px-5 py-2.5 tabular-nums text-muted">{e.extras}</td>
                      <td className="px-5 py-2.5 text-muted hidden sm:table-cell">{e.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function BasketballBreakdown({
  quarters,
  teamA,
  teamB,
}: {
  quarters: BasketballQuarter[];
  teamA: { name: string; shortName: string };
  teamB: { name: string; shortName: string };
}) {
  const totalA = quarters.reduce((s, q) => s + q.team_a_points, 0);
  const totalB = quarters.reduce((s, q) => s + q.team_b_points, 0);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Quarter Breakdown</CardTitle>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border bg-surface-2">
              <th className="px-5 py-3 font-medium">Team</th>
              {quarters.map((q) => (
                <th key={q.quarter} className="px-4 py-3 font-medium text-center">Q{q.quarter}</th>
              ))}
              <th className="px-5 py-3 font-semibold text-center text-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border hover:bg-surface-2/60 transition-colors">
              <td className="px-5 py-3 font-medium text-foreground">{teamA.shortName}</td>
              {quarters.map((q) => (
                <td key={q.quarter} className="px-4 py-3 text-center tabular-nums">{q.team_a_points}</td>
              ))}
              <td className="px-5 py-3 text-center font-bold tabular-nums text-foreground">{totalA}</td>
            </tr>
            <tr className="hover:bg-surface-2/60 transition-colors">
              <td className="px-5 py-3 font-medium text-foreground">{teamB.shortName}</td>
              {quarters.map((q) => (
                <td key={q.quarter} className="px-4 py-3 text-center tabular-nums">{q.team_b_points}</td>
              ))}
              <td className="px-5 py-3 text-center font-bold tabular-nums text-foreground">{totalB}</td>
            </tr>
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
