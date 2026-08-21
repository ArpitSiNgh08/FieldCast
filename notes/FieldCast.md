# FieldCast

## Current product workflow (2026-08-21)
- [[Tournament Submission]] — user drafts, reusable players, admin review, and approved public tournaments
- [[Tournament Organiser]] — scoped management of fixtures, scorecards, and camera feeds
- Approved creators automatically become organisers and may add co-organisers.
- Homepage tournament cards open a public tournament hub with teams, live/upcoming/past matches, and standings.
- Creators may define pools and assign every team before submission.
- Organisers manage default/persisted Playing 11 and bench squads, pool/knockout fixtures, Football broadcasts, cameras, score events, substitutions, normal results, and washouts.
- Admins review submissions and correct completed scores/events or apply persistent standings overrides; they do not control live matches unless separately added as organisers.

> A live sports streaming platform for outdoor college tournaments — streamed entirely from mobile phones.

## What it does
- Tournament management supports cricket, football, and basketball; the complete live broadcast and scorecard workflow currently targets football.
- Football video is streamed from phones via RTMP or SRT using [[Larix Broadcaster → RTMP → SRS]]. IRL Pro SRT is the recommended fallback when its RTMP encoder is unstable.
- Real-time score overlays via [[Socket.io]]
- Organiser-controlled [[Camera Switching]] with ffmpeg
- Planned VOD replay delivery via [[ImageKit]]
- Public tournament hubs, concurrency-safe pool tables, connected live knockout brackets with semifinal promotion, fixtures, scorecards, goal scorers, and Football timelines

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
