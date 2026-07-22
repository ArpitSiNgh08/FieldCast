'use strict';

const Matches = require('../models/matches.model');
const events = require('../models/events.model');

/**
 * Full, sport-aware scorecard for a match: the base match (teams + live state)
 * plus the detailed event history for its sport.
 */
async function get(req, res) {
  const match = await Matches.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  let detail;
  if (match.sport === 'cricket') {
    detail = { cricketEvents: await events.listCricketEvents(match.id) };
  } else if (match.sport === 'football') {
    detail = { footballEvents: await events.listFootballEvents(match.id) };
  } else {
    detail = { basketballQuarters: await events.listBasketballQuarters(match.id) };
  }

  res.json({ match, ...detail });
}

module.exports = { get };
