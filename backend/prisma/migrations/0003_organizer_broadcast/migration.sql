ALTER TABLE "matches" ADD COLUMN "venue" TEXT;
ALTER TABLE "matches" ADD COLUMN "broadcast_checklist" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "tournament_organizers" (
  "tournament_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "added_by_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_organizers_pkey" PRIMARY KEY ("tournament_id", "user_id")
);

CREATE TABLE "match_cameras" (
  "id" SERIAL NOT NULL,
  "match_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "angle" TEXT NOT NULL,
  "stream_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_cameras_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tournament_organizers_user_id_idx" ON "tournament_organizers"("user_id");
CREATE INDEX "match_cameras_match_id_idx" ON "match_cameras"("match_id");
CREATE UNIQUE INDEX "match_cameras_stream_key_key" ON "match_cameras"("stream_key");

ALTER TABLE "tournament_organizers" ADD CONSTRAINT "tournament_organizers_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_organizers" ADD CONSTRAINT "tournament_organizers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_cameras" ADD CONSTRAINT "match_cameras_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Approved tournament creators become their first organiser.
INSERT INTO "tournament_organizers" ("tournament_id", "user_id", "added_by_id")
SELECT "id", "creator_id", "creator_id" FROM "tournaments"
WHERE "approval_status" = 'approved' AND "creator_id" IS NOT NULL
ON CONFLICT DO NOTHING;
