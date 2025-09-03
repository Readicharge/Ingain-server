/**
 * ShareLog Model - INGAIN Platform
 * 
 * This model tracks all share activities and their verification status.
 * It handles both regular app shares and tournament shares with different reward calculations.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const shareLogSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    user_id: {
        type: String,
        required: [true, 'User ID is required'],
        ref: 'PlatformUser'
    },
    app_id: {
        type: String,
        required: [true, 'App ID is required'],
        ref: 'App'
    },
    tournament_id: {
        type: String,
        ref: 'Tournament',
        default: null
    },
    share_type: {
        type: String,
        enum: ['regular', 'tournament'],
        default: 'regular'
    },
    share_channel: {
        type: String,
        required: [true, 'Share channel is required'],
        enum: ['whatsapp', 'telegram', 'sms', 'email', 'facebook', 'twitter', 'instagram', 'linkedin', 'discord', 'other']
    },
    share_url: {
        type: String,
        required: [true, 'Share URL is required'],
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Share URL must be a valid URL'
        }
    },
    short_url: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Short URL must be a valid URL'
        }
    },
    tracking_id: {
        type: String,
        required: [true, 'Tracking ID is required'],
        unique: true
    },
    device_info: {
        type: Object,
        default: {
            user_agent: null,
            ip_address: null,
            device_type: null,
            browser: null,
            os: null,
            screen_resolution: null,
            language: null,
            timezone: null
        }
    },
    validation_status: {
        type: String,
        enum: ['pending', 'verified', 'invalid', 'expired', 'fraudulent'],
        default: 'pending'
    },
    validation_details: {
        type: Object,
        default: {
            verification_events: [],
            conversion_events: [],
            fraud_indicators: [],
            verification_score: 0,
            conversion_score: 0,
            final_score: 0
        }
    },
    xp_awarded: {
        type: Number,
        default: 0,
        min: 0
    },
    points_awarded: {
        type: Number,
        default: 0,
        min: 0
    },
    base_xp: {
        type: Number,
        default: 0,
        min: 0
    },
    base_points: {
        type: Number,
        default: 0,
        min: 0
    },
    tournament_xp_bonus: {
        type: Number,
        default: 0,
        min: 0
    },
    tournament_points_bonus: {
        type: Number,
        default: 0,
        min: 0
    },
    xp_source: {
        type: String,
        enum: ['share', 'bonus', 'tournament', 'badge', 'referral'],
        default: 'share'
    },
    points_source: {
        type: String,
        enum: ['share', 'bonus', 'tournament', 'badge', 'referral'],
        default: 'share'
    },
    tournament_score_contribution: {
        type: Number,
        default: 0,
        min: 0
    },
    fraud_score: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    },
    fraud_flags: {
        type: [String],
        default: []
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    verified_at: {
        type: Date,
        default: null
    },
    expires_at: {
        type: Date,
        required: [true, 'Expiration date is required']
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

// Virtual for total rewards
shareLogSchema.virtual('total_rewards').get(function() {
    return {
        xp: this.xp_awarded,
        points: this.points_awarded,
        usd_value: this.points_awarded * 0.1 // 10 points = $1 USD
    };
});

// Virtual for reward breakdown
shareLogSchema.virtual('reward_breakdown').get(function() {
    return {
        base: {
            xp: this.base_xp,
            points: this.base_points
        },
        tournament_bonus: {
            xp: this.tournament_xp_bonus,
            points: this.tournament_points_bonus
        },
        total: {
            xp: this.xp_awarded,
            points: this.points_awarded
        }
    };
});

// Virtual for time until expiration
shareLogSchema.virtual('time_until_expiration').get(function() {
    if (!this.expires_at) return null;
    return this.expires_at - new Date();
});

// Virtual for is expired
shareLogSchema.virtual('is_expired').get(function() {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
});

// Virtual for can be verified
shareLogSchema.virtual('can_be_verified').get(function() {
    return this.validation_status === 'pending' && !this.is_expired;
});

// Indexes for better performance
shareLogSchema.index({ user_id: 1 });
shareLogSchema.index({ app_id: 1 });
shareLogSchema.index({ tournament_id: 1 });
shareLogSchema.index({ tracking_id: 1 });
shareLogSchema.index({ validation_status: 1 });
shareLogSchema.index({ created_at: 1 });
shareLogSchema.index({ expires_at: 1 });
shareLogSchema.index({ share_type: 1 });
shareLogSchema.index({ share_channel: 1 });

// Compound indexes for common queries
shareLogSchema.index({ user_id: 1, created_at: -1 });
shareLogSchema.index({ app_id: 1, created_at: -1 });
shareLogSchema.index({ tournament_id: 1, created_at: -1 });
shareLogSchema.index({ validation_status: 1, created_at: -1 });

// Pre-save middleware to update timestamps
shareLogSchema.pre('save', function(next) {
    this.updated_at = new Date();
    
    // Set expiration date if not provided
    if (!this.expires_at) {
        this.expires_at = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours default
    }
    
    // Calculate total rewards
    this.xp_awarded = this.base_xp + this.tournament_xp_bonus;
    this.points_awarded = this.base_points + this.tournament_points_bonus;
    
    next();
});

// Static method to find pending shares
shareLogSchema.statics.findPending = function() {
    return this.find({
        validation_status: 'pending',
        expires_at: { $gt: new Date() }
    }).sort({ created_at: 1 });
};

// Static method to find expired shares
shareLogSchema.statics.findExpired = function() {
    return this.find({
        validation_status: 'pending',
        expires_at: { $lte: new Date() }
    });
};

// Static method to find user shares by date range
shareLogSchema.statics.findUserSharesByDateRange = function(userId, startDate, endDate) {
    return this.find({
        user_id: userId,
        created_at: { $gte: startDate, $lte: endDate }
    }).sort({ created_at: -1 });
};

// Static method to find app shares by date range
shareLogSchema.statics.findAppSharesByDateRange = function(appId, startDate, endDate) {
    return this.find({
        app_id: appId,
        created_at: { $gte: startDate, $lte: endDate }
    }).sort({ created_at: -1 });
};

// Static method to find tournament shares
shareLogSchema.statics.findTournamentShares = function(tournamentId) {
    return this.find({
        tournament_id: tournamentId,
        validation_status: 'verified'
    }).sort({ created_at: -1 });
};

// Instance method to mark as verified
shareLogSchema.methods.markAsVerified = function(verificationDetails = {}) {
    this.validation_status = 'verified';
    this.verified_at = new Date();
    this.validation_details = {
        ...this.validation_details,
        ...verificationDetails
    };
    return this.save();
};

// Instance method to mark as invalid
shareLogSchema.methods.markAsInvalid = function(reason, details = {}) {
    this.validation_status = 'invalid';
    this.validation_details = {
        ...this.validation_details,
        invalid_reason: reason,
        ...details
    };
    return this.save();
};

// Instance method to mark as fraudulent
shareLogSchema.methods.markAsFraudulent = function(fraudScore, fraudFlags = []) {
    this.validation_status = 'fraudulent';
    this.fraud_score = fraudScore;
    this.fraud_flags = fraudFlags;
    this.validation_details = {
        ...this.validation_details,
        fraud_detection_time: new Date(),
        fraud_score: fraudScore,
        fraud_flags: fraudFlags
    };
    return this.save();
};

// Instance method to calculate tournament score contribution
shareLogSchema.methods.calculateTournamentScore = function() {
    if (this.share_type !== 'tournament' || this.validation_status !== 'verified') {
        return 0;
    }
    
    // Basic scoring: 1 point per verified share
    let score = 1;
    
    // Bonus for high-value shares (more XP/Points)
    if (this.xp_awarded > 100 || this.points_awarded > 10) {
        score += 2;
    }
    
    // Bonus for early shares (first day of tournament)
    const tournamentStart = this.created_at;
    const shareTime = this.created_at;
    const hoursSinceStart = (shareTime - tournamentStart) / (1000 * 60 * 60);
    if (hoursSinceStart <= 24) {
        score += 1;
    }
    
    this.tournament_score_contribution = score;
    return score;
};

// Instance method to get share analytics
shareLogSchema.methods.getShareAnalytics = function() {
    return {
        share_id: this.unique_id,
        share_type: this.share_type,
        channel: this.share_channel,
        status: this.validation_status,
        rewards: this.total_rewards,
        fraud_risk: this.fraud_score,
        time_to_verification: this.verified_at ? 
            this.verified_at - this.created_at : null,
        tournament_contribution: this.tournament_score_contribution
    };
};

const ShareLog = mongoose.models.ShareLog || mongoose.model('ShareLog', shareLogSchema);

module.exports = ShareLog;
