# Tournament Submission

Part of [[FieldCast]]

## User flow
1. A signed-in user opens `/tournaments/new` from the homepage or navbar.
2. They enter the tournament name, sport, and optional photo. They may also enable pools, starting with editable Pool A and Pool B entries and adding further pools as needed. Without a photo, FieldCast uses `tournament-placeholder.svg`.
3. The tournament is saved as a **draft**.
4. The creator adds teams, chooses a pool for each team when pools are enabled, and builds each roster. Pools can also be added later while the tournament is editable.
5. Existing player records can be reused across tournaments. Jersey number and position belong to the team membership. The first sport-sized group registered becomes the default starting squad; later players begin on the bench.
6. Submission validates sport-specific team and roster sizes and requires every team in a pooled tournament to have a pool.
7. An admin approves or rejects it from `/admin/tournaments`.
8. Approved tournaments become public and the creator becomes a [[Tournament Organiser]].
9. The homepage links the approved tournament to `/tournaments/[id]`, its public hub for teams, fixtures, results, and standings.

## Workflow states
`draft` → `submitted` → `approved` or `rejected`

- Draft/rejected: creator can edit.
- Submitted: editing pauses during review.
- Rejected: admin feedback is shown and the creator can revise/resubmit.
- Approved: tournament is public and its matches can be managed by organisers.

## Current roster validation
| Sport | Teams | Players per team |
|---|---:|---:|
| Cricket | 2–16 | 11–15 |
| Football | 2–32 | 11–23 |
| Basketball | 2–32 | 5–15 |

## Key routes
- `/tournaments` — creator drafts and submission history
- `/tournaments/new` — create draft
- `/tournaments/[id]/edit` — teams and roster editor
- `/admin/tournaments` — admin review queue
- `/tournaments/[id]` — public tournament hub after approval

## Related
- [[Tournament Organiser]]
- [[Admin Panel]]
- [[Database — Prisma + Neon]]
