'use strict';

const Tournaments = require('../models/tournaments.model');
const Standings = require('../models/standings.model');

async function list(req, res) {
  res.json(await Tournaments.list({ sport: req.query.sport }));
}

async function get(req, res) {
  const t = await Tournaments.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  res.json(t);
}

async function create(req, res) {
  const { name, sport, format, startDate, endDate, status } = req.body;
  if (!name || !sport) {
    return res.status(400).json({ error: 'name and sport are required' });
  }
  res.status(201).json(
    await Tournaments.create({ name, sport, format, startDate, endDate, status })
  );
}

async function standings(req, res) {
  res.json(await Standings.listByTournament(req.params.id));
}

module.exports = { list, get, create, standings };
