"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { FootballEvent, Match, Scorecard, StandingRow, Tournament } from "@/lib/types";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Input, Select } from "@/ui/Input";
import { LoadingScreen } from "@/ui/Spinner";

type OpenSection = "match" | "penalty" | "standings" | null;

export default function AdminCorrectionsPage() {
  const { isAdmin, loading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    api.listTournaments().then((rows) => {
      setTournaments(rows);
      if (rows[0]) setTournamentId(rows[0].id);
    }).catch((reason) => setError(reason.message));
  }, [isAdmin]);

  const loadTournament = useCallback(async () => {
    if (!tournamentId) return;
    setLoadingTournament(true);
    try {
      const [fixtures, table] = await Promise.all([
        api.listMatches({ tournamentId: String(tournamentId), status: "completed" }),
        api.getStandings(tournamentId),
      ]);
      setMatches(fixtures);
      setStandings(table);
      setScorecard(null);
      setOpenSection(null);
    } finally {
      setLoadingTournament(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!isAdmin || !tournamentId) return;
    const timer = window.setTimeout(() => loadTournament().catch((reason) => setError(reason.message)), 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin, tournamentId, loadTournament]);

  async function openMatch(matchId: number) {
    setOpenSection(null);
    if (!matchId) {
      setScorecard(null);
      return;
    }
    try {
      setError("");
      setLoadingMatch(true);
      setScorecard(await api.getScorecard(matchId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load match");
    } finally {
      setLoadingMatch(false);
    }
  }

  function chooseTournament(nextTournamentId: number) {
    setTournamentId(nextTournamentId);
    setMatches([]);
    setStandings([]);
    setScorecard(null);
    setOpenSection(null);
    setError("");
  }

  async function reloadScorecard() {
    if (!scorecard) return;
    const [updatedScorecard, updatedStandings] = await Promise.all([
      api.getScorecard(scorecard.match.id),
      api.getStandings(tournamentId),
    ]);
    setScorecard(updatedScorecard);
    setStandings(updatedStandings);
  }

  if (loading) return <LoadingScreen label="Checking admin credentials…" />;
  if (!isAdmin) return <div className="py-24 text-center text-muted">Admin access required.</div>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Administration</p>
          <h1 className="mt-1 text-2xl font-bold">Historical corrections</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Choose a completed match, then open only the controls you need.</p>
        </div>
        <Link href="/admin/tournaments" className="w-full sm:w-auto"><Button variant="outline" className="w-full">Tournament reviews</Button></Link>
      </header>

      {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      <div className="mt-6 space-y-3">
        <ControlPanel number={1} title="Tournament">
          <Field label="Select tournament" htmlFor="admin-tournament">
            <Select id="admin-tournament" value={tournamentId} onChange={(event) => chooseTournament(Number(event.target.value))}>
              <option value={0}>Choose tournament</option>
              {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name} · {tournament.sport}</option>)}
            </Select>
          </Field>
        </ControlPanel>

        <ControlPanel number={2} title="Completed match">
          <Field label="Select match" htmlFor="admin-match">
            <Select id="admin-match" value={scorecard?.match.id || 0} disabled={!tournamentId || loadingMatch} onChange={(event) => void openMatch(Number(event.target.value))}>
              <option value={0}>{loadingMatch ? "Loading match…" : matches.length ? "Choose completed match" : "No completed matches"}</option>
              {matches.map((match) => <option key={match.id} value={match.id}>{match.teamA.shortName} {match.state.teamAScore}–{match.state.teamBScore} {match.teamB.shortName}</option>)}
            </Select>
          </Field>
          {scorecard && <FinalScoreSummary match={scorecard.match} />}
        </ControlPanel>

        <DisclosurePanel number={3} title="Match corrections" description={scorecard ? "Correct the score or add and edit regular match events" : "Select a completed match first"} open={openSection === "match"} disabled={!scorecard} onToggle={() => setOpenSection((current) => current === "match" ? null : "match")}>
          {scorecard && <CompletedMatchEditor key={scorecard.match.id} scorecard={scorecard} onChanged={reloadScorecard} />}
        </DisclosurePanel>

        {scorecard?.match.sport === "football" && (
          <DisclosurePanel number={4} title="Penalty shootout corrections" description="Add, edit, or delete penalty shootout attempts turn-by-turn" open={openSection === "penalty"} disabled={!scorecard} onToggle={() => setOpenSection((current) => current === "penalty" ? null : "penalty")}>
            <CompletedPenaltyShootoutEditor key={`penalty-${scorecard.match.id}`} scorecard={scorecard} onChanged={reloadScorecard} />
          </DisclosurePanel>
        )}

        <DisclosurePanel number={5} title="Standings overrides" description={tournamentId ? `${standings.length} team${standings.length === 1 ? "" : "s"} in this tournament` : "Select a tournament first"} open={openSection === "standings"} disabled={!tournamentId} onToggle={() => setOpenSection((current) => current === "standings" ? null : "standings")}>
          <StandingsEditor tournamentId={tournamentId} rows={standings} onRows={setStandings} />
        </DisclosurePanel>
      </div>
    </main>
  );
}

function ControlPanel({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-border bg-surface p-4 shadow-sm"><PanelHeading number={number} title={title} /><div className="mt-4">{children}</div></section>;
}

function DisclosurePanel({ number, title, description, open, disabled, onToggle, children }: { number: number; title: string; description: string; open: boolean; disabled?: boolean; onToggle: () => void; children: ReactNode }) {
  const panelId = `admin-panel-${number}`;
  return <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"><button type="button" className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50" aria-expanded={open} aria-controls={panelId} disabled={disabled} onClick={onToggle}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">{number}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="block truncate text-xs text-muted">{description}</span></span><ChevronIcon open={open} /></button>{open && <div id={panelId} className="border-t border-border p-4 sm:p-5">{children}</div>}</section>;
}

function PanelHeading({ number, title }: { number: number; title: string }) {
  return <div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">{number}</span><h2 className="font-semibold">{title}</h2></div>;
}

function ChevronIcon({ open }: { open: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>;
}

function FinalScoreSummary({ match }: { match: Match }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-3 rounded-lg bg-surface-2 px-3 py-3 text-center">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{match.teamA.name}</span>
      <strong className="shrink-0 text-xl tabular-nums">{match.state.teamAScore}–{match.state.teamBScore}</strong>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{match.teamB.name}</span>
    </div>
  );
}

function CompletedMatchEditor({ scorecard, onChanged }: { scorecard: Scorecard; onChanged: () => Promise<void> }) {
  const match = scorecard.match;
  const [scoreA, setScoreA] = useState(match.state.teamAScore);
  const [scoreB, setScoreB] = useState(match.state.teamBScore);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function saveScore() {
    setBusy(true);
    setMessage("");
    try {
      await api.correctCompletedScore(match.id, { teamAScore: scoreA, teamBScore: scoreB });
      await onChanged();
      setMessage("Final score and derived standings updated.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-6"><section><h3 className="font-semibold">Correct final score</h3><p className="mt-1 text-sm text-muted">Completed match #{match.id}</p><div className="mt-4 grid grid-cols-2 gap-3"><Field label={match.teamA.shortName}><Input type="number" min={0} value={scoreA} onChange={(event) => setScoreA(Number(event.target.value))} /></Field><Field label={match.teamB.shortName}><Input type="number" min={0} value={scoreB} onChange={(event) => setScoreB(Number(event.target.value))} /></Field></div><Button className="mt-4 w-full sm:w-auto" onClick={saveScore} disabled={busy}>{busy ? "Saving…" : "Correct final score"}</Button>{message && <p className="mt-3 text-sm text-green-700" role="status">{message}</p>}</section>{match.sport === "football" && <section className="border-t border-border pt-6"><h3 className="font-semibold">Match events</h3><p className="mt-1 text-sm text-muted">Edit a recorded event or add a new one. Event edits do not automatically change the final score.</p>{(scorecard.footballEvents || []).length > 0 && <div className="mt-4 space-y-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Recorded events</h4>{(scorecard.footballEvents || []).map((event) => <FootballEventEditor key={event.id} match={match} event={event} onChanged={onChanged} />)}</div>}<div className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4"><h4 className="font-semibold text-accent">Add event</h4><FootballEventEditor match={match} onChanged={onChanged} isNew /></div></section>}</div>;
}

function FootballEventEditor({ match, event, onChanged, isNew = false }: { match: Match; event?: FootballEvent; onChanged: () => Promise<void>; isNew?: boolean }) {
  const firstTeam = event?.team_id === match.teamB.id ? match.teamB : match.teamA;
  const [teamId, setTeamId] = useState(firstTeam.id);
  const [playerId, setPlayerId] = useState(event?.player_id || firstTeam.players?.[0]?.playerId || 0);
  const [playerName, setPlayerName] = useState(event?.player_name || "");
  const [eventType, setEventType] = useState(event?.event_type || "goal");
  const teamEvent = ["foul", "corner", "free_kick", "offside", "outside"].includes(eventType);
  const [isPenalty, setIsPenalty] = useState(event?.is_penalty || false);
  const [minute, setMinute] = useState(event?.minute || 0);
  const [extraTimeMinute, setExtra] = useState(event?.extra_time_minute || 0);
  const [busy, setBusy] = useState(false);
  const team = teamId === match.teamB.id ? match.teamB : match.teamA;

  function chooseTeam(value: number) {
    const selected = value === match.teamB.id ? match.teamB : match.teamA;
    setTeamId(value);
    setPlayerId(selected.players?.[0]?.playerId || 0);
  }

  async function save() {
    if (!playerId && !playerName && !teamEvent && eventType !== "penalty_shootout") return;
    setBusy(true);
    try {
      const body = {
        teamId,
        ...(teamEvent ? {} : { playerId, playerName }),
        eventType,
        minute,
        extraTimeMinute,
        isPenalty: eventType === "penalty_shootout" ? isPenalty : (eventType === "goal" && isPenalty),
      };
      if (event) await api.updateCompletedFootballEvent(match.id, event.id, body);
      else await api.addCompletedFootballEvent(match.id, body);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!event || !window.confirm("Delete this event from the timeline?")) return;
    setBusy(true);
    try {
      await api.deleteCompletedFootballEvent(match.id, event.id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  const fields = (
    <>
      <Field label="Event">
        <Select value={eventType} onChange={(e) => { setEventType(e.target.value as FootballEvent["event_type"]); setIsPenalty(false); }}>
          <option value="goal">Goal</option>
          <option value="yellow_card">Yellow card</option>
          <option value="red_card">Red card</option>
          <option value="substitution">Substitution</option>
          <option value="foul">Foul</option>
          <option value="corner">Corner</option>
          <option value="free_kick">Free kick</option>
          <option value="offside">Offside given</option>
          <option value="outside">Outside</option>
        </Select>
      </Field>
      <Field label="Team">
        <Select value={teamId} onChange={(e) => chooseTeam(Number(e.target.value))}>
          <option value={match.teamA.id}>{match.teamA.shortName}</option>
          <option value={match.teamB.id}>{match.teamB.shortName}</option>
        </Select>
      </Field>
      <Field label="Player (Roster)" className="sm:col-span-2">
        <Select value={playerId} onChange={(e) => {
          const pid = Number(e.target.value);
          setPlayerId(pid);
          const found = team.players?.find((p) => p.playerId === pid);
          if (found) setPlayerName(found.player.name);
        }}>
          <option value={0}>Choose player or type name below</option>
          {(team.players || []).map((entry) => <option key={entry.playerId} value={entry.playerId}>#{entry.jerseyNumber} {entry.player.name}</option>)}
        </Select>
      </Field>
      <Field label="Player Name (or custom)" className="sm:col-span-2">
        <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Player name" />
      </Field>
      <Field label="Minute"><Input type="number" min={0} max={120} value={minute} onChange={(e) => setMinute(Number(e.target.value))} /></Field>
      <Field label="Added minute"><Input type="number" min={0} max={30} value={extraTimeMinute} onChange={(e) => setExtra(Number(e.target.value))} /></Field>
      {eventType === "penalty_shootout" ? (
        <Field label="Shootout Result" className="sm:col-span-2">
          <Select value={isPenalty ? "scored" : "missed"} onChange={(e) => setIsPenalty(e.target.value === "scored")}>
            <option value="scored">⚽ Scored</option>
            <option value="missed">❌ Missed</option>
          </Select>
        </Field>
      ) : eventType === "goal" ? (
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-muted sm:col-span-2">
          <input type="checkbox" checked={isPenalty} onChange={(e) => setIsPenalty(e.target.checked)} className="h-4 w-4 rounded border-border accent-accent" />
          Goal scored as penalty
        </label>
      ) : null}
    </>
  );

  if (isNew) return <div className="mt-4"><div className="grid grid-cols-2 gap-3">{fields}</div><Button className="mt-4 w-full sm:w-auto" size="sm" onClick={save} disabled={busy || (!teamEvent && !playerId && !playerName)}>{busy ? "Adding…" : "Add event"}</Button></div>;

  return <details className="rounded-xl border border-border"><summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium"><span className="flex items-center justify-between gap-3"><span className="capitalize">{eventType.replace("_", " ")} {eventType === "penalty_shootout" && (isPenalty ? "(Scored)" : "(Missed)")} · {team.shortName} · {minute}{extraTimeMinute ? `+${extraTimeMinute}` : ""}&apos;</span><span className="text-xs text-accent">Edit</span></span></summary><div className="border-t border-border p-4"><div className="grid grid-cols-2 gap-3">{fields}</div><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" onClick={save} disabled={busy || (!teamEvent && !playerId && !playerName)}>Save event</Button><Button size="sm" variant="danger" onClick={remove} disabled={busy}>Delete</Button></div></div></details>;
}

function CompletedPenaltyShootoutEditor({ scorecard, onChanged }: { scorecard: Scorecard; onChanged: () => Promise<void> }) {
  const match = scorecard.match;
  const shootoutEvents = (scorecard.footballEvents || []).filter((e) => e.event_type === "penalty_shootout");
  const teamAShootouts = shootoutEvents.filter((e) => e.team_id === match.teamA.id);
  const teamBShootouts = shootoutEvents.filter((e) => e.team_id === match.teamB.id);

  const teamAScored = teamAShootouts.filter((e) => e.is_penalty).length;
  const teamBScored = teamBShootouts.filter((e) => e.is_penalty).length;

  const roundCount = Math.max(5, teamAShootouts.length, teamBShootouts.length);
  const roundIndices = Array.from({ length: roundCount }, (_, i) => i);

  const [selectedTeamId, setSelectedTeamId] = useState<number>(match.teamA.id);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(0);
  const [playerName, setPlayerName] = useState<string>("");
  const [isPenalty, setIsPenalty] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const roster = [
    ...(match.teamA.players || []).map((m) => ({ ...m, team: match.teamA })),
    ...(match.teamB.players || []).map((m) => ({ ...m, team: match.teamB })),
  ];
  const currentTeamRoster = roster.filter((m) => m.team.id === selectedTeamId);

  async function addAttempt() {
    if (!playerName.trim() && !selectedPlayerId) return;
    setBusy(true);
    try {
      await api.addCompletedFootballEvent(match.id, {
        eventType: "penalty_shootout",
        teamId: selectedTeamId,
        playerId: selectedPlayerId || null,
        playerName: playerName.trim() || null,
        isPenalty,
        minute: 0,
        extraTimeMinute: 0,
      });
      setPlayerName("");
      setSelectedPlayerId(0);
      setIsPenalty(true);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 5-Circle Scoreboard Display (Matching Viewer POV) */}
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-accent">
          <span>🎯 Penalty Shootout Status</span>
          <span className="font-mono text-base font-extrabold text-foreground">
            {match.teamA.shortName} ({teamAScored}) — ({teamBScored}) {match.teamB.shortName}
          </span>
        </div>

        {/* 5+ Indicator Circles for Admin */}
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-border/40 pt-3">
          <div className="flex items-center gap-1.5 justify-start min-w-0">
            <span className="mr-1 text-xs font-semibold text-muted shrink-0">{match.teamA.shortName}:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {roundIndices.map((i) => {
                const shot = teamAShootouts[i];
                return (
                  <div
                    key={`a-${i}`}
                    title={shot ? `${shot.player_name || 'Player'}: ${shot.is_penalty ? 'Scored' : 'Missed'}` : `Shot ${i + 1}`}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      !shot
                        ? "bg-surface-3 text-muted-foreground border border-border/60"
                        : shot.is_penalty
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/50"
                        : "bg-rose-500 text-white shadow-sm shadow-rose-500/50"
                    }`}
                  >
                    {!shot ? i + 1 : shot.is_penalty ? "✓" : "✕"}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 justify-end min-w-0">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {roundIndices.map((i) => {
                const shot = teamBShootouts[i];
                return (
                  <div
                    key={`b-${i}`}
                    title={shot ? `${shot.player_name || 'Player'}: ${shot.is_penalty ? 'Scored' : 'Missed'}` : `Shot ${i + 1}`}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      !shot
                        ? "bg-surface-3 text-muted-foreground border border-border/60"
                        : shot.is_penalty
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/50"
                        : "bg-rose-500 text-white shadow-sm shadow-rose-500/50"
                    }`}
                  >
                    {!shot ? i + 1 : shot.is_penalty ? "✓" : "✕"}
                  </div>
                );
              })}
            </div>
            <span className="ml-1 text-xs font-semibold text-muted shrink-0">{match.teamB.shortName}:</span>
          </div>
        </div>
      </div>

      {/* Recorded Shootout Attempts List */}
      {shootoutEvents.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Recorded Shootout Attempts</h4>
          {shootoutEvents.map((event) => (
            <AdminPenaltyAttemptRow key={event.id} match={match} event={event} onChanged={onChanged} />
          ))}
        </div>
      )}

      {/* Add Next Penalty Shootout Attempt Form */}
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-accent">Record Penalty Attempt #{shootoutEvents.length + 1}</h4>
          <span className="text-xs text-muted">Round {Math.floor(shootoutEvents.length / 2) + 1}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kicking Team">
            <Select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(Number(e.target.value));
                setSelectedPlayerId(0);
                setPlayerName("");
              }}
            >
              <option value={match.teamA.id}>{match.teamA.name} ({match.teamA.shortName})</option>
              <option value={match.teamB.id}>{match.teamB.name} ({match.teamB.shortName})</option>
            </Select>
          </Field>

          <Field label="Select Player (or Type Custom Name)">
            <Select
              value={selectedPlayerId}
              onChange={(e) => {
                const pid = Number(e.target.value);
                setSelectedPlayerId(pid);
                const found = currentTeamRoster.find((p) => p.playerId === pid);
                if (found) setPlayerName(found.player.name);
              }}
            >
              <option value={0}>Choose player from squad roster</option>
              {currentTeamRoster.map((entry) => (
                <option key={entry.playerId} value={entry.playerId}>#{entry.jerseyNumber} {entry.player.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Kicker Name" className="col-span-2">
            <Input
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setSelectedPlayerId(0);
              }}
              placeholder="Player name"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Shot Outcome:</span>
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <Button
              type="button"
              variant={isPenalty ? "primary" : "outline"}
              className={`flex-1 ${isPenalty ? "bg-emerald-600 hover:bg-emerald-500 text-white font-bold" : "border-emerald-500/40 text-emerald-400"}`}
              onClick={() => setIsPenalty(true)}
            >
              ⚽ Scored (Goal)
            </Button>
            <Button
              type="button"
              variant={!isPenalty ? "danger" : "outline"}
              className={`flex-1 ${!isPenalty ? "bg-rose-600 hover:bg-rose-500 text-white font-bold" : "border-rose-500/40 text-rose-400"}`}
              onClick={() => setIsPenalty(false)}
            >
              ❌ Missed / Saved
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            className="flex-1 font-bold h-10"
            onClick={addAttempt}
            disabled={busy || (!selectedPlayerId && !playerName.trim())}
          >
            {busy ? "Saving attempt…" : `Record Shot as ${isPenalty ? "SCORED ⚽" : "MISSED ❌"}`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPlayerName("");
              setSelectedPlayerId(0);
              setIsPenalty(true);
            }}
          >
            ➕ Next Penalty Attempt
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminPenaltyAttemptRow({ match, event, onChanged }: { match: Match; event: FootballEvent; onChanged: () => Promise<void> }) {
  const [teamId, setTeamId] = useState(event.team_id || match.teamA.id);
  const [playerName, setPlayerName] = useState(event.player_name || "");
  const [isPenalty, setIsPenalty] = useState(event.is_penalty);
  const [busy, setBusy] = useState(false);

  const team = teamId === match.teamB.id ? match.teamB : match.teamA;

  async function save() {
    setBusy(true);
    try {
      await api.updateCompletedFootballEvent(match.id, event.id, {
        eventType: "penalty_shootout",
        teamId,
        playerId: event.player_id,
        playerName,
        isPenalty,
        minute: 0,
        extraTimeMinute: 0,
      });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this shootout attempt?")) return;
    setBusy(true);
    try {
      await api.deleteCompletedFootballEvent(match.id, event.id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-xl border border-border">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
        <span className="flex items-center justify-between gap-3">
          <span>
            {team.shortName} · {event.player_name || "Player"} ·{" "}
            <span className={`font-bold ${event.is_penalty ? "text-emerald-600" : "text-rose-600"}`}>
              {event.is_penalty ? "⚽ Scored" : "❌ Missed"}
            </span>
          </span>
          <span className="text-xs text-accent">Edit</span>
        </span>
      </summary>
      <div className="border-t border-border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Team">
            <Select value={teamId} onChange={(e) => setTeamId(Number(e.target.value))}>
              <option value={match.teamA.id}>{match.teamA.shortName}</option>
              <option value={match.teamB.id}>{match.teamB.shortName}</option>
            </Select>
          </Field>
          <Field label="Result">
            <Select value={isPenalty ? "scored" : "missed"} onChange={(e) => setIsPenalty(e.target.value === "scored")}>
              <option value="scored">⚽ Scored</option>
              <option value="missed">❌ Missed</option>
            </Select>
          </Field>
          <Field label="Player Name" className="col-span-2">
            <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={busy}>Save attempt</Button>
          <Button size="sm" variant="danger" onClick={remove} disabled={busy}>Delete</Button>
        </div>
      </div>
    </details>
  );
}

function StandingsEditor({ tournamentId, rows, onRows }: { tournamentId: number; rows: StandingRow[]; onRows: (rows: StandingRow[]) => void }) {
  if (!rows.length) return <p className="text-sm text-muted">No standings are available for this tournament.</p>;
  return <div><p className="mb-4 text-sm text-muted">Overrides persist when match-derived standings are recomputed. Reset a team to return it to calculated values.</p><div className="space-y-3">{rows.map((row) => <StandingEditorRow key={`${row.teamId}-${row.overridden}`} tournamentId={tournamentId} row={row} onRows={onRows} />)}</div></div>;
}

function StandingEditorRow({ tournamentId, row, onRows }: { tournamentId: number; row: StandingRow; onRows: (rows: StandingRow[]) => void }) {
  const [value, setValue] = useState({ played: row.played, won: row.won, lost: row.lost, drawn: row.drawn, points: row.points, scoredFor: row.scoredFor, scoredAgainst: row.scoredAgainst });
  const [busy, setBusy] = useState(false);
  const fields: [keyof typeof value, string][] = [["played", "Played"], ["won", "Won"], ["drawn", "Drawn"], ["lost", "Lost"], ["points", "Points"], ["scoredFor", "For"], ["scoredAgainst", "Against"]];

  async function save() {
    setBusy(true);
    try { onRows(await api.overrideStanding(tournamentId, row.teamId, value)); }
    finally { setBusy(false); }
  }

  async function reset() {
    setBusy(true);
    try { onRows(await api.clearStandingOverride(tournamentId, row.teamId)); }
    finally { setBusy(false); }
  }

  return <details className="rounded-xl border border-border"><summary className="cursor-pointer list-none px-4 py-3"><span className="flex items-center justify-between gap-3"><span className="font-medium">{row.teamName}</span><span className="text-xs text-muted">{row.points} pts {row.overridden ? "· Overridden" : "· Edit"}</span></span></summary><div className="border-t border-border p-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{fields.map(([key, label]) => <Field key={key} label={label}><Input type="number" min={0} value={value[key]} onChange={(event) => setValue({ ...value, [key]: Number(event.target.value) })} /></Field>)}</div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button size="sm" onClick={save} disabled={busy}>Save team</Button>{row.overridden && <Button size="sm" variant="outline" onClick={reset} disabled={busy}>Reset calculated</Button>}</div></div></details>;
}
