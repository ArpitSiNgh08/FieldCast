import { api } from "@/lib/api";
import { KnockoutBracket } from "@/components/KnockoutBracket";
import { SPORT_EMOJI, SPORT_LABEL, formatDate } from "@/lib/format";
import { Badge } from "@/ui/Badge";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import type { Match, Tournament, StandingRow } from "@/lib/types";

export const revalidate = 0;

export const metadata = {
  title: "Standings — FieldCast",
  description: "Points tables and standings for all FieldCast college sport tournaments.",
};

async function getData() {
  try {
    const tournaments = await api.listTournaments();
    const standingsMap = await Promise.all(
      tournaments.map(async (t) => {
        try {
          const [rows, matches] = await Promise.all([api.getStandings(t.id), api.listMatches({ tournamentId: String(t.id) })]);
          return { tournament: t, rows, matches };
        } catch {
          return { tournament: t, rows: [], matches: [] };
        }
      })
    );
    return standingsMap;
  } catch {
    return [];
  }
}

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ tournament?: string }> }) {
  const data = await getData();
  const { tournament } = await searchParams;
  const selectedTournamentId = Number(tournament);
  const selected = Number.isInteger(selectedTournamentId) && selectedTournamentId > 0;
  const active = data.filter((d) => selected
    ? d.tournament.id === selectedTournamentId
    : d.rows.length > 0 || d.tournament.status !== "upcoming");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Standings</h1>
        <p className="mt-2 text-base text-muted" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          {selected ? "Tournament points table and results." : "Points tables for all active tournaments."}
        </p>
      </div>

      {active.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-3 text-4xl">🏆</span>
          <p className="text-base font-medium text-foreground">No tournaments yet</p>
          <p className="mt-1 text-sm text-muted">
            Standings will appear here once a tournament is set up.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-10">
        {active.map(({ tournament, rows, matches }) => (
          <TournamentStandings key={tournament.id} tournament={tournament} rows={rows} matches={matches} />
        ))}
      </div>
    </div>
  );
}

function TournamentStandings({
  tournament,
  rows,
  matches,
}: {
  tournament: Tournament;
  rows: StandingRow[];
  matches: Match[];
}) {
  const statusTone =
    tournament.status === "ongoing"
      ? "live"
      : tournament.status === "completed"
        ? "muted"
        : "accent";

  const isFootball = tournament.sport === "football";
  const poolGroups = tournament.pools.length
    ? [...tournament.pools.map((pool) => ({ name: pool.name, rows: rows.filter((row) => row.poolId === pool.id) })), ...(rows.some((row) => !row.poolId) ? [{ name: "Unassigned", rows: rows.filter((row) => !row.poolId) }] : [])]
    : [{ name: null, rows }];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
              <span>{SPORT_EMOJI[tournament.sport]}</span>
              <span>{SPORT_LABEL[tournament.sport]}</span>
              {tournament.format && (
                <>
                  <span>·</span>
                  <span className="capitalize">{tournament.format}</span>
                </>
              )}
            </div>
            <CardTitle>{tournament.name}</CardTitle>
            {(tournament.startDate || tournament.endDate) && (
              <p className="mt-0.5 text-xs text-muted">
                {tournament.startDate ? formatDate(tournament.startDate) : "TBD"}
                {" – "}
                {tournament.endDate ? formatDate(tournament.endDate) : "TBD"}
              </p>
            )}
          </div>
          <Badge tone={statusTone} className="capitalize">
            {tournament.status}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">No matches played yet.</p>
        ) : (
          <div className={poolGroups.length > 1 ? "grid gap-px bg-border lg:grid-cols-2" : ""}>
          {poolGroups.map((group) => <div key={group.name || "table"} className="overflow-x-auto bg-surface">
          {group.name && <h3 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">{group.name}</h3>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium w-6">#</th>
                <th className="px-5 py-3 font-medium">Team</th>
                <th className="px-3 py-3 font-medium text-center">P</th>
                <th className="px-3 py-3 font-medium text-center">W</th>
                <th className="px-3 py-3 font-medium text-center">L</th>
                {isFootball && <th className="px-3 py-3 font-medium text-center">D</th>}
                {isFootball && <th className="px-3 py-3 font-medium text-center">GD</th>}
                <th className="px-5 py-3 font-semibold text-center text-foreground">Pts</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row, idx) => (
                <tr
                  key={row.teamId}
                  className="border-b border-border/50 last:border-b-0 hover:bg-surface-2/60 transition-colors"
                >
                  <td className="px-5 py-3 text-xs text-muted">{idx + 1}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded bg-surface-2 text-xs font-bold text-muted">
                        {row.teamShort}
                      </span>
                      <span className="font-medium text-foreground">{row.teamName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-muted">{row.played}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-accent font-medium">{row.won}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-muted">{row.lost}</td>
                  {isFootball && (
                    <td className="px-3 py-3 text-center tabular-nums text-muted">{row.drawn}</td>
                  )}
                  {isFootball && <td className="px-3 py-3 text-center tabular-nums"><span className={row.scoreDiff >= 0 ? "text-accent" : "text-live"}>{row.scoreDiff > 0 ? "+" : ""}{row.scoreDiff}</span></td>}
                  <td className="px-5 py-3 text-center font-bold tabular-nums text-foreground">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>)}
          </div>
        )}
      </CardBody>
      {matches.some((match) => match.stageType === "knockout") && <div className="border-t border-border p-5"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-widest text-accent">Playoffs</p><h3 className="mt-1 text-lg font-semibold text-foreground">Knockout bracket</h3></div><KnockoutBracket matches={matches} /></div>}
    </Card>
  );
}
