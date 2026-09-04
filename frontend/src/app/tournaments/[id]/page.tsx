import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchCard } from "@/components/MatchCard";
import { KnockoutBracket } from "@/components/KnockoutBracket";
import { api } from "@/lib/api";
import { formatDate, SPORT_EMOJI, SPORT_LABEL } from "@/lib/format";
import type { Match, StandingRow, Tournament } from "@/lib/types";
import { Badge, LiveBadge } from "@/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/ui/Card";

interface Props { params: Promise<{ id: string }> }

export const revalidate = 0;

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const tournament = await api.getTournament(id);
    return { title: `${tournament.name} — FieldCast`, description: `Fixtures, results, teams, and standings for ${tournament.name}.` };
  } catch {
    return { title: "Tournament — FieldCast" };
  }
}

export default async function TournamentPage({ params }: Props) {
  const { id } = await params;
  let tournament: Tournament;
  let matches: Match[] = [];
  let standings: StandingRow[] = [];
  try {
    tournament = await api.getTournament(id);
    [matches, standings] = await Promise.all([
      api.listMatches({ tournamentId: id }),
      api.getStandings(id),
    ]);
  } catch {
    notFound();
  }

  const live = matches.filter((match) => match.status === "live");
  const upcoming = matches.filter((match) => match.status === "upcoming");
  const past = matches.filter((match) => match.status === "completed");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/" className="text-sm text-muted hover:text-foreground">← All tournaments</Link>

      <header className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="grid md:grid-cols-[18rem_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tournament.imageUrl || "/tournament-placeholder.svg"} alt="" className="h-52 w-full object-cover md:h-full" />
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{SPORT_EMOJI[tournament.sport]}</span>
              <span>{SPORT_LABEL[tournament.sport]}</span>
              {tournament.format && <><span>·</span><span className="capitalize">{tournament.format}</span></>}
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{tournament.name}</h1>
              <Badge tone={tournament.status === "ongoing" ? "live" : tournament.status === "completed" ? "muted" : "accent"} className="capitalize">{tournament.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted">
              {tournament.startDate ? formatDate(tournament.startDate) : "Dates to be announced"}
              {tournament.endDate && ` – ${formatDate(tournament.endDate)}`}
              <span> · {tournament.teams.length} teams</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {tournament.teams.map(({ team }) => <span key={team.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium">{team.logoUrl ? <img src={team.logoUrl} alt="" className="h-6 w-6 rounded-full border border-border object-cover" /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-surface text-[10px] font-bold text-muted">{team.shortName}</span>}<strong className="text-accent">{team.shortName}</strong><span>{team.name}</span></span>)}
            </div>
          </div>
        </div>
      </header>

      {live.length > 0 && <MatchSection title="Live now" live matches={live} />}
      <MatchSection title="Upcoming matches" matches={upcoming} empty="No upcoming matches have been scheduled." />
      <MatchSection title="Past matches" matches={past} empty="No completed matches yet." />

      <section className="mt-10" aria-labelledby="tournament-standings">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-accent">Table</p><h2 id="tournament-standings" className="mt-1 text-2xl font-bold">Standings</h2></div>
          <Link href={`/standings?tournament=${tournament.id}`} className="text-sm font-medium text-accent hover:underline">Open full standings →</Link>
        </div>
        <StandingsTable rows={standings} sport={tournament.sport} />
      </section>

      {matches.some((match) => match.stageType === "knockout") && <section className="mt-10" aria-labelledby="tournament-bracket"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-widest text-accent">Playoffs</p><h2 id="tournament-bracket" className="mt-1 text-2xl font-bold">Knockout bracket</h2><p className="mt-1 text-sm text-muted">Follow each knockout fixture through to the final.</p></div><Card><CardBody className="p-5"><KnockoutBracket matches={matches} /></CardBody></Card></section>}
    </div>
  );
}

function MatchSection({ title, matches, empty, live = false }: { title: string; matches: Match[]; empty?: string; live?: boolean }) {
  return <section className="mt-10"><div className="mb-4 flex items-center gap-2">{live && <LiveBadge />}<h2 className="text-xl font-bold text-foreground">{title}</h2></div>{matches.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{matches.map((match) => <MatchCard key={match.id} match={match} />)}</div> : <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted">{empty}</div>}</section>;
}

function StandingsTable({ rows, sport, grouped = true, title = "Points table" }: { rows: StandingRow[]; sport: Tournament["sport"]; grouped?: boolean; title?: string }) {
  const pools = grouped ? Array.from(new Map(rows.filter((row) => row.poolId).map((row) => [row.poolId, row.poolName || "Pool"]))) : [];
  if (pools.length) return <div className="grid gap-5 lg:grid-cols-2">{pools.map(([poolId, poolName]) => <StandingsTable key={poolId} rows={rows.filter((row) => row.poolId === poolId)} sport={sport} grouped={false} title={poolName} />)}{rows.some((row) => !row.poolId) && <StandingsTable rows={rows.filter((row) => !row.poolId)} sport={sport} grouped={false} title="Unassigned" />}</div>;
  const isFootball = sport === "football";
  return <Card>{rows.length === 0 ? <CardBody><p className="text-sm text-muted">Standings will appear when teams and results are available.</p></CardBody> : <><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardBody className="overflow-x-auto p-0"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface-2 text-xs text-muted"><th className="px-5 py-3 text-left font-medium">#</th><th className="px-4 py-3 text-left font-medium">Team</th><th className="px-3 py-3 font-medium">P</th><th className="px-3 py-3 font-medium">W</th>{isFootball&&<th className="px-3 py-3 font-medium">D</th>}<th className="px-3 py-3 font-medium">L</th>{isFootball&&<th className="px-3 py-3 font-medium">GD</th>}<th className="px-5 py-3 font-semibold text-foreground">Pts</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.teamId} className="border-b border-border/50 last:border-0"><td className="px-5 py-3 text-muted">{index + 1}</td><td className="px-4 py-3 font-medium"><span className="mr-2 inline-grid h-7 w-9 place-items-center rounded bg-surface-2 text-xs text-muted">{row.teamShort}</span>{row.teamName}</td><td className="px-3 py-3 text-center tabular-nums">{row.played}</td><td className="px-3 py-3 text-center tabular-nums">{row.won}</td>{isFootball&&<td className="px-3 py-3 text-center tabular-nums">{row.drawn}</td>}<td className="px-3 py-3 text-center tabular-nums">{row.lost}</td>{isFootball&&<td className="px-3 py-3 text-center tabular-nums">{row.scoreDiff > 0 ? "+" : ""}{row.scoreDiff}</td>}<td className="px-5 py-3 text-center font-bold tabular-nums">{row.points}</td></tr>)}</tbody></table></CardBody></>}</Card>;
}
