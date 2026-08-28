# Socket.io

Part of [[FieldCast]] · Part of [[Backend — Express + Socket.io]]

## What it does
Pushes live score, active-camera, match-status, and viewer-metric updates from the backend to connected browsers without polling. Organiser controls and Football event/timeline updates are immediate; public score display currently applies a temporary 15-second holdback to align better with delayed HLS playback.

## Current events
| Event | Direction | Purpose |
|---|---|---|
| `match:join` | client → server | Join match room and receive current state |
| `match:leave` | client → server | Leave match room |
| `score:update` | organiser → server | Persist state and optional sport event detail |
| `score:updated` | server → room | Broadcast persisted state |
| `camera:switch` | organiser → server | Select a configured match stream key |
| `camera:switched` | server → room | Broadcast selected camera |
| `match:status` | server → room | Broadcast live/completed/washout transition |
| `stream:watch` | viewer → server | Register an anonymous browser as watching a live match |
| `stream:leave` | viewer → server | Remove that browser from the live viewer count |
| `stream:viewers` | server → room | Broadcast current live and persisted unique-viewer totals |

## Viewer metrics

`stream:watch` receives a random ID stored in the browser's local storage. `MatchView` stores one row per `(matchId, viewerId)`, so the unique total survives process restarts and duplicate browser tabs count once. The in-memory socket map supplies the live count. No IP address or personally identifying viewer data is stored.

Apply pending migrations through `0014_add_penalty_to_football_events` before deploying the current feature set:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Football score flow
```
Organiser updates score in [[Tournament Organiser]] control room
  → client emits score:update
  → backend verifies match/tournament permission
  → backend writes MatchState and optional FootballEvent via Prisma
  → backend emits score:updated to the match room immediately
  → [[Frontend — Next.js]] ScoreOverlay updates the live score graphic
```

## Mutation authorization
Viewer connections may remain anonymous. A JWT in the Socket.io handshake identifies signed-in users. Every score or camera mutation verifies that the caller is a member of the relevant tournament's organiser list. The global admin role does not bypass this tournament-scoped authorization.

Camera switching also verifies that the stream key belongs to a configured camera for that match. See [[Tournament Organiser]] and [[Camera Switching]].

For Football, `score:update` includes roster-backed event detail and an optional penalty flag for goals. The backend validates minute/extra time and current match participation, saves player/jersey snapshots, and derives goal increments server-side. Substitutions require different outgoing/incoming players from the same team; the server rebuilds the active-player set from the starting squad plus prior substitutions before accepting the event.

Every organiser control device joins the match room and consumes `score:updated` and `camera:switched`. Public match and bracket refresh components also consume `match:status`. Finalization therefore unmounts the live player without reload even if the phone continues publishing. Per-match score updates are serialized in the Phase 1 backend process, goals use the latest persisted total, and non-goal Football events preserve that total instead of trusting potentially stale client score fields.

## Key design point
Socket.io score updates and HLS video have separate clocks. Organisers and public Football event timelines receive updates immediately, while public score values use the temporary 15-second client holdback. SRS playlists currently do not emit `EXT-X-PROGRAM-DATE-TIME`, so timestamp-based HLS synchronization remains future work.

The holdback variable is `SCORE_SYNC_DELAY_MS = 15_000` in `frontend/src/hooks/useMatchState.ts`. It does not belong in Vercel or the backend `.env`. Production connectivity separately requires Vercel's `NEXT_PUBLIC_SOCKET_URL=https://<duckdns-host>` and an Nginx `/socket.io` proxy that forwards WebSocket upgrade headers. The client starts with polling and can upgrade to WebSocket when the proxy supports it; verify the polling handshake returns a Socket.IO open packet before testing score updates on two devices.

## Code location
- `backend/src/sockets/index.js` — Socket.io server and JWT handshake
- `backend/src/sockets/handlers.js` — rooms, score updates, events, and camera switching
- `backend/src/services/authorization.service.js` — scoped permission checks
- `frontend/src/components/ScoreOverlay.tsx` — live score, connection state, and goal-scorer graphic
- `frontend/src/components/ScorecardLiveRefresh.tsx` — refreshes server-rendered event history after score updates

## Related
- [[Backend — Express + Socket.io]]
- [[Frontend — Next.js]]
- [[Tournament Organiser]]
- [[Camera Switching]]
