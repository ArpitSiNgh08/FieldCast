"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import type { FootballEvent, Match } from "@/lib/types";
import { FootballTimeline } from "@/components/FootballTimeline";
import { Badge, LiveBadge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Input, Select } from "@/ui/Input";

const CHECKS = [
  { key: "networkStable", label: "Stable upload tested", hint: "Keep at least 8 Mbps sustained upload per phone." },
  { key: "powerReady", label: "Power and battery ready", hint: "Phones are charged, powered, and protected from overheating." },
  { key: "audioChecked", label: "Audio monitored", hint: "Use one clean primary commentary or ambient audio source." },
  { key: "permissionsConfirmed", label: "Permissions confirmed", hint: "Venue, teams, and participants approved the broadcast." },
  { key: "cameraOperatorsReady", label: "Camera operators briefed", hint: "Operators know their angle, stream, and fallback plan." },
] as const;

export default function FootballMatchControl() {
  const route = useParams<{ id: string }>();
  const id = Number(route.id);
  const { user, loading } = useAuth();
  const { socket, connected } = useSocket();
  const [match, setMatch] = useState<Match | null>(null);
  const [venue, setVenue] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [cameraName, setCameraName] = useState("");
  const [angle, setAngle] = useState("Main sideline");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [half, setHalf] = useState(1);
  const [minute, setMinute] = useState(0);
  const [extraTimeMinute, setExtraTimeMinute] = useState(0);
  const [eventType, setEventType] = useState("goal");
  const [playerQuery, setPlayerQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [playerOutQuery, setPlayerOutQuery] = useState("");
  const [playerInQuery, setPlayerInQuery] = useState("");
  const [selectedPlayerOutId, setSelectedPlayerOutId] = useState<number | null>(null);
  const [selectedPlayerInId, setSelectedPlayerInId] = useState<number | null>(null);
  const [footballEvents, setFootballEvents] = useState<FootballEvent[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const scorecard = await api.getScorecard(id);
    const data = scorecard.match;
    setMatch(data); setFootballEvents(scorecard.footballEvents || []);
    setVenue(data.venue || "");
    setScheduledAt(data.scheduledAt ? new Date(data.scheduledAt).toISOString().slice(0, 16) : "");
    setChecks(data.broadcastChecklist || {});
    setScoreA(data.state.teamAScore); setScoreB(data.state.teamBScore);
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const timer = window.setTimeout(() => load().catch((reason) => setError(reason.message)), 0);
    return () => clearTimeout(timer);
  }, [user, id, load]);

  useEffect(() => {
    const matchId = match?.id;
    if (!matchId) return;

    const onScoreUpdated = (payload: { matchId: number; state?: Match["state"] }) => {
      if (payload.matchId !== matchId || !payload.state) return;
      setMatch((current) => current ? { ...current, state: payload.state! } : current);
      setScoreA(payload.state.teamAScore);
      setScoreB(payload.state.teamBScore);
      void api.getScorecard(matchId).then((scorecard) => setFootballEvents(scorecard.footballEvents || [])).catch(() => {});
    };
    const onCameraSwitched = (payload: { matchId: number; cameraId: string }) => {
      if (payload.matchId !== matchId) return;
      setMatch((current) => current ? { ...current, activeCamera: payload.cameraId } : current);
    };

    socket.on("score:updated", onScoreUpdated);
    socket.on("camera:switched", onCameraSwitched);
    socket.emit("match:join", { matchId });

    return () => {
      socket.emit("match:leave", { matchId });
      socket.off("score:updated", onScoreUpdated);
      socket.off("camera:switched", onCameraSwitched);
    };
  }, [socket, connected, match?.id]);

  async function run(action: () => Promise<Match>, fallback: string) {
    setBusy(true); setError(""); setSuccess("");
    try { setMatch(await action()); } catch (reason) { setError(reason instanceof Error ? reason.message : fallback); } finally { setBusy(false); }
  }

  async function saveSetup() {
    if (!match) return;
    await run(() => api.updateBroadcastSetup(match.id, { venue, scheduledAt, checklist: checks }), "Could not save setup");
  }

  async function addCamera(event: React.FormEvent) {
    event.preventDefault();
    if (!match) return;
    await run(async () => { const updated = await api.addMatchCamera(match.id, { name: cameraName, angle }); setCameraName(""); return updated; }, "Could not add camera");
  }

  async function start() {
    if (!match) return;
    setBusy(true); setError("");
    try { await api.updateBroadcastSetup(match.id, { venue, scheduledAt, checklist: checks }); setMatch(await api.setMatchStatus(match.id, "live")); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start match"); } finally { setBusy(false); }
  }

  async function finish(resultType: "played" | "washout") {
    if (!match) return;
    if (resultType === "washout" && !window.confirm("Declare this match a washout? It will end the stream and will not affect standings.")) return;
    await run(
      () => resultType === "washout" ? api.setMatchResult(match.id, { resultType: "washout" }) : api.setMatchStatus(match.id, "completed"),
      "Could not finish match",
    );
  }

  function switchCamera(streamKey: string) {
    if (!match) return;
    socket.emit("camera:switch", { matchId: match.id, cameraId: streamKey }, (ack: { ok: boolean; error?: string }) => {
      if (!ack.ok) setError(ack.error || "Camera switch failed");
      else setMatch((current) => current ? { ...current, activeCamera: streamKey } : current);
    });
  }

  function updateScorecard() {
    if (!match) return;
    const active = activeRoster(match, footballEvents);
    const fullRoster = rosterOptions(match);
    const selected = active.find((membership) => membership.playerId === selectedPlayerId);
    const outgoing = active.find((membership) => membership.playerId === selectedPlayerOutId);
    const incoming = fullRoster.find((membership) => membership.playerId === selectedPlayerInId);
    if (eventType === "substitution" && (!outgoing || !incoming || outgoing.team.id !== incoming.team.id)) return;
    if (eventType !== "substitution" && !selected) return;
    const eventTeam = eventType === "substitution" ? outgoing!.team : selected!.team;
    setBusy(true); setError(""); setSuccess("");
    socket.emit("score:update", {
      matchId: match.id, sport: "football",
      state: { teamAScore: scoreA, teamBScore: scoreB, period: half, periodLabel: `${minute}${extraTimeMinute ? `+${extraTimeMinute}` : ""}'`, status: "live", extra: { minute, extraTimeMinute } },
      detail: eventType === "substitution"
        ? { half, minute, extraTimeMinute, eventType, teamId: eventTeam.id, playerOutId: outgoing!.playerId, playerInId: incoming!.playerId }
        : { half, minute, extraTimeMinute, eventType, teamId: eventTeam.id, playerId: selected!.playerId },
    }, (ack: { ok: boolean; error?: string; state?: Match["state"] }) => {
      setBusy(false);
      if (!ack.ok) setError(ack.error || "Scorecard update failed");
      else { if (ack.state) { setScoreA(ack.state.teamAScore); setScoreB(ack.state.teamBScore); } setSelectedPlayerId(null); setPlayerQuery(""); setSelectedPlayerOutId(null); setSelectedPlayerInId(null); setPlayerOutQuery(""); setPlayerInQuery(""); setSuccess("Scorecard updated for all viewers."); void load(); }
    });
  }

  if (loading || !id) return <div className="py-24 text-center text-muted">Loading…</div>;
  if (!user) return <div className="py-24 text-center"><Link href="/auth" className="text-accent">Log in to manage this match</Link></div>;
  if (!match) return <div className="py-24 text-center text-muted">{error || "Loading match…"}</div>;

  const completedChecks = CHECKS.filter((check) => checks[check.key]).length;
  const ready = Boolean(venue && scheduledAt && match.cameras.length && completedChecks === CHECKS.length);
  const blockers = [...(!scheduledAt ? ["Set kickoff time"] : []), ...(!venue ? ["Add venue"] : []), ...(match.cameras.length ? [] : ["Add a camera"]), ...CHECKS.filter((check) => !checks[check.key]).map((check) => check.label)];
  const activePlayers = activeRoster(match, footballEvents);
  const benchPlayers = rosterOptions(match).filter((membership) => !activePlayers.some((active) => active.playerId === membership.playerId));
  const incomingPlayers = selectedPlayerOutId ? benchPlayers.filter((membership) => membership.team.id === activePlayers.find((entry) => entry.playerId === selectedPlayerOutId)?.team.id) : benchPlayers;
  const eventReady = eventType === "substitution" ? Boolean(selectedPlayerOutId && selectedPlayerInId) : Boolean(selectedPlayerId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/organizer" className="text-sm text-muted hover:text-foreground">← Organiser workspace</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-2">{match.status === "live" ? <LiveBadge /> : <Badge tone="muted">{match.resultType === "washout" ? "Washout" : match.status === "completed" ? "Completed" : "Pre-match"}</Badge>}<span className="text-sm text-muted">Football</span>{(match.poolName || match.knockoutStage) && <><span className="text-muted">·</span><span className="text-sm font-medium text-accent">{match.poolName || match.knockoutStage}</span></>}</div><h1 className="mt-2 text-2xl font-bold">{match.teamA.name} vs {match.teamB.name}</h1></div>
        {match.status === "live" && <Link href={`/matches/${match.id}`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2">Open public stream ↗</Link>}
      </div>
      {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {match.status === "upcoming" && <Card className={`mt-6 border-2 ${ready ? "border-accent bg-accent/5" : "border-border"}`}><CardBody><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-accent">Broadcast launch</p><h2 className="mt-1 text-lg font-semibold">{ready ? "Everything is ready" : "Complete setup before going live"}</h2>{!ready && <ul className="mt-3 grid gap-1 text-sm text-muted sm:grid-cols-2">{blockers.map((blocker) => <li key={blocker}>○ {blocker}</li>)}</ul>}</div><div className="flex shrink-0 flex-wrap gap-2"><Button variant="danger" onClick={() => finish("washout")} disabled={busy}>Declare washout</Button><Button size="lg" onClick={start} disabled={busy || !ready}>{busy ? "Starting…" : "Go live"}</Button></div></div></CardBody></Card>}

      {match.status !== "completed" && <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>1. Match details</CardTitle></CardHeader><CardBody className="grid gap-4 sm:grid-cols-2"><Field label="Kickoff"><Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></Field><Field label="Venue"><Input value={venue} onChange={(event) => setVenue(event.target.value)} /></Field><Button variant="outline" onClick={saveSetup} disabled={busy} className="sm:col-span-2">Save setup</Button></CardBody></Card>
          <Card><CardHeader><CardTitle>2. Cameras and ingest</CardTitle></CardHeader><CardBody><div className="space-y-3">{match.cameras.map((camera) => <div key={camera.id} className="rounded-lg border border-border p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{camera.name} · {camera.angle}</p>{camera.srtIngestUrl && <><p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-accent">IRL Pro · SRT recommended</p><p className="mt-1 break-all font-mono text-xs text-foreground">{camera.srtIngestUrl}</p></>}<p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">RTMP fallback</p><p className="mt-1 break-all font-mono text-xs text-muted">{camera.ingestUrl}</p></div>{match.status === "live" && <Button size="sm" variant={match.activeCamera === camera.streamKey ? "primary" : "outline"} onClick={() => switchCamera(camera.streamKey)}>{match.activeCamera === camera.streamKey ? "Active feed" : "Take live"}</Button>}</div>{match.status !== "live" && <button className="mt-2 text-xs text-red-600" onClick={async () => setMatch(await api.removeMatchCamera(match.id, camera.id))}>Remove</button>}</div>)}</div>{match.status !== "live" && <form onSubmit={addCamera} className="mt-4 grid gap-3 sm:grid-cols-2"><Input value={cameraName} onChange={(event) => setCameraName(event.target.value)} placeholder="Camera 1" required /><Select value={angle} onChange={(event) => setAngle(event.target.value)}><option>Main sideline</option><option>Opposite sideline</option><option>Behind home goal</option><option>Behind away goal</option></Select><Button type="submit" variant="outline" className="sm:col-span-2">Add camera</Button></form>}</CardBody></Card>
          <Card><CardHeader><CardTitle>3. Football broadcast preflight</CardTitle></CardHeader><CardBody className="space-y-3">{CHECKS.map((check) => <label key={check.key} className="flex cursor-pointer gap-3 rounded-lg border border-border p-3"><input type="checkbox" checked={Boolean(checks[check.key])} onChange={(event) => setChecks({ ...checks, [check.key]: event.target.checked })} className="mt-1 h-4 w-4 accent-accent" /><span><span className="text-sm font-medium">{check.label}</span><span className="block text-xs text-muted">{check.hint}</span></span></label>)}<Button variant="outline" className="w-full" onClick={saveSetup}>Save preflight</Button></CardBody></Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Update football scorecard</CardTitle><p className="mt-1 text-sm text-muted">Record goals, cards, and substitutions. A substitution requires both the player going off and the player coming on.</p></CardHeader><CardBody><div className="grid grid-cols-2 gap-4"><Field label={match.teamA.name}><Input type="number" min={0} value={scoreA} readOnly /></Field><Field label={match.teamB.name}><Input type="number" min={0} value={scoreB} readOnly /></Field><Field label="Match event"><Select value={eventType} onChange={(event) => { setEventType(event.target.value); setSelectedPlayerId(null); setSelectedPlayerOutId(null); setSelectedPlayerInId(null); setPlayerQuery(""); setPlayerOutQuery(""); setPlayerInQuery(""); }}><option value="goal">Goal</option><option value="yellow_card">Yellow card</option><option value="red_card">Red card</option><option value="substitution">Substitution</option></Select></Field><Field label="Half"><Select value={half} onChange={(event) => setHalf(Number(event.target.value))}><option value={1}>First half</option><option value={2}>Second half</option></Select></Field><Field label="Minute"><Input type="number" min={0} max={120} value={minute} onChange={(event) => setMinute(Number(event.target.value))} /></Field><Field label="Extra-time minute"><Input type="number" min={0} max={30} value={extraTimeMinute} onChange={(event) => setExtraTimeMinute(Number(event.target.value))} /></Field></div>{eventType === "substitution" ? <div className="grid gap-4 sm:grid-cols-2"><PlayerSearch label="Player off" hint="Choose a player currently on the field." entries={activePlayers} query={playerOutQuery} selectedPlayerId={selectedPlayerOutId} onQueryChange={(value) => { setPlayerOutQuery(value); setSelectedPlayerOutId(null); setSelectedPlayerInId(null); setPlayerInQuery(""); }} onSelect={(playerId, label) => { setSelectedPlayerOutId(playerId); setPlayerOutQuery(label); setSelectedPlayerInId(null); setPlayerInQuery(""); }} /><PlayerSearch label="Player on" hint={selectedPlayerOutId ? "Choose a substitute from the same team." : "Choose the player going off first."} entries={incomingPlayers} query={playerInQuery} selectedPlayerId={selectedPlayerInId} disabled={!selectedPlayerOutId} onQueryChange={(value) => { setPlayerInQuery(value); setSelectedPlayerInId(null); }} onSelect={(playerId, label) => { setSelectedPlayerInId(playerId); setPlayerInQuery(label); }} /></div> : <PlayerSearch label="Player" hint="Choose a player currently on the field." entries={activePlayers} query={playerQuery} selectedPlayerId={selectedPlayerId} onQueryChange={(value) => { setPlayerQuery(value); setSelectedPlayerId(null); }} onSelect={(playerId, label) => { setSelectedPlayerId(playerId); setPlayerQuery(label); }} />}{success && <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}<Button className="mt-4 w-full" onClick={updateScorecard} disabled={match.status !== "live" || !eventReady || busy}>{busy ? "Updating…" : eventType === "substitution" ? "Record substitution" : "Update scorecard"}</Button></CardBody></Card>
          <FootballTimeline events={footballEvents} />
          {match.status === "live" && <Card><CardHeader><CardTitle>End broadcast</CardTitle></CardHeader><CardBody><p className="text-sm text-muted">End normally to finalize the score and update standings, or declare a washout without affecting the table.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Button variant="danger" onClick={() => finish("washout")} disabled={busy}>End & declare washout</Button><Button onClick={() => finish("played")} disabled={busy}>End stream & finalize</Button></div></CardBody></Card>}
        </div>
      </div>}
      {match.status === "completed" && <div className="mt-8"><FootballTimeline events={footballEvents} /></div>}
    </div>
  );
}

type PlayerOption = NonNullable<Match["teamA"]["players"]>[number] & { team: Match["teamA"] };

function rosterOptions(match: Match): PlayerOption[] {
  return [...(match.teamA.players || []).map((membership) => ({ ...membership, team: match.teamA })), ...(match.teamB.players || []).map((membership) => ({ ...membership, team: match.teamB }))];
}

function activeRoster(match: Match, events: FootballEvent[]): PlayerOption[] {
  const roster = rosterOptions(match);
  const activeIds = new Set(roster.filter((membership) => membership.squadRole === "playing").map((membership) => membership.playerId));
  for (const event of events.filter((entry) => entry.event_type === "substitution")) {
    if (event.player_out_id) activeIds.delete(event.player_out_id);
    if (event.player_in_id) activeIds.add(event.player_in_id);
  }
  return roster.filter((membership) => activeIds.has(membership.playerId));
}

function PlayerSearch({ label, hint, entries, query, selectedPlayerId, disabled = false, onQueryChange, onSelect }: { label: string; hint: string; entries: PlayerOption[]; query: string; selectedPlayerId: number | null; disabled?: boolean; onQueryChange: (value: string) => void; onSelect: (playerId: number, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const normalized = query.toLowerCase().trim();
  const filtered = entries.filter(({ player, jerseyNumber, team }) => !normalized || player.name.toLowerCase().includes(normalized) || jerseyNumber.toLowerCase().includes(normalized) || team.shortName.toLowerCase().includes(normalized));
  return <Field label={label} hint={hint} className="relative mt-4"><Input value={query} disabled={disabled} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onChange={(event) => { onQueryChange(event.target.value); setOpen(true); }} placeholder={disabled ? "Choose player off first" : "Search player…"} autoComplete="off" />{!disabled && !selectedPlayerId && open && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">{filtered.map((entry) => { const optionLabel = `#${entry.jerseyNumber} · ${entry.player.name} · ${entry.team.shortName}`; return <button type="button" key={`${entry.teamId}-${entry.playerId}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(entry.playerId, optionLabel); setOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-2"><strong>#{entry.jerseyNumber}</strong> · {entry.player.name} · <span className="font-semibold text-accent">{entry.team.shortName}</span></button>; })}{!filtered.length && <p className="px-3 py-3 text-sm text-muted">No eligible player found.</p>}</div>}</Field>;
}
