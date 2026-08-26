'use strict';

const Tournaments = require('../models/tournaments.model');
const Standings = require('../models/standings.model');
const standingsService = require('../services/standings.service');
const authorization = require('../services/authorization.service');

const RULES = {
  cricket: { minTeams: 2, maxTeams: 16, minPlayers: 11, maxPlayers: 15 },
  football: { minTeams: 2, maxTeams: 32, minPlayers: 11, maxPlayers: 23 },
  basketball: { minTeams: 2, maxTeams: 32, minPlayers: 5, maxPlayers: 15 },
};

function canEdit(t, user) {
  return user?.role === 'admin' || t.creatorId === Number(user?.sub);
}

async function requireEditable(req, res) {
  const t = await Tournaments.findById(req.params.id);
  if (!t) res.status(404).json({ error: 'Tournament not found' });
  else if (!canEdit(t, req.user)) res.status(403).json({ error: 'You cannot edit this tournament' });
  else if (!['draft', 'rejected'].includes(t.approvalStatus)) res.status(409).json({ error: 'Only draft or rejected tournaments can be edited' });
  else return t;
  return null;
}

async function requireTeamEditor(req, res) {
  const t = await Tournaments.findById(req.params.id);
  if (!t) res.status(404).json({ error: 'Tournament not found' });
  else if (!canEdit(t, req.user) && !(await authorization.canManageTournament(req.user, t.id))) res.status(403).json({ error: 'Tournament organiser access required' });
  else return t;
  return null;
}

async function list(req, res) { res.json(await Tournaments.list({ sport: req.query.sport })); }
async function mine(req, res) { res.json(await Tournaments.list({ creatorId: req.user.sub, approvalStatus: null })); }
async function pending(_req, res) { res.json(await Tournaments.list({ approvalStatus: 'submitted' })); }
async function organized(req, res) { res.json(await Tournaments.listOrganized(req.user.sub)); }

async function get(req, res) {
  const t = await Tournaments.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  if (t.approvalStatus !== 'approved' && !canEdit(t, req.user)) return res.status(403).json({ error: 'Tournament is not public' });
  res.json(t);
}

async function create(req, res) {
  const { name, sport, format, startDate, endDate, imageUrl } = req.body;
  const poolNames = normalizePoolNames(req.body.poolNames);
  if (!name?.trim() || !RULES[sport]) return res.status(400).json({ error: 'A name and valid sport are required' });
  if (req.body.poolNames !== undefined && !poolNames) return res.status(400).json({ error: 'Pool names must be unique and non-empty' });
  res.status(201).json(await Tournaments.create({ name: name.trim(), sport, format, startDate, endDate, imageUrl, creatorId: req.user.sub, poolNames: poolNames || [] }));
}

function normalizePoolNames(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const names = value.map((name) => typeof name === 'string' ? name.trim() : '').filter(Boolean);
  if (names.length !== value.length || names.some((name) => name.length > 50)) return null;
  if (new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length) return null;
  return names;
}

async function addPool(req, res) {
  const t = await requireEditable(req, res); if (!t) return;
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 50) return res.status(400).json({ error: 'Pool name is required and must be 50 characters or fewer' });
  if (t.pools.some((pool) => pool.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return res.status(400).json({ error: 'Pool names must be unique' });
  res.status(201).json(await Tournaments.addPool(t.id, name));
}

async function update(req, res) {
  if (!(await requireEditable(req, res))) return;
  res.json(await Tournaments.update(req.params.id, req.body));
}

async function addTeam(req, res) {
  const t = await requireEditable(req, res); if (!t) return;
  const { name, shortName, poolId } = req.body;
  if (!name?.trim() || !shortName?.trim()) return res.status(400).json({ error: 'Team name and short name are required' });
  const rule = RULES[t.sport];
  if (t.teams.length >= rule.maxTeams) return res.status(400).json({ error: `${t.sport} supports at most ${rule.maxTeams} teams` });
  if (t.pools.length && !t.pools.some((pool) => pool.id === Number(poolId))) return res.status(400).json({ error: 'Choose a valid pool for this team' });
  res.status(201).json(await Tournaments.addTeam(t.id, { name: name.trim(), shortName: shortName.trim().toUpperCase(), sport: t.sport, ownerId: req.user.sub, poolId }));
}

async function updateTeam(req, res) {
  const t = await requireTeamEditor(req, res); if (!t) return;
  if (!t.teams.some((x) => x.teamId === Number(req.params.teamId))) return res.status(404).json({ error: 'Team not in tournament' });
  if (req.body.poolId !== undefined) {
    if (t.pools.length && !t.pools.some((pool) => pool.id === Number(req.body.poolId))) return res.status(400).json({ error: 'Choose a valid pool for this team' });
    await Tournaments.updateTeamPool(t.id, req.params.teamId, req.body.poolId);
  }
  res.json(await Tournaments.updateTeam(req.params.teamId, req.body));
}

async function deleteTeam(req, res) {
  const t = await requireEditable(req, res); if (!t) return;
  await Tournaments.removeTeam(t.id, req.params.teamId); res.status(204).end();
}

async function addPlayer(req, res) {
  const t = await requireTeamEditor(req, res); if (!t) return;
  const team = t.teams.find((x) => x.teamId === Number(req.params.teamId));
  if (!team) return res.status(404).json({ error: 'Team not in tournament' });
  const { playerId, name, jerseyNumber, position } = req.body;
  if ((!playerId && !name?.trim()) || jerseyNumber === undefined || jerseyNumber === '') return res.status(400).json({ error: 'Player and jersey number are required' });
  if (team.team.players.length >= RULES[t.sport].maxPlayers) return res.status(400).json({ error: `Maximum roster size is ${RULES[t.sport].maxPlayers}` });
  res.status(201).json(await Tournaments.addPlayer(team.teamId, { playerId, name, jerseyNumber, position, ownerId: req.user.sub }));
}

async function updatePlayer(req, res) {
  const t = await requireTeamEditor(req, res); if (!t) return;
  const team = t.teams.find((entry) => entry.teamId === Number(req.params.teamId));
  if (!team) return res.status(404).json({ error: 'Team not in tournament' });
  const membership = team.team.players.find((entry) => entry.playerId === Number(req.params.playerId));
  if (!membership) return res.status(404).json({ error: 'Player is not in this team' });
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;
  const jerseyNumber = req.body.jerseyNumber !== undefined ? String(req.body.jerseyNumber).trim() : undefined;
  const position = typeof req.body.position === 'string' ? req.body.position.trim() : undefined;
  if (name !== undefined && !name) return res.status(400).json({ error: 'Player name is required' });
  if (jerseyNumber !== undefined && !jerseyNumber) return res.status(400).json({ error: 'Jersey number is required' });
  res.json(await Tournaments.updatePlayer(team.teamId, membership.playerId, { name, jerseyNumber, position }));
}

async function updateLineup(req, res) {
  const t = await Tournaments.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  if (!(await authorization.canManageTournament(req.user, t.id))) return res.status(403).json({ error: 'Tournament organiser access required' });
  const membership = t.teams.find((entry) => entry.teamId === Number(req.params.teamId));
  if (!membership) return res.status(404).json({ error: 'Team not in tournament' });
  const playingPlayerIds = Array.isArray(req.body.playingPlayerIds) ? req.body.playingPlayerIds.map(Number) : [];
  const expected = t.sport === 'basketball' ? 5 : 11;
  if (playingPlayerIds.length !== expected || new Set(playingPlayerIds).size !== expected) {
    return res.status(400).json({ error: `Choose exactly ${expected} starting players` });
  }
  const rosterIds = new Set(membership.team.players.map((player) => player.playerId));
  if (playingPlayerIds.some((playerId) => !rosterIds.has(playerId))) return res.status(400).json({ error: 'Lineup contains a player outside this team' });
  res.json(await Tournaments.updateLineup(membership.teamId, playingPlayerIds));
}

async function deletePlayer(req, res) {
  const t = await requireEditable(req, res); if (!t) return;
  await Tournaments.removePlayer(req.params.teamId, req.params.playerId); res.status(204).end();
}

async function submit(req, res) {
  const t = await requireEditable(req, res); if (!t) return;
  const rule = RULES[t.sport];
  if (t.teams.length < rule.minTeams) return res.status(400).json({ error: `Add at least ${rule.minTeams} teams` });
  if (t.pools.length && t.teams.some((team) => !team.poolId)) return res.status(400).json({ error: 'Assign every team to a pool before submitting' });
  const invalid = t.teams.find(({ team }) => team.players.length > rule.maxPlayers);
  if (invalid) return res.status(400).json({ error: `${invalid.team.name} can have at most ${rule.maxPlayers} players` });
  res.json(await Tournaments.setSubmission(t.id));
}

async function review(req, res) {
  const { decision, reason } = req.body;
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Decision must be approved or rejected' });
  if (decision === 'rejected' && !reason?.trim()) return res.status(400).json({ error: 'Give a rejection reason' });
  res.json(await Tournaments.review(req.params.id, { decision, reason: reason?.trim(), reviewerId: req.user.sub }));
}

async function addOrganizer(req, res) {
  const t = await Tournaments.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  if (t.approvalStatus !== 'approved') return res.status(409).json({ error: 'Organisers can be added after approval' });
  if (!(await authorization.canManageTournament(req.user, t.id))) return res.status(403).json({ error: 'Tournament organiser access required' });
  const email = req.body.email?.trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const updated = await Tournaments.addOrganizer(t.id, email, req.user.sub);
  if (!updated) return res.status(404).json({ error: 'That email does not have a FieldCast account yet' });
  res.json(updated);
}

async function standings(req, res) {
  await standingsService.recomputeForTournament(req.params.id);
  res.json(await Standings.listByTournament(req.params.id));
}
async function players(req, res) { res.json(await Tournaments.listPlayers(req.user.sub)); }

module.exports = { list, mine, pending, organized, get, create, update, addPool, addTeam, updateTeam, updateLineup, deleteTeam, addPlayer, updatePlayer, deletePlayer, submit, review, addOrganizer, standings, players, RULES };
