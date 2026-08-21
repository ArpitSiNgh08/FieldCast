# Rejected — mediasoup

Part of [[FieldCast]]

## What it is
mediasoup is a WebRTC SFU (Selective Forwarding Unit) designed for **many-to-many** real-time conferencing — video calls, group meetings.

## Why it was rejected
FieldCast is a **broadcast (one-to-many)** use case:
- A few camera phones push video in
- Many viewers watch
- There is no viewer-to-viewer communication

mediasoup is built for the opposite: where every participant both sends and receives streams from every other participant. Using it for broadcasting would add enormous complexity (ICE/DTLS/SRTP handshake per viewer) for no benefit over the simple RTMP → [[Streaming — SRS + LL-HLS]] → hls.js stack that scales to any number of passive viewers trivially.

## What was chosen instead
```
Phone broadcaster → RTMP or SRT → SRS → LL-HLS → hls.js
```
Simple, proven, well-documented. No WebRTC complexity. Sub-5s latency with LL-HLS.

## Rule
See [[RULES]] — rule 8: mediasoup is permanently rejected. Do not reintroduce it.

## Related
- [[Streaming — SRS + LL-HLS]] — what was chosen
- [[RULES]] — documents the rejection
