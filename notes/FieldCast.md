# FieldCast

## Current product workflow (2026-08-21)
- [[Tournament Submission]] — user drafts, reusable players, admin review, and approved public tournaments
- [[Tournament Organiser]] — scoped management of fixtures, scorecards, and camera feeds
- Approved creators automatically become organisers and may add co-organisers.
- Homepage tournament cards open a public tournament hub with teams, live/upcoming/past matches, and standings.
- Creators may define pools and assign every team before submission.
- Organisers manage default/persisted Playing 11 and bench squads, pool/knockout fixtures, Football broadcasts, cameras, score events, substitutions, normal results, and washouts.
- Admins review submissions and correct completed scores/events or apply persistent standings overrides; they do not control live matches unless separately added as organisers.
- During a live match, organisers can request the previous two minutes as a background clip job; the backend can upload completed MP4 clips to a configured Google Drive folder.

> A live sports streaming platform for outdoor college tournaments — streamed entirely from mobile phones.

## What it does
- Tournament management supports cricket, football, and basketball; the complete live broadcast and scorecard workflow currently targets football.
- Football video is streamed from Android/iPhone broadcaster apps via RTMP or SRT using [[Larix Broadcaster → RTMP → SRS]]. Moblin can use the generated SRT server URL and per-camera Stream ID in its separate fields.
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

## Graph context memory convention

For future FieldCast tasks, read this hub first, then follow the linked notes for the affected area. Use [[PROGRESS]] for the latest implementation status, [[Backend — Express + Socket.io]] for API and persistence, [[Streaming — SRS + LL-HLS]] for media timing, [[Camera Switching]] for active-feed behavior, and [[Tournament Organiser]] for organizer workflows. Keep this hub and the affected linked notes synchronized after implementation so the Obsidian graph remains the project context memory.
