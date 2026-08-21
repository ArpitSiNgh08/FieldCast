"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { FootballEvent, Match, Scorecard, StandingRow, Tournament } from "@/lib/types";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Input, Select } from "@/ui/Input";

export default function AdminCorrectionsPage() {
  const { isAdmin, loading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
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
  }, [tournamentId]);

  useEffect(() => {
    if (!isAdmin || !tournamentId) return;
    const timer = window.setTimeout(() => loadTournament().catch((reason) => setError(reason.message)), 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin, tournamentId, loadTournament]);

  async function openMatch(matchId: number) {
    try { setError(""); setScorecard(await api.getScorecard(matchId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load match"); }
  }

  async function reloadScorecard() {
    if (!scorecard) return;
    setScorecard(await api.getScorecard(scorecard.match.id));
    setStandings(await api.getStandings(tournamentId));
  }

  if (loading) return <div className="py-24 text-center text-muted">Loading…</div>;
  if (!isAdmin) return <div className="py-24 text-center text-muted">Admin access required.</div>;

  return <div className="mx-auto max-w-6xl px-4 py-10">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-medium text-accent">Administration</p><h1 className="mt-1 text-2xl font-bold">Historical corrections</h1><p className="mt-2 max-w-2xl text-sm text-muted">Correct completed match events, final scores, and standings. Live match controls remain exclusive to tournament organisers.</p></div>
      <Link href="/admin/tournaments"><Button variant="outline">Tournament reviews</Button></Link>
    </div>
    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Field label="Tournament" className="mt-8 max-w-md"><Select value={tournamentId} onChange={(event) => setTournamentId(Number(event.target.value))}><option value={0}>Choose tournament</option>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name} · {tournament.sport}</option>)}</Select></Field>

    {tournamentId > 0 && <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
      <div><h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Completed matches</h2><div className="space-y-2">{matches.map((match) => <button key={match.id} onClick={() => openMatch(match.id)} className="w-full rounded-xl border border-border bg-surface p-4 text-left hover:border-accent"><p className="font-medium">{match.teamA.shortName} {match.state.teamAScore}–{match.state.teamBScore} {match.teamB.shortName}</p><p className="mt-1 text-xs text-muted">{match.resultType === "washout" ? "Washout" : "Completed"}</p></button>)}{!matches.length && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">No completed matches.</p>}</div></div>
      <div className="space-y-8">{scorecard ? <CompletedMatchEditor key={`${scorecard.match.id}-${scorecard.match.state.updatedAt}`} scorecard={scorecard} onChanged={reloadScorecard} /> : <Card><CardBody className="py-14 text-center text-muted">Choose a completed match to correct its score or events.</CardBody></Card>}<StandingsEditor tournamentId={tournamentId} rows={standings} onRows={setStandings} /></div>
    </div>}
  </div>;
}

function CompletedMatchEditor({ scorecard, onChanged }: { scorecard: Scorecard; onChanged: () => Promise<void> }) {
  const match = scorecard.match;
  const [scoreA, setScoreA] = useState(match.state.teamAScore);
  const [scoreB, setScoreB] = useState(match.state.teamBScore);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function saveScore() { setBusy(true); setMessage(""); try { await api.correctCompletedScore(match.id, { teamAScore: scoreA, teamBScore: scoreB }); await onChanged(); setMessage("Final score and derived standings updated."); } finally { setBusy(false); } }
  return <Card><CardHeader><CardTitle>{match.teamA.name} vs {match.teamB.name}</CardTitle><p className="mt-1 text-sm text-muted">Completed match #{match.id}</p></CardHeader><CardBody>
    <div className="grid gap-4 sm:grid-cols-2"><Field label={match.teamA.name}><Input type="number" min={0} value={scoreA} onChange={(event) => setScoreA(Number(event.target.value))} /></Field><Field label={match.teamB.name}><Input type="number" min={0} value={scoreB} onChange={(event) => setScoreB(Number(event.target.value))} /></Field></div><Button className="mt-4" onClick={saveScore} disabled={busy}>{busy ? "Saving…" : "Correct final score"}</Button>{message && <p className="mt-3 text-sm text-green-700">{message}</p>}
    {match.sport === "football" && <div className="mt-8 border-t border-border pt-6"><h3 className="font-semibold">Football events</h3><p className="mt-1 text-sm text-muted">Edit timeline records separately from the final-score correction.</p><div className="mt-4 space-y-3">{(scorecard.footballEvents || []).map((event) => <FootballEventEditor key={event.id} match={match} event={event} onChanged={onChanged} />)}<FootballEventEditor match={match} onChanged={onChanged} /></div></div>}
  </CardBody></Card>;
}

function FootballEventEditor({ match, event, onChanged }: { match: Match; event?: FootballEvent; onChanged: () => Promise<void> }) {
  const firstTeam = event?.team_id === match.teamB.id ? match.teamB : match.teamA;
  const [teamId, setTeamId] = useState(firstTeam.id);
  const [playerId, setPlayerId] = useState(event?.player_id || firstTeam.players?.[0]?.playerId || 0);
  const [eventType, setEventType] = useState(event?.event_type || "goal");
  const [half, setHalf] = useState(event?.half || 1);
  const [minute, setMinute] = useState(event?.minute || 0);
  const [extraTimeMinute, setExtra] = useState(event?.extra_time_minute || 0);
  const [busy, setBusy] = useState(false);
  const team = teamId === match.teamB.id ? match.teamB : match.teamA;
  function chooseTeam(value: number) { const selected = value === match.teamB.id ? match.teamB : match.teamA; setTeamId(value); setPlayerId(selected.players?.[0]?.playerId || 0); }
  async function save() { if (!playerId) return; setBusy(true); try { const body = { teamId, playerId, eventType, half, minute, extraTimeMinute }; if (event) await api.updateCompletedFootballEvent(match.id, event.id, body); else await api.addCompletedFootballEvent(match.id, body); await onChanged(); } finally { setBusy(false); } }
  async function remove() { if (!event || !window.confirm("Delete this event from the timeline?")) return; setBusy(true); try { await api.deleteCompletedFootballEvent(match.id, event.id); await onChanged(); } finally { setBusy(false); } }
  return <div className="rounded-xl border border-border p-4"><div className="grid gap-3 sm:grid-cols-3"><Select value={eventType} onChange={(e) => setEventType(e.target.value as FootballEvent["event_type"])}><option value="goal">Goal</option><option value="yellow_card">Yellow card</option><option value="red_card">Red card</option><option value="substitution">Substitution</option></Select><Select value={teamId} onChange={(e) => chooseTeam(Number(e.target.value))}><option value={match.teamA.id}>{match.teamA.shortName}</option><option value={match.teamB.id}>{match.teamB.shortName}</option></Select><Select value={playerId} onChange={(e) => setPlayerId(Number(e.target.value))}><option value={0}>Choose player</option>{(team.players || []).map((entry) => <option key={entry.playerId} value={entry.playerId}>#{entry.jerseyNumber} {entry.player.name}</option>)}</Select><Input type="number" min={1} max={2} value={half} onChange={(e) => setHalf(Number(e.target.value))} placeholder="Half" /><Input type="number" min={0} max={120} value={minute} onChange={(e) => setMinute(Number(e.target.value))} placeholder="Minute" /><Input type="number" min={0} max={30} value={extraTimeMinute} onChange={(e) => setExtra(Number(e.target.value))} placeholder="Added minute" /></div><div className="mt-3 flex gap-2"><Button size="sm" onClick={save} disabled={busy || !playerId}>{event ? "Save event" : "Add event"}</Button>{event && <Button size="sm" variant="danger" onClick={remove} disabled={busy}>Delete</Button>}</div></div>;
}

function StandingsEditor({ tournamentId, rows, onRows }: { tournamentId: number; rows: StandingRow[]; onRows: (rows: StandingRow[]) => void }) {
  return <Card><CardHeader><CardTitle>Standings overrides</CardTitle><p className="mt-1 text-sm text-muted">Overrides persist when match-derived standings are recomputed. Reset a row to return it to calculated values.</p></CardHeader><CardBody className="space-y-3">{rows.map((row) => <StandingEditorRow key={`${row.teamId}-${row.overridden}`} tournamentId={tournamentId} row={row} onRows={onRows} />)}</CardBody></Card>;
}

function StandingEditorRow({ tournamentId, row, onRows }: { tournamentId: number; row: StandingRow; onRows: (rows: StandingRow[]) => void }) {
  const [value, setValue] = useState({ played: row.played, won: row.won, lost: row.lost, drawn: row.drawn, points: row.points, scoredFor: row.scoredFor, scoredAgainst: row.scoredAgainst });
  const [busy, setBusy] = useState(false);
  const fields: [keyof typeof value, string][] = [["played", "P"], ["won", "W"], ["drawn", "D"], ["lost", "L"], ["points", "Pts"], ["scoredFor", "For"], ["scoredAgainst", "Against"]];
  async function save() { setBusy(true); try { onRows(await api.overrideStanding(tournamentId, row.teamId, value)); } finally { setBusy(false); } }
  async function reset() { setBusy(true); try { onRows(await api.clearStandingOverride(tournamentId, row.teamId)); } finally { setBusy(false); } }
  return <div className="rounded-xl border border-border p-4"><div className="flex items-center justify-between"><p className="font-medium">{row.teamName}</p>{row.overridden && <span className="text-xs font-medium text-accent">Overridden</span>}</div><div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">{fields.map(([key, label]) => <Field key={key} label={label}><Input type="number" min={0} value={value[key]} onChange={(event) => setValue({ ...value, [key]: Number(event.target.value) })} /></Field>)}</div><div className="mt-3 flex gap-2"><Button size="sm" onClick={save} disabled={busy}>Save row</Button>{row.overridden && <Button size="sm" variant="outline" onClick={reset} disabled={busy}>Reset calculated</Button>}</div></div>;
}
