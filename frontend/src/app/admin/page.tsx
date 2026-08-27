"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { FootballEvent, Match, Scorecard, StandingRow, Tournament } from "@/lib/types";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Input, Select } from "@/ui/Input";

type OpenSection = "match" | "standings" | null;

export default function AdminCorrectionsPage() {
  const { isAdmin, loading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [openSection, setOpenSection] = useState<OpenSection>(null);
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
    const [fixtures, table] = await Promise.all([
      api.listMatches({ tournamentId: String(tournamentId), status: "completed" }),
      api.getStandings(tournamentId),
    ]);
    setMatches(fixtures);
    setStandings(table);
    setScorecard(null);
    setOpenSection(null);
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

  if (loading) return <div className="py-24 text-center text-muted">Loading…</div>;
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

        <DisclosurePanel number={3} title="Match corrections" description={scorecard ? "Correct the score or add and edit match events" : "Select a completed match first"} open={openSection === "match"} disabled={!scorecard} onToggle={() => setOpenSection((current) => current === "match" ? null : "match")}>
          {scorecard && <CompletedMatchEditor key={scorecard.match.id} scorecard={scorecard} onChanged={reloadScorecard} />}
        </DisclosurePanel>

        <DisclosurePanel number={4} title="Standings overrides" description={tournamentId ? `${standings.length} team${standings.length === 1 ? "" : "s"} in this tournament` : "Select a tournament first"} open={openSection === "standings"} disabled={!tournamentId} onToggle={() => setOpenSection((current) => current === "standings" ? null : "standings")}>
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
  return <div className="mt-3 flex items-center justify-center gap-3 rounded-lg bg-surface-2 px-3 py-3 text-center"><span className="min-w-0 flex-1 truncate text-sm font-medium">{match.teamA.name}</span><strong className="shrink-0 text-xl tabular-nums">{match.state.teamAScore}–{match.state.teamBScore}</strong><span className="min-w-0 flex-1 truncate text-sm font-medium">{match.teamB.name}</span></div>;
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
  const [eventType, setEventType] = useState(event?.event_type || "goal");
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
    if (!playerId) return;
    setBusy(true);
    try {
      const body = { teamId, playerId, eventType, minute, extraTimeMinute, isPenalty: eventType === "goal" && isPenalty };
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

  const fields = <><Field label="Event"><Select value={eventType} onChange={(e) => { setEventType(e.target.value as FootballEvent["event_type"]); setIsPenalty(false); }}><option value="goal">Goal</option><option value="yellow_card">Yellow card</option><option value="red_card">Red card</option><option value="substitution">Substitution</option></Select></Field><Field label="Team"><Select value={teamId} onChange={(e) => chooseTeam(Number(e.target.value))}><option value={match.teamA.id}>{match.teamA.shortName}</option><option value={match.teamB.id}>{match.teamB.shortName}</option></Select></Field><Field label="Player" className="sm:col-span-2"><Select value={playerId} onChange={(e) => setPlayerId(Number(e.target.value))}><option value={0}>Choose player</option>{(team.players || []).map((entry) => <option key={entry.playerId} value={entry.playerId}>#{entry.jerseyNumber} {entry.player.name}</option>)}</Select></Field><Field label="Minute"><Input type="number" min={0} max={120} value={minute} onChange={(e) => setMinute(Number(e.target.value))} /></Field><Field label="Added minute" className="sm:col-span-2"><Input type="number" min={0} max={30} value={extraTimeMinute} onChange={(e) => setExtra(Number(e.target.value))} /></Field>{eventType === "goal" && <label className="flex items-center gap-2 self-end pb-2 text-sm text-muted"><input type="checkbox" checked={isPenalty} onChange={(e) => setIsPenalty(e.target.checked)} className="h-4 w-4 rounded border-border accent-accent" />Goal scored as penalty</label>}</>;

  if (isNew) return <div className="mt-4"><div className="grid grid-cols-2 gap-3">{fields}</div><Button className="mt-4 w-full sm:w-auto" size="sm" onClick={save} disabled={busy || !playerId}>{busy ? "Adding…" : "Add event"}</Button></div>;

  return <details className="rounded-xl border border-border"><summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium"><span className="flex items-center justify-between gap-3"><span className="capitalize">{eventType.replace("_", " ")} · {team.shortName} · {minute}{extraTimeMinute ? `+${extraTimeMinute}` : ""}&apos;</span><span className="text-xs text-accent">Edit</span></span></summary><div className="border-t border-border p-4"><div className="grid grid-cols-2 gap-3">{fields}</div><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" onClick={save} disabled={busy || !playerId}>Save event</Button><Button size="sm" variant="danger" onClick={remove} disabled={busy}>Delete</Button></div></div></details>;
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
