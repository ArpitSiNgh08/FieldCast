# Database — Prisma + Neon

Part of [[FieldCast]]

## Tournament workflow models (2026-08-12)
| Model | Purpose |
|---|---|
| `TournamentTeam` | Many-to-many tournament membership for reusable teams |
| `TournamentPool` | Ordered creator-defined pools within a tournament |
| `Player` | Reusable player identity owned by its creator |
| `TeamPlayer` | Team-specific jersey number, position, and persisted playing/bench squad role |
| `TournamentOrganizer` | Scoped organiser membership for approved tournaments |
| `MatchCamera` | Match phone name, angle, and unique RTMP stream key |
| `StandingOverride` | Persistent admin correction layered over calculated standings |

`Tournament` now includes creator, photo, draft/review state, rejection feedback, and review metadata. `Match` now includes venue and its broadcast checklist. `User` may have a bcrypt password hash.

Migrations:
- `0001_init` — initial core, match state, sport event, and standings schema
- `0002_tournament_workflow` — credentials, drafts/review, reusable teams and players
- `0003_organizer_broadcast` — organiser memberships, match cameras, and preflight data
- `0004_football_roster_events` — player-linked football events, jersey snapshots, and added-time minutes
- `0005_washouts_and_squads` — match result type plus persisted playing/bench membership
- `0006_reset_existing_squads_to_bench` — historical reset to explicit bench selection (later superseded for empty lineups by `0011`)
- `0007_admin_corrections` — persistent per-team standings overrides for historical admin corrections
- `0008_tournament_pools` — tournament pools and per-team pool membership
- `0009_match_stages` — pool/knockout fixture classification and knockout round labels
- `0010_substitution_players` — outgoing/incoming Football player links and historical snapshots
- `0011_default_starting_squads` — repairs empty lineups and establishes sport-sized default starters

`FootballEvent` references reusable players, retains name/jersey snapshots for historical accuracy, stores `extraTimeMinute` separately, and captures both outgoing and incoming players for substitutions.

Calculated standings are replaced inside a transaction protected by a tournament-scoped PostgreSQL advisory lock. This serializes concurrent result/correction recomputations and prevents duplicate `(tournament_id, team_id)` inserts.

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
| `User` | bcrypt/JWT or Google identity and global viewer/admin role |
| `Tournament` | Creator, photo, draft/review lifecycle, public metadata |
| `TournamentOrganizer` | Tournament-scoped management role |
| `TournamentTeam` | Tournament/team membership |
| `TournamentPool` | Ordered pool metadata and team grouping |
| `Team` | Reusable team identity |
| `Player` | Reusable player identity |
| `TeamPlayer` | Team jersey, position, and playing/bench role |
| `Match` | Core match row — teams, pool/knockout stage, sport, status, result type, and activeCamera |
| `MatchState` | Live overlay data — score, period, status (Socket.io reads this) |
| `CricketEvent` | Ball-by-ball history |
| `FootballEvent` | Goals, cards, substitutions timeline |
| `BasketballQuarter` | Per-quarter scoring |
| `Standing` | Points table row per tournament |
| `StandingOverride` | Persistent admin-supplied values layered over calculated rows |

Prisma Client is regenerated automatically before both `npm run dev` and `npm start`. This prevents a migrated database/schema from being queried by a stale runtime client (for example, rejecting the newer `resultType` field).

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
