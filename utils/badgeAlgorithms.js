/**
 * Badge Algorithms - INGAIN Platform
 * 
 * This module contains all badge-related algorithms including eligibility checking,
 * badge granting, progress tracking, and comprehensive evaluation systems.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const Badge = require('../core/models/Common/Badge');
const UserBadge = require('../core/models/App/UserBadge');
const BadgeProgress = require('../core/models/Common/BadgeProgress');
const PlatformUser = require('../core/models/App/PlatformUser');

/**
 * Check if user is eligible for a specific badge
 */
async function checkBadgeEligibility(userId, badgeId, triggerEvent, currentUserStats) {
    try {
        const badge = await Badge.findOne({ unique_id: badgeId, is_active: true });
        if (!badge) return { eligible: false, reason: "badge_not_found" };

        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) return { eligible: false, reason: "user_not_found" };

        // Check if already earned (for non-repeatable badges)
        if (!badge.is_repeatable && user.badges_ids.includes(badgeId)) {
            return { eligible: false, reason: "already_earned" };
        }

        // Check seasonal availability
        if (badge.seasonal_start && badge.seasonal_end) {
            const now = new Date();
            if (now < badge.seasonal_start || now > badge.seasonal_end) {
                return { eligible: false, reason: "outside_seasonal_period" };
            }
        }

        // Check prerequisites
        if (badge.prerequisite_badges?.length > 0) {
            for (const prereqId of badge.prerequisite_badges) {
                if (!user.badges_ids.includes(prereqId)) {
                    return { eligible: false, reason: "prerequisite_missing" };
                }
            }
        }

        // Check exclusivity
        if (badge.exclusive_with?.length > 0) {
            for (const exclusiveId of badge.exclusive_with) {
                if (user.badges_ids.includes(exclusiveId)) {
                    return { eligible: false, reason: "exclusive_conflict" };
                }
            }
        }

        // Evaluate criteria
        const currentValue = badge.getCurrentValue(currentUserStats);
        const isEligible = badge.evaluateThreshold(currentValue);

        return {
            eligible: isEligible,
            reason: isEligible ? "eligible" : "threshold_not_met",
            current_value: currentValue,
            required_value: badge.threshold_value,
            progress_percentage: Math.min(100, (currentValue / badge.threshold_value) * 100),
            badge: badge
        };

    } catch (error) {
        console.error('Error in checkBadgeEligibility:', error);
        return { eligible: false, reason: "system_error" };
    }
}

/**
 * Grant a badge to a user
 */
async function grantBadge(userId, badgeId, achievementContext = {}) {
    try {
        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) return { success: false, reason: "user_not_found" };

        const currentUserStats = {
            current_xp: user.current_xp,
            total_points_earned: user.total_points_earned,
            total_apps_shared: user.total_apps_shared,
            total_tournaments_won: user.total_tournaments_won,
            sharing_streak_days: user.sharing_streak_days,
            successful_referrals_count: user.successful_referrals_count,
            user_level: user.user_level,
            total_badges_earned: user.total_badges_earned
        };

        const eligibilityCheck = await checkBadgeEligibility(userId, badgeId, "system_grant", currentUserStats);
        if (!eligibilityCheck.eligible) {
            return { success: false, reason: eligibilityCheck.reason };
        }

        const badge = eligibilityCheck.badge;

        // Create user badge record
        const userBadge = new UserBadge({
            user_id: userId,
            badge_id: badgeId,
            earned_at: new Date(),
            xp_awarded: badge.xp_value_gifted,
            points_awarded: badge.points_value_gifted,
            achievement_context: achievementContext,
            achievement_value: eligibilityCheck.current_value,
            streak_count: 1
        });

        await userBadge.save();

        // Update user
        if (!badge.is_repeatable) {
            user.badges_ids.push(badgeId);
        }
        user.total_badges_earned += 1;
        
        // Use updateReferralStats to update total XP and points earned consistently
        user.updateReferralStats(badge.xp_value_gifted, badge.points_value_gifted);
        
        // Update current XP and points (updateReferralStats only updates total earnings)
        user.current_xp += badge.xp_value_gifted;
        user.current_points += badge.points_value_gifted;

        // Recalculate level
        const newLevel = calculateUserLevel(user.current_xp);
        const levelChanged = newLevel !== user.user_level;
        user.user_level = newLevel;

        await user.save();

        // Update badge stats
        badge.users_achieved_count += 1;
        await badge.save();

        return {
            success: true,
            badge_earned: badge,
            rewards: {
                xp_awarded: badge.xp_value_gifted,
                points_awarded: badge.points_value_gifted
            },
            user_updates: {
                new_level: user.user_level,
                level_changed: levelChanged,
                total_badges_earned: user.total_badges_earned
            }
        };

    } catch (error) {
        console.error('Error in grantBadge:', error);
        return { success: false, reason: "system_error" };
    }
}

/**
 * Evaluate all badges for a user
 */
async function evaluateUserBadges(userId, triggerEvent, eventContext = {}) {
    try {
        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) return { success: false, reason: "user_not_found" };

        const currentUserStats = {
            current_xp: user.current_xp,
            current_points: user.current_points,
            user_level: user.user_level,
            total_xp_earned: user.total_xp_earned,
            total_points_earned: user.total_points_earned,
            total_apps_shared: user.total_apps_shared,
            total_tournaments_won: user.total_tournaments_won,
            sharing_streak_days: user.sharing_streak_days,
            successful_referrals_count: user.successful_referrals_count,
            total_badges_earned: user.total_badges_earned
        };

        const activeBadges = await Badge.find({ is_active: true });
        let newlyEarnedBadges = [];
        let totalXpAwarded = 0;
        let totalPointsAwarded = 0;

        // Evaluate each badge
        for (const badge of activeBadges) {
            const eligibilityCheck = await checkBadgeEligibility(
                userId, 
                badge.unique_id, 
                triggerEvent, 
                currentUserStats
            );

            if (eligibilityCheck.eligible) {
                const grantResult = await grantBadge(userId, badge.unique_id, eventContext);
                
                if (grantResult.success) {
                    newlyEarnedBadges.push(badge);
                    totalXpAwarded += badge.xp_value_gifted;
                    totalPointsAwarded += badge.points_value_gifted;
                    
                    // Update stats for next iteration
                    currentUserStats.current_xp += badge.xp_value_gifted;
                    currentUserStats.current_points += badge.points_value_gifted;
                    // Note: The actual user document will be updated via updateReferralStats when the badge is granted
                    // updateReferralStats will update total_xp_earned and total_points_earned
                    // We're just updating the tracking object here
                    currentUserStats.total_badges_earned += 1;
                }
            }
        }

        // Update badge progress
        await updateBadgeProgress(userId, currentUserStats);

        return {
            success: true,
            badges_evaluated: activeBadges.length,
            newly_earned_badges: newlyEarnedBadges,
            total_rewards: {
                total_xp_awarded: totalXpAwarded,
                total_points_awarded: totalPointsAwarded
            }
        };

    } catch (error) {
        console.error('Error in evaluateUserBadges:', error);
        return { success: false, reason: "system_error" };
    }
}

/**
 * Update badge progress tracking
 */
async function updateBadgeProgress(userId, currentUserStats) {
    try {
        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) return { success: false, reason: "user_not_found" };

        const activeBadges = await Badge.find({ is_active: true });

        for (const badge of activeBadges) {
            // Skip if user already has the badge
            if (user.badges_ids.includes(badge.unique_id)) {
                continue;
            }

            // Calculate current progress
            const currentValue = badge.getCurrentValue(currentUserStats);
            const progressPercentage = Math.min(100, (currentValue / badge.threshold_value) * 100);

            // Update progress record
            await BadgeProgress.findOneAndUpdate(
                { user_id: userId, badge_id: badge.unique_id },
                {
                    current_value: currentValue,
                    percentage_complete: progressPercentage,
                    last_updated: new Date()
                },
                { upsert: true, new: true }
            );
        }

        return { success: true };

    } catch (error) {
        console.error('Error in updateBadgeProgress:', error);
        return { success: false, reason: "system_error" };
    }
}

/**
 * Calculate user level based on XP
 */
function calculateUserLevel(xp) {
    return 1 + Math.floor(Math.sqrt(xp / 100));
}

/**
 * Find next closest badges for user
 */
async function findNextClosestBadges(userId, currentUserStats) {
    try {
        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) return [];

        const activeBadges = await Badge.find({ is_active: true });
        const closestBadges = [];

        for (const badge of activeBadges) {
            if (user.badges_ids.includes(badge.unique_id)) {
                continue;
            }

            const currentValue = badge.getCurrentValue(currentUserStats);
            const progressPercentage = (currentValue / badge.threshold_value) * 100;

            if (progressPercentage >= 50) {
                closestBadges.push({
                    badge_id: badge.unique_id,
                    badge_name: badge.badge_name,
                    badge_icon: badge.badge_icon,
                    rarity: badge.rarity,
                    progress_percentage: progressPercentage,
                    current_value: currentValue,
                    threshold_value: badge.threshold_value
                });
            }
        }

        return closestBadges
            .sort((a, b) => b.progress_percentage - a.progress_percentage)
            .slice(0, 5);

    } catch (error) {
        console.error('Error in findNextClosestBadges:', error);
        return [];
    }
}

module.exports = {
    checkBadgeEligibility,
    grantBadge,
    evaluateUserBadges,
    updateBadgeProgress,
    calculateUserLevel,
    findNextClosestBadges
};
