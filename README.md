# FieldCast

FieldCast is a mobile-first live sports platform for college tournaments. Organisers can create and submit tournaments, prepare teams and squads, stream matches from phones, manage cameras and Football score events, and publish live fixtures, scorecards, timelines, standings, and results to everyone—including visitors who are not logged in.

The current implementation supports tournament management for Cricket, Football, and Basketball, with the complete broadcast-control and event workflow currently built for Football.

## Current status

Implemented locally as of September 2026:

- Credential signup/login using bcrypt password hashes and JWT bearer tokens.
- Optional Google OAuth login and an environment-backed administrator account.
- Tournament drafts, reusable players, teams, sport-aware roster limits, submission, review, approval, and rejection feedback.
- Approved tournament creators automatically become organisers and can invite additional organisers by account email.
- A public homepage containing approved tournaments and real approved-tournament fixtures; legacy creatorless fixtures are excluded.
- Public tournament hubs with teams, live matches, upcoming matches, past matches, pool-aware standings, and a connected knockout bracket.
- Football match creation, mobile-camera ingest destinations, going live, active-camera switching, score events, and broadcast completion.
- On-demand mobile SRT and RTMP QR codes for transferring ingest destinations directly to Android/iPhone streaming apps.
- Camera ingest destinations remain available through the backend, while the organizer UI currently keeps the Moblin-specific fields hidden.
- Tournament-logo editor with square crop, zoom, and an optional solid background for transparent images.
- Searchable Football event entry using the match's current active players, with jersey number and team abbreviation; goals can be marked as penalties.
- Goal (including penalty), card, and substitution events with regulation and extra-time minutes.
- Automatic goal scoring and immediate live Socket.io updates.
- A public HLS match page with stream, compact live score graphic, goal scorers, match timeline, live watcher count, and anonymous unique-viewer total.
- Detailed scorecards that refresh after live score updates.
- Result-aware standings that recompute after completed matches.
- Recent matches ranked by finalization activity so a match appears promptly after the organiser ends it.
- Explicit washouts that stop a stream without affecting standings.
- Drag-and-drop Playing 11 and bench management. The first sport-sized group of registered players becomes the default starting squad; additional players begin on the bench and organisers can adjust the lineup.

Database migrations `0001` through `0015` are included. Migration `0012_match_viewers` adds anonymous per-match unique viewer counts; `0013` allows duplicate jersey numbers within a team, `0014` adds penalty-goal metadata, and `0015` adds persisted clip jobs.

## Roles and workflow

### Viewer

A viewer does not need an account to browse approved tournaments, watch live matches, and view live scores, goal scorers, event timelines, scorecards, and standings.

### Tournament creator

An authenticated user can:

1. Create a tournament draft.
2. Add details, optional pools, and an optional image. A placeholder is used when no image is supplied.
3. Add teams.
4. Create new reusable players or select existing players.
5. Assign jersey numbers and positions.
6. Keep the tournament as a draft or submit it for administrator review.

Roster rules are validated by sport:

| Sport | Teams | Players per team |
|---|---:|---:|
| Cricket | 2–16 | 11–15 |
| Football | 2–32 | 11–23 |
| Basketball | 2–32 | 5–15 |

### Administrator

An administrator reviews submitted tournaments and approves or rejects them. Rejections require a reason. Approval automatically assigns the creator as the tournament’s first organiser.

### Organiser

For an approved tournament, an organiser can:

- Add other organisers who already have a FieldCast account.
- Drag players between the Playing 11 and bench and save the lineup.
- Create pool-stage or knockout Football fixtures, including custom knockout round names, or create a fixture directly as a washout.
- Declare a washout before a broadcast starts.
- Configure kickoff, venue, and cameras, then scan or copy the generated SRT/RTMP destination.
- Start the match and make it visible on the public homepage.
- Switch the active camera during a multi-camera broadcast.
- Record Football events for currently active players, including player-off/player-on substitutions that update the match-specific active squad.
- End and finalize a match, deriving its result from the final score and recomputing standings.
- End a live stream as a washout without changing played, wins, draws, losses, score difference, or points.

## Application routes

| Route | Purpose |
|---|---|
| `/` | Approved tournaments plus live, upcoming, and recent matches |
| `/tournaments/[id]` | Public tournament hub with teams, fixtures, results, and standings |
| `/matches/[id]` | Public stream, live score graphic, goal scorers, and Football timeline |
| `/help` | Public setup guide for tournaments, Android cameras, streaming, switching, and support |
| `/scorecard/[id]` | Detailed sport-specific scorecard |
| `/standings` | Standings for active approved tournaments |
| `/standings?tournament=[id]` | Standings filtered to one tournament |
| `/auth` | Credential login and signup |
| `/auth/callback` | Google OAuth return page |
| `/tournaments` | Current user’s drafts and submissions |
| `/tournaments/new` | Create a tournament draft |
| `/tournaments/[id]/edit` | Edit an eligible draft or rejected tournament |
| `/organizer` | Approved-tournament organiser workspace and squad editor |
| `/organizer/matches/[id]` | Football broadcast setup, cameras, scoring, halftime, and completion |
| `/admin` | Administrator workspace for completed-match and standings corrections |
| `/admin/tournaments` | Administrator tournament review queue |

## Architecture

```text
Phone cameras (Android/iPhone broadcaster with SRT or RTMP support)
            |
            | RTMP :1935 or SRT :10080/UDP
            v
       SRS media server <---- ffmpeg camera switcher
            |
            | HLS / LL-HLS
            v
      Next.js viewer pages

Organiser browser ---- REST + Socket.io ---- Express API ---- Prisma ---- PostgreSQL
Viewer browser    <------- live updates ---------+
```

### Technology stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, hls.js.
- Backend: Node.js, Express, Socket.io.
- Authentication: JWT, bcrypt, Passport Google OAuth.
- Database: PostgreSQL with Prisma 7 and `@prisma/adapter-pg`.
- Mobile ingest: SRT from Android/iPhone apps such as Moblin or IRL Pro, with RTMP fallback where supported.
- Media server: SRS 6.0.184, converting SRT contribution into the same live source used by HLS and switching.
- Camera switching: ffmpeg child processes controlled by the backend.
- Playback: HLS/LL-HLS through hls.js.
- Planned replay delivery: ImageKit.

## Repository layout

```text
FieldCast/
├── backend/                 Express, Socket.io, Prisma, streaming control
│   ├── prisma/
│   │   ├── migrations/      Versioned migrations 0001–0014
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
├── frontend/                Next.js application
│   └── src/
│       ├── app/             Route pages
│       ├── components/      Stream, score, tournament, and squad UI
│       ├── hooks/           Auth and Socket.io state
│       └── lib/             API client and shared types
├── notes/                   Obsidian project memory
├── docker-compose.yml       Local/VM service definitions
├── HOW_TO_USE.md            End-user and local-operation guide
├── DESIGN.md                UI rules
├── RULES.md                 Project constraints
└── PROGRESS.md              Implementation history and next steps
```

## Local development

### Prerequisites

- Node.js 22 or a compatible current release.
- npm.
- PostgreSQL. Local Windows development currently uses native PostgreSQL 18 on port `5432`.
- Docker Desktop when running SRS locally.
- ffmpeg on `PATH`, or an absolute `FFMPEG_PATH`, for real multi-camera switching. It is not required when `SIMULATE_STREAM=true`.

### 1. Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
```

Set at least these values in `backend/.env`:

```dotenv
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgres://fieldcast:fieldcast@localhost:5432/fieldcast
JWT_SECRET=replace-with-a-long-random-secret
SESSION_SECRET=replace-with-another-long-random-secret
ADMIN_EMAIL=admin@fieldcast.local
ADMIN_PASSWORD=replace-with-a-secure-password
ADMIN_NAME=FieldCast Admin
SIMULATE_STREAM=true
# Optional organizer clip capture / Google Drive upload
CLIPS_ENABLED=false
# GOOGLE_DRIVE_FOLDER_ID=your-drive-folder-id
# GOOGLE_DRIVE_CLIENT_EMAIL=clip-uploader@your-project.iam.gserviceaccount.com
# GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Google OAuth is optional. Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` empty to use credential login only.

### 2. Prepare the database

```powershell
cd backend
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
```

Prisma Client is generated automatically before `npm run dev` and `npm start`. This prevents a migrated schema from being queried by a stale runtime client, which can otherwise cause errors such as `Unknown argument resultType`.

### 3. Start one backend instance

```powershell
cd backend
npm run dev
```

The API runs at `http://localhost:4000`. Keep only one backend/nodemon instance running; multiple instances cause `EADDRINUSE` on port `4000`.

Health check: `http://localhost:4000/api/health`

### 4. Start the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The application runs at `http://localhost:3000`.

The frontend defaults to these service bases:

- API host: `http://localhost:4000` (the client appends `/api`)
- Socket.io: `http://localhost:4000`

Override them with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` when required.

## Local mobile streaming

For a real phone-to-browser test:

1. Start SRS and confirm its RTMP, SRT, HLS, and API ports are available.
2. Set `SIMULATE_STREAM=false`.
3. Set `RTMP_HOST` to an address reachable from the phone—not `localhost` unless the broadcaster runs on that machine. This host is used in both generated RTMP and SRT URLs.
4. Set `SRS_HLS_BASE` to an address reachable from viewer browsers.
5. Open the organiser match page and add a camera.
6. Use the displayed IRL Pro SRT destination or RTMP fallback. Mobile/Moblin SRT controls are temporarily hidden from the organizer camera card.
7. Use **Show QR** beside the generated SRT or RTMP destination when the app supports importing a full URL. Each camera has its own generated key; use the matching camera card.
8. Use H.264, 1080p at 30 fps, 4–6 Mbps, AAC audio, and a two-second keyframe interval.
9. Start publishing from the phone and press **Go live**. Kickoff, venue, and at least one camera are the required setup fields; there is no separate checklist gate.

Single-camera local broadcasts play that camera’s SRS HLS manifest directly. Multi-camera broadcasts use a stable `active_[matchId]` output produced by the ffmpeg switcher.

| Service | Default endpoint |
|---|---|
| RTMP ingest | `rtmp://HOST:1935/live/STREAM_KEY` |
| SRT ingest | URL: `srt://HOST:10080`; Stream ID: `#!::r=live/STREAM_KEY,m=publish` |
| HLS playback | `http://HOST:8080/live/STREAM_KEY.m3u8` |
| SRS API | `http://HOST:1985/api/v1/streams` |

## Football live scoring

- The first 11 registered Football players form the default Playing 11; the organiser can change and save it before the match.
- Player search supports name, jersey number, and team abbreviation.
- Picker labels use `#jersey · Player Name · TEAM`.
- Events include goal, yellow card, red card, and substitution. Substitutions capture both the player leaving and the player entering.
- Minute and extra-time minute are stored, such as `30+2'`.
- The half is derived automatically: minutes up to 30 are first half, and minutes above 30 are second half. **Mark halftime** publishes the halftime state, while **End stream & finalize** publishes full time.
- Goals increment the selected player’s team score on the backend to avoid client-side races.
- **Update scorecard** persists the event and broadcasts the new state over Socket.io immediately. Public score rendering waits for the matching HLS program timestamp when available, with a 15-second fallback for manifests without timing metadata.
- The public match page shows goal scorers below the correct team score and its event timeline below the stream.
- Public score display uses HLS program-date-time alignment in `frontend/src/hooks/useMatchState.ts`, falling back to `SCORE_SYNC_DELAY_MS = 15_000` when timing metadata is unavailable. Football event/timeline updates are delivered only when their timestamp reaches the viewer’s stream.
- Production realtime score delivery requires `NEXT_PUBLIC_SOCKET_URL` on Vercel to be the same HTTPS origin that proxies `/socket.io` to the backend. `NEXT_PUBLIC_API_URL` must point to that origin for REST requests.

## Standings and outcomes

Standings are recomputed from completed pool-stage and legacy matches belonging to approved, user-created tournaments. Knockout results are excluded from pool tables.

- Wins award three points.
- Pooled tournaments render a separate table per pool.
- Knockout fixtures appear in a connected, stage-aware bracket on the tournament hub and standings page. Completed semifinal winners populate the Final slots before a Final fixture exists, and live Final scores refresh without a page reload.
- Draws award one point to each team.
- Football tables show goal difference (GD); goals for and against remain internal inputs to that calculation.
- Normal completion sets `resultType=played`, derives the winner from the final score, and recomputes the table.
- A washout sets `resultType=washout` and is excluded from played and points calculations.
- All tournament teams appear even before their first completed result.

## Authentication and authorization

- Passwords are hashed with bcrypt and are never stored in plain text.
- Successful login returns a JWT used by protected REST routes and the Socket.io handshake.
- Public tournament, match, scorecard, and standings reads require no authentication.
- Tournament draft edits require creator/admin access.
- Tournament review requires the administrator role.
- Live match, camera, score, lineup, result, and organiser mutations require explicit membership in that tournament's organiser list. A global administrator has no automatic live-match control permission.
- Administrators have separate correction endpoints for completed-match scores and Football events, plus persistent standings overrides. Those endpoints reject live and upcoming matches.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` bootstrap the administrator on startup.

All organiser control screens for a match join the same Socket.io room. Score, active-camera, and match-status changes are persisted and pushed to other organisers and viewers. Finalization immediately removes the live player and shows the ended state even if a phone continues publishing. Football goals are serialized per match and calculated from the latest stored score; non-goal events cannot overwrite a newer score from a stale device.

Standings recomputation uses a tournament-scoped PostgreSQL advisory lock and a sequential bulk replacement transaction. Concurrent finalization/correction requests therefore cannot insert duplicate `(tournament_id, team_id)` rows.

## Database model and migrations

The schema uses a sport-agnostic core with sport-specific history:

- `User`: identity, credentials, and global role.
- `Tournament`: draft/review lifecycle and public metadata.
- `TournamentOrganizer`: tournament-scoped organiser permissions.
- `Team` and `TournamentTeam`: reusable teams and tournament membership, including optional pool assignment.
- `TournamentPool`: ordered, tournament-scoped pools such as Pool A, Pool B, and further creator-defined pools.
- `Player` and `TeamPlayer`: reusable players plus jersey, position, and Playing/bench role. Jersey numbers may be duplicated within a team; the same player may still be added only once to a team.
- `Match`: fixture, pool/knockout stage, stream configuration, status, winner, and `pending`/`played`/`washout` result type.
- `MatchCamera`: per-phone ingest configuration.
- `MatchView`: one anonymous browser identifier per match for unique-viewer totals.
- `MatchState`: fast live score and period state.
- `FootballEvent`, `CricketEvent`, and `BasketballQuarter`: detailed sport history.
- `Standing`: tournament table generated from finalized results.

| Migration | Purpose |
|---|---|
| `0001_init` | Initial users, teams, matches, state, events, and standings |
| `0002_tournament_workflow` | Ownership, drafts/review, reusable players, and authentication workflow |
| `0003_organizer_broadcast` | Tournament organisers, broadcast setup, and cameras |
| `0004_football_roster_events` | Roster-linked Football events, jersey snapshots, and extra time |
| `0005_washouts_and_squads` | Match result types and Playing/bench squad roles |
| `0006_reset_existing_squads_to_bench` | Reset rosters so organisers explicitly select the Playing 11 |
| `0007_admin_corrections` | Persistent standings overrides for historical admin corrections |
| `0008_tournament_pools` | Tournament pools and per-team pool assignment |
| `0009_match_stages` | Pool/knockout fixture classification and custom knockout stage labels |
| `0010_substitution_players` | Explicit players-off/players-on snapshots for football substitutions |
| `0011_default_starting_squads` | Promote the first sport-sized roster when a team has no saved starting lineup |
| `0012_match_viewers` | Persist anonymous per-match unique-browser viewer counts |
| `0013_allow_duplicate_team_jersey_numbers` | Remove the team/jersey uniqueness constraint |
| `0014_add_penalty_to_football_events` | Store whether a Football goal was scored as a penalty |

Prisma 7 requires the PostgreSQL driver adapter. Reuse `backend/src/config/prisma.js`; do not instantiate a bare `PrismaClient` or pass removed `datasourceUrl`/`datasources` options.

## API groups

- `/api/auth`: register, login, Google OAuth, current user, and auth status.
- `/api/tournaments`: public tournaments, drafts, review, teams, reusable players, lineups, organisers, submission, and standings.
- `/api/matches`: public fixtures, scorecards, match creation, broadcast setup, cameras, status, and results.
- `/api/teams`: public team reads and administrator creation.
- `/api/streams`: administrator stream/SRS health.

`GET /api/streams/livestream` reports the optional shared SRS `livestream` feed for diagnostics. It is intended for one active feed only; match cameras use unique generated keys so camera switching remains reliable.

Durable data uses REST. Time-sensitive score and camera changes use Socket.io match rooms.

## Troubleshooting

### `Unknown argument resultType`

The running backend has an old generated Prisma Client:

1. Stop every backend/nodemon instance.
2. Run `npm run db:migrate:deploy` in `backend/`.
3. Run `npm run db:generate`.
4. Start exactly one backend with `npm run dev`.

### `EADDRINUSE :::4000`

Another process owns port `4000`. Do not start a second nodemon terminal. On Windows:

```powershell
netstat -ano | Select-String ':4000\s+.*LISTENING'
```

Stop only the confirmed FieldCast backend process tree, then start one instance.

### SRS reports a publisher but video does not move

An active stream can still have zero recent frames or bitrate. Confirm the phone can reach RTMP `:1935` or SRT `:10080/UDP`, and confirm the matching camera-specific HLS manifest is updating. For Moblin, enter the server URL and Stream ID in their separate fields; do not paste the encoded full URL into the Stream ID field. Use H.264 video and AAC audio. The shared `livestream` ID is only for a single diagnostic feed and cannot distinguish two phones.

### `spawn ffmpeg ENOENT`

Install ffmpeg and either restart the backend with `ffmpeg` available on `PATH`, or set `FFMPEG_PATH` to the absolute `ffmpeg.exe` path. A successful camera cut logs a numeric ffmpeg PID rather than `undefined`.

## Deployment phases

### Phase 1: free-tier launch

- SRS, ffmpeg camera switching, and Express/Socket.io on an Oracle Cloud Always Free VM.
- Next.js on Vercel.
- PostgreSQL on Neon.
- Record locally during a match, upload to ImageKit, then delete the confirmed local copy.

Oracle Always Free instances may be reclaimed after extended inactivity, so tournament-week readiness checks remain important.

### After pushing `main`

The production deploy workflow should apply pending Prisma migrations, update `/opt/fieldcast` on the Oracle VM, install backend dependencies, regenerate Prisma Client, restart `fieldcast-backend`, and deploy the frontend to Vercel. Do not separately run a production migration when the workflow succeeds.

Before relying on that automation, configure the production GitHub environment secrets: `DATABASE_URL`, `VM_HOST`, `VM_USER`, `VM_SSH_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. In Vercel Production, set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to the HTTPS DuckDNS/Nginx origin and redeploy whenever either value changes.

After each production push, verify the GitHub Actions **CI** and **Deploy** runs, then check the backend service, public API, Socket.IO handshake, SRS container/API, HLS route, and one real phone ingest. See [HOW_TO_USE.md](./HOW_TO_USE.md#11-production-after-pushing-main) for exact commands.

### Phase 2: scaled deployment

The same application and container layout can move to EC2/ECS, with S3 added as durable archive storage behind ImageKit. This is a deployment-target change, not an application redesign.

## Known limitations and next work

- Complete live event/control surfaces for Cricket and Basketball are not yet implemented.
- ImageKit replay upload is planned but not wired end to end.
- The Oracle backend, Nginx TLS route, SRS, Neon, and Vercel frontend are provisioned. Still verify that migrations through `0014_add_penalty_to_football_events` have run in production, all GitHub Actions secrets are configured, and the Vercel Production API/Socket variables target the HTTPS backend origin.
- Rotate the Neon credential exposed during the initial bootstrap, then update the VM and GitHub secret with the replacement.
- Remove direct public access to backend `4000/TCP` and HLS `8080/TCP` after the Nginx routes are verified; keep SRS API `1985/TCP` private.
- Score/video alignment uses a temporary fixed 15-second holdback and can drift when actual HLS latency changes.
- A full external phone → SRT/RTMP → SRS → HTTPS HLS → viewer test is still required before a tournament.
- A 2026-08-26 `npm audit --omit=dev` reports five high-severity findings in the frontend production tree, including direct `next@16.2.10` findings (npm proposes `16.3.3`), and five high/four moderate/one low in the backend production install, largely through Prisma CLI tooling plus Socket.IO parser. Upgrade and retest these dependencies before treating the deployment as production-hardened; do not apply a blind forced audit fix.
- The deploy workflow has no post-restart backend health check, and its Vercel job can succeed independently while the backend job fails. Always inspect all deploy jobs; a future hardening change should gate frontend production deployment on backend health.
- The live Nginx reverse-proxy configuration is not versioned in this repository. Back it up and verify `/api`, `/socket.io`, `/live`, WebSocket upgrade headers, TLS renewal, and upload/body-size settings after VM changes.
- Multi-camera switching requires ffmpeg and an environment reachable by SRS.

### Automatic two-minute clips (foundation implemented)

The clipping design is documented in [[notes/Clipping Feature Plan]] (and the Obsidian note `Clipping Feature Plan`). The backend now records a rolling window, exposes organiser-only `GET/POST /api/matches/:id/clips`, assembles the previous two minutes with ffmpeg, and uploads to Google Drive when configured. Set `CLIPS_ENABLED=true`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_DRIVE_CLIENT_EMAIL`, and `GOOGLE_DRIVE_PRIVATE_KEY`; share the target Drive folder with the service-account email. Until those values and migration `0015` are deployed, the UI reports a safe configuration error.
- Automated test coverage is limited; validation currently relies on linting, TypeScript, builds, API smoke tests, and local browser checks.

See [PROGRESS.md](./PROGRESS.md) for the detailed session log and [HOW_TO_USE.md](./HOW_TO_USE.md) for operational instructions.

## Design decisions

- Simplicity over sophistication: FieldCast is one-to-many broadcasting, so mediasoup/WebRTC conferencing complexity was intentionally rejected.
- Phase 1 avoids AWS EC2 and S3 to keep initial infrastructure free.
- Prisma migrations are versioned and should be deployed by CI in production rather than manually against the primary database.
- UI follows the light-only Geist + Inter design system in [DESIGN.md](./DESIGN.md).
