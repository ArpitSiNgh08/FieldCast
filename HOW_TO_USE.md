# FieldCast — How To Use

A practical guide for running a real sports tournament end-to-end with FieldCast: from creating the tournament and teams, to streaming live video from a mobile phone, to updating scores in real time.

---

## Prerequisites

Before match day, make sure the following are working:

- **Backend running** on `http://localhost:4000` (or your Oracle VM IP in production)
- **Frontend running** on `http://localhost:3000` (or your Vercel URL in production)
- **Database seeded** (or empty — you'll create your own data)
- **Larix Broadcaster** installed on the camera phone(s) — free on iOS and Android

---

## Part 1 — One-Time Local Dev Setup

> Skip this if you've already done it (i.e. `npm run dev` on the backend works without errors).

### 1. Create the database user and database

Open **SQL Shell (psql)** from your Start menu (PostgreSQL 18 folder), or run in PowerShell:

```powershell
$env:PGPASSWORD = "Postgres18"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE USER fieldcast WITH PASSWORD 'fieldcast';"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE fieldcast OWNER fieldcast;"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE fieldcast TO fieldcast;"
```

### 2. Apply the migration

```powershell
cd backend
npx prisma migrate deploy
```

Expected output: `All migrations have been successfully applied.`

### 3. (Optional) Seed sample data

```powershell
npx prisma db seed
```

This inserts sample teams, tournaments, matches, and live states so you have something to look at immediately.

### 4. Start both servers

```powershell
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open `http://localhost:3000` — you should see the fixtures list.

---

## Part 2 — Create Your Own Tournament

### Step 1: Open the Admin Panel

Go to `http://localhost:3000/admin` (or `https://your-vercel-url/admin` in production).

> **Note:** In the current build, admin access requires you to be logged in via Google OAuth. If Google OAuth is not configured, set `ADMIN_EMAILS=your@email.com` in `backend/.env` and bypass auth in development.

### Step 2: Create Teams

For each team in your tournament:

1. Click **"Add Team"** in the admin panel
2. Fill in:
   - **Name** — e.g. `Engineering Eagles`
   - **Short Name** — 2-3 letters, e.g. `ENG` (shown on scorecard)
   - **Sport** — `cricket`, `football`, or `basketball`
3. Click **Save**

Repeat for all teams (minimum 2 per tournament).

### Step 3: Create the Tournament

1. Click **"Add Tournament"**
2. Fill in:
   - **Name** — e.g. `Freshers Cricket Cup 2026`
   - **Sport** — matches the sport of your teams
   - **Format** — `league` (round-robin, everyone plays everyone) or `knockout` (elimination)
   - **Start Date / End Date**
   - **Status** — set to `upcoming` initially
3. Click **Save**

### Step 4: Create Matches (Fixtures)

For each match in the tournament:

1. Click **"Add Match"**
2. Fill in:
   - **Tournament** — select the tournament you just created
   - **Team A** and **Team B** — select from your teams
   - **Sport** — auto-filled from tournament
   - **Scheduled At** — date and time of the match
   - **Status** — `upcoming`
   - **Active Camera** — `camera1` (you'll have one phone for now)
3. Click **Save**

Your fixture now appears on the homepage at `http://localhost:3000`.

---

## Part 3 — Stream Live Video from a Mobile Phone

### What you need

- 1 phone with **Larix Broadcaster** (iOS: App Store, Android: Play Store) — free
- The backend server must be reachable from the phone:
  - **Local network (same WiFi):** use your computer's LAN IP (e.g. `192.168.1.10`)
  - **Over the internet (production):** use the Oracle VM's public IP
- Port **1935** (RTMP) must be open:
  - Locally: Windows Firewall may block it — add an inbound rule for port 1935
  - Oracle VM: open port 1935 in the OCI Security List

### Step 1: Start SRS (the streaming server)

```powershell
# From the project root
docker compose up -d srs
```

SRS starts on:
- Port `1935` — RTMP ingest (phones push here)
- Port `8080` — LL-HLS output (viewers watch here)
- Port `1985` — SRS HTTP API

Check it's running: `docker compose ps` — status should show `Up`.

### Step 2: Configure Larix Broadcaster on the phone

1. Open **Larix Broadcaster**
2. Tap the **gear icon** → **Connections** → **Add new connection**
3. Set:
   - **Name:** `FieldCast Camera 1`
   - **URL:** `rtmp://<YOUR_SERVER_IP>:1935/live/camera1`
     - Replace `<YOUR_SERVER_IP>` with your computer's LAN IP (local) or Oracle VM public IP (production)
     - `camera1` is the **stream key** — it identifies which camera this phone is
4. Tap **Save**

> For a second camera phone, use stream key `camera2`: `rtmp://<IP>:1935/live/camera2`

### Step 3: Start streaming

1. Point the phone at the match
2. In Larix Broadcaster, tap the **red record button**
3. The button turns solid red — you're live

**Verify the stream is reaching SRS:**
Open `http://<YOUR_SERVER_IP>:1985/api/v1/streams` in a browser. You should see a JSON response with your stream listed.

### Step 4: Watch the stream in the frontend

1. Go to `http://localhost:3000` (or the Vercel URL)
2. Find your match in the fixtures list
3. Click **Watch Live**
4. The HLS player loads and begins buffering (first buffer: ~3-5 seconds)

You are now live. 🎉

---

## Part 4 — Update Score in Real Time

Score updates are pushed to all viewers instantly via Socket.io — the overlay redraws without a page refresh.

### How to update the score

Go to `http://localhost:3000/admin` and find your live match, then click **Manage**.

#### Cricket

| Field | What to enter |
|---|---|
| Team A Score (runs) | Current runs on the board |
| Wickets | Wickets fallen |
| Overs | Current over (e.g. `14.3`) |
| Status | `live` |
| Period Label | e.g. `Over 14.3` |

Click **Update Score** — viewers see it instantly.

To add a ball-by-ball event (for the scorecard):
- Fill in the **Cricket Event** form: innings, over number, runs total, wickets, description
- Click **Add Event**

#### Football

| Field | What to enter |
|---|---|
| Team A Score | Goals scored by Team A |
| Team B Score | Goals scored by Team B |
| Period | Half (1 or 2) |
| Period Label | e.g. `67'` |
| Status | `live` |

To add a match event (goal, yellow card, red card, substitution):
- Fill in: half, minute, event type, team, player name
- Click **Add Event** — appears in the live feed on the scorecard

#### Basketball

| Field | What to enter |
|---|---|
| Team A Score | Total points |
| Team B Score | Total points |
| Period | Quarter number (1-4) |
| Period Label | e.g. `Q3 - 4:32` |
| Status | `live` |

Quarter-by-quarter breakdown is tracked in the basketball quarters table for the scorecard.

---

## Part 5 — End the Match

1. In the admin panel, find the match and click **Manage**
2. Set **Status** to `completed`
3. Set **Winner** to the winning team (or leave blank for a draw)
4. Click **Save**

The match status updates on the homepage and scorecard immediately.

### (Optional) Upload the replay to ImageKit

If you recorded the match video locally on the server:

1. Upload the video file to ImageKit using their dashboard or API
2. Get the HLS stream URL from ImageKit (ends in `.m3u8`)
3. In the admin panel, paste the URL into the **Replay URL** field for the match
4. Click **Save**

Viewers can now watch the replay from the match page.

---

## Part 6 — View the Scorecard & Standings

- **Scorecard:** `http://localhost:3000/scorecard/<match-id>` — full ball-by-ball (cricket), event timeline (football), or quarter breakdown (basketball)
- **Standings:** `http://localhost:3000/standings` — points table, filter by tournament
- **Fixtures:** `http://localhost:3000` — upcoming, live, and completed matches

---

## Troubleshooting

### "Port 4000 already in use"
A previous node process is holding the port. Run:
```powershell
$p = (Get-NetTCPConnection -LocalPort 4000 -State Listen).OwningProcess
taskkill /PID $p /F
```
Nodemon will restart automatically — don't run `npm run dev` again in a new terminal.

### "Authentication failed against the database server"
The PostgreSQL service isn't running, or the `fieldcast` user/DB hasn't been created yet.
- Check Windows Services: `postgresql-x64-18` should show as **Running**
- Re-run the CREATE USER / CREATE DATABASE commands from Part 1

### Larix connects but no stream appears in the frontend
- Check SRS is running: `docker compose ps`
- Check the stream key in Larix matches the `activeCamera` value in the match (`camera1`, `camera2`, etc.)
- Check port 1935 is open in your firewall

### Score overlay doesn't update
- Check the browser console for WebSocket connection errors
- Confirm `NEXT_PUBLIC_API_URL` in `frontend/.env.local` points to the correct backend URL
- The backend must be running and accessible from the frontend's host

---

## Quick Reference — Key URLs

| URL | What it is |
|---|---|
| `http://localhost:3000` | Frontend — fixtures list |
| `http://localhost:3000/admin` | Admin panel — manage everything |
| `http://localhost:4000/api/matches` | Backend API — JSON fixture list |
| `http://localhost:4000/api/tournaments` | Backend API — all tournaments |
| `http://<SERVER_IP>:8080/live/camera1.m3u8` | Live HLS stream from camera 1 |
| `http://<SERVER_IP>:1985/api/v1/streams` | SRS API — check active streams |

---

## Stream Key Conventions

| Camera | Larix stream key | SRS path |
|---|---|---|
| Main (sideline) | `camera1` | `/live/camera1` |
| Secondary (end-on) | `camera2` | `/live/camera2` |
| Third (opposite sideline) | `camera3` | `/live/camera3` |

The admin panel's **"Switch Camera"** button sends a command to the backend, which re-pipes the selected camera's RTMP feed into the single viewer-facing output stream.
