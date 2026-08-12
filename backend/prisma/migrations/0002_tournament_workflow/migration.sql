ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
ALTER TABLE "teams" ADD COLUMN "owner_id" INTEGER;
ALTER TABLE "tournaments"
  ADD COLUMN "image_url" TEXT,
  ADD COLUMN "approval_status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "rejection_reason" TEXT,
  ADD COLUMN "creator_id" INTEGER,
  ADD COLUMN "reviewed_by_id" INTEGER,
  ADD COLUMN "submitted_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "tournaments" SET "approval_status" = 'approved';

CREATE TABLE "tournament_teams" (
  "tournament_id" INTEGER NOT NULL, "team_id" INTEGER NOT NULL, "seed" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_teams_pkey" PRIMARY KEY ("tournament_id", "team_id")
);
CREATE TABLE "players" (
  "id" SERIAL NOT NULL, "name" TEXT NOT NULL, "owner_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "team_players" (
  "team_id" INTEGER NOT NULL, "player_id" INTEGER NOT NULL,
  "jersey_number" TEXT NOT NULL, "position" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_players_pkey" PRIMARY KEY ("team_id", "player_id")
);
CREATE INDEX "tournaments_approval_status_idx" ON "tournaments"("approval_status");
CREATE INDEX "tournaments_creator_id_idx" ON "tournaments"("creator_id");
CREATE INDEX "players_owner_id_idx" ON "players"("owner_id");
CREATE UNIQUE INDEX "team_players_team_id_jersey_number_key" ON "team_players"("team_id", "jersey_number");
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "players" ADD CONSTRAINT "players_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "team_players" ADD CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_players" ADD CONSTRAINT "team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
