# Camera Switching

Part of [[FieldCast]]

## Match-specific cameras (2026-08-12)
- [[Tournament Organiser]] users register phone cameras before a football match starts.
- The server creates a unique stream key for each `MatchCamera` and displays SRT and RTMP ingest URLs; users do not invent stream paths manually.
- `Match.activeCamera` stores the selected stream key and ffmpeg republishes it to `active_<matchId>`.
- During a live match, the organiser uses **Take live** to change the viewer feed.
- Socket.io verifies that the caller is an explicit organiser of the match's tournament; the global admin role has no automatic camera-control permission.
- Normal completion or washout stops its ffmpeg publisher.

## How it works
- Each camera phone streams independently with a server-generated match key such as `match8_ab12cd34ef`.
- The tournament organiser opens `/organizer/matches/[id]` and uses **Take live**.
- The backend ([[Backend — Express + Socket.io]]) kills the current ffmpeg child process and spawns a new one re-piping the selected camera's SRS RTMP source into the single viewer-facing output stream. SRT phone contribution is converted to that source by SRS first.
- All viewers automatically see the new angle — no page refresh

## Why ffmpeg, not mediasoup
[[Rejected — mediasoup]] was considered and explicitly rejected. This is a **broadcast (one-to-many)** use case, not many-to-many WebRTC conferencing. ffmpeg re-piping is simpler and fits exactly.

## Code location
`backend/src/services/cameraSwitcher.js`

Real switching requires `ffmpeg`. Configure `FFMPEG_PATH=ffmpeg` when it is on `PATH`, or set the absolute executable path. `spawn ffmpeg ENOENT` and an undefined PID mean the backend cannot locate it; restart nodemon after changing `.env`.

## What "active camera" means in the DB
Each `Match` stores the selected `MatchCamera.streamKey` in `activeCamera`. One-camera local broadcasts bypass ffmpeg and play that camera’s HLS manifest directly. Multi-camera matches republish the selected key to `active_<matchId>.m3u8`.

## Related
- [[Larix Broadcaster → RTMP → SRS]] — camera phones push here
- [[Streaming — SRS + LL-HLS]] — SRS holds all camera feeds simultaneously
- [[Tournament Organiser]] — live camera-selection UI
- [[Backend — Express + Socket.io]] — manages ffmpeg child processes
