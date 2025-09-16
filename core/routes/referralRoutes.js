/**
 * Referral Routes - INGAIN Platform
 * 
 * Handles all referral-related operations including:
 * - Referral creation and tracking
 * - Referral statistics and analytics
 * - Reward processing and management
 * - Fraud detection and prevention
 * 
 * @author Yash Singh (ER_SKY)
 * @version 2.0.0
 */

const express = require('express');
const PlatformUser = require('../models/App/PlatformUser.js');
const Referral = require('../models/App/Referral.js');
const App = require('../models/Common/App.js');
const { authenticateToken } = require('../../middleware/auth.js');
const { 
    successResponse, 
    errorResponse, 
    paginatedResponse, 
    itemResponse,
    listResponse,
    createdResponse,
    notFoundResponse,
    validationErrorResponse
} = require('../../utils/responseHelper');

const router = express.Router();

// Get user's referral statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findOne({ unique_id: req.user.unique_id });
    if (!user) {
      return res.status(404).json(notFoundResponse('User not found'));
    }

    // Get detailed referral statistics using Referral model
    const referralStats = await Referral.getStatistics(user.unique_id);
    const totalReferrals = await Referral.countDocuments({ referrer_id: user.unique_id });
    const activeReferrals = await Referral.countDocuments({
      referrer_id: user.unique_id,
      status: 'active'
    });
    const completedReferrals = await Referral.countDocuments({
      referrer_id: user.unique_id,
      status: 'completed'
    });

    const stats = {
      referral_code: user.referral_code,
      total_referrals: totalReferrals,
      active_referrals: activeReferrals,
      completed_referrals: completedReferrals,
      success_rate: totalReferrals > 0 ?
        ((activeReferrals + completedReferrals) / totalReferrals * 100).toFixed(2) : 0,
      total_earnings: user.total_referral_earnings,
      average_earnings_per_referral: {
        xp: totalReferrals > 0 ? (user.total_referral_earnings.xp / totalReferrals).toFixed(2) : 0,
        points: totalReferrals > 0 ? (user.total_referral_earnings.points / totalReferrals).toFixed(2) : 0
      },
      detailed_stats: referralStats
    };

    res.json(successResponse(stats));
  } catch (error) {
    console.error('Referral stats error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Get user's referral history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const user = await PlatformUser.findOne({ unique_id: req.user.unique_id });

    if (!user) {
      return res.status(404).json(notFoundResponse('User not found'));
    }

    // Build query for referrals
    const query = { referrer_id: user.unique_id };
    if (status && ['pending', 'active', 'completed', 'expired', 'fraudulent'].includes(status)) {
      query.status = status;
    }

    // Get referrals with pagination
    const referrals = await Referral.find(query)
      .populate('referred_id', 'name email created_at')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Referral.countDocuments(query);

    const referralHistory = referrals.map(referral => ({
      id: referral.unique_id,
      referred_user: referral.referred_id,
      status: referral.status,
      activation_percentage: referral.activation_percentage,
      rewards_earned: {
        xp: referral.rewards.referrer_rewarded ? referral.rewards.referrer_bonus.xp : 0,
        points: referral.rewards.referrer_rewarded ? referral.rewards.referrer_bonus.points : 0
      },
      created_at: referral.created_at,
      activation_date: referral.activation_date,
      completion_date: referral.completion_date,
      days_until_expiration: referral.days_until_expiration,
      is_expired: referral.is_expired
    }));

    res.json({
      success: true,
      referrals: referralHistory,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Referral history error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Get top referrers leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query;

    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'daily':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        dateFilter = { created_at: { $gte: startDate } };
      }
    }

    // Aggregate referral data to get top performers
    const leaderboard = await Referral.aggregate([
      { $match: { status: { $in: ['active', 'completed'] }, ...dateFilter } },
      {
        $group: {
          _id: '$referrer_id',
          total_referrals: { $sum: 1 },
          total_xp_earned: { $sum: '$rewards.referrer_bonus.xp' },
          total_points_earned: { $sum: '$rewards.referrer_bonus.points' },
          active_referrals: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completed_referrals: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'platformusers',
          localField: '_id',
          foreignField: 'unique_id',
          as: 'user_info'
        }
      },
      { $unwind: '$user_info' },
      {
        $project: {
          name: '$user_info.name',
          total_referrals: 1,
          total_xp_earned: 1,
          total_points_earned: 1,
          active_referrals: 1,
          completed_referrals: 1,
          success_rate: {
            $multiply: [
              {
                $divide: [
                  { $add: ['$active_referrals', '$completed_referrals'] },
                  '$total_referrals'
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { total_referrals: -1, total_xp_earned: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      leaderboard,
      period
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Create a referral (when someone uses a referral code)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { referral_code, metadata = {} } = req.body;
    const referredUserId = req.user.unique_id;

    if (!referral_code) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }

    // Find the referrer
    const referrer = await PlatformUser.findOne({ referral_code });
    if (!referrer) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code'
      });
    }

    if (referrer.unique_id === referredUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot refer yourself'
      });
    }

    // Check if user already has a referral
    const existingReferral = await Referral.findOne({ referred_id: referredUserId });
    if (existingReferral) {
      return res.status(400).json({
        success: false,
        error: 'User already has an active referral'
      });
    }

    // Create referral record
    const referral = await Referral.createReferral(
      referrer.unique_id,
      referral_code,
      referredUserId,
      {
        source: metadata.source || 'direct_link',
        channel: metadata.channel,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        ...metadata
      }
    );

    // Update referrer count
    referrer.referral_count += 1;
    await referrer.save();

    res.status(201).json({
      success: true,
      message: 'Referral created successfully',
      referral: referral.getSummary()
    });
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Update referral progress
router.put('/progress/:referralId', authenticateToken, async (req, res) => {
  try {
    const { referralId } = req.params;
    const { shares_completed, xp_earned, points_earned, days_active } = req.body;

    const referral = await Referral.findOne({ unique_id: referralId });
    if (!referral) {
      return res.status(404).json({
        success: false,
        error: 'Referral not found'
      });
    }

    // Check if user is authorized (referred user or admin)
    if (referral.referred_id !== req.user.unique_id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to update this referral'
      });
    }

    await referral.updateProgress({
      shares_completed,
      xp_earned,
      points_earned,
      days_active
    });

    res.json({
      success: true,
      message: 'Referral progress updated',
      referral: referral.getSummary()
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Process referral rewards
router.post('/rewards/:referralId/process', authenticateToken, async (req, res) => {
  try {
    const { referralId } = req.params;

    const referral = await Referral.findOne({ unique_id: referralId });
    if (!referral) {
      return res.status(404).json({
        success: false,
        error: 'Referral not found'
      });
    }

    // Validate eligibility
    const validation = referral.validateEligibility();
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Referral not eligible for rewards',
        details: validation.errors
      });
    }

    // Process rewards for both users
    const result = await referral.processBothRewards();

    res.json({
      success: true,
      message: 'Rewards processed successfully',
      result
    });
  } catch (error) {
    console.error('Process rewards error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
});

// Get user's referral analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const user = await PlatformUser.findOne({ unique_id: req.user.unique_id });

    if (!user) {
      return res.status(404).json(notFoundResponse('User not found'));
    }

    // Get daily analytics
    const dailyAnalytics = await Referral.getDailyAnalytics(user.unique_id, parseInt(days));

    // Get overall summary
    const summary = user.getReferralSummary();

    res.json({
      success: true,
      analytics: {
        summary,
        daily_breakdown: dailyAnalytics,
        period_days: parseInt(days)
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Generate new referral code
router.post('/code/generate', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findOne({ unique_id: req.user.unique_id });

    if (!user) {
      return res.status(404).json(notFoundResponse('User not found'));
    }

    // Generate new referral code
    const newCode = user.generateReferralCode();
    await user.save();

    res.json({
      success: true,
      message: 'New referral code generated',
      referral_code: newCode
    });
  } catch (error) {
    console.error('Generate code error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Get referral by ID
router.get('/:referralId', authenticateToken, async (req, res) => {
  try {
    const { referralId } = req.params;

    const referral = await Referral.findOne({ unique_id: referralId })
      .populate('referrer_id', 'name email')
      .populate('referred_id', 'name email');

    if (!referral) {
      return res.status(404).json({
        success: false,
        error: 'Referral not found'
      });
    }

    // Check authorization
    if (referral.referrer_id.unique_id !== req.user.unique_id &&
      referral.referred_id.unique_id !== req.user.unique_id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access'
      });
    }

    res.json({
      success: true,
      referral: referral.getSummary()
    });
  } catch (error) {
    console.error('Get referral error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Get user's referral milestones and progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const user = await PlatformUser.findOne({ unique_id: req.user.unique_id });

    if (!user) {
      return res.status(404).json(notFoundResponse('User not found'));
    }

    // Calculate referral milestones
    const milestones = [
      { count: 1, xp: 100, points: 50 },
      { count: 5, xp: 500, points: 250 },
      { count: 10, xp: 1000, points: 500 },
      { count: 25, xp: 2500, points: 1250 },
      { count: 50, xp: 5000, points: 2500 },
      { count: 100, xp: 10000, points: 5000 }
    ];

    const completedReferrals = user.total_referrals_completed;
    const progress = milestones.map(milestone => ({
      milestone,
      achieved: completedReferrals >= milestone.count,
      progress: Math.min((completedReferrals / milestone.count) * 100, 100)
    }));

    res.json({
      success: true,
      progress,
      current_completed: completedReferrals,
      total_referrals: user.referral_count
    });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Admin routes for referral management
router.get('/admin/pending', authenticateToken, async (req, res) => {
  try {
    // Note: Add admin authorization middleware here
    const { page = 1, limit = 50 } = req.query;

    const pendingReferrals = await Referral.findByStatusPaginated('pending', page, limit);
    const total = await Referral.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      referrals: pendingReferrals,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Admin pending error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

// Clean up expired referrals (admin)
router.post('/admin/cleanup-expired', authenticateToken, async (req, res) => {
  try {
    // Note: Add admin authorization middleware here
    const result = await Referral.cleanupExpired();

    res.json({
      success: true,
      message: 'Expired referrals cleaned up',
      updated_count: result.length
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json(errorResponse('Server error', 500));
  }
});

module.exports = router; 