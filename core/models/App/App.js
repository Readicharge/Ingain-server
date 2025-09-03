/**
 * App Model - INGAIN Platform
 * 
 * This model represents apps in the INGAIN catalog that users can share to earn rewards.
 * Each app has configurable XP and Points rewards, categories, and sharing rules.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const appSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    app_name: {
        type: String,
        required: [true, 'App name is required'],
        trim: true,
        maxlength: [255, 'App name cannot exceed 255 characters']
    },
    app_description: {
        type: String,
        trim: true,
        maxlength: [2000, 'App description cannot exceed 2000 characters']
    },
    app_logo: {
        type: String,
        validate: {
            validator: function (v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'App logo must be a valid URL'
        }
    },
    app_xp: {
        type: Number,
        required: [true, 'App XP reward is required'],
        min: [0, 'App XP cannot be negative'],
        default: 0
    },
    app_points: {
        type: Number,
        required: [true, 'App Points reward is required'],
        min: [0, 'App Points cannot be negative'],
        default: 0
    },
    categories: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    total_shared: {
        type: Number,
        default: 0,
        min: 0
    },
    total_xp_allocated: {
        type: Number,
        default: 0,
        min: 0
    },
    total_points_allocated: {
        type: Number,
        default: 0,
        min: 0
    },
    total_xp_spent: {
        type: Number,
        default: 0,
        min: 0
    },
    total_points_spent: {
        type: Number,
        default: 0,
        min: 0
    },
    is_active: {
        type: Boolean,
        default: true
    },
    is_featured: {
        type: Boolean,
        default: false
    },
    geo_availability: {
        type: [String],
        required: [true, 'Geo availability is required'],
        default: ['GLOBAL'],
        validate: {
            validator: function (v) {
                return v.length > 0;
            },
            message: 'At least one region must be specified'
        }
    },
    host_id: {
        type: String,
        required: [true, 'Host ID is required'],
        ref: 'PlatformUser'
    },
    share_rules: {
        type: Object,
        default: {
            daily_user_limit: 10,
            daily_global_limit: 1000,
            cooldown_minutes: 30,
            min_user_level: 1,
            require_verification: true,
            attribution_window_hours: 24
        }
    },
    tracking_config: {
        type: Object,
        default: {
            tracking_domain: null,
            attribution_parameters: ['utm_source', 'utm_medium', 'utm_campaign'],
            conversion_events: ['install', 'register', 'purchase'],
            fraud_detection: true
        }
    },
    monetization_config: {
        type: Object,
        default: {
            budget_daily: 1000,
            budget_total: 10000,
            cost_per_share: 0,
            cost_per_xp: 0.01,
            cost_per_point: 0.1
        }
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
        ref: 'AdminUser'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for remaining budget
appSchema.virtual('remaining_budget').get(function () {
    const config = this.monetization_config || {};
    const totalBudget = config.budget_total || 0;
    const totalSpent = this.total_points_spent || 0;
    return Math.max(0, totalBudget - totalSpent);
});

// Virtual for daily remaining budget
appSchema.virtual('daily_remaining_budget').get(function () {
    const config = this.monetization_config || {};
    const dailyBudget = config.budget_daily || 0;
    const today = new Date().toDateString();
    // This would need to be calculated from actual daily spending
    return dailyBudget;
});

// Virtual for cost per share
appSchema.virtual('cost_per_share').get(function () {
    const xpCost = (this.app_xp || 0) * 0.01; // $0.01 per XP
    const pointsCost = (this.app_points || 0) * 0.1; // $0.10 per Point
    return xpCost + pointsCost;
});

// Indexes for better performance
appSchema.index({ host_id: 1 });
appSchema.index({ is_active: 1 });
appSchema.index({ categories: 1 });
appSchema.index({ geo_availability: 1 });
appSchema.index({ is_featured: 1 });
appSchema.index({ created_at: -1 });

// Pre-save middleware to update timestamps
appSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// Static method to find active apps by region
appSchema.statics.findActiveByRegion = function (region) {
    return this.find({
        is_active: true,
        $or: [
            { geo_availability: 'GLOBAL' },
            { geo_availability: region }
        ]
    }).sort({ is_featured: -1, total_shared: -1 });
};

// Static method to find apps by category
appSchema.statics.findByCategory = function (category) {
    return this.find({
        is_active: true,
        categories: { $in: [category.toLowerCase()] }
    }).sort({ is_featured: -1, total_shared: -1 });
};

// Instance method to increment share statistics
appSchema.methods.incrementShareStats = function (xpAwarded, pointsAwarded) {
    this.total_shared += 1;
    this.total_xp_allocated += xpAwarded || 0;
    this.total_points_allocated += pointsAwarded || 0;
    this.total_xp_spent += xpAwarded || 0;
    this.total_points_spent += pointsAwarded || 0;
    return this.save();
};

// Instance method to check if app has sufficient budget
appSchema.methods.hasSufficientBudget = function () {
    const costPerShare = this.cost_per_share;
    const remainingBudget = this.remaining_budget;
    return remainingBudget >= costPerShare;
};

// Instance method to get app performance metrics
appSchema.methods.getPerformanceMetrics = function () {
    return {
        total_shares: this.total_shared,
        total_xp_distributed: this.total_xp_allocated,
        total_points_distributed: this.total_points_allocated,
        total_cost: this.total_points_spent,
        average_reward_per_share: this.total_shared > 0 ?
            (this.total_xp_allocated + this.total_points_allocated) / this.total_shared : 0,
        budget_utilization: this.monetization_config?.budget_total > 0 ?
            (this.total_points_spent / this.monetization_config.budget_total) * 100 : 0
    };
};

const App = mongoose.models.App || mongoose.model('App', appSchema);

module.exports = App;
