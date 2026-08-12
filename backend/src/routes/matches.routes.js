'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ctrl = require('../controllers/matches.controller');
const scorecard = require('../controllers/scorecard.controller');

const router = express.Router();

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.get));
router.get('/:id/scorecard', asyncHandler(scorecard.get));

router.post('/', requireAuth, asyncHandler(ctrl.create));
router.patch('/:id/status', requireAuth, asyncHandler(ctrl.updateStatus));
router.patch('/:id/broadcast-setup', requireAuth, asyncHandler(ctrl.updateBroadcastSetup));
router.post('/:id/cameras', requireAuth, asyncHandler(ctrl.addCamera));
router.delete('/:id/cameras/:cameraId', requireAuth, asyncHandler(ctrl.removeCamera));
router.post('/:id/result', requireAuth, asyncHandler(ctrl.setResult));

module.exports = router;
