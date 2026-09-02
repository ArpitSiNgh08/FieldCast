'use strict';

const FOOTBALL_HALF_LENGTH_MINUTES = 30;

const prisma = require('../config/prisma');
const Matches = require('../models/matches.model');
const Standings = require('../models/standings.model');
const standingsService = require('../services/standings.service');

const METRICS = ['played', 'won', 'lost', 'drawn', 'points', 'scoredFor', 'scoredAgainst'];
const EVENT_TYPES = ['goal', 'yellow_card', 'red_card', 'substitution', 'foul', 'corner', 'free_kick', 'offside'];
const TEAM_EVENT_TYPES = ['foul', 'corner', 'free_kick', 'offside'];

function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    const error = new Error(`${label} must be a non-negative integer`);
    error.status = 400;
    throw error;
  }
  return number;
}

async function completedMatch(id) {
  const match = await prisma.match.findUnique({ where: { id: Number(id) } });
  if (!match) { const error = new Error('Match not found'); error.status = 404; throw error; }
  if (match.status !== 'completed') { const error = new Error('Only completed matches can be corrected by an admin'); error.status = 409; throw error; }
  return match;
}

async function correctScore(req, res) {
  const match = await completedMatch(req.params.id);
  const teamAScore = nonNegativeInteger(req.body.teamAScore, 'Team A score');
  const teamBScore = nonNegativeInteger(req.body.teamBScore, 'Team B score');
  const winnerTeamId = teamAScore === teamBScore ? null : teamAScore > teamBScore ? match.teamAId : match.teamBId;
  await prisma.$transaction([
    prisma.matchState.upsert({
      where: { matchId: match.id },
      create: { matchId: match.id, teamAScore, teamBScore, status: 'completed' },
      update: { teamAScore, teamBScore, status: 'completed' },
    }),
    prisma.match.update({ where: { id: match.id }, data: { winnerTeamId, resultType: 'played' } }),
  ]);
  if (match.tournamentId) await standingsService.recomputeForTournament(match.tournamentId);
  res.json(await Matches.findById(match.id));
}

async function validateFootballEvent(match, body) {
  if (match.sport !== 'football') { const error = new Error('Football event correction is only available for football matches'); error.status = 400; throw error; }
  if (!EVENT_TYPES.includes(body.eventType)) { const error = new Error('Invalid football event'); error.status = 400; throw error; }
  const teamId = Number(body.teamId);
  if (![match.teamAId, match.teamBId].includes(teamId)) { const error = new Error('Choose one of the match teams'); error.status = 400; throw error; }
  const isTeamEvent = TEAM_EVENT_TYPES.includes(body.eventType);
  const playerId = body.playerId ? Number(body.playerId) : null;
  const membership = playerId ? await prisma.teamPlayer.findUnique({
    where: { teamId_playerId: { teamId, playerId } },
    include: { player: true },
  }) : null;
  if (!isTeamEvent && !membership) { const error = new Error('Choose a registered player from that team'); error.status = 400; throw error; }
  return {
    half: nonNegativeInteger(body.minute, 'Minute') > FOOTBALL_HALF_LENGTH_MINUTES ? 2 : 1,
    minute: nonNegativeInteger(body.minute, 'Minute'),
    extraTimeMinute: nonNegativeInteger(body.extraTimeMinute ?? 0, 'Extra-time minute'),
    eventType: body.eventType, teamId, playerId: isTeamEvent ? null : playerId,
    playerName: membership?.player.name ?? null, jerseyNumber: membership?.jerseyNumber ?? null,
    isPenalty: body.eventType === 'goal' && body.isPenalty === true,
  };
}

async function addFootballEvent(req, res) {
  const match = await completedMatch(req.params.id);
  const data = await validateFootballEvent(match, req.body);
  const event = await prisma.footballEvent.create({ data: { matchId: match.id, ...data } });
  res.status(201).json(event);
}

async function updateFootballEvent(req, res) {
  const match = await completedMatch(req.params.id);
  const eventId = Number(req.params.eventId);
  const existing = await prisma.footballEvent.findFirst({ where: { id: eventId, matchId: match.id } });
  if (!existing) return res.status(404).json({ error: 'Football event not found' });
  const data = await validateFootballEvent(match, req.body);
  res.json(await prisma.footballEvent.update({ where: { id: eventId }, data }));
}

async function deleteFootballEvent(req, res) {
  const match = await completedMatch(req.params.id);
  const event = await prisma.footballEvent.findFirst({ where: { id: Number(req.params.eventId), matchId: match.id } });
  if (!event) return res.status(404).json({ error: 'Football event not found' });
  await prisma.footballEvent.delete({ where: { id: event.id } });
  res.status(204).end();
}

async function overrideStanding(req, res) {
  const tournamentId = Number(req.params.id);
  const teamId = Number(req.params.teamId);
  const membership = await prisma.tournamentTeam.findUnique({ where: { tournamentId_teamId: { tournamentId, teamId } } });
  if (!membership) return res.status(404).json({ error: 'Team is not in this tournament' });
  const data = Object.fromEntries(METRICS.map((key) => [key, nonNegativeInteger(req.body[key], key)]));
  if (data.played !== data.won + data.drawn + data.lost) {
    return res.status(400).json({ error: 'Played must equal won + drawn + lost' });
  }
  await prisma.standingOverride.upsert({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    create: { tournamentId, teamId, ...data }, update: data,
  });
  res.json(await Standings.listByTournament(tournamentId));
}

async function clearStandingOverride(req, res) {
  const tournamentId = Number(req.params.id);
  const teamId = Number(req.params.teamId);
  await prisma.standingOverride.deleteMany({ where: { tournamentId, teamId } });
  res.json(await Standings.listByTournament(tournamentId));
}

module.exports = { correctScore, addFootballEvent, updateFootballEvent, deleteFootballEvent, overrideStanding, clearStandingOverride };
