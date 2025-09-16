/**
 * Payment Routes - INGAIN Platform
 * 
 * This module handles all payment-related endpoints including:
 * - User payout requests
 * - Payment history and status
 * - Admin payment approval/rejection
 * - Payment method management
 * - KYC verification
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const express = require('express');
const Payment = require('../models/Technical/Payment');
const PlatformUser = require('../models/App/PlatformUser');
const AdminUser = require('../models/Admin/AdminUser');
const ActivityLog = require('../models/Technical/ActivityLog');
const { authenticateToken, authenticateAdmin, requirePermission } = require('../../middleware/auth');
const { processPayoutRequest, validatePayoutRequest, calculateFees } = require('../../utils/paymentAlgorithms');
const { analyzeFraud } = require('../../utils/fraudAlgorithms');
const { 
    successResponse, 
    errorResponse, 
    paginatedResponse, 
    itemResponse,
    createdResponse,
    notFoundResponse,
    validationErrorResponse
} = require('../../utils/responseHelper');

const router = express.Router();

/**
 * @route POST /api/payments/payout
 * @desc Request a payout (convert points to cash)
 * @access Private (Authenticated Users)
 */
router.post('/payout', authenticateToken, async (req, res) => {
    try {
        const { amount, payment_method, payment_details } = req.body;
        const userId = req.user.unique_id;

        // Validate payout request
        const validationResult = await validatePayoutRequest(userId, amount, payment_method, payment_details);

        if (!validationResult.valid) {
            return res.status(400).json(validationErrorResponse(validationResult.errors, 'Payout request validation failed'));
        }

        // Process payout request
        const payoutResult = await processPayoutRequest(userId, amount, payment_method, payment_details);

        if (!payoutResult.success) {
            return res.status(400).json(validationErrorResponse(payoutResult.errors, payoutResult.message));
        }

        // Log activity
        await ActivityLog.logUserActivity(
            userId,
            'payout_request',
            'Payout request submitted',
            {
                amount,
                payment_method,
                payment_id: payoutResult.payment.unique_id,
                status: 'pending'
            },
            {
                entityType: 'payment',
                entityId: payoutResult.payment.unique_id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.status(201).json(createdResponse({
            payment: payoutResult.payment,
            estimated_processing_time: payoutResult.estimatedProcessingTime
        }, 'Payout request submitted successfully'));

    } catch (error) {
        console.error('Payment payout error:', error);
        res.status(500).json(errorResponse('Internal server error during payout processing', 500));
    }
});

/**
 * @route GET /api/payments/history
 * @desc Get user's payment history
 * @access Private (Authenticated Users)
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, payment_type } = req.query;
        const userId = req.user.unique_id;

        const query = { user_id: userId };
        if (status) query.status = status;
        if (payment_type) query.payment_type = payment_type;

        const payments = await Payment.find(query)
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.json({
            success: true,
            payments,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json(errorResponse('Failed to retrieve payment history', 500));
    }
});

/**
 * @route GET /api/payments/:id
 * @desc Get specific payment details
 * @access Private (Authenticated Users)
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.unique_id;

        const payment = await Payment.findOne({ unique_id: id, user_id: userId });

        if (!payment) {
            return res.status(404).json(notFoundResponse('Payment not found'));
        }

        res.json({
            success: true,
            payment
        });

    } catch (error) {
        console.error('Payment details error:', error);
        res.status(500).json(errorResponse('Failed to retrieve payment details', 500));
    }
});

/**
 * @route POST /api/payments/:id/cancel
 * @desc Cancel a pending payment request
 * @access Private (Authenticated Users)
 */
router.post('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.unique_id;

        const payment = await Payment.findOne({ unique_id: id, user_id: userId });

        if (!payment) {
            return res.status(404).json(notFoundResponse('Payment not found'));
        }

        if (payment.status !== 'pending') {
            return res.status(400).json(errorResponse('Only pending payments can be cancelled', 400));
        }

        // Update payment status
        payment.status = 'cancelled';
        payment.cancelled_at = new Date();
        await payment.save();

        // Refund points to user if they were deducted
        if (payment.points_converted > 0) {
            await PlatformUser.updateOne(
                { unique_id: userId },
                { $inc: { current_points: payment.points_converted } }
            );
        }

        // Log activity
        await ActivityLog.logUserActivity(
            userId,
            'payout_processing',
            'Payment cancelled by user',
            {
                payment_id: id,
                amount: payment.amount,
                points_refunded: payment.points_converted
            },
            {
                entityType: 'payment',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'Payment cancelled successfully',
            payment
        });

    } catch (error) {
        console.error('Payment cancellation error:', error);
        res.status(500).json(errorResponse('Failed to cancel payment', 500));
    }
});

// ==================== ADMIN ROUTES ====================

/**
 * @route GET /api/payments/admin/pending
 * @desc Get all pending payments for admin review
 * @access Private (Admin Only)
 */
router.get('/admin/pending', authenticateAdmin, requirePermission('payment_approval'), async (req, res) => {
    try {
        const { page = 1, limit = 50, payment_type, min_amount, max_amount } = req.query;

        const query = { status: 'pending' };
        if (payment_type) query.payment_type = payment_type;
        if (min_amount || max_amount) {
            query.amount = {};
            if (min_amount) query.amount.$gte = parseFloat(min_amount);
            if (max_amount) query.amount.$lte = parseFloat(max_amount);
        }

        const payments = await Payment.find(query)
            .populate('user_id', 'name email phone region')
            .sort({ created_at: 1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.json({
            success: true,
            payments,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Admin pending payments error:', error);
        res.status(500).json(errorResponse('Failed to retrieve pending payments', 500));
    }
});

/**
 * @route POST /api/payments/admin/:id/approve
 * @desc Approve a payment request
 * @access Private (Admin Only)
 */
router.post('/admin/:id/approve', authenticateAdmin, requirePermission('payment_approval'), async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, external_transaction_id } = req.body;
        const adminId = req.user.unique_id;

        const payment = await Payment.findOne({ unique_id: id, status: 'pending' });

        if (!payment) {
            return res.status(404).json(notFoundResponse('Pending payment not found'));
        }

        // Perform fraud analysis
        const fraudAnalysis = await analyzeFraud('payment', {
            payment_id: id,
            user_id: payment.user_id,
            amount: payment.amount,
            payment_method: payment.payment_method
        });

        if (fraudAnalysis.risk_score > 0.8) {
            return res.status(400).json(errorResponse('Payment flagged for potential fraud', 400, fraudAnalysis));
        }

        // Update payment status
        payment.status = 'processing';
        payment.approved_by = adminId;
        payment.approved_at = new Date();
        payment.notes = notes || payment.notes;
        payment.external_transaction_id = external_transaction_id || payment.external_transaction_id;

        await payment.save();

        // Log admin activity
        await ActivityLog.logAdminActivity(
            adminId,
            'payout_approval',
            'Payment approved by admin',
            {
                payment_id: id,
                user_id: payment.user_id,
                amount: payment.amount,
                external_transaction_id: external_transaction_id,
                notes: notes
            },
            {
                entityType: 'payment',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'Payment approved successfully',
            payment
        });

    } catch (error) {
        console.error('Payment approval error:', error);
        res.status(500).json(errorResponse('Failed to approve payment', 500));
    }
});

/**
 * @route POST /api/payments/admin/:id/reject
 * @desc Reject a payment request
 * @access Private (Admin Only)
 */
router.post('/admin/:id/reject', authenticateAdmin, requirePermission('payment_approval'), async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason, notes } = req.body;
        const adminId = req.user.unique_id;

        if (!rejection_reason) {
            return res.status(400).json(errorResponse('Rejection reason is required', 400));
        }

        const payment = await Payment.findOne({ unique_id: id, status: 'pending' });

        if (!payment) {
            return res.status(404).json(notFoundResponse('Pending payment not found'));
        }

        // Update payment status
        payment.status = 'rejected';
        payment.rejection_reason = rejection_reason;
        payment.notes = notes || payment.notes;
        payment.rejected_at = new Date();
        payment.rejected_by = adminId;

        await payment.save();

        // Refund points to user
        if (payment.points_converted > 0) {
            await PlatformUser.updateOne(
                { unique_id: payment.user_id },
                { $inc: { current_points: payment.points_converted } }
            );
        }

        // Log admin activity
        await ActivityLog.logAdminActivity(
            adminId,
            'payout_rejection',
            'Payment rejected by admin',
            {
                payment_id: id,
                user_id: payment.user_id,
                amount: payment.amount,
                rejection_reason: rejection_reason,
                notes: notes
            },
            {
                entityType: 'payment',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'Payment rejected successfully',
            payment
        });

    } catch (error) {
        console.error('Payment rejection error:', error);
        res.status(500).json(errorResponse('Failed to reject payment', 500));
    }
});

/**
 * @route GET /api/payments/admin/analytics
 * @desc Get payment analytics for admin dashboard
 * @access Private (Admin Only)
 */
router.get('/admin/analytics', authenticateAdmin, requirePermission('payment_analytics'), async (req, res) => {
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

        // Payment statistics
        const totalPayments = await Payment.countDocuments({ created_at: dateFilter });
        const totalAmount = await Payment.aggregate([
            { $match: { created_at: dateFilter, status: { $in: ['completed', 'processing'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const statusBreakdown = await Payment.aggregate([
            { $match: { created_at: dateFilter } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const paymentMethodBreakdown = await Payment.aggregate([
            { $match: { created_at: dateFilter } },
            { $group: { _id: '$payment_method', count: { $sum: 1 }, total: { $sum: '$amount' } } }
        ]);

        res.json({
            success: true,
            analytics: {
                period,
                total_payments: totalPayments,
                total_amount: totalAmount[0]?.total || 0,
                status_breakdown: statusBreakdown,
                payment_method_breakdown: paymentMethodBreakdown
            }
        });

    } catch (error) {
        console.error('Payment analytics error:', error);
        res.status(500).json(errorResponse('Failed to retrieve payment analytics', 500));
    }
});

module.exports = router;
