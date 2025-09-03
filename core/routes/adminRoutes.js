/**
 * Admin Routes - INGAIN Platform
 * 
 * This module handles all super admin functionalities including:
 * - User management and moderation
 * - Platform settings and configuration
 * - Tournament management
 * - Fraud detection and resolution
 * - System analytics and monitoring
 * - Content moderation
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const express = require('express');
const PlatformUser = require('../models/App/PlatformUser');
const AdminUser = require('../models/Admin/AdminUser');
const App = require('../models/Common/App');
const Tournament = require('../models/Common/Tournament');
const Payment = require('../models/Technical/Payment');
const ShareLog = require('../models/Technical/ShareLog');
const FraudReport = require('../models/Technical/FraudReport');
const ActivityLog = require('../models/Technical/ActivityLog');
const { authenticateAdmin, requirePermission } = require('../../middleware/auth');

const router = express.Router();

// ==================== USER MANAGEMENT ====================

/**
 * @route GET /api/admin/users
 * @desc Get all users with filtering and pagination
 * @access Private (Admin Only)
 */
router.get('/users', authenticateAdmin, requirePermission('user_management'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            status,
            region,
            user_level,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { unique_id: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) query.status = status;
        if (region) query.region = region;
        if (user_level) query.user_level = parseInt(user_level);

        const sortOptions = {};
        sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;

        const users = await PlatformUser.find(query)
            .select('-password_hash')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await PlatformUser.countDocuments(query);

        res.json({
            success: true,
            users,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve users'
        });
    }
});

/**
 * @route GET /api/admin/users/:id
 * @desc Get detailed user information
 * @access Private (Admin Only)
 */
router.get('/users/:id', authenticateAdmin, requirePermission('user_management'), async (req, res) => {
    try {
        const { id } = req.params;

        const user = await PlatformUser.findOne({ unique_id: id })
            .select('-password_hash');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's recent activity
        const recentActivity = await ActivityLog.find({ user_id: id })
            .sort({ created_at: -1 })
            .limit(10);

        // Get user's payment history
        const payments = await Payment.find({ user_id: id })
            .sort({ created_at: -1 })
            .limit(5);

        // Get user's share history
        const shares = await ShareLog.find({ user_id: id })
            .populate('app_id', 'app_name')
            .sort({ created_at: -1 })
            .limit(5);

        res.json({
            success: true,
            user,
            recent_activity: recentActivity,
            recent_payments: payments,
            recent_shares: shares
        });

    } catch (error) {
        console.error('Admin user details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve user details'
        });
    }
});

/**
 * @route PUT /api/admin/users/:id/status
 * @desc Update user status (active, suspended, banned)
 * @access Private (Admin Only)
 */
router.put('/users/:id/status', authenticateAdmin, requirePermission('user_moderation'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason, duration } = req.body;
        const adminId = req.user.unique_id;

        if (!['active', 'suspended', 'banned'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status specified'
            });
        }

        const user = await PlatformUser.findOne({ unique_id: id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const previousStatus = user.status;
        user.status = status;
        user.status_updated_at = new Date();
        user.status_updated_by = adminId;

        if (status === 'suspended' && duration) {
            user.suspension_end_date = new Date(Date.now() + duration * 60 * 60 * 1000); // duration in hours
        }

        if (status === 'banned') {
            user.banned_at = new Date();
            user.banned_by = adminId;
            user.ban_reason = reason;
        }

        await user.save();

        // Log admin action
        await ActivityLog.logAdminActivity(
            adminId,
            'user_status_updated',
            'User status updated by admin',
            {
                target_user_id: id,
                previous_status: previousStatus,
                new_status: status,
                reason: reason,
                duration: duration
            },
            {
                entityType: 'user',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'User status updated successfully',
            user
        });

    } catch (error) {
        console.error('Admin user status update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status'
        });
    }
});

/**
 * @route POST /api/admin/users/:id/adjust-points
 * @desc Adjust user's XP or Points (admin adjustment)
 * @access Private (Admin Only)
 */
router.post('/users/:id/adjust-points', authenticateAdmin, requirePermission('user_moderation'), async (req, res) => {
    try {
        const { id } = req.params;
        const { xp_adjustment, points_adjustment, reason } = req.body;
        const adminId = req.user.unique_id;

        if (!xp_adjustment && !points_adjustment) {
            return res.status(400).json({
                success: false,
                message: 'At least one adjustment (XP or Points) is required'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Reason for adjustment is required'
            });
        }

        const user = await PlatformUser.findOne({ unique_id: id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Apply adjustments
        if (xp_adjustment) {
            user.current_xp = Math.max(0, user.current_xp + xp_adjustment);
            user.total_xp_earned = Math.max(0, user.total_xp_earned + xp_adjustment);
        }

        if (points_adjustment) {
            user.current_points = Math.max(0, user.current_points + points_adjustment);
            user.total_points_earned = Math.max(0, user.total_points_earned + points_adjustment);
        }

        await user.save();

        // Log admin action
        await ActivityLog.logAdminActivity(
            adminId,
            'user_points_adjusted',
            'User XP/Points adjusted by admin',
            {
                target_user_id: id,
                xp_adjustment: xp_adjustment || 0,
                points_adjustment: points_adjustment || 0,
                reason: reason
            },
            {
                entityType: 'user',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'User points adjusted successfully',
            user: {
                unique_id: user.unique_id,
                name: user.name,
                current_xp: user.current_xp,
                current_points: user.current_points,
                total_xp_earned: user.total_xp_earned,
                total_points_earned: user.total_points_earned
            }
        });

    } catch (error) {
        console.error('Admin points adjustment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to adjust user points'
        });
    }
});

// ==================== TOURNAMENT MANAGEMENT ====================

/**
 * @route POST /api/admin/tournaments
 * @desc Create a new tournament
 * @access Private (Admin Only)
 */
router.post('/tournaments', authenticateAdmin, requirePermission('tournament_management'), async (req, res) => {
    try {
        const {
            tournament_name,
            tournament_description,
            start_date,
            end_date,
            prize_pool,
            max_participants,
            eligible_regions,
            apps_involved,
            rules,
            reward_multiplier
        } = req.body;

        const adminId = req.user.unique_id;

        // Validate required fields
        if (!tournament_name || !start_date || !end_date || !prize_pool) {
            return res.status(400).json({
                success: false,
                message: 'Tournament name, start date, end date, and prize pool are required'
            });
        }

        // Create tournament
        const tournament = await Tournament.create({
            unique_id: require('uuid').v4(),
            tournament_name,
            tournament_description,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            prize_pool: parseFloat(prize_pool),
            max_participants: max_participants || 1000,
            eligible_regions: eligible_regions || ['global'],
            apps_involved: apps_involved || [],
            rules: rules || [],
            reward_multiplier: reward_multiplier || 1.5,
            is_active: true,
            created_by: adminId,
            created_at: new Date()
        });

        // Log admin action
        await ActivityLog.logAdminActivity(
            adminId,
            'tournament_creation',
            'Tournament created by admin',
            {
                tournament_id: tournament.unique_id,
                tournament_name: tournament.tournament_name,
                prize_pool: tournament.prize_pool
            },
            {
                entityType: 'tournament',
                entityId: tournament.unique_id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.status(201).json({
            success: true,
            message: 'Tournament created successfully',
            tournament
        });

    } catch (error) {
        console.error('Admin tournament creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create tournament'
        });
    }
});

/**
 * @route PUT /api/admin/tournaments/:id
 * @desc Update tournament details
 * @access Private (Admin Only)
 */
router.put('/tournaments/:id', authenticateAdmin, requirePermission('tournament_management'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const adminId = req.user.unique_id;

        const tournament = await Tournament.findOne({ unique_id: id });
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        // Update tournament
        Object.assign(tournament, updateData);
        tournament.updated_at = new Date();
        tournament.updated_by = adminId;

        await tournament.save();

        // Log admin action
        await ActivityLog.logAdminActivity(
            adminId,
            'tournament_update',
            'Tournament updated by admin',
            {
                tournament_id: id,
                updates: updateData
            },
            {
                entityType: 'tournament',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'Tournament updated successfully',
            tournament
        });

    } catch (error) {
        console.error('Admin tournament update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tournament'
        });
    }
});

// ==================== FRAUD MANAGEMENT ====================

/**
 * @route GET /api/admin/fraud-reports
 * @desc Get all fraud reports with filtering
 * @access Private (Admin Only)
 */
router.get('/fraud-reports', authenticateAdmin, requirePermission('fraud_management'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            status,
            report_type,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        const query = {};
        if (status) query.status = status;
        if (report_type) query.report_type = report_type;

        const sortOptions = {};
        sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;

        const reports = await FraudReport.find(query)
            .populate('reporter_id', 'name email')
            .populate('reported_user_id', 'name email')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await FraudReport.countDocuments(query);

        res.json({
            success: true,
            reports,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Admin fraud reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve fraud reports'
        });
    }
});

/**
 * @route POST /api/admin/fraud-reports/:id/review
 * @desc Review and resolve fraud report
 * @access Private (Admin Only)
 */
router.post('/fraud-reports/:id/review', authenticateAdmin, requirePermission('fraud_management'), async (req, res) => {
    try {
        const { id } = req.params;
        const { action, resolution_notes, penalty_applied } = req.body;
        const adminId = req.user.unique_id;

        if (!['resolved', 'dismissed', 'escalated'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action specified'
            });
        }

        const report = await FraudReport.findOne({ unique_id: id });
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Fraud report not found'
            });
        }

        // Update report status
        report.status = action;
        report.resolution_notes = resolution_notes;
        report.resolved_at = new Date();
        report.resolved_by = adminId;

        if (action === 'resolved' && penalty_applied) {
            report.penalty_applied = penalty_applied;
        }

        await report.save();

        // Log admin action
        await ActivityLog.logAdminActivity(
            adminId,
            'fraud_report_reviewed',
            'Fraud report reviewed by admin',
            {
                report_id: id,
                action: action,
                resolution_notes: resolution_notes,
                penalty_applied: penalty_applied
            },
            {
                entityType: 'fraud_report',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'Fraud report reviewed successfully',
            report
        });

    } catch (error) {
        console.error('Admin fraud report review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review fraud report'
        });
    }
});

// ==================== SYSTEM ANALYTICS ====================

/**
 * @route GET /api/admin/analytics/dashboard
 * @desc Get comprehensive platform analytics
 * @access Private (Admin Only)
 */
router.get('/analytics/dashboard', authenticateAdmin, requirePermission('analytics'), async (req, res) => {
    try {
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

        // User statistics
        const totalUsers = await PlatformUser.countDocuments();
        const activeUsers = await PlatformUser.countDocuments({ status: 'active' });
        const newUsers = await PlatformUser.countDocuments({ created_at: dateFilter });

        // App statistics
        const totalApps = await App.countDocuments();
        const activeApps = await App.countDocuments({ is_active: true });

        // Tournament statistics
        const totalTournaments = await Tournament.countDocuments();
        const activeTournaments = await Tournament.countDocuments({ is_active: true });

        // Share statistics
        const totalShares = await ShareLog.countDocuments({ created_at: dateFilter });
        const verifiedShares = await ShareLog.countDocuments({
            created_at: dateFilter,
            validation_status: 'verified'
        });

        // Payment statistics
        const totalPayments = await Payment.countDocuments({ created_at: dateFilter });
        const totalPayoutAmount = await Payment.aggregate([
            { $match: { created_at: dateFilter, status: { $in: ['completed', 'processing'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Fraud statistics
        const totalFraudReports = await FraudReport.countDocuments({ created_at: dateFilter });
        const resolvedFraudReports = await FraudReport.countDocuments({
            created_at: dateFilter,
            status: 'resolved'
        });

        res.json({
            success: true,
            analytics: {
                period,
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    new: newUsers,
                    growth_rate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0
                },
                apps: {
                    total: totalApps,
                    active: activeApps
                },
                tournaments: {
                    total: totalTournaments,
                    active: activeTournaments
                },
                shares: {
                    total: totalShares,
                    verified: verifiedShares,
                    verification_rate: totalShares > 0 ? (verifiedShares / totalShares * 100).toFixed(2) : 0
                },
                payments: {
                    total: totalPayments,
                    total_amount: totalPayoutAmount[0]?.total || 0
                },
                fraud: {
                    total_reports: totalFraudReports,
                    resolved: resolvedFraudReports,
                    resolution_rate: totalFraudReports > 0 ? (resolvedFraudReports / totalFraudReports * 100).toFixed(2) : 0
                }
            }
        });

    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve analytics'
        });
    }
});

module.exports = router;
