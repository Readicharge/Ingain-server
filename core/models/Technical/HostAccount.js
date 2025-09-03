/**
 * Host Account Model - INGAIN Platform
 * 
 * This model manages app host accounts including:
 * - Host verification and KYC
 * - Account balance and funding
 * - App management and performance
 * - Payment processing and withdrawals
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const hostAccountSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    user_id: {
        type: String,
        required: [true, 'User ID is required'],
        ref: 'PlatformUser',
        unique: true
    },
    account_type: {
        type: String,
        enum: ['individual', 'business', 'enterprise'],
        required: [true, 'Account type is required']
    },
    verification_status: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'suspended'],
        default: 'pending'
    },
    verification_details: {
        business_name: {
            type: String,
            trim: true,
            maxlength: [200, 'Business name cannot exceed 200 characters']
        },
        business_type: {
            type: String,
            enum: ['startup', 'sme', 'corporation', 'non_profit', 'government', 'other']
        },
        registration_number: {
            type: String,
            trim: true,
            maxlength: [100, 'Registration number cannot exceed 100 characters']
        },
        tax_id: {
            type: String,
            trim: true,
            maxlength: [100, 'Tax ID cannot exceed 100 characters']
        },
        website: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^https?:\/\/.+/.test(v);
                },
                message: 'Website must be a valid URL'
            }
        },
        founded_year: {
            type: Number,
            min: [1900, 'Founded year must be after 1900'],
            max: [new Date().getFullYear(), 'Founded year cannot be in the future']
        },
        employee_count: {
            type: String,
            enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
        },
        industry: {
            type: String,
            trim: true,
            maxlength: [100, 'Industry cannot exceed 100 characters']
        }
    },
    contact_information: {
        primary_contact: {
            name: {
                type: String,
                required: [true, 'Primary contact name is required'],
                trim: true,
                maxlength: [100, 'Contact name cannot exceed 100 characters']
            },
            email: {
                type: String,
                required: [true, 'Primary contact email is required'],
                trim: true,
                lowercase: true,
                validate: {
                    validator: function(v) {
                        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                    },
                    message: 'Primary contact email must be valid'
                }
            },
            phone: {
                type: String,
                trim: true,
                maxlength: [20, 'Phone number cannot exceed 20 characters']
            },
            position: {
                type: String,
                trim: true,
                maxlength: [100, 'Position cannot exceed 100 characters']
            }
        },
        billing_contact: {
            name: String,
            email: String,
            phone: String,
            address: {
                street: String,
                city: String,
                state: String,
                country: String,
                postal_code: String
            }
        },
        technical_contact: {
            name: String,
            email: String,
            phone: String
        }
    },
    financial_information: {
        account_balance: {
            type: Number,
            default: 0,
            min: 0
        },
        total_deposited: {
            type: Number,
            default: 0,
            min: 0
        },
        total_withdrawn: {
            type: Number,
            default: 0,
            min: 0
        },
        total_spent: {
            type: Number,
            default: 0,
            min: 0
        },
        pending_deposits: {
            type: Number,
            default: 0,
            min: 0
        },
        pending_withdrawals: {
            type: Number,
            default: 0,
            min: 0
        },
        currency: {
            type: String,
            default: 'USD',
            enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
        },
        payment_methods: [{
            type: {
                type: String,
                enum: ['bank_transfer', 'credit_card', 'paypal', 'stripe', 'crypto']
            },
            is_default: {
                type: Boolean,
                default: false
            },
            details: Object,
            is_verified: {
                type: Boolean,
                default: false
            }
        }]
    },
    account_limits: {
        max_apps: {
            type: Number,
            default: 10,
            min: 1
        },
        max_daily_budget: {
            type: Number,
            default: 1000,
            min: 10
        },
        max_total_budget: {
            type: Number,
            default: 10000,
            min: 100
        },
        max_concurrent_campaigns: {
            type: Number,
            default: 5,
            min: 1
        },
        min_deposit_amount: {
            type: Number,
            default: 50,
            min: 10
        },
        max_withdrawal_amount: {
            type: Number,
            default: 5000,
            min: 100
        }
    },
    performance_metrics: {
        total_apps_created: {
            type: Number,
            default: 0,
            min: 0
        },
        active_apps: {
            type: Number,
            default: 0,
            min: 0
        },
        total_shares_generated: {
            type: Number,
            default: 0,
            min: 0
        },
        total_conversions: {
            type: Number,
            default: 0,
            min: 0
        },
        conversion_rate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        average_cost_per_share: {
            type: Number,
            default: 0,
            min: 0
        },
        total_revenue_generated: {
            type: Number,
            default: 0,
            min: 0
        },
        roi_percentage: {
            type: Number,
            default: 0,
            min: -100
        }
    },
    compliance: {
        kyc_completed: {
            type: Boolean,
            default: false
        },
        kyc_completed_at: {
            type: Date,
            default: null
        },
        kyc_documents: [{
            type: {
                type: String,
                enum: ['passport', 'drivers_license', 'national_id', 'business_license', 'tax_certificate', 'bank_statement', 'utility_bill']
            },
            document_url: String,
            uploaded_at: {
                type: Date,
                default: Date.now
            },
            verification_status: {
                type: String,
                enum: ['pending', 'verified', 'rejected'],
                default: 'pending'
            },
            verified_at: Date,
            verified_by: {
                type: String,
                ref: 'AdminUser'
            },
            rejection_reason: String
        }],
        terms_accepted: {
            type: Boolean,
            default: false
        },
        terms_accepted_at: {
            type: Date,
            default: null
        },
        privacy_policy_accepted: {
            type: Boolean,
            default: false
        },
        privacy_policy_accepted_at: {
            type: Date,
            default: null
        },
        marketing_consent: {
            type: Boolean,
            default: false
        }
    },
    account_status: {
        is_active: {
            type: Boolean,
            default: true
        },
        is_suspended: {
            type: Boolean,
            default: false
        },
        suspension_reason: {
            type: String,
            trim: true,
            maxlength: [500, 'Suspension reason cannot exceed 500 characters']
        },
        suspended_at: {
            type: Date,
            default: null
        },
        suspended_by: {
            type: String,
            ref: 'AdminUser',
            default: null
        },
        suspension_end_date: {
            type: Date,
            default: null
        },
        last_activity_date: {
            type: Date,
            default: Date.now
        }
    },
    settings: {
        notifications: {
            email_notifications: {
                type: Boolean,
                default: true
            },
            sms_notifications: {
                type: Boolean,
                default: false
            },
            push_notifications: {
                type: Boolean,
                default: true
            },
            low_balance_alerts: {
                type: Boolean,
                default: true
            },
            performance_reports: {
                type: Boolean,
                default: true
            },
            fraud_alerts: {
                type: Boolean,
                default: true
            }
        },
        security: {
            two_factor_auth: {
                type: Boolean,
                default: false
            },
            login_notifications: {
                type: Boolean,
                default: true
            },
            session_timeout_minutes: {
                type: Number,
                default: 60,
                min: 15,
                max: 1440
            }
        },
        preferences: {
            timezone: {
                type: String,
                default: 'UTC'
            },
            language: {
                type: String,
                default: 'en'
            },
            date_format: {
                type: String,
                default: 'MM/DD/YYYY'
            },
            currency_display: {
                type: String,
                default: 'USD'
            }
        }
    },
    metadata: {
        registration_ip: String,
        registration_user_agent: String,
        registration_device: Object,
        notes: String,
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

// Virtual for account age in days
hostAccountSchema.virtual('account_age_days').get(function() {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60 * 24));
});

// Virtual for available balance
hostAccountSchema.virtual('available_balance').get(function() {
    return Math.max(0, this.financial_information.account_balance - this.financial_information.pending_withdrawals);
});

// Virtual for total spent percentage
hostAccountSchema.virtual('spent_percentage').get(function() {
    if (this.financial_information.total_deposited === 0) return 0;
    return Math.round((this.financial_information.total_spent / this.financial_information.total_deposited) * 100);
});

// Virtual for is verified
hostAccountSchema.virtual('is_verified').get(function() {
    return this.verification_status === 'verified';
});

// Virtual for can create apps
hostAccountSchema.virtual('can_create_apps').get(function() {
    return this.is_verified && 
           this.account_status.is_active && 
           !this.account_status.is_suspended &&
           this.performance_metrics.total_apps_created < this.account_limits.max_apps;
});

// Indexes for better performance
hostAccountSchema.index({ user_id: 1 });
hostAccountSchema.index({ verification_status: 1 });
hostAccountSchema.index({ account_status: { is_active: 1, is_suspended: 1 } });
hostAccountSchema.index({ 'financial_information.account_balance': -1 });
hostAccountSchema.index({ 'performance_metrics.total_revenue_generated': -1 });
hostAccountSchema.index({ created_at: -1 });

// Pre-save middleware
hostAccountSchema.pre('save', function(next) {
    this.updated_at = new Date();
    this.account_status.last_activity_date = new Date();
    
    // Calculate conversion rate
    if (this.performance_metrics.total_shares_generated > 0) {
        this.performance_metrics.conversion_rate = 
            Math.round((this.performance_metrics.total_conversions / this.performance_metrics.total_shares_generated) * 100);
    }
    
    // Calculate ROI
    if (this.financial_information.total_spent > 0) {
        this.performance_metrics.roi_percentage = 
            Math.round(((this.performance_metrics.total_revenue_generated - this.financial_information.total_spent) / this.financial_information.total_spent) * 100);
    }
    
    // Calculate average cost per share
    if (this.performance_metrics.total_shares_generated > 0) {
        this.performance_metrics.average_cost_per_share = 
            Math.round((this.financial_information.total_spent / this.performance_metrics.total_shares_generated) * 100) / 100;
    }
    
    next();
});

// Static method to create host account
hostAccountSchema.statics.createHostAccount = function(userId, accountType, options = {}) {
    return this.create({
        user_id: userId,
        account_type: accountType,
        verification_details: options.verificationDetails || {},
        contact_information: options.contactInformation || {},
        account_limits: options.accountLimits || {},
        settings: options.settings || {}
    });
};

// Static method to find verified hosts
hostAccountSchema.statics.findVerified = function(limit = 100, skip = 0) {
    return this.find({
        verification_status: 'verified',
        account_status: { is_active: true, is_suspended: false }
    })
    .sort({ 'performance_metrics.total_revenue_generated': -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to find hosts by verification status
hostAccountSchema.statics.findByVerificationStatus = function(status, limit = 100) {
    return this.find({ verification_status: status })
        .sort({ created_at: -1 })
        .limit(limit);
};

// Static method to find top performing hosts
hostAccountSchema.statics.findTopPerformers = function(limit = 20) {
    return this.find({
        verification_status: 'verified',
        account_status: { is_active: true, is_suspended: false }
    })
    .sort({ 'performance_metrics.total_revenue_generated': -1 })
    .limit(limit);
};

// Instance method to update balance
hostAccountSchema.methods.updateBalance = function(amount, operation, description = '') {
    switch (operation) {
        case 'deposit':
            this.financial_information.account_balance += amount;
            this.financial_information.total_deposited += amount;
            break;
        case 'withdrawal':
            if (amount > this.financial_information.account_balance) {
                throw new Error('Insufficient balance for withdrawal');
            }
            this.financial_information.account_balance -= amount;
            this.financial_information.total_withdrawn += amount;
            break;
        case 'spend':
            if (amount > this.financial_information.account_balance) {
                throw new Error('Insufficient balance for spending');
            }
            this.financial_information.account_balance -= amount;
            this.financial_information.total_spent += amount;
            break;
        case 'refund':
            this.financial_information.account_balance += amount;
            this.financial_information.total_spent -= amount;
            break;
        default:
            throw new Error(`Invalid operation: ${operation}`);
    }
    
    return this.save();
};

// Instance method to add payment method
hostAccountSchema.methods.addPaymentMethod = function(paymentMethod) {
    // Remove default from other payment methods if this is set as default
    if (paymentMethod.is_default) {
        this.financial_information.payment_methods.forEach(method => {
            method.is_default = false;
        });
    }
    
    this.financial_information.payment_methods.push(paymentMethod);
    return this.save();
};

// Instance method to remove payment method
hostAccountSchema.methods.removePaymentMethod = function(paymentMethodId) {
    this.financial_information.payment_methods = 
        this.financial_information.payment_methods.filter(method => 
            method._id.toString() !== paymentMethodId
        );
    
    return this.save();
};

// Instance method to update performance metrics
hostAccountSchema.methods.updatePerformanceMetrics = function(updates) {
    Object.keys(updates).forEach(key => {
        if (this.performance_metrics.hasOwnProperty(key)) {
            this.performance_metrics[key] = updates[key];
        }
    });
    
    return this.save();
};

// Instance method to suspend account
hostAccountSchema.methods.suspendAccount = function(reason, suspendedBy, endDate = null) {
    this.account_status.is_suspended = true;
    this.account_status.suspension_reason = reason;
    this.account_status.suspended_at = new Date();
    this.account_status.suspended_by = suspendedBy;
    this.account_status.suspension_end_date = endDate;
    
    return this.save();
};

// Instance method to unsuspend account
hostAccountSchema.methods.unsuspendAccount = function() {
    this.account_status.is_suspended = false;
    this.account_status.suspension_reason = null;
    this.account_status.suspended_at = null;
    this.account_status.suspended_by = null;
    this.account_status.suspension_end_date = null;
    
    return this.save();
};

// Instance method to verify account
hostAccountSchema.methods.verifyAccount = function(verifiedBy) {
    this.verification_status = 'verified';
    this.compliance.kyc_completed = true;
    this.compliance.kyc_completed_at = new Date();
    
    return this.save();
};

// Instance method to reject verification
hostAccountSchema.methods.rejectVerification = function(reason, rejectedBy) {
    this.verification_status = 'rejected';
    
    return this.save();
};

// Instance method to get account summary
hostAccountSchema.methods.getSummary = function() {
    return {
        id: this.unique_id,
        user_id: this.user_id,
        account_type: this.account_type,
        verification_status: this.verification_status,
        account_status: {
            is_active: this.account_status.is_active,
            is_suspended: this.account_status.is_suspended
        },
        financial: {
            account_balance: this.financial_information.account_balance,
            available_balance: this.available_balance,
            total_deposited: this.financial_information.total_deposited,
            total_spent: this.financial_information.total_spent
        },
        performance: {
            total_apps: this.performance_metrics.total_apps_created,
            active_apps: this.performance_metrics.active_apps,
            total_shares: this.performance_metrics.total_shares_generated,
            conversion_rate: this.performance_metrics.conversion_rate,
            roi: this.performance_metrics.roi_percentage
        },
        limits: {
            max_apps: this.account_limits.max_apps,
            max_daily_budget: this.account_limits.max_daily_budget
        },
        created_at: this.created_at,
        account_age_days: this.account_age_days
    };
};

const HostAccount = mongoose.models.HostAccount || mongoose.model('HostAccount', hostAccountSchema);

module.exports = HostAccount;
