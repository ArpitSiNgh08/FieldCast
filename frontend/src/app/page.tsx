/* eslint-disable @next/next/no-img-element -- tournament images may be data URLs. */
import { api } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";
import type { Match, Tournament } from "@/lib/types";
import { SPORTS, SPORT_LABEL, SPORT_EMOJI } from "@/lib/format";
import Link from "next/link";

export const revalidate = 0;

async function getMatches(): Promise<Match[]> {
  try { return await api.listMatches(); } catch { return []; }
}

async function getTournaments(): Promise<Tournament[]> {
  try { return await api.listTournaments(); } catch { return []; }
}

export default async function HomePage() {
  const [matches, tournaments] = await Promise.all([getMatches(), getTournaments()]);
  const live = matches.filter((match) => match.status === "live");
  const recent = matches
    .filter((match) => match.status === "completed")
    .sort((a, b) => completedAt(b) - completedAt(a))
    .slice(0, 8);

  return <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
    <section aria-label="Filter by sports" className="mb-8 border-b border-border pb-6">
      <h1 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Filter by sports</h1>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {SPORTS.map((sport) => {
          const count = matches.filter((match) => match.sport === sport).length;
          if (!count) return null;
          return <a key={sport} href={`/?sport=${sport}`} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent"><span>{SPORT_EMOJI[sport]}</span><span>{SPORT_LABEL[sport]}</span><span className="text-xs text-muted">({count})</span></a>;
        })}
      </div>
    </section>

    {live.length > 0 && <MatchRailSection title="Live matches" live matches={live} />}
    {recent.length > 0 && <MatchRailSection title="Recent matches" matches={recent} />}

    {tournaments.length > 0 && <section className="mb-8" aria-label="Approved tournaments"><h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">Tournaments</h2><div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:justify-items-center sm:overflow-visible sm:px-0 lg:grid-cols-3">{tournaments.map((tournament) => <Link key={tournament.id} href={`/tournaments/${tournament.id}`} aria-label={`Open ${tournament.name}`} className="group w-[82vw] max-w-[300px] shrink-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:w-[300px]"><div className="flex aspect-square w-full items-center justify-center bg-surface-2 p-2"><img src={tournament.imageUrl || "/tournament-placeholder.svg"} alt="" className="h-full w-full object-contain" /></div><div className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted">{SPORT_LABEL[tournament.sport]}</p><h3 className="mt-1 font-semibold text-foreground">{tournament.name}</h3><p className="mt-2 text-xs text-muted">{tournament.teams.length} teams · {tournament.format || "Format to be announced"}</p></div></Link>)}</div></section>}

    {matches.length === 0 && <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-20 text-center"><span className="mb-3 text-4xl">🏟️</span><p className="text-base font-medium text-foreground">No matches scheduled yet</p><p className="mt-1 text-sm text-muted">Approved tournament matches will appear here when organisers create them.</p></div>}
  </div>;
}

function completedAt(match: Match) {
  const timestamp = match.state.updatedAt || match.scheduledAt;
  return timestamp ? new Date(timestamp).getTime() : 0;
}

function MatchRailSection({ title, matches, live = false }: { title: string; matches: Match[]; live?: boolean }) {
  return <section className="mb-8" aria-label={title}><div className="mb-4 flex items-center gap-2">{live && <span className="h-2.5 w-2.5 animate-live-dot rounded-full bg-live" />}<h2 className={`text-sm font-semibold uppercase tracking-widest ${live ? "text-live" : "text-muted"}`}>{title}</h2></div><div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">{matches.map((match) => <div key={match.id} className="w-[82vw] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none"><MatchCard match={match} /></div>)}</div></section>;
}
