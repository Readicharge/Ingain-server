/**
 * Password Hashing Test Script - INGAIN Platform
 * 
 * This script tests the password hashing functionality to ensure:
 * 1. Passwords are not double-hashed
 * 2. Password comparison works correctly
 * 3. New users can be created successfully
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
        console.log('✅ Database connected for password testing');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

// Test password hashing and comparison
const testPasswordFunctionality = async () => {
    try {
        console.log('🧪 Testing password hashing functionality...');

        const testEmail = 'test-password-fix@example.com';
        const testPassword = 'TestPassword123!';

        // Clean up any existing test user
        await PlatformUser.deleteOne({ email: testEmail });

        console.log('🔧 Creating test user with password:', testPassword);

        // Create new user (password should be hashed by model)
        const testUser = new PlatformUser({
            unique_id: `test-${Date.now()}`,
            name: 'Test User',
            email: testEmail,
            password_hash: testPassword, // Plain text - should be hashed by model
            phone: '+1234567890',
            address: {
                street: '123 Test St',
                city: 'Test City',
                state: 'TC',
                country: 'US',
                postal_code: '12345'
            },
            region: 'US',
            referral_code: 'TEST001'
        });

        await testUser.save();
        console.log('✅ Test user created successfully');

        // Retrieve user from database
        const savedUser = await PlatformUser.findOne({ email: testEmail });

        console.log('📊 Password hash analysis:');
        console.log('- Hash length:', savedUser.password_hash.length);
        console.log('- Hash prefix:', savedUser.password_hash.substring(0, 10));
        console.log('- Is bcrypt hash:', /^\$2[aby]\$/.test(savedUser.password_hash));
        console.log('- Expected length range: 59-61 characters');

        // Test password comparison
        console.log('🔐 Testing password comparison...');

        const correctPasswordTest = await savedUser.comparePassword(testPassword);
        const wrongPasswordTest = await savedUser.comparePassword('WrongPassword123!');

        console.log('- Correct password test:', correctPasswordTest ? '✅ PASS' : '❌ FAIL');
        console.log('- Wrong password test:', !wrongPasswordTest ? '✅ PASS' : '❌ FAIL');

        // Test direct bcrypt comparison as well
        const directBcryptTest = await bcrypt.compare(testPassword, savedUser.password_hash);
        console.log('- Direct bcrypt test:', directBcryptTest ? '✅ PASS' : '❌ FAIL');

        // Clean up test user
        await PlatformUser.deleteOne({ email: testEmail });
        console.log('🧹 Test user cleaned up');

        const allTestsPassed = correctPasswordTest && !wrongPasswordTest && directBcryptTest;

        if (allTestsPassed) {
            console.log('🎉 All password tests PASSED! The fix is working correctly.');
        } else {
            console.log('❌ Some password tests FAILED! There may still be an issue.');
        }

        return allTestsPassed;

    } catch (error) {
        console.error('❌ Error during password testing:', error);
        return false;
    }
};

// Test existing user login
const testExistingUserLogin = async (email, password) => {
    try {
        console.log(`🔍 Testing login for existing user: ${email}`);

        const user = await PlatformUser.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log(`❌ User not found: ${email}`);
            return false;
        }

        console.log('📊 User info:');
        console.log('- Hash length:', user.password_hash.length);
        console.log('- Hash prefix:', user.password_hash.substring(0, 10));
        console.log('- Is bcrypt hash:', /^\$2[aby]\$/.test(user.password_hash));

        const loginResult = await user.comparePassword(password);
        console.log('🔐 Login test result:', loginResult ? '✅ SUCCESS' : '❌ FAILED');

        if (!loginResult && user.password_hash.length > 80) {
            console.log('🚨 WARNING: This user appears to have a double-hashed password!');
            console.log('💡 Solution: Run the password fix script or reset the user\'s password');
        }

        return loginResult;

    } catch (error) {
        console.error(`❌ Error testing login for ${email}:`, error);
        return false;
    }
};

// Main test function
const runPasswordTests = async () => {
    try {
        console.log('🚀 Starting password functionality tests...');

        await connectDB();

        // Run basic functionality test
        const functionalityTest = await testPasswordFunctionality();

        // Test specific user if provided
        const testEmail = process.argv[2];
        const testPassword = process.argv[3];

        let existingUserTest = true;
        if (testEmail && testPassword) {
            existingUserTest = await testExistingUserLogin(testEmail, testPassword);
        }

        console.log('\n📋 TEST SUMMARY:');
        console.log('- Password hashing functionality:', functionalityTest ? '✅ PASS' : '❌ FAIL');
        if (testEmail && testPassword) {
            console.log(`- Existing user login (${testEmail}):`, existingUserTest ? '✅ PASS' : '❌ FAIL');
        }

        if (functionalityTest && existingUserTest) {
            console.log('🎉 All tests passed! Password system is working correctly.');
        } else {
            console.log('❌ Some tests failed. Check the logs above for details.');
        }

    } catch (error) {
        console.error('❌ Test execution failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
};

// Run tests if this file is executed directly
if (require.main === module) {
    runPasswordTests();
}

module.exports = { runPasswordTests, testPasswordFunctionality, testExistingUserLogin };