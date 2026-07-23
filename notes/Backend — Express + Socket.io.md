# Backend — Express + Socket.io

Part of [[FieldCast]]

## What it does
- REST API for fixtures, scores, teams, tournaments, admin actions
- Real-time score push via [[Socket.io]]
- Manages [[Camera Switching]] via ffmpeg child processes
- Auth: Google OAuth via Passport.js (admins only)

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
| PATCH | `/api/matches/:id/state` | Update live score |
| POST | `/api/matches/:id/camera` | Switch active camera |
| GET | `/api/tournaments` | All tournaments |
| GET | `/api/standings` | Points table |
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
      socketService.js   ← Socket.io emit helpers
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
