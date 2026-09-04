'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ctrl = require('../controllers/matches.controller');
const scorecard = require('../controllers/scorecard.controller');
const corrections = require('../controllers/adminCorrections.controller');
const clips = require('../controllers/clips.controller');

const router = express.Router();

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.get));
router.get('/:id/scorecard', asyncHandler(scorecard.get));
router.get('/:id/clips', requireAuth, asyncHandler(clips.list));

router.post('/', requireAuth, asyncHandler(ctrl.create));
router.patch('/:id/status', requireAuth, asyncHandler(ctrl.updateStatus));
router.patch('/:id/broadcast-setup', requireAuth, asyncHandler(ctrl.updateBroadcastSetup));
router.post('/:id/cameras', requireAuth, asyncHandler(ctrl.addCamera));
router.delete('/:id/cameras/:cameraId', requireAuth, asyncHandler(ctrl.removeCamera));
router.post('/:id/result', requireAuth, asyncHandler(ctrl.setResult));
router.post('/:id/clips', requireAuth, asyncHandler(clips.create));
router.patch('/:id/football-events/:eventId', requireAuth, asyncHandler(corrections.updateLiveFootballEvent));
router.delete('/:id/football-events/:eventId', requireAuth, asyncHandler(corrections.deleteLiveFootballEvent));

module.exports = router;
