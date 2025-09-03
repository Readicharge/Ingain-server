/**
 * INGAIN Platform Configuration
 * 
 * This file contains all configuration settings for the INGAIN platform.
 * Environment variables are loaded with sensible defaults.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

require('dotenv').config();

const config = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        environment: process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV === 'development'
    },

    // Database Configuration
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ingain',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferMaxEntries: 0
        }
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    },

    // Security Configuration
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'development' ? 1000 : 100),
        maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS) || 5,
        accountLockoutDurationMinutes: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES) || 30
    },

    // CORS Configuration
    cors: {
        origins: process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'http://localhost:3001'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },

    // Email Configuration
    email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM || 'noreply@ingain.com',
        enabled: process.env.EMAIL_NOTIFICATION_ENABLED !== 'false'
    },

    // SMS Configuration (Twilio)
    sms: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        enabled: process.env.SMS_NOTIFICATION_ENABLED === 'true'
    },

    // Payment Configuration
    payments: {
        stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
        },
        paypal: {
            clientId: process.env.PAYPAL_CLIENT_ID,
            clientSecret: process.env.PAYPAL_CLIENT_SECRET,
            mode: process.env.PAYPAL_MODE || 'sandbox'
        },
        pointsToUsdRate: parseFloat(process.env.POINTS_TO_USD_RATE) || 0.1
    },

    // Redis Configuration
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        enabled: !!process.env.REDIS_URL
    },

    // File Upload Configuration
    upload: {
        path: process.env.UPLOAD_PATH || './uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
        allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'image/gif'
        ]
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH || './logs',
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 14,
        enabled: process.env.ENABLE_LOGGING !== 'false'
    },

    // Platform Configuration
    platform: {
        name: process.env.PLATFORM_NAME || 'INGAIN',
        url: process.env.PLATFORM_URL || 'https://ingain.com',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@ingain.com',
        adminEmail: process.env.ADMIN_EMAIL || 'admin@ingain.com'
    },

    // Tournament Configuration
    tournament: {
        defaultDurationDays: parseInt(process.env.DEFAULT_TOURNAMENT_DURATION_DAYS) || 7,
        maxParticipants: parseInt(process.env.MAX_TOURNAMENT_PARTICIPANTS) || 1000,
        minPrizePool: parseInt(process.env.MIN_TOURNAMENT_PRIZE_POOL) || 100,
        defaultRewardMultiplier: 1.5
    },

    // Badge Configuration
    badge: {
        defaultXpReward: parseInt(process.env.DEFAULT_BADGE_XP_REWARD) || 50,
        defaultPointsReward: parseInt(process.env.DEFAULT_BADGE_POINTS_REWARD) || 5,
        maxStreakCount: parseInt(process.env.MAX_BADGE_STREAK_COUNT) || 10
    },

    // Share Configuration
    share: {
        defaultCooldownMinutes: parseInt(process.env.DEFAULT_SHARE_COOLDOWN_MINUTES) || 30,
        maxSharesPerDay: parseInt(process.env.MAX_SHARES_PER_DAY) || 50,
        defaultAttributionWindowHours: parseInt(process.env.DEFAULT_ATTRIBUTION_WINDOW_HOURS) || 24,
        fraudScoreThreshold: parseFloat(process.env.FRAUD_SCORE_THRESHOLD) || 0.8
    },

    // Notification Configuration
    notifications: {
        push: process.env.PUSH_NOTIFICATION_ENABLED !== 'false',
        email: process.env.EMAIL_NOTIFICATION_ENABLED !== 'false',
        sms: process.env.SMS_NOTIFICATION_ENABLED === 'true'
    },

    // Development Configuration
    development: {
        debug: process.env.DEBUG === 'true',
        enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
        enableLogging: process.env.ENABLE_LOGGING !== 'false'
    },

    // External APIs
    external: {
        googleMaps: {
            apiKey: process.env.GOOGLE_MAPS_API_KEY
        },
        recaptcha: {
            siteKey: process.env.RECAPTCHA_SITE_KEY,
            secretKey: process.env.RECAPTCHA_SECRET_KEY
        },
        sentry: {
            dsn: process.env.SENTRY_DSN
        },
        googleAnalytics: {
            id: process.env.GOOGLE_ANALYTICS_ID
        }
    }
};

// Validation function to check required configuration
function validateConfig() {
    const required = [
        'jwt.secret',
        'database.uri'
    ];

    const missing = required.filter(key => {
        const value = key.split('.').reduce((obj, k) => obj?.[k], config);
        return !value;
    });

    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    return true;
}

// Validate configuration on load
if (config.server.isProduction) {
    validateConfig();
}

module.exports = config;
