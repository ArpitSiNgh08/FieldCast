"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
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

const STANDARD_VENUES = ["NITH college ground", "SAC"] as const;

export default function FootballMatchControl() {
  const route = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(route.id);
  const { user, loading } = useAuth();
  const { socket, connected } = useSocket();
  const [match, setMatch] = useState<Match | null>(null);
  const [venue, setVenue] = useState("");
  const [venueChoice, setVenueChoice] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [cameraName, setCameraName] = useState("");
  const angle = "Main sideline";
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [minute, setMinute] = useState(0);
  const [extraTimeMinute, setExtraTimeMinute] = useState(0);
  const [eventType, setEventType] = useState("goal");
  const [isPenalty, setIsPenalty] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [playerQuery, setPlayerQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [playerOutQuery, setPlayerOutQuery] = useState("");
  const [playerInQuery, setPlayerInQuery] = useState("");
  const [selectedPlayerOutId, setSelectedPlayerOutId] = useState<number | null>(
    null,
  );
  const [selectedPlayerInId, setSelectedPlayerInId] = useState<number | null>(
    null,
  );
  const [footballEvents, setFootballEvents] = useState<FootballEvent[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedCameraKey, setCopiedCameraKey] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const scorecard = await api.getScorecard(id);
    const data = scorecard.match;
    setMatch(data);
    setFootballEvents(scorecard.footballEvents || []);
    setVenue(data.venue || "");
    setVenueChoice(
      data.venue === STANDARD_VENUES[0] || data.venue === STANDARD_VENUES[1]
        ? data.venue
        : data.venue
          ? "custom"
          : "",
    );
    setScheduledAt(
      data.scheduledAt
        ? new Date(data.scheduledAt).toISOString().slice(0, 16)
        : "",
    );
    setScoreA(data.state.teamAScore);
    setScoreB(data.state.teamBScore);
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const timer = window.setTimeout(
      () => load().catch((reason) => setError(reason.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, [user, id, load]);

  useEffect(() => {
    const matchId = match?.id;
    if (!matchId) return;

    const onScoreUpdated = (payload: {
      matchId: number;
      state?: Match["state"];
    }) => {
      if (payload.matchId !== matchId || !payload.state) return;
      setMatch((current) =>
        current ? { ...current, state: payload.state! } : current,
      );
      setScoreA(payload.state.teamAScore);
      setScoreB(payload.state.teamBScore);
      void api
        .getScorecard(matchId)
        .then((scorecard) => setFootballEvents(scorecard.footballEvents || []))
        .catch(() => {});
    };
    const onCameraSwitched = (payload: {
      matchId: number;
      cameraId: string;
    }) => {
      if (payload.matchId !== matchId) return;
      setMatch((current) =>
        current ? { ...current, activeCamera: payload.cameraId } : current,
      );
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
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      setMatch(await action());
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : fallback);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveSetup() {
    if (!match) return;
    await run(
      () => api.updateBroadcastSetup(match.id, { venue, scheduledAt }),
      "Could not save setup",
    );
  }

  async function addCamera(event: React.FormEvent) {
    event.preventDefault();
    if (!match) return;
    await run(async () => {
      const updated = await api.addMatchCamera(match.id, {
        name: cameraName,
        angle,
      });
      setCameraName("");
      return updated;
    }, "Could not add camera");
  }

  async function copyIngestUrl(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCameraKey(key);
      window.setTimeout(
        () => setCopiedCameraKey((current) => (current === key ? "" : current)),
        1500,
      );
    } catch {
      setError("Could not copy the ingest URL");
    }
  }

  async function start() {
    if (!match) return;
    setBusy(true);
    setError("");
    try {
      await api.updateBroadcastSetup(match.id, { venue, scheduledAt });
      setMatch(await api.setMatchStatus(match.id, "live"));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not start match",
      );
    } finally {
      setBusy(false);
    }
  }

  async function finish(resultType: "played" | "washout") {
    if (!match) return;
    if (
      resultType === "washout" &&
      !window.confirm(
        "Declare this match a washout? It will end the stream and will not affect standings.",
      )
    )
      return;
    const succeeded = await run(
      () =>
        resultType === "washout"
          ? api.setMatchResult(match.id, { resultType: "washout" })
          : api.setMatchStatus(match.id, "completed"),
      "Could not finish match",
    );
    if (succeeded) router.refresh();
  }

  function switchCamera(streamKey: string) {
    if (!match) return;
    socket.emit(
      "camera:switch",
      { matchId: match.id, cameraId: streamKey },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack.ok) setError(ack.error || "Camera switch failed");
        else
          setMatch((current) =>
            current ? { ...current, activeCamera: streamKey } : current,
          );
      },
    );
  }

  function updateScorecard() {
    if (!match) return;
    const active = activeRoster(match, footballEvents);
    const fullRoster = rosterOptions(match);
    const selected = active.find(
      (membership) => membership.playerId === selectedPlayerId,
    );
    const outgoing = active.find(
      (membership) => membership.playerId === selectedPlayerOutId,
    );
    const incoming = fullRoster.find(
      (membership) => membership.playerId === selectedPlayerInId,
    );
    if (
      eventType === "substitution" &&
      (!outgoing || !incoming || outgoing.team.id !== incoming.team.id)
    )
      return;
    const teamEvent = ["foul", "corner", "free_kick", "offside"].includes(eventType);
    if (eventType !== "substitution" && !teamEvent && !selected) return;
    const eventTeam = eventType === "substitution"
      ? outgoing!.team
      : teamEvent
        ? [match.teamA, match.teamB].find((team) => team.id === (selectedTeamId || match.teamA.id))
        : selected!.team;
    if (!eventTeam) return;
    const half = minute > 30 ? 2 : 1;
    setBusy(true);
    setError("");
    setSuccess("");
    let acknowledged = false;
    const timeoutId = window.setTimeout(() => {
      if (!acknowledged) {
        setBusy(false);
        setError("The backend did not respond. Check the live connection and try again.");
      }
    }, 10_000);
    socket.emit(
      "score:update",
      {
        matchId: match.id,
        sport: "football",
        state: {
          teamAScore: scoreA,
          teamBScore: scoreB,
          period: half,
          periodLabel: `${minute}${extraTimeMinute ? `+${extraTimeMinute}` : ""}'`,
          status: "live",
          extra: { minute, extraTimeMinute },
        },
        detail:
          eventType === "substitution"
            ? {
                half,
                minute,
                extraTimeMinute,
                eventType,
                teamId: eventTeam.id,
                playerOutId: outgoing!.playerId,
                playerInId: incoming!.playerId,
              }
            : {
                half,
                minute,
                extraTimeMinute,
                eventType,
                teamId: eventTeam.id,
                ...(teamEvent ? {} : { playerId: selected!.playerId }),
                isPenalty: eventType === "goal" && isPenalty,
              },
      },
      (ack: { ok: boolean; error?: string; state?: Match["state"] }) => {
        acknowledged = true;
        window.clearTimeout(timeoutId);
        setBusy(false);
        if (!ack.ok) setError(ack.error || "Scorecard update failed");
        else {
          if (ack.state) {
            setScoreA(ack.state.teamAScore);
            setScoreB(ack.state.teamBScore);
          }
          setSelectedPlayerId(null);
          setSelectedTeamId(null);
          setPlayerQuery("");
          setSelectedPlayerOutId(null);
          setSelectedPlayerInId(null);
          setPlayerOutQuery("");
          setPlayerInQuery("");
          setSuccess("Scorecard updated for all viewers.");
          void load();
        }
      },
    );
  }

  function markHalftime() {
    if (!match) return;
    setBusy(true);
    setError("");
    setSuccess("");
    socket.emit(
      "score:update",
      {
        matchId: match.id,
        sport: "football",
        state: { status: "break", periodLabel: "Halftime" },
        detail: { eventType: "halftime" },
      },
      (ack: { ok: boolean; error?: string }) => {
        setBusy(false);
        if (!ack.ok) setError(ack.error || "Could not mark halftime");
        else setSuccess("Halftime marked for all viewers.");
      },
    );
  }

  if (loading || !id)
    return <div className="py-24 text-center text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="py-24 text-center">
        <Link href="/auth" className="text-accent">
          Log in to manage this match
        </Link>
      </div>
    );
  if (!match)
    return (
      <div className="py-24 text-center text-muted">
        {error || "Loading match…"}
      </div>
    );

  const ready = Boolean(venue && scheduledAt && match.cameras.length);
  const blockers = [
    ...(!scheduledAt ? ["Set kickoff time"] : []),
    ...(!venue ? ["Add venue"] : []),
    ...(match.cameras.length ? [] : ["Add a camera"]),
  ];
  const activePlayers = activeRoster(match, footballEvents);
  const benchPlayers = rosterOptions(match).filter(
    (membership) =>
      !activePlayers.some((active) => active.playerId === membership.playerId),
  );
  const incomingPlayers = selectedPlayerOutId
    ? benchPlayers.filter(
        (membership) =>
          membership.team.id ===
          activePlayers.find((entry) => entry.playerId === selectedPlayerOutId)
            ?.team.id,
      )
    : benchPlayers;
  const eventReady =
    eventType === "substitution"
      ? Boolean(selectedPlayerOutId && selectedPlayerInId)
      : ["foul", "corner", "free_kick", "offside"].includes(eventType) || Boolean(selectedPlayerId);

  return (
    <div className="mx-auto w-full max-w-none px-3 py-8 sm:px-4">
      <Link
        href="/organizer"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Organiser workspace
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {match.status === "live" ? (
              <LiveBadge />
            ) : (
              <Badge tone="muted">
                {match.resultType === "washout"
                  ? "Washout"
                  : match.status === "completed"
                    ? "Completed"
                    : "Pre-match"}
              </Badge>
            )}
            <span className="text-sm text-muted">Football</span>
            {(match.poolName || match.knockoutStage) && (
              <>
                <span className="text-muted">·</span>
                <span className="text-sm font-medium text-accent">
                  {match.poolName || match.knockoutStage}
                </span>
              </>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold">
            {match.teamA.name} vs {match.teamB.name}
          </h1>
        </div>
        {match.status === "live" && (
          <Link
            href={`/matches/${match.id}`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2"
          >
            Open public stream ↗
          </Link>
        )}
      </div>
      {error && (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {match.status === "upcoming" && (
        <Card
          className={`mt-6 border-2 ${ready ? "border-accent bg-accent/5" : "border-border"}`}
        >
          <CardBody>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Broadcast launch
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {ready
                    ? "Everything is ready"
                    : "Complete setup before going live"}
                </h2>
                {!ready && (
                  <ul className="mt-3 grid gap-1 text-sm text-muted sm:grid-cols-2">
                    {blockers.map((blocker) => (
                      <li key={blocker}>○ {blocker}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                <Button
                  className="h-10 w-full whitespace-nowrap sm:w-auto"
                  variant="danger"
                  onClick={() => finish("washout")}
                  disabled={busy}
                >
                  Declare washout
                </Button>
                <Button
                  className="h-10 w-full whitespace-nowrap sm:w-auto"
                  onClick={start}
                  disabled={busy || !ready}
                >
                  {busy ? "Starting…" : "Go live"}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {match.status !== "completed" && (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <details
            open={match.status === "upcoming"}
            className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:col-span-1"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:hidden">
              <span>Match setup and cameras</span>
              <span className="text-sm text-muted transition-transform group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <div className="border-t border-border">
              <details
                open={match.status === "upcoming"}
                className="group overflow-hidden border-b border-border bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:hidden">
                  <span>1. Match details</span>
                  <span className="text-sm text-muted transition-transform group-open:rotate-180">
                    ⌄
                  </span>
                </summary>
                <Card className="rounded-none border-0 shadow-none">
                  <CardBody className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
                    <Field label="Kickoff">
                      <Input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(event) => setScheduledAt(event.target.value)}
                      />
                    </Field>
                    <Field label="Venue">
                      <Select
                        value={venueChoice}
                        onChange={(event) => {
                          const value = event.target.value;
                          setVenueChoice(value);
                          setVenue(value === "custom" ? "" : value);
                        }}
                      >
                        <option value="">Choose venue</option>
                        {STANDARD_VENUES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                        <option value="custom">Add custom place…</option>
                      </Select>
                    </Field>
                    {venueChoice === "custom" && (
                      <Field label="Custom venue">
                        <Input
                          value={venue}
                          onChange={(event) => setVenue(event.target.value)}
                          required
                          placeholder="Enter venue name"
                        />
                      </Field>
                    )}
                    <Button
                      variant="outline"
                      onClick={saveSetup}
                      disabled={busy}
                      className="sm:col-span-2"
                    >
                      Save setup
                    </Button>
                  </CardBody>
                </Card>
              </details>
              <Card className="rounded-none border-0 shadow-none">
                <CardHeader className="p-4">
                  <CardTitle>2. Cameras and ingest</CardTitle>
                </CardHeader>
                <CardBody className="px-4 pb-4">
                  <div className="space-y-3">
                    {match.cameras.map((camera) => (
                      <div
                        key={camera.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 font-medium">
                            {camera.name} · {camera.angle}
                          </p>
                          {match.status === "live" && (
                            <Button
                              size="sm"
                              variant={
                                match.activeCamera === camera.streamKey
                                  ? "primary"
                                  : "outline"
                              }
                              onClick={() => switchCamera(camera.streamKey)}
                              className="shrink-0"
                            >
                              {match.activeCamera === camera.streamKey
                                ? "Active feed"
                                : "Take live"}
                            </Button>
                          )}
                        </div>
                        <div className="mt-4 space-y-4">
                          {camera.srtIngestUrl && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                                IRL Pro · SRT recommended
                              </p>
                              <CopyableUrl
                                label={camera.srtIngestUrl}
                                copyKey={`srt-${camera.id}`}
                                copiedKey={copiedCameraKey}
                                onCopy={copyIngestUrl}
                              />
                            </div>
                          )}
                          {camera.iphoneSrtIngestUrl && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                                Mobile · Android / iPhone / Moblin · SRT
                              </p>
                              <p className="mb-1 text-xs text-muted">
                                Use these two values in Moblin. Each camera has a different Stream ID so switching works.
                              </p>
                              <div className="mt-2 grid gap-3">
                                <div>
                                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                    Moblin URL
                                  </p>
                                  <CopyableUrl
                                    label={camera.iphoneSrtUrl || camera.iphoneSrtIngestUrl.replace(/\?.*$/, "")}
                                    copyKey={`iphone-url-${camera.id}`}
                                    copiedKey={copiedCameraKey}
                                    onCopy={copyIngestUrl}
                                  />
                                </div>
                                <div>
                                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                    Moblin stream ID
                                  </p>
                                  <CopyableUrl
                                    label={camera.iphoneStreamId || `#!::r=live/${camera.streamKey},m=publish`}
                                    copyKey={`iphone-stream-id-${camera.id}`}
                                    copiedKey={copiedCameraKey}
                                    onCopy={copyIngestUrl}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="border-t border-border pt-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                              RTMP fallback
                            </p>
                            <CopyableUrl
                              label={camera.ingestUrl}
                              copyKey={`rtmp-${camera.id}`}
                              copiedKey={copiedCameraKey}
                              onCopy={copyIngestUrl}
                            />
                          </div>
                        </div>
                        {match.status !== "live" && (
                          <button
                            className="mt-2 text-xs text-red-600"
                            onClick={async () =>
                              setMatch(
                                await api.removeMatchCamera(
                                  match.id,
                                  camera.id,
                                ),
                              )
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {match.status !== "live" && (
                    <form onSubmit={addCamera} className="mt-4 grid gap-3">
                      <Input
                        value={cameraName}
                        onChange={(event) => setCameraName(event.target.value)}
                        placeholder="Camera 1"
                        required
                      />
                      <Button type="submit" variant="outline">
                        Add camera
                      </Button>
                    </form>
                  )}
                </CardBody>
              </Card>
            </div>
          </details>
          <details
            open={match.status === "live"}
            className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:col-span-1"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:hidden">
              <span>Live scorecard and broadcast</span>
              <span className="text-sm text-muted transition-transform group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <div className="border-t border-border">
              <Card className="rounded-none border-0 border-b border-border bg-transparent shadow-none">
                <CardHeader className="p-4">
                  <CardTitle>Update football scorecard</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    Record goals, cards, and substitutions. The half is assigned
                    automatically from the minute.
                  </p>
                </CardHeader>
                <CardBody className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Match event">
                      <Select
                        value={eventType}
                        onChange={(event) => {
                          setEventType(event.target.value);
                          setIsPenalty(false);
                          setSelectedPlayerId(null);
                          setSelectedPlayerOutId(null);
                          setSelectedPlayerInId(null);
                          setPlayerQuery("");
                          setPlayerOutQuery("");
                          setPlayerInQuery("");
                        }}
                      >
                        <option value="goal">Goal</option>
                        <option value="yellow_card">Yellow card</option>
                        <option value="red_card">Red card</option>
                        <option value="substitution">Substitution</option>
                        <option value="foul">Foul</option>
                        <option value="corner">Corner</option>
                        <option value="free_kick">Free kick</option>
                        <option value="offside">Offside given</option>
                      </Select>
                    </Field>
                    <Field label="Minute">
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        value={minute}
                        onChange={(event) =>
                          setMinute(Number(event.target.value))
                        }
                      />
                    </Field>
                    <Field label="Extra-time minute">
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={extraTimeMinute}
                        onChange={(event) =>
                          setExtraTimeMinute(Number(event.target.value))
                        }
                      />
                    </Field>
                  </div>
                  {eventType === "substitution" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <PlayerSearch
                        label="Player off"
                        hint="Choose a player currently on the field."
                        entries={activePlayers}
                        query={playerOutQuery}
                        selectedPlayerId={selectedPlayerOutId}
                        onQueryChange={(value) => {
                          setPlayerOutQuery(value);
                          setSelectedPlayerOutId(null);
                          setSelectedPlayerInId(null);
                          setPlayerInQuery("");
                        }}
                        onSelect={(playerId, label) => {
                          setSelectedPlayerOutId(playerId);
                          setPlayerOutQuery(label);
                          setSelectedPlayerInId(null);
                          setPlayerInQuery("");
                        }}
                      />
                      <PlayerSearch
                        label="Player on"
                        hint={
                          selectedPlayerOutId
                            ? "Choose a substitute from the same team."
                            : "Choose the player going off first."
                        }
                        entries={incomingPlayers}
                        query={playerInQuery}
                        selectedPlayerId={selectedPlayerInId}
                        disabled={!selectedPlayerOutId}
                        onQueryChange={(value) => {
                          setPlayerInQuery(value);
                          setSelectedPlayerInId(null);
                        }}
                        onSelect={(playerId, label) => {
                          setSelectedPlayerInId(playerId);
                          setPlayerInQuery(label);
                        }}
                      />
                    </div>
                  ) : ["foul", "corner", "free_kick", "offside"].includes(eventType) ? (
                    <Field label="Team">
                      <Select
                        value={String(selectedTeamId || match.teamA.id)}
                        onChange={(event) => setSelectedTeamId(Number(event.target.value))}
                      >
                        <option value={match.teamA.id}>{match.teamA.shortName}</option>
                        <option value={match.teamB.id}>{match.teamB.shortName}</option>
                      </Select>
                    </Field>
                  ) : (
                    <div className="space-y-3">
                      <PlayerSearch
                        label="Player"
                        hint="Choose a player currently on the field."
                        entries={activePlayers}
                        query={playerQuery}
                        selectedPlayerId={selectedPlayerId}
                        onQueryChange={(value) => {
                          setPlayerQuery(value);
                          setSelectedPlayerId(null);
                        }}
                        onSelect={(playerId, label) => {
                          setSelectedPlayerId(playerId);
                          setPlayerQuery(label);
                        }}
                      />
                      {eventType === "goal" && (
                        <label className="flex items-center gap-2 text-sm text-muted">
                          <input
                            type="checkbox"
                            checked={isPenalty}
                            onChange={(event) => setIsPenalty(event.target.checked)}
                            className="h-4 w-4 rounded border-border accent-accent"
                          />
                          Goal scored as penalty
                        </label>
                      )}
                    </div>
                  )}
                  {success && (
                    <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                      {success}
                    </p>
                  )}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Button
                      onClick={updateScorecard}
                      disabled={match.status !== "live" || !eventReady || busy || !connected}
                    >
                      {busy
                        ? "Updating…"
                        : eventType === "substitution"
                          ? "Record substitution"
                          : "Update scorecard"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={markHalftime}
                      disabled={match.status !== "live" || busy}
                    >
                      Mark halftime
                    </Button>
                  </div>
                </CardBody>
              </Card>
              <div className="border-b border-border p-4">
                <FootballTimeline events={footballEvents} embedded />
              </div>
              {match.status === "live" && (
                <Card className="rounded-none border-0 bg-transparent shadow-none">
                  <CardHeader className="p-4">
                    <CardTitle>End broadcast</CardTitle>
                  </CardHeader>
                  <CardBody className="px-4 pb-4">
                    <p className="text-sm text-muted">
                      End normally to finalize the score and update standings,
                      or declare a washout without affecting the table.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Button
                        variant="danger"
                        onClick={() => finish("washout")}
                        disabled={busy}
                      >
                        End & declare washout
                      </Button>
                      <Button onClick={() => finish("played")} disabled={busy}>
                        End stream & finalize
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          </details>
        </div>
      )}
      {match.status === "completed" && (
        <div className="mt-8">
          <FootballTimeline events={footballEvents} />
        </div>
      )}
    </div>
  );
}

function CopyableUrl({
  label,
  copyKey,
  copiedKey,
  onCopy,
}: {
  label?: string;
  copyKey: string;
  copiedKey: string;
  onCopy: (value: string, key: string) => void;
}) {
  const value = label || "";
  const copied = copiedKey === copyKey;
  const [showQr, setShowQr] = useState(false);
  return (
    <div className="mt-1.5">
      <p className="select-all break-all rounded-md bg-surface-2 px-3 py-2 font-mono text-xs leading-5 text-foreground">
        {value}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowQr((current) => !current)}
          aria-expanded={showQr}
          aria-controls={`qr-${copyKey}`}
          className="w-full"
        >
          {showQr ? "Hide QR" : "Show QR"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onCopy(value, copyKey)}
          aria-label={copied ? "URL copied" : "Copy URL"}
          title={copied ? "Copied" : "Copy URL"}
          className="w-full"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      {showQr && (
        <div
          id={`qr-${copyKey}`}
          className="mt-3 flex w-full flex-col items-center rounded-lg border border-border bg-white p-4"
        >
          <QRCodeSVG value={value} size={192} level="M" marginSize={1} />
          <p className="mt-2 text-center text-xs text-muted">
            Scan with the streaming phone
          </p>
        </div>
      )}
    </div>
  );
}

type PlayerOption = NonNullable<Match["teamA"]["players"]>[number] & {
  team: Match["teamA"];
};

function rosterOptions(match: Match): PlayerOption[] {
  return [
    ...(match.teamA.players || []).map((membership) => ({
      ...membership,
      team: match.teamA,
    })),
    ...(match.teamB.players || []).map((membership) => ({
      ...membership,
      team: match.teamB,
    })),
  ];
}

function activeRoster(match: Match, events: FootballEvent[]): PlayerOption[] {
  const roster = rosterOptions(match);
  const activeIds = new Set(
    roster
      .filter((membership) => membership.squadRole === "playing")
      .map((membership) => membership.playerId),
  );
  for (const event of events.filter(
    (entry) => entry.event_type === "substitution",
  )) {
    if (event.player_out_id) activeIds.delete(event.player_out_id);
    if (event.player_in_id) activeIds.add(event.player_in_id);
  }
  return roster.filter((membership) => activeIds.has(membership.playerId));
}

function PlayerSearch({
  label,
  hint,
  entries,
  query,
  selectedPlayerId,
  disabled = false,
  onQueryChange,
  onSelect,
}: {
  label: string;
  hint: string;
  entries: PlayerOption[];
  query: string;
  selectedPlayerId: number | null;
  disabled?: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (playerId: number, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const normalized = query.toLowerCase().trim();
  const filtered = entries.filter(
    ({ player, jerseyNumber, team }) =>
      !normalized ||
      player.name.toLowerCase().includes(normalized) ||
      jerseyNumber.toLowerCase().includes(normalized) ||
      team.shortName.toLowerCase().includes(normalized),
  );
  return (
    <Field label={label} hint={hint} className="relative mt-4">
      <Input
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setOpen(true);
        }}
        placeholder={disabled ? "Choose player off first" : "Search player…"}
        autoComplete="off"
      />
      {!disabled && !selectedPlayerId && open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
          {filtered.map((entry) => {
            const optionLabel = `#${entry.jerseyNumber} · ${entry.player.name} · ${entry.team.shortName}`;
            return (
              <button
                type="button"
                key={`${entry.teamId}-${entry.playerId}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(entry.playerId, optionLabel);
                  setOpen(false);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <strong>#{entry.jerseyNumber}</strong> · {entry.player.name} ·{" "}
                <span className="font-semibold text-accent">
                  {entry.team.shortName}
                </span>
              </button>
            );
          })}
          {!filtered.length && (
            <p className="px-3 py-3 text-sm text-muted">
              No eligible player found.
            </p>
          )}
        </div>
      )}
    </Field>
  );
}
