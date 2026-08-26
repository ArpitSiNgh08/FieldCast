/* eslint-disable @next/next/no-img-element -- team logos may be local data URLs. */
import { api } from "@/lib/api";
import { KnockoutBracket } from "@/components/KnockoutBracket";
import { StandingsTournamentSelector } from "@/components/StandingsTournamentSelector";
import { SPORT_EMOJI, SPORT_LABEL, formatDate } from "@/lib/format";
import { Badge } from "@/ui/Badge";
import type { Match, Tournament, StandingRow } from "@/lib/types";

export const revalidate = 0;

export const metadata = {
  title: "Standings — FieldCast",
  description: "Points tables and standings for all FieldCast college sport tournaments.",
};

async function getData() {
  try {
    const tournaments = await api.listTournaments();
    return await Promise.all(tournaments.map(async (tournament) => {
      try {
        const [rows, matches] = await Promise.all([
          api.getStandings(tournament.id),
          api.listMatches({ tournamentId: String(tournament.id) }),
        ]);
        return { tournament, rows, matches };
      } catch {
        return { tournament, rows: [], matches: [] };
      }
    }));
  } catch {
    return [];
  }
}

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ tournament?: string }> }) {
  const data = await getData();
  const { tournament } = await searchParams;
  const eligible = data.filter((entry) => entry.rows.length > 0 || entry.tournament.status !== "upcoming");
  const requestedId = Number(tournament);
  const requested = Number.isInteger(requestedId) && requestedId > 0 ? eligible.find((entry) => entry.tournament.id === requestedId) : undefined;
  const selected = requested || eligible[0];

  return <div className="w-full px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
    <div className="w-full">
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Standings</h1>
          <p className="mt-2 text-base text-muted">{eligible.length > 1 ? "Choose a tournament to view its points table." : "Tournament points table and results."}</p>
        </div>
        {eligible.length > 1 && <StandingsTournamentSelector options={eligible.map(({ tournament: entry }) => ({ id: entry.id, name: entry.name, sport: entry.sport }))} selectedId={selected?.tournament.id || eligible[0]?.tournament.id || 0} />}
      </div>

      {!selected ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><span className="mb-3 text-4xl">🏆</span><p className="text-base font-medium text-foreground">No tournaments yet</p><p className="mt-1 text-sm text-muted">Standings will appear here once a tournament is set up.</p></div> : <TournamentStandings key={selected.tournament.id} tournament={selected.tournament} rows={selected.rows} matches={selected.matches} />}
    </div>
  </div>;
}

function TournamentStandings({ tournament, rows, matches }: { tournament: Tournament; rows: StandingRow[]; matches: Match[] }) {
  const statusTone = tournament.status === "ongoing" ? "live" : tournament.status === "completed" ? "muted" : "accent";
  const isFootball = tournament.sport === "football";
  const poolGroups = tournament.pools.length
    ? [...tournament.pools.map((pool) => ({ name: pool.name, rows: rows.filter((row) => row.poolId === pool.id) })), ...(rows.some((row) => !row.poolId) ? [{ name: "Unassigned", rows: rows.filter((row) => !row.poolId) }] : [])]
    : [{ name: null, rows }];

  return <section className="pt-6 sm:pt-8">
    <div className="flex flex-wrap items-start justify-between gap-3 pb-5">
      <div>
        <div className="mb-1 flex items-center gap-2 text-xs text-muted"><span>{SPORT_EMOJI[tournament.sport]}</span><span>{SPORT_LABEL[tournament.sport]}</span>{tournament.format && <><span>·</span><span className="capitalize">{tournament.format}</span></>}</div>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{tournament.name}</h2>
        {(tournament.startDate || tournament.endDate) && <p className="mt-1 text-xs text-muted">{tournament.startDate ? formatDate(tournament.startDate) : "TBD"}{" – "}{tournament.endDate ? formatDate(tournament.endDate) : "TBD"}</p>}
      </div>
      <Badge tone={statusTone} className="capitalize">{tournament.status}</Badge>
    </div>

    {rows.length === 0 ? <p className="border-y border-border py-6 text-sm text-muted">No matches played yet.</p> : <div className="space-y-8">{poolGroups.map((group) => <div key={group.name || "table"}>{group.name && <h3 className="border-y border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-foreground sm:px-4">{group.name}</h3>}<StandingsTable rows={group.rows} isFootball={isFootball} /></div>)}</div>}

    {matches.some((match) => match.stageType === "knockout") && <div className="mt-10 border-t border-border pt-6"><p className="text-xs font-semibold uppercase tracking-widest text-accent">Playoffs</p><h3 className="mt-1 text-lg font-semibold text-foreground">Knockout bracket</h3><div className="mt-4"><KnockoutBracket matches={matches} /></div></div>}
  </section>;
}

function StandingsTable({ rows, isFootball }: { rows: StandingRow[]; isFootball: boolean }) {
  return <div className="w-full overflow-hidden border-y border-border"><table className="w-full table-fixed text-xs sm:text-sm"><colgroup><col className="w-7 sm:w-10" /><col /><col className="w-8 sm:w-12" /><col className="w-8 sm:w-12" /><col className="w-8 sm:w-12" />{isFootball && <col className="w-8 sm:w-12" />}{isFootball && <col className="w-10 sm:w-14" />}<col className="w-10 sm:w-14" /></colgroup><thead><tr className="border-b border-border bg-surface-2 text-left text-[10px] uppercase tracking-wide text-muted sm:text-xs"><th className="px-2 py-3 font-medium sm:px-3">#</th><th className="px-1 py-3 font-medium sm:px-3">Team</th><th className="px-1 py-3 text-center font-medium sm:px-2">P</th><th className="px-1 py-3 text-center font-medium sm:px-2">W</th><th className="px-1 py-3 text-center font-medium sm:px-2">L</th>{isFootball && <th className="px-1 py-3 text-center font-medium sm:px-2">D</th>}{isFootball && <th className="px-1 py-3 text-center font-medium sm:px-2">GD</th>}<th className="px-1 py-3 text-center font-semibold text-foreground sm:px-2">Pts</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.teamId} className="border-b border-border/60 last:border-b-0 transition-colors hover:bg-surface-2/60"><td className="px-2 py-3 text-muted sm:px-3">{index + 1}</td><td className="min-w-0 px-1 py-3 sm:px-3"><div className="flex min-w-0 items-center gap-2"><TeamMark row={row} /><span className="min-w-0 truncate font-medium text-foreground">{row.teamName}</span></div></td><td className="px-1 py-3 text-center tabular-nums text-muted sm:px-2">{row.played}</td><td className="px-1 py-3 text-center font-medium tabular-nums text-accent sm:px-2">{row.won}</td><td className="px-1 py-3 text-center tabular-nums text-muted sm:px-2">{row.lost}</td>{isFootball && <td className="px-1 py-3 text-center tabular-nums text-muted sm:px-2">{row.drawn}</td>}{isFootball && <td className="px-1 py-3 text-center tabular-nums sm:px-2"><span className={row.scoreDiff >= 0 ? "text-accent" : "text-live"}>{row.scoreDiff > 0 ? "+" : ""}{row.scoreDiff}</span></td>}<td className="px-1 py-3 text-center font-bold tabular-nums text-foreground sm:px-2">{row.points}</td></tr>)}</tbody></table></div>;
}

function TeamMark({ row }: { row: StandingRow }) {
  return row.teamLogo ? <img src={row.teamLogo} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover sm:h-8 sm:w-8" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-bold text-muted sm:h-8 sm:w-8 sm:text-xs">{row.teamShort}</span>;
}
