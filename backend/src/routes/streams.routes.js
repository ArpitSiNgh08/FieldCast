'use strict';

const express = require('express');
const env = require('../config/env');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const CAMERAS = ['camera1', 'camera2', 'camera3'];

/**
 * Stream health for the admin panel: which camera RTMP streams are currently
 * publishing to SRS. Uses the SRS HTTP API. In simulation mode (or if SRS is
 * unreachable) every camera is reported as unknown/offline gracefully.
 */
async function health(_req, res) {
  const base = { simulate: env.stream.simulate, cameras: {} };
  for (const c of CAMERAS) base.cameras[c] = { publishing: false, clients: 0 };

  if (env.stream.simulate) return res.json({ ...base, source: 'simulated' });

  try {
    const r = await fetch(`${env.stream.apiBase}/api/v1/streams/`, {
      signal: AbortSignal.timeout(2500),
    });
    const data = await r.json();
    for (const s of data.streams || []) {
      if (base.cameras[s.name]) {
        base.cameras[s.name] = {
          publishing: Boolean(s.publish?.active),
          clients: s.clients ?? 0,
        };
      }
    }
    res.json({ ...base, source: 'srs' });
  } catch (err) {
    res.json({ ...base, source: 'unreachable', error: err.message });
  }
}

router.get('/health', requireAdmin, asyncHandler(health));

module.exports = router;
