# Backend — Express + Socket.io

Part of [[FieldCast]]

## Tournament operations API (current 2026-08-21)
- Authentication supports bcrypt email/password accounts plus Google OAuth; both issue JWT bearer tokens.
- `/api/tournaments/organized/mine` lists approved tournaments managed by the current organiser.
- `POST /api/tournaments/:id/organizers` adds an existing account by email.
- `POST /api/tournaments/:id/pools` adds a pool while a draft remains editable, and team membership stores its selected pool.
- Organisers may create matches only inside approved tournaments they manage.
- New matches are classified as pool or knockout fixtures; pool team choices are scoped to that pool and knockout fixtures carry a built-in or custom round label.
- `PATCH /api/matches/:id/broadcast-setup` stores venue, kickoff, and preflight state.
- `POST /api/matches/:id/cameras` creates a match camera with a server-generated key; responses include SRT and RTMP ingest URLs.
- `PATCH /api/tournaments/:id/teams/:teamId/lineup` persists the sport-sized starting squad and bench split.
- `PATCH /api/matches/:id/status` starts a match after preflight or normally finalizes it and recomputes standings.
- `POST /api/matches/:id/result` records a played result or washout; washouts are excluded from the table.
- `authorization.service.js` enforces tournament/match permissions for REST and [[Socket.io]].
- `/api/admin` correction endpoints require the global admin role and reject live/upcoming matches.
- Standings replacement uses a tournament-scoped PostgreSQL advisory lock plus sequential bulk insert, preventing concurrent recomputation `P2002` errors.
- Match finalization emits `match:status` to the Socket.io room after persistence.

See [[Tournament Submission]] and [[Tournament Organiser]].

## What it does
- REST API for fixtures, scores, teams, tournaments, admin actions
- Real-time score push via [[Socket.io]]
- Manages [[Camera Switching]] via ffmpeg child processes
- Auth: bcrypt/JWT credentials plus optional Google OAuth

## Stack
- Node.js + Express.js
- Socket.io (WebSocket real-time layer)
- [[Database — Prisma + Neon]] — only ORM
- Passport.js + Google OAuth 2.0
- JWT for session tokens

## Port
`4000` — start with `npm run dev` from `backend/`

## Key API routes
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/matches` | All fixtures |
| GET | `/api/matches/:id` | Single match with state |
| GET | `/api/matches/:id/scorecard` | Match state and sport-specific event history |
| PATCH | `/api/matches/:id/status` | Go live or finalize a played match |
| POST | `/api/matches/:id/result` | Save played/washout result |
| PATCH | `/api/matches/:id/broadcast-setup` | Save kickoff, venue, and preflight |
| POST/DELETE | `/api/matches/:id/cameras` | Add/remove match-specific cameras |
| GET | `/api/tournaments` | Approved user-created tournaments |
| GET | `/api/tournaments/:id/standings` | Recomputed tournament table |
| POST | `/api/tournaments/:id/pools` | Add an editable-draft pool |
| PATCH | `/api/tournaments/:id/teams/:teamId/lineup` | Save starting squad |
| PATCH | `/api/admin/matches/:id/score` | Correct a completed final score |
| POST/PATCH/DELETE | `/api/admin/matches/:id/football-events` | Correct completed Football timeline events |
| PUT/DELETE | `/api/admin/tournaments/:id/standings/:teamId` | Apply/reset a persistent standings override |
| POST | `/api/auth/register`, `/api/auth/login` | Credential authentication |
| GET | `/api/auth/google` | OAuth login |

## Config
`backend/src/config/env.js` — all env vars with safe defaults

## Deployment
- **Local:** `npm run dev` → nodemon
- **Production:** Docker on [[Phase 1 — Oracle VM]], managed by `pm2` or systemd

## Key files
```
backend/
  src/
    config/
      env.js        ← all env vars
      prisma.js     ← Prisma singleton (adapter pattern)
    models/         ← all DB access via Prisma
    routes/         ← Express route handlers
    services/
      cameraSwitcher.js  ← ffmpeg child process manager
    sockets/             ← rooms, JWT handshake, scoring, camera switching
    index.js        ← server entry point
  prisma/
    schema.prisma
    seed.js
    migrations/
  prisma.config.js  ← Prisma 7 datasource config
```

## Related
- [[Socket.io]] — real-time layer
- [[Camera Switching]] — ffmpeg management
- [[Database — Prisma + Neon]] — data layer
- [[Phase 1 — Oracle VM]] — production host
- [[CI/CD — GitHub Actions]] — deploy pipeline
