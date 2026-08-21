-- AlterTable
ALTER TABLE "football_events"
ADD COLUMN "player_out_id" INTEGER,
ADD COLUMN "player_out_name" TEXT,
ADD COLUMN "player_out_jersey" TEXT,
ADD COLUMN "player_in_id" INTEGER,
ADD COLUMN "player_in_name" TEXT,
ADD COLUMN "player_in_jersey" TEXT;

-- CreateIndex
CREATE INDEX "football_events_player_out_id_idx" ON "football_events"("player_out_id");

-- CreateIndex
CREATE INDEX "football_events_player_in_id_idx" ON "football_events"("player_in_id");

-- AddForeignKey
ALTER TABLE "football_events" ADD CONSTRAINT "football_events_player_out_id_fkey" FOREIGN KEY ("player_out_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "football_events" ADD CONSTRAINT "football_events_player_in_id_fkey" FOREIGN KEY ("player_in_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
