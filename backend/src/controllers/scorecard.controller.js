'use strict';

const Matches = require('../models/matches.model');
const events = require('../models/events.model');
const { withStreamUrl } = require('./matches.controller');
const { matchCache } = require('../services/cache.service');

/**
 * Full, sport-aware scorecard for a match: the base match (teams + live state)
 * plus the detailed event history for its sport.
 */
async function get(req, res) {
  const cacheKey = `scorecard:${req.params.id}`;
  const cached = matchCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

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

  // Keep scorecard responses consistent with regular match responses so
  // organiser controls always receive the generated RTMP/SRT ingest URLs.
  const payload = { match: withStreamUrl(match), ...detail };
  matchCache.set(cacheKey, payload, 3);
  res.json(payload);
}

module.exports = { get };

