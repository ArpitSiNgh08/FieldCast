# PROGRESS.md

Living status tracker for FieldCast. Update this file whenever meaningful work happens — it's how the next session (human or agent) picks up context without re-reading every past conversation.

**Last updated:** 2026-08-21

---

## Status at a glance

| Area | Status |
|---|---|
| System architecture & Phase 1/2 split | ✅ Designed (`README.md`) |
| Governance docs (AGENTS/CLAUDE/RULES/DESIGN) | ✅ Drafted |
| Database schema design | ✅ Prisma schema + migrations `0001`–`0011` |
| Prisma migration (backend) | ✅ Current through `0011` — pools, match stages, organisers, cameras, roster/substitution events, washouts, squads, and admin overrides applied locally |
| Prisma seed script | ✅ Done — `prisma/seed.js` runs cleanly with pg adapter |
| Local Postgres (dev) | ✅ Native Windows PostgreSQL 18 running on port 5432 |
| `fieldcast` DB user + database | ✅ Created in native Postgres — migration + seed applied |
| `prisma.config.js` (Prisma 7 config) | ✅ CJS format — reads DATABASE_URL via fs, uses `datasource.url` |
| Backend running locally | ✅ `npm run dev` starts on port 4000, connects to DB, no errors |
| Neon project + branching setup | ⬜ Not started — needs DATABASE_URL from Neon dashboard |
| Oracle Cloud Free Tier VM provisioning | ⬜ Not started |
| SRS + Docker setup on VM | ⬜ Not started (docker-compose.yml + infra/srs.conf exist locally) |
| ffmpeg camera-switcher (Node.js) | ✅ Implemented (`backend/src/services/cameraSwitcher.js`) |
| Backend (Express + Socket.io) scaffolding | ✅ Done |
| Next.js frontend scaffolding | ✅ Done |
| UI theme (DESIGN.md compliance) | ✅ Fixed — light theme, Geist + Inter fonts |
| Homepage (fixtures list) | ✅ Done |
| Public tournament hub `/tournaments/[id]` | ✅ Done — teams, live/upcoming/past matches, and standings |
| Live match viewer `/matches/[id]` | ✅ Done — HLS.js + Socket.io ScoreOverlay |
| Scorecard page `/scorecard/[id]` | ✅ Done |
| Standings page `/standings` | ✅ Done |
| Admin panel `/admin` | ✅ Historical completed-match/event corrections and persistent standings overrides; no live controls |
| Email/password auth (JWT + bcrypt) | ✅ Done — signup/login plus env-backed admin account |
| Tournament creator workflow | ✅ Done — photo, sport-aware teams/rosters, reusable players, drafts + submission |
| Tournament moderation | ✅ Done — admin approval/rejection queue; public API returns approved only |
| Tournament organiser controls | ✅ Done — approval grants organiser role; scoped co-organisers, football fixtures, preflight, cameras and live scorecard |
| Playing 11 / bench | ✅ Done — default sport-sized starters, persisted drag-and-drop lineup, and match-specific substitutions |
| Match outcomes and standings | ✅ Done — pool/knockout stages, played/draw/washout finalization, pool tables, brackets, and recomputation |
| Auth callback page `/auth/callback` | ✅ Done |
| GitHub Actions CI workflow | ✅ Done — `.github/workflows/ci.yml` |
| GitHub Actions deploy workflow | ✅ Done — `.github/workflows/deploy.yml` (secrets needed before it runs) |
| ImageKit VOD integration | ⬜ Not started |
| Local stream test (phone → SRS → viewer) | ✅ IRL Pro RTMP verified at 1080p; SRT fallback and camera-specific HLS tested |
| IRL Pro ingest | ✅ RTMP verified at 1080p; SRT/UDP fallback implemented and tested end-to-end through HLS |
| Production end-to-end stream | ⬜ Not started (needs Oracle VM deployment) |
| Markdown documentation | ✅ Synchronized 2026-08-21 — README, operational guide, progress, and Obsidian context |

Legend: ✅ done · 🔄 in progress · ⬜ not started · 🚫 blocked · ⚠️ attention needed

---

## Notes

### Note 1 — Prisma 7 final working setup

After extensive debugging, here is what actually works in Prisma 7.8.0:

**Config file:** `prisma.config.js` (CommonJS, NOT TypeScript)
- TypeScript config (jiti runner) cannot load dotenv before `defineConfig` is evaluated — always returns undefined URL
- CJS config uses `fs.readFileSync` to parse `.env` synchronously before `defineConfig` runs
- Correct field is `datasource.url` (not `migrate.connectionString`)

**App client:** `src/config/prisma.js` singleton
- Uses `@prisma/adapter-pg` — the ONLY way to pass a connection URL to PrismaClient in Prisma 7
- `datasources` and `datasourceUrl` constructor options were both removed in Prisma 7

**Seed script:** `prisma/seed.js`
- Must also create its own `Pool` + `PrismaPg` adapter before constructing `PrismaClient`
- Must call `pool.end()` in the finally block or the process hangs

### Note 2 — Local dev environment (Windows)

Port 5432 is owned by **native Windows PostgreSQL 18** (service: `postgresql-x64-18`).
Docker's `fieldcast-postgres` container cannot bind port 5432 — the native Postgres wins.

**Do NOT use Docker for local Postgres.** Use native Windows PG 18 directly.

Credentials created (one-time setup, already done):
```sql
-- Run as postgres superuser (password: Postgres18)
CREATE USER fieldcast WITH PASSWORD 'fieldcast';
CREATE DATABASE fieldcast OWNER fieldcast;
GRANT ALL PRIVILEGES ON DATABASE fieldcast TO fieldcast;
```

Migrations applied locally: `0001_init` through `0011_default_starting_squads` ✅
Seed applied: sample teams, tournaments, matches, states, events ✅

### Note 3 — Local dev start commands

```powershell
# Backend (from backend/)
npm run dev          # starts on :4000

# Frontend (from frontend/)
npm run dev          # starts on :3000
```

No Docker is needed for database and app-only development. Native Postgres 18 runs automatically as a Windows service; local video streaming still requires the SRS Docker service.

### Note 4 — GitHub Actions secrets needed before deploy works

`.github/workflows/deploy.yml` requires these GitHub repository secrets:
- `DATABASE_URL` — Neon connection string
- `VM_HOST` — Oracle VM public IP
- `VM_USER` — SSH username (usually `ubuntu` or `opc`)
- `VM_SSH_KEY` — private SSH key (no passphrase)
- `VERCEL_TOKEN` — Vercel personal access token
- `VERCEL_ORG_ID` — from `vercel whoami`
- `VERCEL_PROJECT_ID` — from `.vercel/project.json` after first `vercel link`

### Note 5 — UI components

The UI primitives (`Badge`, `Button`, `Card`, `Navbar`, etc.) were custom-built before the Untitled UI MCP was adopted. They are acceptable as-is; replacing them is low priority.

---

## Decisions locked

- **Deployment (Phase 1):** Oracle Cloud Free Tier VM (SRS + backend), Vercel (frontend), Neon (DB), ImageKit (VOD). No AWS in Phase 1.
- **Deployment (Phase 2):** AWS EC2 replaces Oracle VM; S3 archival layer added.
- **ORM:** Prisma 7 (fully implemented, adapter-based).
- **Database:** Neon (production) / Native Windows PG 18 (local dev).
- **Migrations:** `prisma migrate deploy` in GitHub Actions on merge to main. Never hand-run against prod.
- **Camera switching:** Node.js-managed ffmpeg child processes.
- **UI component sourcing:** Untitled UI MCP → Magic UI/shadcn → custom-built.
- **Fonts:** Geist + Inter only. **Theme:** light only.
- **VOD:** local disk → ImageKit → delete local copy (Phase 1).

---

## Next up

1. **Provision Neon** — create the project and establish the branch-per-migration workflow.
2. **Configure GitHub repository secrets** — see Note 4.
3. **Provision Oracle Cloud VM** — install Docker, deploy SRS/backend, and open the required ports.
4. **Deploy the frontend** — link the Vercel project and configure API/Socket.io URLs.
5. **Run the production stream test** — phone → RTMP → SRS → HLS → public FieldCast page.
6. **Implement ImageKit VOD** — recording, confirmed upload, `replayUrl`, and safe local cleanup.
7. **Complete Cricket/Basketball organiser controls** — live event entry and sport-specific finalization.
8. **Add automated coverage** — standings, washouts, lineup authorization, and Socket.io scoring.

---

## Session log

- **2026-08-21** — Default starting squads.
  - Newly registered players fill the sport-sized starting squad first (Football/Cricket 11, Basketball 5); later players begin on the bench.
  - Added and locally applied migration `0011_default_starting_squads` to repair teams that had no saved starters.
- **2026-08-21** — Live football substitutions.
  - Added separate player-off and player-on controls using the match’s current active players and same-team substitutes.
  - Persisted both substitution players and jersey snapshots, displayed them in organiser/public timelines, and made incoming players eligible for later match events.
  - Added and locally applied migration `0010_substitution_players`; Prisma validation/generation, TypeScript, targeted lint, backend syntax, migration status, and scorecard API checks pass.
- **2026-08-21** — Streaming reliability and live bracket updates.
  - Installed/configured ffmpeg 9, corrected the LAN ingest host, pinned stable SRS 6.0.184, and added SRT `:10080/UDP` contribution URLs as the recommended IRL Pro fallback while retaining RTMP.
  - Verified live IRL Pro RTMP at 1920×1080 H.264/AAC and tested SRT → SRS → HLS end-to-end with an HTTP 200 playlist.
  - Match status now broadcasts to viewer rooms, so finalization stops the public player without reload even while the phone continues publishing.
  - Semifinal winners populate Final placeholders and live Final scores/status refresh automatically in public brackets.
  - Serialized standings replacement with a PostgreSQL advisory lock; eight simultaneous recomputations pass without `P2002` duplicates or concurrent pg queries.
- **2026-08-21** — Simplified public standings.
  - Replaced separate F/A/Diff columns with football GD and changed every win to three points.
  - Verified tournament 4 recomputation: two wins now produce six points.
- **2026-08-21** — Pool and knockout fixture stages.
  - Removed the unused League/Knockout format question from tournament creation.
  - Match creation now requires either a pool assignment or a knockout stage; Semi-final and Final are built in and organisers can enter other knockout rounds.
  - Pool team selectors are restricted to teams assigned to that pool, and knockout results no longer alter pool standings.
  - Added migration `0009_match_stages`; Prisma validation/generation, backend syntax checks, TypeScript, and targeted frontend lint pass.
  - Added a responsive public knockout bracket that dynamically groups custom rounds, draws feeder connections, labels SF 1/SF 2, and creates a Final placeholder until the final fixture exists. Verified visually with both two-round and three-round brackets.
- **2026-08-21** — Tournament pools and pool standings.
  - Added optional creator-defined pools during tournament creation, plus the ability to add further pools to an editable draft.
  - Team creation now requires a pool choice when pools exist, and draft teams can be moved between pools.
  - Public tournament and global standings pages render a separate ranked table for each pool.
  - Added migration `0008_tournament_pools`; Prisma validation, TypeScript, and targeted frontend lint pass. The production bundle compiles, but the repository’s existing `/_global-error` prerender failure still prevents `next build` from exiting cleanly.
- **2026-08-21** — README synchronized with the implemented product.
  - Replaced the architecture-only overview with current roles, tournament workflow, public tournament hub, organiser controls, Football streaming/scoring, washouts, squads, standings, routes, migrations, local setup, and troubleshooting.
  - Preserved the Phase 1/Phase 2 deployment decisions and documented the remaining Cricket/Basketball, ImageKit, production deployment, and test-coverage gaps.
- **2026-08-21** — Repository Markdown audit.
  - Rewrote `HOW_TO_USE.md` for the current creator → review → organiser workflow, generated Larix camera keys, Playing 11, Football scoring, washouts, standings, and public tournament pages.
  - Updated Obsidian architecture/operations notes and agent context; removed stale Canvas, fixed `camera1`, old admin workflow, old API-route, and all-sport live-control claims.
- **2026-08-21** — Organiser-only live match control.
  - Removed legacy admin match controls and automatic admin match authorization. Match mutations now require explicit tournament-organiser membership.
  - Organiser control devices now share live score and camera state through Socket.io; Football score events are serialized and stale non-goal submissions cannot roll scores backward.
  - Restored `/admin` as a historical-corrections workspace. Admin-only APIs can correct completed scores and Football events, and migration `0007_admin_corrections` adds standings overrides that survive automatic recomputation.

- **2026-08-12** — Tournament submission and moderation workflow.
  - Added bcrypt credential signup/login while retaining JWT bearer auth and Google OAuth compatibility.
  - Added an env-backed admin account (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`) bootstrapped on backend startup.
  - Added tournament ownership, image/placeholder support, draft/submitted/approved/rejected states, rejection feedback, and admin review metadata.
  - Added tournament-team membership plus reusable `Player` records and per-team jersey/position membership.
  - Enforced submit-time roster rules: cricket 11–15, football 11–23, basketball 5–15 players per team; minimum two teams.
  - Added homepage tournament CTA/cards, `/tournaments`, `/tournaments/new`, draft editor, `/auth`, and `/admin/tournaments`.
  - Public tournament and fixture feeds now expose approved tournaments only.
  - Applied local migration `0002_tournament_workflow`; Prisma generation, backend API smoke test, TypeScript, and production frontend build pass.
- **2026-08-12** — Organiser and football broadcast operations.
  - Added tournament-scoped organiser memberships; the creator is automatically added when an admin approves the tournament.
  - Organisers can add other existing FieldCast accounts by email without granting global admin access.
  - Added `/organizer` for choosing approved tournaments, viewing fixtures, adding organisers, and creating football matches.
  - Added `/organizer/matches/[id]` for kickoff/venue setup, unique Larix camera ingest URLs, broadcast preflight, starting/ending matches, active-feed switching, live scores, and football events.
  - Applied migration `0003_organizer_broadcast`; organiser authorization is enforced across REST and Socket.io score/camera mutations.
  - Organizer API smoke test and production frontend build pass; temporary smoke-test records were removed afterward.
- **2026-08-13** — Public live launch and local single-camera playback.
  - Removed legacy creatorless seed fixtures from the public/homepage match feed without deleting historical local rows.
  - Replaced the ambiguous disabled `Preflight N/5` control with a prominent Go live panel listing every remaining blocker.
  - Homepage match data is uncached so an organiser-started match appears in Live now immediately.
  - Public `/matches/[id]` shows the anonymous HLS player, live Socket.io score overlay, venue, and full-stats link.
  - Single-camera matches use the camera's raw SRS HLS manifest directly; `active_<matchId>` remains the stable URL for multi-camera switching.
  - Match 8 raw HLS manifest verified HTTP 200; lint, TypeScript, production build, and visual local-page checks pass.
- **2026-08-13** — Roster-backed football scorecard events.
  - Replaced free-text football player entry with a searchable match-roster picker formatted as jersey, player, and team short name.
  - Unified event and score updates under **Update scorecard**; events save automatically and Socket.io pushes the new state to viewers.
  - Goal events increment the selected player's team score on the backend to avoid client race conditions.
  - Added regulation minute plus added-time minute (`45+2'`) and persisted player ID/jersey snapshots on football events.
  - Public full scorecard refreshes on `score:updated` and displays jersey plus added time in the event timeline.
  - Applied migration `0004_football_roster_events`; roster/event smoke test, lint, TypeScript, and production build pass.

- **2026-08-13** — Public football broadcast score graphic.
  - Added the saved football event timeline directly below the stream on `/matches/[id]`.
  - The compact live scoreboard groups goal scorers beneath the correct team score and displays regulation plus extra-time minutes.
  - Public goal summaries and the timeline refresh when the organiser publishes a score update.

- **2026-08-13** — Result-aware standings, washouts, and squads.
  - Removed creatorless seed tournaments from public standings and made standings recompute from finalized real match results.
  - Added explicit played/washout match outcomes; normal stream ending finalizes the score, while washouts do not affect table totals.
  - Added washout actions during fixture creation, before broadcast launch, and while live.
  - Added organiser drag-and-drop Playing 11/bench editing and restricted football event selection to the saved Playing 11.
  - Applied migration `0005_washouts_and_squads`.
  - Follow-up: added automatic Prisma generation before backend dev/start and migration `0006_reset_existing_squads_to_bench`; all existing players now start as draggable bench tiles until an organiser saves the Playing 11.

- **2026-07-09** — Architecture decisions finalized. Governance docs drafted.
- **2026-07-14** — Full frontend implementation.
  - Fixed dark theme (DESIGN.md violation). Light theme implemented.
  - Built all pages: homepage, `/matches/[id]`, `/scorecard/[id]`, `/standings`, `/admin`, `/auth/callback`.
  - New components: `HlsPlayer.tsx`, `ScoreOverlay.tsx`.
  - Frontend HTTP 200 on all routes.
- **2026-07-21** — Backend Prisma migration + CI/CD.
  - All 7 model files + standings service rewritten to Prisma Client.
  - `prisma/migrations/0001_init/migration.sql` baseline migration created.
  - `prisma/seed.js` created. GitHub Actions CI + deploy workflows added.
  - **Stopped before deployment** — external services not yet provisioned.
- **2026-07-22 (session 2)** — Documentation & guide update.
  - Updated `RULES.md`: added Prisma 7 adapter rule (rule 7) and Windows local dev rule (rule 15).
  - Updated `README.md`: Prisma 7 note in ORM section, new Local Development section.
  - Updated `frontend/AGENTS.md`: added Prisma 7 adapter and local dev bullet points.
  - Updated `frontend/CLAUDE.md`: added Do/Don't entries for Prisma 7 and Windows Postgres.
  - Created `HOW_TO_USE.md`: full end-user guide covering local setup, tournament creation, Larix Broadcaster streaming, per-sport score updates, match conclusion, VOD upload, and troubleshooting.
  - Fixed `PrismaClientConstructorValidationError` — Prisma 7 requires pg driver adapter.
  - Installed `@prisma/adapter-pg` + `pg`. Rewrote `src/config/prisma.js` singleton.
  - Debugged `prisma.config.ts` — TypeScript jiti runner can't load env vars before `defineConfig`. Switched to `prisma.config.js` (CommonJS + `fs.readFileSync`).
  - Discovered correct Prisma 7 config field: `datasource.url` (not `migrate.connectionString`).
  - Discovered native Windows PostgreSQL 18 was blocking port 5432 (Docker container unreachable from host).
  - Created `fieldcast` user/DB in native Postgres 18 (password: `Postgres18`).
  - `prisma migrate deploy` → `0001_init` applied ✅
  - Fixed `prisma/seed.js` to use pg adapter (same pattern as singleton).
  - `prisma db seed` → all sample data loaded ✅
  - **Backend fully running locally** — `npm run dev` on :4000, no errors.
