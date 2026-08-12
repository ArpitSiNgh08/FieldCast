# Camera Switching

Part of [[FieldCast]]

## Match-specific cameras (2026-08-12)
- [[Tournament Organiser]] users register phone cameras before a football match starts.
- The server creates a unique RTMP stream key for each `MatchCamera`; users do not invent stream paths manually.
- `Match.activeCamera` stores the selected stream key and ffmpeg republishes it to `active_<matchId>`.
- During a live match, the organiser uses **Take live** to change the viewer feed.
- Socket.io verifies that the caller is a global admin or an organiser of the match's tournament.
- Ending the match stops its ffmpeg publisher.

## How it works
- Each camera phone streams independently into [[Streaming — SRS + LL-HLS]] via its own stream key (`camera1`, `camera2`, `camera3`)
- The admin device opens the [[Admin Panel]] and clicks "Switch Camera"
- The backend ([[Backend — Express + Socket.io]]) kills the current ffmpeg child process and spawns a new one re-piping the selected camera's RTMP feed into the single viewer-facing output stream
- All viewers automatically see the new angle — no page refresh

## Why ffmpeg, not mediasoup
[[Rejected — mediasoup]] was considered and explicitly rejected. This is a **broadcast (one-to-many)** use case, not many-to-many WebRTC conferencing. ffmpeg re-piping is simpler and fits exactly.

## Code location
`backend/src/services/cameraSwitcher.js`

## What "active camera" means in the DB
Each `Match` row in [[Database — Prisma + Neon]] has an `activeCamera` field (`camera1` | `camera2` | `camera3`). The switcher reads this to know which stream to pipe.

## Related
- [[Larix Broadcaster → RTMP → SRS]] — camera phones push here
- [[Streaming — SRS + LL-HLS]] — SRS holds all camera feeds simultaneously
- [[Admin Panel]] — UI for switching
- [[Backend — Express + Socket.io]] — manages ffmpeg child processes
