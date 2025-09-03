/**
 * Share Algorithms - INGAIN Platform
 * 
 * This module contains all share-related algorithms including share type determination,
 * reward calculations for regular and tournament shares, and share verification logic.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const App = require('../core/models/App/App');
const Tournament = require('../core/models/Common/Tournament');
const ShareLog = require('../core/models/Technical/ShareLog');
const PlatformUser = require('../core/models/App/PlatformUser');

/**
 * Algorithm 5: Share Type Determination
 * Purpose: Determine whether a share is tournament or regular type
 * 
 * @param {string} userId - User's unique ID
 * @param {string} appId - App's unique ID
 * @param {string} tournamentId - Tournament ID (optional)
 * @returns {Object} Share type determination result
 */
async function determineShareType(userId, appId, tournamentId = null) {
    try {
        // STEP 1: Check Tournament Context
        if (tournamentId) {
            const tournament = await Tournament.findOne({ unique_id: tournamentId });
            if (!tournament) {
                return { share_type: "regular", reason: "tournament_not_found" };
            }
            
            if (tournament.status !== "live") {
                return { share_type: "regular", reason: "tournament_not_active" };
            }
            
            if (!tournament.apps_involved.includes(appId)) {
                return { share_type: "regular", reason: "app_not_in_tournament" };
            }
            
            // Check if user is registered in tournament
            // This would typically query tournament_participants table
            const isRegistered = true; // Placeholder - implement actual check
            
            if (!isRegistered) {
                return { share_type: "regular", reason: "user_not_registered" };
            }
            
            return { share_type: "tournament", tournament: tournament };
        }

        // STEP 2: Auto-detect Tournament Eligibility
        const activeTournaments = await Tournament.find({
            status: "live",
            start_date: { $lte: new Date() },
            end_date: { $gte: new Date() }
        });

        for (const tournament of activeTournaments) {
            if (tournament.apps_involved.includes(appId)) {
                // Check if user is registered and eligible
                const isRegistered = true; // Placeholder - implement actual check
                const user = await PlatformUser.findOne({ unique_id: userId });
                
                if (isRegistered && user) {
                    const regionEligible = tournament.eligible_regions.includes('GLOBAL') || 
                                         tournament.eligible_regions.includes(user.region);
                    
                    if (regionEligible) {
                        return { 
                            share_type: "tournament", 
                            tournament: tournament, 
                            auto_detected: true 
                        };
                    }
                }
            }
        }

        // STEP 3: Default to Regular Share
        return { 
            share_type: "regular", 
            available_tournaments: activeTournaments.filter(t => 
                t.apps_involved.includes(appId)
            )
        };

    } catch (error) {
        console.error('Error in determineShareType:', error);
        return { share_type: "regular", reason: "system_error" };
    }
}

/**
 * Algorithm 6: Regular App Share Reward Calculation
 * Purpose: Calculate rewards for non-tournament app shares
 * 
 * @param {string} userId - User's unique ID
 * @param {string} appId - App's unique ID
 * @param {Object} shareVerificationResult - Share verification result
 * @returns {Object} Reward calculation result
 */
async function calculateRegularShareRewards(userId, appId, shareVerificationResult = {}) {
    try {
        // STEP 1: Get Base App Rewards
        const app = await App.findOne({ unique_id: appId });
        if (!app) {
            return { success: false, reason: "app_not_found" };
        }

        let baseXp = app.app_xp;
        let basePoints = app.app_points;

        // STEP 2: Apply User-Level Bonuses
        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) {
            return { success: false, reason: "user_not_found" };
        }

        if (user.user_level >= 10) {
            const veteranBonusMultiplier = 1.1; // 10% bonus for level 10+ users
            baseXp = Math.round(baseXp * veteranBonusMultiplier);
            basePoints = Math.round(basePoints * veteranBonusMultiplier);
        }

        // STEP 3: Apply Streak Bonuses
        let streakBonusXp = 0;
        let streakBonusPoints = 0;
        
        if (user.sharing_streak_days >= 7) {
            streakBonusXp = Math.round(baseXp * 0.2); // 20% bonus for 7+ day streaks
            streakBonusPoints = Math.round(basePoints * 0.1); // 10% bonus for 7+ day streaks
        }

        // STEP 4: Apply First-Time App Bonus
        const previousShares = await ShareLog.countDocuments({
            user_id: userId,
            app_id: appId,
            validation_status: "verified"
        });

        let firstTimeBonusXp = 0;
        let firstTimeBonusPoints = 0;
        
        if (previousShares === 0) {
            firstTimeBonusXp = Math.round(baseXp * 0.5); // 50% bonus for first share of app
            firstTimeBonusPoints = Math.round(basePoints * 0.25); // 25% bonus for first share of app
        }

        // STEP 5: Apply Category Diversity Bonus
        const userCategoriesShared = await ShareLog.distinct('app_id', {
            user_id: userId,
            validation_status: "verified"
        });

        const userApps = await App.find({ unique_id: { $in: userCategoriesShared } });
        const userCategories = new Set();
        userApps.forEach(userApp => {
            userApp.categories.forEach(category => userCategories.add(category));
        });

        let diversityBonusXp = 0;
        let diversityBonusPoints = 0;
        
        if (userCategories.size >= 5) {
            const appCategories = new Set(app.categories);
            const hasNewCategory = Array.from(appCategories).some(category => !userCategories.has(category));
            
            if (hasNewCategory) {
                diversityBonusXp = 25;
                diversityBonusPoints = 5;
            }
        }

        // STEP 6: Calculate Final Rewards
        const totalXp = baseXp + streakBonusXp + firstTimeBonusXp + diversityBonusXp;
        const totalPoints = basePoints + streakBonusPoints + firstTimeBonusPoints + diversityBonusPoints;

        // STEP 7: Return Reward Breakdown
        return {
            success: true,
            total_xp: totalXp,
            total_points: totalPoints,
            breakdown: {
                base_xp: baseXp,
                base_points: basePoints,
                streak_bonus_xp: streakBonusXp,
                streak_bonus_points: streakBonusPoints,
                first_time_bonus_xp: firstTimeBonusXp,
                first_time_bonus_points: firstTimeBonusPoints,
                diversity_bonus_xp: diversityBonusXp,
                diversity_bonus_points: diversityBonusPoints
            }
        };

    } catch (error) {
        console.error('Error in calculateRegularShareRewards:', error);
        return { success: false, reason: "system_error" };
    }
}

/**
 * Algorithm 7: Tournament App Share Reward Calculation
 * Purpose: Calculate rewards for tournament app shares with bonuses
 * 
 * @param {string} userId - User's unique ID
 * @param {string} appId - App's unique ID
 * @param {string} tournamentId - Tournament's unique ID
 * @param {Object} shareVerificationResult - Share verification result
 * @returns {Object} Tournament reward calculation result
 */
async function calculateTournamentShareRewards(userId, appId, tournamentId, shareVerificationResult = {}) {
    try {
        // STEP 1: Get Base Rewards
        const baseRewards = await calculateRegularShareRewards(userId, appId, shareVerificationResult);
        if (!baseRewards.success) {
            return baseRewards;
        }

        // STEP 2: Get Tournament Configuration
        const tournament = await Tournament.findOne({ unique_id: tournamentId });
        if (!tournament) {
            return { success: false, reason: "tournament_not_found" };
        }

        const tournamentMultiplier = tournament.reward_multiplier || 1.5;

        // STEP 3: Apply Tournament Multiplier
        const tournamentXpBonus = Math.round(baseRewards.total_xp * (tournamentMultiplier - 1.0));
        const tournamentPointsBonus = Math.round(baseRewards.total_points * (tournamentMultiplier - 1.0));

        // STEP 4: Apply Tournament Performance Bonuses
        // This would typically query tournament_participants table
        const participantRank = 1; // Placeholder - implement actual ranking
        const totalParticipants = tournament.total_participants || 100;

        let performanceBonusXp = 0;
        let performanceBonusPoints = 0;

        if (participantRank <= (totalParticipants * 0.1)) { // Top 10%
            performanceBonusXp = Math.round(baseRewards.total_xp * 0.3); // 30% bonus
            performanceBonusPoints = Math.round(baseRewards.total_points * 0.15); // 15% bonus
        } else if (participantRank <= (totalParticipants * 0.25)) { // Top 25%
            performanceBonusXp = Math.round(baseRewards.total_xp * 0.2); // 20% bonus
            performanceBonusPoints = Math.round(baseRewards.total_points * 0.1); // 10% bonus
        }

        // STEP 5: Apply Tournament Streak Bonus
        const tournamentShareDays = await ShareLog.distinct('created_at', {
            user_id: userId,
            tournament_id: tournamentId,
            validation_status: "verified"
        });

        const uniqueDays = new Set(tournamentShareDays.map(date => 
            new Date(date).toDateString()
        )).size;

        let tournamentStreakXp = 0;
        let tournamentStreakPoints = 0;

        if (uniqueDays >= 3) {
            tournamentStreakXp = 20 * uniqueDays;
            tournamentStreakPoints = 5 * uniqueDays;
        }

        // STEP 6: Calculate Final Tournament Rewards
        const totalXp = baseRewards.total_xp + tournamentXpBonus + performanceBonusXp + tournamentStreakXp;
        const totalPoints = baseRewards.total_points + tournamentPointsBonus + performanceBonusPoints + tournamentStreakPoints;

        // STEP 7: Return Comprehensive Breakdown
        return {
            success: true,
            total_xp: totalXp,
            total_points: totalPoints,
            base_rewards: baseRewards,
            tournament_bonuses: {
                tournament_xp_bonus: tournamentXpBonus,
                tournament_points_bonus: tournamentPointsBonus,
                performance_bonus_xp: performanceBonusXp,
                performance_bonus_points: performanceBonusPoints,
                tournament_streak_xp: tournamentStreakXp,
                tournament_streak_points: tournamentStreakPoints
            }
        };

    } catch (error) {
        console.error('Error in calculateTournamentShareRewards:', error);
        return { success: false, reason: "system_error" };
    }
}

/**
 * Calculate rewards for a share based on its type
 * 
 * @param {string} userId - User's unique ID
 * @param {string} appId - App's unique ID
 * @param {string} tournamentId - Tournament ID (optional)
 * @param {Object} shareVerificationResult - Share verification result
 * @returns {Object} Reward calculation result
 */
async function calculateShareRewards(userId, appId, tournamentId = null, shareVerificationResult = {}) {
    try {
        const shareType = await determineShareType(userId, appId, tournamentId);
        
        if (shareType.share_type === "tournament" && tournamentId) {
            return await calculateTournamentShareRewards(userId, appId, tournamentId, shareVerificationResult);
        } else {
            return await calculateRegularShareRewards(userId, appId, shareVerificationResult);
        }

    } catch (error) {
        console.error('Error in calculateShareRewards:', error);
        return { success: false, reason: "system_error" };
    }
}

/**
 * Update user sharing streak
 * 
 * @param {string} userId - User's unique ID
 * @returns {Promise<Object>} Updated streak information
 */
async function updateUserSharingStreak(userId) {
    try {
        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) {
            return { success: false, reason: "user_not_found" };
        }

        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

        // Get user's share dates
        const shareDates = await ShareLog.distinct('created_at', {
            user_id: userId,
            validation_status: "verified"
        });

        const shareDateStrings = shareDates.map(date => new Date(date).toDateString());
        const hasSharedToday = shareDateStrings.includes(today);
        const hasSharedYesterday = shareDateStrings.includes(yesterday);

        let newStreak = user.sharing_streak_days || 0;

        if (hasSharedToday) {
            // User already shared today, streak continues
            newStreak = Math.max(newStreak, 1);
        } else if (hasSharedYesterday) {
            // User shared yesterday, increment streak
            newStreak += 1;
        } else {
            // Break in streak, reset to 1 if shared today, 0 otherwise
            newStreak = hasSharedToday ? 1 : 0;
        }

        // Update user streak
        user.sharing_streak_days = newStreak;
        user.longest_sharing_streak = Math.max(user.longest_sharing_streak || 0, newStreak);
        user.last_share_date = hasSharedToday ? new Date() : user.last_share_date;

        await user.save();

        return {
            success: true,
            current_streak: newStreak,
            longest_streak: user.longest_sharing_streak,
            has_shared_today: hasSharedToday
        };

    } catch (error) {
        console.error('Error in updateUserSharingStreak:', error);
        return { success: false, reason: "system_error" };
    }
}

/**
 * Validate share limits and restrictions
 * 
 * @param {string} userId - User's unique ID
 * @param {string} appId - App's unique ID
 * @returns {Object} Validation result
 */
async function validateShareLimits(userId, appId) {
    try {
        const app = await App.findOne({ unique_id: appId });
        if (!app) {
            return { valid: false, reason: "app_not_found" };
        }

        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) {
            return { valid: false, reason: "user_not_found" };
        }

        const shareRules = app.share_rules || {};
        const today = new Date().toDateString();

        // Check user daily limit
        const userSharesToday = await ShareLog.countDocuments({
            user_id: userId,
            app_id: appId,
            created_at: {
                $gte: new Date(today),
                $lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (userSharesToday >= (shareRules.daily_user_limit || 10)) {
            return { valid: false, reason: "user_daily_limit_exceeded" };
        }

        // Check global daily limit
        const globalSharesToday = await ShareLog.countDocuments({
            app_id: appId,
            created_at: {
                $gte: new Date(today),
                $lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (globalSharesToday >= (shareRules.daily_global_limit || 1000)) {
            return { valid: false, reason: "global_daily_limit_exceeded" };
        }

        // Check cooldown period
        const lastShare = await ShareLog.findOne({
            user_id: userId,
            app_id: appId
        }).sort({ created_at: -1 });

        if (lastShare) {
            const cooldownMinutes = shareRules.cooldown_minutes || 30;
            const timeSinceLastShare = (new Date() - lastShare.created_at) / (1000 * 60);
            
            if (timeSinceLastShare < cooldownMinutes) {
                return { valid: false, reason: "cooldown_active" };
            }
        }

        // Check user level requirement
        const minLevel = shareRules.min_user_level || 1;
        if (user.user_level < minLevel) {
            return { valid: false, reason: "level_too_low" };
        }

        // Check app budget
        if (!app.hasSufficientBudget()) {
            return { valid: false, reason: "app_budget_exhausted" };
        }

        return { valid: true };

    } catch (error) {
        console.error('Error in validateShareLimits:', error);
        return { valid: false, reason: "system_error" };
    }
}

module.exports = {
    determineShareType,
    calculateRegularShareRewards,
    calculateTournamentShareRewards,
    calculateShareRewards,
    updateUserSharingStreak,
    validateShareLimits
};
