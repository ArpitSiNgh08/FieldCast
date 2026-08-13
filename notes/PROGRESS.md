# PROGRESS

Pointer to the living status tracker: `PROGRESS.md`

## Current status (as of 2026-08-13)

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

## 2026-08-12 update

- Detailed context: [[Tournament Submission]] and [[Tournament Organiser]].

- Tournament drafts, reusable players, admin approval/rejection, and approved-only public listings are implemented.
- Approved creators automatically become tournament organisers and can add co-organisers by account email.
- Football organisers can create matches, complete broadcast preflight, register Larix cameras, switch the active feed, and manage live scores/events.
- 2026-08-13: creatorless demo fixtures are hidden from the homepage; Go live now shows explicit blockers, and anonymous one-camera playback falls back directly to the raw SRS HLS feed.
- 2026-08-13: football events now use searchable registered players with jersey/team labels, regulation plus added-time minute, automatic goal scoring, and live full-scorecard refresh.
- 2026-08-13: the public match page now shows its football timeline below the stream and goal scorers with minutes beneath each team score; both refresh from live score updates.
- 2026-08-13: public standings now exclude creatorless seed tournaments and recompute from finalized results; washouts and organiser drag-and-drop Playing 11/bench management are implemented.
- 2026-08-13: fixed stale Prisma Client startup by generating before dev/start, reset existing squads to bench, and fixed squad-editor refresh so roster tiles cannot remain falsely empty.
- 2026-08-13: homepage tournament cards now open a public tournament hub containing teams, live matches, upcoming fixtures, past results, and standings.

## Related
- [[FieldCast]] — project hub
