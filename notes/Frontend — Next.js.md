# Frontend — Next.js

Part of [[FieldCast]]

## Tournament and organiser pages (2026-08-12)
| Route | Purpose |
|---|---|
| `/auth` | JWT/bcrypt email login and signup |
| `/tournaments` | Creator drafts and submission history |
| `/tournaments/new` | Create a tournament draft |
| `/tournaments/[id]/edit` | Edit teams and reusable player rosters |
| `/admin/tournaments` | Admin approval/rejection queue |
| `/organizer` | Select and operate approved tournaments |
| `/organizer/matches/[id]` | Football preflight, cameras, active feed, and scorecard |

`TournamentEditor.tsx` owns the draft/team/roster UI. See [[Tournament Submission]] and [[Tournament Organiser]].

## What it does
- Fixtures list (homepage) — upcoming, live, and completed matches
- Live match viewer — HLS.js video player + Canvas score overlay
- Scorecard — cricket ball-by-ball, football timeline, basketball quarters
- Standings / points table
- Admin panel — create/manage tournaments, matches, score updates
- Auth callback — Google OAuth

## Stack
- Next.js (App Router)
- hls.js — plays the LL-HLS stream from [[Streaming — SRS + LL-HLS]]
- [[Socket.io]] client — receives live score pushes
- Vanilla CSS (no Tailwind) — see [[DESIGN]] for rules

## Port
`3000` — start with `npm run dev` from `frontend/`

## Deployment
**Vercel free tier** — no raw ports needed, purely HTTP

## Key pages
| Route | What it shows |
|---|---|
| `/` | Fixtures list |
| `/matches/[id]` | Live player, team goal-scorer summary, and football event timeline |
| `/scorecard/[id]` | Detailed match scorecard |
| `/standings` | Points table (filter by tournament) |
| `/tournaments/[id]` | Public tournament hub with teams, live/upcoming/past matches, and standings |
| `/admin` | Admin panel |
| `/auth/callback` | Google OAuth return |

## Key components
| Component | Purpose |
|---|---|
| `HlsPlayer.tsx` | hls.js wrapper — loads m3u8, handles errors |
| `ScoreOverlay.tsx` | Live score graphic with football goal scorers grouped below each team score |
| `FootballTimeline.tsx` | Shared football event timeline with regulation and extra-time minutes |
| `Navbar.tsx` | Navigation |
| `Badge.tsx` / `Card.tsx` | UI primitives |

## UI rules (from [[DESIGN]])
- **Fonts:** Geist (headings) + Inter (body) only
- **Theme:** Light only — no dark mode
- **Components:** Untitled UI MCP → Magic UI → shadcn → custom (in that priority order)

## Env vars
```
NEXT_PUBLIC_API_URL=http://localhost:4000   # or Oracle VM IP in prod
```

## Related
- [[Streaming — SRS + LL-HLS]] — video stream source
- [[Socket.io]] — real-time score updates
- [[Backend — Express + Socket.io]] — API + WebSocket server
- [[DESIGN]] — UI constraints
- [[Admin Panel]] — admin UI lives here
