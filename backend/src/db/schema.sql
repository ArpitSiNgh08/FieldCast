-- FieldCast schema — hybrid design: normalized core tables + sport-specific
-- event tables. Running this file rebuilds the schema from scratch (dev-friendly).

DROP TABLE IF EXISTS basketball_quarters CASCADE;
DROP TABLE IF EXISTS football_events    CASCADE;
DROP TABLE IF EXISTS cricket_events     CASCADE;
DROP TABLE IF EXISTS match_state        CASCADE;
DROP TABLE IF EXISTS standings          CASCADE;
DROP TABLE IF EXISTS matches            CASCADE;
DROP TABLE IF EXISTS tournaments        CASCADE;
DROP TABLE IF EXISTS teams              CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

-- ─── Auth ────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    avatar_url  TEXT,
    role        TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Core (sport-agnostic) ───────────────────────────────────────────────
CREATE TABLE teams (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    short_name  TEXT NOT NULL,
    logo_url    TEXT,
    sport       TEXT NOT NULL CHECK (sport IN ('cricket', 'football', 'basketball')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tournaments (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    sport       TEXT NOT NULL CHECK (sport IN ('cricket', 'football', 'basketball')),
    format      TEXT,                       -- 'league' | 'knockout' | free text
    start_date  DATE,
    end_date    DATE,
    status      TEXT NOT NULL DEFAULT 'upcoming'
                CHECK (status IN ('upcoming', 'ongoing', 'completed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE matches (
    id              SERIAL PRIMARY KEY,
    tournament_id   INTEGER REFERENCES tournaments(id) ON DELETE SET NULL,
    team_a_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team_b_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sport           TEXT NOT NULL CHECK (sport IN ('cricket', 'football', 'basketball')),
    scheduled_at    TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming', 'live', 'completed')),
    winner_team_id  INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    active_camera   TEXT NOT NULL DEFAULT 'camera1',
    -- Optional explicit stream override; when null the frontend derives the
    -- LL-HLS URL from SRS_HLS_BASE + /live/active.m3u8
    stream_url      TEXT,
    replay_url      TEXT,                   -- ImageKit / HLS VOD URL when completed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_status     ON matches(status);

CREATE TABLE standings (
    id              SERIAL PRIMARY KEY,
    tournament_id   INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    played          INTEGER NOT NULL DEFAULT 0,
    won             INTEGER NOT NULL DEFAULT 0,
    lost            INTEGER NOT NULL DEFAULT 0,
    drawn           INTEGER NOT NULL DEFAULT 0,
    points          INTEGER NOT NULL DEFAULT 0,
    -- Tie-breakers (sport-dependent, used where relevant)
    scored_for      INTEGER NOT NULL DEFAULT 0,   -- goals / points scored
    scored_against  INTEGER NOT NULL DEFAULT 0,   -- goals / points conceded
    UNIQUE (tournament_id, team_id)
);

-- ─── Live overlay state (one row per match) ──────────────────────────────
CREATE TABLE match_state (
    id            SERIAL PRIMARY KEY,
    match_id      INTEGER UNIQUE NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_a_score  INTEGER NOT NULL DEFAULT 0,   -- runs / goals / total points
    team_b_score  INTEGER NOT NULL DEFAULT 0,
    period        INTEGER NOT NULL DEFAULT 1,   -- over / half / quarter number
    period_label  TEXT NOT NULL DEFAULT '',     -- "Over 18.4" / "Half 2" / "Q3 8:24"
    status        TEXT NOT NULL DEFAULT 'break'
                  CHECK (status IN ('live', 'break', 'completed')),
    -- Sport-specific quick fields for the overlay (wickets, minute, clock…)
    extra         JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Sport-specific event tables (detailed scorecards + history) ─────────
CREATE TABLE cricket_events (
    id              SERIAL PRIMARY KEY,
    match_id        INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    innings         INTEGER NOT NULL DEFAULT 1,
    over_number     NUMERIC(5,1) NOT NULL DEFAULT 0,   -- e.g. 18.4
    batting_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    runs_total      INTEGER NOT NULL DEFAULT 0,
    wickets         INTEGER NOT NULL DEFAULT 0,
    run_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
    extras          INTEGER NOT NULL DEFAULT 0,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cricket_events_match ON cricket_events(match_id);

CREATE TABLE football_events (
    id          SERIAL PRIMARY KEY,
    match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    half        INTEGER NOT NULL DEFAULT 1,
    minute      INTEGER NOT NULL DEFAULT 0,
    event_type  TEXT NOT NULL
                CHECK (event_type IN ('goal', 'yellow_card', 'red_card', 'substitution', 'foul', 'corner', 'free_kick', 'offside')),
    team_id     INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    player_name TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_football_events_match ON football_events(match_id);

CREATE TABLE basketball_quarters (
    id                SERIAL PRIMARY KEY,
    match_id          INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    quarter           INTEGER NOT NULL DEFAULT 1,
    team_a_points     INTEGER NOT NULL DEFAULT 0,
    team_b_points     INTEGER NOT NULL DEFAULT 0,
    team_a_fouls      INTEGER NOT NULL DEFAULT 0,
    team_b_fouls      INTEGER NOT NULL DEFAULT 0,
    team_a_timeouts   INTEGER NOT NULL DEFAULT 0,
    team_b_timeouts   INTEGER NOT NULL DEFAULT 0,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (match_id, quarter)
);
CREATE INDEX idx_basketball_quarters_match ON basketball_quarters(match_id);
