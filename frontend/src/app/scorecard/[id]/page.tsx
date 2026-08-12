import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { SPORT_EMOJI, SPORT_LABEL, formatDateTime } from "@/lib/format";
import { Badge } from "@/ui/Badge";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import type { CricketEvent, FootballEvent, BasketballQuarter } from "@/lib/types";
import Link from "next/link";
import { ScorecardLiveRefresh } from "@/components/ScorecardLiveRefresh";

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

      {/* Final score summary card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{match.status === "live" ? "Live Score" : "Final Score"}</CardTitle>
            <Badge tone={match.status === "live" ? "accent" : "muted"}>{match.status === "live" ? "Live" : "Full time"}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-around">
            <TeamSummary
              name={match.teamA.name}
              short={match.teamA.shortName}
              score={match.state.teamAScore}
              winner={match.winnerTeamId === match.teamA.id}
            />
            <span className="hidden text-2xl font-bold text-muted sm:block">–</span>
            <TeamSummary
              name={match.teamB.name}
              short={match.teamB.shortName}
              score={match.state.teamBScore}
              winner={match.winnerTeamId === match.teamB.id}
            />
          </div>
          {winnerName && (
            <p className="mt-4 border-t border-border pt-3 text-center text-sm text-muted">
              🏆 <span className="font-semibold text-accent">{winnerName}</span> won
            </p>
          )}
        </CardBody>
      </Card>

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
  score,
  winner,
}: {
  name: string;
  short: string;
  score: number;
  winner: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-base font-bold text-foreground">
        {short}
      </span>
      <p className="text-sm text-muted">{name}</p>
      <p className={`text-4xl font-bold tabular-nums ${winner ? "text-accent" : "text-foreground"}`}>
        {score}
        {winner && <span className="ml-1 text-base">🏆</span>}
      </p>
    </div>
  );
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

const EVENT_ICON: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
};

function FootballTimeline({
  events,
}: {
  events: FootballEvent[];
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Match Timeline</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-3">
              <span className="mt-0.5 text-lg leading-none">{EVENT_ICON[e.event_type] || "·"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {e.minute}{e.extra_time_minute ? `+${e.extra_time_minute}` : ""}&apos;{" "}
                  <span className="capitalize">{e.event_type.replace("_", " ")}</span>
                  {e.player_name && (
                    <span className="text-muted"> — {e.jersey_number ? `#${e.jersey_number} ` : ""}{e.player_name}</span>
                  )}
                </p>
                {(e.team_name || e.team_short) && (
                  <p className="text-xs text-muted">{e.team_name || e.team_short}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted">Half {e.half}</span>
            </div>
          ))}
        </div>
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
