# Tournament Submission

Part of [[FieldCast]]

## User flow
1. A signed-in user opens `/tournaments/new` from the homepage or navbar.
2. They enter the tournament name, sport, format, and optional photo. Without a photo, FieldCast uses `tournament-placeholder.svg`.
3. The tournament is saved as a **draft**.
4. The creator adds teams and builds each roster.
5. Existing player records can be reused across tournaments. Jersey number and position belong to the team membership.
6. Submission validates sport-specific team and roster sizes.
7. An admin approves or rejects it from `/admin/tournaments`.
8. Approved tournaments become public and the creator becomes a [[Tournament Organiser]].

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

## Related
- [[Tournament Organiser]]
- [[Admin Panel]]
- [[Database — Prisma + Neon]]

