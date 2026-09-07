CREATE TABLE "google_drive_connections" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "account_email" TEXT,
  "refresh_token" TEXT NOT NULL,
  "folder_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_drive_connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "google_drive_connections_user_id_key" ON "google_drive_connections"("user_id");
ALTER TABLE "clip_jobs" ADD COLUMN "requested_by_id" INTEGER;
ALTER TABLE "google_drive_connections" ADD CONSTRAINT "google_drive_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clip_jobs" ADD CONSTRAINT "clip_jobs_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
