'use strict';

const Teams = require('../models/teams.model');

async function list(req, res) {
  res.json(await Teams.list({ sport: req.query.sport }));
}

async function create(req, res) {
  const { name, shortName, logoUrl, sport } = req.body;
  if (!name || !shortName || !sport) {
    return res.status(400).json({ error: 'name, shortName and sport are required' });
  }
  res.status(201).json(await Teams.create({ name, shortName, logoUrl, sport }));
}

module.exports = { list, create };
