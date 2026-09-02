# Tournament Organiser

Part of [[FieldCast]]

## Role
An organiser has management access to specific approved tournaments. This is not the global admin role.

- Approval automatically makes the creator the first organiser.
- An organiser can add another existing FieldCast user by account email.
- Privileged REST and [[Socket.io]] operations verify tournament membership in the backend.
- Organisers can create fixtures, manage Playing 11/bench squads, start/end matches, declare washouts, manage live scores/events, register cameras, and select the active feed.

## Pages
- `/organizer` — choose an approved tournament, edit squads, view/create fixtures, and add organisers.
- `/organizer/matches/[id]` — football broadcast and score control room.
- Multiple organiser devices may open the same match. Socket.io synchronizes persisted scores and active-camera changes across those devices and public viewers.
- Football score totals are server-authoritative: goals increment the latest stored score, and cards/substitutions preserve it.

## Football match workflow
1. Choose a pool fixture or knockout fixture. Pool fixtures require a pool and only expose teams in that pool.
2. For knockouts, choose built-in Semi-final or Final, or enter another stage such as Round of 16 or Quarterfinal.
3. Choose home and away teams from the approved tournament.
4. Set kickoff time and venue.
5. Add one or more phone cameras with descriptive names. Camera angle selection is not required.
6. Configure IRL Pro with the recommended SRT URL, or use the RTMP fallback with IRL Pro/Larix when it is stable. Each destination has an on-demand QR code so it can be scanned directly by the streaming phone.
7. Start publishing and press **Go live**. Kickoff, venue, and at least one camera are required; there is no separate checklist gate.
8. Start the match; ffmpeg publishes the selected feed to `active_<matchId>`.
9. Switch cameras and update score, minute, goals, cards, and substitutions. The half is derived from the minute; use **Mark halftime** for the halftime state.
10. End normally to finalize the score and publish full time, or end as a washout. Only pool and legacy fixtures affect pool standings; knockout results do not.

## Go live control
The match control page has a prominent **Broadcast launch** panel above the setup columns. It shows the **Go live** button once kickoff, venue, and a camera are configured. Starting the match immediately exposes it in the public homepage's **Live now** section.

For a one-camera local test, the viewer uses the registered camera's raw SRS HLS manifest directly. Multiple-camera broadcasts retain `active_<matchId>.m3u8` so camera cuts do not change the viewer URL.

## Football scorecard updates
- Select goal, yellow card, red card, or substitution.
- Search only players currently active in the match. The active set starts from the saved/default Playing 11 and changes after substitutions.
- Results are shown as `#jersey · Player name · TEAM`.
- Enter the regulation minute and optional added-time minute (for example, 30 and 2 renders as `30+2'`). The half is assigned automatically from the minute.
- **Update scorecard** saves the event and broadcasts the updated match state in one action.
- Goal events automatically increment the selected player's team score on the backend.
- Goal events can be marked **Goal scored as penalty**. The penalty flag appears in the public scorer summary and Football timeline.
- Substitution events require both a player off and a player on. The backend validates that they belong to the same team, that the outgoing player is currently active, and that the incoming player is currently a substitute.
- The organiser control room shows the complete match timeline. Substitutions update that match’s active-player set, allowing the incoming player to receive later goals or cards without modifying future-fixture squads.

## Playing squad and washouts

- The organiser workspace provides a drag-and-drop team editor for moving players between the Playing 11 and bench.
- The first sport-sized group of registered players becomes the default starting squad (11 for Football/Cricket, 5 for Basketball); additional players start on the bench. The organiser can adjust and save the lineup.
- Saved squad roles persist on team-player memberships; football scorecard player search only exposes the Playing 11.
- A fixture can be created as a washout, declared a washout before going live, or ended live as a washout.
- A normal **End stream & finalize** action derives the result, recomputes standings, and broadcasts completion so viewer pages stop playback without reload even if the phone remains connected.
- Washouts stop the broadcast but do not increment played, won, drawn, lost, scores, or points.
- The public live overlay updates through Socket.io; the full scorecard timeline refreshes automatically.
- Socket.io event delivery is immediate; only the public score value uses the temporary 15-second HLS alignment holdback.
- Public tournament page `/tournaments/[id]` groups live, upcoming, and past matches with the current standings.
- Knockout fixtures are grouped by stage into a connected public bracket on the tournament hub and standings page. Completed SF 1/SF 2 winners populate the Final placeholder before its fixture exists; live Final scores and winner state refresh automatically. Custom earlier rounds form additional columns automatically.

## Go-live setup
At least one camera, kickoff time, and venue are required before going live. Stable upload, power, audio, permissions, and a fallback plan remain sensible operational checks, but they are not an in-app blocker.

## Recommended phone broadcaster settings
- H.264, landscape orientation
- 1080p at 30 fps
- 4–6 Mbps video bitrate
- AAC audio
- Two-second keyframe interval

IRL Pro may keep using RTMP when stable. If it repeatedly fails after the handshake, use the displayed SRT/Caller URL on UDP `10080`; SRS converts it into the same HLS and switching source.

## Related
- [[Tournament Submission]]
- [[Camera Switching]]
- [[Socket.io]]
- [[Backend — Express + Socket.io]]
