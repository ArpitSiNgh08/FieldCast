"use client";

import type { Sport } from "@/lib/types";
import { SPORT_LABEL } from "@/lib/format";

export function StandingsTournamentSelector({ options, selectedId }: { options: { id: number; name: string; sport: Sport }[]; selectedId: number }) {
  return <label className="w-full sm:max-w-xs"><span className="sr-only">Select tournament standings</span><select value={selectedId} onChange={(event) => { window.location.href = `/standings?tournament=${event.target.value}`; }} className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">{options.map((option) => <option key={option.id} value={option.id}>{option.name} · {SPORT_LABEL[option.sport]}</option>)}</select></label>;
}
