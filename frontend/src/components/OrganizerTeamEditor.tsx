"use client";
/* eslint-disable @next/next/no-img-element -- team logos may be local data URLs. */

import { useState } from "react";
import type { Team, TeamPlayer, Tournament } from "@/lib/types";
import { api } from "@/lib/api";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Input, Select } from "@/ui/Input";

export function OrganizerTeamEditor({ tournament, onSaved }: { tournament: Tournament; onSaved: () => Promise<void> }) {
  const [teamId, setTeamId] = useState(tournament.teams[0]?.teamId || 0);
  const selected = tournament.teams.find((membership) => membership.teamId === teamId)?.team;
  if (!selected) return null;
  return <div className="space-y-4"><Field label="Team to edit"><Select value={teamId} onChange={(event) => setTeamId(Number(event.target.value))}>{tournament.teams.map((membership) => <option key={membership.teamId} value={membership.teamId}>{membership.team.name}</option>)}</Select></Field><TeamDetails key={`${selected.id}-${selected.players?.length || 0}`} tournamentId={tournament.id} team={selected} onSaved={onSaved} /></div>;
}

function TeamDetails({ tournamentId, team, onSaved }: { tournamentId: number; team: Team; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(team.name);
  const [shortName, setShortName] = useState(team.shortName);
  const [logoUrl, setLogoUrl] = useState(team.logoUrl);
  const [newName, setNewName] = useState("");
  const [newJersey, setNewJersey] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function chooseLogo(file?: File) {
    if (!file) return;
    if (file.size > 1_000_000) { setError("Team logo must be smaller than 1 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function saveTeam() {
    setBusy(true); setError(""); setMessage("");
    try { await api.updateTournamentTeam(tournamentId, team.id, { name, shortName, logoUrl }); await onSaved(); setMessage("Team details saved."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save team"); }
    finally { setBusy(false); }
  }

  async function addPlayer(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try { await api.addTeamPlayer(tournamentId, team.id, { name: newName, jerseyNumber: newJersey, position: newPosition }); await onSaved(); setNewName(""); setNewJersey(""); setNewPosition(""); setMessage("Player added."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add player"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5"><section className="space-y-3"><h3 className="font-semibold">Team details</h3><div className="flex items-center gap-3"><img src={logoUrl || "/logo.svg"} alt="" className="h-12 w-12 rounded-full border border-border object-cover" /><label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-surface-2">Change logo<input type="file" accept="image/*" className="sr-only" onChange={(event) => chooseLogo(event.target.files?.[0])} /></label></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Team name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Short code"><Input value={shortName} maxLength={5} onChange={(event) => setShortName(event.target.value)} /></Field></div><Button variant="outline" className="w-full sm:w-auto" onClick={saveTeam} disabled={busy}>Save team details</Button></section><section className="border-t border-border pt-5"><h3 className="font-semibold">Add player</h3><p className="mt-1 text-sm text-muted">Players can be added now and edited later. Player deletion is intentionally unavailable to preserve match history.</p><form onSubmit={addPlayer} className="mt-4 grid gap-3 sm:grid-cols-3"><Field label="Player name"><Input placeholder="e.g. Player 2" value={newName} onChange={(event) => setNewName(event.target.value)} required /></Field><Field label="Jersey number"><Input placeholder="e.g. 2" value={newJersey} onChange={(event) => setNewJersey(event.target.value)} required /></Field><Field label="Position"><Input placeholder="Optional" value={newPosition} onChange={(event) => setNewPosition(event.target.value)} /></Field><Button type="submit" disabled={busy} className="sm:col-span-3">Add player</Button></form></section><section className="border-t border-border pt-5"><h3 className="font-semibold">Edit players</h3><div className="mt-3">{(team.players || []).map((membership) => <PlayerDetails key={membership.playerId} tournamentId={tournamentId} teamId={team.id} membership={membership} onSaved={onSaved} />)}{!team.players?.length && <p className="py-3 text-sm text-muted">No players added yet.</p>}</div></section>{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}{message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700" role="status">{message}</p>}</div>;
}

function PlayerDetails({ tournamentId, teamId, membership, onSaved }: { tournamentId: number; teamId: number; membership: TeamPlayer; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(membership.player.name);
  const [jerseyNumber, setJerseyNumber] = useState(membership.jerseyNumber);
  const [position, setPosition] = useState(membership.position || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true); setMessage("");
    try { await api.updateTeamPlayer(tournamentId, teamId, membership.playerId, { name, jerseyNumber, position }); await onSaved(); setMessage("Saved"); }
    catch { setMessage("Could not save"); }
    finally { setBusy(false); }
  }
  return <details className="border-b border-border last:border-b-0"><summary className="cursor-pointer list-none py-3"><span className="flex items-center justify-between gap-3"><span className="font-medium">#{membership.jerseyNumber} {membership.player.name}</span><span className="text-xs text-accent">Edit</span></span></summary><div className="grid gap-3 pb-4 sm:grid-cols-3"><Field label="Player name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Jersey number"><Input value={jerseyNumber} onChange={(event) => setJerseyNumber(event.target.value)} /></Field><Field label="Position"><Input placeholder="Optional" value={position} onChange={(event) => setPosition(event.target.value)} /></Field><Button size="sm" onClick={save} disabled={busy} className="sm:col-span-3">{busy ? "Saving…" : "Save player"}</Button>{message && <p className="text-xs text-muted sm:col-span-3">{message}</p>}</div></details>;
}
