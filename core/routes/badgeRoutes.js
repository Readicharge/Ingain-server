const express = require('express');
const Badge = require('../models/Common/Badge.js');
const PlatformUser = require('../models/App/PlatformUser.js');
const { authenticateToken } = require('../../middleware/auth.js');
const { 
    successResponse, 
    errorResponse, 
    paginatedResponse, 
    itemResponse,
    listResponse
} = require('../../utils/responseHelper');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, active } = req.query;

    const query = {};
    if (active === 'true') {
      query.is_active = true;
    }

    const badges = await Badge.find(query)
      .sort({ 'criteria.threshold': 1 }) // Sort by points in ascending order
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Badge.countDocuments(query);

    res.json(paginatedResponse(
      badges,
      page * 1,
      Math.ceil(total / limit),
      total,
      limit
    ));
  } catch (error) {
    console.error('badgeRoutes.js error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single badge by ID
router.get('/:id', async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);

    if (!badge) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    res.json({ badge });
  } catch (error) {
    console.log('badgeRoutes.js error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's badges
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findOne({ unique_id: req.user.unique_id });
    if (!user) {
      return res.status(404).json(errorResponse('User not found', 404));
    }

    // Get user's badges with full badge details
    const userBadges = await Badge.find({ 
      unique_id: { $in: user.badges_ids || [] } 
    });

    const badges = userBadges.map(badge => ({
      _id: badge._id,
      badge_name: badge.badge_name,
      badge_description: badge.badge_description,
      badge_icon: badge.badge_icon,
      earned_at: new Date().toISOString(), // TODO: Store actual earned date
      xp_reward: badge.xp_reward,
      points_reward: badge.points_reward
    }));

    res.json(listResponse(badges));
  } catch (error) {
    console.log('badgeRoutes.js error:', error);
    res.status(500).json(errorResponse('Server error'));
  }
});

// Check and award badges based on user progress
router.post('/check-progress', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findOne({ unique_id: req.user.unique_id });
    const allBadges = await Badge.find({ is_active: true });
    const badgeAlgorithms = require('../utils/badgeAlgorithms');
    const newlyAwardedBadges = [];
    // Build user stats for eligibility check
    const currentUserStats = {
      current_xp: user.current_xp,
      total_points_earned: user.total_points_earned,
      total_apps_shared: user.total_apps_shared,
      total_tournaments_won: user.total_tournaments_won,
      sharing_streak_days: user.sharing_streak_days,
      successful_referrals_count: user.successful_referrals_count,
      user_level: user.user_level
    };
    for (const badge of allBadges) {
      if (user.badges_ids.includes(badge.unique_id)) continue;
      const eligibility = await badgeAlgorithms.checkBadgeEligibility(user.unique_id, badge.unique_id, 'progress_check', currentUserStats);
      if (eligibility.eligible) {
        user.badges_ids.push(badge.unique_id);
        badge.users_achieved_count += 1;
        await badge.save();
        newlyAwardedBadges.push(badge);
      }
    }
    if (newlyAwardedBadges.length > 0) {
      user.total_badges_earned = user.badges_ids.length;
      await user.save();
    }
    res.json({
      newlyAwardedBadges,
      totalBadges: user.badges_ids.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get badge statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalBadges = await Badge.countDocuments();
    const activeBadges = await Badge.countDocuments({ is_active: true });
    const totalUsersWithBadges = await PlatformUser.countDocuments({
      badges: { $exists: true, $ne: [] }
    });

    const mostPopularBadge = await Badge.findOne()
      .sort({ usersWithBadge: -1 });

    res.json({
      totalBadges,
      activeBadges,
      totalUsersWithBadges,
      mostPopularBadge
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get badges by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const badges = await Badge.find({
      'criteria.type': type,
      is_active: true
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Badge.countDocuments({
      'criteria.type': type,
      is_active: true
    });

    res.json({
      badges,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's badge progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findOne({ unique_id: req.user.unique_id });
    if (!user) {
      return res.status(404).json(errorResponse('User not found', 404));
    }

    const allBadges = await Badge.find({ is_active: true });
    const badgeAlgorithms = require('../utils/badgeAlgorithms');
    const currentUserStats = {
      current_xp: user.current_xp,
      total_points_earned: user.total_points_earned,
      total_apps_shared: user.total_apps_shared,
      total_tournaments_won: user.total_tournaments_won,
      sharing_streak_days: user.sharing_streak_days,
      successful_referrals_count: user.successful_referrals_count,
      user_level: user.user_level
    };
    
    const progress = await Promise.all(allBadges.map(async badge => {
      const hasBadge = user.badges_ids.includes(badge.unique_id);
      const eligibility = await badgeAlgorithms.checkBadgeEligibility(user.unique_id, badge.unique_id, 'progress_check', currentUserStats);
      return {
        badge_id: badge.unique_id,
        badge_name: badge.badge_name,
        current_progress: eligibility.current_value || 0,
        required_progress: badge.criteria?.target_value || 0,
        progress_percentage: Math.min(eligibility.progress_percentage || 0, 100)
      };
    }));
    
    res.json(listResponse(progress));
  } catch (error) {
    res.status(500).json(errorResponse('Server error'));
  }
});

module.exports = router; 