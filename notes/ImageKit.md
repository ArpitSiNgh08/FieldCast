# ImageKit

Part of [[FieldCast]]

## What it does
Handles **VOD delivery and transcoding** for match replays — no custom transcoding pipeline needed.

## Current implementation status

Planned, not wired end to end. `Match.replayUrl` and public replay playback support exist, but automatic recording, upload, confirmation, and local-file cleanup are still pending.

## Phase 1 workflow
```
Match ends
  → Recording on [[Phase 1 — Oracle VM]] local disk
  → Upload to ImageKit via API
  → ImageKit returns HLS delivery URL
  → Backend/organiser result workflow saves the returned replay URL
  → `replayUrl` saved in [[Database — Prisma + Neon]] Match row
  → Local file deleted from VM disk
  → Viewers watch replay at that URL
```

## Phase 2
Same delivery layer. S3 added as a **durable archival/backup layer** behind ImageKit — not a replacement.

## Why ImageKit over S3 in Phase 1
S3 is storage only — you'd need a separate transcoding pipeline (AWS MediaConvert, etc.) to serve HLS. ImageKit already handles transcoding and HLS delivery. No pipeline to build or maintain.

## Related
- [[Phase 1 — Oracle VM]] — where recordings originate
- [[Phase 2 — AWS EC2]] — S3 added here as archival
- [[Database — Prisma + Neon]] — `replayUrl` stored in Match model
- [[Frontend — Next.js]] — plays replay via `HlsPlayer.tsx`
