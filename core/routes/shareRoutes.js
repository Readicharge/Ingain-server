/**
 * Share Routes - INGAIN Platform
 * 
 * This module handles all app sharing functionalities including:
 * - Share link generation (Regular & Tournament)
 * - Share verification and validation
 * - Fraud detection and prevention
 * - Reward calculation and distribution
 * - Share analytics and tracking
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const express = require('express');
const ShareLog = require('../models/Technical/ShareLog');
const App = require('../models/Common/App');
const Tournament = require('../models/Common/Tournament');
const PlatformUser = require('../models/App/PlatformUser');
const TournamentParticipant = require('../models/Common/TournamentParticipant');
const { authenticateToken, authenticateAdmin } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * @route POST /api/shares/generate
 * @desc Generate a share link for an app (Regular or Tournament)
 * @access Private (Authenticated Users)
 */
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { app_id, share_channel, tournament_id, custom_message } = req.body;
        const userId = req.user.unique_id;

        // Validate app exists and is active
        const app = await App.findOne({ unique_id: app_id, is_active: true });
        if (!app) {
            return res.status(404).json({
                success: false,
                message: 'App not found or inactive'
            });
        }

        // Generate unique tracking ID
        const trackingId = uuidv4();

        // Create share log entry
        const shareLog = await ShareLog.create({
            unique_id: uuidv4(),
            user_id: userId,
            app_id: app_id,
            tournament_id: tournament_id || null,
            share_type: tournament_id ? 'tournament' : 'regular',
            share_channel: share_channel || 'general',
            tracking_id: trackingId,
            custom_message: custom_message || null,
            validation_status: 'pending',
            fraud_score: 0,
            created_at: new Date()
        });

        // Generate share link
        const baseUrl = process.env.FRONTEND_URL || 'https://ingain.com';
        const shareUrl = `${baseUrl}/share/${trackingId}`;

        res.status(201).json({
            success: true,
            message: 'Share link generated successfully',
            share_data: {
                tracking_id: trackingId,
                share_url: shareUrl,
                share_type: tournament_id ? 'tournament' : 'regular',
                app_name: app.app_name,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        });

    } catch (error) {
        console.error('Share generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate share link'
        });
    }
});

/**
 * @route GET /api/shares/history
 * @desc Get user's share history
 * @access Private (Authenticated Users)
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, share_type } = req.query;
        const userId = req.user.unique_id;

        const query = { user_id: userId };
        if (status) query.validation_status = status;
        if (share_type) query.share_type = share_type;

        const shares = await ShareLog.find(query)
            .populate('app_id', 'app_name app_icon')
            .populate('tournament_id', 'tournament_name')
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await ShareLog.countDocuments(query);

        res.json({
            success: true,
            shares,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Share history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve share history'
        });
    }
});

module.exports = router;
