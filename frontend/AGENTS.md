# AGENTS.md

Entry point for any AI coding agent working in this repository. Read this file first, then follow the pointers below before making changes.

## What this project is

FieldCast — a live sports streaming platform (Cricket, Football, Basketball) for outdoor college tournaments, streamed from mobile phones only (no laptops/OBS). Full system design, deployment phases, tech stack, and data flow live in **README.md** — read that before touching architecture, infra, or the database schema.

## Where to look for what

| Need to know... | Read this file |
|---|---|
| Current features, routes, workflows, architecture, setup, migrations, and deployment phases | `README.md` |
| Hard constraints / things that must never happen | `RULES.md` |
| UI component sourcing, fonts, theming | `DESIGN.md` |
| What's currently done / in progress / next | `PROGRESS.md` |
| Claude Code–specific working conventions | `CLAUDE.md` |

## Baseline expectations for any agent

- **Don't re-litigate locked decisions.** Prisma is the ORM. Neon is the database. Oracle Cloud Free Tier VM is the Phase 1 host. ImageKit handles VOD. These are settled — propose changes explicitly rather than quietly working around them.
- **Respect the phase boundary.** Phase 1 must not introduce AWS EC2, AWS S3, or any paid infra. If a task seems to require it, stop and flag it rather than reaching for the Phase 2 stack early.
- **Migrations are never hand-run against production.** Prisma migrations go: local dev against a Neon branch → PR → GitHub Actions runs `prisma migrate deploy` on merge. Don't run `migrate deploy` manually against the main Neon database.
- **Prisma 7 adapter is mandatory.** Every `new PrismaClient()` call requires a pg driver adapter (`@prisma/adapter-pg`). The bare constructor with no arguments or with `datasourceUrl`/`datasources` will throw. See `backend/src/config/prisma.js` for the singleton pattern to copy.
- **Local dev uses native Windows Postgres 18** (port 5432 as a Windows service). Docker postgres cannot bind this port on Windows. See `HOW_TO_USE.md` for one-time setup.
- **UI components follow DESIGN.md's sourcing order exactly** — Untitled UI MCP first, then Magic UI/shadcn MCP only if a component isn't in Untitled UI's free tier. Fonts are locked to Geist + Inter. Theme is light-only.
- **Update PROGRESS.md and relevant `notes/*.md` context as you go.** If you complete, start, or block on a task, keep both the living tracker and Obsidian memory accurate.
- **When a design decision isn't covered by these files**, prefer the simpler option and say so explicitly, rather than silently picking the more complex one. This project's guiding principle is simplicity over sophistication (see README.md — this is why `mediasoup` was rejected in favor of a broadcast-oriented stack).

## Before writing code

1. Check `RULES.md` for hard constraints relevant to the task.
2. Check `README.md` for the architecture/phase the task belongs to.
3. If it's UI work, check `DESIGN.md` for component sourcing and styling rules.
4. Check `PROGRESS.md` to see if the task is already in flight or blocked on something.
