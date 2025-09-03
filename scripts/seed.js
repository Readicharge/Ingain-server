/**
 * Database Seeding Script - INGAIN Platform
 * 
 * This script populates the database with initial data including:
 * - Sample apps with reward configurations
 * - Badge definitions and criteria
 * - Tournament templates
 * - Admin user account
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import models
const PlatformUser = require('../core/models/App/PlatformUser');
const App = require('../core/models/App/App');
const Badge = require('../core/models/Common/Badge');
const Tournament = require('../core/models/Common/Tournament');
const Category = require('../core/models/Common/Category');

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ingain', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Database connected for seeding');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

// Sample data
const sampleCategories = [
    { name: 'Gaming', description: 'Mobile and web games' },
    { name: 'Productivity', description: 'Tools and utilities' },
    { name: 'Social', description: 'Social networking apps' },
    { name: 'Entertainment', description: 'Media and entertainment' },
    { name: 'Education', description: 'Learning and educational apps' },
    { name: 'Finance', description: 'Financial and banking apps' },
    { name: 'Health', description: 'Health and fitness apps' },
    { name: 'Shopping', description: 'E-commerce and shopping' }
];

const sampleApps = [
    {
        app_name: 'TaskMaster Pro',
        app_description: 'Advanced task management and productivity app',
        app_xp: 50,
        app_points: 10,
        categories: ['productivity'],
        is_featured: true,
        geo_availability: ['GLOBAL'],
        share_rules: {
            daily_user_limit: 15,
            daily_global_limit: 2000,
            cooldown_minutes: 20,
            min_user_level: 1
        }
    },
    {
        app_name: 'SocialConnect',
        app_description: 'Connect with friends and share moments',
        app_xp: 30,
        app_points: 5,
        categories: ['social'],
        is_featured: false,
        geo_availability: ['US', 'UK', 'CA'],
        share_rules: {
            daily_user_limit: 20,
            daily_global_limit: 5000,
            cooldown_minutes: 15,
            min_user_level: 1
        }
    },
    {
        app_name: 'FitnessTracker',
        app_description: 'Track your fitness goals and progress',
        app_xp: 40,
        app_points: 8,
        categories: ['health'],
        is_featured: true,
        geo_availability: ['GLOBAL'],
        share_rules: {
            daily_user_limit: 12,
            daily_global_limit: 1500,
            cooldown_minutes: 25,
            min_user_level: 2
        }
    },
    {
        app_name: 'LearnCode',
        app_description: 'Learn programming with interactive lessons',
        app_xp: 60,
        app_points: 12,
        categories: ['education'],
        is_featured: true,
        geo_availability: ['GLOBAL'],
        share_rules: {
            daily_user_limit: 10,
            daily_global_limit: 1000,
            cooldown_minutes: 30,
            min_user_level: 1
        }
    },
    {
        app_name: 'GameZone',
        app_description: 'Collection of addictive mobile games',
        app_xp: 25,
        app_points: 3,
        categories: ['gaming'],
        is_featured: false,
        geo_availability: ['GLOBAL'],
        share_rules: {
            daily_user_limit: 25,
            daily_global_limit: 8000,
            cooldown_minutes: 10,
            min_user_level: 1
        }
    }
];

const sampleBadges = [
    {
        badge_name: 'First Share',
        badge_description: 'Share your first app successfully',
        badge_classification: 'achievement',
        criteria_type: 'shares_count',
        threshold_value: 1,
        threshold_operator: '>=',
        rarity: 'common',
        xp_value_gifted: 100,
        points_value_gifted: 10
    },
    {
        badge_name: 'Share Master',
        badge_description: 'Share 100 apps successfully',
        badge_classification: 'milestone',
        criteria_type: 'shares_count',
        threshold_value: 100,
        threshold_operator: '>=',
        rarity: 'rare',
        xp_value_gifted: 500,
        points_value_gifted: 50
    },
    {
        badge_name: 'Streak Champion',
        badge_description: 'Maintain a 7-day sharing streak',
        badge_classification: 'achievement',
        criteria_type: 'streak_days',
        threshold_value: 7,
        threshold_operator: '>=',
        rarity: 'epic',
        xp_value_gifted: 300,
        points_value_gifted: 30
    },
    {
        badge_name: 'Level 10 Achiever',
        badge_description: 'Reach user level 10',
        badge_classification: 'milestone',
        criteria_type: 'level_reached',
        threshold_value: 10,
        threshold_operator: '>=',
        rarity: 'rare',
        xp_value_gifted: 400,
        points_value_gifted: 40
    },
    {
        badge_name: 'Tournament Winner',
        badge_description: 'Win your first tournament',
        badge_classification: 'achievement',
        criteria_type: 'tournaments_won',
        threshold_value: 1,
        threshold_operator: '>=',
        rarity: 'legendary',
        xp_value_gifted: 1000,
        points_value_gifted: 100
    },
    {
        badge_name: 'Referral King',
        badge_description: 'Successfully refer 10 friends',
        badge_classification: 'milestone',
        criteria_type: 'referrals_count',
        threshold_value: 10,
        threshold_operator: '>=',
        rarity: 'epic',
        xp_value_gifted: 600,
        points_value_gifted: 60
    },
    {
        badge_name: 'Early Bird',
        badge_description: 'Join the platform during launch week',
        badge_classification: 'special_event',
        criteria_type: 'shares_count',
        threshold_value: 1,
        threshold_operator: '>=',
        rarity: 'mythic',
        xp_value_gifted: 2000,
        points_value_gifted: 200,
        seasonal_start: new Date('2024-01-01'),
        seasonal_end: new Date('2024-01-07')
    }
];

const sampleTournaments = [
    {
        tournament_name: 'Weekly Share Challenge',
        tournament_description: 'Share as many apps as possible this week',
        tournament_category: 'weekly_challenge',
        tournament_type: 'global',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        apps_involved: [], // Will be populated with app IDs
        prizes: {
            first_place: { xp: 1000, points: 100, cash: 50 },
            second_place: { xp: 500, points: 50, cash: 25 },
            third_place: { xp: 250, points: 25, cash: 10 },
            participation: { xp: 50, points: 5 }
        },
        eligible_regions: ['GLOBAL'],
        tournament_rules: {
            scoring_method: 'shares_count',
            bonus_multiplier: 1.5,
            min_shares_required: 1,
            max_shares_per_day: 50
        },
        status: 'scheduled'
    },
    {
        tournament_name: 'Regional Gaming Tournament',
        tournament_description: 'Share gaming apps in your region',
        tournament_category: 'regional',
        tournament_type: 'regional',
        start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        apps_involved: [], // Will be populated with gaming app IDs
        prizes: {
            first_place: { xp: 800, points: 80, cash: 40 },
            second_place: { xp: 400, points: 40, cash: 20 },
            third_place: { xp: 200, points: 20, cash: 8 },
            participation: { xp: 40, points: 4 }
        },
        eligible_regions: ['US', 'UK', 'CA'],
        tournament_rules: {
            scoring_method: 'shares_count',
            bonus_multiplier: 1.3,
            min_shares_required: 5,
            max_shares_per_day: 30
        },
        status: 'scheduled'
    }
];

// Seeding functions
const seedCategories = async () => {
    try {
        console.log('🌱 Seeding categories...');

        for (const categoryData of sampleCategories) {
            const existingCategory = await Category.findOne({ name: categoryData.name });
            if (!existingCategory) {
                const category = new Category({
                    unique_id: uuidv4(),
                    ...categoryData
                });
                await category.save();
                console.log(`✅ Created category: ${categoryData.name}`);
            } else {
                console.log(`⏭️  Category already exists: ${categoryData.name}`);
            }
        }

        console.log('✅ Categories seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding categories:', error);
    }
};

const seedApps = async () => {
    try {
        console.log('🌱 Seeding apps...');

        // Get category IDs for reference
        const categories = await Category.find();
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.name.toLowerCase()] = cat.unique_id;
        });

        for (const appData of sampleApps) {
            const existingApp = await App.findOne({ app_name: appData.app_name });
            if (!existingApp) {
                // Convert category names to IDs
                const categoryIds = appData.categories.map(catName =>
                    categoryMap[catName.toLowerCase()]
                ).filter(Boolean);

                const app = new App({
                    unique_id: uuidv4(),
                    ...appData,
                    categories: categoryIds,
                    host_id: 'admin-user-id', // Will be updated after admin user creation
                    created_by: 'admin-user-id'
                });
                await app.save();
                console.log(`✅ Created app: ${appData.app_name}`);
            } else {
                console.log(`⏭️  App already exists: ${appData.app_name}`);
            }
        }

        console.log('✅ Apps seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding apps:', error);
    }
};

const seedBadges = async () => {
    try {
        console.log('🌱 Seeding badges...');

        for (const badgeData of sampleBadges) {
            const existingBadge = await Badge.findOne({ badge_name: badgeData.badge_name });
            if (!existingBadge) {
                const badge = new Badge({
                    unique_id: uuidv4(),
                    ...badgeData,
                    created_by: 'admin-user-id'
                });
                await badge.save();
                console.log(`✅ Created badge: ${badgeData.badge_name}`);
            } else {
                console.log(`⏭️  Badge already exists: ${badgeData.badge_name}`);
            }
        }

        console.log('✅ Badges seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding badges:', error);
    }
};

const seedTournaments = async () => {
    try {
        console.log('🌱 Seeding tournaments...');

        // Get app IDs for reference
        const apps = await App.find();
        const gamingApps = apps.filter(app =>
            app.categories.some(catId => {
                const category = categories.find(c => c.unique_id === catId);
                return category && category.name.toLowerCase() === 'gaming';
            })
        );

        for (let i = 0; i < sampleTournaments.length; i++) {
            const tournamentData = sampleTournaments[i];
            const existingTournament = await Tournament.findOne({
                tournament_name: tournamentData.tournament_name
            });

            if (!existingTournament) {
                // Set apps_involved based on tournament type
                let appsInvolved = [];
                if (tournamentData.tournament_name.includes('Gaming')) {
                    appsInvolved = gamingApps.map(app => app.unique_id);
                } else {
                    appsInvolved = apps.map(app => app.unique_id);
                }

                const tournament = new Tournament({
                    unique_id: uuidv4(),
                    ...tournamentData,
                    apps_involved: appsInvolved,
                    created_by: 'admin-user-id'
                });
                await tournament.save();
                console.log(`✅ Created tournament: ${tournamentData.tournament_name}`);
            } else {
                console.log(`⏭️  Tournament already exists: ${tournamentData.tournament_name}`);
            }
        }

        console.log('✅ Tournaments seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding tournaments:', error);
    }
};

const createAdminUser = async () => {
    try {
        console.log('🌱 Creating admin user...');

        const existingAdmin = await PlatformUser.findOne({ email: 'admin@ingain.com' });
        if (!existingAdmin) {
            const adminUser = new PlatformUser({
                unique_id: 'admin-user-id',
                name: 'INGAIN Admin',
                email: 'admin@ingain.com',
                password_hash: 'admin123', // Will be hashed by model pre-save middleware
                phone: '+1234567890',
                address: {
                    street: '123 Admin St',
                    city: 'Admin City',
                    state: 'AC',
                    country: 'US',
                    postal_code: '12345'
                },
                region: 'US',
                user_level: 100,
                is_active: true,
                email_verified: true,
                kyc_status: 'verified',
                referral_code: 'ADMIN001'
            });

            await adminUser.save();
            console.log('✅ Admin user created successfully');
            console.log('📧 Email: admin@ingain.com');
            console.log('🔑 Password: admin123');
        } else {
            console.log('⏭️  Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    }
};

// Main seeding function
const seedDatabase = async () => {
    try {
        console.log('🚀 Starting database seeding...');

        await connectDB();

        // Seed in order
        await seedCategories();
        await createAdminUser();
        await seedApps();
        await seedBadges();
        await seedTournaments();

        console.log('🎉 Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log('- Categories: Created/Updated');
        console.log('- Admin User: admin@ingain.com');
        console.log('- Apps: Sample apps with rewards');
        console.log('- Badges: Achievement and milestone badges');
        console.log('- Tournaments: Weekly and regional challenges');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
};

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };
