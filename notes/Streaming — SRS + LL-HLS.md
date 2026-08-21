# Streaming — SRS + LL-HLS

Part of [[FieldCast]]

## What it is
SRS (Simple Realtime Server) is an open-source media server that:
- Accepts RTMP and SRT pushes from phones ([[Larix Broadcaster → RTMP → SRS]])
- Packages the stream as LL-HLS (Low-Latency HLS)
- Delivers to browsers via [[Frontend — Next.js]] using `hls.js`

## Data flow
```
Phone → RTMP :1935/TCP or SRT :10080/UDP → SRS → LL-HLS → hls.js in browser
```

## Ports
| Port | Purpose |
|---|---|
| 1935 | RTMP ingest (phones push here) |
| 10080/UDP | SRT ingest (IRL Pro recommended fallback) |
| 8080 | HLS output (viewers pull from here) |
| 1985 | SRS HTTP API (check active streams) |

## Deployment
- **Local dev:** `docker compose up -d srs`
- **Production:** Docker on [[Phase 1 — Oracle VM]]
- Config: `infra/srs.conf`

## Stream keys

Current organiser-created cameras use unique backend-generated keys per match, for example `/live/match8_ab12cd34ef`. The organiser page displays the exact recommended IRL Pro SRT URL and an RTMP fallback. Both protocols resolve to the same stream key; fixed `camera1`/`camera2` conventions are legacy only. Local SRS is pinned to stable `6.0.184`.

## HLS stream URL
```
http://<server-ip>:8080/live/<match-camera-key>.m3u8
```

- Single camera: viewer plays the camera-specific manifest directly.
- Multiple cameras: ffmpeg republishes the selected feed to `/live/active_<matchId>.m3u8`.

## Related
- [[Camera Switching]] — selects which camera feed goes to viewers
- [[Larix Broadcaster → RTMP → SRS]] — how phones push video in
- [[Phase 1 — Oracle VM]] — where SRS runs in production
