// Shared domain types mirroring the backend API shapes.

export type Sport = "cricket" | "football" | "basketball";
export type MatchStatus = "upcoming" | "live" | "completed";
export type StateStatus = "live" | "break" | "completed";
export type CameraId = "camera1" | "camera2" | "camera3";

export interface Team {
  id: number;
  name: string;
  shortName: string;
  logoUrl: string | null;
}

export interface MatchState {
  teamAScore: number;
  teamBScore: number;
  period: number;
  periodLabel: string;
  status: StateStatus;
  // Sport-specific quick fields (wickets, minute, clock, …)
  extra: Record<string, unknown>;
  updatedAt?: string;
}

export interface Match {
  id: number;
  tournamentId: number | null;
  tournamentName: string | null;
  sport: Sport;
  scheduledAt: string | null;
  status: MatchStatus;
  winnerTeamId: number | null;
  activeCamera: CameraId;
  streamUrl: string | null;
  replayUrl: string | null;
  liveUrl?: string;
  teamA: Team;
  teamB: Team;
  state: MatchState;
}

export interface Tournament {
  id: number;
  name: string;
  sport: Sport;
  format: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "upcoming" | "ongoing" | "completed";
}

export interface StandingRow {
  teamId: number;
  teamName: string;
  teamShort: string;
  teamLogo: string | null;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  scoredFor: number;
  scoredAgainst: number;
  scoreDiff: number;
}

export interface CricketEvent {
  id: number;
  innings: number;
  over_number: string;
  batting_team_id: number | null;
  runs_total: number;
  wickets: number;
  run_rate: string;
  extras: number;
  description: string | null;
}

export interface FootballEvent {
  id: number;
  half: number;
  minute: number;
  event_type: "goal" | "yellow_card" | "red_card" | "substitution";
  team_id: number | null;
  team_short: string | null;
  team_name: string | null;
  player_name: string | null;
}

export interface BasketballQuarter {
  id: number;
  quarter: number;
  team_a_points: number;
  team_b_points: number;
  team_a_fouls: number;
  team_b_fouls: number;
  team_a_timeouts: number;
  team_b_timeouts: number;
}

export interface Scorecard {
  match: Match;
  cricketEvents?: CricketEvent[];
  footballEvents?: FootballEvent[];
  basketballQuarters?: BasketballQuarter[];
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: "viewer" | "admin";
}
