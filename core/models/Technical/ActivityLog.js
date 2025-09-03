/**
 * Activity Log Model - INGAIN Platform
 * 
 * This model provides comprehensive audit trail for all platform activities:
 * - User actions and system events
 * - Security events and authentication
 * - Financial transactions and modifications
 * - Administrative actions and changes
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
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
    admin_id: {
        type: String,
        ref: 'AdminUser',
        default: null
    },
    activity_type: {
        type: String,
        required: [true, 'Activity type is required'],
        enum: [
            // User activities
            'user_login',
            'user_logout',
            'user_register',
            'user_profile_update',
            'user_password_change',
            'user_email_verification',
            'user_kyc_submission',
            'user_kyc_approval',
            'user_kyc_rejection',
            'user_authentication',

            // App activities
            'app_share',
            'app_verification',
            'app_fraud_detection',
            'app_reward_calculation',
            'app_creation',
            'app_update',
            'app_deactivation',

            // Tournament activities
            'tournament_registration',
            'tournament_participation',
            'tournament_score_update',
            'tournament_winner_declaration',
            'tournament_creation',
            'tournament_update',
            'tournament_cancellation',

            // Badge activities
            'badge_earned',
            'badge_progress_update',
            'badge_creation',
            'badge_update',

            // Payment activities
            'payout_request',
            'payout_approval',
            'payout_rejection',
            'payout_processing',
            'payout_completion',
            'payment_fraud_detection',

            // Referral activities
            'referral_signup',
            'referral_bonus_awarded',
            'referral_fraud_detection',

            // System activities
            'system_maintenance',
            'system_configuration_change',
            'security_alert',
            'fraud_alert',
            'rate_limit_exceeded',
            'api_error',
            'database_backup',
            'cron_job_execution'
        ]
    },
    action: {
        type: String,
        required: [true, 'Action description is required'],
        trim: true,
        maxlength: [500, 'Action description cannot exceed 500 characters']
    },
    entity_type: {
        type: String,
        enum: [
            'user',
            'app',
            'tournament',
            'badge',
            'payment',
            'referral',
            'system',
            'notification',
            'category',
            'fraud_report'
        ],
        default: 'system'
    },
    entity_id: {
        type: String,
        default: null
    },
    details: {
        type: Object,
        default: {}
    },
    ip_address: {
        type: String,
        validate: {
            validator: function (v) {
                return !v || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/.test(v);
            },
            message: 'IP address must be a valid IPv4 or IPv6 address'
        }
    },
    user_agent: {
        type: String,
        trim: true,
        maxlength: [500, 'User agent cannot exceed 500 characters']
    },
    device_info: {
        type: Object,
        default: {}
    },
    location: {
        country: String,
        region: String,
        city: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    severity: {
        type: String,
        enum: ['info', 'low', 'medium', 'high', 'critical'],
        default: 'info'
    },
    status: {
        type: String,
        enum: ['success', 'failure', 'pending', 'error'],
        default: 'success'
    },
    error_message: {
        type: String,
        trim: true,
        maxlength: [1000, 'Error message cannot exceed 1000 characters']
    },
    execution_time_ms: {
        type: Number,
        min: 0
    },
    metadata: {
        type: Object,
        default: {}
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for activity age
activityLogSchema.virtual('age_minutes').get(function () {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60));
});

// Virtual for activity age in hours
activityLogSchema.virtual('age_hours').get(function () {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60));
});

// Virtual for activity age in days
activityLogSchema.virtual('age_days').get(function () {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60 * 24));
});

// Virtual for is recent (within last hour)
activityLogSchema.virtual('is_recent').get(function () {
    return this.age_minutes < 60;
});

// Indexes for better performance
activityLogSchema.index({ user_id: 1, created_at: -1 });
activityLogSchema.index({ activity_type: 1, created_at: -1 });
activityLogSchema.index({ entity_type: 1, entity_id: 1 });
activityLogSchema.index({ severity: 1, created_at: -1 });
activityLogSchema.index({ status: 1, created_at: -1 });
activityLogSchema.index({ ip_address: 1, created_at: -1 });
activityLogSchema.index({ created_at: -1 });
activityLogSchema.index({ tags: 1 });
activityLogSchema.index({ admin_id: 1, created_at: -1 });

// Pre-save middleware
activityLogSchema.pre('save', function (next) {
    // Auto-generate tags based on activity type and severity
    if (this.tags.length === 0) {
        this.tags.push(this.activity_type);
        this.tags.push(this.severity);
        if (this.entity_type) {
            this.tags.push(this.entity_type);
        }
        if (this.status) {
            this.tags.push(this.status);
        }
    }

    next();
});

// Static method to log user activity
activityLogSchema.statics.logUserActivity = function (userId, activityType, action, details = {}, options = {}) {
    return this.create({
        user_id: userId,
        activity_type: activityType,
        action: action,
        details: details,
        entity_type: options.entityType || undefined,
        entity_id: options.entityId || null,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null,
        device_info: options.deviceInfo || {},
        location: options.location || {},
        severity: options.severity || 'info',
        status: options.status || 'success',
        execution_time_ms: options.executionTime || null,
        metadata: options.metadata || {}
    });
};

// Static method to log admin activity
activityLogSchema.statics.logAdminActivity = function (adminId, activityType, action, details = {}, options = {}) {
    return this.create({
        admin_id: adminId,
        activity_type: activityType,
        action: action,
        details: details,
        entity_type: options.entityType || undefined,
        entity_id: options.entityId || null,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null,
        severity: options.severity || 'medium',
        status: options.status || 'success',
        execution_time_ms: options.executionTime || null,
        metadata: options.metadata || {}
    });
};

// Static method to log system activity
activityLogSchema.statics.logSystemActivity = function (activityType, action, details = {}, options = {}) {
    return this.create({
        activity_type: activityType,
        action: action,
        details: details,
        entity_type: options.entityType || 'system',
        entity_id: options.entityId || null,
        severity: options.severity || 'info',
        status: options.status || 'success',
        execution_time_ms: options.executionTime || null,
        metadata: options.metadata || {}
    });
};

// Static method to log security event
activityLogSchema.statics.logSecurityEvent = function (userId, activityType, action, details = {}, options = {}) {
    return this.create({
        user_id: userId,
        activity_type: activityType,
        action: action,
        details: details,
        entity_type: options.entityType || 'user',
        entity_id: options.entityId || userId,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null,
        location: options.location || {},
        severity: options.severity || 'high',
        status: options.status || 'failure',
        error_message: options.errorMessage || null,
        metadata: options.metadata || {}
    });
};

// Static method to log fraud event
activityLogSchema.statics.logFraudEvent = function (userId, activityType, action, details = {}, options = {}) {
    return this.create({
        user_id: userId,
        activity_type: activityType,
        action: action,
        details: details,
        entity_type: options.entityType || 'fraud_report',
        entity_id: options.entityId || null,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null,
        location: options.location || {},
        severity: options.severity || 'critical',
        status: options.status || 'failure',
        error_message: options.errorMessage || null,
        metadata: options.metadata || {}
    });
};

// Static method to find activities by user
activityLogSchema.statics.findByUser = function (userId, limit = 100, skip = 0) {
    return this.find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to find activities by type
activityLogSchema.statics.findByType = function (activityType, limit = 100, skip = 0) {
    return this.find({ activity_type: activityType })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to find activities by entity
activityLogSchema.statics.findByEntity = function (entityType, entityId, limit = 100, skip = 0) {
    return this.find({
        entity_type: entityType,
        entity_id: entityId
    })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to find high severity activities
activityLogSchema.statics.findHighSeverity = function (limit = 100, skip = 0) {
    return this.find({
        severity: { $in: ['high', 'critical'] }
    })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to find failed activities
activityLogSchema.statics.findFailed = function (limit = 100, skip = 0) {
    return this.find({
        status: { $in: ['failure', 'error'] }
    })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to get activity statistics
activityLogSchema.statics.getStatistics = async function (timeRange = '24h') {
    const now = new Date();
    let startDate;

    switch (timeRange) {
        case '1h':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
        case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const pipeline = [
        {
            $match: {
                created_at: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    activity_type: '$activity_type',
                    status: '$status',
                    severity: '$severity'
                },
                count: { $sum: 1 },
                avg_execution_time: { $avg: '$execution_time_ms' }
            }
        }
    ];

    return this.aggregate(pipeline);
};

// Instance method to get activity summary
activityLogSchema.methods.getSummary = function () {
    return {
        id: this.unique_id,
        type: this.activity_type,
        action: this.action,
        entity: this.entity_type ? `${this.entity_type}:${this.entity_id}` : null,
        severity: this.severity,
        status: this.status,
        user: this.user_id || this.admin_id || 'system',
        ip: this.ip_address,
        location: this.location,
        age_minutes: this.age_minutes,
        age_hours: this.age_hours,
        created_at: this.created_at,
        execution_time: this.execution_time_ms,
        tags: this.tags
    };
};

// Instance method to add metadata
activityLogSchema.methods.addMetadata = function (key, value) {
    this.metadata[key] = value;
    return this.save();
};

// Instance method to add tags
activityLogSchema.methods.addTags = function (newTags) {
    const tagsToAdd = Array.isArray(newTags) ? newTags : [newTags];
    this.tags = [...new Set([...this.tags, ...tagsToAdd])];
    return this.save();
};

const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;