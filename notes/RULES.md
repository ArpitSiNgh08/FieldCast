# RULES

Pointer to [[FieldCast]]'s hard constraints document: `RULES.md`

## Non-negotiable rules (summary)

### Infrastructure
- No AWS EC2/S3 in Phase 1 — [[Phase 1 — Oracle VM]] only
- Local disk → [[ImageKit]] → delete (no S3 in Phase 1)
- Deploy target must stay swappable ([[Phase 1 — Oracle VM]] ↔ [[Phase 2 — AWS EC2]])

### Database & ORM
- Prisma 7 is the only ORM — see [[Database — Prisma + Neon]]
- Neon is the only DB host
- Migrations go through [[CI/CD — GitHub Actions]] — never hand-run against prod
- Prisma 7 requires `@prisma/adapter-pg` — bare `new PrismaClient()` throws

### Architecture
- [[Rejected — mediasoup]] — permanently rejected
- [[Camera Switching]] via ffmpeg child processes — do not replace

### UI
- Component sourcing: Untitled UI → Magic UI → shadcn → custom (strict order)
- Fonts: Geist + Inter only
- Theme: light only
- Full rules in [[DESIGN]]

### Local dev (Windows)
- Native Windows PostgreSQL 18 owns port 5432 — do not use Docker Postgres
