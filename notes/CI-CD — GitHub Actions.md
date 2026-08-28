# CI/CD — GitHub Actions

Part of [[FieldCast]]

## Workflows

The workflow files are written, and Neon, the Oracle VM, Nginx HTTPS routing, and Vercel now exist. The remaining operational requirement is to verify every GitHub production secret, the Vercel Production API/Socket values, and one completely green deployment after pushing `main`.

### `ci.yml` — runs on every PR
1. Checkout code
2. `npx prisma generate` — validates schema
3. Next.js build — catches type errors and import failures
4. (Tests if added later)

### `deploy.yml` — runs on merge to `main`
1. `npx prisma migrate deploy` — applies pending migrations to Neon production DB
2. SSH into [[Phase 1 — Oracle VM]] → fetch `main`, install production backend dependencies, regenerate Prisma Client, and restart `fieldcast-backend` through systemd (or PM2 if explicitly installed)
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

The initial production bootstrap applied existing migrations from the VM. From now on, use the GitHub Actions deployment job for production migration releases.

## After pushing `main`

1. Confirm **CI** passes.
2. Confirm **Deploy / Prisma migrate deploy** passes and applies pending migrations through `0014_add_penalty_to_football_events`.
3. Confirm **Deploy backend to VM** restarts `fieldcast-backend`; check `systemctl is-active`, recent journal logs, and both local and HTTPS `/api/health`.
4. Confirm **Deploy frontend to Vercel** uses the Production `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` values.
5. Verify the HTTPS `/socket.io` polling handshake, SRS container/API, a two-device score update, immediate Football event delivery, an external-phone stream, finalization, and the homepage Recent matches rail.

Do not also run `prisma migrate deploy` manually when the workflow succeeds. The current workflow does not perform a post-restart health check, and the Vercel job depends on migration but not backend success. A frontend deployment can therefore finish while the backend job fails; inspect every job and follow the SSH step with the service/API checks above.

The 2026-08-26 production dependency audit also found high-severity advisories in the Next.js, Socket.IO parser, and Prisma CLI dependency trees. Dependency upgrades require a separate tested change; do not use `npm audit fix --force` directly on the VM.

The Vercel CLI step runs from the repository root because the linked Vercel project already sets its Root Directory to `frontend`. Running the step from `frontend/` would incorrectly resolve `frontend/frontend`.

## Related
- [[Database — Prisma + Neon]] — migration workflow detail
- [[Phase 1 — Oracle VM]] — deploy target (SSH)
- [[Frontend — Next.js]] — Vercel deploy target
- [[RULES]] — rule 6 (no hand-run migrations)
