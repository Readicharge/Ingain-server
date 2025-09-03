/**
 * Password Hash Fix Script - INGAIN Platform
 * 
 * This script fixes the double-hashing issue for existing users.
 * It will update the password for users with double-hashed passwords.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const PlatformUser = require('../core/models/App/PlatformUser');

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ingain', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Database connected for password fix');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

// Fix password for specific user
const fixUserPassword = async (email, newPassword) => {
    try {
        console.log(`🔧 Fixing password for user: ${email}`);

        const user = await PlatformUser.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log(`❌ User not found: ${email}`);
            return false;
        }

        console.log('📊 User found:', {
            id: user.unique_id,
            email: user.email,
            name: user.name,
            currentHashLength: user.password_hash ? user.password_hash.length : 0,
            currentHashPrefix: user.password_hash ? user.password_hash.substring(0, 10) : 'N/A'
        });

        // Set new password (will be properly hashed by pre-save middleware)
        user.password_hash = newPassword;
        await user.save();

        console.log('✅ Password updated successfully for', email);
        console.log('🔐 New password:', newPassword);

        return true;
    } catch (error) {
        console.error(`❌ Error fixing password for ${email}:`, error);
        return false;
    }
};

// Fix all users with suspicious double-hashed passwords
const fixAllUsersWithDoubleHashedPasswords = async () => {
    try {
        console.log('🔍 Scanning for users with double-hashed passwords...');

        const users = await PlatformUser.find({});
        let fixedCount = 0;

        for (const user of users) {
            // Check if password hash looks like it might be double-hashed
            // Double-hashed bcrypt will be longer than normal (around 120 chars vs 60)
            if (user.password_hash && user.password_hash.length > 80) {
                console.log(`🚨 Suspicious hash found for ${user.email} (length: ${user.password_hash.length})`);

                // You need to set a new password for these users
                // In production, you might want to force password reset instead
                const tempPassword = 'TempPass123!'; // Users should change this

                user.password_hash = tempPassword;
                await user.save();

                console.log(`✅ Fixed password for ${user.email} - temporary password: ${tempPassword}`);
                fixedCount++;
            }
        }

        console.log(`🎉 Fixed ${fixedCount} users with double-hashed passwords`);
        return fixedCount;

    } catch (error) {
        console.error('❌ Error fixing double-hashed passwords:', error);
        return 0;
    }
};

// Main fix function
const fixPasswordHashing = async () => {
    try {
        console.log('🚀 Starting password hashing fix...');

        await connectDB();

        // Fix specific user if provided
        const specificEmail = process.argv[2];
        const specificPassword = process.argv[3];

        if (specificEmail && specificPassword) {
            await fixUserPassword(specificEmail, specificPassword);
        } else {
            // Fix all users with double-hashed passwords
            await fixAllUsersWithDoubleHashedPasswords();
        }

        console.log('🎉 Password hashing fix completed successfully!');

    } catch (error) {
        console.error('❌ Password fix failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
};

// Run fix if this file is executed directly
if (require.main === module) {
    fixPasswordHashing();
}

module.exports = { fixPasswordHashing, fixUserPassword };