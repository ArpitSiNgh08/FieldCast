'use strict';

const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ctrl = require('../controllers/adminCorrections.controller');

router.use(requireAdmin);
router.patch('/matches/:id/score', asyncHandler(ctrl.correctScore));
router.post('/matches/:id/football-events', asyncHandler(ctrl.addFootballEvent));
router.patch('/matches/:id/football-events/:eventId', asyncHandler(ctrl.updateFootballEvent));
router.delete('/matches/:id/football-events/:eventId', asyncHandler(ctrl.deleteFootballEvent));
router.put('/tournaments/:id/standings/:teamId', asyncHandler(ctrl.overrideStanding));
router.delete('/tournaments/:id/standings/:teamId', asyncHandler(ctrl.clearStandingOverride));

module.exports = router;
