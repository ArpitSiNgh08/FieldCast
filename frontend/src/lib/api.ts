// Thin REST client for the FieldCast backend. Attaches the JWT (if present)
// and unwraps JSON / errors consistently.

import type {
  AuthUser,
  Match,
  Scorecard,
  StandingRow,
  Team,
  Tournament,
  Player,
  TeamPlayer,
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
  loginWithPassword: (body: { email: string; password: string }) =>
    apiFetch<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body }),
  register: (body: { name: string; email: string; password: string }) =>
    apiFetch<{ token: string; user: AuthUser }>("/auth/register", { method: "POST", body }),

  // Matches
  listMatches: (q: Record<string, string> = {}) =>
    apiFetch<Match[]>(`/matches${toQuery(q)}`),
  getMatch: (id: number | string) => apiFetch<Match>(`/matches/${id}`),
  getScorecard: (id: number | string) =>
    apiFetch<Scorecard>(`/matches/${id}/scorecard`),
  createMatch: (body: unknown) =>
    apiFetch<Match>("/matches", { method: "POST", body }),
  updateBroadcastSetup: (id: number, body: unknown) => apiFetch<Match>(`/matches/${id}/broadcast-setup`, { method: "PATCH", body }),
  addMatchCamera: (id: number, body: { name: string; angle: string }) => apiFetch<Match>(`/matches/${id}/cameras`, { method: "POST", body }),
  removeMatchCamera: (id: number, cameraId: number) => apiFetch<Match>(`/matches/${id}/cameras/${cameraId}`, { method: "DELETE" }),
  setMatchStatus: (id: number, status: string) =>
    apiFetch<Match>(`/matches/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),
  setMatchResult: (id: number, body: unknown) =>
    apiFetch<Match>(`/matches/${id}/result`, { method: "POST", body }),
  correctCompletedScore: (id: number, body: { teamAScore: number; teamBScore: number }) =>
    apiFetch<Match>(`/admin/matches/${id}/score`, { method: "PATCH", body }),
  addCompletedFootballEvent: (id: number, body: unknown) =>
    apiFetch(`/admin/matches/${id}/football-events`, { method: "POST", body }),
  updateCompletedFootballEvent: (id: number, eventId: number, body: unknown) =>
    apiFetch(`/admin/matches/${id}/football-events/${eventId}`, { method: "PATCH", body }),
  deleteCompletedFootballEvent: (id: number, eventId: number) =>
    apiFetch<void>(`/admin/matches/${id}/football-events/${eventId}`, { method: "DELETE" }),

  // Teams
  listTeams: (q: Record<string, string> = {}) =>
    apiFetch<Team[]>(`/teams${toQuery(q)}`),
  createTeam: (body: unknown) =>
    apiFetch<Team>("/teams", { method: "POST", body }),

  // Tournaments + standings
  listTournaments: () => apiFetch<Tournament[]>("/tournaments"),
  getTournament: (id: number | string) => apiFetch<Tournament>(`/tournaments/${id}`),
  myTournaments: () => apiFetch<Tournament[]>("/tournaments/mine"),
  organizedTournaments: () => apiFetch<Tournament[]>("/tournaments/organized/mine"),
  addOrganizer: (id: number, email: string) => apiFetch<Tournament>(`/tournaments/${id}/organizers`, { method: "POST", body: { email } }),
  pendingTournaments: () => apiFetch<Tournament[]>("/tournaments/review/pending"),
  myPlayers: () => apiFetch<Player[]>("/tournaments/players/mine"),
  createTournament: (body: unknown) =>
    apiFetch<Tournament>("/tournaments", { method: "POST", body }),
  updateTournament: (id: number, body: unknown) => apiFetch<Tournament>(`/tournaments/${id}`, { method: "PATCH", body }),
  updateTournamentLogo: (id: number, imageUrl: string) => apiFetch<Tournament>(`/tournaments/${id}/logo`, { method: "PATCH", body: { imageUrl } }),
  addTournamentPool: (id: number, name: string) => apiFetch(`/tournaments/${id}/pools`, { method: "POST", body: { name } }),
  addTournamentTeam: (id: number, body: unknown) => apiFetch<Team>(`/tournaments/${id}/teams`, { method: "POST", body }),
  updateTournamentTeam: (id: number, teamId: number, body: unknown) => apiFetch<Team>(`/tournaments/${id}/teams/${teamId}`, { method: "PATCH", body }),
  removeTournamentTeam: (id: number, teamId: number) => apiFetch<void>(`/tournaments/${id}/teams/${teamId}`, { method: "DELETE" }),
  addTeamPlayer: (id: number, teamId: number, body: unknown) => apiFetch<TeamPlayer>(`/tournaments/${id}/teams/${teamId}/players`, { method: "POST", body }),
  updateTeamPlayer: (id: number, teamId: number, playerId: number, body: { name?: string; jerseyNumber?: string; position?: string }) => apiFetch<TeamPlayer>(`/tournaments/${id}/teams/${teamId}/players/${playerId}`, { method: "PATCH", body }),
  removeTeamPlayer: (id: number, teamId: number, playerId: number) => apiFetch<void>(`/tournaments/${id}/teams/${teamId}/players/${playerId}`, { method: "DELETE" }),
  updateTeamLineup: (id: number, teamId: number, playingPlayerIds: number[]) => apiFetch<Team>(`/tournaments/${id}/teams/${teamId}/lineup`, { method: "PATCH", body: { playingPlayerIds } }),
  submitTournament: (id: number) => apiFetch<Tournament>(`/tournaments/${id}/submit`, { method: "POST" }),
  reviewTournament: (id: number, decision: "approved" | "rejected", reason?: string) => apiFetch<Tournament>(`/tournaments/${id}/review`, { method: "POST", body: { decision, reason } }),
  getStandings: (id: number | string) =>
    apiFetch<StandingRow[]>(`/tournaments/${id}/standings`),
  overrideStanding: (id: number, teamId: number, body: Omit<StandingRow, "teamId" | "teamName" | "teamShort" | "teamLogo" | "poolId" | "poolName" | "poolSortOrder" | "scoreDiff" | "overridden">) =>
    apiFetch<StandingRow[]>(`/admin/tournaments/${id}/standings/${teamId}`, { method: "PUT", body }),
  clearStandingOverride: (id: number, teamId: number) =>
    apiFetch<StandingRow[]>(`/admin/tournaments/${id}/standings/${teamId}`, { method: "DELETE" }),

  // Streams
  getLivestream: () =>
    apiFetch<{
      streamKey: string;
      publishing: boolean;
      hlsUrl: string;
      source: string;
    }>("/streams/livestream"),
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
