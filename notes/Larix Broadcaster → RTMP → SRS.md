# Mobile Broadcaster → RTMP/SRT → SRS

Part of [[FieldCast]] · Part of [[Streaming — SRS + LL-HLS]]

## What it is
FieldCast accepts custom RTMP from Larix or IRL Pro and SRT contribution from IRL Pro. Larix remains a valid RTMP broadcaster, but its current watermark policy may make IRL Pro preferable on Android. The historical note filename is retained so existing Obsidian links continue working.

## Setup on the phone
1. In `/organizer/matches/[id]`, add the camera and copy its generated URL.
2. IRL Pro (Android): choose SRT/Caller. Enter `srt://<HOST>:10080` as the server and `#!::r=live/<match-camera-key>,m=publish` in IRL Pro's separate **Stream ID** field.
3. IRL Pro or Larix RTMP fallback: `rtmp://<SERVER_IP>:1935/live/<match-camera-key>`.
4. If RTMP is stable, it is not necessary to change to SRT. Use SRT when IRL Pro reports connection/H.264 packetization failures.
5. Never include Markdown backslashes, a trailing `&#x20;`, or surrounding whitespace in the broadcaster URL.

For production, `<HOST>` is the DuckDNS hostname set in `RTMP_HOST`, not the Oracle private VNIC address. A private `10.x.x.x` address is valid only for same-network development where that host is actually reachable. On iPhone, Moblin supports custom SRT/Caller without Larix Broadcaster's free-tier overlay; use the same separate server and Stream ID values.

## Stream keys

Keys are server-generated for each `MatchCamera`. Camera names and angles remain human-readable, while the unique key prevents collisions between matches. Always copy the URL from the organiser control room.

## What happens next
```
Phone starts publishing
  → RTMP reaches SRS on TCP 1935, or SRT reaches SRS on UDP 10080
  → SRT is converted into the same /live/<match-camera-key> source
  → SRS packages as LL-HLS
  → One-camera viewers use /live/<match-camera-key>.m3u8
  → Multi-camera viewers use /live/active_<matchId>.m3u8
```

SRS currently emits media sequence and segment timing, but the generated HLS playlists do not include `EXT-X-PROGRAM-DATE-TIME`. The public score overlay therefore uses a temporary 15-second holdback while timestamp-based synchronization is evaluated.

## Verify stream is live
```
GET http://<SERVER_IP>:1985/api/v1/streams
```
Returns JSON list of active streams.

## Related
- [[Streaming — SRS + LL-HLS]] — what receives the push
- [[Camera Switching]] — organiser selects which phone is "live"
- [[Phase 1 — Oracle VM]] — production server IP
- [[HOW_TO_USE]] — full step-by-step
