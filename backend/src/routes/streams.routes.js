'use strict';

const express = require('express');
const env = require('../config/env');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const CAMERAS = ['camera1', 'camera2', 'camera3'];
const DEFAULT_STREAM_KEY = 'livestream';

/**
 * Public status/playback information for Moblin profiles that publish to the
 * SRS default stream. This is intentionally read-only; publishing still
 * happens directly to SRS over SRT.
 */
async function livestream(_req, res) {
  const result = {
    streamKey: DEFAULT_STREAM_KEY,
    publishing: false,
    hlsUrl: `${env.stream.hlsBase}/live/${DEFAULT_STREAM_KEY}.m3u8`,
  };

  if (env.stream.simulate) return res.json({ ...result, source: 'simulated' });

  try {
    const response = await fetch(`${env.stream.apiBase}/api/v1/streams/`, {
      signal: AbortSignal.timeout(2500),
    });
    const data = await response.json();
    const stream = (data.streams || []).find((entry) => entry.name === DEFAULT_STREAM_KEY);
    res.json({
      ...result,
      publishing: Boolean(stream?.publish?.active),
      clients: stream?.clients ?? 0,
      video: stream?.video
        ? { codec: stream.video.codec, profile: stream.video.profile, width: stream.video.width, height: stream.video.height }
        : null,
      audio: stream?.audio
        ? { codec: stream.audio.codec, sampleRate: stream.audio.sample_rate, channels: stream.audio.channel }
        : null,
      source: 'srs',
    });
  } catch (err) {
    res.json({ ...result, source: 'unreachable', error: err.message });
  }
}

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
router.get('/livestream', asyncHandler(livestream));

module.exports = router;
