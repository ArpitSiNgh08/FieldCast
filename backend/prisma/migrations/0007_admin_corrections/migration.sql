CREATE TABLE "standing_overrides" (
  "id" SERIAL NOT NULL,
  "tournament_id" INTEGER NOT NULL,
  "team_id" INTEGER NOT NULL,
  "played" INTEGER,
  "won" INTEGER,
  "lost" INTEGER,
  "drawn" INTEGER,
  "points" INTEGER,
  "scored_for" INTEGER,
  "scored_against" INTEGER,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "standing_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "standing_overrides_tournament_id_team_id_key"
  ON "standing_overrides"("tournament_id", "team_id");

ALTER TABLE "standing_overrides"
  ADD CONSTRAINT "standing_overrides_tournament_id_fkey"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "standing_overrides"
  ADD CONSTRAINT "standing_overrides_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
