# FieldCast

## Tournament workflow (2026-08-12)
- [[Tournament Submission]] — user drafts, reusable players, admin review, and approved public tournaments
- [[Tournament Organiser]] — scoped management of fixtures, scorecards, and camera feeds
- Approved creators automatically become organisers and may add co-organisers.

> A live sports streaming platform for outdoor college tournaments — streamed entirely from mobile phones.

## What it does
- Live cricket, football, basketball — streamed from phones via [[Larix Broadcaster → RTMP → SRS]]
- Real-time score overlays via [[Socket.io]]
- Admin-controlled [[Camera Switching]] with ffmpeg
- VOD replays via [[ImageKit]]
- Points tables, fixtures, scorecards

## Architecture split
- [[Phase 1 — Oracle VM]] → free-tier launch
- [[Phase 2 — AWS EC2]] → scaled deployment
- Same code, same Docker images — only the deploy target changes

## Tech layers
- [[Frontend — Next.js]] (Vercel)
- [[Backend — Express + Socket.io]] (Oracle VM)
- [[Database — Prisma + Neon]]
- [[Streaming — SRS + LL-HLS]]

## Governance
- [[RULES]] — hard constraints
- [[DESIGN]] — UI/font/theme rules
- [[PROGRESS]] — current status

## Key files
- `README.md` — architecture source of truth
- `RULES.md` — non-negotiables
- `DESIGN.md` — UI constraints
- `PROGRESS.md` — living status tracker
- `HOW_TO_USE.md` — end-user guide
