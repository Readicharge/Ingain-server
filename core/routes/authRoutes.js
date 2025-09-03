/**
 * Authentication Routes - INGAIN Platform
 * 
 * Handles user authentication including:
 * - User registration and login
 * - Password reset and email verification
 * - JWT token management
 * - Account security features
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const PlatformUser = require('../models/App/PlatformUser');
const ActivityLog = require('../models/Technical/ActivityLog');
const { authenticateToken } = require('../../middleware/auth');
const config = require('../../config');

const router = express.Router();

// Debug route to check database users (remove in production)
router.get('/debug/users', async (req, res) => {
    try {
        const users = await PlatformUser.find({}).select('email name is_active created_at').limit(10);
        const totalUsers = await PlatformUser.countDocuments({});

        res.json({
            success: true,
            totalUsers,
            sampleUsers: users.map(user => ({
                email: user.email,
                name: user.name,
                isActive: user.is_active,
                createdAt: user.created_at
            }))
        });
    } catch (error) {
        console.error('Debug users error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debug route to test password hashing and comparison (remove in production)
router.post('/debug/test-password', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const user = await PlatformUser.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('🔧 === PASSWORD TEST DEBUG ===');
        console.log('🔧 Testing password for user:', user.email);
        console.log('🔧 User ID:', user.unique_id);
        console.log('🔧 Input password:', JSON.stringify(password));
        console.log('🔧 Input password length:', password.length);
        console.log('🔧 Input password type:', typeof password);
        console.log('🔧 Stored hash:', user.password_hash);
        console.log('🔧 Stored hash length:', user.password_hash ? user.password_hash.length : 0);

        // Test current comparison
        const currentResult = await user.comparePassword(password);

        // Test by creating a new hash with the same password
        const newHash = await bcrypt.hash(password, 10);
        const newHashResult = await bcrypt.compare(password, newHash);

        // Test direct bcrypt comparison
        const directResult = await bcrypt.compare(password, user.password_hash);

        console.log('🔧 Current comparePassword result:', currentResult);
        console.log('🔧 New hash test result:', newHashResult);
        console.log('🔧 Direct bcrypt result:', directResult);
        console.log('🔧 === END PASSWORD TEST DEBUG ===');

        res.json({
            success: true,
            results: {
                currentComparison: currentResult,
                newHashTest: newHashResult,
                directBcrypt: directResult,
                hasStoredHash: !!user.password_hash,
                hashLength: user.password_hash ? user.password_hash.length : 0,
                passwordLength: password.length,
                passwordType: typeof password,
                hashStartsWith: user.password_hash ? user.password_hash.substring(0, 4) : null
            }
        });

    } catch (error) {
        console.error('Password test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            address,
            referral_code,
            region = 'GLOBAL'
        } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            console.log("Missing required fields")
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Validate password strength
        if (password.length < 8) {
            console.log("Incorrect format for the password")
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await PlatformUser.findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {
            console.log("Existing User", email, phone)
            return res.status(400).json({
                success: false,
                message: 'User with this email or phone already exists'
            });
        }

        // Generate unique referral code
        let userReferralCode;
        do {
            userReferralCode = 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase();
        } while (await PlatformUser.findOne({ referral_code: userReferralCode }));

        // Create user (password will be hashed by the model's pre-save middleware)
        const user = new PlatformUser({
            unique_id: uuidv4(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password_hash: password, // Pass plain password, model will hash it
            phone: phone || null,
            address: address || null,
            referral_code: userReferralCode,
            region: region,
            user_level: 1,
            is_active: true,
            email_verified: false,
            kyc_status: 'pending'
        });

        await user.save();

        // Process referral if provided
        if (referral_code) {
            await processReferral(user, referral_code);
        }

        // Log activity
        await ActivityLog.logUserActivity(
            user.unique_id,
            'user_register',
            'User registered successfully',
            { referral_code: referral_code || null },
            { entityType: "user" }
        );

        // Generate JWT token
        const token = generateJWTToken(user);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.unique_id,
                    name: user.name,
                    email: user.email,
                    referral_code: user.referral_code,
                    user_level: user.user_level
                },
                token: token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration'
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password, device_info = {} } = req.body;

        console.log('🔑 Login attempt for email:', email);
        console.log('📊 Request body keys:', Object.keys(req.body));

        // Validate required fields
        if (!email || !password) {
            console.log('❌ Missing required fields - email:', !!email, 'password:', !!password);
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
                debug: {
                    hasEmail: !!email,
                    hasPassword: !!password
                }
            });
        }

        // Find user by email
        console.log('🔍 Searching for user with email:', email.toLowerCase());
        const user = await PlatformUser.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log('❌ User not found in database for email:', email.toLowerCase());
            // Check if there are any users in the database at all
            const userCount = await PlatformUser.countDocuments({});
            console.log('👥 Total users in database:', userCount);

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials - User not found',
                debug: {
                    searchedEmail: email.toLowerCase(),
                    totalUsersInDB: userCount
                }
            });
        }

        console.log('✅ User found:', {
            id: user.unique_id,
            email: user.email,
            name: user.name,
            isActive: user.is_active,
            hasPasswordHash: !!user.password_hash,
            passwordHashLength: user.password_hash ? user.password_hash.length : 0
        });

        // Check if account is active
        if (!user.is_active) {
            console.log('❌ Account is deactivated for user:', user.email);
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact support.',
                debug: {
                    userId: user.unique_id,
                    isActive: user.is_active
                }
            });
        }

        // Check if account is locked
        if (user.account_locked_until && new Date() < user.account_locked_until) {
            console.log('❌ Account is locked until:', user.account_locked_until);
            return res.status(401).json({
                success: false,
                message: 'Account is temporarily locked due to multiple failed login attempts',
                debug: {
                    lockedUntil: user.account_locked_until,
                    currentTime: new Date()
                }
            });
        }

        // Check if password hash exists
        if (!user.password_hash) {
            console.log('❌ User has no password hash stored');
            return res.status(401).json({
                success: false,
                message: 'Account setup incomplete. Please contact support.',
                debug: {
                    userId: user.unique_id,
                    hasPasswordHash: false
                }
            });
        }

        console.log('🔐 === LOGIN PASSWORD DEBUG ===');
        console.log('🔐 Raw password from request:', JSON.stringify(password));
        console.log('🔐 Password type:', typeof password);
        console.log('🔐 Password length:', password ? password.length : 0);
        console.log('🔐 Password first 3 chars:', password ? password.substring(0, 3) + '***' : 'N/A');
        console.log('🔐 Password last 3 chars:', password ? '***' + password.substring(password.length - 3) : 'N/A');
        console.log('🔐 Password contains spaces:', password ? password.includes(' ') : false);
        console.log('🔐 Password char codes (first 10):', password ? Array.from(password.substring(0, 10)).map(c => c.charCodeAt(0)) : 'N/A');
        console.log('🔐 Hash exists:', !!user.password_hash);
        console.log('🔐 Hash first 30 chars:', user.password_hash ? user.password_hash.substring(0, 30) + '...' : 'N/A');
        console.log('🔐 === END LOGIN PASSWORD DEBUG ===');

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        console.log('🔐 Password validation result:', isPasswordValid);

        if (!isPasswordValid) {
            console.log('❌ Password validation failed');

            // Record failed login attempt
            user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
            console.log('📊 Failed login attempts:', user.failed_login_attempts);

            // Lock account after 5 failed attempts
            if (user.failed_login_attempts >= 5) {
                user.account_locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                console.log('🔒 Account locked until:', user.account_locked_until);
            }

            await user.save();

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials - Password mismatch',
                debug: {
                    userId: user.unique_id,
                    failedAttempts: user.failed_login_attempts,
                    passwordProvided: !!password,
                    passwordLength: password ? password.length : 0
                }
            });
        }

        console.log('✅ Password validation successful');

        // Reset failed login attempts
        user.failed_login_attempts = 0;
        user.account_locked_until = null;
        user.last_login_date = new Date();
        user.login_count = (user.login_count || 0) + 1;
        await user.save();

        console.log('📝 Updated user login info');

        // Log successful login
        await ActivityLog.logUserActivity(
            user.unique_id,
            'user_login',
            'User logged in successfully',
            { device_info }
        );

        console.log('🎯 Generating JWT token...');
        // Generate JWT token
        const token = generateJWTToken(user);
        console.log('✅ JWT token generated successfully');

        const responseData = {
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.unique_id,
                    name: user.name,
                    email: user.email,
                    user_level: user.user_level,
                    current_xp: user.current_xp,
                    current_points: user.current_points,
                    referral_code: user.referral_code,
                    email_verified: user.email_verified,
                    kyc_status: user.kyc_status
                },
                token: token
            }
        };

        console.log('🎉 Login successful for user:', user.email);
        res.json(responseData);

    } catch (error) {
        console.error('💥 Login error:', error);
        console.error('📚 Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login',
            debug: {
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refresh_token, config.jwt.refreshSecret);

        // Find user
        const user = await PlatformUser.findOne({ unique_id: decoded.userId });

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Generate new access token
        const newToken = generateJWTToken(user);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Refresh token expired'
            });
        }

        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;

        // Log logout activity
        await ActivityLog.logUserActivity(
            userId,
            'user_logout',
            'User logged out successfully'
        );

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during logout'
        });
    }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find user
        const user = await PlatformUser.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Don't reveal if user exists
            return res.json({
                success: true,
                message: 'If an account with this email exists, a password reset link has been sent'
            });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user.unique_id, type: 'password_reset' },
            config.jwt.secret,
            { expiresIn: '1h' }
        );

        // Store reset token (in production, use Redis or database)
        user.password_reset_token = resetToken;
        user.password_reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        // Send reset email (implement email service)
        // await sendPasswordResetEmail(user.email, resetToken);

        // Log activity
        await ActivityLog.logUserActivity(
            user.unique_id,
            'password_reset_requested',
            'Password reset requested'
        );

        res.json({
            success: true,
            message: 'If an account with this email exists, a password reset link has been sent'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, new_password } = req.body;

        if (!token || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        // Validate password strength
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        if (decoded.type !== 'password_reset') {
            return res.status(400).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        // Find user
        const user = await PlatformUser.findOne({
            unique_id: decoded.userId,
            password_reset_token: token,
            password_reset_expires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Update password (will be hashed by model's pre-save middleware)
        user.password_hash = new_password;
        user.password_reset_token = null;
        user.password_reset_expires = null;
        user.last_password_change = new Date();
        await user.save();

        // Log activity
        await ActivityLog.logUserActivity(
            user.unique_id,
            'password_reset_completed',
            'Password reset completed successfully'
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({
                success: false,
                message: 'Reset token has expired'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;

        const user = await PlatformUser.findOne({ unique_id: userId })
            .select('-password_hash -password_reset_token -password_reset_expires');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: user
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;
        const updates = req.body;

        // Remove sensitive fields from updates
        delete updates.password_hash;
        delete updates.email;
        delete updates.unique_id;
        delete updates.referral_code;

        const user = await PlatformUser.findOneAndUpdate(
            { unique_id: userId },
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password_hash -password_reset_token -password_reset_expires');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Log activity
        await ActivityLog.logUserActivity(
            userId,
            'user_profile_update',
            'User profile updated',
            { updated_fields: Object.keys(updates) }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.unique_id;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        // Validate new password strength
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }

        // Find user
        const user = await PlatformUser.findOne({ unique_id: userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(current_password);

        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password (will be hashed by model's pre-save middleware)
        user.password_hash = new_password;
        user.last_password_change = new Date();
        await user.save();

        // Log activity
        await ActivityLog.logUserActivity(
            userId,
            'user_password_change',
            'Password changed successfully'
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Helper Functions

/**
 * Generate JWT token for user
 */
function generateJWTToken(user) {
    try {
        console.log('🎯 generateJWTToken called for user:', user.unique_id);

        const payload = {
            userId: user.unique_id,
            email: user.email,
            role: 'user'
        };

        console.log('📝 JWT payload:', payload);
        console.log('🔑 JWT secret exists:', !!config.jwt.secret);
        console.log('🔑 JWT expiresIn:', config.jwt.expiresIn);

        if (!config.jwt.secret) {
            throw new Error('JWT secret is not configured');
        }

        const token = jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn || '1h'
        });

        console.log('✅ JWT token generated successfully, length:', token ? token.length : 0);
        return token;

    } catch (error) {
        console.error('❌ Error generating JWT token:', error);
        throw error;
    }
}

/**
 * Process referral for new user
 */
async function processReferral(newUser, referralCode) {
    try {
        // Find referrer
        const referrer = await PlatformUser.findOne({ referral_code: referralCode });

        if (!referrer || !referrer.is_active) {
            console.log('Invalid referrer or inactive account');
            return;
        }

        // Create referral record using Referral model
        const Referral = require('../models/App/Referral');
        const referral = await Referral.createReferral(
            referrer.unique_id,
            referralCode,
            newUser.unique_id,
            {
                source: 'registration',
                channel: 'direct_link'
            }
        );

        // Update referrer count
        referrer.referral_count += 1;
        await referrer.save();

        // Update new user's referred_by field
        newUser.referred_by = referrer.unique_id;

        // Award welcome bonus to new user (immediate bonus)
        const welcomeBonus = {
            xp: 50,
            points: 5
        };

        newUser.current_xp += welcomeBonus.xp;
        newUser.current_points += welcomeBonus.points;
        newUser.total_xp_earned += welcomeBonus.xp;
        newUser.total_points_earned += welcomeBonus.points;
        await newUser.save();

        // Log referral activity
        await ActivityLog.logUserActivity(
            newUser.unique_id,
            'referral_signup',
            'User signed up via referral',
            {
                referrer_id: referrer.unique_id,
                referral_code: referralCode,
                welcome_bonus: welcomeBonus
            },
            {
                entityType: 'referral',
                entityId: referral.unique_id
            }
        );

        console.log(`Referral processed: ${newUser.unique_id} referred by ${referrer.unique_id}`);

    } catch (error) {
        console.error('Error processing referral:', error);
        // Don't throw error to prevent registration failure
    }
}

module.exports = router; 