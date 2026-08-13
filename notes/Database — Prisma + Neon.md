# Database — Prisma + Neon

Part of [[FieldCast]]

## Tournament workflow models (2026-08-12)
| Model | Purpose |
|---|---|
| `TournamentTeam` | Many-to-many tournament membership for reusable teams |
| `Player` | Reusable player identity owned by its creator |
| `TeamPlayer` | Team-specific jersey number, position, and persisted playing/bench squad role |
| `TournamentOrganizer` | Scoped organiser membership for approved tournaments |
| `MatchCamera` | Match phone name, angle, and unique RTMP stream key |

`Tournament` now includes creator, photo, draft/review state, rejection feedback, and review metadata. `Match` now includes venue and its broadcast checklist. `User` may have a bcrypt password hash.

Migrations:
- `0002_tournament_workflow` — credentials, drafts/review, reusable teams and players
- `0003_organizer_broadcast` — organiser memberships, match cameras, and preflight data
- `0004_football_roster_events` — player-linked football events, jersey snapshots, and added-time minutes

`FootballEvent` now references the reusable `Player`, retains the player's name and jersey snapshot for historical accuracy, and stores `extraTimeMinute` separately from the regulation minute.

Related: [[Tournament Submission]], [[Tournament Organiser]].

## ORM: Prisma 7
- **Only ORM in the project** — no raw pg, no Knex (see [[RULES]])
- Schema: `backend/prisma/schema.prisma`
- Config: `backend/prisma.config.js` (CommonJS, not TypeScript)
- Client singleton: `backend/src/config/prisma.js`

### Prisma 7 constructor pattern (IMPORTANT)
```js
// ✅ Correct — required in Prisma 7
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ❌ Wrong — throws PrismaClientConstructorValidationError
const prisma = new PrismaClient({ datasourceUrl: '...' });
const prisma = new PrismaClient(); // no adapter
```

## Database host: Neon (production)
- Cloud-hosted Postgres with **branch-per-migration** workflow
- New migration → test on a Neon branch → PR → GitHub Actions runs `prisma migrate deploy` on merge
- **Never hand-run migrations against the main/prod DB**

## Local dev: Native Windows PostgreSQL 18
- Runs as Windows service `postgresql-x64-18` on port 5432
- Docker cannot bind this port on Windows — use native Postgres
- One-time setup:
  ```sql
  CREATE USER fieldcast WITH PASSWORD 'fieldcast';
  CREATE DATABASE fieldcast OWNER fieldcast;
  GRANT ALL PRIVILEGES ON DATABASE fieldcast TO fieldcast;
  ```
- Then: `npx prisma migrate deploy` + `npx prisma db seed`

## Schema overview
| Model | Purpose |
|---|---|
| `Match` | Core match row — teams, sport, status, result type (`pending`, `played`, or `washout`), activeCamera |
| `MatchState` | Live overlay data — score, period, status (Socket.io reads this) |

Prisma Client is regenerated automatically before both `npm run dev` and `npm start`. This prevents a migrated database/schema from being queried by a stale runtime client (for example, rejecting the newer `resultType` field).
| `CricketEvent` | Ball-by-ball history |
| `FootballEvent` | Goals, cards, substitutions timeline |
| `BasketballQuarter` | Per-quarter scoring |
| `Tournament` | Tournament container |
| `Team` | Team details |
| `Standing` | Points table row per tournament |
| `User` | Admin users (Google OAuth) |

## Migration workflow
```
local dev → npx prisma migrate dev
           → test against Neon branch
           → open PR
           → merge to main
           → GitHub Actions: npx prisma migrate deploy
```

## Related
- [[Backend — Express + Socket.io]] — reads/writes via Prisma client
- [[CI/CD — GitHub Actions]] — runs migrate deploy on merge
- [[RULES]] — rule 4 (Prisma only), rule 6 (no hand-run migrations), rule 7 (adapter required)
