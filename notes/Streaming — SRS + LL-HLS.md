# Streaming — SRS + LL-HLS

Part of [[FieldCast]]

## What it is
SRS (Simple Realtime Server) is an open-source media server that:
- Accepts RTMP pushes from phones ([[Larix Broadcaster → RTMP → SRS]])
- Packages the stream as LL-HLS (Low-Latency HLS)
- Delivers to browsers via [[Frontend — Next.js]] using `hls.js`

## Data flow
```
Phone (Larix) → RTMP :1935 → SRS → LL-HLS → hls.js in browser
```

## Ports
| Port | Purpose |
|---|---|
| 1935 | RTMP ingest (phones push here) |
| 8080 | HLS output (viewers pull from here) |
| 1985 | SRS HTTP API (check active streams) |

## Deployment
- **Local dev:** `docker compose up -d srs`
- **Production:** Docker on [[Phase 1 — Oracle VM]]
- Config: `infra/srs.conf`

## Stream keys
| Camera | RTMP path |
|---|---|
| Main | `/live/camera1` |
| Secondary | `/live/camera2` |
| Third | `/live/camera3` |

## HLS stream URL
```
http://<server-ip>:8080/live/camera1.m3u8
```

## Related
- [[Camera Switching]] — selects which camera feed goes to viewers
- [[Larix Broadcaster → RTMP → SRS]] — how phones push video in
- [[Phase 1 — Oracle VM]] — where SRS runs in production
