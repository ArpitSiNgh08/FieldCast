# RULES.md

Hard constraints for FieldCast. These are non-negotiable unless Arpit explicitly changes them. Any agent or contributor violating these should be treated as having made an error, not a judgment call.

## Infrastructure

1. **No AWS EC2, no AWS S3 during Phase 1.** Phase 1 runs on the Oracle Cloud Free Tier VM (SRS + ffmpeg + backend), Vercel (frontend), Neon (database), and ImageKit (VOD). AWS is Phase 2 only.
2. **No S3 for match recordings, in either phase, without an explicit decision to revisit this.** Currently: local disk → ImageKit → delete local copy. If S3 is introduced in Phase 2, it is an archival/backup layer behind ImageKit, not a replacement for it.
3. **Deployment target must stay swappable.** Application code and Docker images must not be written to assume a specific host — the Oracle VM → EC2 migration must remain "change the target, not the code."

## Database & ORM

4. **Prisma is the only ORM.** No raw `pg`, no Knex, no second ORM introduced alongside it.
5. **Neon is the only database host** for Phase 1 and Phase 2 (unless a future decision explicitly migrates to RDS).
6. **Migrations are never hand-run against the main/production Neon database.** Required flow: write migration locally → test against a Neon branch → open PR → GitHub Actions runs `prisma migrate deploy` on merge to `main`.
7. **Prisma 7 requires `@prisma/adapter-pg` — the bare `new PrismaClient()` constructor no longer accepts a connection URL.** Every file that constructs a PrismaClient (singleton, seed, tests) must create a `Pool` + `PrismaPg` adapter and pass it in. The config file must be `prisma.config.js` (CommonJS) with `datasource.url` — not `prisma.config.ts` and not `migrate.connectionString`.

## Architecture

8. **mediasoup is rejected.** This is a broadcast (one-to-many) use case, not many-to-many WebRTC conferencing — do not reintroduce it.
9. **Camera switching happens via Node.js-managed ffmpeg child processes** re-piping the organiser-selected RTMP feed into a single output stream. Do not replace this with a different switching mechanism without an explicit design discussion.
10. **`README.md` is the single source of truth for architecture.** It replaces any prior/separate ARCHITECTURE.md. If a doc conflicts with README.md on architecture, README.md wins.

## UI

11. **Component sourcing order is strict:** Untitled UI MCP (free tier) first → Magic UI MCP or shadcn/ui MCP only if the component isn't available there → custom-built component only as a last resort, and only if explicitly flagged. Full detail in `DESIGN.md`.
12. **Fonts are locked to Geist and Inter.** No third typeface without updating `DESIGN.md` first.
13. **Theme is light-only.** No dark mode variant without updating `DESIGN.md` first.

## Process

14. **This is an interview-defensible system design project.** Where a "quick and dirty" option and a "properly justified" option both solve the immediate problem, prefer the one with a good answer behind it (this is why CI-driven migrations were chosen over hand-run ones).
15. **New dependencies, services, or paid resources require explicit confirmation** before being added — don't introduce them mid-task because they seemed convenient.

## Local Dev

16. **Local database development uses native Windows PostgreSQL 18 on port 5432** — not Docker. The Docker `postgres` service in `docker-compose.yml` is for reference/CI only; on Windows the native Postgres service always wins the port. SRS still runs in Docker when testing video streaming locally. Use pgAdmin or psql as postgres superuser to create the `fieldcast` user/DB once. Do not fight Docker over port 5432 on Windows.
