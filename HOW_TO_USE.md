# FieldCast — How to Use

This guide covers the current end-to-end FieldCast workflow: local setup, account creation, tournament submission, admin approval, squad selection, Football fixture creation, mobile streaming, live scoring, match completion, washouts, and public viewing.

The tournament workflow supports Cricket, Football, and Basketball. The full broadcast-control and live-event workflow is currently implemented for Football.

## 1. Local setup

### Prerequisites

- Node.js and npm.
- Native PostgreSQL 18 on Windows, listening on port `5432`.
- Docker Desktop when using SRS locally.
- IRL Pro, Larix Broadcaster, or another custom RTMP/SRT broadcaster on each camera phone.
- ffmpeg on `PATH`, or configured by absolute `FFMPEG_PATH`, for real multi-camera switching. It is optional when `SIMULATE_STREAM=true`.

### Configure the backend

New-NetFirewallRule -DisplayName "FieldCast SRT UDP 10080" -Direction Inbound -Protocol UDP -LocalPort 10080 -Action Allow -Profile Private,Public

```powershell
cd backend
Copy-Item .env.example .env
npm install
```

Configure `backend/.env`:

```dotenv
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgres://fieldcast:fieldcast@localhost:5432/fieldcast
JWT_SECRET=replace-with-a-long-random-secret
SESSION_SECRET=replace-with-another-long-random-secret
ADMIN_EMAIL=admin@fieldcast.local
ADMIN_PASSWORD=replace-with-a-secure-password
ADMIN_NAME=FieldCast Admin
SIMULATE_STREAM=true
RTMP_HOST=localhost
RTMP_PORT=1935
SRT_PORT=10080
SRS_HLS_BASE=http://localhost:8080
SRS_API_BASE=http://localhost:1985
FFMPEG_PATH=ffmpeg
# Optional organizer clip capture / Google Drive upload
CLIPS_ENABLED=false
# GOOGLE_DRIVE_FOLDER_ID=your-drive-folder-id
# GOOGLE_DRIVE_CLIENT_EMAIL=clip-uploader@your-project.iam.gserviceaccount.com
# GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Google OAuth is optional. Credential signup/login works without Google credentials. To enable organizer clips, set `CLIPS_ENABLED=true`, provide the three Google Drive values, share the destination folder with the service-account email, and deploy migration `0015_clip_jobs`. Credentials stay on the backend and are never sent to the browser.

### Create the local database once

Run these statements as the PostgreSQL superuser:

```sql
CREATE USER fieldcast WITH PASSWORD 'fieldcast';
CREATE DATABASE fieldcast OWNER fieldcast;
GRANT ALL PRIVILEGES ON DATABASE fieldcast TO fieldcast;
```

Apply the schema and optionally load seed data:

```powershell
cd backend
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
```

The repository currently contains migrations `0001` through `0014`. Migration `0012_match_viewers` is required for the live/unique viewer counters; `0013` enables duplicate jersey numbers within a team and `0014` stores penalty-goal metadata.

### Start the application

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- API health: `http://localhost:4000/api/health`

Run only one backend/nodemon instance at a time.

## 2. Create an account and administrator

Open `http://localhost:3000/auth` to sign up or log in with email and password. Passwords are hashed with bcrypt and successful authentication returns a JWT.

The backend bootstraps the administrator configured through:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

Use that account to review tournament submissions at `/admin/tournaments`.

## 3. Create and submit a tournament

1. Sign in and open `/tournaments/new`.
2. Enter the tournament name, sport, dates, and optional image. Turn on **Use pools** to start with Pool A and Pool B, rename them, or add more pools.
3. Save the draft. If no image is supplied, FieldCast uses its tournament placeholder.
4. Add at least two teams. For a pooled tournament, choose each team’s pool; teams can be moved between pools while the draft is editable.
5. Add players to every team. A player identity can be reused in other teams/tournaments; jersey number and position belong to the team membership. Duplicate jersey numbers are allowed within a team, but the same player cannot be added twice to one team.
6. Continue editing from `/tournaments` as needed.
7. Submit the tournament for review.

Submission validates roster sizes:

| Sport | Team count | Players per team |
|---|---:|---:|
| Cricket | 2–16 | 11–15 |
| Football | 2–32 | 11–23 |
| Basketball | 2–32 | 5–15 |

Workflow states are `draft → submitted → approved/rejected`.

- Draft and rejected tournaments can be edited.
- Submitted tournaments are locked during review.
- A rejection includes admin feedback and can be revised and resubmitted.
- Approval makes the tournament public and makes its creator the first organiser.

## 4. Review a tournament

1. Log in with the configured administrator account.
2. Open `/admin/tournaments`.
3. Inspect a submitted tournament’s teams and rosters.
4. Approve it, or reject it with a reason.

Approval does not grant the creator global admin access. It grants tournament-scoped organiser access only.

## 5. Prepare teams and fixtures

Open `/organizer` and choose an approved tournament you manage.

### Select the Playing 11

For a team without a saved lineup, its first 11 registered Football players are assigned to the Playing 11 automatically. Further players begin on the bench. Basketball uses five default starters; Cricket uses eleven.

1. Choose the team to edit.
2. Review the automatically assigned starters, then drag player tiles between **Bench** and **Playing 11**. The **Move** button is an accessible alternative to dragging.
3. Select exactly 11 players.
4. Press **Save playing squad**.

The Football event picker begins with the saved/default Playing 11 and follows match substitutions, so incoming players become available for later events.

### Add organisers

Enter the email of an existing FieldCast account in the Organisers card. That user receives access to scores, fixtures, camera configuration, and lineups for this tournament only.

Multiple organisers may open the same live match control room. Score and active-camera changes are broadcast through the match's Socket.io room, so an update from one phone appears on the other organiser devices and on the public match page. Football scores are read-only totals in the control form: recording a goal increments the current server score, while cards and substitutions cannot overwrite it with stale screen data.

The global admin account cannot control a live match unless it has also been explicitly added as a tournament organiser. `/admin` is a historical-corrections workspace: choose an approved tournament to correct a completed match's final score, add/edit/delete Football timeline events, or apply/reset a persistent standings override. Tournament review remains at `/admin/tournaments`.

### Create a Football match

1. Choose whether the fixture belongs to a pool or the knockout stage.
2. For a pool fixture, choose the pool; only teams assigned to that pool can be selected.
3. For a knockout fixture, choose the built-in **Semi-final** or **Final**, or add another stage such as Round of 16 or Quarterfinal.
4. Choose different home and away teams.
5. Set kickoff time and venue.
6. Press **Create match & prepare stream**.

Knockout results do not change pool standings.
The public tournament hub and `/standings` arrange knockout fixtures into a connected bracket. Matches sharing a stage become one column, such as SF 1 and SF 2 feeding the Final; earlier custom stages such as Quarterfinal or Round of 16 are added as preceding columns automatically.

Every win awards three points and a draw awards one point. Football standings show **GD** (goal difference) instead of separate goals-for and goals-against columns.

If the fixture cannot be played, select **Declare this fixture a washout** while creating it. A washout is completed without changing standings.

## 6. Stream from mobile phones

### Start SRS

From the repository root:

```powershell
docker compose up -d srs
docker compose ps
```

Default ports:

| Port | Purpose |
|---:|---|
| `1935` | RTMP ingest |
| `10080/UDP` | SRT ingest (recommended for IRL Pro) |
| `8080` | HLS playback |
| `1985` | SRS HTTP API |

For a phone on the same Wi-Fi network, set `RTMP_HOST` to the computer’s LAN IP. `localhost` is not reachable from another device.

### Add a match camera

1. Open `/organizer/matches/[match-id]`.
2. Add a descriptive camera name. Camera angle selection is not required.
3. FieldCast generates a unique stream key and displays an IRL Pro SRT URL plus an RTMP fallback URL.
4. Press **Show QR** beside the desired protocol and scan it with the streaming phone. The adjacent **Copy link** action remains available.
5. Add one camera entry for every phone.

Do not invent fixed `camera1`/`camera2` keys; current match cameras use server-generated keys such as `match8_ab12cd34ef`.

### Configure IRL Pro, Larix, or another broadcaster

For IRL Pro, use SRT/Caller mode with the exact recommended URL shown on the organiser page:

```text
srt://SERVER:10080?streamid=#!::r=live/MATCH_CAMERA_KEY,m=publish
```

IRL Pro may request these as separate values. In that case enter `srt://SERVER:10080` in its Server field and `#!::r=live/MATCH_CAMERA_KEY,m=publish` in its Stream ID field. On iPhone, Moblin can publish the same custom SRT/Caller destination without Larix Broadcaster's free-tier overlay.

If RTMP is stable, it remains fully supported and is not necessary to replace. Larix and other RTMP broadcasters use:

```text
rtmp://SERVER:1935/live/MATCH_CAMERA_KEY
```

Recommended settings:

- Landscape orientation.
- H.264, 1080p, 30 fps.
- 4–6 Mbps video bitrate.
- AAC audio.
- Two-second keyframe interval.
- Disable auto-lock and use external power where possible.

Start publishing and verify the stream at:

```text
http://SERVER:1985/api/v1/streams
```

The corresponding HLS URL is:

```text
http://SERVER:8080/live/MATCH_CAMERA_KEY.m3u8
```

### Go live

The Football control room requires a kickoff time, venue, and at least one registered camera. Configure the phone with the generated SRT destination (or RTMP fallback), start publishing, then press **Go live**. There is no separate broadcast checklist gate.

The match appears in **Live now** on the public homepage and tournament hub. During the match, use **Mark halftime** to publish the halftime state. The half is derived automatically from the entered minute. **End stream & finalize** publishes full time and recalculates the result and standings.

For one camera, the public player uses the raw camera HLS manifest. For multiple cameras, ffmpeg republishes the selected camera to `active_[matchId].m3u8`, allowing cuts without changing the viewer URL.

## 7. Update the Football scorecard

During a live match:

1. Choose Goal, Yellow card, Red card, or Substitution.
2. Enter the regulation minute. The half is assigned automatically from the minute.
3. Optionally enter the extra-time minute. For `45+2'`, enter `45` and `2`.
4. For a goal or card, search and choose a player currently on the field.
5. For a substitution, choose **Player off** from the players currently on the field, then choose **Player on** from that team’s substitutes.
6. For a goal, optionally check **Goal scored as penalty**. Press **Update scorecard** or **Record substitution**. Use **Mark halftime** for the halftime event; full time is created by **End stream & finalize**.

Recorded substitutions appear in the organiser’s match timeline and all public event timelines with both players clearly labelled. Match-specific active-player tracking means the incoming player can receive later goals or cards without changing the tournament’s saved squad for future fixtures.

The backend validates the player’s team and current match participation. It saves the event, records the penalty flag when applicable, automatically increments the correct team for goals, and broadcasts the state through Socket.io immediately.

Public score updates are temporarily held for 15 seconds to better align with delayed HLS video, while Football event/timeline updates are immediate. The setting is the code constant `SCORE_SYNC_DELAY_MS = 15_000` in `frontend/src/hooks/useMatchState.ts`; it is not an environment variable. Realtime delivery in production additionally depends on Vercel’s `NEXT_PUBLIC_SOCKET_URL` pointing to the HTTPS backend/Nginx origin.

Public viewers see:

- The updated compact score graphic.
- Goal scorers and minutes below the correct team score.
- The match timeline below the stream.
- The refreshed detailed scorecard at `/scorecard/[match-id]`.

## 8. End a match or declare a washout

### Normal completion

Press **End stream & finalize**. FieldCast:

- Stops the camera switcher.
- Marks the match completed with `resultType=played`.
- Derives the winner or draw from the final score.
- Recomputes tournament standings immediately.
- Broadcasts the completed status so open viewer pages stop playback and show **Live stream has ended** without a reload, even if the phone is still publishing.

### Washout

A washout can be declared:

- During match creation.
- Before going live.
- While live using **End & declare washout**.

Washouts stop the broadcast and appear as completed fixtures, but do not change played, wins, draws, losses, goals/points for or against, or table points.

## 9. Public viewing

| URL | Purpose |
|---|---|
| `/` | Approved tournaments and live/upcoming/recent matches |
| `/tournaments/[id]` | Tournament teams, live/upcoming/past matches, and standings |
| `/matches/[id]` | Stream, live score graphic, goal scorers, and timeline |
| `/scorecard/[id]` | Detailed scorecard |
| `/standings` | All active approved tournament tables |
| `/standings?tournament=[id]` | One tournament’s standings |

Public viewing does not require login.

Live match pages display both the current active-browser count and an anonymous unique-browser total for that match. Multiple tabs from the same browser count once; clearing browser storage counts as a new browser.

The homepage orders **Recent matches** by the match-state update written during finalization, rather than by the originally scheduled kickoff. A successfully finalized match should therefore move into the first eight recent results after the new frontend is deployed and refreshed.

## 10. Troubleshooting

### Production API or Socket.IO is unreachable

On the VM, verify the service and listener first:

```bash
systemctl is-active fieldcast-backend
sudo ss -ltnp | grep ':4000'
sudo ufw status verbose
```

The service must be `active`, and Node should listen internally on `4000`. Production browsers should use the Nginx HTTPS origin: `/api` and `/socket.io` proxy to the backend, while `/live` proxies to SRS HLS. Ensure the Socket.IO location forwards the `Upgrade` and `Connection` headers.

Set the backend `FRONTEND_URL` to the exact Vercel production origin, without a trailing path, because both Express and Socket.IO use it for CORS. Keep direct `4000/TCP`, `8080/TCP`, and SRS API `1985/TCP` closed publicly after the HTTPS routes work.

### `Unknown argument resultType`

The backend is using a stale generated Prisma Client:

1. Stop every backend and nodemon instance.
2. Run `npm run db:migrate:deploy` from `backend/`.
3. Run `npm run db:generate`.
4. Start exactly one backend with `npm run dev`.

`predev` and `prestart` now regenerate Prisma automatically.

### `EADDRINUSE :::4000`

Another backend owns port `4000`:

```powershell
netstat -ano | Select-String ':4000\s+.*LISTENING'
```

Confirm the PID belongs to FieldCast, stop that process tree, then start one backend instance. Do not open multiple backend dev terminals.

### The phone publishes but the page has no video

- Confirm SRS is running with `docker compose ps`.
- Confirm the phone can reach `RTMP_HOST:1935`.
- For IRL Pro, try the displayed SRT URL and confirm UDP port `10080` is reachable.
- Check `/api/v1/streams` for the exact generated camera key.
- Check that frames/receive bitrate are increasing, not merely that `publish.active` is true.
- Open the camera-specific `.m3u8` URL to isolate playback from camera switching.
- Check Windows Firewall and router/network isolation.

### Camera switching logs `spawn ffmpeg ENOENT`

- Install ffmpeg.
- Set `FFMPEG_PATH` to `ffmpeg` when it is on `PATH`, or use the absolute path to `ffmpeg.exe`.
- Restart nodemon after changing `.env`.

### Standings logs `P2002` for tournament/team

Current standings writes are serialized with a PostgreSQL advisory lock. Restart the backend so it loads the updated service; concurrent recomputations are then safe.

### Score updates fail

- Confirm the match is live.
- Confirm the organiser manages that tournament.
- Save exactly 11 Playing 11 players first.
- Select a player from the current match teams.
- Verify `NEXT_PUBLIC_SOCKET_URL` points to the running backend.

## 11. Production after pushing `main`

Pushing to `main` triggers `.github/workflows/deploy.yml`. Before the first automated deploy, add these GitHub **production environment** secrets:

- `DATABASE_URL`
- `VM_HOST`
- `VM_USER`
- `VM_SSH_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Set these Vercel **Production** variables and redeploy if they were added or changed:

```dotenv
NEXT_PUBLIC_API_URL=https://<duckdns-host>
NEXT_PUBLIC_SOCKET_URL=https://<duckdns-host>
```

The URL contains only the origin; the frontend appends `/api`, and Socket.IO uses `/socket.io`. The backend VM's `/opt/fieldcast/backend/.env` should retain at least:

```dotenv
NODE_ENV=production
FRONTEND_URL=https://<vercel-production-host>
DATABASE_URL=<neon-production-url>
JWT_SECRET=<long-random-secret>
SESSION_SECRET=<different-long-random-secret>
SIMULATE_STREAM=false
RTMP_HOST=<duckdns-host-without-scheme>
RTMP_PORT=1935
SRT_PORT=10080
SRS_HLS_BASE=https://<duckdns-host>
SRS_API_BASE=http://127.0.0.1:1985
FFMPEG_PATH=/usr/bin/ffmpeg
```

After the push:

1. Wait for both GitHub Actions workflows. **CI** must compile the frontend; **Deploy** must complete the migration, backend, and Vercel jobs. Do not manually run `prisma migrate deploy` against production when the job succeeded.
2. Confirm the backend restarted cleanly:

   ```bash
   sudo systemctl is-active fieldcast-backend
   sudo journalctl -u fieldcast-backend -n 100 --no-pager
   curl -fsS http://127.0.0.1:4000/api/health
   curl -fsS https://<duckdns-host>/api/health
   ```

3. Confirm Socket.IO passes through Nginx. A polling request should return a Socket.IO open packet beginning with `0`:

   ```bash
   curl -sS 'https://<duckdns-host>/socket.io/?EIO=4&transport=polling'
   ```

4. Confirm SRS and ffmpeg prerequisites:

   ```bash
   cd /opt/fieldcast
   sudo docker compose ps srs
   curl -fsS http://127.0.0.1:1985/api/v1/streams/
   ffmpeg -version
   ```

5. Verify migrations through `0014_add_penalty_to_football_events` were applied by checking the successful migration job. They are required before relying on duplicate jersey numbers or penalty-goal metadata.
6. Open the Vercel site in a fresh/private browser, sign in as an organiser, update a test score, and confirm the Football event appears immediately while the public score follows the temporary 15-second holdback.
7. Run a real external-phone SRT test, confirm HTTPS HLS playback, finalize the match, refresh `/`, and confirm it appears under **Recent matches**.

Before tournament use, also rotate the Neon credential exposed during bootstrap, update both the VM `.env` and GitHub `DATABASE_URL` secret, verify TLS renewal, and remove public `4000`, `8080`, and `1985` rules. Run `npm audit --omit=dev` in both projects: the 2026-08-26 audit found five high-severity frontend findings (including `next@16.2.10`) and five high/four moderate/one low backend findings (mainly Prisma CLI tooling and Socket.IO parser). Upgrade deliberately and rerun build/smoke tests rather than using a blind forced audit fix. Automatic replay recording/upload is not implemented, and Cricket/Basketball still lack the complete Football live-control workflow.

## Replays

The schema and viewer support `replayUrl`, but automatic recording/upload to ImageKit is not implemented yet. ImageKit remains the planned Phase 1 replay delivery service.
