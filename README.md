# FieldCast

A live sports streaming platform built for outdoor college tournaments — Cricket, Football, and Basketball — streamed entirely from mobile phones, with no laptops or OBS involved.

FieldCast delivers low-latency live video with real-time scorecard overlays, points tables, fixture displays, and admin-controlled multi-camera switching, all running on infrastructure that starts free and scales up only when it needs to.

---

## Table of Contents

- [Project Philosophy](#project-philosophy)
- [Phase 1 — Free-Tier Launch](#phase-1--free-tier-launch)
- [Phase 2 — Scaled Deployment](#phase-2--scaled-deployment)
- [Migration Path: Phase 1 → Phase 2](#migration-path-phase-1--phase-2)
- [Tech Stack](#tech-stack)
- [Database & ORM](#database--orm)
- [CI/CD & Migration Workflow](#cicd--migration-workflow)
- [Real-Time Data Flow](#real-time-data-flow)
- [Database Schema](#database-schema)
- [Camera Switching](#camera-switching)
- [VOD & Replays](#vod--replays)
- [Glossary](#glossary)
- [Decisions Explicitly Rejected](#decisions-explicitly-rejected)

---

## Project Philosophy

Two principles drive every architecture decision in this project:

1. **Simplicity over sophistication.** Where a simpler broadcast-oriented stack meets the requirement, added complexity is avoided — e.g. `mediasoup` was evaluated and explicitly rejected as overkill for a broadcast (one-to-many) use case rather than a conferencing (many-to-many) one.
2. **Phased infrastructure.** The system is designed so that Phase 1 (free, small-scale, for actually running a tournament) and Phase 2 (paid, scaled) share the *same* application code and Docker images. Only the deployment target changes. This is a deliberate system-design choice, not an afterthought — and it's one of the strongest talking points of the project.

---

## Phase 1 — Free-Tier Launch

**Goal:** get real matches streaming end-to-end, on infrastructure that costs nothing, without AWS EC2 or S3.

| Component | Phase 1 Choice | Why |
|---|---|---|
| RTMP ingest + LL-HLS output (SRS) | **Oracle Cloud Free Tier** — Always Free Ampere VM (4 OCPU / 24GB RAM), Docker | Free-tier PaaS options (Vercel, Netlify, Render's free web service) only proxy HTTP(S) and reject raw RTMP on port 1935. Oracle's Free Tier gives a genuine, un-sandboxed Linux VM with a public IP and no port restrictions. |
| Camera-switcher (ffmpeg child processes via Node.js) | Same Oracle VM | Needs to sit next to SRS since it re-pipes RTMP streams locally. |
| Backend (Node.js + Express + Socket.io) | Same Oracle VM | Persistent WebSocket connections for live overlay data; not viable on serverless/free-tier functions. |
| Frontend (Next.js) | **Vercel free tier** | Purely serves pages/hls.js player — no raw ports needed, so the standard free tier works fine. |
| Database (PostgreSQL) | **Neon free tier** | See [Database & ORM](#database--orm). |
| Match recordings / VOD | Record to local disk on the Oracle VM during the match → upload to **ImageKit** after → delete local copy | Avoids S3 entirely. ImageKit already handles VOD transcoding/delivery, so no separate storage layer is needed at this stage. |

**Known risk to flag in the docs:** Oracle's Always Free tier has a documented history of reclaiming idle instances after extended inactivity. For active tournament weekends this isn't an issue, but if there are multi-week gaps between matches, a scheduled keep-alive ping (or a manual check before match day) is worth building in.

---

## Phase 2 — Scaled Deployment

Once the platform outgrows free-tier limits (concurrent viewers, storage, or reliability guarantees needed), the same application moves to paid infrastructure without a redesign:

| Component | Phase 2 Choice |
|---|---|
| RTMP ingest + LL-HLS output (SRS) | AWS EC2 running SRS in Docker |
| Camera-switcher | Same EC2 instance (or split onto a dedicated instance if load requires it) |
| Backend | EC2 / ECS, scaled independently from ingest if needed |
| Frontend | Vercel (unchanged) |
| Database | Neon (unchanged) or migrate to RDS if fully managed Postgres at scale is preferred |
| Match recordings / VOD | ImageKit remains the delivery layer; **S3 introduced here** as a durable archival/backup layer behind ImageKit, once storage needs exceed ImageKit's free/starter tier |

---

## Migration Path: Phase 1 → Phase 2

This is intentionally the easy part — by design:

- Larix Broadcaster on the phones is repointed from the Oracle VM's IP to the EC2 IP — no app-level change.
- SRS + ffmpeg run from the same Docker setup on both hosts.
- The CI/CD pipeline (see below) doesn't change — only the deploy target does.
- Postgres schema and Prisma migrations are host-agnostic since Neon is used in both phases (or swapped to RDS with a standard `pg_dump`/restore).

This "same pipeline, different target" property is a deliberate design choice worth calling out directly — it demonstrates separation of concerns between application logic and infrastructure.

---

## Tech Stack

- **Frontend:** Next.js
- **Backend:** Node.js + Express.js
- **Real-time layer:** Socket.io (live score graphics, overlay updates)
- **Streaming ingest:** Larix Broadcaster (mobile) → RTMP → SRS (Simple Realtime Server, Dockerized)
- **Camera switching:** ffmpeg child processes managed by Node.js, re-piping the selected camera's RTMP feed into a single active output stream
- **Delivery:** LL-HLS via hls.js, with Adaptive Bitrate Streaming, targeting sub-5-second latency for off-campus mobile viewers
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **VOD/Replays:** ImageKit

---

## Database & ORM

**ORM: Prisma 7.**

`schema.prisma` models `match_state` and the sport-specific event tables directly, giving:

- Type-safe Prisma Client access from the Express layer, which pairs naturally with typed Socket.io payloads sent to the frontend.
- Tracked, version-controlled migrations from day one, rather than hand-run SQL.

**Prisma 7 note:** The constructor no longer accepts `datasourceUrl` or `datasources`. The connection URL is provided exclusively via the `@prisma/adapter-pg` driver adapter (`new PrismaPg(new Pool({ connectionString }))` passed to `PrismaClient({ adapter })`). The config file is `prisma.config.js` (CommonJS, not TypeScript) with `datasource.url`.

**Database host: Neon**, chosen specifically for **branch-based development**:

- A new Prisma migration is written and tested locally against an isolated Neon branch (a full copy-on-write clone of schema + data) before ever touching the main database.
- This mirrors how larger engineering orgs de-risk schema changes — test against a prod-like clone first — and is a strong, slightly less common interview talking point versus "just run migrate on prod."

---

## CI/CD & Migration Workflow

Migrations are never run by hand against production. The workflow:

1. **Local dev:** write a Prisma migration, run `prisma migrate dev` against a Neon branch, verify.
2. **PR opened:** changes reviewed against the branch database.
3. **Merge to `main`:** GitHub Actions workflow runs:
   - `prisma migrate deploy` against the Neon main database (using a `DATABASE_URL` secret)
   - SSH into the target VM (Oracle in Phase 1, EC2 in Phase 2) to pull the latest code and restart the Node process (via `pm2` or a `systemd` service)

This guarantees schema and application code can never drift apart, and the same pipeline definition carries across both phases — only the SSH target changes.

---

## Real-Time Data Flow

1. Phone cameras stream RTMP via Larix Broadcaster to SRS on the active host (Oracle VM in Phase 1, EC2 in Phase 2).
2. The admin device selects the active camera; a Node.js-managed ffmpeg process re-pipes that feed into the single output stream.
3. SRS transcodes/packages the output as LL-HLS.
4. Viewers play the stream via hls.js with ABR, targeting sub-5-second latency.
5. Score/event updates (runs, goals, quarters, etc.) are written to Postgres via Prisma and simultaneously pushed over Socket.io.
6. The frontend's Canvas overlay listens for Socket.io events and redraws the live score graphic above the video player in real time — independent of the video stream's own latency.

---

## Database Schema

Hybrid schema, sport-agnostic core + sport-specific detail tables:

- **`match_state`** — live overlay data (current score, game clock/period, teams, match status) — the table Socket.io reads from/writes to for real-time graphics.
- **`cricket_events`** — ball-by-ball event history for detailed cricket scorecards.
- **`football_events`** — goals, cards, substitutions, and other match events.
- **`basketball_quarters`** — per-quarter scoring and event history.

This split keeps the real-time overlay path (`match_state`) lightweight and fast, while detailed historical data lives in sport-specific tables for post-match scorecards and stats.

---

## Camera Switching

- Each camera phone streams independently via Larix Broadcaster into SRS.
- An admin device (web interface) selects which camera feed is "live" at any moment.
- A Node.js-managed ffmpeg child process re-pipes the selected RTMP feed into the single active output stream that viewers actually receive — this is what makes multi-camera switching possible without every viewer managing multiple streams themselves.

---

## VOD & Replays

- **Phase 1:** Recordings are written to local disk on the Oracle VM during the match, then uploaded to ImageKit immediately after the match ends. The local copy is deleted once the ImageKit upload is confirmed. No S3 dependency.
- **Phase 2:** Same ImageKit-based delivery, with S3 added purely as a durable archival/backup layer once storage needs exceed what ImageKit's tier comfortably handles.

ImageKit was chosen specifically to avoid building and maintaining a custom transcoding pipeline.

---

## Local Development

- **Database:** Native PostgreSQL 18 running as a Windows service on port 5432. Docker's `postgres` service in `docker-compose.yml` cannot bind this port on Windows — use native Postgres directly.
- **One-time setup:** Create `fieldcast` user + database as the `postgres` superuser (see `HOW_TO_USE.md`).
- **Starting the stack:** `npm run dev` in `backend/` (port 4000) and `frontend/` (port 3000). No Docker needed locally.
- **Production:** SRS + backend run in Docker on the Oracle VM. Postgres is Neon (cloud-hosted). Only the `srs` service from `docker-compose.yml` is used in production — Postgres is external (Neon).

---

## Glossary

- **RTMP** — Real-Time Messaging Protocol; used by Larix Broadcaster to push video from phones to SRS.
- **SRS (Simple Realtime Server)** — open-source media server handling RTMP ingest and LL-HLS packaging.
- **LL-HLS** — Low-Latency HTTP Live Streaming; enables sub-5-second latency over standard HLS delivery.
- **ABR (Adaptive Bitrate Streaming)** — automatically adjusts video quality to the viewer's network conditions.
- **hls.js** — JavaScript library that plays HLS streams in browsers lacking native HLS support.
- **m3u8** — the manifest file format describing available HLS stream segments/qualities.
- **Progressive download** — non-adaptive video delivery where the whole file streams sequentially (contrasted with HLS/ABR in the original design research).

---

## Decisions Explicitly Rejected

- **mediasoup** — too complex for a broadcast (one-to-many) use case; it's built for many-to-many WebRTC conferencing, which isn't what FieldCast needs.
- **AWS EC2 / S3 in Phase 1** — deliberately deferred to Phase 2 to keep the initial launch fully free and to prove the architecture works before introducing paid infrastructure.
- **Manual SSH-based migrations** — rejected in favor of a GitHub Actions pipeline, since hand-run production migrations don't hold up as a defensible practice and risk schema/code drift.
