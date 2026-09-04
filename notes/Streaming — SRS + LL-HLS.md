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

- Single camera: viewer plays the camera-specific manifest directly.
- Multiple cameras: ffmpeg republishes the selected feed to `/live/active_<matchId>.m3u8`.
- The raw IP/port URL is for VM-only diagnostics. Production browser playback uses Nginx HTTPS on the DuckDNS hostname; do not expose SRS `1985` or direct HLS `8080` publicly.

The public player reads HLS program-date-time metadata when SRS exposes it and uses that timestamp to hold score events until the corresponding video time. Manifests without usable timing metadata use the documented 15-second fallback. The clip recorder uses the same backend stream path and retains a rolling window for organizer requests.

## Related
- [[Camera Switching]] — selects which camera feed goes to viewers

## Viewer synchronization

Camera-switch notifications now make public HLS players reinitialize automatically, so viewers follow the new active feed without a manual page reload. HLS program-date-time is also surfaced to the score state hook; timestamped score updates are held until the corresponding video time is available, with a 15-second fallback for manifests without program-date-time.
- [[Larix Broadcaster → RTMP → SRS]] — how phones push video in
- [[Phase 1 — Oracle VM]] — where SRS runs in production
