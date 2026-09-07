'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const controller = require('../controllers/googleDrive.controller');

const router = express.Router();
router.post('/start', requireAuth, asyncHandler(controller.start));
router.get('/callback', asyncHandler(controller.callback));
router.get('/status', requireAuth, asyncHandler(controller.status));
router.patch('/folder', requireAuth, asyncHandler(controller.setFolder));

module.exports = router;
