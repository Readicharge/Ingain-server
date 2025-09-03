/**
 * Authentication Middleware - INGAIN Platform
 * 
 * Handles JWT token verification and user authentication:
 * - Token validation and expiration checks
 * - User context injection
 * - Role-based access control
 * - Security logging and monitoring
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const jwt = require('jsonwebtoken');
const PlatformUser = require('../core/models/App/PlatformUser');
const AdminUser = require('../core/models/Admin/AdminUser');
const ActivityLog = require('../core/models/Technical/ActivityLog');
const config = require('../config');

/**
 * Authenticate JWT token and inject user context
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
                error_code: 'TOKEN_MISSING'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, config.jwt.secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Access token expired',
                    error_code: 'TOKEN_EXPIRED'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid access token',
                    error_code: 'TOKEN_INVALID'
                });
            } else {
                throw error;
            }
        }

        // Check token type
        if (decoded.type && decoded.type !== 'access') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type',
                error_code: 'TOKEN_TYPE_INVALID'
            });
        }

        // Find user based on role
        let user;
        if (decoded.role === 'admin') {
            user = await AdminUser.findOne({ unique_id: decoded.userId });
        } else {
            user = await PlatformUser.findOne({ unique_id: decoded.userId });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
                error_code: 'USER_NOT_FOUND'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated',
                error_code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Check if admin account is suspended
        if (decoded.role === 'admin' && user.status && user.status.is_suspended) {
            return res.status(401).json({
                success: false,
                message: 'Admin account is suspended',
                error_code: 'ADMIN_SUSPENDED'
            });
        }

        // Inject user context
        req.user = user;
        req.userRole = decoded.role;
        req.userId = decoded.userId;

        // Log authentication activity
        await logAuthenticationActivity(req, user, 'success');

        next();

    } catch (error) {
        console.error('Authentication error:', error);
        
        // Log authentication failure
        await logAuthenticationActivity(req, null, 'failure', error.message);

        return res.status(500).json({
            success: false,
            message: 'Authentication error',
            error_code: 'AUTH_ERROR'
        });
    }
};

/**
 * Authenticate admin users only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        // First authenticate token
        await authenticateToken(req, res, (err) => {
            if (err) return next(err);
        });

        // Check if user is admin
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required',
                error_code: 'ADMIN_ACCESS_REQUIRED'
            });
        }

        // Check admin permissions
        if (!req.user.permissions) {
            return res.status(403).json({
                success: false,
                message: 'Admin permissions not configured',
                error_code: 'ADMIN_PERMISSIONS_MISSING'
            });
        }

        next();

    } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Admin authentication error',
            error_code: 'ADMIN_AUTH_ERROR'
        });
    }
};

/**
 * Check if user has specific permission
 * @param {string} permission - Permission to check
 * @returns {Function} Middleware function
 */
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            // Ensure user is authenticated as admin
            if (req.userRole !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required',
                    error_code: 'ADMIN_ACCESS_REQUIRED'
                });
            }

            // Check specific permission
            if (!req.user.permissions[permission]) {
                return res.status(403).json({
                    success: false,
                    message: `Permission '${permission}' required`,
                    error_code: 'PERMISSION_DENIED'
                });
            }

            next();

        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check error',
                error_code: 'PERMISSION_CHECK_ERROR'
            });
        }
    };
};

/**
 * Check if user has any of the specified permissions
 * @param {Array} permissions - Array of permissions to check
 * @returns {Function} Middleware function
 */
const requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            // Ensure user is authenticated as admin
            if (req.userRole !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required',
                    error_code: 'ADMIN_ACCESS_REQUIRED'
                });
            }

            // Check if user has any of the required permissions
            const hasPermission = permissions.some(permission => 
                req.user.permissions[permission]
            );

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `One of the following permissions required: ${permissions.join(', ')}`,
                    error_code: 'PERMISSION_DENIED'
                });
            }

            next();

        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check error',
                error_code: 'PERMISSION_CHECK_ERROR'
            });
        }
    };
};

/**
 * Check if user has all of the specified permissions
 * @param {Array} permissions - Array of permissions to check
 * @returns {Function} Middleware function
 */
const requireAllPermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            // Ensure user is authenticated as admin
            if (req.userRole !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required',
                    error_code: 'ADMIN_ACCESS_REQUIRED'
                });
            }

            // Check if user has all required permissions
            const hasAllPermissions = permissions.every(permission => 
                req.user.permissions[permission]
            );

            if (!hasAllPermissions) {
                return res.status(403).json({
                    success: false,
                    message: `All of the following permissions required: ${permissions.join(', ')}`,
                    error_code: 'PERMISSION_DENIED'
                });
            }

            next();

        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check error',
                error_code: 'PERMISSION_CHECK_ERROR'
            });
        }
    };
};

/**
 * Rate limiting middleware for authentication endpoints
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const rateLimitAuth = async (req, res, next) => {
    try {
        const clientIP = req.ip || req.connection.remoteAddress;
        const endpoint = req.path;
        
        // Check if client is rate limited
        const isRateLimited = await checkRateLimit(clientIP, endpoint);
        
        if (isRateLimited) {
            return res.status(429).json({
                success: false,
                message: 'Too many authentication attempts. Please try again later.',
                error_code: 'RATE_LIMITED'
            });
        }

        next();

    } catch (error) {
        console.error('Rate limiting error:', error);
        // Continue without rate limiting if there's an error
        next();
    }
};

/**
 * Optional authentication middleware
 * Used when endpoints can work with or without authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            // No token provided, continue without user context
            req.user = null;
            req.userRole = null;
            req.userId = null;
            return next();
        }

        // Try to authenticate, but don't fail if invalid
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            
            let user;
            if (decoded.role === 'admin') {
                user = await AdminUser.findOne({ unique_id: decoded.userId });
            } else {
                user = await PlatformUser.findOne({ unique_id: decoded.userId });
            }

            if (user && user.is_active) {
                req.user = user;
                req.userRole = decoded.role;
                req.userId = decoded.userId;
            }
        } catch (error) {
            // Invalid token, continue without user context
            req.user = null;
            req.userRole = null;
            req.userId = null;
        }

        next();

    } catch (error) {
        console.error('Optional auth error:', error);
        // Continue without user context on error
        req.user = null;
        req.userRole = null;
        req.userId = null;
        next();
    }
};

// Helper Functions

/**
 * Log authentication activity
 * @param {Object} req - Express request object
 * @param {Object} user - User object (null if authentication failed)
 * @param {string} status - Authentication status ('success' or 'failure')
 * @param {string} errorMessage - Error message if authentication failed
 */
async function logAuthenticationActivity(req, user, status, errorMessage = null) {
    try {
        const activityData = {
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            endpoint: req.path,
            method: req.method,
            status: status
        };

        if (user) {
            activityData.user_id = user.unique_id;
            activityData.entity_type = 'user';
            activityData.entity_id = user.unique_id;
        }

        if (errorMessage) {
            activityData.error_message = errorMessage;
        }

        await ActivityLog.logSystemActivity(
            'user_authentication',
            `Authentication ${status} for ${req.path}`,
            activityData
        );

    } catch (error) {
        console.error('Error logging authentication activity:', error);
    }
}

/**
 * Check rate limiting for authentication endpoints
 * @param {string} clientIP - Client IP address
 * @param {string} endpoint - Authentication endpoint
 * @returns {boolean} True if rate limited
 */
async function checkRateLimit(clientIP, endpoint) {
    try {
        // This would typically use Redis or a similar caching solution
        // For now, return false (no rate limiting)
        
        // Example implementation:
        // const key = `auth_rate_limit:${clientIP}:${endpoint}`;
        // const attempts = await redis.get(key);
        // if (attempts && parseInt(attempts) >= 5) {
        //     return true;
        // }
        // await redis.incr(key);
        // await redis.expire(key, 300); // 5 minutes
        
        return false;

    } catch (error) {
        console.error('Rate limit check error:', error);
        return false;
    }
}

module.exports = {
    authenticateToken,
    authenticateAdmin,
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    rateLimitAuth,
    optionalAuth
};

