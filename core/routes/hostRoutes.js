/**
 * Host Routes - INGAIN Platform
 * 
 * This module handles all app host functionalities including:
 * - App submission and management
 * - Campaign configuration and monitoring
 * - Earnings tracking and analytics
 * - Host account management
 * - App performance metrics
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const express = require('express');
const App = require('../models/Common/App');
const HostAccount = require('../models/Technical/HostAccount');
const PlatformUser = require('../models/App/PlatformUser');
const ShareLog = require('../models/Technical/ShareLog');
const Payment = require('../models/Technical/Payment');
const ActivityLog = require('../models/Technical/ActivityLog');
const { authenticateToken, authenticateAdmin } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ==================== HOST ACCOUNT MANAGEMENT ====================

/**
 * @route POST /api/host/register
 * @desc Register as an app host
 * @access Private (Authenticated Users)
 */
router.post('/register', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;
        const {
            company_name,
            business_type,
            website_url,
            contact_person,
            contact_email,
            contact_phone,
            business_address,
            tax_id,
            bank_details
        } = req.body;

        // Check if user is already a host
        const existingHost = await HostAccount.findOne({ user_id: userId });
        if (existingHost) {
            return res.status(400).json({
                success: false,
                message: 'User is already registered as a host'
            });
        }

        // Validate required fields
        if (!company_name || !business_type || !contact_email) {
            return res.status(400).json({
                success: false,
                message: 'Company name, business type, and contact email are required'
            });
        }

        // Create host account
        const hostAccount = await HostAccount.create({
            unique_id: uuidv4(),
            user_id: userId,
            company_name,
            business_type,
            website_url,
            contact_person,
            contact_email,
            contact_phone,
            business_address,
            tax_id,
            bank_details,
            status: 'pending_verification',
            created_at: new Date()
        });

        // Update user role
        await PlatformUser.updateOne(
            { unique_id: userId },
            {
                $set: {
                    user_type: 'host',
                    host_account_id: hostAccount.unique_id
                }
            }
        );

        // Log activity
        await ActivityLog.logUserActivity(
            userId,
            'user_register',
            'Host account registration',
            {
                host_account_id: hostAccount.unique_id,
                company_name: company_name,
                business_type: business_type
            },
            {
                entityType: 'user',
                entityId: userId,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.status(201).json({
            success: true,
            message: 'Host registration submitted successfully',
            host_account: hostAccount,
            next_steps: 'Your application will be reviewed by our team within 24-48 hours'
        });

    } catch (error) {
        console.error('Host registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register as host'
        });
    }
});

/**
 * @route GET /api/host/profile
 * @desc Get host account profile
 * @access Private (Host Users)
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;

        const hostAccount = await HostAccount.findOne({ user_id: userId });
        if (!hostAccount) {
            return res.status(404).json({
                success: false,
                message: 'Host account not found'
            });
        }

        // Get host's apps
        const apps = await App.find({ host_id: userId })
            .select('app_name app_icon is_active total_shared total_xp_allocated total_points_allocated');

        // Get recent earnings
        const recentEarnings = await Payment.find({
            host_id: userId,
            payment_type: 'host_deposit',
            status: { $in: ['completed', 'processing'] }
        })
            .sort({ created_at: -1 })
            .limit(5);

        res.json({
            success: true,
            host_account: hostAccount,
            apps: apps,
            recent_earnings: recentEarnings
        });

    } catch (error) {
        console.error('Host profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve host profile'
        });
    }
});

/**
 * @route PUT /api/host/profile
 * @desc Update host account profile
 * @access Private (Host Users)
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;
        const updateData = req.body;

        const hostAccount = await HostAccount.findOne({ user_id: userId });
        if (!hostAccount) {
            return res.status(404).json({
                success: false,
                message: 'Host account not found'
            });
        }

        // Update host account
        Object.assign(hostAccount, updateData);
        hostAccount.updated_at = new Date();
        await hostAccount.save();

        // Log activity
        await ActivityLog.logUserActivity(
            userId,
            'user_profile_update',
            'Host profile updated',
            {
                host_account_id: hostAccount.unique_id,
                updates: updateData
            },
            {
                entityType: 'user',
                entityId: userId,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'Host profile updated successfully',
            host_account: hostAccount
        });

    } catch (error) {
        console.error('Host profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update host profile'
        });
    }
});

// ==================== APP MANAGEMENT ====================

/**
 * @route POST /api/host/apps
 * @desc Submit a new app for hosting
 * @access Private (Host Users)
 */
router.post('/apps', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;
        const {
            app_name,
            app_description,
            app_icon,
            app_store_url,
            play_store_url,
            categories,
            app_xp,
            app_points,
            campaign_budget,
            campaign_duration_days,
            target_regions,
            app_features,
            screenshots
        } = req.body;

        // Validate host account
        const hostAccount = await HostAccount.findOne({ user_id: userId });
        if (!hostAccount || hostAccount.status !== 'verified') {
            return res.status(403).json({
                success: false,
                message: 'Host account not verified or not found'
            });
        }

        // Validate required fields
        if (!app_name || !app_description || !app_xp || !app_points) {
            return res.status(400).json({
                success: false,
                message: 'App name, description, XP, and Points are required'
            });
        }

        // Create app
        const app = await App.create({
            unique_id: uuidv4(),
            host_id: userId,
            app_name,
            app_description,
            app_icon,
            app_store_url,
            play_store_url,
            categories: categories || [],
            app_xp: parseInt(app_xp),
            app_points: parseInt(app_points),
            campaign_budget: parseFloat(campaign_budget) || 0,
            campaign_duration_days: parseInt(campaign_duration_days) || 30,
            target_regions: target_regions || ['global'],
            app_features: app_features || [],
            screenshots: screenshots || [],
            is_active: false, // Requires admin approval
            status: 'pending_approval',
            created_at: new Date()
        });

        // Log activity
        await ActivityLog.logUserActivity(
            userId,
            'app_submitted',
            'New app submitted for review',
            {
                app_id: app.unique_id,
                app_name: app_name,
                app_xp: app_xp,
                app_points: app_points
            },
            {
                entityType: 'app',
                entityId: app.unique_id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.status(201).json({
            success: true,
            message: 'App submitted successfully for review',
            app: app,
            next_steps: 'Your app will be reviewed by our team within 24-48 hours'
        });

    } catch (error) {
        console.error('App submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit app'
        });
    }
});

/**
 * @route GET /api/host/apps
 * @desc Get host's apps with filtering and pagination
 * @access Private (Host Users)
 */
router.get('/apps', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;
        const {
            page = 1,
            limit = 20,
            status,
            is_active,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        const query = { host_id: userId };
        if (status) query.status = status;
        if (is_active !== undefined) query.is_active = is_active === 'true';

        const sortOptions = {};
        sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;

        const apps = await App.find(query)
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await App.countDocuments(query);

        res.json({
            success: true,
            apps,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Host apps error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve apps'
        });
    }
});

/**
 * @route PUT /api/host/apps/:id
 * @desc Update app details
 * @access Private (Host Users)
 */
router.put('/apps/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.unique_id;
        const updateData = req.body;

        // Find app and verify ownership
        const app = await App.findOne({ unique_id: id, host_id: userId });
        if (!app) {
            return res.status(404).json({
                success: false,
                message: 'App not found or access denied'
            });
        }

        // Only allow updates for pending or rejected apps
        if (app.status === 'approved' && app.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update approved and active apps'
            });
        }

        // Update app
        Object.assign(app, updateData);
        app.updated_at = new Date();

        // Reset status if significant changes made
        if (updateData.app_xp || updateData.app_points || updateData.app_description) {
            app.status = 'pending_approval';
            app.is_active = false;
        }

        await app.save();

        // Log activity
        await ActivityLog.logUserActivity(
            userId,
            'app_update',
            'App updated by host',
            {
                app_id: id,
                updates: updateData
            },
            {
                entityType: 'app',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'App updated successfully',
            app
        });

    } catch (error) {
        console.error('App update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update app'
        });
    }
});

/**
 * @route DELETE /api/host/apps/:id
 * @desc Delete an app
 * @access Private (Host Users)
 */
router.delete('/apps/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.unique_id;

        // Find app and verify ownership
        const app = await App.findOne({ unique_id: id, host_id: userId });
        if (!app) {
            return res.status(404).json({
                success: false,
                message: 'App not found or access denied'
            });
        }

        // Check if app can be deleted
        if (app.total_shared > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete app with existing shares'
            });
        }

        await App.deleteOne({ unique_id: id });

        // Log activity
        await ActivityLog.logUserActivity(
            userId,
            'app_deactivation',
            'App deleted by host',
            {
                app_id: id,
                app_name: app.app_name
            },
            {
                entityType: 'app',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'App deleted successfully'
        });

    } catch (error) {
        console.error('App deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete app'
        });
    }
});

// ==================== EARNINGS & ANALYTICS ====================

/**
 * @route GET /api/host/earnings
 * @desc Get host earnings and analytics
 * @access Private (Host Users)
 */
router.get('/earnings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;
        const { period = '30d' } = req.query;

        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case '7d':
                dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
                break;
            case '30d':
                dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
                break;
            case '90d':
                dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
                break;
            case '1y':
                dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
                break;
        }

        // Get earnings from payments
        const earnings = await Payment.aggregate([
            {
                $match: {
                    host_id: userId,
                    payment_type: 'host_deposit',
                    status: { $in: ['completed', 'processing'] },
                    created_at: dateFilter
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Get app performance
        const appPerformance = await App.aggregate([
            { $match: { host_id: userId, created_at: dateFilter } },
            {
                $group: {
                    _id: null,
                    total_apps: { $sum: 1 },
                    total_shares: { $sum: '$total_shared' },
                    total_xp_allocated: { $sum: '$total_xp_allocated' },
                    total_points_allocated: { $sum: '$total_points_allocated' }
                }
            }
        ]);

        // Get recent transactions
        const recentTransactions = await Payment.find({
            host_id: userId,
            payment_type: 'host_deposit'
        })
            .sort({ created_at: -1 })
            .limit(10);

        res.json({
            success: true,
            earnings: {
                period,
                total_earnings: earnings[0]?.total || 0,
                app_performance: appPerformance[0] || {
                    total_apps: 0,
                    total_shares: 0,
                    total_xp_allocated: 0,
                    total_points_allocated: 0
                },
                recent_transactions: recentTransactions
            }
        });

    } catch (error) {
        console.error('Host earnings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve earnings'
        });
    }
});

/**
 * @route GET /api/host/apps/:id/analytics
 * @desc Get specific app analytics
 * @access Private (Host Users)
 */
router.get('/apps/:id/analytics', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.unique_id;
        const { period = '30d' } = req.query;

        // Verify app ownership
        const app = await App.findOne({ unique_id: id, host_id: userId });
        if (!app) {
            return res.status(404).json({
                success: false,
                message: 'App not found or access denied'
            });
        }

        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case '7d':
                dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
                break;
            case '30d':
                dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
                break;
            case '90d':
                dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
                break;
            case '1y':
                dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
                break;
        }

        // Get share analytics
        const shareAnalytics = await ShareLog.aggregate([
            {
                $match: {
                    app_id: id,
                    created_at: dateFilter
                }
            },
            {
                $group: {
                    _id: '$share_type',
                    count: { $sum: 1 },
                    total_xp: { $sum: '$rewards_allocated.total_xp' },
                    total_points: { $sum: '$rewards_allocated.total_points' }
                }
            }
        ]);

        // Get daily share trends
        const dailyTrends = await ShareLog.aggregate([
            {
                $match: {
                    app_id: id,
                    created_at: dateFilter
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$created_at"
                        }
                    },
                    shares: { $sum: 1 },
                    xp_earned: { $sum: '$rewards_allocated.total_xp' },
                    points_earned: { $sum: '$rewards_allocated.total_points' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            app_analytics: {
                period,
                app_name: app.app_name,
                total_shares: app.total_shared,
                total_xp_allocated: app.total_xp_allocated,
                total_points_allocated: app.total_points_allocated,
                share_breakdown: shareAnalytics,
                daily_trends: dailyTrends
            }
        });

    } catch (error) {
        console.error('App analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve app analytics'
        });
    }
});

module.exports = router;
