# Camera Switching

Part of [[FieldCast]]

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
