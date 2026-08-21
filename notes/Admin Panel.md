# Admin Panel

Part of [[FieldCast]] · Part of [[Frontend — Next.js]]

## URLs and access
- `/admin` — completed-match/event corrections and persistent standings overrides
- `/admin/tournaments` — tournament submission review

Access requires a JWT account with global `admin` role. The backend can bootstrap the local admin from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`; admin email whitelisting remains available for Google OAuth.

## Tournament review
- Lists submitted [[Tournament Submission]] records.
- Admins approve or reject submissions; rejection requires feedback.
- Approval makes the tournament public.
- Approval automatically gives its creator a [[Tournament Organiser]] membership.
- Organiser access is scoped to that tournament and does not grant global admin privileges.

## Operational boundary

The admin workflow has two surfaces:
- `/admin/tournaments` reviews submitted tournaments.
- `/admin` corrects historical data for completed matches: final scores, Football timeline events, and standings overrides.

Admin correction APIs reject upcoming and live matches. A global admin has no automatic live match-management authorization; the account must also be explicitly added to the tournament's organiser list to operate a live fixture. Standings overrides persist across match-derived recomputation and can be reset to calculated values.

Approved Football tournaments are operated through `/organizer` and `/organizer/matches/[id]`, where tournament-scoped permissions protect fixtures, lineups, cameras, score events, results, and washouts. Automatic ImageKit replay upload and complete Cricket/Basketball live-control surfaces remain future work.

## Related
- [[Tournament Submission]]
- [[Tournament Organiser]]
- [[Socket.io]]
- [[Camera Switching]]
- [[ImageKit]]
