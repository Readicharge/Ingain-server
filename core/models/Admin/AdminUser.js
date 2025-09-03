/**
 * Admin User Model - INGAIN Platform
 * 
 * This model manages platform administrators including:
 * - Super admin accounts
 * - Role-based permissions
 * - Administrative actions
 * - System configuration access
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminUserSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [50, 'Username cannot exceed 50 characters'],
        match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Email must be valid'
        }
    },
    password_hash: {
        type: String,
        required: [true, 'Password hash is required']
    },
    role: {
        type: String,
        required: [true, 'Admin role is required'],
        enum: ['super_admin', 'admin', 'moderator', 'support', 'analyst'],
        default: 'admin'
    },
    permissions: {
        user_management: {
            type: Boolean,
            default: false
        },
        app_management: {
            type: Boolean,
            default: false
        },
        tournament_management: {
            type: Boolean,
            default: false
        },
        payment_management: {
            type: Boolean,
            default: false
        },
        fraud_management: {
            type: Boolean,
            default: false
        },
        system_configuration: {
            type: Boolean,
            default: false
        },
        analytics_access: {
            type: Boolean,
            default: false
        },
        report_generation: {
            type: Boolean,
            default: false
        },
        api_access: {
            type: Boolean,
            default: false
        }
    },
    profile: {
        first_name: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            maxlength: [50, 'First name cannot exceed 50 characters']
        },
        last_name: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            maxlength: [50, 'Last name cannot exceed 50 characters']
        },
        display_name: {
            type: String,
            trim: true,
            maxlength: [100, 'Display name cannot exceed 100 characters']
        },
        avatar: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^https?:\/\/.+/.test(v);
                },
                message: 'Avatar must be a valid URL'
            }
        },
        phone: {
            type: String,
            trim: true,
            maxlength: [20, 'Phone number cannot exceed 20 characters']
        },
        department: {
            type: String,
            trim: true,
            maxlength: [100, 'Department cannot exceed 100 characters']
        },
        position: {
            type: String,
            trim: true,
            maxlength: [100, 'Position cannot exceed 100 characters']
        }
    },
    security: {
        two_factor_enabled: {
            type: Boolean,
            default: false
        },
        two_factor_secret: {
            type: String,
            default: null
        },
        last_password_change: {
            type: Date,
            default: Date.now
        },
        password_expires_at: {
            type: Date,
            default: function() {
                // Password expires after 90 days
                return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
            }
        },
        failed_login_attempts: {
            type: Number,
            default: 0,
            min: 0
        },
        account_locked_until: {
            type: Date,
            default: null
        },
        last_login_at: {
            type: Date,
            default: null
        },
        last_login_ip: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/.test(v);
                },
                message: 'IP address must be valid'
            }
        },
        session_tokens: [{
            token: String,
            created_at: {
                type: Date,
                default: Date.now
            },
            expires_at: Date,
            ip_address: String,
            user_agent: String,
            is_active: {
                type: Boolean,
                default: true
            }
        }]
    },
    activity: {
        total_actions: {
            type: Number,
            default: 0,
            min: 0
        },
        last_action_at: {
            type: Date,
            default: null
        },
        actions_today: {
            type: Number,
            default: 0,
            min: 0
        },
        actions_this_week: {
            type: Number,
            default: 0,
            min: 0
        },
        actions_this_month: {
            type: Number,
            default: 0,
            min: 0
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
        time_format: {
            type: String,
            default: '12h'
        },
        notifications: {
            email_notifications: {
                type: Boolean,
                default: true
            },
            system_alerts: {
                type: Boolean,
                default: true
            },
            fraud_alerts: {
                type: Boolean,
                default: true
            },
            user_reports: {
                type: Boolean,
                default: true
            }
        },
        dashboard_layout: {
            type: Object,
            default: {}
        }
    },
    status: {
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
        }
    },
    metadata: {
        created_by: {
            type: String,
            ref: 'AdminUser',
            default: null
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes cannot exceed 1000 characters']
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

// Virtual for full name
adminUserSchema.virtual('full_name').get(function() {
    return `${this.profile.first_name} ${this.profile.last_name}`;
});

// Virtual for display name or full name
adminUserSchema.virtual('display_name_or_full').get(function() {
    return this.profile.display_name || this.full_name;
});

// Virtual for account age in days
adminUserSchema.virtual('account_age_days').get(function() {
    return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60 * 24));
});

// Virtual for password age in days
adminUserSchema.virtual('password_age_days').get(function() {
    return Math.floor((Date.now() - this.security.last_password_change) / (1000 * 60 * 60 * 24));
});

// Virtual for password expires soon
adminUserSchema.virtual('password_expires_soon').get(function() {
    if (!this.security.password_expires_at) return false;
    const daysUntilExpiry = Math.ceil((this.security.password_expires_at - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
});

// Virtual for is account locked
adminUserSchema.virtual('is_account_locked').get(function() {
    return this.security.account_locked_until && new Date() < this.security.account_locked_until;
});

// Virtual for can perform action
adminUserSchema.virtual('can_perform_action').get(function() {
    return this.status.is_active && 
           !this.status.is_suspended && 
           !this.is_account_locked;
});

// Indexes for better performance
adminUserSchema.index({ username: 1 });
adminUserSchema.index({ email: 1 });
adminUserSchema.index({ role: 1 });
adminUserSchema.index({ 'status.is_active': 1, 'status.is_suspended': 1 });
adminUserSchema.index({ 'security.last_login_at': -1 });
adminUserSchema.index({ created_at: -1 });

// Pre-save middleware
adminUserSchema.pre('save', function(next) {
    this.updated_at = new Date();
    
    // Set default permissions based on role
    if (this.role === 'super_admin') {
        Object.keys(this.permissions).forEach(key => {
            this.permissions[key] = true;
        });
    } else if (this.role === 'admin') {
        this.permissions.user_management = true;
        this.permissions.app_management = true;
        this.permissions.tournament_management = true;
        this.permissions.payment_management = true;
        this.permissions.fraud_management = true;
        this.permissions.analytics_access = true;
        this.permissions.report_generation = true;
    } else if (this.role === 'moderator') {
        this.permissions.user_management = true;
        this.permissions.fraud_management = true;
        this.permissions.analytics_access = true;
    } else if (this.role === 'support') {
        this.permissions.user_management = true;
        this.permissions.analytics_access = true;
    } else if (this.role === 'analyst') {
        this.permissions.analytics_access = true;
        this.permissions.report_generation = true;
    }
    
    next();
});

// Pre-save middleware for password hashing
adminUserSchema.pre('save', async function(next) {
    if (this.isModified('password_hash')) {
        // Password is already hashed, just update the timestamp
        this.security.last_password_change = new Date();
    }
    next();
});

// Static method to create admin user
adminUserSchema.statics.createAdminUser = function(adminData) {
    return this.create({
        username: adminData.username,
        email: adminData.email,
        password_hash: adminData.password_hash,
        role: adminData.role || 'admin',
        profile: adminData.profile || {},
        permissions: adminData.permissions || {},
        created_by: adminData.createdBy || null
    });
};

// Static method to find active admins
adminUserSchema.statics.findActive = function() {
    return this.find({
        'status.is_active': true,
        'status.is_suspended': false
    }).sort({ role: 1, 'profile.first_name': 1 });
};

// Static method to find admins by role
adminUserSchema.statics.findByRole = function(role) {
    return this.find({ role: role }).sort({ 'profile.first_name': 1 });
};

// Static method to find admins with permission
adminUserSchema.statics.findByPermission = function(permission) {
    return this.find({
        [`permissions.${permission}`]: true,
        'status.is_active': true,
        'status.is_suspended': false
    }).sort({ role: 1, 'profile.first_name': 1 });
};

// Static method to find super admins
adminUserSchema.statics.findSuperAdmins = function() {
    return this.find({ role: 'super_admin' }).sort({ 'profile.first_name': 1 });
};

// Instance method to hash password
adminUserSchema.methods.hashPassword = async function(password) {
    const saltRounds = 12;
    this.password_hash = await bcrypt.hash(password, saltRounds);
    this.security.last_password_change = new Date();
    return this.save();
};

// Instance method to compare password
adminUserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password_hash);
};

// Instance method to check permission
adminUserSchema.methods.hasPermission = function(permission) {
    return this.permissions[permission] === true;
};

// Instance method to check multiple permissions
adminUserSchema.methods.hasPermissions = function(permissions) {
    return permissions.every(permission => this.hasPermission(permission));
};

// Instance method to check any permission
adminUserSchema.methods.hasAnyPermission = function(permissions) {
    return permissions.some(permission => this.hasPermission(permission));
};

// Instance method to update permissions
adminUserSchema.methods.updatePermissions = function(newPermissions) {
    Object.keys(newPermissions).forEach(key => {
        if (this.permissions.hasOwnProperty(key)) {
            this.permissions[key] = newPermissions[key];
        }
    });
    
    return this.save();
};

// Instance method to record login
adminUserSchema.methods.recordLogin = function(ipAddress) {
    this.security.last_login_at = new Date();
    this.security.last_login_ip = ipAddress;
    this.security.failed_login_attempts = 0;
    this.security.account_locked_until = null;
    
    return this.save();
};

// Instance method to record failed login
adminUserSchema.methods.recordFailedLogin = function() {
    this.security.failed_login_attempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (this.security.failed_login_attempts >= 5) {
        this.security.account_locked_until = new Date(Date.now() + 30 * 60 * 1000);
    }
    
    return this.save();
};

// Instance method to unlock account
adminUserSchema.methods.unlockAccount = function() {
    this.security.failed_login_attempts = 0;
    this.security.account_locked_until = null;
    
    return this.save();
};

// Instance method to suspend account
adminUserSchema.methods.suspendAccount = function(reason, suspendedBy, endDate = null) {
    this.status.is_suspended = true;
    this.status.suspension_reason = reason;
    this.status.suspended_at = new Date();
    this.status.suspended_by = suspendedBy;
    this.status.suspension_end_date = endDate;
    
    return this.save();
};

// Instance method to unsuspend account
adminUserSchema.methods.unsuspendAccount = function() {
    this.status.is_suspended = false;
    this.status.suspension_reason = null;
    this.status.suspended_at = null;
    this.status.suspended_by = null;
    this.status.suspension_end_date = null;
    
    return this.save();
};

// Instance method to add session token
adminUserSchema.methods.addSessionToken = function(token, expiresAt, ipAddress, userAgent) {
    // Remove expired tokens
    this.security.session_tokens = this.security.session_tokens.filter(session => 
        session.expires_at > new Date()
    );
    
    this.security.session_tokens.push({
        token: token,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent
    });
    
    return this.save();
};

// Instance method to remove session token
adminUserSchema.methods.removeSessionToken = function(token) {
    this.security.session_tokens = this.security.session_tokens.filter(session => 
        session.token !== token
    );
    
    return this.save();
};

// Instance method to record action
adminUserSchema.methods.recordAction = function() {
    this.activity.total_actions += 1;
    this.activity.last_action_at = new Date();
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Reset counters if it's a new day/week/month
    if (this.activity.last_action_at < today) {
        this.activity.actions_today = 1;
    } else {
        this.activity.actions_today += 1;
    }
    
    if (this.activity.last_action_at < weekStart) {
        this.activity.actions_this_week = 1;
    } else {
        this.activity.actions_this_week += 1;
    }
    
    if (this.activity.last_action_at < monthStart) {
        this.activity.actions_this_month = 1;
    } else {
        this.activity.actions_this_month += 1;
    }
    
    return this.save();
};

// Instance method to get admin summary
adminUserSchema.methods.getSummary = function() {
    return {
        id: this.unique_id,
        username: this.username,
        email: this.email,
        role: this.role,
        full_name: this.full_name,
        display_name: this.display_name_or_full,
        permissions: this.permissions,
        status: {
            is_active: this.status.is_active,
            is_suspended: this.status.is_suspended,
            is_locked: this.is_account_locked
        },
        security: {
            two_factor_enabled: this.security.two_factor_enabled,
            password_expires_soon: this.password_expires_soon,
            last_login: this.security.last_login_at
        },
        activity: {
            total_actions: this.activity.total_actions,
            actions_today: this.activity.actions_today,
            last_action: this.activity.last_action_at
        },
        created_at: this.created_at,
        account_age_days: this.account_age_days
    };
};

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);

module.exports = AdminUser; 