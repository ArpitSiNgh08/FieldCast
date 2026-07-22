// Small formatting helpers shared across overlays, scorecards and standings.

import type { Sport } from "./types";

export const SPORTS: Sport[] = ["cricket", "football", "basketball"];

export const SPORT_LABEL: Record<Sport, string> = {
  cricket: "Cricket",
  football: "Football",
  basketball: "Basketball",
};

export const SPORT_EMOJI: Record<Sport, string> = {
  cricket: "🏏",
  football: "⚽",
  basketball: "🏀",
};

/** Cricket run rate = runs / overs (overs in decimal, e.g. 18.4 → 18.667). */
export function runRate(runs: number, overs: number): number {
  const oversDecimal = oversToDecimal(overs);
  if (!oversDecimal) return 0;
  return runs / oversDecimal;
}

/** Convert cricket overs notation (18.4 = 18 overs + 4 balls) to true decimal. */
export function oversToDecimal(overs: number): number {
  const whole = Math.floor(overs);
  const balls = Math.round((overs - whole) * 10);
  return whole + balls / 6;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Read a number out of the loosely-typed match_state.extra bag. */
export function num(extra: Record<string, unknown>, key: string, fallback = 0): number {
  const v = extra?.[key];
  return typeof v === "number" ? v : typeof v === "string" ? Number(v) || fallback : fallback;
}

export function str(extra: Record<string, unknown>, key: string, fallback = ""): string {
  const v = extra?.[key];
  return typeof v === "string" ? v : v != null ? String(v) : fallback;
}
