// Shared domain types mirroring the backend API shapes.

export type Sport = "cricket" | "football" | "basketball";
export type MatchStatus = "upcoming" | "live" | "completed";
export type StateStatus = "live" | "break" | "completed";
export type CameraId = string;

export interface Team {
  id: number;
  name: string;
  shortName: string;
  logoUrl: string | null;
  sport?: Sport;
  players?: TeamPlayer[];
}

export interface Player { id: number; name: string; }
export interface TeamPlayer { teamId: number; playerId: number; jerseyNumber: string; position: string | null; squadRole: "playing" | "bench"; player: Player; }
export type ApprovalStatus = "draft" | "submitted" | "approved" | "rejected";
export interface TournamentPool { id: number; tournamentId: number; name: string; sortOrder: number; }

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
  stageType: "pool" | "knockout" | null;
  poolId: number | null;
  poolName: string | null;
  knockoutStage: string | null;
  sport: Sport;
  scheduledAt: string | null;
  status: MatchStatus;
  winnerTeamId: number | null;
  resultType: "pending" | "played" | "washout";
  activeCamera: string;
  streamUrl: string | null;
  replayUrl: string | null;
  venue: string | null;
  broadcastChecklist: Record<string, boolean>;
  cameras: MatchCamera[];
  liveUrl?: string;
  cameraFallbackUrl?: string | null;
  teamA: Team;
  teamB: Team;
  state: MatchState;
}

export interface MatchCamera { id: number; matchId: number; name: string; angle: string; streamKey: string; ingestUrl?: string; srtIngestUrl?: string; iphoneSrtUrl?: string; iphoneStreamId?: string; iphoneSrtIngestUrl?: string; createdAt: string; }

export interface Tournament {
  id: number;
  name: string;
  sport: Sport;
  format: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "upcoming" | "ongoing" | "completed";
  imageUrl: string | null;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  creatorId: number | null;
  creator?: { id: number; name: string | null; email: string } | null;
  pools: TournamentPool[];
  teams: { tournamentId: number; teamId: number; poolId: number | null; pool: TournamentPool | null; team: Team }[];
  organizers: { tournamentId: number; userId: number; user: { id: number; name: string | null; email: string; avatarUrl: string | null } }[];
}

export interface StandingRow {
  teamId: number;
  teamName: string;
  teamShort: string;
  teamLogo: string | null;
  poolId: number | null;
  poolName: string | null;
  poolSortOrder: number | null;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  scoredFor: number;
  scoredAgainst: number;
  scoreDiff: number;
  overridden?: boolean;
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
  extra_time_minute: number;
  event_type: "goal" | "yellow_card" | "red_card" | "substitution" | "foul" | "corner" | "free_kick" | "offside";
  team_id: number | null;
  team_short: string | null;
  team_name: string | null;
  player_name: string | null;
  player_id: number | null;
  jersey_number: string | null;
  is_penalty: boolean;
  player_out_id: number | null;
  player_out_name: string | null;
  player_out_jersey: string | null;
  player_in_id: number | null;
  player_in_name: string | null;
  player_in_jersey: string | null;
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
