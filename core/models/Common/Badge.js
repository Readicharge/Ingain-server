/**
 * Badge Model - INGAIN Platform
 * 
 * This model represents badges and achievements that users can earn through various activities.
 * Badges have configurable criteria, rewards, and can be repeatable or one-time achievements.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    badge_name: {
        type: String,
        required: [true, 'Badge name is required'],
        trim: true,
        maxlength: [255, 'Badge name cannot exceed 255 characters']
    },
    badge_classification: {
        type: String,
        enum: ['achievement', 'milestone', 'special_event', 'seasonal', 'referral', 'tournament'],
        default: 'achievement'
    },
    badge_description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Badge description cannot exceed 1000 characters']
    },
    badge_icon: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Badge icon must be a valid URL'
        }
    },
    criteria_type: {
        type: String,
        required: [true, 'Criteria type is required'],
        enum: [
            'xp_threshold', 'points_earned', 'shares_count', 'tournaments_won',
            'streak_days', 'referrals_count', 'level_reached', 'consecutive_days',
            'category_diversity', 'app_diversity', 'total_payouts', 'badge_count'
        ]
    },
    threshold_value: {
        type: Number,
        required: [true, 'Threshold value is required'],
        min: [1, 'Threshold value must be at least 1']
    },
    threshold_operator: {
        type: String,
        enum: ['>=', '==', '<=', '>', '<', '!='],
        default: '>='
    },
    secondary_criteria: {
        type: Object,
        default: null
    },
    rarity: {
        type: String,
        enum: ['common', 'rare', 'epic', 'legendary', 'mythic'],
        default: 'common'
    },
    xp_value_gifted: {
        type: Number,
        default: 0,
        min: 0
    },
    points_value_gifted: {
        type: Number,
        default: 0,
        min: 0
    },
    users_achieved_count: {
        type: Number,
        default: 0,
        min: 0
    },
    is_active: {
        type: Boolean,
        default: true
    },
    is_hidden: {
        type: Boolean,
        default: false
    },
    is_repeatable: {
        type: Boolean,
        default: false
    },
    cooldown_days: {
        type: Number,
        default: 0,
        min: 0
    },
    prerequisite_badges: {
        type: [String],
        default: [],
        ref: 'Badge'
    },
    exclusive_with: {
        type: [String],
        default: [],
        ref: 'Badge'
    },
    seasonal_start: {
        type: Date,
        default: null
    },
    seasonal_end: {
        type: Date,
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    created_by: {
        type: String,
        ref: 'AdminUser',
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total reward value
badgeSchema.virtual('total_reward_value').get(function() {
    const xpValue = this.xp_value_gifted * 0.01; // $0.01 per XP
    const pointsValue = this.points_value_gifted * 0.1; // $0.10 per Point
    return xpValue + pointsValue;
});

// Virtual for achievement rate
badgeSchema.virtual('achievement_rate').get(function() {
    // This would need to be calculated based on total platform users
    return this.users_achieved_count > 0 ? (this.users_achieved_count / 1000) * 100 : 0; // Assuming 1000 total users
});

// Virtual for is seasonal
badgeSchema.virtual('is_seasonal').get(function() {
    return this.seasonal_start !== null && this.seasonal_end !== null;
});

// Virtual for is currently available
badgeSchema.virtual('is_available').get(function() {
    if (!this.is_active) return false;
    
    if (this.is_seasonal) {
        const now = new Date();
        return now >= this.seasonal_start && now <= this.seasonal_end;
    }
    
    return true;
});

// Indexes for better performance
badgeSchema.index({ is_active: 1 });
badgeSchema.index({ rarity: 1 });
badgeSchema.index({ criteria_type: 1 });
badgeSchema.index({ badge_classification: 1 });
badgeSchema.index({ is_hidden: 1 });
badgeSchema.index({ created_at: -1 });

// Compound indexes
badgeSchema.index({ is_active: 1, rarity: 1 });
badgeSchema.index({ is_active: 1, criteria_type: 1 });

// Pre-save middleware to update timestamps
badgeSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

// Static method to find active badges
badgeSchema.statics.findActive = function() {
    return this.find({ is_active: true }).sort({ rarity: 1, threshold_value: 1 });
};

// Static method to find badges by criteria type
badgeSchema.statics.findByCriteriaType = function(criteriaType) {
    return this.find({
        is_active: true,
        criteria_type: criteriaType
    }).sort({ threshold_value: 1 });
};

// Static method to find seasonal badges
badgeSchema.statics.findSeasonal = function() {
    const now = new Date();
    return this.find({
        is_active: true,
        seasonal_start: { $lte: now },
        seasonal_end: { $gte: now }
    }).sort({ seasonal_end: 1 });
};

// Static method to find hidden badges
badgeSchema.statics.findHidden = function() {
    return this.find({
        is_active: true,
        is_hidden: true
    }).sort({ rarity: 1 });
};

// Static method to find badges by rarity
badgeSchema.statics.findByRarity = function(rarity) {
    return this.find({
        is_active: true,
        rarity: rarity
    }).sort({ threshold_value: 1 });
};

// Instance method to check if user meets criteria
badgeSchema.methods.checkUserEligibility = function(userStats) {
    const currentValue = this.getCurrentValue(userStats);
    return this.evaluateThreshold(currentValue);
};

// Instance method to get current value based on criteria type
badgeSchema.methods.getCurrentValue = function(userStats) {
    switch (this.criteria_type) {
        case 'xp_threshold':
            return userStats.current_xp || 0;
        case 'points_earned':
            return userStats.total_points_earned || 0;
        case 'shares_count':
            return userStats.total_apps_shared || 0;
        case 'tournaments_won':
            return userStats.total_tournaments_won || 0;
        case 'streak_days':
            return userStats.sharing_streak_days || 0;
        case 'referrals_count':
            return userStats.successful_referrals_count || 0;
        case 'level_reached':
            return userStats.user_level || 1;
        case 'consecutive_days':
            return userStats.sharing_streak_days || 0;
        case 'category_diversity':
            return userStats.unique_categories_shared || 0;
        case 'app_diversity':
            return userStats.unique_apps_shared || 0;
        case 'total_payouts':
            return userStats.total_payouts_received || 0;
        case 'badge_count':
            return userStats.total_badges_earned || 0;
        default:
            return 0;
    }
};

// Instance method to evaluate threshold
badgeSchema.methods.evaluateThreshold = function(currentValue) {
    switch (this.threshold_operator) {
        case '>=':
            return currentValue >= this.threshold_value;
        case '==':
            return currentValue === this.threshold_value;
        case '<=':
            return currentValue <= this.threshold_value;
        case '>':
            return currentValue > this.threshold_value;
        case '<':
            return currentValue < this.threshold_value;
        case '!=':
            return currentValue !== this.threshold_value;
        default:
            return currentValue >= this.threshold_value;
    }
};

// Instance method to check secondary criteria
badgeSchema.methods.checkSecondaryCriteria = function(userStats) {
    if (!this.secondary_criteria) return true;
    
    for (const [key, criteria] of Object.entries(this.secondary_criteria)) {
        const currentValue = this.getCurrentValue(userStats);
        if (!this.evaluateThreshold(currentValue)) {
            return false;
        }
    }
    
    return true;
};

// Instance method to increment achievement count
badgeSchema.methods.incrementAchievementCount = function() {
    this.users_achieved_count += 1;
    return this.save();
};

// Instance method to get badge statistics
badgeSchema.methods.getBadgeStats = function() {
    return {
        badge_id: this.unique_id,
        name: this.badge_name,
        rarity: this.rarity,
        classification: this.badge_classification,
        criteria: {
            type: this.criteria_type,
            threshold: this.threshold_value,
            operator: this.threshold_operator
        },
        rewards: {
            xp: this.xp_value_gifted,
            points: this.points_value_gifted,
            total_value: this.total_reward_value
        },
        stats: {
            users_achieved: this.users_achieved_count,
            achievement_rate: this.achievement_rate
        },
        availability: {
            is_active: this.is_active,
            is_hidden: this.is_hidden,
            is_seasonal: this.is_seasonal,
            is_available: this.is_available,
            is_repeatable: this.is_repeatable,
            cooldown_days: this.cooldown_days
        }
    };
};

// Instance method to check if badge is currently available
badgeSchema.methods.isCurrentlyAvailable = function() {
    if (!this.is_active) return false;
    
    if (this.is_seasonal) {
        const now = new Date();
        return now >= this.seasonal_start && now <= this.seasonal_end;
    }
    
    return true;
};

const Badge = mongoose.models.Badge || mongoose.model('Badge', badgeSchema);

module.exports = Badge;