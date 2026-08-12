# Admin Panel

Part of [[FieldCast]] · Part of [[Frontend — Next.js]]

## URLs and access
- `/admin` — legacy match/stream administration
- `/admin/tournaments` — tournament submission review

Access requires a JWT account with global `admin` role. The backend can bootstrap the local admin from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`; admin email whitelisting remains available for Google OAuth.

## Tournament review
- Lists submitted [[Tournament Submission]] records.
- Admins approve or reject submissions; rejection requires feedback.
- Approval makes the tournament public.
- Approval automatically gives its creator a [[Tournament Organiser]] membership.
- Organiser access is scoped to that tournament and does not grant global admin privileges.

## Legacy match operations
- View active/upcoming matches and stream health.
- Start/end matches and confirm results.
- Update cricket, football, and basketball score state.
- Add sport-specific scorecard events.
- Switch camera feeds.
- Store ImageKit replay URLs.

New user-created football tournaments should normally be operated through `/organizer` and `/organizer/matches/[id]`.

## Related
- [[Tournament Submission]]
- [[Tournament Organiser]]
- [[Socket.io]]
- [[Camera Switching]]
- [[ImageKit]]
