import { api } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";
import type { Match } from "@/lib/types";
import { SPORTS, SPORT_LABEL, SPORT_EMOJI } from "@/lib/format";
import type { Sport } from "@/lib/types";

export const revalidate = 10; // ISR: refresh fixture list every 10 s

async function getMatches(): Promise<Match[]> {
  try {
    return await api.listMatches();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const matches = await getMatches();

  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "upcoming");
  const completed = matches.filter((m) => m.status === "completed");

  const bySport = (list: Match[], sport: Sport) =>
    list.filter((m) => m.sport === sport);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-sans">
          Live College Sports
        </h1>
        <p className="mt-2 text-base text-muted" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          Stream cricket, football, and basketball straight from the ground —
          real-time scores, multi-camera, no OBS needed.
        </p>
      </div>

      {/* Live matches — shown prominently first */}
      {live.length > 0 && (
        <section className="mb-10" aria-label="Live matches">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-live animate-live-dot" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-live">
              Live now
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming matches */}
      {upcoming.length > 0 && (
        <section className="mb-10" aria-label="Upcoming matches">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
            Upcoming
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Recent results */}
      {completed.length > 0 && (
        <section className="mb-10" aria-label="Recent results">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
            Recent results
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.slice(0, 6).map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {matches.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-3 text-4xl">🏟️</span>
          <p className="text-base font-medium text-foreground">No matches scheduled yet</p>
          <p className="mt-1 text-sm text-muted">
            Check back soon — fixtures will appear here once the admin creates them.
          </p>
        </div>
      )}

      {/* Sport quick-filters — informational browse by sport */}
      {matches.length > 0 && (
        <section aria-label="Browse by sport" className="mt-6 border-t border-border pt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
            Browse by sport
          </h2>
          <div className="flex flex-wrap gap-3">
            {SPORTS.map((sport) => {
              const count = matches.filter((m) => m.sport === sport).length;
              if (!count) return null;
              return (
                <a
                  key={sport}
                  href={`/?sport=${sport}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent"
                >
                  <span>{SPORT_EMOJI[sport]}</span>
                  <span>{SPORT_LABEL[sport]}</span>
                  <span className="text-xs text-muted">({count})</span>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
