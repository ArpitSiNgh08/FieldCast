-- Sample data for local development. Assumes an empty (freshly migrated) schema.
-- Truncate first so `db:seed` is repeatable without duplicating rows.
TRUNCATE basketball_quarters, football_events, cricket_events, match_state,
         standings, matches, tournaments, teams RESTART IDENTITY CASCADE;

-- ─── Teams ───────────────────────────────────────────────────────────────
INSERT INTO teams (name, short_name, logo_url, sport) VALUES
  ('Engineering Eagles',  'ENG', NULL, 'cricket'),
  ('Science Strikers',    'SCI', NULL, 'cricket'),
  ('Commerce Chargers',   'COM', NULL, 'cricket'),
  ('Arts Avengers',       'ART', NULL, 'cricket'),
  ('North Block FC',      'NBF', NULL, 'football'),
  ('South Block FC',      'SBF', NULL, 'football'),
  ('East Wing United',    'EWU', NULL, 'football'),
  ('Hostel Hoops',        'HH',  NULL, 'basketball'),
  ('Faculty Flyers',      'FF',  NULL, 'basketball');

-- ─── Tournaments ─────────────────────────────────────────────────────────
INSERT INTO tournaments (name, sport, format, start_date, end_date, status) VALUES
  ('Inter-Dept Cricket Cup',   'cricket',    'league',   '2026-07-01', '2026-07-20', 'ongoing'),
  ('Campus Football League',   'football',   'league',   '2026-07-05', '2026-07-25', 'ongoing'),
  ('Basketball Knockout',      'basketball', 'knockout', '2026-07-10', '2026-07-15', 'upcoming');

-- ─── Matches ─────────────────────────────────────────────────────────────
-- Cricket (tournament 1): one live, one upcoming, one completed
INSERT INTO matches (tournament_id, team_a_id, team_b_id, sport, scheduled_at, status, winner_team_id, active_camera, replay_url) VALUES
  (1, 1, 2, 'cricket',    '2026-07-04 14:00+00', 'live',      NULL, 'camera1', NULL),
  (1, 3, 4, 'cricket',    '2026-07-06 14:00+00', 'upcoming',  NULL, 'camera1', NULL),
  (1, 1, 3, 'cricket',    '2026-07-02 14:00+00', 'completed', 1,    'camera1',
     'https://ik.imagekit.io/demo/sample-video.mp4/ik-master.m3u8?tr=sr-360_480_720'),
  -- Football (tournament 2)
  (2, 5, 6, 'football',   '2026-07-04 16:00+00', 'live',      NULL, 'camera2', NULL),
  (2, 7, 5, 'football',   '2026-07-08 16:00+00', 'upcoming',  NULL, 'camera1', NULL),
  -- Basketball (tournament 3)
  (3, 8, 9, 'basketball', '2026-07-10 18:00+00', 'upcoming',  NULL, 'camera1', NULL);

-- ─── Live match_state for the two live matches ───────────────────────────
-- Cricket live: Engineering Eagles 142/3 in 18.4 overs
INSERT INTO match_state (match_id, team_a_score, team_b_score, period, period_label, status, extra) VALUES
  (1, 142, 0, 18, 'Over 18.4', 'live',
     '{"wickets": 3, "overs": 18.4, "run_rate": 7.61, "batting_team": "a", "second_innings": false}'::jsonb),
  (4, 2, 1, 2, '67''', 'live',
     '{"minute": 67, "half": 2}'::jsonb);

-- match_state rows for the rest (idle) so every match has one row
INSERT INTO match_state (match_id, status, period_label) VALUES
  (2, 'break', 'Not started'),
  (3, 'completed', 'Match ended'),
  (5, 'break', 'Not started'),
  (6, 'break', 'Not started');

-- ─── Some detailed events for scorecards ─────────────────────────────────
-- Cricket over history for match 1
INSERT INTO cricket_events (match_id, innings, over_number, batting_team_id, runs_total, wickets, run_rate, extras, description) VALUES
  (1, 1, 5.0,  1, 38,  0, 7.60, 2, 'Steady start'),
  (1, 1, 10.0, 1, 74,  1, 7.40, 3, 'First wicket falls'),
  (1, 1, 15.0, 1, 118, 2, 7.87, 5, 'Acceleration'),
  (1, 1, 18.4, 1, 142, 3, 7.61, 6, 'Death overs');

-- Football timeline for match 4
INSERT INTO football_events (match_id, half, minute, event_type, team_id, player_name) VALUES
  (4, 1, 12, 'goal',        5, 'A. Sharma'),
  (4, 1, 34, 'yellow_card', 6, 'R. Khan'),
  (4, 2, 58, 'goal',        6, 'M. Das'),
  (4, 2, 63, 'goal',        5, 'A. Sharma');

-- ─── Standings for cricket tournament (from completed match 3) ───────────
INSERT INTO standings (tournament_id, team_id, played, won, lost, drawn, points, scored_for, scored_against) VALUES
  (1, 1, 1, 1, 0, 0, 2, 165, 150),
  (1, 3, 1, 0, 1, 0, 0, 150, 165),
  (1, 2, 0, 0, 0, 0, 0, 0, 0),
  (1, 4, 0, 0, 0, 0, 0, 0, 0);
