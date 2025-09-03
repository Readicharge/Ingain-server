/**
 * UserBadge Model - INGAIN Platform
 * 
 * This model represents the junction table for user badge achievements.
 * It tracks when users earn badges, their achievement context, and rewards received.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const userBadgeSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        ref: 'PlatformUser'
    },
    badge_id: {
        type: String,
        required: true,
        ref: 'Badge'
    },
    earned_at: {
        type: Date,
        default: Date.now
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
    achievement_context: {
        type: Object,
        default: {}
    },
    achievement_value: {
        type: Number,
        default: null
    },
    streak_count: {
        type: Number,
        default: 1,
        min: 1
    },
    next_achievable_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: false,
    _id: false
});

// Compound primary key
userBadgeSchema.index({ user_id: 1, badge_id: 1 }, { unique: true });
userBadgeSchema.index({ user_id: 1, earned_at: -1 });
userBadgeSchema.index({ badge_id: 1, earned_at: -1 });

const UserBadge = mongoose.models.UserBadge || mongoose.model('UserBadge', userBadgeSchema);

module.exports = UserBadge;
