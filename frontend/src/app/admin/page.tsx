"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import type { Match, Sport } from "@/lib/types";
import { SPORT_EMOJI, SPORT_LABEL, SPORTS, formatDateTime } from "@/lib/format";
import { Badge, LiveBadge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import { cn } from "@/lib/cn";

const CAMERAS = ["camera1", "camera2", "camera3"] as const;
type CameraId = (typeof CAMERAS)[number];

type StreamHealth = {
  simulate: boolean;
  source: string;
  cameras: Record<string, { publishing: boolean; clients: number }>;
};

export default function AdminPage() {
  const { user, isAdmin, loading, login, googleEnabled } = useAuth();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <span className="mb-4 text-5xl">🔒</span>
        <h1 className="text-2xl font-bold text-foreground">Admin Access Required</h1>
        <p className="mt-2 text-sm text-muted max-w-sm">
          Sign in with your admin Google account to access the control panel.
        </p>
        {googleEnabled ? (
          <Button className="mt-6" onClick={login}>
            Sign in with Google
          </Button>
        ) : (
          <p className="mt-4 text-xs text-muted">Auth not configured — set GOOGLE_CLIENT_ID in the backend.</p>
        )}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <span className="mb-4 text-5xl">🚫</span>
        <h1 className="text-xl font-bold text-foreground">Not an admin</h1>
        <p className="mt-2 text-sm text-muted">Your account doesn&apos;t have admin privileges.</p>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [health, setHealth] = useState<StreamHealth | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const data = await api.listMatches();
      setMatches(data);
    } catch {
      /* silently fail */
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      setHealth(await api.streamHealth());
    } catch {
      /* SRS may not be running locally */
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    fetchHealth();
    const t = setInterval(fetchHealth, 5000);
    return () => clearInterval(t);
  }, [fetchMatches, fetchHealth]);

  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "upcoming");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="mt-1 text-sm text-muted">
            Manage matches, scores, and camera switching.
          </p>
        </div>
        {health && (
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                health.source === "srs" ? "bg-accent" : "bg-muted"
              )}
            />
            {health.simulate ? "Simulated" : health.source === "srs" ? "SRS live" : "SRS unreachable"}
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: match list */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Matches
          </h2>
          {loadingMatches ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...live, ...upcoming].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMatch(m)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-all hover:border-accent/40",
                    activeMatch?.id === m.id
                      ? "border-accent bg-accent/5"
                      : "border-border bg-surface"
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {SPORT_EMOJI[m.sport]} {SPORT_LABEL[m.sport]}
                    </span>
                    {m.status === "live" ? (
                      <LiveBadge />
                    ) : (
                      <Badge tone="accent">Upcoming</Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {m.teamA.shortName} vs {m.teamB.shortName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {m.teamA.name} · {m.teamB.name}
                  </p>
                </button>
              ))}
              {live.length === 0 && upcoming.length === 0 && (
                <p className="text-sm text-muted">No active or upcoming matches.</p>
              )}
            </div>
          )}
          <CreateMatchForm onCreated={fetchMatches} />
        </div>

        {/* Right: match controls */}
        <div className="lg:col-span-2">
          {activeMatch ? (
            <MatchControls
              match={activeMatch}
              health={health}
              onMatchUpdated={(updated) => {
                setActiveMatch(updated);
                fetchMatches();
              }}
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <p className="text-sm text-muted">Select a match to manage it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchControls({
  match,
  health,
  onMatchUpdated,
}: {
  match: Match;
  health: StreamHealth | null;
  onMatchUpdated: (m: Match) => void;
}) {
  const { socket } = useSocket();
  const [busy, setBusy] = useState(false);
  const [activeCamera, setActiveCamera] = useState<string>(match.activeCamera);
  const [scores, setScores] = useState({
    teamAScore: match.state.teamAScore,
    teamBScore: match.state.teamBScore,
    periodLabel: match.state.periodLabel,
  });

  // Go live / end match
  async function toggleStatus() {
    setBusy(true);
    try {
      const next = match.status === "live" ? "completed" : "live";
      const updated = await api.setMatchStatus(match.id, next);
      onMatchUpdated(updated);
    } finally {
      setBusy(false);
    }
  }

  // Push score update via Socket.io
  function pushScore() {
    socket.emit(
      "score:update",
      {
        matchId: match.id,
        sport: match.sport,
        state: scores,
      },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack?.ok) alert(ack?.error || "Score update failed");
      }
    );
  }

  // Switch camera via Socket.io
  function switchCamera(cam: CameraId) {
    socket.emit(
      "camera:switch",
      { matchId: match.id, cameraId: cam },
      (ack: { ok: boolean; error?: string }) => {
        if (ack?.ok) setActiveCamera(cam);
        else alert(ack?.error || "Camera switch failed");
      }
    );
  }

  const isLive = match.status === "live";

  return (
    <div className="flex flex-col gap-5">
      {/* Match header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted mb-0.5">
            {SPORT_EMOJI[match.sport]} {SPORT_LABEL[match.sport]}
            {match.tournamentName && ` · ${match.tournamentName}`}
          </p>
          <h2 className="text-xl font-bold text-foreground">
            {match.teamA.name} vs {match.teamB.name}
          </h2>
        </div>
        <Button
          variant={isLive ? "danger" : "primary"}
          size="sm"
          disabled={busy}
          onClick={toggleStatus}
        >
          {busy ? "…" : isLive ? "End match" : "Go live"}
        </Button>
      </div>

      {/* Score editor */}
      <Card>
        <CardHeader>
          <CardTitle>Score Control</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <ScoreInput
              label={match.teamA.name}
              value={scores.teamAScore}
              onChange={(v) => setScores((s) => ({ ...s, teamAScore: v }))}
            />
            <ScoreInput
              label={match.teamB.name}
              value={scores.teamBScore}
              onChange={(v) => setScores((s) => ({ ...s, teamBScore: v }))}
            />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs text-muted">Period label</label>
            <input
              type="text"
              value={scores.periodLabel}
              onChange={(e) => setScores((s) => ({ ...s, periodLabel: e.target.value }))}
              placeholder={
                match.sport === "cricket"
                  ? "Over 18.4"
                  : match.sport === "football"
                    ? "Half 2"
                    : "Q3 8:24"
              }
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <Button className="mt-4 w-full" onClick={pushScore}>
            Push score update
          </Button>
        </CardBody>
      </Card>

      {/* Camera switcher */}
      <Card>
        <CardHeader>
          <CardTitle>Camera Switching</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-3">
            {CAMERAS.map((cam) => {
              const camHealth = health?.cameras?.[cam];
              return (
                <button
                  key={cam}
                  onClick={() => switchCamera(cam)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-4 text-sm transition-all",
                    activeCamera === cam
                      ? "border-accent bg-accent/5 text-accent font-semibold"
                      : "border-border bg-surface text-muted hover:border-accent/30 hover:text-foreground"
                  )}
                >
                  <span className="text-2xl">📷</span>
                  <span>{cam}</span>
                  {camHealth ? (
                    <span
                      className={cn(
                        "text-xs",
                        camHealth.publishing ? "text-accent" : "text-muted"
                      )}
                    >
                      {camHealth.publishing
                        ? `Live · ${camHealth.clients} viewers`
                        : "Offline"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </button>
              );
            })}
          </div>
          {health?.simulate && (
            <p className="mt-3 text-xs text-muted">
              ⚠ Running in simulation mode — no actual ffmpeg processes are spawned.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Set result */}
      {isLive && (
        <SetResultForm match={match} onMatchUpdated={onMatchUpdated} />
      )}
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block truncate text-xs text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 text-base font-bold text-muted hover:text-foreground transition-colors"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-center text-lg font-bold text-foreground focus:border-accent focus:outline-none tabular-nums"
        />
        <button
          onClick={() => onChange(value + 1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 text-base font-bold text-muted hover:text-foreground transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SetResultForm({
  match,
  onMatchUpdated,
}: {
  match: Match;
  onMatchUpdated: (m: Match) => void;
}) {
  const [winner, setWinner] = useState<number | null>(null);
  const [replayUrl, setReplayUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!winner) return;
    setBusy(true);
    try {
      const updated = await api.setMatchResult(match.id, {
        winnerTeamId: winner,
        replayUrl: replayUrl || undefined,
      });
      onMatchUpdated(updated);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Declare Result</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="flex gap-3">
          {[match.teamA, match.teamB].map((t) => (
            <button
              key={t.id}
              onClick={() => setWinner(t.id)}
              className={cn(
                "flex-1 rounded-xl border py-3 text-sm font-medium transition-all",
                winner === t.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-surface text-muted hover:border-accent/40 hover:text-foreground"
              )}
            >
              {t.name} wins
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-muted">Replay URL (ImageKit, optional)</label>
          <input
            type="url"
            placeholder="https://ik.imagekit.io/…/match.m3u8"
            value={replayUrl}
            onChange={(e) => setReplayUrl(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <Button
          className="mt-4 w-full"
          disabled={!winner || busy}
          onClick={submit}
        >
          {busy ? "Saving…" : "Confirm result & end match"}
        </Button>
      </CardBody>
    </Card>
  );
}

function CreateMatchForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<{ id: number; name: string; sport: string }[]>([]);
  const [sport, setSport] = useState<Sport>("cricket");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      api.listTeams({ sport }).then((t) => setTeams(t as any)).catch(() => {});
    }
  }, [open, sport]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamAId || !teamBId || teamAId === teamBId) return;
    setBusy(true);
    try {
      await api.createMatch({ teamAId: Number(teamAId), teamBId: Number(teamBId), sport, scheduledAt: scheduledAt || null });
      setOpen(false);
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      {!open ? (
        <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
          + Create match
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>New Match</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Sport</label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value as Sport)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  {SPORTS.map((s) => (
                    <option key={s} value={s}>{SPORT_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Team A</label>
                <select
                  value={teamAId}
                  onChange={(e) => setTeamAId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                >
                  <option value="">Select team…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Team B</label>
                <select
                  value={teamBId}
                  onChange={(e) => setTeamBId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  required
                >
                  <option value="">Select team…</option>
                  {teams.filter((t) => t.id.toString() !== teamAId).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Scheduled time (optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={busy} className="flex-1">
                  {busy ? "Creating…" : "Create"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
