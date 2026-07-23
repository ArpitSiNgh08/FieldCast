# Socket.io

Part of [[FieldCast]] · Part of [[Backend — Express + Socket.io]]

## What it does
Pushes live score updates from the backend to every connected browser **instantly** — without polling.

## Data flow
```
Admin updates score in [[Admin Panel]]
  → POST /api/matches/:id/state
  → Backend writes to [[Database — Prisma + Neon]] (MatchState row)
  → Backend emits socket event: match:state:update
  → All connected browsers receive the event
  → [[Frontend — Next.js]] ScoreOverlay redraws Canvas
```

## Socket events
| Event | Direction | Payload |
|---|---|---|
| `match:state:update` | server → client | Full MatchState object |
| `match:event:cricket` | server → client | CricketEvent row |
| `match:event:football` | server → client | FootballEvent row |
| `match:camera:switch` | server → client | `{ camera: 'camera2' }` |
| `join:match` | client → server | `{ matchId: 123 }` |

## Key design point
The score overlay latency is **independent of video stream latency**. Even if the HLS stream has 4 seconds of latency, the score number updates in under 100ms. This is by design — they run on separate channels.

## Code location
- `backend/src/index.js` — Socket.io server setup
- `backend/src/services/socketService.js` — emit helpers
- `frontend/src/components/ScoreOverlay.tsx` — Canvas renderer

## Related
- [[Backend — Express + Socket.io]] — server setup
- [[Frontend — Next.js]] — client connection and overlay rendering
- [[Admin Panel]] — source of score update triggers
