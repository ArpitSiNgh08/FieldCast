-- FieldCast baseline migration — generated from src/db/schema.sql
-- This file represents the initial schema for Prisma's migration history.
-- It is NOT run directly against a new DB; Prisma migrate deploy runs it
-- automatically when it hasn't been applied yet.

-- ─── Auth ────────────────────────────────────────────────────────────────────
CREATE TABLE "users" (
    "id"         SERIAL PRIMARY KEY,
    "email"      TEXT UNIQUE NOT NULL,
    "name"       TEXT,
    "avatar_url" TEXT,
    "role"       TEXT NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Core (sport-agnostic) ───────────────────────────────────────────────────
CREATE TABLE "teams" (
    "id"         SERIAL PRIMARY KEY,
    "name"       TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "logo_url"   TEXT,
    "sport"      TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "tournaments" (
    "id"         SERIAL PRIMARY KEY,
    "name"       TEXT NOT NULL,
    "sport"      TEXT NOT NULL,
    "format"     TEXT,
    "start_date" DATE,
    "end_date"   DATE,
    "status"     TEXT NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "matches" (
    "id"             SERIAL PRIMARY KEY,
    "tournament_id"  INTEGER REFERENCES "tournaments"("id") ON DELETE SET NULL,
    "team_a_id"      INTEGER NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
    "team_b_id"      INTEGER NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
    "sport"          TEXT NOT NULL,
    "scheduled_at"   TIMESTAMPTZ,
    "status"         TEXT NOT NULL DEFAULT 'upcoming',
    "winner_team_id" INTEGER REFERENCES "teams"("id") ON DELETE SET NULL,
    "active_camera"  TEXT NOT NULL DEFAULT 'camera1',
    "stream_url"     TEXT,
    "replay_url"     TEXT,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "matches_tournament_id_idx" ON "matches"("tournament_id");
CREATE INDEX "matches_status_idx" ON "matches"("status");

CREATE TABLE "standings" (
    "id"             SERIAL PRIMARY KEY,
    "tournament_id"  INTEGER NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
    "team_id"        INTEGER NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
    "played"         INTEGER NOT NULL DEFAULT 0,
    "won"            INTEGER NOT NULL DEFAULT 0,
    "lost"           INTEGER NOT NULL DEFAULT 0,
    "drawn"          INTEGER NOT NULL DEFAULT 0,
    "points"         INTEGER NOT NULL DEFAULT 0,
    "scored_for"     INTEGER NOT NULL DEFAULT 0,
    "scored_against" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "standings_tournament_id_team_id_key" UNIQUE ("tournament_id", "team_id")
);

-- ─── Live overlay state ───────────────────────────────────────────────────────
CREATE TABLE "match_state" (
    "id"           SERIAL PRIMARY KEY,
    "match_id"     INTEGER UNIQUE NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
    "team_a_score" INTEGER NOT NULL DEFAULT 0,
    "team_b_score" INTEGER NOT NULL DEFAULT 0,
    "period"       INTEGER NOT NULL DEFAULT 1,
    "period_label" TEXT NOT NULL DEFAULT '',
    "status"       TEXT NOT NULL DEFAULT 'break',
    "extra"        JSONB NOT NULL DEFAULT '{}',
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Sport-specific event tables ─────────────────────────────────────────────
CREATE TABLE "cricket_events" (
    "id"              SERIAL PRIMARY KEY,
    "match_id"        INTEGER NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
    "innings"         INTEGER NOT NULL DEFAULT 1,
    "over_number"     DECIMAL(5,1) NOT NULL DEFAULT 0,
    "batting_team_id" INTEGER REFERENCES "teams"("id") ON DELETE SET NULL,
    "runs_total"      INTEGER NOT NULL DEFAULT 0,
    "wickets"         INTEGER NOT NULL DEFAULT 0,
    "run_rate"        DECIMAL(5,2) NOT NULL DEFAULT 0,
    "extras"          INTEGER NOT NULL DEFAULT 0,
    "description"     TEXT,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "cricket_events_match_id_idx" ON "cricket_events"("match_id");

CREATE TABLE "football_events" (
    "id"          SERIAL PRIMARY KEY,
    "match_id"    INTEGER NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
    "half"        INTEGER NOT NULL DEFAULT 1,
    "minute"      INTEGER NOT NULL DEFAULT 0,
    "event_type"  TEXT NOT NULL,
    "team_id"     INTEGER REFERENCES "teams"("id") ON DELETE SET NULL,
    "player_name" TEXT,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "football_events_match_id_idx" ON "football_events"("match_id");

CREATE TABLE "basketball_quarters" (
    "id"              SERIAL PRIMARY KEY,
    "match_id"        INTEGER NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
    "quarter"         INTEGER NOT NULL DEFAULT 1,
    "team_a_points"   INTEGER NOT NULL DEFAULT 0,
    "team_b_points"   INTEGER NOT NULL DEFAULT 0,
    "team_a_fouls"    INTEGER NOT NULL DEFAULT 0,
    "team_b_fouls"    INTEGER NOT NULL DEFAULT 0,
    "team_a_timeouts" INTEGER NOT NULL DEFAULT 0,
    "team_b_timeouts" INTEGER NOT NULL DEFAULT 0,
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "basketball_quarters_match_id_quarter_key" UNIQUE ("match_id", "quarter")
);
CREATE INDEX "basketball_quarters_match_id_idx" ON "basketball_quarters"("match_id");
