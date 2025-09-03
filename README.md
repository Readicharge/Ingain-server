# INGAIN Share-to-Earn Platform

A comprehensive gamified platform where users earn money by sharing featured apps through tournaments and achievements.

## 🚀 Platform Overview

INGAIN is a dual-currency share-to-earn platform that enables users to:
- **Share Apps**: Earn XP and Points by sharing featured applications
- **Join Tournaments**: Participate in time-limited competitions with bonus rewards
- **Earn Badges**: Unlock achievements through various activities
- **Convert to Cash**: Redeem Points for real money (10 Points = $1 USD)

### Core Economics
- **XP (Experience Points)**: Determines user level, badge eligibility, and tournament access
- **Points**: Direct monetary value at 10 Points = $1 USD
- **App Rewards**: Each app specifies different XP and Point rewards

### User Types
1. **Super Admin**: Platform governance, tournament management, payout approval
2. **Participant User**: Share apps, join tournaments, earn rewards, request payouts
3. **App Host**: List apps, fund campaigns, monitor performance, configure rewards

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, MongoDB
- **Authentication**: JWT with refresh tokens
- **Security**: bcrypt, helmet, rate limiting
- **Payments**: Stripe, PayPal integration
- **Notifications**: Email (Nodemailer), SMS (Twilio)
- **Caching**: Redis (optional)

### Database Schema
The platform uses 14 main collections:
- `users` - Platform users and their statistics
- `apps` - App catalog with reward configurations
- `tournaments` - Tournament information and rules
- `share_logs` - All share activities and verification
- `badges` - Badge definitions and criteria
- `user_badges` - User badge achievements
- `badge_progress` - Progress tracking for unearned badges
- `payments` - Financial transactions
- `notifications` - User notifications
- `activity_logs` - Comprehensive audit trail
- `referrals` - Referral system tracking
- `tournament_participants` - Tournament performance tracking
- `host_accounts` - App host account management
- `fraud_reports` - Fraud detection and resolution

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Redis (optional, for caching)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ingain-server.git
   cd ingain-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp config.js.example config.js
   # Edit config.js with your configuration values
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB
   mongod
   
   # Create database indexes (automatic on first run)
   npm run start
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
MONGODB_URI=mongodb://localhost:27017/ingain

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payments
STRIPE_SECRET_KEY=sk_test_your-stripe-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret

# Platform Settings
POINTS_TO_USD_RATE=0.1
DEFAULT_TOURNAMENT_DURATION_DAYS=7
MAX_TOURNAMENT_PARTICIPANTS=1000
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "US",
    "postal_code": "10001"
  },
  "referral_code": "FRIEND123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### App Sharing Endpoints

#### Get Available Apps
```http
GET /api/apps/available
Authorization: Bearer <token>
```

#### Generate Share Link
```http
POST /api/apps/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "app_id": "app-uuid",
  "share_channel": "whatsapp",
  "tournament_id": "tournament-uuid" // optional
}
```

#### Verify Share
```http
POST /api/apps/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "tracking_id": "tracking-uuid",
  "verification_data": {
    "conversion_type": "install",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.1"
  }
}
```

### Tournament Endpoints

#### Get Active Tournaments
```http
GET /api/competitions/active
Authorization: Bearer <token>
```

#### Register for Tournament
```http
POST /api/competitions/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "tournament_id": "tournament-uuid"
}
```

#### Get Tournament Leaderboard
```http
GET /api/competitions/leaderboard/:tournamentId
Authorization: Bearer <token>
```

### Badge Endpoints

#### Get User Badges
```http
GET /api/badges/user
Authorization: Bearer <token>
```

#### Get Available Badges
```http
GET /api/badges/available
Authorization: Bearer <token>
```

#### Get Badge Progress
```http
GET /api/badges/progress
Authorization: Bearer <token>
```

### Payment Endpoints

#### Request Payout
```http
POST /api/profile/payout
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100, // Points to convert
  "payment_method": "bank_transfer",
  "payment_details": {
    "account_name": "John Doe",
    "account_number": "1234567890",
    "routing_number": "021000021"
  }
}
```

#### Get Payment History
```http
GET /api/profile/payments
Authorization: Bearer <token>
```

## 🎯 Core Features

### Share-to-Earn System
- **Regular Shares**: Standard XP and Points rewards
- **Tournament Shares**: Bonus rewards during active tournaments
- **Verification System**: Anti-fraud measures and conversion tracking
- **Streak Bonuses**: Consecutive day sharing rewards

### Tournament System
- **Regional & Global**: Location-based and worldwide competitions
- **Time-Limited**: Scheduled start and end dates
- **Prize Pools**: XP, Points, and cash prizes
- **Leaderboards**: Real-time ranking updates
- **Performance Bonuses**: Top performer rewards

### Badge System
- **Achievement Badges**: Milestone-based rewards
- **Seasonal Badges**: Time-limited achievements
- **Progressive Rewards**: XP and Points for badge completion
- **Rarity Levels**: Common, Rare, Epic, Legendary, Mythic

### Payment System
- **Multiple Methods**: Bank transfer, PayPal, Stripe, Crypto
- **Approval Workflow**: Admin review for high-value payments
- **Fee Calculation**: Processing and platform fees
- **Risk Assessment**: Fraud detection and prevention

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API request throttling
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: MongoDB with parameterized queries
- **XSS Protection**: Input sanitization and output encoding
- **CORS Configuration**: Cross-origin request protection
- **Helmet Security**: HTTP header security
- **Account Lockout**: Failed login attempt protection

## 📊 Monitoring & Analytics

- **Activity Logging**: Comprehensive audit trail
- **Performance Monitoring**: Response time tracking
- **Error Tracking**: Sentry integration
- **Fraud Detection**: Automated fraud scoring
- **User Analytics**: Behavior tracking and insights

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   ```

2. **Database Indexes**
   ```bash
   npm run setup-indexes
   ```

3. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name ingain-server
   pm2 startup
   pm2 save
   ```

4. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Test Structure
- `tests/unit/` - Unit tests for individual functions
- `tests/integration/` - API endpoint tests
- `tests/e2e/` - End-to-end workflow tests

## 📈 Performance Optimization

- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: Redis caching for frequently accessed data
- **Connection Pooling**: MongoDB connection optimization
- **Rate Limiting**: API request throttling
- **Compression**: Response compression middleware
- **CDN Integration**: Static asset delivery optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write comprehensive tests
- Update documentation
- Follow commit message conventions
- Ensure all tests pass

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [API Docs](docs/api.md)
- **Issues**: [GitHub Issues](https://github.com/your-username/ingain-server/issues)
- **Email**: support@ingain.com
- **Discord**: [INGAIN Community](https://discord.gg/ingain)

## 🙏 Acknowledgments

- **Author**: Yash Singh (ER_SKY)
- **Contributors**: [Contributors List](CONTRIBUTORS.md)
- **Open Source**: Built with amazing open-source libraries

---

**INGAIN** - Share Apps, Earn Rewards, Build Communities 🚀
