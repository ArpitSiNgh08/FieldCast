'use strict';

const express = require('express');

const router = express.Router();

router.get('/health', (_req, res) => res.json({ ok: true, service: 'fieldcast-api' }));

router.use('/auth', require('./auth.routes'));
router.use('/teams', require('./teams.routes'));
router.use('/tournaments', require('./tournaments.routes'));
router.use('/matches', require('./matches.routes'));
router.use('/streams', require('./streams.routes'));
router.use('/admin', require('./adminCorrections.routes'));

module.exports = router;
