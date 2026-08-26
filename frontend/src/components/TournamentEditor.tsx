"use client";
/* eslint-disable @next/next/no-img-element -- previews may be local data URLs */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Player, Sport, Tournament } from "@/lib/types";
import { SPORTS, SPORT_LABEL } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Input, Select } from "@/ui/Input";

const RULES: Record<Sport, { players: string; teams: string }> = {
  cricket: { players: "11–15 players per team", teams: "2–16 teams" },
  football: { players: "11–23 players per team", teams: "2–32 teams" },
  basketball: { players: "5–15 players per team", teams: "2–32 teams" },
};

export function TournamentEditor({ tournamentId }: { tournamentId?: number }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [sport, setSport] = useState<Sport>("cricket");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [usePools, setUsePools] = useState(false);
  const [poolNames, setPoolNames] = useState(["Pool A", "Pool B"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!tournamentId) return;
    const data = await api.getTournament(tournamentId);
    setTournament(data); setName(data.name); setSport(data.sport); setImageUrl(data.imageUrl);
  }, [tournamentId]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      refresh().catch((cause) => setError(cause.message));
      api.myPlayers().then(setPlayers).catch(() => {});
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, refresh]);

  function photo(file?: File) {
    if (!file) return;
    if (file.size > 2_000_000) { setError("Photo must be smaller than 2 MB"); return; }
    const reader = new FileReader(); reader.onload = () => setImageUrl(String(reader.result)); reader.readAsDataURL(file);
  }

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (tournament) setTournament(await api.updateTournament(tournament.id, { name, sport, imageUrl }));
      else {
        const created = await api.createTournament({ name, sport, imageUrl, poolNames: usePools ? poolNames : [] });
        router.replace(`/tournaments/${created.id}/edit`);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save draft"); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="py-24 text-center text-muted">Loading…</div>;
  if (!user) return <div className="py-24 text-center"><p className="text-muted">You need an account to create a draft.</p><Link href="/auth" className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 font-semibold text-black">Log in or sign up</Link></div>;

  return <div className="mx-auto max-w-5xl px-4 py-10">
    <div className="mb-8"><p className="text-sm font-medium text-accent">Tournament builder</p><h1 className="mt-1 text-2xl font-bold">{tournament ? "Edit tournament draft" : "Create a tournament"}</h1><p className="mt-2 text-sm text-muted">Your progress stays in draft until you submit it for admin review.</p></div>
    {error && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit"><CardHeader><CardTitle>Tournament details</CardTitle></CardHeader><CardBody><form onSubmit={saveDetails} className="space-y-4">
        <img src={imageUrl || "/tournament-placeholder.svg"} alt="Tournament preview" className="h-36 w-full rounded-lg object-cover" />
        <Field label="Tournament photo" hint="Optional; a placeholder is used if empty."><Input type="file" accept="image/*" onChange={(event) => photo(event.target.files?.[0])} /></Field>
        <Field label="Tournament name"><Input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
        <Field label="Sport"><Select value={sport} onChange={(event) => setSport(event.target.value as Sport)} disabled={Boolean(tournament?.teams.length)}>{SPORTS.map((value) => <option key={value} value={value}>{SPORT_LABEL[value]}</option>)}</Select></Field>
        {!tournament && <PoolSetup enabled={usePools} setEnabled={setUsePools} names={poolNames} setNames={setPoolNames} />}
        <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted"><strong className="text-foreground">{SPORT_LABEL[sport]} rules:</strong><br />{RULES[sport].teams} · {RULES[sport].players}</div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : tournament ? "Save details" : "Save draft & add teams"}</Button>
      </form></CardBody></Card>
      <div>{!tournament ? <div className="rounded-xl border border-dashed border-border py-20 text-center text-sm text-muted">Save the tournament details to start adding teams and players.</div> : <DraftTeams tournament={tournament} savedPlayers={players} refresh={refresh} refreshPlayers={() => api.myPlayers().then(setPlayers)} setError={setError} />}</div>
    </div>
  </div>;
}

function PoolSetup({ enabled, setEnabled, names, setNames }: { enabled: boolean; setEnabled: (value: boolean) => void; names: string[]; setNames: React.Dispatch<React.SetStateAction<string[]>> }) {
  return <div className="space-y-3 rounded-lg border border-border p-3">
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span><strong className="block text-foreground">Use pools</strong><span className="text-xs text-muted">Create separate standings tables for each pool.</span></span></label>
    {enabled && <div className="space-y-2">{names.map((pool, index) => <div key={index} className="flex gap-2"><Input aria-label={`Pool ${index + 1} name`} value={pool} maxLength={50} onChange={(event) => setNames((current) => current.map((value, currentIndex) => currentIndex === index ? event.target.value : value))} required /><button type="button" className="px-1 text-xs text-red-600 disabled:text-muted" disabled={names.length === 1} onClick={() => setNames((current) => current.filter((_, currentIndex) => currentIndex !== index))}>Remove</button></div>)}<Button type="button" variant="outline" className="w-full" onClick={() => setNames((current) => [...current, `Pool ${String.fromCharCode(65 + current.length)}`])}>Add another pool</Button></div>}
  </div>;
}

function DraftTeams({ tournament, savedPlayers, refresh, refreshPlayers, setError }: { tournament: Tournament; savedPlayers: Player[]; refresh: () => Promise<void>; refreshPlayers: () => void; setError: (value: string) => void }) {
  const [teamName, setTeamName] = useState(""); const [shortName, setShortName] = useState("");
  const [poolId, setPoolId] = useState(tournament.pools[0]?.id ? String(tournament.pools[0].id) : "");
  const [newPoolName, setNewPoolName] = useState(""); const [busy, setBusy] = useState(false);
  const selectedPoolId = tournament.pools.some((pool) => String(pool.id) === poolId) ? poolId : String(tournament.pools[0]?.id || "");

  async function addTeam(event: React.FormEvent) { event.preventDefault(); setBusy(true); try { await api.addTournamentTeam(tournament.id, { name: teamName, shortName, poolId: selectedPoolId ? Number(selectedPoolId) : undefined }); setTeamName(""); setShortName(""); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add team"); } finally { setBusy(false); } }
  async function addPool(event: React.FormEvent) { event.preventDefault(); setBusy(true); try { await api.addTournamentPool(tournament.id, newPoolName); setNewPoolName(""); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add pool"); } finally { setBusy(false); } }
  async function submit() { setBusy(true); try { await api.submitTournament(tournament.id); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit"); } finally { setBusy(false); } }
  if (tournament.approvalStatus === "submitted") return <Card><CardBody className="py-16 text-center"><h2 className="text-xl font-semibold">Submitted for review</h2><p className="mt-2 text-sm text-muted">An admin will approve or reject this tournament. Editing is paused while it is under review.</p><Link href="/tournaments" className="mt-5 inline-block text-sm font-medium text-accent">Back to your tournaments</Link></CardBody></Card>;

  const teamEditor = (entry: Tournament["teams"][number]) => <TeamEditor key={entry.team.id} tournament={tournament} team={entry.team} poolId={entry.poolId} savedPlayers={savedPlayers} refresh={refresh} refreshPlayers={refreshPlayers} setError={setError} />;
  return <div className="space-y-5">
    <Card><CardHeader><CardTitle>Teams</CardTitle><p className="mt-1 text-sm text-muted">Add each participating team, choose its pool, then build its roster.</p></CardHeader><CardBody className="space-y-4">
      {tournament.pools.length > 0 && <form onSubmit={addPool} className="flex gap-3 rounded-lg bg-surface-2 p-3"><Input placeholder="New pool name" maxLength={50} value={newPoolName} onChange={(event) => setNewPoolName(event.target.value)} required /><Button type="submit" variant="outline" disabled={busy}>Add pool</Button></form>}
      <form onSubmit={addTeam} className={`grid gap-3 ${tournament.pools.length ? "sm:grid-cols-[1fr_120px_140px_auto]" : "sm:grid-cols-[1fr_120px_auto]"}`}><Input placeholder="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} required /><Input placeholder="Short name" maxLength={5} value={shortName} onChange={(event) => setShortName(event.target.value)} required />{tournament.pools.length > 0 && <Select aria-label="Pool" value={selectedPoolId} onChange={(event) => setPoolId(event.target.value)} required>{tournament.pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name}</option>)}</Select>}<Button type="submit" disabled={busy}>Add team</Button></form>
      {tournament.pools.length === 0 && <form onSubmit={addPool} className="flex items-center gap-3 border-t border-border pt-4"><Input placeholder="Pool A" maxLength={50} value={newPoolName} onChange={(event) => setNewPoolName(event.target.value)} required /><Button type="submit" variant="outline" disabled={busy}>Create first pool</Button></form>}
    </CardBody></Card>
    {tournament.pools.length > 0 ? <>{tournament.teams.some((entry) => !entry.poolId) && <section className="space-y-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-red-600">Choose a pool</h2>{tournament.teams.filter((entry) => !entry.poolId).map(teamEditor)}</section>}{tournament.pools.map((pool) => <section key={pool.id} className="space-y-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{pool.name}</h2>{tournament.teams.filter((entry) => entry.poolId === pool.id).map(teamEditor)}{!tournament.teams.some((entry) => entry.poolId === pool.id) && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">No teams in {pool.name} yet.</p>}</section>)}</> : tournament.teams.map(teamEditor)}
    {tournament.teams.length > 0 && <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-5"><div><p className="font-semibold">Ready for review?</p><p className="text-sm text-muted">Submission checks team and roster sizes for {tournament.sport}.</p></div><Button onClick={submit} disabled={busy}>Submit tournament</Button></div>}
  </div>;
}

function TeamEditor({ tournament, team, poolId, savedPlayers, refresh, refreshPlayers, setError }: { tournament: Tournament; team: Tournament["teams"][number]["team"]; poolId: number | null; savedPlayers: Player[]; refresh: () => Promise<void>; refreshPlayers: () => void; setError: (value: string) => void }) {
  const [name, setName] = useState(team.name); const [short, setShort] = useState(team.shortName); const [logoUrl, setLogoUrl] = useState<string | null>(team.logoUrl); const [selectedPoolId, setSelectedPoolId] = useState(poolId ? String(poolId) : "");
  const [playerId, setPlayerId] = useState(""); const [newName, setNewName] = useState(""); const [jersey, setJersey] = useState(""); const [position, setPosition] = useState(""); const [busy, setBusy] = useState(false);
  function teamLogo(file?: File) { if (!file) return; if (file.size > 1_000_000) { setError("Team logo must be smaller than 1 MB"); return; } const reader = new FileReader(); reader.onload = () => setLogoUrl(String(reader.result)); reader.readAsDataURL(file); }
  async function saveTeam() { setBusy(true); try { await api.updateTournamentTeam(tournament.id, team.id, { name, shortName: short, logoUrl, poolId: selectedPoolId ? Number(selectedPoolId) : null }); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update team"); } finally { setBusy(false); } }
  async function addPlayer(event: React.FormEvent) { event.preventDefault(); setBusy(true); try { await api.addTeamPlayer(tournament.id, team.id, { playerId: playerId ? Number(playerId) : undefined, name: playerId ? undefined : newName, jerseyNumber: jersey, position }); setPlayerId(""); setNewName(""); setJersey(""); setPosition(""); await refresh(); refreshPlayers(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add player"); } finally { setBusy(false); } }
  return <Card><CardHeader><div className="flex items-center justify-between gap-3"><div className="flex flex-1 flex-wrap gap-2"><div className="flex items-center gap-2"><img src={logoUrl || "/logo.svg"} alt="" className="h-10 w-10 rounded-full border border-border object-cover" /><label className="cursor-pointer rounded-lg border border-border px-2 py-2 text-xs text-muted hover:bg-surface-2"><span>Logo</span><input type="file" accept="image/*" className="sr-only" onChange={(event) => teamLogo(event.target.files?.[0])} /></label></div><Input className="min-w-40 flex-1" value={name} onChange={(event) => setName(event.target.value)} /><Input className="max-w-24" value={short} onChange={(event) => setShort(event.target.value)} maxLength={5} />{tournament.pools.length > 0 && <Select aria-label="Team pool" className="max-w-36" value={selectedPoolId} onChange={(event) => setSelectedPoolId(event.target.value)}>{tournament.pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name}</option>)}</Select>}<Button variant="outline" onClick={saveTeam} disabled={busy}>Save</Button></div><button className="text-xs text-red-600" onClick={async () => { await api.removeTournamentTeam(tournament.id, team.id); await refresh(); }}>Remove</button></div></CardHeader><CardBody>
    <div className="mb-4 space-y-2">{team.players?.map((membership) => <div key={membership.playerId} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm"><span><strong>#{membership.jerseyNumber}</strong> {membership.player.name}{membership.position ? ` · ${membership.position}` : ""}</span><button className="text-xs text-red-600" onClick={async () => { await api.removeTeamPlayer(tournament.id, team.id, membership.playerId); await refresh(); }}>Remove</button></div>)}{!team.players?.length && <p className="text-sm text-muted">No players added yet.</p>}</div>
    <form onSubmit={addPlayer} className="grid gap-3 sm:grid-cols-2"><Select value={playerId} onChange={(event) => setPlayerId(event.target.value)}><option value="">Create new player</option>{savedPlayers.filter((player) => !team.players?.some((membership) => membership.playerId === player.id)).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</Select>{!playerId && <Input placeholder="Player name" value={newName} onChange={(event) => setNewName(event.target.value)} required />}<Input placeholder="Jersey number" value={jersey} onChange={(event) => setJersey(event.target.value)} required /><Input placeholder="Position (optional)" value={position} onChange={(event) => setPosition(event.target.value)} /><Button type="submit" disabled={busy}>Add player</Button></form>
  </CardBody></Card>;
}
