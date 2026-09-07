CREATE TABLE "tournament_clip_destinations" (
  "id" SERIAL NOT NULL,
  "tournament_id" INTEGER NOT NULL,
  "google_drive_connection_id" INTEGER NOT NULL,
  "folder_id" TEXT NOT NULL,
  "linked_by_user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tournament_clip_destinations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tournament_clip_destinations_tournament_id_key" ON "tournament_clip_destinations"("tournament_id");
CREATE INDEX "tournament_clip_destinations_google_drive_connection_id_idx" ON "tournament_clip_destinations"("google_drive_connection_id");
ALTER TABLE "tournament_clip_destinations" ADD CONSTRAINT "tournament_clip_destinations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_clip_destinations" ADD CONSTRAINT "tournament_clip_destinations_google_drive_connection_id_fkey" FOREIGN KEY ("google_drive_connection_id") REFERENCES "google_drive_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
