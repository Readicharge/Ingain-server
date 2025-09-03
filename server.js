/**
 * INGAIN Share-to-Earn Platform - Main Server File
 * 
 * This is the primary backend server for the INGAIN platform that enables users to:
 * - Share apps and earn XP/Points through gamified tournaments
 * - Participate in regional and global tournaments
 * - Earn badges and achievements
 * - Convert points to real money through payouts
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const config = require('./config');
require('dotenv').config();

// Import route modules
const authRoutes = require('./core/routes/authRoutes');
const appRoutes = require('./core/routes/appRoutes');
const badgeRoutes = require('./core/routes/badgeRoutes');
const categoryRoutes = require('./core/routes/categoryRoutes');
const competitionRoutes = require('./core/routes/competitionRoutes');
const profileRoutes = require('./core/routes/profileRoutes');
const referralRoutes = require('./core/routes/referralRoutes');
const paymentRoutes = require('./core/routes/paymentRoutes');
const shareRoutes = require('./core/routes/shareRoutes');
const adminRoutes = require('./core/routes/adminRoutes');
const hostRoutes = require('./core/routes/hostRoutes');
const notificationRoutes = require('./core/routes/notificationRoutes');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs, // from config (15 minutes by default)
    max: process.env.NODE_ENV === 'development' ? 1000 : config.security.rateLimitMaxRequests, // More lenient in development
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        error_code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000)
    },
    standardHeaders: true,
    trustProxy: true, // trust the X-Forwarded-For header
    legacyHeaders: false,
    // Skip rate limiting for health check
    skip: (req) => req.path === '/health',
    // Log rate limit hits
    onLimitReached: (req, res, options) => {
        console.warn(`🚨 Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}, User-Agent: ${req.get('user-agent')}`);
    }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// API Routes with specific rate limiting
// Auth routes - more restrictive
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 100 : 50, // More restrictive for auth
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        error_code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    trustProxy: true
});

// General API limiter - applied to all API routes
app.use('/api/', limiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth', authLimiter, authRoutes);
// Apply general rate limiting to all other API routes
app.use('/api/apps', authenticateToken, appRoutes);
app.use('/api/badges', authenticateToken, badgeRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/competitions', authenticateToken, competitionRoutes);
app.use('/api/profile', authenticateToken, profileRoutes);
app.use('/api/referrals', authenticateToken, referralRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    // JWT expiration
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Database connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ingain', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Create indexes for better performance
        await createDatabaseIndexes();

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

// Create database indexes for optimal performance
const createDatabaseIndexes = async () => {
    try {
        // PlatformUser indexes
        await mongoose.model('PlatformUser').createIndexes({ email: 1 });
        await mongoose.model('PlatformUser').createIndexes({ referral_code: 1 });
        await mongoose.model('PlatformUser').createIndexes({ region: 1 });
        await mongoose.model('PlatformUser').createIndexes({ user_level: 1 });

        // App indexes
        await mongoose.model('App').createIndexes({ host_id: 1 });
        await mongoose.model('App').createIndexes({ is_active: 1 });
        await mongoose.model('App').createIndexes({ categories: 1 });

        // Tournament indexes
        await mongoose.model('Tournament').createIndexes({ status: 1 });
        await mongoose.model('Tournament').createIndexes({ start_date: 1, end_date: 1 });
        await mongoose.model('Tournament').createIndexes({ eligible_regions: 1 });

        // ShareLog indexes
        await mongoose.model('ShareLog').createIndexes({ user_id: 1 });
        await mongoose.model('ShareLog').createIndexes({ app_id: 1 });
        await mongoose.model('ShareLog').createIndexes({ tournament_id: 1 });
        await mongoose.model('ShareLog').createIndexes({ tracking_id: 1 });
        await mongoose.model('ShareLog').createIndexes({ validation_status: 1 });
        await mongoose.model('ShareLog').createIndexes({ created_at: 1 });

        // Payment indexes
        await mongoose.model('Payment').createIndexes({ user_id: 1 });
        await mongoose.model('Payment').createIndexes({ status: 1 });
        await mongoose.model('Payment').createIndexes({ payment_type: 1 });

        console.log('✅ Database indexes created successfully');
    } catch (error) {
        console.error('❌ Error creating database indexes:', error.message);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});

// Start server
const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`🚀 INGAIN Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;
