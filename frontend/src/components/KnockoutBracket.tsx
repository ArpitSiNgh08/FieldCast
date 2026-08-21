import type { Match } from "@/lib/types";
import { ScorecardLiveRefresh } from "@/components/ScorecardLiveRefresh";

const CARD_WIDTH = 232;
const CARD_HEIGHT = 100;
const COLUMN_GAP = 72;
const SLOT_HEIGHT = 132;

interface BracketRound {
  name: string;
  matches: (Match | null)[];
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function roundLabel(value: string) {
  const key = normalized(value);
  if (key === "semifinal" || key === "semifinals" || key === "sf") return "Semifinals";
  if (key.includes("quarter")) return "Quarterfinals";
  if (key === "final" || key === "grandfinal") return "Final";
  return value;
}

function semanticOrder(value: string) {
  const key = normalized(value);
  if (key.includes("roundof32") || key === "round32") return 10;
  if (key.includes("roundof16") || key === "round16") return 20;
  if (key.includes("quarter") || key.includes("roundof8") || key === "round8") return 30;
  if (key.includes("semi") || key === "sf") return 40;
  if (key === "final" || key.includes("grandfinal")) return 50;
  return 25;
}

function matchLabel(round: BracketRound, index: number) {
  const key = normalized(round.name);
  if (key.includes("semi")) return `SF ${index + 1}`;
  if (key.includes("quarter")) return `QF ${index + 1}`;
  if (key.includes("roundof16") || key === "round16") return `R16 ${index + 1}`;
  if (key === "final") return "Final";
  return `${round.name}${round.matches.length > 1 ? ` ${index + 1}` : ""}`;
}

function buildRounds(matches: Match[]): BracketRound[] {
  const groups = new Map<string, Match[]>();
  for (const match of matches.filter((entry) => entry.stageType === "knockout" && entry.knockoutStage)) {
    const stage = match.knockoutStage as string;
    const existing = groups.get(stage) || [];
    existing.push(match);
    groups.set(stage, existing);
  }

  const rounds: Array<BracketRound & { sourceName: string }> = Array.from(groups, ([name, entries]) => ({
    name: roundLabel(name),
    matches: entries.sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || "") || a.id - b.id),
    sourceName: name,
  })).sort((a, b) => {
    const semantic = semanticOrder(a.sourceName) - semanticOrder(b.sourceName);
    if (semantic !== 0) return semantic;
    if (a.matches.length !== b.matches.length) return b.matches.length - a.matches.length;
    return Math.min(...a.matches.map((match) => match.id)) - Math.min(...b.matches.map((match) => match.id));
  });

  const semifinal = rounds.find((round) => normalized(round.name).includes("semi"));
  const final = rounds.find((round) => normalized(round.name) === "final");
  if (semifinal && !final) rounds.push({ name: "Final", matches: [null], sourceName: "Final" });
  return rounds.map(({ name, matches: roundMatches }) => ({ name, matches: roundMatches }));
}

function centerY(index: number, count: number, height: number) {
  return ((index + 0.5) * height) / count;
}

function ConnectorLines({ rounds, height }: { rounds: BracketRound[]; height: number }) {
  const width = rounds.length * CARD_WIDTH + Math.max(0, rounds.length - 1) * COLUMN_GAP;
  const paths: string[] = [];
  rounds.slice(0, -1).forEach((round, roundIndex) => {
    const next = rounds[roundIndex + 1];
    round.matches.forEach((_, matchIndex) => {
      const targetIndex = Math.min(next.matches.length - 1, Math.floor((matchIndex * next.matches.length) / round.matches.length));
      const x1 = roundIndex * (CARD_WIDTH + COLUMN_GAP) + CARD_WIDTH;
      const x2 = (roundIndex + 1) * (CARD_WIDTH + COLUMN_GAP);
      const mid = x1 + COLUMN_GAP / 2;
      const y1 = centerY(matchIndex, round.matches.length, height);
      const y2 = centerY(targetIndex, next.matches.length, height);
      paths.push(`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`);
    });
  });
  return <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-11" width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">{paths.map((path, index) => <path key={index} d={path} stroke="var(--border)" strokeWidth="2" />)}</svg>;
}

function TeamLine({ match, side }: { match: Match; side: "a" | "b" }) {
  const team = side === "a" ? match.teamA : match.teamB;
  const score = side === "a" ? match.state.teamAScore : match.state.teamBScore;
  const winner = match.status === "completed" && match.winnerTeamId === team.id;
  const showScore = match.status !== "upcoming";
  return <div className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${side === "a" ? "border-b border-border" : ""}`}><div className="flex min-w-0 items-center gap-2"><span className="grid h-6 w-8 shrink-0 place-items-center rounded bg-surface-2 text-[10px] font-bold text-muted">{team.shortName}</span><span className={`truncate ${winner ? "font-semibold text-foreground" : "text-muted"}`}>{team.name}</span></div><span className={`tabular-nums ${winner ? "font-bold text-accent" : "text-muted"}`}>{showScore ? score : "–"}</span></div>;
}

function winnerOf(match: Match | null) {
  if (!match || match.status !== "completed" || !match.winnerTeamId) return null;
  if (match.teamA.id === match.winnerTeamId) return match.teamA;
  if (match.teamB.id === match.winnerTeamId) return match.teamB;
  return null;
}

function AdvancingTeamLine({ sourceMatch, sourceLabel, divider }: { sourceMatch: Match | null; sourceLabel: string; divider: boolean }) {
  const winner = winnerOf(sourceMatch);
  return <div className={`flex min-h-8 items-center justify-between gap-2 px-3 py-1.5 text-xs ${divider ? "border-b border-border" : ""}`}>
    {winner ? <div className="flex min-w-0 items-center gap-2"><span className="grid h-6 w-8 shrink-0 place-items-center rounded bg-surface-2 text-[10px] font-bold text-muted">{winner.shortName}</span><span className="truncate font-semibold text-foreground">{winner.name}</span></div> : <span className="text-muted">Winner {sourceLabel}</span>}
    <span className={winner ? "font-bold text-accent" : "text-muted"}>{winner ? "✓" : "TBD"}</span>
  </div>;
}

function BracketMatch({ match, label, previousRound }: { match: Match | null; label: string; previousRound?: BracketRound }) {
  const feederMatches = previousRound?.matches.slice(0, 2) || [];
  return <div className="absolute left-0 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-sm" style={{ height: CARD_HEIGHT }}>
    <div className="flex h-6 items-center justify-between bg-surface-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted"><span>{label}</span>{match?.status === "live" && <span className="text-live">Live</span>}</div>
    {match ? <><TeamLine match={match} side="a" /><TeamLine match={match} side="b" /></> : <div className="h-[66px]">{[0, 1].map((index) => <AdvancingTeamLine key={index} sourceMatch={feederMatches[index] || null} sourceLabel={`${previousRound?.name || "match"} ${index + 1}`} divider={index === 0} />)}</div>}
  </div>;
}

export function KnockoutBracket({ matches }: { matches: Match[] }) {
  const rounds = buildRounds(matches);
  if (!rounds.length) return null;
  const knockoutMatchIds = matches.filter((match) => match.stageType === "knockout").map((match) => match.id);
  const largestRound = Math.max(...rounds.map((round) => round.matches.length));
  const height = Math.max(SLOT_HEIGHT, largestRound * SLOT_HEIGHT);
  const width = rounds.length * CARD_WIDTH + Math.max(0, rounds.length - 1) * COLUMN_GAP;

  return <div className="overflow-x-auto pb-3">
    {knockoutMatchIds.map((matchId) => <ScorecardLiveRefresh key={matchId} matchId={matchId} />)}
    <div className="relative" style={{ width, minWidth: width }}>
      <ConnectorLines rounds={rounds} height={height} />
      <div className="relative flex" style={{ gap: COLUMN_GAP }}>
        {rounds.map((round, roundIndex) => <section key={`${round.name}-${roundIndex}`} className="relative shrink-0" style={{ width: CARD_WIDTH }} aria-label={round.name}>
          <h3 className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-center text-xs font-semibold text-foreground">{round.name}</h3>
          <div className="relative" style={{ height }}>
            {round.matches.map((match, matchIndex) => <div key={match?.id || `placeholder-${matchIndex}`} className="absolute left-0 w-full" style={{ top: centerY(matchIndex, round.matches.length, height) - CARD_HEIGHT / 2 }}><BracketMatch match={match} label={matchLabel(round, matchIndex)} previousRound={rounds[roundIndex - 1]} /></div>)}
          </div>
        </section>)}
      </div>
    </div>
  </div>;
}
