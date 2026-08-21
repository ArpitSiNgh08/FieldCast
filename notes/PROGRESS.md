# PROGRESS

Pointer to the living status tracker: `PROGRESS.md`

## Current status (as of 2026-08-21)

### Done ✅
- [[Database — Prisma + Neon]] — migrations `0001`–`0011`, pools, match stages, substitutions, default squads, and standings overrides working locally
- [[Backend — Express + Socket.io]] — running on :4000 with no errors
- [[Frontend — Next.js]] — public tournament hub/bracket, stream/timeline, pooled standings, auth, admin correction/review, creator, and organiser pages running on :3000
- [[CI/CD — GitHub Actions]] — CI + deploy workflows written (secrets not yet added)
- [[HOW_TO_USE]] and repository Markdown — synchronized with current workflows
- Local IRL Pro RTMP → SRS → HLS verified at 1080p; SRT/UDP → SRS → HLS fallback also tested

### Not started ⬜
- Neon project provisioning (need `DATABASE_URL` from Neon dashboard)
- [[Phase 1 — Oracle VM]] provisioning (install Docker, deploy, run SRS)
- GitHub Actions secrets (see `PROGRESS.md` Note 4 for full list)
- Vercel deployment (`vercel link` in `frontend/`)
- Production end-to-end stream test on Oracle VM
- [[ImageKit]] VOD integration (post-match upload + `replayUrl`)

## Next up
1. Provision Neon and establish the branch-per-migration workflow.
2. Add GitHub Actions secrets.
3. Provision the Oracle VM and deploy SRS/backend.
4. Link/deploy the frontend on Vercel.
5. Run the production phone → SRS → viewer test.
6. Implement ImageKit recording/upload and complete Cricket/Basketball live controls.

## 2026-08-12 update

- Detailed context: [[Tournament Submission]] and [[Tournament Organiser]].

- Tournament drafts, reusable players, admin approval/rejection, and approved-only public listings are implemented.
- Approved creators automatically become tournament organisers and can add co-organisers by account email.
- Football organisers can create matches, complete broadcast preflight, register IRL Pro/Larix cameras with SRT or RTMP destinations, switch the active feed, and manage live scores/events.
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
