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
  if (!name?.trim() || !RULES[sport]) return res.status(400).json({ error: 'A name and valid sport are required' });
  res.status(201).json(await Tournaments.create({ name: name.trim(), sport, format, startDate, endDate, imageUrl, creatorId: req.user.sub }));
}

async function update(req, res) {
  if (!(await requireEditable(req, res))) return;
  res.json(await Tournaments.update(req.params.id, req.body));
}

async function addTeam(req, res) {
  const t = await requireEditable(req, res); if (!t) return;
  const { name, shortName } = req.body;
  if (!name?.trim() || !shortName?.trim()) return res.status(400).json({ error: 'Team name and short name are required' });
  const rule = RULES[t.sport];
  if (t.teams.length >= rule.maxTeams) return res.status(400).json({ error: `${t.sport} supports at most ${rule.maxTeams} teams` });
  res.status(201).json(await Tournaments.addTeam(t.id, { name: name.trim(), shortName: shortName.trim().toUpperCase(), sport: t.sport, ownerId: req.user.sub }));
}

async function updateTeam(req, res) {
  const t = await requireEditable(req, res); if (!t) return;
  if (!t.teams.some((x) => x.teamId === Number(req.params.teamId))) return res.status(404).json({ error: 'Team not in tournament' });
  res.json(await Tournaments.updateTeam(req.params.teamId, req.body));
}

async function deleteTeam(req, res) {
  const t = await requireEditable(req, res); if (!t) return;
  await Tournaments.removeTeam(t.id, req.params.teamId); res.status(204).end();
}

async function addPlayer(req, res) {
  const t = await requireEditable(req, res); if (!t) return;
  const team = t.teams.find((x) => x.teamId === Number(req.params.teamId));
  if (!team) return res.status(404).json({ error: 'Team not in tournament' });
  const { playerId, name, jerseyNumber, position } = req.body;
  if ((!playerId && !name?.trim()) || jerseyNumber === undefined || jerseyNumber === '') return res.status(400).json({ error: 'Player and jersey number are required' });
  if (team.team.players.length >= RULES[t.sport].maxPlayers) return res.status(400).json({ error: `Maximum roster size is ${RULES[t.sport].maxPlayers}` });
  res.status(201).json(await Tournaments.addPlayer(team.teamId, { playerId, name, jerseyNumber, position, squadRole: 'bench', ownerId: req.user.sub }));
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
  const invalid = t.teams.find(({ team }) => team.players.length < rule.minPlayers || team.players.length > rule.maxPlayers);
  if (invalid) return res.status(400).json({ error: `${invalid.team.name} needs ${rule.minPlayers}–${rule.maxPlayers} players` });
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

module.exports = { list, mine, pending, organized, get, create, update, addTeam, updateTeam, updateLineup, deleteTeam, addPlayer, deletePlayer, submit, review, addOrganizer, standings, players, RULES };
