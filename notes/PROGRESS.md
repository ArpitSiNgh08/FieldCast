# PROGRESS

Pointer to the living status tracker: `PROGRESS.md`

## Current status (as of 2026-09-04)

### Done ✅
- [[Database — Prisma + Neon]] — migrations `0001`–`0014`, including viewer metrics, duplicate jersey support, penalty goals, pools, match stages, substitutions, default squads, and standings overrides
- [[Backend — Express + Socket.io]] — running on :4000 with no errors
- [[Frontend — Next.js]] — public tournament hub/bracket, stream/timeline, pooled standings, auth, admin correction/review, creator, and organiser pages running on :3000
- [[CI/CD — GitHub Actions]] — CI + deploy workflows written; production secrets and one complete green deploy still need verification
- [[HOW_TO_USE]] and repository Markdown — synchronized with current workflows
- Local IRL Pro RTMP → SRS → HLS verified at 1080p; SRT/UDP → SRS → HLS fallback also tested
- Neon production project is created and the existing Prisma schema is applied.
- [[Phase 1 — Oracle VM]] is running with Node.js, Docker/Compose, ffmpeg, SRS, and the `fieldcast-backend` systemd service. Local API and SRS API checks pass.
- Existing Vercel frontend deployment is live.
- Nginx HTTPS routes API, Socket.IO, and HLS through the DuckDNS hostname; Vercel targets that origin.
- Organiser camera destinations have SRT/RTMP QR transfer, and newly finalized matches sort into Recent matches by finalization activity.
- Mobile SRT destinations now expose separate server URL and Stream ID values for Moblin, with unique per-camera keys retained for switching.
- SRS mobile-ingest tuning uses 2-second latency and 8 MB send/receive buffers; the public `/help` page documents Android-only camera setup and streaming.
- Organisers can crop tournament logos to a square with zoom and optional background color; homepage tiles use a square display area. The app favicon is served from `frontend/public/favicon.ico`.

### Needs production verification ⚠️
- GitHub Actions production secrets and one successful migrate/backend/Vercel deployment
- Production migrations through `0014_add_penalty_to_football_events`
- Neon bootstrap credential rotation and secret replacement
- Removal of direct public `4000`, `8080`, and `1985` access after HTTPS verification
- Production end-to-end external-phone stream, two-device score sync, finalization, and Recent matches test
- Replacement of the temporary `SCORE_SYNC_DELAY_MS = 15_000` holdback with timestamp-based video synchronization
- Dependency upgrades for the 2026-08-26 production audit findings in Next.js, Socket.IO parser, and Prisma CLI tooling

### Not started ⬜
- [[ImageKit]] VOD integration (post-match upload + `replayUrl`)

## Next up
1. Verify GitHub production secrets, deployment jobs, and migrations through `0014`.
2. Rotate the exposed Neon credential and tighten public firewall rules.
3. Run the production phone → SRS → HTTPS viewer, two-device score, completion, and Recent matches test.
4. Upgrade audited dependencies and rerun build/API/streaming checks.
5. Replace fixed-delay score synchronization when SRS exposes usable timestamps, then implement ImageKit and non-Football live controls.

## 2026-08-12 update

- Detailed context: [[Tournament Submission]] and [[Tournament Organiser]].

- Tournament drafts, reusable players, admin approval/rejection, and approved-only public listings are implemented.
- Approved creators automatically become tournament organisers and can add co-organisers by account email.
- Football organisers can create matches, configure kickoff/venue and IRL Pro/Larix cameras with SRT or RTMP destinations, switch the active feed, and manage live scores/events.
- 2026-08-13: creatorless demo fixtures are hidden from the homepage; Go live now shows explicit blockers, and anonymous one-camera playback falls back directly to the raw SRS HLS feed.
- 2026-08-13: football events now use searchable registered players with jersey/team labels, regulation plus added-time minute, automatic goal scoring, and live full-scorecard refresh.
- 2026-08-13: the public match page now shows its football timeline below the stream and goal scorers with minutes beneath each team score; both refresh from live score updates.
- 2026-08-13: public standings now exclude creatorless seed tournaments and recompute from finalized results; washouts and organiser drag-and-drop Playing 11/bench management are implemented.
- 2026-08-13: fixed stale Prisma Client startup by generating before dev/start, reset existing squads to bench, and fixed squad-editor refresh so roster tiles cannot remain falsely empty.
- 2026-08-13: homepage tournament cards now open a public tournament hub containing teams, live matches, upcoming fixtures, past results, and standings.
- 2026-08-21: the root README was rewritten to reflect the complete implemented product, local streaming/setup workflow, migrations, troubleshooting, and current limitations.
- 2026-08-21: all repository-owned Markdown was audited; stale admin-created tournament, fixed camera key, Canvas overlay, old API route, and all-sport live-control descriptions were corrected.
- 2026-08-21: removed the legacy admin match-control surface and global-admin match bypass; only explicit tournament organisers can mutate live matches.
- 2026-08-21: organiser control devices receive score, active-camera, and completion updates through Socket.io, with serialized server-authoritative Football goals.
- 2026-08-21: `/admin` now handles completed-score and Football-event corrections plus persistent standings overrides; live match controls remain organiser-only.
- 2026-08-21: creator-defined pools, pool-scoped fixtures/tables, knockout stages, and a connected public bracket are implemented (`0008`–`0009`).
- 2026-08-21: substitutions now store player-off/player-on snapshots and update match-specific participation; default sport-sized starters are repaired/assigned by `0010`–`0011`.
- 2026-08-21: corrected the LAN ingest address, installed/configured ffmpeg 9, pinned SRS 6.0.184, and added per-camera IRL Pro SRT URLs on UDP `10080` alongside RTMP fallback.
- 2026-08-21: finalization now pushes `match:status` so viewer playback ends without reload; semifinal winners populate Final slots and live Final scores refresh automatically.
- 2026-08-21: standings recomputation is serialized with a PostgreSQL advisory lock; an eight-way concurrency test passes without duplicate rows.

## Related
- [[FieldCast]] — project hub
# 2026-09-04 update

- Added app-wide request/navigation loading indicators and organizer live-match event editing with goal-score synchronization.

- Camera switches now reinitialize public HLS playback automatically.
- Score states use HLS program-date-time when available, falling back to the configured delay.
- Football event timing is derived from the organiser-only server clock started with **Kick off**.
- Loading spinners were added to squad/team mutations and organiser loading screens.
- Started automatic two-minute Google Drive clipping in [[Clipping Feature Plan]]: rolling ffmpeg capture, persisted `ClipJob` records, organizer-only clip APIs, and an organizer button/status panel are implemented. Drive upload is configuration-gated until the service-account credentials, folder sharing, and migration `0015_clip_jobs` are deployed.
- The Obsidian graph context convention is documented in [[FieldCast]] and should be followed before future implementation tasks.
