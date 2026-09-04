CREATE TABLE "clip_jobs" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "drive_file_id" TEXT,
    "drive_url" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clip_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "clip_jobs_match_id_created_at_idx" ON "clip_jobs"("match_id", "created_at");
ALTER TABLE "clip_jobs" ADD CONSTRAINT "clip_jobs_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
