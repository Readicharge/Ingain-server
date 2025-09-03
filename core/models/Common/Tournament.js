/**
 * Tournament Model - INGAIN Platform
 * 
 * This model represents tournaments in the INGAIN platform where users compete
 * to earn bonus rewards by sharing apps during specific time periods.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    tournament_name: {
        type: String,
        required: [true, 'Tournament name is required'],
        trim: true,
        maxlength: [255, 'Tournament name cannot exceed 255 characters']
    },
    tournament_description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Tournament description cannot exceed 2000 characters']
    },
    tournament_category: {
        type: String,
        enum: ['weekly_challenge', 'seasonal', 'app_launch', 'special_event', 'regional'],
        default: 'weekly_challenge'
    },
    tournament_type: {
        type: String,
        enum: ['regional', 'global', 'invite_only'],
        default: 'regional'
    },
    start_date: {
        type: Date,
        required: [true, 'Start date is required'],
        validate: {
            validator: function(v) {
                return v > new Date();
            },
            message: 'Start date must be in the future'
        }
    },
    end_date: {
        type: Date,
        required: [true, 'End date is required'],
        validate: {
            validator: function(v) {
                return v > this.start_date;
            },
            message: 'End date must be after start date'
        }
    },
    registration_deadline: {
        type: Date,
        validate: {
            validator: function(v) {
                return !v || v <= this.start_date;
            },
            message: 'Registration deadline must be before or on start date'
        }
    },
    apps_involved: {
        type: [String],
        required: [true, 'At least one app must be involved'],
        ref: 'App',
        validate: {
            validator: function(v) {
                return v.length > 0;
            },
            message: 'At least one app must be involved in the tournament'
        }
    },
    prizes: {
        type: Object,
        required: [true, 'Prize structure is required'],
        default: {
            first_place: { xp: 1000, points: 100, cash: 50 },
            second_place: { xp: 500, points: 50, cash: 25 },
            third_place: { xp: 250, points: 25, cash: 10 },
            participation: { xp: 50, points: 5 }
        }
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
    eligible_regions: {
        type: [String],
        required: [true, 'Eligible regions are required'],
        default: ['GLOBAL'],
        validate: {
            validator: function(v) {
                return v.length > 0;
            },
            message: 'At least one region must be eligible'
        }
    },
    eligible_cities: {
        type: [String],
        default: []
    },
    participant_details: {
        type: Object,
        default: {
            max_participants: 1000,
            min_level_required: 1,
            registration_fee: 0,
            current_participants: 0
        }
    },
    winners: {
        type: Object,
        default: {}
    },
    tournament_rules: {
        type: Object,
        required: [true, 'Tournament rules are required'],
        default: {
            scoring_method: 'shares_count',
            bonus_multiplier: 1.5,
            min_shares_required: 1,
            max_shares_per_day: 50,
            tie_breaker: 'registration_time',
            disqualification_rules: ['fraud', 'multiple_accounts', 'bot_activity'],
            verification_required: true
        }
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'live', 'completed', 'cancelled'],
        default: 'draft'
    },
    is_active: {
        type: Boolean,
        default: true
    },
    total_shares: {
        type: Number,
        default: 0,
        min: 0
    },
    total_participants: {
        type: Number,
        default: 0,
        min: 0
    },
    total_referral_count: {
        type: Number,
        default: 0,
        min: 0
    },
    reward_multiplier: {
        type: Number,
        default: 1.00,
        min: 1.00,
        max: 5.00
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
        required: true,
        ref: 'AdminUser'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for tournament duration in days
tournamentSchema.virtual('duration_days').get(function() {
    if (!this.start_date || !this.end_date) return 0;
    const diffTime = this.end_date - this.start_date;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for time until start
tournamentSchema.virtual('time_until_start').get(function() {
    if (!this.start_date) return null;
    return this.start_date - new Date();
});

// Virtual for time remaining
tournamentSchema.virtual('time_remaining').get(function() {
    if (!this.end_date) return null;
    return this.end_date - new Date();
});

// Virtual for registration status
tournamentSchema.virtual('registration_open').get(function() {
    if (this.status !== 'scheduled' && this.status !== 'live') return false;
    if (!this.registration_deadline) return true;
    return new Date() <= this.registration_deadline;
});

// Virtual for tournament progress percentage
tournamentSchema.virtual('progress_percentage').get(function() {
    if (!this.start_date || !this.end_date) return 0;
    const now = new Date();
    const total = this.end_date - this.start_date;
    const elapsed = now - this.start_date;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
});

// Indexes for better performance
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ start_date: 1, end_date: 1 });
tournamentSchema.index({ eligible_regions: 1 });
tournamentSchema.index({ tournament_category: 1 });
tournamentSchema.index({ is_active: 1 });
tournamentSchema.index({ created_at: -1 });

// Pre-save middleware to update timestamps and calculate totals
tournamentSchema.pre('save', function(next) {
    this.updated_at = new Date();
    
    // Calculate total XP and Points from prizes
    if (this.prizes) {
        this.total_xp_allocated = Object.values(this.prizes).reduce((total, prize) => {
            return total + (prize.xp || 0);
        }, 0);
        
        this.total_points_allocated = Object.values(this.prizes).reduce((total, prize) => {
            return total + (prize.points || 0);
        }, 0);
    }
    
    next();
});

// Static method to find active tournaments
tournamentSchema.statics.findActive = function() {
    const now = new Date();
    return this.find({
        is_active: true,
        status: { $in: ['scheduled', 'live'] },
        start_date: { $lte: now },
        end_date: { $gte: now }
    }).sort({ start_date: 1 });
};

// Static method to find tournaments by region
tournamentSchema.statics.findByRegion = function(region) {
    return this.find({
        is_active: true,
        $or: [
            { eligible_regions: 'GLOBAL' },
            { eligible_regions: region }
        ]
    }).sort({ start_date: -1 });
};

// Static method to find upcoming tournaments
tournamentSchema.statics.findUpcoming = function(limit = 10) {
    const now = new Date();
    return this.find({
        is_active: true,
        status: 'scheduled',
        start_date: { $gt: now }
    }).sort({ start_date: 1 }).limit(limit);
};

// Instance method to check if user is eligible
tournamentSchema.methods.isUserEligible = function(user) {
    // Check region eligibility
    const regionEligible = this.eligible_regions.includes('GLOBAL') || 
                          this.eligible_regions.includes(user.region);
    
    // Check level requirement
    const levelEligible = user.user_level >= (this.participant_details?.min_level_required || 1);
    
    // Check if tournament is active and registration is open
    const tournamentActive = this.status === 'scheduled' || this.status === 'live';
    const registrationOpen = this.registration_open;
    
    return regionEligible && levelEligible && tournamentActive && registrationOpen;
};

// Instance method to get tournament statistics
tournamentSchema.methods.getTournamentStats = function() {
    return {
        total_participants: this.total_participants,
        total_shares: this.total_shares,
        total_referrals: this.total_referral_count,
        average_shares_per_participant: this.total_participants > 0 ? 
            this.total_shares / this.total_participants : 0,
        progress_percentage: this.progress_percentage,
        time_remaining: this.time_remaining,
        registration_open: this.registration_open
    };
};

// Instance method to update tournament status
tournamentSchema.methods.updateStatus = function() {
    const now = new Date();
    
    if (this.status === 'draft') {
        if (now >= this.start_date) {
            this.status = 'live';
        } else if (now < this.start_date) {
            this.status = 'scheduled';
        }
    } else if (this.status === 'scheduled' && now >= this.start_date) {
        this.status = 'live';
    } else if (this.status === 'live' && now >= this.end_date) {
        this.status = 'completed';
    }
    
    return this.save();
};

// Instance method to calculate participant ranking
tournamentSchema.methods.calculateRankings = async function() {
    // This would typically involve querying tournament_participants collection
    // and calculating scores based on tournament_rules.scoring_method
    return [];
};

const Tournament = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;