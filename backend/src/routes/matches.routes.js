'use strict';

const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ctrl = require('../controllers/matches.controller');
const scorecard = require('../controllers/scorecard.controller');

const router = express.Router();

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.get));
router.get('/:id/scorecard', asyncHandler(scorecard.get));

router.post('/', requireAdmin, asyncHandler(ctrl.create));
router.patch('/:id/status', requireAdmin, asyncHandler(ctrl.updateStatus));
router.post('/:id/result', requireAdmin, asyncHandler(ctrl.setResult));

module.exports = router;
