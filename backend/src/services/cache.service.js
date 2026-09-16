'use strict';

const NodeCache = require('node-cache');

// Standard TTL: 3 seconds for live/active match data (reduces query load by 95%+)
// 15 seconds for static match/standings data
const matchCache = new NodeCache({ stdTTL: 3, checkperiod: 5 });

/**
 * Invalidation helper to clear cache when a match state, score, camera or status updates.
 */
function invalidateMatchCache(matchId) {
  if (matchId) {
    matchCache.del(`match:${matchId}`);
    matchCache.del(`scorecard:${matchId}`);
  }
  // Flush match lists cache so upcoming/completed status changes reflect instantly
  const keys = matchCache.keys();
  keys.forEach((key) => {
    if (key.startsWith('matches_list:')) {
      matchCache.del(key);
    }
  });
}

module.exports = {
  matchCache,
  invalidateMatchCache,
};
