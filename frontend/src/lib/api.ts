// Thin REST client for the FieldCast backend. Attaches the JWT (if present)
// and unwraps JSON / errors consistently.

import type {
  AuthUser,
  Match,
  Scorecard,
  StandingRow,
  Team,
  Tournament,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const TOKEN_KEY = "fieldcast_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  // Force uncached (default). Server components pass their own cache option.
  cache?: RequestCache;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache ?? "no-store",
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* non-json error */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Typed endpoint helpers ─────────────────────────────────────────────────
export const api = {
  // Auth
  me: () => apiFetch<AuthUser>("/auth/me"),
  authStatus: () => apiFetch<{ googleEnabled: boolean }>("/auth/status"),

  // Matches
  listMatches: (q: Record<string, string> = {}) =>
    apiFetch<Match[]>(`/matches${toQuery(q)}`),
  getMatch: (id: number | string) => apiFetch<Match>(`/matches/${id}`),
  getScorecard: (id: number | string) =>
    apiFetch<Scorecard>(`/matches/${id}/scorecard`),
  createMatch: (body: unknown) =>
    apiFetch<Match>("/matches", { method: "POST", body }),
  setMatchStatus: (id: number, status: string) =>
    apiFetch<Match>(`/matches/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),
  setMatchResult: (id: number, body: unknown) =>
    apiFetch<Match>(`/matches/${id}/result`, { method: "POST", body }),

  // Teams
  listTeams: (q: Record<string, string> = {}) =>
    apiFetch<Team[]>(`/teams${toQuery(q)}`),
  createTeam: (body: unknown) =>
    apiFetch<Team>("/teams", { method: "POST", body }),

  // Tournaments + standings
  listTournaments: () => apiFetch<Tournament[]>("/tournaments"),
  createTournament: (body: unknown) =>
    apiFetch<Tournament>("/tournaments", { method: "POST", body }),
  getStandings: (id: number | string) =>
    apiFetch<StandingRow[]>(`/tournaments/${id}/standings`),

  // Streams
  streamHealth: () =>
    apiFetch<{
      simulate: boolean;
      source: string;
      cameras: Record<string, { publishing: boolean; clients: number }>;
    }>("/streams/health"),
};

function toQuery(q: Record<string, string>) {
  const entries = Object.entries(q).filter(([, v]) => v);
  if (!entries.length) return "";
  return "?" + new URLSearchParams(Object.fromEntries(entries)).toString();
}
