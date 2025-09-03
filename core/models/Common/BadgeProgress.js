/**
 * BadgeProgress Model - INGAIN Platform
 * 
 * This model tracks user progress toward badge achievements.
 * It stores current progress values and milestone notifications for unearned badges.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const badgeProgressSchema = new mongoose.Schema({
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
    current_value: {
        type: Number,
        default: 0,
        min: 0
    },
    percentage_complete: {
        type: Number,
        default: 0.00,
        min: 0,
        max: 100
    },
    last_updated: {
        type: Date,
        default: Date.now
    },
    milestone_notifications_sent: {
        type: [String],
        default: []
    }
}, {
    timestamps: false,
    _id: false
});

// Compound primary key
badgeProgressSchema.index({ user_id: 1, badge_id: 1 }, { unique: true });
badgeProgressSchema.index({ user_id: 1, percentage_complete: -1 });
badgeProgressSchema.index({ badge_id: 1, percentage_complete: -1 });

const BadgeProgress = mongoose.models.BadgeProgress || mongoose.model('BadgeProgress', badgeProgressSchema);

module.exports = BadgeProgress;
