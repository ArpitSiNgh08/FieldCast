# Automatic two-minute clipping plan

## Goal

Let an organiser press **Save last 2 minutes** during a live match and receive a durable clip in a configured Google Drive folder.

## Recommended architecture

1. Keep a rolling server-side recording for each live match. The existing SRS/ffmpeg path should write short rolling segments (for example, 6-second HLS/fMP4 segments) to match-scoped temporary storage.
2. Add a backend `POST /api/matches/:id/clips` endpoint protected by organiser authorization. It should snapshot the segment range ending at request time and enqueue a clip job instead of blocking the request.
3. A worker should concatenate/remux the previous 120 seconds with ffmpeg, upload the result using the Google Drive API to a configured folder, and persist job status, Drive file ID, URL, requested-at timestamp, and failure reason.
4. Add Socket.io `clip:created` / `clip:failed` notifications and an organiser-only clip panel with progress, retry, and links to completed clips.

## Important timing and privacy decisions

- Use the same server clock and HLS program-date-time alignment as score events so a requested clip ends at the action the organiser sees.
- Never expose Drive credentials to the browser; use OAuth/service-account credentials only on the backend.
- Retain temporary rolling segments only for the configured window and delete them after successful upload or expiry.
- Define behavior when the stream has been live for less than two minutes, when a camera cut crosses the requested range, and when the source has gaps.

## Delivery stages

- Phase 1: rolling segment capture and local clip generation with automated tests.
- Phase 2: Drive OAuth/service-account integration, upload retries, and persisted clip jobs.
- Phase 3: organiser UI, notifications, permissions, retention cleanup, and production observability.

## Current status (2026-09-10)

Phase 1, Phase 2, and Phase 3 organizer UI/resilience foundations are fully implemented:
- **Resilient Rolling Capture**: FFmpeg rolling recorder uses `-live_start_index -3` and reconnect flags with background retry loops to auto-heal from initial SRS HLS segment generation delays or transient stream drops.
- **On-Demand Auto-Start & Stale File Cleanup**: Recorder auto-spawns when clips are requested or status is checked for live matches. Old segment files are automatically purged on `wake()` and files older than 3 minutes are cleaned up to prevent false stalling alerts.
- **404 Disconnect & Staleness Detection**: Detects camera disconnects (`HTTP 404 Not Found`) and stalled streams (`>25s` without new video frames), accurately transitioning status to `🔴 DOWN`.
- **Resumable 1MB Upload Progress**: Google Drive uploads use the Resumable Upload protocol (`uploadType=resumable`) with 1MB chunking and live percentage progress callbacks (`uploading 15%`, `uploading 45%`, `uploading 75%`, `completed`).
- **Clipping Status & Manual Control**: Added `GET /api/matches/:id/clip-status` and `POST /api/matches/:id/clip-status/wake` endpoints. The organizer match control room renders a real-time status badge (🟢 UP, 🟡 BUFFERING, 🔴 DOWN), live buffer duration, diagnostic logs box, percentage upload badges, and an explicit **"⚡ Wake / Restart Recorder"** button.
- **Drive Destination**: Shared Google Drive OAuth linking (`0016_google_drive_oauth` / `0017_tournament_clip_destination`) stores encrypted refresh tokens so all organizers of a tournament can save highlight clips to a single destination folder.

Google Cloud needs two distinct redirect URIs: `/api/auth/google/callback` for normal FieldCast sign-in and `/api/integrations/google-drive/callback` for Drive linking. Do not point `GOOGLE_CALLBACK_URL` at the Drive callback.
