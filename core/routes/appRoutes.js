
const express = require('express');
const App = require('../models/Common/App.js');
const Category = require('../models/Common/Category.js');
const PlatformUser = require('../models/App/PlatformUser.js');
const { authenticateToken } = require('../../middleware/auth.js');
const { 
    successResponse, 
    errorResponse, 
    paginatedResponse, 
    itemResponse,
    notFoundResponse
} = require('../../utils/responseHelper');

const router = express.Router();


// Trigger successful referral, update points/xp, and badges
router.post('/:id/successful-referral', authenticateToken, async (req, res) => {
  try {
    console.log('[POST] /apps/' + req.params.id + '/successful-referral', { user: req.user?.unique_id, body: req.body });
    const appId = req.params.id;
    const userId = req.user.unique_id;
    const AppModel = require('../models/Common/App');
    const PlatformUserModel = require('../models/App/PlatformUser');
    const BadgeModel = require('../models/Common/Badge');
    const badgeAlgorithms = require('../utils/badgeAlgorithms');
    const app = await AppModel.findOne({ unique_id: appId });
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    // Update app referral count and rewards
    app.total_shared += 1;
    app.total_xp_allocated += app.app_xp;
    app.total_points_allocated += app.app_points;
    await app.save();
    // Update user stats
    const user = await PlatformUserModel.findOne({ unique_id: userId });
    user.referral_count += 1;

    // Use updateReferralStats to update XP and points consistently
    // Use updateReferralStats to update total XP and points earned consistently
    user.updateReferralStats(app.app_xp, app.app_points);

    // Update current XP and points (updateReferralStats only updates total earnings)
    user.current_xp += app.app_xp;
    user.current_points += app.app_points;

    user.total_apps_shared += 1;
    user.last_share_date = new Date();
    // Badge check and addition
    const allBadges = await BadgeModel.find({ is_active: true });
    const newlyAwardedBadges = [];
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
    }
    await user.save();
    res.json({
      message: 'Referral processed, points/xp/badges updated',
      xpGained: app.app_xp,
      pointsGained: app.app_points,
      newlyAwardedBadges
    });
  } catch (error) {
    console.error('appRoutes.js error:', error);
    console.error('appRoutes.js error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get all apps with filtering and pagination
router.get('/', async (req, res) => {
  try {
    console.log('[GET] /apps', { query: req.query });
    const {
      page = 1,
      limit = 20,
      category = "",
      search = "",
      featured = false,
      sortBy = "",
      sortOrder = ""
    } = req.query;

    const query = { is_active: true };
    if (category) query.categories = category;
    if (search) {
      query.$or = [
        { app_name: { $regex: search, $options: 'i' } },
        { app_description: { $regex: search, $options: 'i' } }
      ];
    }
    if (featured === 'true' || featured === true) query.is_featured = true;
    const sortOptions = {};
    if (sortBy) sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    else sortOptions['created_at'] = -1;
    const apps = await App.find(query)
      .populate('categories')
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .exec();
    const total = await App.countDocuments(query);
    res.json(paginatedResponse(
      apps,
      Number(page),
      Math.ceil(total / limit),
      total,
      Number(limit)
    ));
  } catch (error) {
    console.log('appRoutes.js error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single app by ID
router.get('/:id', async (req, res) => {
  try {
    console.log('[GET] /apps/' + req.params.id);
    const app = await App.findById(req.params.id)
      .populate('categories');

    if (!app) {
      return res.status(404).json(notFoundResponse('App not found'));
    }

    res.json(itemResponse({ app }));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add app to saved list
router.post('/:id/save', authenticateToken, async (req, res) => {
  try {
    console.log('[POST] /apps/' + req.params.id + '/save', { user: req.user?._id });
    const appId = req.params.id;
    const userId = req.user._id;
    console.log(userId)

    // Check if app exists
    const app = await App.findById(appId);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Check if already saved
    const user = await PlatformUser.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize savedApps if it doesn't exist
    if (!user.savedApps) {
      user.savedApps = [];
    }

    if (user.savedApps.includes(appId)) {
      return res.status(400).json({ error: 'App already saved' });
    }

    // Add to saved apps
    user.savedApps.push(appId);
    await user.save();

    res.json({ message: 'App saved successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Remove app from saved list
// Remove app from saved list (POST /apps/:id/remove-saved)
router.post('/:id/remove-saved', authenticateToken, async (req, res) => {
  try {
    console.log('[POST] /apps/' + req.params.id + '/remove-saved', { user: req.user?._id });
    const appId = req.params.id;
    const userId = req.user._id;
    const user = await PlatformUser.findById(userId);
    user.savedApps = user.savedApps.filter(id => id.toString() !== appId);
    await user.save();
    res.json({ message: 'App removed from saved list' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's saved apps
// Get user's saved apps (GET /apps/saved?page=1&limit=20)
router.get('/saved', authenticateToken, async (req, res) => {
  try {

    const { page = 1, limit = 20 } = req.query;
    const user = await PlatformUser.findById(req.user._id)
      .populate({
        path: 'savedApps',
        populate: {
          path: 'categories'
        }
      });
    const total = user.savedApps.length;
    const pagedApps = user.savedApps.slice((page - 1) * limit, page * limit);
    res.json({
      savedApps: pagedApps,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Server error' });
  }
});

// Refer an app (increment referral count)
router.post('/:id/refer', authenticateToken, async (req, res) => {
  try {
    console.log('[POST] /apps/' + req.params.id + '/refer', { user: req.user?.unique_id, body: req.body });
    const appId = req.params.id;
    const userId = req.user.unique_id;
    const AppModel = require('../models/Common/App');
    const PlatformUserModel = require('../models/App/PlatformUser');
    const app = await AppModel.findOne({ unique_id: appId });
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    // Update app referral count and rewards
    app.total_shared += 1;
    app.total_xp_allocated += app.app_xp;
    app.total_points_allocated += app.app_points;
    await app.save();
    // Update user stats
    const user = await PlatformUserModel.findOne({ unique_id: userId });

    // Use updateReferralStats to update total XP and points earned consistently
    user.updateReferralStats(app.app_xp, app.app_points);

    // Update current XP and points (updateReferralStats only updates total earnings)
    user.current_xp += app.app_xp;
    user.current_points += app.app_points;

    user.total_apps_shared += 1;
    user.last_share_date = new Date();
    user.referral_count += 1;
    await user.save();
    res.json({
      message: 'App referred successfully',
      xpGained: app.app_xp,
      pointsGained: app.app_points
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get featured apps
// Get featured apps (GET /apps/featured?page=1&limit=20)
router.get('/featured', async (req, res) => {
  try {
    console.log('[GET] /apps/featured', { query: req.query });
    const { page = 1, limit = 20 } = req.query;
    const featuredApps = await App.find({
      is_active: true,
      is_featured: true
    })
      .populate('categories')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const total = await App.countDocuments({ is_active: true, is_featured: true });
    res.json(paginatedResponse(
      featuredApps,
      Number(page),
      Math.ceil(total / limit),
      total,
      Number(limit)
    ));
  } catch (error) {
    console.log(error);
    res.status(500).json(errorResponse('Server error'));
  }
});

// Get apps by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    console.log('[GET] /apps/category/' + req.params.categoryId, { query: req.query });
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const apps = await App.find({
      categories: categoryId,
      is_active: true
    })
      .populate('categories')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await App.countDocuments({
      categories: categoryId,
      is_active: true
    });

    res.json({
      apps,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get app statistics
router.get('/:id/stats', async (req, res) => {
  try {
    console.log('[GET] /apps/' + req.params.id + '/stats');
    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    res.json({
      referralCount: app.referralCount,
      totalXpAwarded: app.totalXpAwarded,
      totalPointsAwarded: app.totalPointsAwarded
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;