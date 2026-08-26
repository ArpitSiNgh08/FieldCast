"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TournamentSquadEditor } from "@/components/SquadEditor";
import { OrganizerTeamEditor } from "@/components/OrganizerTeamEditor";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Match, Tournament } from "@/lib/types";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardBody } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Input, Select } from "@/ui/Input";

export default function OrganizerPage() {
  const { user, loading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [email, setEmail] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [startMatchId, setStartMatchId] = useState("");
  const [matchStageType, setMatchStageType] = useState<"pool" | "knockout" | "">("");
  const [poolId, setPoolId] = useState("");
  const [knockoutChoice, setKnockoutChoice] = useState("Semi-final");
  const [customKnockoutStage, setCustomKnockoutStage] = useState("");
  const [createAsWashout, setCreateAsWashout] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = tournaments.find((tournament) => tournament.id === selectedId);
  const activeMatches = matches.filter((match) => match.status === "upcoming" || match.status === "live");
  const effectiveStageType = matchStageType || (selected?.pools.length ? "pool" : "knockout");
  const effectivePoolId = selected?.pools.some((pool) => String(pool.id) === poolId) ? poolId : String(selected?.pools[0]?.id || "");
  const eligibleTeams = selected?.teams.filter((membership) => effectiveStageType !== "pool" || String(membership.poolId) === effectivePoolId) || [];

  const load = useCallback(async () => {
    const data = await api.organizedTournaments();
    setTournaments(data);
    let initialId = 0;
    if (typeof window !== "undefined") {
      const paramId = new URLSearchParams(window.location.search).get("tournamentId");
      if (paramId) initialId = Number(paramId);
    }
    setSelectedId((current) => current || initialId || data[0]?.id || 0);
  }, []);

  const loadMatches = useCallback(async () => {
    setMatches(selectedId ? await api.listMatches({ tournamentId: String(selectedId) }) : []);
  }, [selectedId]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => load().catch((reason) => setError(reason.message)), 0);
    return () => clearTimeout(timer);
  }, [user, load]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadMatches().catch((reason) => setError(reason.message)), 0);
    return () => clearTimeout(timer);
  }, [loadMatches]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.addOrganizer(selected.id, email);
      setTournaments((items) => items.map((tournament) => tournament.id === updated.id ? updated : tournament));
      setEmail("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add organiser");
    } finally {
      setBusy(false);
    }
  }

  async function createMatch(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const match = await api.createMatch({
        tournamentId: selected.id,
        teamAId: Number(teamA),
        teamBId: Number(teamB),
        sport: selected.sport,
        scheduledAt,
        venue,
        stageType: effectiveStageType,
        poolId: effectiveStageType === "pool" ? Number(effectivePoolId) : undefined,
        knockoutStage: effectiveStageType === "knockout" ? (knockoutChoice === "custom" ? customKnockoutStage : knockoutChoice) : undefined,
      });
      if (createAsWashout) {
        await api.setMatchResult(match.id, { resultType: "washout" });
        setCreateAsWashout(false);
        await loadMatches();
      } else {
        window.location.assign(`/organizer/matches/${match.id}`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create match");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="py-24 text-center text-muted">Loading…</div>;
  if (!user) return <div className="py-24 text-center"><p className="text-muted">Log in to access organiser controls.</p><Link href="/auth" className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 font-semibold text-black">Log in</Link></div>;

  return (
    <div className="mx-auto max-w-6xl px-0 py-6 sm:px-4 sm:py-10">
      <div className="mb-8 px-4 sm:px-0">
        <p className="text-sm font-medium text-accent">Organiser workspace</p>
        <h1 className="mt-1 text-2xl font-bold">Run your tournaments</h1>
        <p className="mt-2 text-sm text-muted">Create fixtures, set playing squads, prepare cameras, and manage live scorecards.</p>
      </div>
      {error && <p className="mx-4 mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-0">{error}</p>}
      {!tournaments.length ? (
        <Card><CardBody className="py-16 text-center"><h2 className="font-semibold">No approved tournaments to manage</h2><p className="mt-2 text-sm text-muted">Once one of your submissions is approved, it will appear here and you will become its first organiser.</p></CardBody></Card>
      ) : (
        <>
          <Field label="Choose approved tournament" className="mb-6 max-w-md px-4 sm:px-0">
            <Select value={selectedId} onChange={(event) => { setSelectedId(Number(event.target.value)); setTeamA(""); setTeamB(""); setMatchStageType(""); setPoolId(""); }}>
              {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name} · {tournament.sport}</option>)}
            </Select>
          </Field>
          {selected && (
            <div className="space-y-4">
              <details open className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:hidden"><span>Upcoming and live matches</span><span className="text-sm text-muted transition-transform group-open:rotate-180">⌄</span></summary>
                <div className="border-t border-border p-4">
                    <div className="space-y-3">
                      {activeMatches.map((match) => (
                        <Link href={`/organizer/matches/${match.id}`} key={match.id} className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:border-accent">
                          <div><p className="font-medium">{match.teamA.name} vs {match.teamB.name}</p><p className="mt-1 text-xs text-muted">{match.poolName || match.knockoutStage || "Legacy fixture"} · {match.venue || "Venue pending"} · {match.cameras.length} camera{match.cameras.length === 1 ? "" : "s"}</p></div>
                          <Badge tone={match.status === "live" ? "accent" : "muted"}>{match.resultType === "washout" ? "washout" : match.status}</Badge>
                        </Link>
                      ))}
                      {!activeMatches.length && <p className="py-8 text-center text-sm text-muted">No upcoming or live matches. Completed-match results are managed by the admin.</p>}
                    </div>
                </div>
              </details>

              {selected.sport === "football" && <details className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:hidden"><span>Edit playing squad</span><span className="text-sm text-muted transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-border p-4"><TournamentSquadEditor key={selected.id} tournament={selected} onSaved={load} /></div></details>}

              <details className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:hidden"><span>Edit teams and players</span><span className="text-sm text-muted transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-border p-4"><OrganizerTeamEditor key={`teams-${selected.id}`} tournament={selected} onSaved={load} /></div></details>
                
                {selected.sport === "football" && activeMatches.some(m => m.status === "upcoming") && (
                  <details className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:hidden"><span>Open a scheduled match</span><span className="text-sm text-muted transition-transform group-open:rotate-180">⌄</span></summary>
                    <div className="border-t border-border p-4"><p className="mb-4 text-sm text-muted">Open an upcoming fixture to prepare cameras and go live.</p>
                      <form onSubmit={(e) => { e.preventDefault(); if (startMatchId) window.location.assign(`/organizer/matches/${startMatchId}`); }} className="grid gap-4 sm:grid-cols-2">
                        <Field label="Upcoming match" className="sm:col-span-2">
                          <Select value={startMatchId} onChange={(e) => setStartMatchId(e.target.value)} required>
                            <option value="">Choose match</option>
                            {activeMatches.filter(m => m.status === "upcoming").map(m => (
                              <option key={m.id} value={m.id}>{m.teamA.name} vs {m.teamB.name}</option>
                            ))}
                          </Select>
                        </Field>
                        <Button type="submit" disabled={!startMatchId} className="sm:col-span-2">Setup & Start</Button>
                      </form>
                    </div>
                  </details>
                )}

                {selected.sport === "football" ? (
                  <details className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:hidden"><span>Create new match</span><span className="text-sm text-muted transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-border p-4"><p className="mb-4 text-sm text-muted">Kickoff and venue are part of the required broadcast preflight.</p>
                      <form onSubmit={createMatch} className="grid gap-4 sm:grid-cols-2">
                        <Field label="Match stage"><Select value={effectiveStageType} onChange={(event) => { setMatchStageType(event.target.value as "pool" | "knockout"); setTeamA(""); setTeamB(""); }}>{selected.pools.length > 0 && <option value="pool">Pool stage</option>}<option value="knockout">Knockout stage</option></Select></Field>
                        {effectiveStageType === "pool" ? <Field label="Pool"><Select value={effectivePoolId} onChange={(event) => { setPoolId(event.target.value); setTeamA(""); setTeamB(""); }} required>{selected.pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name}</option>)}</Select></Field> : <Field label="Knockout round"><Select value={knockoutChoice} onChange={(event) => setKnockoutChoice(event.target.value)}><option value="Semi-final">Semi-final</option><option value="Final">Final</option><option value="custom">Add another stage…</option></Select></Field>}
                        {effectiveStageType === "knockout" && knockoutChoice === "custom" && <Field label="Stage name" className="sm:col-span-2"><Input value={customKnockoutStage} onChange={(event) => setCustomKnockoutStage(event.target.value)} required maxLength={50} placeholder="Round of 16 or Quarterfinal" /></Field>}
                        <Field label="Home team"><Select value={teamA} onChange={(event) => setTeamA(event.target.value)} required><option value="">Choose team</option>{eligibleTeams.map((membership) => <option key={membership.teamId} value={membership.teamId}>{membership.team.name}</option>)}</Select></Field>
                        <Field label="Away team"><Select value={teamB} onChange={(event) => setTeamB(event.target.value)} required><option value="">Choose team</option>{eligibleTeams.filter((membership) => String(membership.teamId) !== teamA).map((membership) => <option key={membership.teamId} value={membership.teamId}>{membership.team.name}</option>)}</Select></Field>
                        <Field label="Kickoff"><Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required /></Field>
                        <Field label="Venue"><Input value={venue} onChange={(event) => setVenue(event.target.value)} required placeholder="College football ground" /></Field>
                        <label className="flex items-start gap-3 rounded-lg border border-border p-3 sm:col-span-2"><input type="checkbox" checked={createAsWashout} onChange={(event) => setCreateAsWashout(event.target.checked)} className="mt-1 h-4 w-4 accent-accent" /><span><span className="block text-sm font-medium">Declare this fixture a washout</span><span className="block text-xs text-muted">Creates the fixture as completed without affecting played, wins, draws, losses, or points.</span></span></label>
                        <Button type="submit" disabled={busy} className="sm:col-span-2">{createAsWashout ? "Create and declare washout" : "Create match & prepare stream"}</Button>
                      </form>
                    </div></details>
                ) : <div className="rounded-xl border border-border p-5 text-center text-sm text-muted">The organiser broadcast setup is currently implemented for football. Other sports come next.</div>}
              <details className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold marker:hidden"><span>Organisers</span><span className="text-sm text-muted transition-transform group-open:rotate-180">⌄</span></summary>
                <div className="border-t border-border p-4"><p className="mb-4 text-sm text-muted">Everyone listed here can manage scores, cameras, and fixtures for this tournament.</p>
                    <div className="space-y-3">{selected.organizers.map((organizer) => <div key={organizer.userId}><p className="text-sm font-medium">{organizer.user.name || organizer.user.email}</p><p className="text-xs text-muted">{organizer.user.email}</p></div>)}</div>
                    <form onSubmit={invite} className="mt-5 space-y-3"><Field label="Add organiser by account email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="organiser@college.edu" /></Field><Button type="submit" variant="outline" className="w-full" disabled={busy}>Add organiser</Button></form>
                </div>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}
