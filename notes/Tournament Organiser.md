# Tournament Organiser

Part of [[FieldCast]]

## Role
An organiser has management access to specific approved tournaments. This is not the global admin role.

- Approval automatically makes the creator the first organiser.
- An organiser can add another existing FieldCast user by account email.
- Privileged REST and [[Socket.io]] operations verify tournament membership in the backend.
- Organisers can create fixtures, start/end matches, manage live scores/events, register cameras, and select the active feed.

## Pages
- `/organizer` — choose an approved tournament, view fixtures, add organisers, and create football matches.
- `/organizer/matches/[id]` — football broadcast and score control room.

## Football match workflow
1. Choose home and away teams from the approved tournament.
2. Set kickoff time and venue.
3. Add phone cameras and intended angles.
4. Configure Larix with each server-generated RTMP ingest URL.
5. Complete broadcast preflight.
6. Start the match; ffmpeg publishes the selected feed to `active_<matchId>`.
7. Switch cameras and update score, half, minute, goals, cards, and substitutions.
8. End the match to stop the ffmpeg publisher and complete the fixture.

## Go live control
The match control page has a prominent **Broadcast launch** panel above the setup columns. It always shows the **Go live** button and lists incomplete requirements until ready. Starting the match immediately exposes it in the public homepage's **Live now** section.

For a one-camera local test, the viewer uses the registered camera's raw SRS HLS manifest directly. Multiple-camera broadcasts retain `active_<matchId>.m3u8` so camera cuts do not change the viewer URL.

## Football scorecard updates
- Select goal, yellow card, red card, or substitution.
- Search only players registered in the two match rosters.
- Results are shown as `#jersey · Player name · TEAM`.
- Enter half, regulation minute, and optional added-time minute (for example, 45 and 2 renders as `45+2'`).
- **Update scorecard** saves the event and broadcasts the updated match state in one action.
- Goal events automatically increment the selected player's team score on the backend.
- The public live overlay updates through Socket.io; the full scorecard timeline refreshes automatically.

## Required football preflight
- Stable upload tested (recommended minimum: 8 Mbps sustained upload per phone)
- Phones powered and thermally managed
- Audio monitored with one primary source
- Venue/team/participant permissions confirmed
- Camera operators briefed on angles, stream destination, kickoff, and fallback plan

At least one camera, kickoff time, venue, and all checks are required before going live.

## Recommended Larix settings
- H.264, landscape orientation
- 1080p at 30 fps
- 4–6 Mbps video bitrate
- AAC audio
- Two-second keyframe interval

## Related
- [[Tournament Submission]]
- [[Camera Switching]]
- [[Socket.io]]
- [[Backend — Express + Socket.io]]
