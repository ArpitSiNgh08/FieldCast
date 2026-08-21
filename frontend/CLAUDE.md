# CLAUDE.md

Claude Code–specific conventions for working on FieldCast. This file supplements `AGENTS.md` — read that first for the general orientation; this file covers how Claude specifically should operate in this repo.

## Working style Arpit prefers

- Default to discussing at the **architecture/design level** before writing implementation code, unless explicitly asked to just write code. Confirm the approach, then implement.
- When a task touches a locked decision (ORM, hosting, migration workflow, UI component sourcing), don't silently deviate — surface the tension and ask, the same way these decisions were worked out in the design discussions that produced README.md, RULES.md, and DESIGN.md.
- This project doubles as an interview-defensible system design portfolio piece. Where there's a choice between "quick hack" and "the version that has a good answer if someone asks about it in an interview" (e.g. CI-driven migrations over hand-run ones, Neon branching over direct prod edits), prefer the latter and be ready to explain why.

## MCP tools available in this repo

- **Untitled UI MCP** — first-choice component source for all UI work. Always check here first.
- **Magic UI MCP** — used only for animated/motion/marketing components not covered by Untitled UI's free tier.
- **shadcn/ui MCP** — used only for base primitives not covered by Untitled UI's free tier.

Full sourcing priority and rules live in `DESIGN.md` — follow it exactly, in order, every time UI is touched.

## Repo file map

- `README.md` — current product behavior, routes, setup, architecture, schema, and deployment phases
- `RULES.md` — hard constraints, non-negotiable
- `DESIGN.md` — UI/component/font/theme rules
- `PROGRESS.md` — living status tracker; update this after meaningful work
- `AGENTS.md` — general agent entry point (tool-agnostic)

## Do

- Read `PROGRESS.md` at the start of a session to pick up context instead of asking Arpit to re-explain state.
- Update `PROGRESS.md` at the end of a session with what changed, what's next, and anything left half-done.
- Update the relevant Obsidian notes in `notes/` when a workflow, route, model, or operational procedure changes.
- Ask before introducing any new dependency, service, or paid resource not already named in `README.md`.
- Copy the singleton pattern from `backend/src/config/prisma.js` for **any** new file that needs a Prisma client — it has the required `@prisma/adapter-pg` wiring. Never call `new PrismaClient()` bare.
- Check `HOW_TO_USE.md` for one-time local dev setup steps (native Postgres user/DB creation).

## Don't

- Don't introduce AWS EC2/S3 while Phase 1 is still active.
- Don't add a second ORM or query builder alongside Prisma.
- Don't hand-run Prisma migrations against the main Neon database — use the branch → PR → GitHub Actions flow.
- Don't build a custom UI component before checking Untitled UI MCP, then Magic UI/shadcn MCP, per `DESIGN.md`.
- Don't introduce a third typeface or a dark theme variant.
- Don't call `new PrismaClient()` without a pg driver adapter — it throws in Prisma 7. Use the singleton in `backend/src/config/prisma.js` instead.
- Don't try to run Docker postgres on Windows dev — native Postgres 18 owns port 5432. Use it directly.
