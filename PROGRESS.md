# PROGRESS.md

Living status tracker for FieldCast. Update this file whenever meaningful work happens — it's how the next session (human or agent) picks up context without re-reading every past conversation.

**Last updated:** 2026-08-13

---

## Status at a glance

| Area | Status |
|---|---|
| System architecture & Phase 1/2 split | ✅ Designed (`README.md`) |
| Governance docs (AGENTS/CLAUDE/RULES/DESIGN) | ✅ Drafted |
| Database schema design | ✅ Prisma schema + baseline migration in `prisma/migrations/0001_init/` |
| Prisma migration (backend) | ✅ Done — all 7 models + standings service rewritten to Prisma Client |
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
| Live match viewer `/matches/[id]` | ✅ Done — HLS.js + Socket.io ScoreOverlay |
| Scorecard page `/scorecard/[id]` | ✅ Done |
| Standings page `/standings` | ✅ Done |
| Admin panel `/admin` | ✅ Done |
| Email/password auth (JWT + bcrypt) | ✅ Done — signup/login plus env-backed admin account |
| Tournament creator workflow | ✅ Done — photo, sport-aware teams/rosters, reusable players, drafts + submission |
| Tournament moderation | ✅ Done — admin approval/rejection queue; public API returns approved only |
| Tournament organiser controls | ✅ Done — approval grants organiser role; scoped co-organisers, football fixtures, preflight, cameras and live scorecard |
| Auth callback page `/auth/callback` | ✅ Done |
| GitHub Actions CI workflow | ✅ Done — `.github/workflows/ci.yml` |
| GitHub Actions deploy workflow | ✅ Done — `.github/workflows/deploy.yml` (secrets needed before it runs) |
| ImageKit VOD integration | ⬜ Not started |
| End-to-end test stream (phone → SRS → viewer) | ⬜ Not started (needs real Oracle VM) |
| `HOW_TO_USE.md` user guide | ✅ Created — full guide: local setup, tournament creation, Larix streaming, score updates, troubleshooting |

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

Migration applied: `0001_init` ✅
Seed applied: sample teams, tournaments, matches, states, events ✅

### Note 3 — Local dev start commands

```powershell
# Backend (from backend/)
npm run dev          # starts on :4000

# Frontend (from frontend/)
npm run dev          # starts on :3000
```

No Docker needed for local dev. Native Postgres 18 runs automatically as a Windows service.

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

1. **Verify backend API works end-to-end** — open `http://localhost:4000/api/matches` and confirm JSON response with seeded data.
2. **Verify frontend renders** — open `http://localhost:3000` and confirm fixtures list loads from backend.
3. **Provision Neon project** — create project, get `DATABASE_URL`, run `npm run db:migrate:deploy`, run `npm run db:seed`. Add DATABASE_URL to GitHub Secrets.
4. **Set up GitHub repository secrets** — see Note 4 for full list.
5. **Provision Oracle Cloud VM** — install Docker, deploy repo, run `docker compose up -d` (only SRS in Docker on VM — Postgres will be Neon).
6. **Vercel deployment** — `vercel link` in `frontend/`, add env var `NEXT_PUBLIC_API_URL` pointing to Oracle VM.
7. **End-to-end stream test** — phones → RTMP → SRS → LL-HLS → frontend player.
8. **ImageKit VOD** — post-match recording upload flow → `replayUrl` in DB.

---

## Session log

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
