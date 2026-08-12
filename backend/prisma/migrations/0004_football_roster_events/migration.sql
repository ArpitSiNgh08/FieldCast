ALTER TABLE "football_events"
  ADD COLUMN "extra_time_minute" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "player_id" INTEGER,
  ADD COLUMN "jersey_number" TEXT;

CREATE INDEX "football_events_player_id_idx" ON "football_events"("player_id");
ALTER TABLE "football_events" ADD CONSTRAINT "football_events_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
