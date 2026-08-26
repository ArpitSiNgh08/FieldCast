CREATE TABLE "match_views" (
    "match_id" INTEGER NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_views_pkey" PRIMARY KEY ("match_id", "viewer_id")
);

CREATE INDEX "match_views_match_id_idx" ON "match_views"("match_id");

ALTER TABLE "match_views"
ADD CONSTRAINT "match_views_match_id_fkey"
FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
