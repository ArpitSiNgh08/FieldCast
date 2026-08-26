# HOW_TO_USE

Pointer to `HOW_TO_USE.md` in the project root.

## What it covers
- Native Postgres, migrations `0001`–`0012`, and starting one backend instance
- bcrypt/JWT account creation and env-backed administrator login
- Creator draft → admin review → approved organiser workflow
- Optional creator-defined pools, per-pool team assignment, and pool/knockout fixtures
- Drag-and-drop Playing 11/bench selection
- Match-specific generated IRL Pro SRT and RTMP fallback destinations with on-demand QR transfer
- Football setup, go live, score events, halftime/full-time states, public stream/timeline, completion, and washout
- Two-player substitutions with match-specific active-player tracking
- Pool standings, knockout brackets, admin historical corrections, and public tournament hubs
- Stale Prisma Client, duplicate nodemon, auth, and streaming troubleshooting
- Production post-push checks for Actions, systemd, Nginx/Socket.IO, SRS, migration `0012`, and a real phone stream

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
| `http://localhost:3000/admin` | [[Admin Panel]] historical corrections |
| `http://localhost:3000/admin/tournaments` | [[Admin Panel]] review queue |
| `http://localhost:3000/organizer` | [[Tournament Organiser]] workspace |
| `http://localhost:4000/api/matches` | [[Backend — Express + Socket.io]] — API |
| `http://<SERVER>:8080/live/<generated-key>.m3u8` | [[Streaming — SRS + LL-HLS]] — one-camera HLS |

## Related
- [[Admin Panel]] — tournament review and completed-record corrections
- [[Tournament Organiser]] — match, lineup, camera, score, and result management
- [[Larix Broadcaster → RTMP → SRS]] — mobile streaming setup
- [[Database — Prisma + Neon]] — local dev DB setup detail
