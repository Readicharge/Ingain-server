/**
 * Notification Routes - INGAIN Platform
 * 
 * This module handles all notification functionalities including:
 * - User notifications (push, email, SMS)
 * - Notification preferences and settings
 * - Notification history and management
 * - Admin notification broadcasting
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const express = require('express');
const Notification = require('../models/Technical/Notification');
const PlatformUser = require('../models/App/PlatformUser');
const { authenticateToken, authenticateAdmin } = require('../../middleware/auth');
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

/**
 * @route GET /api/notifications
 * @desc Get user's notifications with filtering and pagination
 * @access Private (Authenticated Users)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            type, 
            is_read,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;
        const userId = req.user.unique_id;

        const query = { user_id: userId };
        if (type) query.notification_type = type;
        if (is_read !== undefined) query.is_read = is_read === 'true';

        const sortOptions = {};
        sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;

        const notifications = await Notification.find(query)
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ 
            user_id: userId, 
            is_read: false 
        });

        res.json({
            success: true,
            notifications,
            unread_count: unreadCount,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve notifications'
        });
    }
});

/**
 * @route GET /api/notifications/unread-count
 * @desc Get count of unread notifications
 * @access Private (Authenticated Users)
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;

        const unreadCount = await Notification.countDocuments({ 
            user_id: userId, 
            is_read: false 
        });

        res.json({
            success: true,
            unread_count: unreadCount
        });

    } catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count'
        });
    }
});

/**
 * @route POST /api/notifications/:id/read
 * @desc Mark notification as read
 * @access Private (Authenticated Users)
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.unique_id;

        const notification = await Notification.findOne({ 
            unique_id: id, 
            user_id: userId 
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        notification.is_read = true;
        notification.read_at = new Date();
        await notification.save();

        res.json({
            success: true,
            message: 'Notification marked as read',
            notification
        });

    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

/**
 * @route POST /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private (Authenticated Users)
 */
router.post('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;

        const result = await Notification.updateMany(
            { user_id: userId, is_read: false },
            { 
                $set: { 
                    is_read: true, 
                    read_at: new Date() 
                } 
            }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read',
            updated_count: result.modifiedCount
        });

    } catch (error) {
        console.error('Read all error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a notification
 * @access Private (Authenticated Users)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.unique_id;

        const notification = await Notification.findOne({ 
            unique_id: id, 
            user_id: userId 
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        await Notification.deleteOne({ unique_id: id });

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
});

/**
 * @route DELETE /api/notifications/clear-read
 * @desc Clear all read notifications
 * @access Private (Authenticated Users)
 */
router.delete('/clear-read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;

        const result = await Notification.deleteMany({
            user_id: userId,
            is_read: true
        });

        res.json({
            success: true,
            message: 'Read notifications cleared successfully',
            deleted_count: result.deletedCount
        });

    } catch (error) {
        console.error('Clear read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear read notifications'
        });
    }
});

/**
 * @route GET /api/notifications/preferences
 * @desc Get user's notification preferences
 * @access Private (Authenticated Users)
 */
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;

        const user = await PlatformUser.findOne({ unique_id: userId })
            .select('notification_preferences');

        res.json({
            success: true,
            preferences: user.notification_preferences || {
                push: true,
                email: true,
                sms: false,
                types: {
                    badge_earned: true,
                    tournament_update: true,
                    payment_status: true,
                    referral_bonus: true,
                    system_announcement: false
                }
            }
        });

    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notification preferences'
        });
    }
});

/**
 * @route PUT /api/notifications/preferences
 * @desc Update user's notification preferences
 * @access Private (Authenticated Users)
 */
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;
        const { preferences } = req.body;

        if (!preferences) {
            return res.status(400).json({
                success: false,
                message: 'Preferences data is required'
            });
        }

        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update notification preferences
        user.notification_preferences = {
            ...user.notification_preferences,
            ...preferences
        };

        await user.save();

        res.json({
            success: true,
            message: 'Notification preferences updated successfully',
            preferences: user.notification_preferences
        });

    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification preferences'
        });
    }
});

// ==================== ADMIN ROUTES ====================

/**
 * @route POST /api/notifications/admin/broadcast
 * @desc Send broadcast notification to all users or specific groups
 * @access Private (Admin Only)
 */
router.post('/admin/broadcast', authenticateAdmin, async (req, res) => {
    try {
        const {
            title,
            message,
            notification_type,
            target_users,
            target_regions,
            target_user_levels,
            scheduled_at
        } = req.body;

        if (!title || !message || !notification_type) {
            return res.status(400).json({
                success: false,
                message: 'Title, message, and notification type are required'
            });
        }

        // Build user query based on target criteria
        let userQuery = {};
        if (target_regions && target_regions.length > 0) {
            userQuery.region = { $in: target_regions };
        }
        if (target_user_levels && target_user_levels.length > 0) {
            userQuery.user_level = { $in: target_user_levels };
        }

        // Get target users
        const targetUsers = await PlatformUser.find(userQuery)
            .select('unique_id notification_preferences');

        if (targetUsers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No users match the specified criteria'
            });
        }

        // Create notifications for each user
        const notifications = [];
        const now = scheduled_at ? new Date(scheduled_at) : new Date();

        for (const user of targetUsers) {
            // Check user preferences
            const userPrefs = user.notification_preferences || {};
            const typeEnabled = userPrefs.types && userPrefs.types[notification_type] !== false;

            if (typeEnabled) {
                notifications.push({
                    unique_id: require('uuid').v4(),
                    user_id: user.unique_id,
                    title: title,
                    message: message,
                    notification_type: notification_type,
                    is_broadcast: true,
                    scheduled_at: now,
                    created_at: new Date()
                });
            }
        }

        // Bulk insert notifications
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.json({
            success: true,
            message: 'Broadcast notification scheduled successfully',
            target_users: targetUsers.length,
            notifications_created: notifications.length,
            scheduled_at: now
        });

    } catch (error) {
        console.error('Broadcast notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to schedule broadcast notification'
        });
    }
});

/**
 * @route GET /api/notifications/admin/analytics
 * @desc Get notification analytics for admin dashboard
 * @access Private (Admin Only)
 */
router.get('/admin/analytics', authenticateAdmin, async (req, res) => {
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

        // Notification statistics
        const totalNotifications = await Notification.countDocuments({ created_at: dateFilter });
        const readNotifications = await Notification.countDocuments({ 
            created_at: dateFilter, 
            is_read: true 
        });
        const unreadNotifications = await Notification.countDocuments({ 
            created_at: dateFilter, 
            is_read: false 
        });

        // Notification type breakdown
        const typeBreakdown = await Notification.aggregate([
            { $match: { created_at: dateFilter } },
            { $group: { _id: '$notification_type', count: { $sum: 1 } } }
        ]);

        // Daily notification trends
        const dailyTrends = await Notification.aggregate([
            { $match: { created_at: dateFilter } },
            {
                $group: {
                    _id: { 
                        $dateToString: { 
                            format: "%Y-%m-%d", 
                            date: "$created_at" 
                        } 
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Broadcast notification stats
        const broadcastStats = await Notification.aggregate([
            { 
                $match: { 
                    created_at: dateFilter,
                    is_broadcast: true 
                } 
            },
            {
                $group: {
                    _id: null,
                    total_broadcasts: { $sum: 1 },
                    total_recipients: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            analytics: {
                period,
                total_notifications: totalNotifications,
                read_notifications: readNotifications,
                unread_notifications: unreadNotifications,
                read_rate: totalNotifications > 0 ? (readNotifications / totalNotifications * 100).toFixed(2) : 0,
                type_breakdown: typeBreakdown,
                daily_trends: dailyTrends,
                broadcast_stats: broadcastStats[0] || {
                    total_broadcasts: 0,
                    total_recipients: 0
                }
            }
        });

    } catch (error) {
        console.error('Notification analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve notification analytics'
        });
    }
});

module.exports = router;
