# Admin Panel

Part of [[FieldCast]] · Part of [[Frontend — Next.js]]

## URL
`/admin` (requires Google OAuth login with an email in `ADMIN_EMAILS` env var)

## What you can do

### Tournaments
- Create tournament (name, sport, format, dates, status)
- Edit / set status (upcoming → ongoing → completed)

### Teams
- Create team (name, short name, sport)

### Matches (Fixtures)
- Create match (tournament, team A, team B, sport, scheduled time, camera)
- Set match status: `upcoming` → `live` → `completed`
- Set winner team
- Add replay URL (after [[ImageKit]] upload)

### Live score updates (per sport)
- **Cricket:** runs, wickets, overs, period label → pushed via [[Socket.io]] to all viewers
- **Football:** team A goals, team B goals, half, minute → pushed instantly
- **Basketball:** team A points, team B points, quarter → pushed instantly

### Events (for scorecard)
- **Cricket:** add over summary (innings, over, runs, wickets, description)
- **Football:** add event (goal/yellow card/red card/substitution, half, minute, player)
- **Basketball:** add quarter breakdown

### Camera switching
- Click "Switch Camera" → select camera1/camera2/camera3
- Sends command to [[Backend — Express + Socket.io]] → [[Camera Switching]] service re-pipes ffmpeg
- All viewers automatically switch to the new angle

## Related
- [[Frontend — Next.js]] — admin panel lives here
- [[Socket.io]] — score updates are pushed here
- [[Camera Switching]] — triggered from here
- [[ImageKit]] — replay URL entered here
- [[HOW_TO_USE]] — step-by-step guide
