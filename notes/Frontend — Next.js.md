# Frontend — Next.js

Part of [[FieldCast]]

## Tournament and organiser pages (current 2026-08-21)
| Route | Purpose |
|---|---|
| `/auth` | JWT/bcrypt email login and signup |
| `/tournaments` | Creator drafts and submission history |
| `/tournaments/new` | Create a tournament draft |
| `/tournaments/[id]/edit` | Edit teams and reusable player rosters |
| `/tournaments/[id]` | Public tournament hub with teams, live/upcoming/past matches, and standings |
| `/admin` | Completed-match, Football-event, and standings corrections |
| `/admin/tournaments` | Admin approval/rejection queue |
| `/organizer` | Select approved tournaments, manage organisers, fixtures, and Playing 11/bench squads |
| `/organizer/matches/[id]` | Football broadcast setup, cameras, active feed, score events, halftime, and completion |
| `/help` | Public setup guide for tournaments, Android cameras, streaming, switching, and support |

`TournamentEditor.tsx` owns the draft/team/roster UI. See [[Tournament Submission]] and [[Tournament Organiser]].

## What it does
- Fixtures list (homepage) — upcoming, live, and completed matches
- Live match viewer — hls.js player, score graphic, Football goal scorers, and event timeline
- Scorecard — cricket ball-by-ball, football timeline, basketball quarters
- Standings / points table
- Admin review queue plus organiser-scoped match/broadcast controls
- Auth callback — Google OAuth
- Public Help page with Android/Moblin SRT setup, H.264/AAC recommendations, and support contact
- Tournament logo crop editor with zoom and optional background color; homepage tiles use a square logo area

## Stack
- Next.js (App Router)
- hls.js — plays the LL-HLS stream from [[Streaming — SRS + LL-HLS]]
- [[Socket.io]] client — receives live score pushes
- Tailwind CSS plus shared UI primitives — see [[DESIGN]] for rules

## Port
`3000` — start with `npm run dev` from `frontend/`

## Deployment
**Vercel free tier** — deployment is live. Production `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` must both point to the HTTPS DuckDNS/Nginx origin; these public variables are embedded during the Vercel build, so changing them requires a production redeploy.

## Key pages
| Route | What it shows |
|---|---|
| `/` | Approved tournaments and public live/upcoming/recent fixtures |
| `/matches/[id]` | Live player, team goal-scorer summary, and football event timeline |
| `/scorecard/[id]` | Detailed match scorecard |
| `/standings` | Points table (filter by tournament) |
| `/tournaments/[id]` | Public tournament hub with pool tables and a connected knockout bracket |
| `/admin` | Historical correction workspace; no live controls |
| `/admin/tournaments` | Tournament approval/rejection queue |
| `/auth/callback` | Google OAuth return |

## Key components
| Component | Purpose |
|---|---|
| `HlsPlayer.tsx` | hls.js wrapper — loads m3u8, handles errors |
| `ScoreOverlay.tsx` | Live score graphic with football goal scorers grouped below each team score |
| `FootballTimeline.tsx` | Shared football event timeline with regulation and extra-time minutes |
| `KnockoutBracket.tsx` | Stage-grouped bracket with feeder connections, promoted semifinal winners, and live Final refresh |
| `ScorecardLiveRefresh.tsx` | Refreshes scores, brackets, and ended-state UI on score/status room events |
| `SquadEditor.tsx` | Drag-and-drop Playing 11 and bench editor |
| `Navbar.tsx` | Navigation |
| `Badge.tsx` / `Card.tsx` | UI primitives |

The organiser camera card offers on-demand QR codes and labeled copy actions for the generated IRL Pro SRT URL and RTMP destination. Mobile/Moblin SRT controls are temporarily hidden. The homepage ranks recent matches by `MatchState.updatedAt`, which finalization updates, instead of by the original kickoff time.

## UI rules (from [[DESIGN]])
- **Fonts:** Geist (headings) + Inter (body) only
- **Theme:** Light only — no dark mode
- **Components:** Untitled UI MCP → Magic UI → shadcn → custom (in that priority order)

## Env vars
```
NEXT_PUBLIC_API_URL=http://localhost:4000   # local development
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

For production, use HTTPS domain origins (for example `https://api.example.com`), not a raw HTTP VM IP. An HTTPS Vercel site cannot use HTTP API or HLS resources without mixed-content restrictions.

`NEXT_PUBLIC_SOCKET_URL` is the production connection setting required for live score delivery. The temporary score/video alignment setting is separate: `SCORE_SYNC_DELAY_MS = 15_000` is a code constant in `useMatchState.ts`, not an environment variable.

## Related
- [[Streaming — SRS + LL-HLS]] — video stream source
- [[Socket.io]] — real-time score updates
- [[Backend — Express + Socket.io]] — API + WebSocket server
- [[DESIGN]] — UI constraints
- [[Admin Panel]] — review and historical-correction UI
