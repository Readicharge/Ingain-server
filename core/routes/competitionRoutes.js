const express = require('express');
const Tournament = require('../models/Common/Tournament.js');
const PlatformUser = require('../models/App/PlatformUser.js');
const App = require('../models/Common/App.js');
const TournamentParticipant = require('../models/Common/TournamentParticipant.js');
const { authenticateToken } = require('../../middleware/auth.js');
const { 
    successResponse, 
    errorResponse, 
    paginatedResponse, 
    itemResponse,
    listResponse,
    createdResponse,
    notFoundResponse
} = require('../../utils/responseHelper');

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
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Tournament.countDocuments(query);

    res.json(paginatedResponse(
      tournaments,
      page,
      Math.ceil(total / limit),
      total,
      limit
    ));
  } catch (error) {
    console.error('competitionRoutes.js error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Get single tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)

    if (!tournament) {
      return res.status(404).json(notFoundResponse('Tournament not found'));
    }

    res.json(itemResponse({ tournament }));
  } catch (error) {
    console.log('competitionRoutes.js error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Join tournament
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const userId = req.user.unique_id;
    
    // Try to find tournament by unique_id first, then by MongoDB _id
    let tournament = await Tournament.findOne({ unique_id: tournamentId });
    if (!tournament) {
      tournament = await Tournament.findById(tournamentId);
    }
    
    if (!tournament) {
      return res.status(404).json(notFoundResponse('Tournament not found'));
    }
    
    if (!tournament.is_active) {
      return res.status(400).json(errorResponse('Tournament is not active', 400));
    }
    
    const now = new Date();
    if (now < tournament.startDate || now > tournament.endDate) {
      return res.status(400).json(errorResponse('Tournament is not open for participation', 400));
    }
    
    // Check if user already joined
    const participant = await TournamentParticipant.findOne({ 
      tournament_id: tournament.unique_id, 
      user_id: userId 
    });
    
    if (participant) {
      return res.status(400).json(errorResponse('Already joined this tournament', 400));
    }
    
    // Add user to tournament participants
    await TournamentParticipant.create({
      tournament_id: tournament.unique_id,
      user_id: userId,
      registration_date: now,
      eligibility_criteria: {
        min_user_level: tournament.minUserLevel || 1,
        min_xp_required: tournament.minXpRequired || 0
      }
    });
    
    tournament.total_participants += 1;
    await tournament.save();
    
    // Add tournament to user's active list
    await PlatformUser.updateOne(
      { unique_id: userId }, 
      { $addToSet: { active_tournament_ids: tournament.unique_id } }
    );
    
    res.json(successResponse(null, 'Successfully joined tournament'));
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json(errorResponse('Server error', 500));
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

    res.json(successResponse(null, 'Successfully left tournament'));
  } catch (error) {
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Get user's tournaments
router.get('/user/tournaments', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findById(req.user._id)
      .populate({
        path: 'tournaments',

      });

    res.json(listResponse(user.tournaments));
  } catch (error) {
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Submit tournament entry (refer an app for tournament)
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { appId } = req.body;
    const userId = req.user.unique_id;
    const tournamentAlgorithms = require('../../utils/tournamentAlgorithms');
    
    // Try to find tournament by unique_id first, then by MongoDB _id
    let tournament = await Tournament.findOne({ unique_id: tournamentId });
    if (!tournament) {
      tournament = await Tournament.findById(tournamentId);
    }
    
    if (!tournament) {
      return res.status(404).json(notFoundResponse('Tournament not found'));
    }
    
    if (!tournament.is_active) {
      return res.status(400).json(errorResponse('Tournament is not active', 400));
    }
    
    if (!tournament.apps_involved.includes(appId)) {
      return res.status(400).json(errorResponse('App is not part of this tournament', 400));
    }
    
    const app = await App.findOne({ unique_id: appId });
    if (!app) {
      return res.status(404).json(notFoundResponse('App not found'));
    }
    
    // Calculate tournament rewards
    const shareVerificationResult = {}; // Populate as needed
    const rewards = await tournamentAlgorithms.calculateTournamentShareReward(userId, appId, tournament.unique_id, shareVerificationResult);
    
    // Update user stats
    const user = await PlatformUser.findOne({ unique_id: userId });
    
    // Use updateReferralStats to update total XP and points earned consistently
    user.updateReferralStats(rewards.total_xp, rewards.total_points);
    
    // Update current XP and points (updateReferralStats only updates total earnings)
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
    const participant = await TournamentParticipant.findOne({ 
      tournament_id: tournament.unique_id, 
      user_id: userId 
    });
    
    if (participant) {
      // Use updatePerformance method to update participant stats consistently
      await participant.updatePerformance({
        verified: true,
        xp_awarded: rewards.total_xp,
        points_awarded: rewards.total_points
      });
    }
    
    res.json(successResponse({
      xpGained: rewards.total_xp,
      pointsGained: rewards.total_points,
      breakdown: rewards
    }, 'Tournament entry submitted successfully'));
  } catch (error) {
    console.error('Submit tournament entry error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Get tournament leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    
    // Try to find tournament by unique_id first, then by MongoDB _id
    let tournament = await Tournament.findOne({ unique_id: tournamentId });
    if (!tournament) {
      tournament = await Tournament.findById(tournamentId);
    }
    
    if (!tournament) {
      return res.status(404).json(notFoundResponse('Tournament not found'));
    }
    
    // Get participants using the tournament's unique_id
    const participants = await TournamentParticipant.find({ 
      tournament_id: tournament.unique_id, 
      registration_status: { $in: ['registered', 'active'] },
      eligibility_status: 'verified'
    }).sort({ 'performance_metrics.total_score': -1, 'performance_metrics.total_shares': -1 });
    
    // Get user details and build leaderboard
    const leaderboard = await Promise.all(participants.map(async (p, index) => {
      const user = await PlatformUser.findOne({ unique_id: p.user_id });
      return {
        user_id: p.user_id,
        name: user ? user.name : 'Unknown User',
        current_score: p.performance_metrics.total_score,
        total_xp_earned: p.performance_metrics.total_xp_earned,
        total_points_earned: p.performance_metrics.total_points_earned,
        current_rank: index + 1,
        total_shares: p.performance_metrics.total_shares,
        verified_shares: p.performance_metrics.verified_shares,
        average_score_per_share: p.performance_metrics.average_score_per_share,
        best_share_score: p.performance_metrics.best_share_score,
        shares_streak: p.performance_metrics.shares_streak,
        longest_streak: p.performance_metrics.longest_streak,
        rank_change: p.leaderboard_data.rank_change,
        rank_percentile: p.leaderboard_data.rank_percentile
      };
    }));
    
    res.json(itemResponse({ 
      leaderboard,
      tournament: {
        id: tournament.unique_id,
        name: tournament.name,
        total_participants: participants.length,
        is_active: tournament.is_active
      }
    }));
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json(errorResponse('Server error', 500));
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

    res.json(listResponse(activeTournaments));
  } catch (error) {
    res.status(500).json(errorResponse('Server error', 500));
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

    res.json(listResponse(upcomingTournaments));
  } catch (error) {
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Get tournament statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json(notFoundResponse('Tournament not found'));
    }

    const participants = await PlatformUser.countDocuments({
      tournaments: tournament._id
    });

    res.json(itemResponse({
      participantCount: participants,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      rewards: tournament.rewards
    }));
  } catch (error) {
    res.status(500).json(errorResponse('Server error', 500));
  }
});

module.exports = router;