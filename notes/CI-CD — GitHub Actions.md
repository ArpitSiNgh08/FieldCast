# CI/CD — GitHub Actions

Part of [[FieldCast]]

## Workflows

Workflow files are written, but production secrets, Neon, Oracle VM, and Vercel project linkage are not configured yet.

### `ci.yml` — runs on every PR
1. Checkout code
2. `npx prisma generate` — validates schema
3. Next.js build — catches type errors and import failures
4. (Tests if added later)

### `deploy.yml` — runs on merge to `main`
1. `npx prisma migrate deploy` — applies pending migrations to Neon production DB
2. SSH into [[Phase 1 — Oracle VM]] → `git pull` + `docker compose restart backend`
3. Vercel CLI → deploy [[Frontend — Next.js]]

## Secrets required
| Secret | Value |
|---|---|
| `DATABASE_URL` | Neon connection string (production) |
| `VM_HOST` | Oracle VM public IP |
| `VM_USER` | SSH username (`ubuntu` or `opc`) |
| `VM_SSH_KEY` | Private SSH key (no passphrase) |
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_ORG_ID` | From `vercel whoami` |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` |

## Migration rule
Migrations are **never hand-run against production**. The only valid path:
```
local dev → npx prisma migrate dev (against Neon branch)
         → PR opened
         → Merge to main
         → GitHub Actions: npx prisma migrate deploy
```

## Related
- [[Database — Prisma + Neon]] — migration workflow detail
- [[Phase 1 — Oracle VM]] — deploy target (SSH)
- [[Frontend — Next.js]] — Vercel deploy target
- [[RULES]] — rule 6 (no hand-run migrations)
