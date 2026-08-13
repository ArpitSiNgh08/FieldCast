ALTER TABLE "team_players"
ADD COLUMN "squad_role" TEXT NOT NULL DEFAULT 'bench';

WITH ranked AS (
  SELECT "team_id", "player_id",
         ROW_NUMBER() OVER (PARTITION BY "team_id" ORDER BY "created_at", "player_id") AS position
  FROM "team_players"
)
UPDATE "team_players" AS membership
SET "squad_role" = 'playing'
FROM ranked
WHERE membership."team_id" = ranked."team_id"
  AND membership."player_id" = ranked."player_id"
  AND ranked.position <= 11;

ALTER TABLE "matches"
ADD COLUMN "result_type" TEXT NOT NULL DEFAULT 'pending';

UPDATE "matches"
SET "result_type" = 'played'
WHERE "status" = 'completed';
