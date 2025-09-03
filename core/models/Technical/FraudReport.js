/**
 * Fraud Report Model - INGAIN Platform
 * 
 * This model tracks fraud reports and investigations including:
 * - Fraud detection and scoring
 * - Investigation workflow and status
 * - Evidence collection and analysis
 * - Resolution and actions taken
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const fraudReportSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    report_type: {
        type: String,
        required: [true, 'Report type is required'],
        enum: [
            'share_fraud',
            'payment_fraud',
            'user_fraud',
            'referral_fraud',
            'tournament_fraud',
            'system_fraud',
            'multi_account_fraud',
            'bot_activity',
            'click_farming',
            'identity_theft',
            'money_laundering',
            'other'
        ]
    },
    entity_type: {
        type: String,
        required: [true, 'Entity type is required'],
        enum: [
            'user',
            'app',
            'tournament',
            'payment',
            'referral',
            'share_log',
            'device',
            'ip_address',
            'system'
        ]
    },
    entity_id: {
        type: String,
        required: [true, 'Entity ID is required']
    },
    reporter_id: {
        type: String,
        ref: 'PlatformUser',
        default: null
    },
    reported_user_id: {
        type: String,
        ref: 'PlatformUser',
        default: null
    },
    fraud_score: {
        type: Number,
        required: [true, 'Fraud score is required'],
        min: 0,
        max: 100
    },
    risk_level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: [true, 'Risk level is required']
    },
    fraud_flags: [{
        type: String,
        trim: true,
        enum: [
            'multiple_accounts',
            'suspicious_ip',
            'bot_behavior',
            'unusual_patterns',
            'geographic_inconsistency',
            'device_fingerprint_mismatch',
            'rapid_activity',
            'low_quality_shares',
            'fake_conversions',
            'payment_anomalies',
            'referral_abuse',
            'tournament_manipulation',
            'identity_mismatch',
            'suspicious_timing',
            'coordination_activity',
            'other'
        ]
    }],
    description: {
        type: String,
        required: [true, 'Fraud description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    evidence: [{
        type: {
            type: String,
            enum: ['screenshot', 'log_data', 'transaction_record', 'user_activity', 'device_info', 'ip_data', 'other']
        },
        title: {
            type: String,
            trim: true,
            maxlength: [200, 'Evidence title cannot exceed 200 characters']
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Evidence description cannot exceed 1000 characters']
        },
        data: {
            type: Object,
            default: {}
        },
        url: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^https?:\/\/.+/.test(v);
                },
                message: 'Evidence URL must be a valid URL'
            }
        },
        uploaded_at: {
            type: Date,
            default: Date.now
        },
        uploaded_by: {
            type: String,
            ref: 'PlatformUser'
        }
    }],
    investigation: {
        status: {
            type: String,
            enum: ['open', 'investigating', 'pending_review', 'resolved', 'closed', 'false_positive'],
            default: 'open'
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal'
        },
        assigned_to: {
            type: String,
            ref: 'AdminUser',
            default: null
        },
        assigned_at: {
            type: Date,
            default: null
        },
        investigation_notes: [{
            note: {
                type: String,
                trim: true,
                maxlength: [1000, 'Investigation note cannot exceed 1000 characters']
            },
            added_by: {
                type: String,
                ref: 'AdminUser'
            },
            added_at: {
                type: Date,
                default: Date.now
            },
            is_internal: {
                type: Boolean,
                default: false
            }
        }],
        started_at: {
            type: Date,
            default: null
        },
        completed_at: {
            type: Date,
            default: null
        },
        estimated_completion: {
            type: Date,
            default: null
        }
    },
    analysis: {
        fraud_pattern: {
            type: String,
            trim: true,
            maxlength: [500, 'Fraud pattern cannot exceed 500 characters']
        },
        affected_users: [{
            type: String,
            ref: 'PlatformUser'
        }],
        affected_transactions: [{
            type: String,
            ref: 'Payment'
        }],
        affected_shares: [{
            type: String,
            ref: 'ShareLog'
        }],
        financial_impact: {
            estimated_loss: {
                type: Number,
                default: 0,
                min: 0
            },
            currency: {
                type: String,
                default: 'USD'
            },
            actual_loss: {
                type: Number,
                default: 0,
                min: 0
            }
        },
        technical_indicators: [{
            indicator: {
                type: String,
                trim: true
            },
            value: mongoose.Schema.Types.Mixed,
            confidence: {
                type: Number,
                min: 0,
                max: 100
            }
        }],
        behavioral_analysis: {
            type: Object,
            default: {}
        }
    },
    resolution: {
        action_taken: {
            type: String,
            enum: [
                'none',
                'warning_sent',
                'account_suspended',
                'account_banned',
                'payment_blocked',
                'tournament_disqualification',
                'referral_removal',
                'legal_action',
                'system_improvement',
                'other'
            ],
            default: 'none'
        },
        action_details: {
            type: String,
            trim: true,
            maxlength: [1000, 'Action details cannot exceed 1000 characters']
        },
        action_taken_at: {
            type: Date,
            default: null
        },
        action_taken_by: {
            type: String,
            ref: 'AdminUser',
            default: null
        },
        resolution_notes: {
            type: String,
            trim: true,
            maxlength: [2000, 'Resolution notes cannot exceed 2000 characters']
        },
        follow_up_required: {
            type: Boolean,
            default: false
        },
        follow_up_date: {
            type: Date,
            default: null
        },
        follow_up_notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Follow-up notes cannot exceed 1000 characters']
        }
    },
    prevention: {
        recommendations: [{
            recommendation: {
                type: String,
                trim: true,
                maxlength: [500, 'Recommendation cannot exceed 500 characters']
            },
            priority: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical'],
                default: 'medium'
            },
            implementation_status: {
                type: String,
                enum: ['pending', 'in_progress', 'implemented', 'rejected'],
                default: 'pending'
            },
            implemented_at: {
                type: Date,
                default: null
            },
            implemented_by: {
                type: String,
                ref: 'AdminUser',
                default: null
            }
        }],
        system_changes: [{
            change_description: {
                type: String,
                trim: true,
                maxlength: [500, 'Change description cannot exceed 500 characters']
            },
            change_type: {
                type: String,
                enum: ['algorithm_update', 'rule_change', 'threshold_adjustment', 'new_detection', 'other']
            },
            implemented: {
                type: Boolean,
                default: false
            },
            implemented_at: {
                type: Date,
                default: null
            }
        }]
    },
    metadata: {
        source: {
            type: String,
            enum: ['automated', 'manual', 'user_report', 'admin_review', 'system_monitoring'],
            default: 'automated'
        },
        ip_address: String,
        user_agent: String,
        device_info: Object,
        location: {
            country: String,
            region: String,
            city: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        tags: [String],
        custom_fields: Object
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

// Virtual for report age in hours
fraudReportSchema.virtual('age_hours').get(function() {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60));
});

// Virtual for report age in days
fraudReportSchema.virtual('age_days').get(function() {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60 * 24));
});

// Virtual for investigation duration
fraudReportSchema.virtual('investigation_duration_hours').get(function() {
    if (!this.investigation.started_at || !this.investigation.completed_at) {
        return null;
    }
    return Math.floor((this.investigation.completed_at - this.investigation.started_at) / (1000 * 60 * 60));
});

// Virtual for is overdue
fraudReportSchema.virtual('is_overdue').get(function() {
    if (!this.investigation.estimated_completion) return false;
    return new Date() > this.investigation.estimated_completion;
});

// Virtual for requires immediate attention
fraudReportSchema.virtual('requires_immediate_attention').get(function() {
    return this.risk_level === 'critical' || 
           this.fraud_score >= 90 || 
           this.investigation.priority === 'urgent';
});

// Indexes for better performance
fraudReportSchema.index({ report_type: 1, created_at: -1 });
fraudReportSchema.index({ entity_type: 1, entity_id: 1 });
fraudReportSchema.index({ fraud_score: -1, created_at: -1 });
fraudReportSchema.index({ risk_level: 1, created_at: -1 });
fraudReportSchema.index({ 'investigation.status': 1, 'investigation.priority': 1 });
fraudReportSchema.index({ 'investigation.assigned_to': 1 });
fraudReportSchema.index({ reported_user_id: 1 });
fraudReportSchema.index({ created_at: -1 });
fraudReportSchema.index({ 'resolution.action_taken': 1 });

// Pre-save middleware
fraudReportSchema.pre('save', function(next) {
    this.updated_at = new Date();
    
    // Auto-assign priority based on risk level and fraud score
    if (this.risk_level === 'critical' || this.fraud_score >= 90) {
        this.investigation.priority = 'urgent';
    } else if (this.risk_level === 'high' || this.fraud_score >= 70) {
        this.investigation.priority = 'high';
    } else if (this.risk_level === 'medium' || this.fraud_score >= 50) {
        this.investigation.priority = 'normal';
    } else {
        this.investigation.priority = 'low';
    }
    
    next();
});

// Static method to create fraud report
fraudReportSchema.statics.createFraudReport = function(reportData) {
    return this.create({
        report_type: reportData.reportType,
        entity_type: reportData.entityType,
        entity_id: reportData.entityId,
        reporter_id: reportData.reporterId || null,
        reported_user_id: reportData.reportedUserId || null,
        fraud_score: reportData.fraudScore,
        risk_level: reportData.riskLevel,
        fraud_flags: reportData.fraudFlags || [],
        description: reportData.description,
        evidence: reportData.evidence || [],
        metadata: reportData.metadata || {}
    });
};

// Static method to find reports by status
fraudReportSchema.statics.findByStatus = function(status, limit = 100, skip = 0) {
    return this.find({ 'investigation.status': status })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to find high priority reports
fraudReportSchema.statics.findHighPriority = function(limit = 50) {
    return this.find({
        $or: [
            { 'investigation.priority': 'urgent' },
            { risk_level: 'critical' },
            { fraud_score: { $gte: 90 } }
        ]
    })
    .sort({ 'investigation.priority': -1, created_at: -1 })
    .limit(limit);
};

// Static method to find reports by entity
fraudReportSchema.statics.findByEntity = function(entityType, entityId, limit = 50) {
    return this.find({
        entity_type: entityType,
        entity_id: entityId
    })
    .sort({ created_at: -1 })
    .limit(limit);
};

// Static method to find reports by user
fraudReportSchema.statics.findByUser = function(userId, limit = 50) {
    return this.find({
        $or: [
            { reporter_id: userId },
            { reported_user_id: userId }
        ]
    })
    .sort({ created_at: -1 })
    .limit(limit);
};

// Static method to find overdue reports
fraudReportSchema.statics.findOverdue = function() {
    return this.find({
        'investigation.estimated_completion': { $lt: new Date() },
        'investigation.status': { $in: ['open', 'investigating'] }
    }).sort({ 'investigation.estimated_completion': 1 });
};

// Static method to get fraud statistics
fraudReportSchema.statics.getStatistics = async function(timeRange = '30d') {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
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
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
                    report_type: '$report_type',
                    risk_level: '$risk_level',
                    status: '$investigation.status'
                },
                count: { $sum: 1 },
                avg_fraud_score: { $avg: '$fraud_score' },
                total_financial_impact: { $sum: '$analysis.financial_impact.estimated_loss' }
            }
        }
    ];
    
    return this.aggregate(pipeline);
};

// Instance method to assign investigator
fraudReportSchema.methods.assignInvestigator = function(adminId) {
    this.investigation.assigned_to = adminId;
    this.investigation.assigned_at = new Date();
    
    if (this.investigation.status === 'open') {
        this.investigation.status = 'investigating';
        this.investigation.started_at = new Date();
    }
    
    return this.save();
};

// Instance method to add investigation note
fraudReportSchema.methods.addInvestigationNote = function(note, adminId, isInternal = false) {
    this.investigation.investigation_notes.push({
        note: note,
        added_by: adminId,
        is_internal: isInternal
    });
    
    return this.save();
};

// Instance method to update status
fraudReportSchema.methods.updateStatus = function(status, adminId, notes = '') {
    this.investigation.status = status;
    
    if (status === 'investigating' && !this.investigation.started_at) {
        this.investigation.started_at = new Date();
    }
    
    if (status === 'resolved' || status === 'closed') {
        this.investigation.completed_at = new Date();
    }
    
    if (notes) {
        this.addInvestigationNote(notes, adminId);
    }
    
    return this.save();
};

// Instance method to add evidence
fraudReportSchema.methods.addEvidence = function(evidenceData) {
    this.evidence.push({
        type: evidenceData.type,
        title: evidenceData.title,
        description: evidenceData.description,
        data: evidenceData.data || {},
        url: evidenceData.url || null,
        uploaded_by: evidenceData.uploadedBy
    });
    
    return this.save();
};

// Instance method to resolve report
fraudReportSchema.methods.resolveReport = function(actionTaken, actionDetails, adminId, resolutionNotes = '') {
    this.investigation.status = 'resolved';
    this.investigation.completed_at = new Date();
    
    this.resolution.action_taken = actionTaken;
    this.resolution.action_details = actionDetails;
    this.resolution.action_taken_at = new Date();
    this.resolution.action_taken_by = adminId;
    this.resolution.resolution_notes = resolutionNotes;
    
    return this.save();
};

// Instance method to add prevention recommendation
fraudReportSchema.methods.addPreventionRecommendation = function(recommendation, priority = 'medium') {
    this.prevention.recommendations.push({
        recommendation: recommendation,
        priority: priority
    });
    
    return this.save();
};

// Instance method to get report summary
fraudReportSchema.methods.getSummary = function() {
    return {
        id: this.unique_id,
        type: this.report_type,
        entity: `${this.entity_type}:${this.entity_id}`,
        fraud_score: this.fraud_score,
        risk_level: this.risk_level,
        status: this.investigation.status,
        priority: this.investigation.priority,
        assigned_to: this.investigation.assigned_to,
        age_hours: this.age_hours,
        age_days: this.age_days,
        requires_attention: this.requires_immediate_attention,
        is_overdue: this.is_overdue,
        action_taken: this.resolution.action_taken,
        created_at: this.created_at
    };
};

const FraudReport = mongoose.models.FraudReport || mongoose.model('FraudReport', fraudReportSchema);

module.exports = FraudReport;
