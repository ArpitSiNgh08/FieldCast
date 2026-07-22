'use strict';

const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ctrl = require('../controllers/teams.controller');

const router = express.Router();

router.get('/', asyncHandler(ctrl.list));
router.post('/', requireAdmin, asyncHandler(ctrl.create));

module.exports = router;
