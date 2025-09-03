/**
 * Referral Model - INGAIN Platform
 * 
 * This model tracks the referral system where users can invite friends
 * and earn bonuses when their referrals sign up and become active.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    referrer_id: {
        type: String,
        required: [true, 'Referrer ID is required'],
        ref: 'PlatformUser'
    },
    referred_id: {
        type: String,
        required: [true, 'Referred user ID is required'],
        ref: 'PlatformUser',
        unique: true
    },
    referral_code: {
        type: String,
        required: [true, 'Referral code is required'],
        trim: true
    },
    referral_source: {
        type: String,
        enum: ['email', 'whatsapp', 'telegram', 'social_media', 'direct_link', 'qr_code', 'other'],
        default: 'direct_link'
    },
    referral_channel: {
        type: String,
        trim: true,
        maxlength: [100, 'Referral channel cannot exceed 100 characters']
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'expired', 'fraudulent'],
        default: 'pending'
    },
    signup_date: {
        type: Date,
        default: null
    },
    activation_date: {
        type: Date,
        default: null
    },
    completion_date: {
        type: Date,
        default: null
    },
    activation_criteria: {
        min_shares: {
            type: Number,
            default: 5,
            min: 1
        },
        min_xp_earned: {
            type: Number,
            default: 100,
            min: 0
        },
        min_points_earned: {
            type: Number,
            default: 10,
            min: 0
        },
        min_days_active: {
            type: Number,
            default: 7,
            min: 1
        }
    },
    activation_progress: {
        shares_completed: {
            type: Number,
            default: 0,
            min: 0
        },
        xp_earned: {
            type: Number,
            default: 0,
            min: 0
        },
        points_earned: {
            type: Number,
            default: 0,
            min: 0
        },
        days_active: {
            type: Number,
            default: 0,
            min: 0
        },
        last_activity_date: {
            type: Date,
            default: null
        }
    },
    rewards: {
        referrer_bonus: {
            xp: {
                type: Number,
                default: 500,
                min: 0
            },
            points: {
                type: Number,
                default: 50,
                min: 0
            }
        },
        referred_bonus: {
            xp: {
                type: Number,
                default: 200,
                min: 0
            },
            points: {
                type: Number,
                default: 20,
                min: 0
            }
        },
        referrer_rewarded: {
            type: Boolean,
            default: false
        },
        referred_rewarded: {
            type: Boolean,
            default: false
        },
        referrer_rewarded_at: {
            type: Date,
            default: null
        },
        referred_rewarded_at: {
            type: Date,
            default: null
        }
    },
    fraud_detection: {
        fraud_score: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        fraud_flags: [{
            type: String,
            trim: true
        }],
        is_suspicious: {
            type: Boolean,
            default: false
        },
        reviewed_by: {
            type: String,
            ref: 'AdminUser',
            default: null
        },
        reviewed_at: {
            type: Date,
            default: null
        }
    },
    metadata: {
        ip_address: String,
        user_agent: String,
        device_info: Object,
        location: {
            country: String,
            region: String,
            city: String
        },
        utm_source: String,
        utm_medium: String,
        utm_campaign: String,
        utm_term: String,
        utm_content: String
    },
    expires_at: {
        type: Date,
        default: function () {
            // Referral expires after 30 days
            return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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

// Virtual for referral age in days
referralSchema.virtual('age_days').get(function () {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiration
referralSchema.virtual('days_until_expiration').get(function () {
    if (!this.expires_at) return null;
    const daysLeft = Math.ceil((this.expires_at - new Date()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
});

// Virtual for is expired
referralSchema.virtual('is_expired').get(function () {
    return this.expires_at && new Date() > this.expires_at;
});

// Virtual for activation percentage
referralSchema.virtual('activation_percentage').get(function () {
    const criteria = this.activation_criteria;
    const progress = this.activation_progress;

    const sharesPercent = Math.min(100, (progress.shares_completed / criteria.min_shares) * 100);
    const xpPercent = Math.min(100, (progress.xp_earned / criteria.min_xp_earned) * 100);
    const pointsPercent = Math.min(100, (progress.points_earned / criteria.min_points_earned) * 100);
    const daysPercent = Math.min(100, (progress.days_active / criteria.min_days_active) * 100);

    return Math.round((sharesPercent + xpPercent + pointsPercent + daysPercent) / 4);
});

// Virtual for can be activated
referralSchema.virtual('can_be_activated').get(function () {
    if (this.status !== 'pending') return false;
    if (this.is_expired) return false;

    const progress = this.activation_progress;
    const criteria = this.activation_criteria;

    return progress.shares_completed >= criteria.min_shares &&
        progress.xp_earned >= criteria.min_xp_earned &&
        progress.points_earned >= criteria.min_points_earned &&
        progress.days_active >= criteria.min_days_active;
});

// Indexes for better performance
referralSchema.index({ referrer_id: 1, created_at: -1 });
referralSchema.index({ referred_id: 1 });
referralSchema.index({ referral_code: 1 });
referralSchema.index({ status: 1, created_at: -1 });
referralSchema.index({ expires_at: 1 });
referralSchema.index({ 'fraud_detection.is_suspicious': 1 });
referralSchema.index({ 'rewards.referrer_rewarded': 1 });
referralSchema.index({ 'rewards.referred_rewarded': 1 });

// Pre-save middleware
referralSchema.pre('save', function (next) {
    this.updated_at = new Date();

    // Auto-update status based on activation progress
    if (this.status === 'pending' && this.can_be_activated) {
        this.status = 'active';
        this.activation_date = new Date();
    }

    next();
});

// Static method to create referral
referralSchema.statics.createReferral = function (referrerId, referralCode, referredId, options = {}) {
    return this.create({
        referrer_id: referrerId,
        referred_id: referredId,
        referral_code: referralCode,
        referral_source: options.source || 'direct_link',
        referral_channel: options.channel || null,
        metadata: {
            ip_address: options.ipAddress || null,
            user_agent: options.userAgent || null,
            device_info: options.deviceInfo || {},
            location: options.location || {},
            utm_source: options.utmSource || null,
            utm_medium: options.utmMedium || null,
            utm_campaign: options.utmCampaign || null,
            utm_term: options.utmTerm || null,
            utm_content: options.utmContent || null
        }
    });
};

// Static method to find referrals by referrer
referralSchema.statics.findByReferrer = function (referrerId, status = null, limit = 50) {
    const query = { referrer_id: referrerId };
    if (status) query.status = status;

    return this.find(query)
        .sort({ created_at: -1 })
        .limit(limit);
};

// Static method to find pending referrals
referralSchema.statics.findPending = function (limit = 100) {
    return this.find({ status: 'pending' })
        .sort({ created_at: 1 })
        .limit(limit);
};

// Static method to find expired referrals
referralSchema.statics.findExpired = function () {
    return this.find({
        status: 'pending',
        expires_at: { $lt: new Date() }
    });
};

// Static method to find suspicious referrals
referralSchema.statics.findSuspicious = function (limit = 100) {
    return this.find({ 'fraud_detection.is_suspicious': true })
        .sort({ 'fraud_detection.fraud_score': -1 })
        .limit(limit);
};

// Static method to find unrewarded referrals
referralSchema.statics.findUnrewarded = function (type = 'referrer', limit = 100) {
    const query = type === 'referrer' ?
        { 'rewards.referrer_rewarded': false, status: 'active' } :
        { 'rewards.referred_rewarded': false, status: 'active' };

    return this.find(query)
        .sort({ activation_date: 1 })
        .limit(limit);
};

// Static method to get referral statistics
referralSchema.statics.getStatistics = async function (referrerId = null) {
    const matchStage = referrerId ? { referrer_id: referrerId } : {};

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                total_rewards: {
                    $sum: {
                        $add: [
                            '$rewards.referrer_bonus.xp',
                            '$rewards.referrer_bonus.points'
                        ]
                    }
                }
            }
        }
    ];

    return this.aggregate(pipeline);
};

// Static method to get daily referral analytics
referralSchema.statics.getDailyAnalytics = async function (referrerId = null, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchStage = {
        created_at: { $gte: startDate },
        ...(referrerId && { referrer_id: referrerId })
    };

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: {
                    year: { $year: '$created_at' },
                    month: { $month: '$created_at' },
                    day: { $dayOfMonth: '$created_at' }
                },
                referral_count: { $sum: 1 },
                active_count: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                total_xp: { $sum: '$rewards.referrer_bonus.xp' },
                total_points: { $sum: '$rewards.referrer_bonus.points' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ];

    return this.aggregate(pipeline);
};

// Static method to find referrals by status with pagination
referralSchema.statics.findByStatusPaginated = function (status, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.find({ status })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('referrer_id', 'name email')
        .populate('referred_id', 'name email');
};

// Static method to cleanup expired referrals
referralSchema.statics.cleanupExpired = async function () {
    const expiredReferrals = await this.findExpired();
    const updatePromises = expiredReferrals.map(referral => {
        referral.status = 'expired';
        return referral.save();
    });

    return Promise.all(updatePromises);
};

// Instance method to update activation progress
referralSchema.methods.updateProgress = function (updates) {
    if (updates.shares_completed !== undefined) {
        this.activation_progress.shares_completed = updates.shares_completed;
    }
    if (updates.xp_earned !== undefined) {
        this.activation_progress.xp_earned = updates.xp_earned;
    }
    if (updates.points_earned !== undefined) {
        this.activation_progress.points_earned = updates.points_earned;
    }
    if (updates.days_active !== undefined) {
        this.activation_progress.days_active = updates.days_active;
    }

    this.activation_progress.last_activity_date = new Date();
    return this.save();
};

// Instance method to mark as fraudulent
referralSchema.methods.markAsFraudulent = function (fraudScore, fraudFlags, reviewedBy = null) {
    this.status = 'fraudulent';
    this.fraud_detection.fraud_score = fraudScore;
    this.fraud_detection.fraud_flags = fraudFlags;
    this.fraud_detection.is_suspicious = true;

    if (reviewedBy) {
        this.fraud_detection.reviewed_by = reviewedBy;
        this.fraud_detection.reviewed_at = new Date();
    }

    return this.save();
};

// Instance method to award referrer bonus
referralSchema.methods.awardReferrerBonus = async function () {
    if (this.rewards.referrer_rewarded) {
        throw new Error('Referrer bonus already awarded');
    }

    if (this.status !== 'active') {
        throw new Error('Referral must be active to award bonus');
    }

    // Update user's XP and Points
    const PlatformUser = mongoose.model('PlatformUser');
    const referrer = await PlatformUser.findOne({ unique_id: this.referrer_id });

    if (referrer) {
        referrer.current_xp += this.rewards.referrer_bonus.xp;
        referrer.current_points += this.rewards.referrer_bonus.points;
        referrer.total_xp_earned += this.rewards.referrer_bonus.xp;
        referrer.total_points_earned += this.rewards.referrer_bonus.points;
        referrer.total_referrals_completed += 1;

        await referrer.save();
    }

    // Mark bonus as awarded
    this.rewards.referrer_rewarded = true;
    this.rewards.referrer_rewarded_at = new Date();

    return this.save();
};

// Instance method to award referred user bonus
referralSchema.methods.awardReferredBonus = async function () {
    if (this.rewards.referred_rewarded) {
        throw new Error('Referred user bonus already awarded');
    }

    if (this.status !== 'active') {
        throw new Error('Referral must be active to award bonus');
    }

    // Update user's XP and Points
    const PlatformUser = mongoose.model('PlatformUser');
    const referred = await PlatformUser.findOne({ unique_id: this.referred_id });

    if (referred) {
        referred.current_xp += this.rewards.referred_bonus.xp;
        referred.current_points += this.rewards.referred_bonus.points;
        referred.total_xp_earned += this.rewards.referred_bonus.xp;
        referred.total_points_earned += this.rewards.referred_bonus.points;

        await referred.save();
    }

    // Mark bonus as awarded
    this.rewards.referred_rewarded = true;
    this.rewards.referred_rewarded_at = new Date();

    return this.save();
};

// Instance method to complete referral
referralSchema.methods.completeReferral = function () {
    if (this.status !== 'active') {
        throw new Error('Referral must be active to complete');
    }

    this.status = 'completed';
    this.completion_date = new Date();

    return this.save();
};

// Instance method to process both rewards
referralSchema.methods.processBothRewards = async function () {
    try {
        // Award referrer bonus first
        await this.awardReferrerBonus();

        // Then award referred user bonus
        await this.awardReferredBonus();

        // Complete the referral
        await this.completeReferral();

        return {
            success: true,
            message: 'Both rewards processed successfully',
            referrer_bonus: this.rewards.referrer_bonus,
            referred_bonus: this.rewards.referred_bonus
        };
    } catch (error) {
        throw new Error(`Failed to process rewards: ${error.message}`);
    }
};

// Instance method to validate referral eligibility
referralSchema.methods.validateEligibility = function () {
    const errors = [];

    if (this.status !== 'pending') {
        errors.push('Referral is not in pending status');
    }

    if (this.is_expired) {
        errors.push('Referral has expired');
    }

    if (this.fraud_detection.is_suspicious) {
        errors.push('Referral is flagged as suspicious');
    }

    if (!this.can_be_activated) {
        errors.push('Referral activation criteria not met');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Instance method to get referral summary
referralSchema.methods.getSummary = function () {
    return {
        id: this.unique_id,
        referrer_id: this.referrer_id,
        referred_id: this.referred_id,
        referral_code: this.referral_code,
        status: this.status,
        activation_percentage: this.activation_percentage,
        can_be_activated: this.can_be_activated,
        age_days: this.age_days,
        days_until_expiration: this.days_until_expiration,
        is_expired: this.is_expired,
        rewards: this.rewards,
        fraud_detection: this.fraud_detection,
        created_at: this.created_at,
        activation_date: this.activation_date,
        completion_date: this.completion_date
    };
};

const Referral = mongoose.models.Referral || mongoose.model('Referral', referralSchema);

module.exports = Referral;
