const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const platformUserSchema = new mongoose.Schema({
    unique_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    phone: { type: String },
    address: { type: Object, required: true },
    region: { type: String, required: true },
    preferred_regions: [{ type: String }],
    preferences: { type: Object, default: {} },
    total_apps_shared: { type: Number, default: 0 },
    total_xp_earned: { type: Number, default: 0 },
    total_points_earned: { type: Number, default: 0 },
    current_xp: { type: Number, default: 0 },
    current_points: { type: Number, default: 0 },
    user_level: { type: Number, default: 1 },
    last_payout_date: { type: Date },
    next_payout_date: { type: Date },
    total_payouts_received: { type: Number, default: 0.0 },
    total_badges_earned: { type: Number, default: 0 },
    badges_ids: [{ type: String }],
    total_tournaments_participated: { type: Number, default: 0 },
    total_tournaments_won: { type: Number, default: 0 },
    active_tournament_ids: [{ type: String }],
    sharing_streak_days: { type: Number, default: 0 },
    longest_sharing_streak: { type: Number, default: 0 },
    last_share_date: { type: Date },
    successful_referrals_count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    email_verified: { type: Boolean, default: false },
    kyc_status: { type: String, default: 'pending' },
    kyc_verified_at: { type: Date },
    bank_details: { type: Object },
    referral_code: { type: String, unique: true },
    referred_by: { type: String },
    referral_count: { type: Number, default: 0 },
    total_referrals_completed: { type: Number, default: 0 },
    total_referral_earnings: {
        xp: { type: Number, default: 0 },
        points: { type: Number, default: 0 }
    },
    mfa_enabled: { type: Boolean, default: false },
    last_login_at: { type: Date },
    login_attempts: { type: Number, default: 0 },
    locked_until: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    created_by: { type: String },
    points_to_usd_value: { type: Number, default: 0.0 },
});

// Hash password before saving
platformUserSchema.pre("save", async function (next) {
    // Generate referral code if not exists
    if (!this.referral_code && this.isNew) {
        this.generateReferralCode();
    }

    // Only hash password if it's modified and not already hashed
    if (this.isModified("password_hash")) {
        // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
        const isBcryptHash = /^\$2[aby]\$/.test(this.password_hash);

        if (!isBcryptHash) {
            // Password is plain text, hash it
            const config = require('../../../config');
            const saltRounds = config.security.bcryptRounds || 12;
            this.password_hash = await bcrypt.hash(this.password_hash, saltRounds);
        }
        // If it's already hashed, don't hash again
    }

    next();
});

// Compare password method
platformUserSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        if (!candidatePassword) {
            console.log('❌ No candidate password provided');
            return false;
        }

        if (!this.password_hash) {
            console.log('❌ No password hash stored in database');
            return false;
        }

        const result = await bcrypt.compare(candidatePassword, this.password_hash);
        return result;
    } catch (error) {
        console.error('❌ Error in comparePassword:', error);
        return false;
    }
};

// Generate unique referral code
platformUserSchema.methods.generateReferralCode = function () {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referral_code = `${this.name.substring(0, 3).toUpperCase()}${code}`;
    return this.referral_code;
};

// Update referral statistics
platformUserSchema.methods.updateReferralStats = function (xpEarned = 0, pointsEarned = 0) {
    this.total_referral_earnings.xp += xpEarned;
    this.total_referral_earnings.points += pointsEarned;
    this.total_referrals_completed += 1;
    return this.save();
};

// Get referral summary
platformUserSchema.methods.getReferralSummary = function () {
    return {
        referral_code: this.referral_code,
        total_referrals: this.referral_count,
        completed_referrals: this.total_referrals_completed,
        total_earnings: this.total_referral_earnings,
        success_rate: this.referral_count > 0 ?
            (this.total_referrals_completed / this.referral_count * 100).toFixed(2) : 0
    };
};

const PlatformUser = mongoose.models.PlatformUser || mongoose.model("PlatformUser", platformUserSchema);

module.exports = PlatformUser;