/**
 * Payment Model - INGAIN Platform
 * 
 * This model tracks all financial transactions including user payouts, host deposits,
 * and tournament prizes. It handles payment processing, approval workflows, and fraud detection.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    user_id: {
        type: String,
        ref: 'PlatformUser',
        default: null
    },
    host_id: {
        type: String,
        ref: 'PlatformUser',
        default: null
    },
    payment_type: {
        type: String,
        required: [true, 'Payment type is required'],
        enum: ['user_payout', 'host_deposit', 'tournament_prize', 'referral_bonus', 'badge_reward', 'admin_adjustment']
    },
    amount: {
        type: Number,
        required: [true, 'Payment amount is required'],
        min: [0.01, 'Payment amount must be at least $0.01']
    },
    currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
    },
    points_converted: {
        type: Number,
        default: 0,
        min: 0
    },
    conversion_rate: {
        type: Number,
        default: 0.100, // 10 points = $1 USD
        min: 0
    },
    payment_method: {
        type: String,
        required: [true, 'Payment method is required'],
        enum: ['bank_transfer', 'paypal', 'stripe', 'crypto', 'check', 'wire_transfer', 'platform_credit']
    },
    payment_details: {
        type: Object,
        default: {
            account_name: null,
            account_number: null,
            routing_number: null,
            swift_code: null,
            paypal_email: null,
            stripe_payment_intent: null,
            crypto_address: null,
            check_number: null
        }
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'rejected', 'refunded'],
        default: 'pending'
    },
    external_transaction_id: {
        type: String,
        default: null
    },
    processor_name: {
        type: String,
        enum: ['stripe', 'paypal', 'bank', 'manual', 'crypto'],
        default: null
    },
    requires_approval: {
        type: Boolean,
        default: true
    },
    approved_by: {
        type: String,
        ref: 'AdminUser',
        default: null
    },
    approved_at: {
        type: Date,
        default: null
    },
    rejection_reason: {
        type: String,
        default: null
    },
    initiated_at: {
        type: Date,
        default: null
    },
    completed_at: {
        type: Date,
        default: null
    },
    failed_at: {
        type: Date,
        default: null
    },
    failure_reason: {
        type: String,
        default: null
    },
    processing_fee: {
        type: Number,
        default: 0,
        min: 0
    },
    platform_fee: {
        type: Number,
        default: 0,
        min: 0
    },
    net_amount: {
        type: Number,
        default: null,
        min: 0
    },
    idempotency_key: {
        type: String,
        unique: true,
        default: null
    },
    notes: {
        type: String,
        default: null
    },
    metadata: {
        type: Object,
        default: {
            source: null,
            campaign_id: null,
            tournament_id: null,
            badge_id: null,
            referral_id: null,
            risk_score: 0,
            fraud_flags: []
        }
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total fees
paymentSchema.virtual('total_fees').get(function() {
    return (this.processing_fee || 0) + (this.platform_fee || 0);
});

// Virtual for processing time
paymentSchema.virtual('processing_time').get(function() {
    if (!this.initiated_at || !this.completed_at) return null;
    return this.completed_at - this.initiated_at;
});

// Virtual for is high value
paymentSchema.virtual('is_high_value').get(function() {
    return this.amount >= 100; // $100 threshold for high-value payments
});

// Virtual for risk level
paymentSchema.virtual('risk_level').get(function() {
    const riskScore = this.metadata?.risk_score || 0;
    if (riskScore >= 0.8) return 'high';
    if (riskScore >= 0.5) return 'medium';
    return 'low';
});

// Indexes for better performance
paymentSchema.index({ user_id: 1 });
paymentSchema.index({ host_id: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ payment_type: 1 });
paymentSchema.index({ created_at: -1 });
paymentSchema.index({ external_transaction_id: 1 });
paymentSchema.index({ idempotency_key: 1 });

// Compound indexes
paymentSchema.index({ user_id: 1, created_at: -1 });
paymentSchema.index({ status: 1, created_at: -1 });
paymentSchema.index({ payment_type: 1, status: 1 });

// Pre-save middleware to update timestamps and calculate net amount
paymentSchema.pre('save', function(next) {
    this.updated_at = new Date();
    
    // Calculate net amount
    if (this.amount && (this.processing_fee || this.platform_fee)) {
        this.net_amount = this.amount - this.total_fees;
    }
    
    // Set initiated_at if status is processing
    if (this.status === 'processing' && !this.initiated_at) {
        this.initiated_at = new Date();
    }
    
    // Set completed_at if status is completed
    if (this.status === 'completed' && !this.completed_at) {
        this.completed_at = new Date();
    }
    
    // Set failed_at if status is failed
    if (this.status === 'failed' && !this.failed_at) {
        this.failed_at = new Date();
    }
    
    next();
});

// Static method to find pending payments
paymentSchema.statics.findPending = function() {
    return this.find({ status: 'pending' }).sort({ created_at: 1 });
};

// Static method to find payments by user
paymentSchema.statics.findByUser = function(userId, limit = 50) {
    return this.find({ user_id: userId }).sort({ created_at: -1 }).limit(limit);
};

// Static method to find payments by status
paymentSchema.statics.findByStatus = function(status) {
    return this.find({ status: status }).sort({ created_at: -1 });
};

// Static method to find high-value payments
paymentSchema.statics.findHighValue = function() {
    return this.find({ amount: { $gte: 100 } }).sort({ created_at: -1 });
};

// Static method to find payments requiring approval
paymentSchema.statics.findRequiringApproval = function() {
    return this.find({ 
        requires_approval: true, 
        status: 'pending' 
    }).sort({ amount: -1, created_at: 1 });
};

// Instance method to approve payment
paymentSchema.methods.approve = function(adminId, notes = null) {
    this.status = 'processing';
    this.requires_approval = false;
    this.approved_by = adminId;
    this.approved_at = new Date();
    this.notes = notes;
    this.initiated_at = new Date();
    return this.save();
};

// Instance method to reject payment
paymentSchema.methods.reject = function(adminId, reason) {
    this.status = 'rejected';
    this.requires_approval = false;
    this.approved_by = adminId;
    this.approved_at = new Date();
    this.rejection_reason = reason;
    return this.save();
};

// Instance method to complete payment
paymentSchema.methods.complete = function(externalTransactionId = null) {
    this.status = 'completed';
    this.completed_at = new Date();
    if (externalTransactionId) {
        this.external_transaction_id = externalTransactionId;
    }
    return this.save();
};

// Instance method to fail payment
paymentSchema.methods.fail = function(reason) {
    this.status = 'failed';
    this.failed_at = new Date();
    this.failure_reason = reason;
    return this.save();
};

// Instance method to calculate fees
paymentSchema.methods.calculateFees = function() {
    let processingFee = 0;
    let platformFee = 0;
    
    switch (this.payment_method) {
        case 'bank_transfer':
            processingFee = this.amount * 0.01; // 1% processing fee
            platformFee = this.amount * 0.02; // 2% platform fee
            break;
        case 'paypal':
            processingFee = this.amount * 0.029 + 0.30; // PayPal fee structure
            platformFee = this.amount * 0.01; // 1% platform fee
            break;
        case 'stripe':
            processingFee = this.amount * 0.029 + 0.30; // Stripe fee structure
            platformFee = this.amount * 0.01; // 1% platform fee
            break;
        case 'crypto':
            processingFee = this.amount * 0.005; // 0.5% crypto fee
            platformFee = this.amount * 0.015; // 1.5% platform fee
            break;
        default:
            platformFee = this.amount * 0.02; // 2% platform fee
    }
    
    this.processing_fee = Math.round(processingFee * 100) / 100;
    this.platform_fee = Math.round(platformFee * 100) / 100;
    this.net_amount = this.amount - this.processing_fee - this.platform_fee;
    
    return this.save();
};

// Instance method to get payment summary
paymentSchema.methods.getPaymentSummary = function() {
    return {
        payment_id: this.unique_id,
        type: this.payment_type,
        amount: this.amount,
        currency: this.currency,
        net_amount: this.net_amount,
        fees: {
            processing: this.processing_fee,
            platform: this.platform_fee,
            total: this.total_fees
        },
        status: this.status,
        method: this.payment_method,
        processing_time: this.processing_time,
        risk_level: this.risk_level,
        created_at: this.created_at,
        completed_at: this.completed_at
    };
};

// Instance method to check if payment can be processed
paymentSchema.methods.canBeProcessed = function() {
    return this.status === 'pending' && 
           (!this.requires_approval || this.approved_by) &&
           this.amount > 0;
};

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = Payment;
