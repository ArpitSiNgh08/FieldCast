# HOW_TO_USE

Pointer to `HOW_TO_USE.md` in the project root.

## What it covers
- [[#One-time local dev setup]] — create Postgres user/DB, migrate, seed, start servers
- [[#Create a tournament]] — admin panel walkthrough
- [[#Stream from a phone]] — Larix Broadcaster setup
- [[#Update live scores]] — per sport (cricket/football/basketball)
- [[#End the match]] — set completed status, upload VOD to [[ImageKit]]
- Troubleshooting — port conflicts, auth failures, stream not showing

## Quick start commands
```powershell
# Terminal 1 — backend
cd backend && npm run dev    # :4000

# Terminal 2 — frontend  
cd frontend && npm run dev   # :3000
```

## Key URLs
| URL | What |
|---|---|
| `http://localhost:3000` | [[Frontend — Next.js]] — fixtures |
| `http://localhost:3000/admin` | [[Admin Panel]] |
| `http://localhost:4000/api/matches` | [[Backend — Express + Socket.io]] — API |
| `http://<SERVER>:8080/live/camera1.m3u8` | [[Streaming — SRS + LL-HLS]] — live HLS |

## Related
- [[Admin Panel]] — all match/score management lives here
- [[Larix Broadcaster → RTMP → SRS]] — mobile streaming setup
- [[Database — Prisma + Neon]] — local dev DB setup detail
