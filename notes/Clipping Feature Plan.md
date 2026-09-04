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

## Current status (2026-09-04)

Phase 1 and the initial Phase 2 foundation are now implemented: migration `0015_clip_jobs`, a match-scoped rolling ffmpeg recorder, background clip assembly, organizer-only clip APIs, and a live organizer button with status polling. Google Drive upload is backend-only and remains disabled until `CLIPS_ENABLED` plus the service-account/folder environment values are configured. Retry notifications, retention cleanup, camera-cut policy, and production observability remain follow-up work.
