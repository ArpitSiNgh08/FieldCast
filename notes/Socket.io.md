# Socket.io

Part of [[FieldCast]] · Part of [[Backend — Express + Socket.io]]

## What it does
Pushes live score and active-camera updates from the backend to connected browsers instantly, without polling.

## Current events
| Event | Direction | Purpose |
|---|---|---|
| `match:join` | client → server | Join match room and receive current state |
| `match:leave` | client → server | Leave match room |
| `score:update` | organiser → server | Persist state and optional sport event detail |
| `score:updated` | server → room | Broadcast persisted state |
| `camera:switch` | organiser → server | Select a configured match stream key |
| `camera:switched` | server → room | Broadcast selected camera |

## Football score flow
```
Organiser updates score in [[Tournament Organiser]] control room
  → client emits score:update
  → backend verifies match/tournament permission
  → backend writes MatchState and optional FootballEvent via Prisma
  → backend emits score:updated to the match room
  → [[Frontend — Next.js]] ScoreOverlay redraws Canvas
```

## Mutation authorization
Viewer connections may remain anonymous. A JWT in the Socket.io handshake identifies signed-in users. Every score or camera mutation verifies that the caller is either:
- a global admin, or
- a member of the relevant tournament's organiser list.

Camera switching also verifies that the stream key belongs to a configured camera for that match. See [[Tournament Organiser]] and [[Camera Switching]].

For football, `score:update` includes a roster-backed event detail. The backend verifies that the player belongs to one of the match teams, saves the event, and derives goal score increments server-side before emitting `score:updated`.

## Key design point
The score overlay latency is independent of video stream latency. Even if LL-HLS is several seconds behind real time, score updates travel on the Socket.io channel immediately.

## Code location
- `backend/src/sockets/index.js` — Socket.io server and JWT handshake
- `backend/src/sockets/handlers.js` — rooms, score updates, events, and camera switching
- `backend/src/services/authorization.service.js` — scoped permission checks
- `frontend/src/components/ScoreOverlay.tsx` — Canvas renderer

## Related
- [[Backend — Express + Socket.io]]
- [[Frontend — Next.js]]
- [[Tournament Organiser]]
- [[Camera Switching]]
