# Larix Broadcaster → RTMP → SRS

Part of [[FieldCast]] · Part of [[Streaming — SRS + LL-HLS]]

## What it is
**Larix Broadcaster** is a free mobile app (iOS + Android) that turns any smartphone into an RTMP broadcast camera.

## Setup on the phone
1. Install Larix Broadcaster (free — App Store / Play Store)
2. Open → gear icon → Connections → Add new connection
3. Set URL: `rtmp://<SERVER_IP>:1935/live/camera1`
4. Tap Save → tap the red record button to go live

## Stream keys
- `camera1` — main/sideline camera
- `camera2` — end-on / opposite angle
- `camera3` — third angle if needed

## What happens next
```
Phone taps record
  → Larix pushes RTMP to SRS on port 1935
  → SRS packages as LL-HLS
  → Viewers watch at http://<SERVER>:8080/live/camera1.m3u8
```

## Verify stream is live
```
GET http://<SERVER_IP>:1985/api/v1/streams
```
Returns JSON list of active streams.

## Related
- [[Streaming — SRS + LL-HLS]] — what receives the push
- [[Camera Switching]] — admin selects which phone is "live"
- [[Phase 1 — Oracle VM]] — production server IP
- [[HOW_TO_USE]] — full step-by-step
