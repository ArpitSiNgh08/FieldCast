"use client";

import { useState } from "react";
import type { Team, TeamPlayer, Tournament } from "@/lib/types";
import { api } from "@/lib/api";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Select } from "@/ui/Input";

type SquadRole = "playing" | "bench";

export function TournamentSquadEditor({ tournament, onSaved }: { tournament: Tournament; onSaved: () => Promise<void> }) {
  const [teamId, setTeamId] = useState(tournament.teams[0]?.teamId || 0);
  const selected = tournament.teams.find((membership) => membership.teamId === teamId)?.team;
  const playingSize = tournament.sport === "basketball" ? 5 : 11;

  if (!selected) return null;
  return (
    <div className="space-y-4">
      <Field label="Team to edit" className="max-w-sm">
        <Select value={teamId} onChange={(event) => setTeamId(Number(event.target.value))}>
          {tournament.teams.map((membership) => <option key={membership.teamId} value={membership.teamId}>{membership.team.name}</option>)}
        </Select>
      </Field>
      <SquadEditor key={`${teamId}:${(selected.players || []).map((membership) => `${membership.playerId}-${membership.squadRole || "bench"}`).join(",")}`} tournamentId={tournament.id} team={selected} playingSize={playingSize} onSaved={onSaved} />
    </div>
  );
}

export function SquadEditor({
  tournamentId,
  team,
  playingSize,
  onSaved,
}: {
  tournamentId: number;
  team: Team;
  playingSize: number;
  onSaved: () => Promise<void>;
}) {
  const [players, setPlayers] = useState<TeamPlayer[]>(() => (team.players || []).map((membership) => ({
    ...membership,
    squadRole: membership.squadRole === "playing" ? "playing" : "bench",
  })));
  const [draggedPlayerId, setDraggedPlayerId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const playing = players.filter((player) => player.squadRole === "playing");
  const bench = players.filter((player) => player.squadRole !== "playing");

  function move(playerId: number, role: SquadRole) {
    if (role === "playing" && playing.length >= playingSize && !playing.some((player) => player.playerId === playerId)) {
      setError(`Playing squad is limited to ${playingSize} players.`);
      return;
    }
    setError("");
    setMessage("");
    setPlayers((current) => current.map((player) => player.playerId === playerId ? { ...player, squadRole: role } : player));
  }

  function drop(role: SquadRole) {
    if (draggedPlayerId) move(draggedPlayerId, role);
    setDraggedPlayerId(null);
  }

  async function save() {
    if (playing.length !== playingSize) {
      setError(`Choose exactly ${playingSize} players for the starting squad.`);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.updateTeamLineup(tournamentId, team.id, playing.map((player) => player.playerId));
      setMessage("Squad saved. Scorecard selection now uses this playing squad.");
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the squad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit {team.name} squad</CardTitle>
        <p className="mt-1 text-sm text-muted">Drag players between the starting squad and bench, then save.</p>
      </CardHeader>
      <CardBody>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <SquadColumn
            title={`Playing ${playingSize}`}
            hint={`${playing.length}/${playingSize} selected`}
            role="playing"
            players={playing}
            onDragStart={setDraggedPlayerId}
            onDrop={drop}
            onMove={(playerId) => move(playerId, "bench")}
          />
          <SquadColumn
            title="Bench"
            hint={`${bench.length} player${bench.length === 1 ? "" : "s"}`}
            role="bench"
            players={bench}
            onDragStart={setDraggedPlayerId}
            onDrop={drop}
            onMove={(playerId) => move(playerId, "playing")}
          />
        </div>
        <Button loading={busy} className="mt-5 w-full" onClick={save} disabled={busy || playing.length !== playingSize}>
          {busy ? "Saving…" : "Save playing squad"}
        </Button>
      </CardBody>
    </Card>
  );
}

function SquadColumn({
  title,
  hint,
  role,
  players,
  onDragStart,
  onDrop,
  onMove,
}: {
  title: string;
  hint: string;
  role: SquadRole;
  players: TeamPlayer[];
  onDragStart: (playerId: number) => void;
  onDrop: (role: SquadRole) => void;
  onMove: (playerId: number) => void;
}) {
  return (
    <section
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); onDrop(role); }}
      className="min-h-64 rounded-xl border-2 border-dashed border-border bg-surface-2/60 p-3"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted">{hint}</span>
      </div>
      <div className="space-y-2">
        {players.map((membership) => (
          <div
            key={membership.playerId}
            draggable
            onDragStart={() => onDragStart(membership.playerId)}
            onDragEnd={() => onDragStart(0)}
            className="flex cursor-grab items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 shadow-sm active:cursor-grabbing"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium"><span className="mr-2 text-accent">#{membership.jerseyNumber}</span>{membership.player.name}</p>
              <p className="text-xs text-muted">{membership.position || "Position not set"}</p>
            </div>
            <button type="button" onClick={() => onMove(membership.playerId)} className="shrink-0 text-xs font-medium text-accent hover:underline">
              Move
            </button>
          </div>
        ))}
        {players.length === 0 && <p className="py-10 text-center text-xs text-muted">Drop players here</p>}
      </div>
    </section>
  );
}
