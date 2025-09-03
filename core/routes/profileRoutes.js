const express = require('express');
const PlatformUser = require('../models/App/PlatformUser.js');
const { authenticateToken } = require('../../middleware/auth.js');

const router = express.Router();

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findOne({ unique_id: req.user.unique_id });
    res.json({
      user: {
        unique_id: user.unique_id,
        name: user.name,
        email: user.email,
        total_xp_earned: user.total_xp_earned,
        total_points_earned: user.total_points_earned,
        referral_count: user.referral_count,
        badges_ids: user.badges_ids,
        active_tournament_ids: user.active_tournament_ids,
        last_login_at: user.last_login_at,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('profileRoutes.js error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    updates.updated_at = new Date();
    const user = await PlatformUser.findOneAndUpdate(
      { unique_id: req.user.unique_id },
      updates,
      { new: true }
    );
    res.json({
      message: 'Profile updated successfully',
      user: {
        unique_id: user.unique_id,
        name: user.name,
        email: user.email,
        total_xp_earned: user.total_xp_earned,
        total_points_earned: user.total_points_earned,
        referral_count: user.referral_count
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user activity history
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await PlatformUser.findById(req.user._id);
    const activities = user.activityHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice((page - 1) * limit, page * limit);

    const total = user.activityHistory.length;

    res.json({
      activities,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findById(req.user._id)
      .populate('badges')
      .populate('tournaments');

    const stats = {
      totalXp: user.totalXp,
      totalPoints: user.totalPoints,
      referralCount: user.referralCount,
      badgeCount: user.badges.length,
      tournamentCount: user.tournaments.length,
      savedAppsCount: user.savedApps.length,
      joinDate: user.createdAt,
      lastLogin: user.lastLogin
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user achievements summary
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findById(req.user._id)
      .populate('badges');

    const achievements = {
      badges: user.badges,
      totalXp: user.totalXp,
      totalPoints: user.totalPoints,
      referralCount: user.referralCount,
      level: Math.floor(user.totalXp / 1000) + 1, // Simple level calculation
      progressToNextLevel: (user.totalXp % 1000) / 1000 * 100
    };

    res.json({ achievements });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's recent activity
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findById(req.user._id);

    const recentActivity = user.activityHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.json({ recentActivity });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's saved apps
router.get('/saved-apps', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findById(req.user._id)
      .populate({
        path: 'savedApps',
        populate: {
          path: 'categories'
        }
      });

    res.json({ savedApps: user.savedApps });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's tournaments
router.get('/tournaments', authenticateToken, async (req, res) => {
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

// Get user's badges
router.get('/badges', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findById(req.user._id)
      .populate('badges');

    res.json({ badges: user.badges });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 