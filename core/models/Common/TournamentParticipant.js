/**
 * Tournament Participant Model - INGAIN Platform
 * 
 * This model tracks user participation in tournaments including:
 * - Registration and eligibility
 * - Performance metrics and scoring
 * - Leaderboard rankings
 * - Prize eligibility and distribution
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const tournamentParticipantSchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    tournament_id: {
        type: String,
        required: [true, 'Tournament ID is required'],
        ref: 'Tournament'
    },
    user_id: {
        type: String,
        required: [true, 'User ID is required'],
        ref: 'PlatformUser'
    },
    registration_date: {
        type: Date,
        default: Date.now
    },
    registration_status: {
        type: String,
        enum: ['registered', 'active', 'disqualified', 'withdrawn'],
        default: 'registered'
    },
    eligibility_status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    eligibility_criteria: {
        min_user_level: {
            type: Number,
            default: 1,
            min: 1
        },
        min_shares_count: {
            type: Number,
            default: 0,
            min: 0
        },
        min_xp_required: {
            type: Number,
            default: 0,
            min: 0
        },
        required_regions: [{
            type: String,
            trim: true
        }],
        required_badges: [{
            type: String,
            ref: 'Badge'
        }]
    },
    eligibility_verification: {
        user_level_met: {
            type: Boolean,
            default: false
        },
        shares_count_met: {
            type: Boolean,
            default: false
        },
        xp_requirement_met: {
            type: Boolean,
            default: false
        },
        region_requirement_met: {
            type: Boolean,
            default: false
        },
        badges_requirement_met: {
            type: Boolean,
            default: false
        },
        verified_at: {
            type: Date,
            default: null
        },
        verified_by: {
            type: String,
            ref: 'AdminUser',
            default: null
        }
    },
    performance_metrics: {
        total_shares: {
            type: Number,
            default: 0,
            min: 0
        },
        verified_shares: {
            type: Number,
            default: 0,
            min: 0
        },
        total_xp_earned: {
            type: Number,
            default: 0,
            min: 0
        },
        total_points_earned: {
            type: Number,
            default: 0,
            min: 0
        },
        total_score: {
            type: Number,
            default: 0,
            min: 0
        },
        average_score_per_share: {
            type: Number,
            default: 0,
            min: 0
        },
        best_share_score: {
            type: Number,
            default: 0,
            min: 0
        },
        shares_streak: {
            type: Number,
            default: 0,
            min: 0
        },
        longest_streak: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    leaderboard_data: {
        current_rank: {
            type: Number,
            default: null,
            min: 1
        },
        previous_rank: {
            type: Number,
            default: null,
            min: 1
        },
        rank_change: {
            type: Number,
            default: 0
        },
        points_behind_leader: {
            type: Number,
            default: null,
            min: 0
        },
        points_ahead_next: {
            type: Number,
            default: null,
            min: 0
        },
        rank_percentile: {
            type: Number,
            default: null,
            min: 0,
            max: 100
        }
    },
    tournament_stats: {
        first_share_date: {
            type: Date,
            default: null
        },
        last_share_date: {
            type: Date,
            default: null
        },
        days_participated: {
            type: Number,
            default: 0,
            min: 0
        },
        consecutive_days: {
            type: Number,
            default: 0,
            min: 0
        },
        total_participation_time: {
            type: Number,
            default: 0,
            min: 0
        },
        average_shares_per_day: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    bonus_multipliers: {
        early_bird: {
            type: Number,
            default: 1.0,
            min: 1.0
        },
        streak_bonus: {
            type: Number,
            default: 1.0,
            min: 1.0
        },
        performance_bonus: {
            type: Number,
            default: 1.0,
            min: 1.0
        },
        referral_bonus: {
            type: Number,
            default: 1.0,
            min: 1.0
        },
        total_multiplier: {
            type: Number,
            default: 1.0,
            min: 1.0
        }
    },
    prizes: {
        eligible_for_prizes: {
            type: Boolean,
            default: true
        },
        prize_tier: {
            type: String,
            enum: ['none', 'participation', 'bronze', 'silver', 'gold', 'platinum', 'diamond'],
            default: 'none'
        },
        prize_amount: {
            xp: {
                type: Number,
                default: 0,
                min: 0
            },
            points: {
                type: Number,
                default: 0,
                min: 0
            },
            cash: {
                type: Number,
                default: 0,
                min: 0
            }
        },
        prize_claimed: {
            type: Boolean,
            default: false
        },
        prize_claimed_at: {
            type: Date,
            default: null
        }
    },
    disqualification: {
        is_disqualified: {
            type: Boolean,
            default: false
        },
        reason: {
            type: String,
            trim: true,
            maxlength: [500, 'Disqualification reason cannot exceed 500 characters']
        },
        disqualified_at: {
            type: Date,
            default: null
        },
        disqualified_by: {
            type: String,
            ref: 'AdminUser',
            default: null
        },
        appeal_status: {
            type: String,
            enum: ['none', 'pending', 'approved', 'rejected'],
            default: 'none'
        },
        appeal_submitted_at: {
            type: Date,
            default: null
        },
        appeal_decision_at: {
            type: Date,
            default: null
        },
        appeal_decision_by: {
            type: String,
            ref: 'AdminUser',
            default: null
        }
    },
    metadata: {
        registration_ip: String,
        registration_user_agent: String,
        registration_device: Object,
        notes: String,
        tags: [String]
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

// Compound index for tournament and user
tournamentParticipantSchema.index({ tournament_id: 1, user_id: 1 }, { unique: true });

// Indexes for better performance
tournamentParticipantSchema.index({ tournament_id: 1, 'leaderboard_data.current_rank': 1 });
tournamentParticipantSchema.index({ tournament_id: 1, 'performance_metrics.total_score': -1 });
tournamentParticipantSchema.index({ user_id: 1, created_at: -1 });
tournamentParticipantSchema.index({ registration_status: 1, eligibility_status: 1 });
tournamentParticipantSchema.index({ 'disqualification.is_disqualified': 1 });

// Pre-save middleware
tournamentParticipantSchema.pre('save', function(next) {
    this.updated_at = new Date();
    
    // Calculate total multiplier
    this.bonus_multipliers.total_multiplier = 
        this.bonus_multipliers.early_bird *
        this.bonus_multipliers.streak_bonus *
        this.bonus_multipliers.performance_bonus *
        this.bonus_multipliers.referral_bonus;
    
    // Calculate average score per share
    if (this.performance_metrics.total_shares > 0) {
        this.performance_metrics.average_score_per_share = 
            this.performance_metrics.total_score / this.performance_metrics.total_shares;
    }
    
    // Calculate rank change
    if (this.leaderboard_data.current_rank && this.leaderboard_data.previous_rank) {
        this.leaderboard_data.rank_change = 
            this.leaderboard_data.previous_rank - this.leaderboard_data.current_rank;
    }
    
    next();
});

// Static method to create participant
tournamentParticipantSchema.statics.createParticipant = function(tournamentId, userId, options = {}) {
    return this.create({
        tournament_id: tournamentId,
        user_id: userId,
        eligibility_criteria: options.eligibilityCriteria || {},
        bonus_multipliers: options.bonusMultipliers || {},
        metadata: options.metadata || {}
    });
};

// Static method to find participants by tournament
tournamentParticipantSchema.statics.findByTournament = function(tournamentId, options = {}) {
    const query = { tournament_id: tournamentId };
    
    if (options.status) query.registration_status = options.status;
    if (options.eligible !== undefined) query.eligibility_status = options.eligible ? 'verified' : { $ne: 'verified' };
    
    return this.find(query)
        .sort({ 'leaderboard_data.current_rank': 1 })
        .limit(options.limit || 100);
};

// Static method to find leaderboard
tournamentParticipantSchema.statics.findLeaderboard = function(tournamentId, limit = 100, skip = 0) {
    return this.find({
        tournament_id: tournamentId,
        registration_status: { $in: ['registered', 'active'] },
        eligibility_status: 'verified'
    })
    .sort({ 'performance_metrics.total_score': -1, 'performance_metrics.total_shares': -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to find top performers
tournamentParticipantSchema.statics.findTopPerformers = function(tournamentId, limit = 10) {
    return this.find({
        tournament_id: tournamentId,
        registration_status: { $in: ['registered', 'active'] },
        eligibility_status: 'verified'
    })
    .sort({ 'performance_metrics.total_score': -1 })
    .limit(limit);
};

// Static method to find disqualified participants
tournamentParticipantSchema.statics.findDisqualified = function(tournamentId) {
    return this.find({
        tournament_id: tournamentId,
        'disqualification.is_disqualified': true
    }).sort({ 'disqualification.disqualified_at': -1 });
};

// Instance method to update performance metrics
tournamentParticipantSchema.methods.updatePerformance = function(shareData) {
    // Update total shares
    this.performance_metrics.total_shares += 1;
    
    if (shareData.verified) {
        this.performance_metrics.verified_shares += 1;
        
        // Track XP and points earned in tournament
        const xpAwarded = shareData.xp_awarded || 0;
        const pointsAwarded = shareData.points_awarded || 0;
        
        // Always update the performance metrics directly
        this.performance_metrics.total_xp_earned += xpAwarded;
        this.performance_metrics.total_points_earned += pointsAwarded;
        
        // Calculate share score
        const shareScore = this.calculateShareScore(shareData);
        this.performance_metrics.total_score += shareScore;
        
        // Update best share score
        if (shareScore > this.performance_metrics.best_share_score) {
            this.performance_metrics.best_share_score = shareScore;
        }
        
        // Update streak
        this.updateStreak();
    }
    
    // Update dates
    if (!this.tournament_stats.first_share_date) {
        this.tournament_stats.first_share_date = new Date();
    }
    this.tournament_stats.last_share_date = new Date();
    
    return this.save();
};

// Instance method to calculate share score
tournamentParticipantSchema.methods.calculateShareScore = function(shareData) {
    let score = 1; // Base score for each share
    
    // Bonus for high-value shares
    if (shareData.xp_awarded > 100 || shareData.points_awarded > 10) {
        score += 2;
    }
    
    // Bonus for early shares (first day of tournament)
    const tournamentStart = this.created_at;
    const shareTime = new Date();
    const hoursSinceStart = (shareTime - tournamentStart) / (1000 * 60 * 60);
    if (hoursSinceStart <= 24) {
        score += 1;
    }
    
    // Apply bonus multipliers
    score = Math.round(score * this.bonus_multipliers.total_multiplier);
    
    return score;
};

// Instance method to update streak
tournamentParticipantSchema.methods.updateStreak = function() {
    const today = new Date().toDateString();
    const lastShareDate = this.tournament_stats.last_share_date;
    
    if (lastShareDate) {
        const lastShareDay = lastShareDate.toDateString();
        const dayBefore = new Date(lastShareDate.getTime() - 24 * 60 * 60 * 1000).toDateString();
        
        if (today === lastShareDay) {
            // Same day, no change
        } else if (today === new Date(lastShareDate.getTime() + 24 * 60 * 60 * 1000).toDateString()) {
            // Consecutive day
            this.performance_metrics.shares_streak += 1;
            this.tournament_stats.consecutive_days += 1;
        } else {
            // Streak broken
            this.performance_metrics.shares_streak = 1;
            this.tournament_stats.consecutive_days = 1;
        }
        
        // Update longest streak
        if (this.performance_metrics.shares_streak > this.performance_metrics.longest_streak) {
            this.performance_metrics.longest_streak = this.performance_metrics.shares_streak;
        }
    } else {
        this.performance_metrics.shares_streak = 1;
        this.tournament_stats.consecutive_days = 1;
    }
};

// Instance method to update ranking
tournamentParticipantSchema.methods.updateRanking = function(currentRank, totalParticipants) {
    this.leaderboard_data.previous_rank = this.leaderboard_data.current_rank;
    this.leaderboard_data.current_rank = currentRank;
    
    if (totalParticipants > 0) {
        this.leaderboard_data.rank_percentile = Math.round((currentRank / totalParticipants) * 100);
    }
    
    return this.save();
};

// Instance method to disqualify
tournamentParticipantSchema.methods.disqualify = function(reason, disqualifiedBy) {
    this.registration_status = 'disqualified';
    this.disqualification.is_disqualified = true;
    this.disqualification.reason = reason;
    this.disqualification.disqualified_at = new Date();
    this.disqualification.disqualified_by = disqualifiedBy;
    
    return this.save();
};

// Instance method to submit appeal
tournamentParticipantSchema.methods.submitAppeal = function() {
    if (!this.disqualification.is_disqualified) {
        throw new Error('Cannot appeal: participant is not disqualified');
    }
    
    this.disqualification.appeal_status = 'pending';
    this.disqualification.appeal_submitted_at = new Date();
    
    return this.save();
};

// Instance method to process appeal
tournamentParticipantSchema.methods.processAppeal = function(decision, processedBy) {
    if (this.disqualification.appeal_status !== 'pending') {
        throw new Error('Appeal is not pending');
    }
    
    this.disqualification.appeal_status = decision;
    this.disqualification.appeal_decision_at = new Date();
    this.disqualification.appeal_decision_by = processedBy;
    
    if (decision === 'approved') {
        this.registration_status = 'active';
        this.disqualification.is_disqualified = false;
    }
    
    return this.save();
};

// Instance method to claim prize
tournamentParticipantSchema.methods.claimPrize = function() {
    if (this.prizes.prize_claimed) {
        throw new Error('Prize already claimed');
    }
    
    if (this.prizes.prize_tier === 'none') {
        throw new Error('No prize available to claim');
    }
    
    this.prizes.prize_claimed = true;
    this.prizes.prize_claimed_at = new Date();
    
    return this.save();
};

// Instance method to get participant summary
tournamentParticipantSchema.methods.getSummary = function() {
    return {
        id: this.unique_id,
        tournament_id: this.tournament_id,
        user_id: this.user_id,
        status: this.registration_status,
        eligibility: this.eligibility_status,
        performance: {
            total_shares: this.performance_metrics.total_shares,
            verified_shares: this.performance_metrics.verified_shares,
            total_score: this.performance_metrics.total_score,
            current_rank: this.leaderboard_data.current_rank,
            rank_change: this.leaderboard_data.rank_change
        },
        prizes: {
            tier: this.prizes.prize_tier,
            eligible: this.prizes.eligible_for_prizes,
            claimed: this.prizes.prize_claimed
        },
        registration_date: this.registration_date,
        activation_date: this.activation_date
    };
};

const TournamentParticipant = mongoose.models.TournamentParticipant || mongoose.model('TournamentParticipant', tournamentParticipantSchema);

module.exports = TournamentParticipant;
