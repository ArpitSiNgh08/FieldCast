# PROGRESS

Pointer to the living status tracker: `PROGRESS.md`

## Current status (as of 2026-07-22)

### Done ✅
- [[Database — Prisma + Neon]] — schema, migration, seed all working locally
- [[Backend — Express + Socket.io]] — running on :4000 with no errors
- [[Frontend — Next.js]] — all pages built, running on :3000
- [[CI/CD — GitHub Actions]] — CI + deploy workflows written (secrets not yet added)
- [[HOW_TO_USE]] — end-user guide created

### Not started ⬜
- Neon project provisioning (need `DATABASE_URL` from Neon dashboard)
- [[Phase 1 — Oracle VM]] provisioning (install Docker, deploy, run SRS)
- GitHub Actions secrets (see `PROGRESS.md` Note 4 for full list)
- Vercel deployment (`vercel link` in `frontend/`)
- End-to-end stream test (phone → SRS → viewer)
- [[ImageKit]] VOD integration (post-match upload + `replayUrl`)

## Next up
1. Verify `http://localhost:4000/api/matches` returns seeded JSON
2. Verify `http://localhost:3000` shows fixtures
3. Provision Neon → get DATABASE_URL
4. Add GitHub Secrets
5. Provision Oracle VM → deploy
6. Stream test with Larix

## Related
- [[FieldCast]] — project hub
