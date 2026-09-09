# Streaming — SRS + LL-HLS

Part of [[FieldCast]]

## What it is
SRS (Simple Realtime Server) is an open-source media server that:
- Accepts RTMP and SRT pushes from Android/iPhone broadcaster apps ([[Larix Broadcaster → RTMP → SRS]])
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
| 10080/UDP | SRT ingest for Android/Moblin and other compatible apps |
| 8080 | Internal HLS output (Nginx proxies it as HTTPS `/live`) |
| 1985 | SRS HTTP API (check active streams) |

## Deployment
- **Local dev:** `docker compose up -d srs`
- **Production:** Docker on [[Phase 1 — Oracle VM]]; `fieldcast-srs` is provisioned and its local API is verified
- Config: `infra/srs.conf`

## Stream keys

Current organiser-created cameras use unique backend-generated keys per match, for example `/live/match8_ab12cd34ef`. The organiser page displays a unique mobile SRT destination for every camera, with an on-demand QR code and copy actions. For Moblin, enter the displayed server URL and Stream ID separately. Both SRT and RTMP resolve to the same camera key; fixed `camera1`/`camera2` conventions are legacy only. Local SRS is pinned to stable `6.0.184`.

## Mobile SRT settings
- URL: `srt://<server>:10080`
- Stream ID: `#!::r=live/<generated-camera-key>,m=publish`
- Video: H.264; audio: AAC; keyframe interval: two seconds
- SRS is configured for a 2-second latency target with 8 MB send/receive buffers to tolerate mobile-network bursts.
- Do not use the shared `livestream` Stream ID for multiple match cameras: it creates a collision and cannot support camera switching.

## HLS stream URL
```
https://<duckdns-host>/live/<match-camera-key>.m3u8
```

## Cloudflare CDN Scaling
Public HLS video playback is edge-cached via a [[Cloudflare CDN]] Worker proxy (`fieldcast-cdn.workers.dev`).
- `.ts` video chunks: Edge-cached globally for 24 hours (`Cache-Control: public, max-age=86400`).
- `.m3u8` playlists: 1-second TTL (`Cache-Control: public, max-age=1`) for low latency.
- Internal clip recording (`clipService.js`) bypasses CDN and connects directly to SRS origin (`originLiveUrl`).

## Related
- [[Cloudflare CDN]] — Cloudflare Worker edge proxy setup
- [[ARCHITECTURE]] — Full system architecture diagram
- [[Camera Switching]] — selects which camera feed goes to viewers
- [[Larix Broadcaster → RTMP → SRS]] — how phones push video in
- [[Phase 1 — Oracle VM]] — where SRS runs in production
