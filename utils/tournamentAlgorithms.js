/**
 * INGAIN Tournament Algorithms Utility
 * 
 * This utility implements all tournament-related algorithms including:
 * - Tournament reward calculations with bonuses
 * - Scoring and leaderboard management
 * - Participant registration and management
 * - Tournament performance tracking
 * - Prize distribution algorithms
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const Tournament = require('../core/models/Common/Tournament');
const ShareLog = require('../core/models/Technical/ShareLog');
const PlatformUser = require('../core/models/App/PlatformUser');

/**
 * Algorithm 7: Tournament App Share Reward Calculation
 * 
 * Calculates enhanced rewards for shares made during active tournaments.
 * Includes tournament multiplier, performance bonuses, and streak rewards.
 * 
 * @param {string} userId - User ID making the share
 * @param {string} appId - App being shared
 * @param {string} tournamentId - Active tournament ID
 * @param {Object} shareVerificationResult - Share verification data
 * @returns {Object} Enhanced rewards with tournament bonuses
 */
async function calculateTournamentShareReward(userId, appId, tournamentId, shareVerificationResult) {
    try {
        // Get base rewards from regular share algorithm
        const { calculateRegularShareReward } = require('./shareAlgorithms');
        const baseRewards = await calculateRegularShareReward(userId, appId, shareVerificationResult);
        
        // Get tournament details
        const tournament = await Tournament.findOne({ unique_id: tournamentId });
        if (!tournament) {
            throw new Error('Tournament not found');
        }
        
        // Get participant details
        const participant = await getTournamentParticipant(tournamentId, userId);
        if (!participant) {
            throw new Error('User not registered for tournament');
        }
        
        // Tournament multiplier bonus
        const tournamentMultiplier = tournament.tournament_rules?.bonus_multiplier || 1.5;
        const tournamentXpBonus = Math.round(baseRewards.total_xp * (tournamentMultiplier - 1.0));
        const tournamentPointsBonus = Math.round(baseRewards.total_points * (tournamentMultiplier - 1.0));
        
        // Performance bonus based on current rank
        let performanceBonusXp = 0, performanceBonusPoints = 0;
        if (participant.current_rank && tournament.total_participants) {
            const rankPercentage = participant.current_rank / tournament.total_participants;
            
            if (rankPercentage <= 0.1) { // Top 10%
                performanceBonusXp = Math.round(baseRewards.total_xp * 0.3);
                performanceBonusPoints = Math.round(baseRewards.total_points * 0.15);
            } else if (rankPercentage <= 0.25) { // Top 25%
                performanceBonusXp = Math.round(baseRewards.total_xp * 0.2);
                performanceBonusPoints = Math.round(baseRewards.total_points * 0.1);
            } else if (rankPercentage <= 0.5) { // Top 50%
                performanceBonusXp = Math.round(baseRewards.total_xp * 0.1);
                performanceBonusPoints = Math.round(baseRewards.total_points * 0.05);
            }
        }
        
        // Tournament streak bonus
        const tournamentShareDays = await ShareLog.distinct('created_at', {
            user_id: userId,
            tournament_id: tournamentId,
            validation_status: 'verified'
        });
        
        let tournamentStreakXp = 0, tournamentStreakPoints = 0;
        const uniqueDays = new Set(tournamentShareDays.map(date => date.toDateString())).size;
        
        if (uniqueDays >= 3) {
            tournamentStreakXp = 20 * uniqueDays;
            tournamentStreakPoints = 5 * uniqueDays;
        }
        
        // Special event bonus (if applicable)
        let specialEventBonusXp = 0, specialEventBonusPoints = 0;
        if (tournament.tournament_category === 'special_event' || tournament.is_featured) {
            specialEventBonusXp = Math.round(baseRewards.total_xp * 0.2);
            specialEventBonusPoints = Math.round(baseRewards.total_points * 0.1);
        }
        
        // Final rewards calculation
        const totalXp = Math.round(
            baseRewards.total_xp + 
            tournamentXpBonus + 
            performanceBonusXp + 
            tournamentStreakXp + 
            specialEventBonusXp
        );
        
        const totalPoints = Math.round(
            baseRewards.total_points + 
            tournamentPointsBonus + 
            performanceBonusPoints + 
            tournamentStreakPoints + 
            specialEventBonusPoints
        );
        
        return {
            total_xp: totalXp,
            total_points: totalPoints,
            base_rewards: baseRewards,
            tournament_bonuses: {
                tournament_xp_bonus: tournamentXpBonus,
                tournament_points_bonus: tournamentPointsBonus,
                performance_bonus_xp: performanceBonusXp,
                performance_bonus_points: performanceBonusPoints,
                tournament_streak_xp: tournamentStreakXp,
                tournament_streak_points: tournamentStreakPoints,
                special_event_bonus_xp: specialEventBonusXp,
                special_event_bonus_points: specialEventBonusPoints
            },
            tournament_info: {
                tournament_id: tournamentId,
                tournament_name: tournament.tournament_name,
                multiplier: tournamentMultiplier,
                current_rank: participant.current_rank,
                total_participants: tournament.total_participants
            }
        };
        
    } catch (error) {
        console.error('Error calculating tournament share reward:', error);
        throw error;
    }
}

/**
 * Algorithm 8: Tournament Scoring and Leaderboard Update
 * 
 * Updates tournament scores and recalculates leaderboard rankings.
 * Handles scoring methods, tie-breaking, and performance tracking.
 * 
 * @param {string} tournamentId - Tournament ID to update
 * @param {string} userId - User ID whose score is being updated
 * @returns {Object} Updated leaderboard and user ranking
 */
async function updateTournamentScore(tournamentId, userId) {
    try {
        const tournament = await Tournament.findOne({ unique_id: tournamentId });
        if (!tournament) {
            throw new Error('Tournament not found');
        }
        
        // Get user's tournament performance
        const userShares = await ShareLog.find({
            user_id: userId,
            tournament_id: tournamentId,
            validation_status: 'verified'
        });
        
        // Calculate score based on tournament rules
        const scoringMethod = tournament.tournament_rules?.scoring_method || 'shares_count';
        let userScore = 0;
        
        switch (scoringMethod) {
            case 'shares_count':
                userScore = userShares.length;
                break;
                
            case 'xp_earned':
                userScore = userShares.reduce((total, share) => total + (share.xp_awarded || 0), 0);
                break;
                
            case 'points_earned':
                userScore = userShares.reduce((total, share) => total + (share.points_awarded || 0), 0);
                break;
                
            case 'weighted_score':
                userScore = userShares.reduce((total, share) => {
                    const xpWeight = 0.6;
                    const pointsWeight = 0.4;
                    return total + ((share.xp_awarded || 0) * xpWeight) + ((share.points_awarded || 0) * pointsWeight);
                }, 0);
                break;
                
            default:
                userScore = userShares.length;
        }
        
        // Apply bonus multipliers
        const bonusMultiplier = tournament.tournament_rules?.bonus_multiplier || 1.0;
        userScore = Math.round(userScore * bonusMultiplier);
        
        // Update or create participant record
        await updateTournamentParticipant(tournamentId, userId, userScore);
        
        // Recalculate leaderboard
        const leaderboard = await recalculateTournamentLeaderboard(tournamentId);
        
        return {
            user_score: userScore,
            user_rank: leaderboard.find(p => p.user_id === userId)?.rank || null,
            leaderboard: leaderboard.slice(0, 100), // Top 100
            tournament_status: tournament.status
        };
        
    } catch (error) {
        console.error('Error updating tournament score:', error);
        throw error;
    }
}

/**
 * Algorithm 9: Tournament Registration and Eligibility Check
 * 
 * Handles user registration for tournaments with eligibility validation.
 * Checks user level, region, and previous participation.
 * 
 * @param {string} tournamentId - Tournament ID to register for
 * @param {string} userId - User ID requesting registration
 * @returns {Object} Registration result and participant details
 */
async function registerForTournament(tournamentId, userId) {
    try {
        const tournament = await Tournament.findOne({ unique_id: tournamentId });
        if (!tournament) {
            throw new Error('Tournament not found');
        }
        
        const user = await PlatformUser.findOne({ unique_id: userId });
        if (!user) {
            throw new Error('User not found');
        }
        
        // Check tournament status
        if (tournament.status !== 'scheduled' && tournament.status !== 'active') {
            throw new Error('Tournament is not accepting registrations');
        }
        
        // Check eligibility criteria
        const eligibilityCheck = await checkTournamentEligibility(tournament, user);
        if (!eligibilityCheck.eligible) {
            return {
                success: false,
                eligible: false,
                reason: eligibilityCheck.reason
            };
        }
        
        // Check if already registered
        const existingParticipant = await getTournamentParticipant(tournamentId, userId);
        if (existingParticipant) {
            return {
                success: false,
                eligible: true,
                reason: 'Already registered for this tournament'
            };
        }
        
        // Create participant record
        const participant = await createTournamentParticipant(tournamentId, userId);
        
        // Update tournament participant count
        await Tournament.updateOne(
            { unique_id: tournamentId },
            { $inc: { total_participants: 1 } }
        );
        
        return {
            success: true,
            eligible: true,
            participant: participant,
            tournament: {
                name: tournament.tournament_name,
                start_date: tournament.start_date,
                end_date: tournament.end_date,
                rules: tournament.tournament_rules
            }
        };
        
    } catch (error) {
        console.error('Error registering for tournament:', error);
        throw error;
    }
}

/**
 * Algorithm 10: Tournament Performance Analytics
 * 
 * Analyzes tournament performance and generates insights.
 * Tracks user engagement, conversion rates, and success metrics.
 * 
 * @param {string} tournamentId - Tournament ID to analyze
 * @returns {Object} Performance analytics and insights
 */
async function analyzeTournamentPerformance(tournamentId) {
    try {
        const tournament = await Tournament.findOne({ unique_id: tournamentId });
        if (!tournament) {
            throw new Error('Tournament not found');
        }
        
        // Get all tournament shares
        const tournamentShares = await ShareLog.find({
            tournament_id: tournamentId,
            validation_status: 'verified'
        });
        
        // Calculate key metrics
        const totalShares = tournamentShares.length;
        const uniqueParticipants = new Set(tournamentShares.map(s => s.user_id)).size;
        const totalXpDistributed = tournamentShares.reduce((sum, share) => sum + (share.xp_awarded || 0), 0);
        const totalPointsDistributed = tournamentShares.reduce((sum, share) => sum + (share.points_awarded || 0), 0);
        
        // Engagement metrics
        const averageSharesPerUser = totalShares / uniqueParticipants || 0;
        const activeUsers = tournamentShares.filter(s => 
            s.created_at >= new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;
        
        // Conversion metrics
        const conversionRate = tournament.total_participants > 0 ? 
            (uniqueParticipants / tournament.total_participants) * 100 : 0;
        
        // Performance distribution
        const performanceDistribution = await calculatePerformanceDistribution(tournamentId);
        
        return {
            tournament_id: tournamentId,
            tournament_name: tournament.tournament_name,
            metrics: {
                total_shares: totalShares,
                unique_participants: uniqueParticipants,
                total_participants: tournament.total_participants,
                total_xp_distributed: totalXpDistributed,
                total_points_distributed: totalPointsDistributed,
                average_shares_per_user: averageSharesPerUser,
                active_users_last_24h: activeUsers,
                conversion_rate: conversionRate
            },
            performance_distribution: performanceDistribution,
            status: tournament.status,
            duration: {
                start_date: tournament.start_date,
                end_date: tournament.end_date,
                days_remaining: Math.max(0, Math.ceil((tournament.end_date - new Date()) / (1000 * 60 * 60 * 24)))
            }
        };
        
    } catch (error) {
        console.error('Error analyzing tournament performance:', error);
        throw error;
    }
}

/**
 * Algorithm 11: Tournament Prize Distribution
 * 
 * Calculates and distributes prizes based on final rankings.
 * Handles tie-breaking, prize allocation, and winner notifications.
 * 
 * @param {string} tournamentId - Tournament ID to distribute prizes for
 * @returns {Object} Prize distribution results and winner details
 */
async function distributeTournamentPrizes(tournamentId) {
    try {
        const tournament = await Tournament.findOne({ unique_id: tournamentId });
        if (!tournament) {
            throw new Error('Tournament not found');
        }
        
        if (tournament.status !== 'completed') {
            throw new Error('Tournament must be completed to distribute prizes');
        }
        
        // Get final leaderboard
        const leaderboard = await recalculateTournamentLeaderboard(tournamentId);
        
        // Initialize prize distribution
        const prizeDistribution = {
            winners: [],
            total_prizes_distributed: {
                xp: 0,
                points: 0,
                cash: 0
            }
        };
        
        // Distribute prizes based on ranking
        const prizes = tournament.prizes || {};
        let currentRank = 1;
        let previousScore = null;
        
        for (let i = 0; i < leaderboard.length; i++) {
            const participant = leaderboard[i];
            
            // Handle ties (same score gets same rank)
            if (previousScore !== null && participant.score !== previousScore) {
                currentRank = i + 1;
            }
            previousScore = participant.score;
            
            // Determine prize based on rank
            let prize = null;
            if (currentRank === 1 && prizes.first_place) {
                prize = prizes.first_place;
            } else if (currentRank === 2 && prizes.second_place) {
                prize = prizes.second_place;
            } else if (currentRank === 3 && prizes.third_place) {
                prize = prizes.third_place;
            } else if (currentRank <= 10 && prizes.top_10) {
                prize = prizes.top_10;
            } else if (prizes.participation) {
                prize = prizes.participation;
            }
            
            if (prize) {
                // Award prizes to user
                await awardTournamentPrizes(participant.user_id, prize, tournamentId);
                
                prizeDistribution.winners.push({
                    rank: currentRank,
                    user_id: participant.user_id,
                    user_name: participant.user_name,
                    score: participant.score,
                    prizes_awarded: prize
                });
                
                // Update total prizes
                prizeDistribution.total_prizes_distributed.xp += prize.xp || 0;
                prizeDistribution.total_prizes_distributed.points += prize.points || 0;
                prizeDistribution.total_prizes_distributed.cash += prize.cash || 0;
            }
        }
        
        // Update tournament status
        await Tournament.updateOne(
            { unique_id: tournamentId },
            { 
                status: 'prizes_distributed',
                prizes_distributed_at: new Date(),
                final_leaderboard: leaderboard.slice(0, 100)
            }
        );
        
        return prizeDistribution;
        
    } catch (error) {
        console.error('Error distributing tournament prizes:', error);
        throw error;
    }
}

// Helper Functions

/**
 * Get tournament participant record
 */
async function getTournamentParticipant(tournamentId, userId) {
    // This would typically query a TournamentParticipant collection
    // For now, return a mock participant
    return {
        user_id: userId,
        tournament_id: tournamentId,
        current_rank: 1,
        total_score: 0,
        shares_count: 0,
        registered_at: new Date()
    };
}

/**
 * Update tournament participant record
 */
async function updateTournamentParticipant(tournamentId, userId, score) {
    // This would typically update a TournamentParticipant collection
    console.log(`Updating participant ${userId} in tournament ${tournamentId} with score ${score}`);
}

/**
 * Create new tournament participant
 */
async function createTournamentParticipant(tournamentId, userId) {
    // This would typically create a TournamentParticipant record
    return {
        user_id: userId,
        tournament_id: tournamentId,
        current_rank: null,
        total_score: 0,
        shares_count: 0,
        registered_at: new Date()
    };
}

/**
 * Check tournament eligibility for a user
 */
async function checkTournamentEligibility(tournament, user) {
    // Check user level requirement
    if (tournament.tournament_rules?.min_user_level && user.user_level < tournament.tournament_rules.min_user_level) {
        return {
            eligible: false,
            reason: `Minimum user level ${tournament.tournament_rules.min_user_level} required`
        };
    }
    
    // Check region eligibility
    if (tournament.eligible_regions && !tournament.eligible_regions.includes('GLOBAL')) {
        if (!tournament.eligible_regions.includes(user.region)) {
            return {
                eligible: false,
                reason: `Tournament not available in your region (${user.region})`
            };
        }
    }
    
    // Check if user is active
    if (!user.is_active) {
        return {
            eligible: false,
            reason: 'Account must be active to participate'
        };
    }
    
    return { eligible: true };
}

/**
 * Recalculate tournament leaderboard
 */
async function recalculateTournamentLeaderboard(tournamentId) {
    // This would typically query and sort TournamentParticipant records
    // For now, return a mock leaderboard
    return [
        { user_id: 'user1', user_name: 'User 1', score: 100, rank: 1 },
        { user_id: 'user2', user_name: 'User 2', score: 85, rank: 2 },
        { user_id: 'user3', user_name: 'User 3', score: 70, rank: 3 }
    ];
}

/**
 * Calculate performance distribution
 */
async function calculatePerformanceDistribution(tournamentId) {
    // This would analyze participant performance distribution
    return {
        top_10_percent: 10,
        top_25_percent: 25,
        top_50_percent: 50,
        average_score: 75,
        median_score: 70
    };
}

/**
 * Award tournament prizes to user
 */
async function awardTournamentPrizes(userId, prizes, tournamentId) {
    // This would update user's XP and Points, and create payment records
    console.log(`Awarding prizes to user ${userId}:`, prizes);
}

module.exports = {
    calculateTournamentShareReward,
    updateTournamentScore,
    registerForTournament,
    analyzeTournamentPerformance,
    distributeTournamentPrizes
};
