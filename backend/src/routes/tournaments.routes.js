'use strict';

const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ctrl = require('../controllers/tournaments.controller');

const router = express.Router();

router.get('/', asyncHandler(ctrl.list));
router.get('/mine', requireAuth, asyncHandler(ctrl.mine));
router.get('/review/pending', requireAdmin, asyncHandler(ctrl.pending));
router.get('/organized/mine', requireAuth, asyncHandler(ctrl.organized));
router.get('/players/mine', requireAuth, asyncHandler(ctrl.players));
router.get('/:id', asyncHandler(ctrl.get));
router.get('/:id/standings', asyncHandler(ctrl.standings));
router.post('/', requireAuth, asyncHandler(ctrl.create));
router.patch('/:id', requireAuth, asyncHandler(ctrl.update));
router.post('/:id/pools', requireAuth, asyncHandler(ctrl.addPool));
router.post('/:id/teams', requireAuth, asyncHandler(ctrl.addTeam));
router.patch('/:id/teams/:teamId', requireAuth, asyncHandler(ctrl.updateTeam));
router.patch('/:id/teams/:teamId/lineup', requireAuth, asyncHandler(ctrl.updateLineup));
router.delete('/:id/teams/:teamId', requireAuth, asyncHandler(ctrl.deleteTeam));
router.post('/:id/teams/:teamId/players', requireAuth, asyncHandler(ctrl.addPlayer));
router.delete('/:id/teams/:teamId/players/:playerId', requireAuth, asyncHandler(ctrl.deletePlayer));
router.post('/:id/submit', requireAuth, asyncHandler(ctrl.submit));
router.post('/:id/review', requireAdmin, asyncHandler(ctrl.review));
router.post('/:id/organizers', requireAuth, asyncHandler(ctrl.addOrganizer));

module.exports = router;
