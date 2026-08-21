-- Older registrations were left entirely on the bench. When a team has no
-- saved starting lineup, promote its first registered players so live events
-- and substitutions work without requiring the roster to be registered again.
WITH ranked AS (
  SELECT
    membership."team_id",
    membership."player_id",
    ROW_NUMBER() OVER (
      PARTITION BY membership."team_id"
      ORDER BY membership."created_at", membership."player_id"
    ) AS position,
    CASE WHEN team."sport" = 'basketball' THEN 5 ELSE 11 END AS playing_limit
  FROM "team_players" AS membership
  JOIN "teams" AS team ON team."id" = membership."team_id"
  WHERE NOT EXISTS (
    SELECT 1
    FROM "team_players" AS current_lineup
    WHERE current_lineup."team_id" = membership."team_id"
      AND current_lineup."squad_role" = 'playing'
  )
)
UPDATE "team_players" AS membership
SET "squad_role" = 'playing'
FROM ranked
WHERE membership."team_id" = ranked."team_id"
  AND membership."player_id" = ranked."player_id"
  AND ranked.position <= ranked.playing_limit;
