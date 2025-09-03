/**
 * Notification Model - INGAIN Platform
 * 
 * This model handles all user notifications including:
 * - Badge achievements
 * - Tournament updates
 * - Payment confirmations
 * - System announcements
 * - Referral bonuses
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
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
    notification_type: {
        type: String,
        required: [true, 'Notification type is required'],
        enum: [
            'badge_earned',
            'tournament_start',
            'tournament_end',
            'tournament_winner',
            'payment_approved',
            'payment_rejected',
            'referral_bonus',
            'level_up',
            'streak_bonus',
            'system_announcement',
            'app_featured',
            'tournament_reminder',
            'payout_processed',
            'fraud_alert',
            'kyc_approved',
            'kyc_rejected'
        ]
    },
    title: {
        type: String,
        required: [true, 'Notification title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    data: {
        type: Object,
        default: {}
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    is_read: {
        type: Boolean,
        default: false
    },
    is_archived: {
        type: Boolean,
        default: false
    },
    read_at: {
        type: Date,
        default: null
    },
    scheduled_for: {
        type: Date,
        default: null
    },
    expires_at: {
        type: Date,
        default: null
    },
    delivery_channels: [{
        type: String,
        enum: ['in_app', 'email', 'sms', 'push'],
        default: ['in_app']
    }],
    delivery_status: {
        in_app: { type: Boolean, default: false },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: false }
    },
    delivery_attempts: {
        in_app: { type: Number, default: 0 },
        email: { type: Number, default: 0 },
        sms: { type: Number, default: 0 },
        push: { type: Number, default: 0 }
    },
    last_delivery_attempt: {
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
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for notification age
notificationSchema.virtual('age_hours').get(function() {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60));
});

// Virtual for notification age in days
notificationSchema.virtual('age_days').get(function() {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
notificationSchema.virtual('is_expired').get(function() {
    return this.expires_at && new Date() > this.expires_at;
});

// Virtual for is scheduled
notificationSchema.virtual('is_scheduled').get(function() {
    return this.scheduled_for && new Date() < this.scheduled_for;
});

// Virtual for can be delivered
notificationSchema.virtual('can_be_delivered').get(function() {
    if (this.is_expired) return false;
    if (this.is_scheduled) return false;
    return true;
});

// Indexes for better performance
notificationSchema.index({ user_id: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ user_id: 1, notification_type: 1 });
notificationSchema.index({ notification_type: 1, created_at: -1 });
notificationSchema.index({ scheduled_for: 1 });
notificationSchema.index({ expires_at: 1 });
notificationSchema.index({ priority: 1, created_at: -1 });

// Pre-save middleware
notificationSchema.pre('save', function(next) {
    this.updated_at = new Date();
    
    // Set default delivery channels based on notification type
    if (this.delivery_channels.length === 0) {
        switch (this.notification_type) {
            case 'badge_earned':
            case 'level_up':
            case 'streak_bonus':
                this.delivery_channels = ['in_app', 'push'];
                break;
            case 'tournament_start':
            case 'tournament_end':
            case 'tournament_winner':
                this.delivery_channels = ['in_app', 'email', 'push'];
                break;
            case 'payment_approved':
            case 'payment_rejected':
            case 'payout_processed':
                this.delivery_channels = ['in_app', 'email'];
                break;
            case 'system_announcement':
                this.delivery_channels = ['in_app', 'email', 'push'];
                break;
            default:
                this.delivery_channels = ['in_app'];
        }
    }
    
    next();
});

// Static method to find unread notifications for a user
notificationSchema.statics.findUnread = function(userId, limit = 50) {
    return this.find({
        user_id: userId,
        is_read: false,
        is_archived: false
    })
    .sort({ priority: -1, created_at: -1 })
    .limit(limit);
};

// Static method to find notifications by type
notificationSchema.statics.findByType = function(userId, type, limit = 20) {
    return this.find({
        user_id: userId,
        notification_type: type,
        is_archived: false
    })
    .sort({ created_at: -1 })
    .limit(limit);
};

// Static method to find scheduled notifications ready for delivery
notificationSchema.statics.findScheduledForDelivery = function() {
    const now = new Date();
    return this.find({
        scheduled_for: { $lte: now },
        is_archived: false,
        'delivery_status.in_app': false
    }).sort({ priority: -1, scheduled_for: 1 });
};

// Static method to find expired notifications
notificationSchema.statics.findExpired = function() {
    const now = new Date();
    return this.find({
        expires_at: { $lt: now },
        is_archived: false
    });
};

// Static method to create system announcement
notificationSchema.statics.createSystemAnnouncement = function(title, message, priority = 'normal', scheduledFor = null) {
    return this.create({
        notification_type: 'system_announcement',
        title: title,
        message: message,
        priority: priority,
        scheduled_for: scheduledFor,
        data: { is_system: true }
    });
};

// Static method to create badge notification
notificationSchema.statics.createBadgeNotification = function(userId, badgeName, badgeDescription, xpReward, pointsReward) {
    return this.create({
        user_id: userId,
        notification_type: 'badge_earned',
        title: `🎉 New Badge Earned: ${badgeName}`,
        message: `Congratulations! You've earned the ${badgeName} badge. ${badgeDescription}`,
        priority: 'high',
        data: {
            badge_name: badgeName,
            badge_description: badgeDescription,
            xp_reward: xpReward,
            points_reward: pointsReward
        }
    });
};

// Static method to create tournament notification
notificationSchema.statics.createTournamentNotification = function(userId, tournamentName, notificationType, additionalData = {}) {
    const notifications = {
        tournament_start: {
            title: `🏆 Tournament Started: ${tournamentName}`,
            message: `The ${tournamentName} tournament has begun! Start sharing apps to climb the leaderboard.`,
            priority: 'high'
        },
        tournament_end: {
            title: `🏁 Tournament Ended: ${tournamentName}`,
            message: `The ${tournamentName} tournament has ended. Check the final results!`,
            priority: 'normal'
        },
        tournament_winner: {
            title: `🎊 Tournament Winner: ${tournamentName}`,
            message: `Congratulations! You've won the ${tournamentName} tournament!`,
            priority: 'urgent'
        },
        tournament_reminder: {
            title: `⏰ Tournament Reminder: ${tournamentName}`,
            message: `Don't forget! The ${tournamentName} tournament ends soon.`,
            priority: 'normal'
        }
    };
    
    const config = notifications[notificationType];
    if (!config) {
        throw new Error(`Invalid tournament notification type: ${notificationType}`);
    }
    
    return this.create({
        user_id: userId,
        notification_type: notificationType,
        title: config.title,
        message: config.message,
        priority: config.priority,
        data: {
            tournament_name: tournamentName,
            ...additionalData
        }
    });
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
    this.is_read = true;
    this.read_at = new Date();
    return this.save();
};

// Instance method to mark as unread
notificationSchema.methods.markAsUnread = function() {
    this.is_read = false;
    this.read_at = null;
    return this.save();
};

// Instance method to archive
notificationSchema.methods.archive = function() {
    this.is_archived = true;
    return this.save();
};

// Instance method to unarchive
notificationSchema.methods.unarchive = function() {
    this.is_archived = false;
    return this.save();
};

// Instance method to update delivery status
notificationSchema.methods.updateDeliveryStatus = function(channel, status, incrementAttempts = false) {
    this.delivery_status[channel] = status;
    
    if (incrementAttempts) {
        this.delivery_attempts[channel] = (this.delivery_attempts[channel] || 0) + 1;
    }
    
    this.last_delivery_attempt = new Date();
    return this.save();
};

// Instance method to get notification summary
notificationSchema.methods.getSummary = function() {
    return {
        id: this.unique_id,
        type: this.notification_type,
        title: this.title,
        message: this.message,
        priority: this.priority,
        is_read: this.is_read,
        is_archived: this.is_archived,
        age_hours: this.age_hours,
        age_days: this.age_days,
        created_at: this.created_at,
        data: this.data
    };
};

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = Notification;
