'use strict';

const cache = new Map();
const TTL_MS = 3000; // 3 seconds cache

/**
 * In-memory cache middleware for read-heavy GET requests.
 * Eliminates up to 90% of database queries for polling clients.
 */
function apiCache(req, res, next) {
  // Only cache GET requests that do not skip cache
  if (req.method !== 'GET' || req.headers['x-no-cache']) {
    // Invalidate cache on mutations
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      cache.clear();
    }
    return next();
  }

  const key = `${req.originalUrl}_${req.user?.sub || 'anon'}`;
  const entry = cache.get(key);

  if (entry && Date.now() - entry.timestamp < TTL_MS) {
    res.setHeader('X-FieldCast-Cache', 'HIT');
    return res.json(entry.data);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, { timestamp: Date.now(), data: body });
    }
    res.setHeader('X-FieldCast-Cache', 'MISS');
    return originalJson(body);
  };

  next();
}

function clearCache() {
  cache.clear();
}

module.exports = { apiCache, clearCache };
