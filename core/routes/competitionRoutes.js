const express = require('express');
const Tournament = require('../models/Common/Tournament.js');
const PlatformUser = require('../models/App/PlatformUser.js');
const App = require('../models/Common/App.js');
const { authenticateToken } = require('../../middleware/auth.js');

const router = express.Router();

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, active, upcoming } = req.query;

    const query = {};

    if (active === 'true') {
      query.is_active = true;
    }

    if (upcoming === 'true') {
      query.startDate = { $gte: new Date() };
    }

    const tournaments = await Tournament.find(query)
      .populate('apps')
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Tournament.countDocuments(query);

    res.json({
      tournaments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('competitionRoutes.js error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('apps');

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({ tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Join tournament
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const userId = req.user.unique_id;
    const TournamentModel = require('../models/Common/Tournament');
    // TournamentParticipantModel import left as is (file not found in models)
    const PlatformUserModel = require('../models/App/PlatformUser');
    const tournament = await TournamentModel.findOne({ unique_id: tournamentId });
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (!tournament.is_active) {
      return res.status(400).json({ error: 'Tournament is not active' });
    }
    const now = new Date();
    if (now < tournament.start_date || now > tournament.end_date) {
      return res.status(400).json({ error: 'Tournament is not open for participation' });
    }
    // Check if user already joined
    const participant = await TournamentParticipantModel.findOne({ tournament_id: tournamentId, user_id: userId });
    if (participant) {
      return res.status(400).json({ error: 'Already joined this tournament' });
    }
    // Add user to tournament participants
    await TournamentParticipantModel.create({
      tournament_id: tournamentId,
      user_id: userId,
      registered_at: now,
      user_level_at_registration: req.user.user_level,
      user_xp_at_registration: req.user.current_xp,
      user_region_at_registration: req.user.region
    });
    tournament.total_participants += 1;
    await tournament.save();
    // Add tournament to user's active list
    await PlatformUserModel.updateOne({ unique_id: userId }, { $addToSet: { active_tournament_ids: tournamentId } });
    res.json({ message: 'Successfully joined tournament' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave tournament
router.delete('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const userId = req.user._id;

    const user = await PlatformUser.findById(userId);
    user.tournaments = user.tournaments.filter(id => id.toString() !== tournamentId);
    await user.save();

    // Update tournament participant count
    const tournament = await Tournament.findById(tournamentId);
    if (tournament) {
      tournament.participantCount = Math.max(0, tournament.participantCount - 1);
      await tournament.save();
    }

    res.json({ message: 'Successfully left tournament' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's tournaments
router.get('/user/tournaments', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findById(req.user._id)
      .populate({
        path: 'tournaments',
        populate: {
          path: 'apps'
        }
      });

    res.json({ tournaments: user.tournaments });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit tournament entry (refer an app for tournament)
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { appId } = req.body;
    const userId = req.user.unique_id;
    const TournamentModel = require('../models/Common/Tournament');
    const AppModel = require('../models/Common/App');
    const PlatformUserModel = require('../models/App/PlatformUser');
    // TournamentParticipantModel import left as is (file not found in models)
    const tournamentAlgorithms = require('../utils/tournamentAlgorithms');
    const tournament = await TournamentModel.findOne({ unique_id: tournamentId });
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (!tournament.is_active) {
      return res.status(400).json({ error: 'Tournament is not active' });
    }
    if (!tournament.apps_involved.includes(appId)) {
      return res.status(400).json({ error: 'App is not part of this tournament' });
    }
    const app = await AppModel.findOne({ unique_id: appId });
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    // Calculate tournament rewards
    const shareVerificationResult = {}; // Populate as needed
    const rewards = await tournamentAlgorithms.calculateTournamentShareReward(userId, appId, tournamentId, shareVerificationResult);
    // Update user stats
    const user = await PlatformUserModel.findOne({ unique_id: userId });
    user.total_xp_earned += rewards.total_xp;
    user.total_points_earned += rewards.total_points;
    user.current_xp += rewards.total_xp;
    user.current_points += rewards.total_points;
    user.total_apps_shared += 1;
    user.last_share_date = new Date();
    await user.save();
    // Update app stats
    app.total_shared += 1;
    app.total_xp_allocated += rewards.total_xp;
    app.total_points_allocated += rewards.total_points;
    await app.save();
    // Update tournament participant stats
    const participant = await TournamentParticipantModel.findOne({ tournament_id: tournamentId, user_id: userId });
    if (participant) {
      participant.total_xp_earned += rewards.total_xp;
      participant.total_points_earned += rewards.total_points;
      participant.total_shares += 1;
      participant.last_share_at = new Date();
      await participant.save();
    }
    res.json({
      message: 'Tournament entry submitted successfully',
      xpGained: rewards.total_xp,
      pointsGained: rewards.total_points,
      breakdown: rewards
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tournament leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    // TournamentParticipantModel import left as is (file not found in models)
    const PlatformUserModel = require('../models/App/PlatformUser');
    const participants = await TournamentParticipantModel.find({ tournament_id: tournamentId, is_active: true });
    // Get user details and sort by score
    const leaderboard = await Promise.all(participants.map(async p => {
      const user = await PlatformUserModel.findOne({ unique_id: p.user_id });
      return {
        user_id: p.user_id,
        name: user ? user.name : '',
        current_score: p.current_score,
        total_xp_earned: p.total_xp_earned,
        total_points_earned: p.total_points_earned,
        current_rank: p.current_rank
      };
    }));
    leaderboard.sort((a, b) => b.current_score - a.current_score);
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active tournaments
router.get('/active/list', async (req, res) => {
  try {
    const now = new Date();
    const activeTournaments = await Tournament.find({
      is_active: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).populate('apps');

    res.json({ activeTournaments });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get upcoming tournaments
router.get('/upcoming/list', async (req, res) => {
  try {
    const now = new Date();
    const upcomingTournaments = await Tournament.find({
      is_active: true,
      startDate: { $gt: now }
    })
      .populate('apps')
      .sort({ startDate: 1 });

    res.json({ upcomingTournaments });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tournament statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const participants = await PlatformUser.countDocuments({
      tournaments: tournament._id
    });

    res.json({
      participantCount: participants,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      rewards: tournament.rewards
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 