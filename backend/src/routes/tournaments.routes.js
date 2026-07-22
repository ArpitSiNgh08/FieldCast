'use strict';

const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ctrl = require('../controllers/tournaments.controller');

const router = express.Router();

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.get));
router.get('/:id/standings', asyncHandler(ctrl.standings));
router.post('/', requireAdmin, asyncHandler(ctrl.create));

module.exports = router;
