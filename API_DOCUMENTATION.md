# INGAIN Share-to-Earn Platform - API Documentation

## 📋 Table of Contents
1. [Authentication Routes](#authentication-routes)
2. [App Routes](#app-routes)
3. [Badge Routes](#badge-routes)
4. [Category Routes](#category-routes)
5. [Competition Routes](#competition-routes)
6. [Profile Routes](#profile-routes)
7. [Referral Routes](#referral-routes)
8. [Payment Routes](#payment-routes)
9. [Share Routes](#share-routes)
10. [Admin Routes](#admin-routes)
11. [Host Routes](#host-routes)
12. [Notification Routes](#notification-routes)

---

## 🔐 Authentication Routes

### POST `/api/auth/register`
**Description**: Register a new user account with referral processing

**Input Fields**:
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "password": "string (required, min 8 chars)",
  "phone": "string (optional)",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "postal_code": "string"
  },
  "referral_code": "string (optional)",
  "region": "string (default: 'GLOBAL')"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "unique_id": "string",
    "name": "string",
    "email": "string",
    "phone": "string",
    "region": "string",
    "referral_code": "string",
    "current_xp": 0,
    "current_points": 0,
    "user_level": 1,
    "created_at": "date"
  },
  "token": "JWT_TOKEN"
}
```

---

### GET `/api/auth/debug/users`
**Description**: Debug endpoint to list all users (development only)

**Input Fields**: None

**Expected Output**:
```json
{
  "success": true,
  "users": [
    {
      "unique_id": "string",
      "name": "string",
      "email": "string",
      "current_xp": "number",
      "current_points": "number",
      "user_level": "number",
      "created_at": "date"
    }
  ]
}
```

---

### GET `/api/auth/debug/users/:id`
**Description**: Debug endpoint to get specific user details (development only)

**Input Fields**: 
- `id` (URL parameter): User unique ID

**Expected Output**:
```json
{
  "success": true,
  "user": {
    "unique_id": "string",
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "object",
    "current_xp": "number",
    "current_points": "number",
    "user_level": "number",
    "created_at": "date",
    "updated_at": "date"
  }
}
```

---

### POST `/api/auth/login`
**Description**: Authenticate user and return JWT token

**Input Fields**:
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "device_info": {
    "device_id": "string",
    "device_type": "string",
    "os_version": "string"
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "unique_id": "string",
    "name": "string",
    "email": "string",
    "current_xp": "number",
    "current_points": "number",
    "user_level": "number",
    "last_login_at": "date"
  },
  "token": "JWT_TOKEN",
  "refresh_token": "REFRESH_TOKEN"
}
```

---

### POST `/api/auth/refresh`
**Description**: Refresh JWT token using refresh token

**Input Fields**:
```json
{
  "refresh_token": "string (required)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "token": "NEW_JWT_TOKEN",
  "refresh_token": "NEW_REFRESH_TOKEN"
}
```

---

### POST `/api/auth/logout`
**Description**: Logout user and invalidate tokens

**Input Fields**:
```json
{
  "refresh_token": "string (required)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST `/api/auth/forgot-password`
**Description**: Send password reset email

**Input Fields**:
```json
{
  "email": "string (required)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### POST `/api/auth/reset-password`
**Description**: Reset password using reset token

**Input Fields**:
```json
{
  "reset_token": "string (required)",
  "new_password": "string (required, min 8 chars)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### GET `/api/auth/profile`
**Description**: Get authenticated user's profile

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "user": {
    "unique_id": "string",
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "object",
    "current_xp": "number",
    "current_points": "number",
    "user_level": "number",
    "total_xp_earned": "number",
    "total_points_earned": "number",
    "total_apps_shared": "number",
    "referral_count": "number",
    "badges_ids": ["array"],
    "created_at": "date"
  }
}
```

---

### PUT `/api/auth/profile`
**Description**: Update user profile information

**Input Fields**:
```json
{
  "name": "string (optional)",
  "phone": "string (optional)",
  "address": "object (optional)",
  "region": "string (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": "updated_user_object"
}
```

---

### POST `/api/auth/change-password`
**Description**: Change user password

**Input Fields**:
```json
{
  "current_password": "string (required)",
  "new_password": "string (required, min 8 chars)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 📱 App Routes

### GET `/api/apps`
**Description**: Get all available apps with filtering and pagination

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 20)
category: string (optional)
search: string (optional)
featured: boolean (optional)
sortBy: string (optional)
sortOrder: string (optional)
```

**Expected Output**:
```json
{
  "success": true,
  "apps": [
    {
      "unique_id": "string",
      "app_name": "string",
      "app_description": "string",
      "app_icon": "string",
      "app_xp": "number",
      "app_points": "number",
      "categories": ["array"],
      "host_id": "string",
      "is_active": "boolean",
      "total_shared": "number",
      "rating": "number"
    }
  ],
  "pagination": {
    "current_page": "number",
    "total_pages": "number",
    "total_items": "number",
    "items_per_page": "number"
  }
}
```

---

### GET `/api/apps/:id`
**Description**: Get specific app details

**Input Fields**: None (app ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "app": {
    "unique_id": "string",
    "app_name": "string",
    "app_description": "string",
    "app_icon": "string",
    "app_store_url": "string",
    "play_store_url": "string",
    "app_xp": "number",
    "app_points": "number",
    "categories": ["array"],
    "host_id": "string",
    "is_active": "boolean",
    "total_shared": "number",
    "rating": "number",
    "screenshots": ["array"],
    "app_features": ["array"]
  }
}
```

---

### GET `/api/apps/:id/stats`
**Description**: Get app statistics including referral count and XP awarded

**Input Fields**: None (app ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "stats": {
    "app_id": "string",
    "app_name": "string",
    "total_referrals": "number",
    "total_xp_awarded": "number",
    "total_points_awarded": "number",
    "active_users": "number",
    "conversion_rate": "number"
  }
}
```

---

### POST `/api/apps/:id/successful-referral`
**Description**: Process successful app referral and award rewards

**Input Fields**: None (app ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "message": "Referral processed, points/xp/badges updated",
  "xpGained": "number",
  "pointsGained": "number",
  "newlyAwardedBadges": [
    {
      "unique_id": "string",
      "badge_name": "string",
      "badge_description": "string",
      "badge_icon": "string"
    }
  ]
}
```

---

## 🏆 Badge Routes


### GET `/api/badges`
**Description**: Get all available badges

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 10)
active: boolean (optional)
```

**Expected Output**:
```json
{
  "badges": [
    // Badge objects as per Badge model
  ],
  "totalPages": "number",
  "currentPage": "number",
  "total": "number"
}
```

---

### GET `/api/badges/:id`
**Description**: Get specific badge details

**Input Fields**: None (badge ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "badge": {
    "unique_id": "string",
    "badge_name": "string",
    "badge_description": "string",
    "badge_icon": "string",
    "badge_type": "string",
    "rarity": "string",
    "criteria": "object",
    "xp_reward": "number",
    "points_reward": "number",
    "is_active": "boolean",
    "users_achieved_count": "number"
  }
}
```

---

### GET `/api/badges/user`
**Description**: Get user's earned badges

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "user_badges": [
    {
      "unique_id": "string",
      "badge_name": "string",
      "badge_description": "string",
      "badge_icon": "string",
      "earned_at": "date",
      "xp_reward": "number",
      "points_reward": "number"
    }
  ]
}
```

---

### GET `/api/badges/progress`
**Description**: Get user's progress towards unearned badges

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "badge_progress": [
    {
      "badge_id": "string",
      "badge_name": "string",
      "current_progress": "number",
      "required_progress": "number",
      "progress_percentage": "number"
    }
  ]
}
```

---

## 📂 Category Routes

### GET `/api/categories`
**Description**: Get all app categories

**Input Fields** (Query Parameters):
```
active: boolean (optional)
```

**Expected Output**:
```json
{
  "success": true,
  "categories": [
    {
      "unique_id": "string",
      "name": "string",
      "description": "string",
      "slug": "string",
      "icon": "string",
      "is_active": "boolean",
      "app_count": "number"
    }
  ]
}
```

---

### GET `/api/categories/:id`
**Description**: Get specific category details

**Input Fields**: None (category ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "category": {
    "unique_id": "string",
    "name": "string",
    "description": "string",
    "slug": "string",
    "icon": "string",
    "is_active": "boolean",
    "app_count": "number",
    "parent_category": "string",
    "subcategories": ["array"]
  }
}
```

---

## 🏁 Competition Routes


### GET `/api/competitions`
**Description**: Get all tournaments with filtering

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 10)
active: boolean (optional)
upcoming: boolean (optional)
```

**Expected Output**:
```json
{
  "tournaments": [
    {
      "unique_id": "string",
      "tournament_name": "string",
      "tournament_description": "string",
      "tournament_category": "string",
      "tournament_type": "string",
      "start_date": "date",
      "end_date": "date",
      "registration_deadline": "date",
      "apps_involved": ["string"],
      "prizes": {
        "first_place": { "xp": "number", "points": "number", "cash": "number" },
        "second_place": { "xp": "number", "points": "number", "cash": "number" },
        "third_place": { "xp": "number", "points": "number", "cash": "number" },
        "participation": { "xp": "number", "points": "number" }
      },
      "total_xp_allocated": "number",
      "total_points_allocated": "number",
      "eligible_regions": ["string"],
      "eligible_cities": ["string"],
      "participant_details": {
        "max_participants": "number",
        "min_level_required": "number",
        "registration_fee": "number",
        "current_participants": "number"
      },
      "winners": "object",
      "tournament_rules": {
        "scoring_method": "string",
        "bonus_multiplier": "number",
        "min_shares_required": "number",
        "max_shares_per_day": "number",
        "tie_breaker": "string",
        "disqualification_rules": ["string"],
        "verification_required": "boolean"
      },
      "status": "string",
      "is_active": "boolean",
      "total_shares": "number",
      "total_participants": "number",
      "total_referral_count": "number",
      "reward_multiplier": "number",
      "created_at": "date",
      "updated_at": "date",
      "created_by": "string",
      "duration_days": "number",
      "time_until_start": "number",
      "time_remaining": "number",
      "registration_open": "boolean",
      "progress_percentage": "number"
    }
  ],
  "totalPages": "number",
  "currentPage": "number",
  "total": "number"
}
```

---


### GET `/api/competitions/:id`
**Description**: Get specific tournament details

**Input Fields**: None (tournament ID in URL)

**Expected Output**:
```json
{
  "tournament": {
    "unique_id": "string",
    "tournament_name": "string",
    "tournament_description": "string",
    "tournament_category": "string",
    "tournament_type": "string",
    "start_date": "date",
    "end_date": "date",
    "registration_deadline": "date",
    "apps_involved": ["string"],
    "prizes": {
      "first_place": { "xp": "number", "points": "number", "cash": "number" },
      "second_place": { "xp": "number", "points": "number", "cash": "number" },
      "third_place": { "xp": "number", "points": "number", "cash": "number" },
      "participation": { "xp": "number", "points": "number" }
    },
    "total_xp_allocated": "number",
    "total_points_allocated": "number",
    "eligible_regions": ["string"],
    "eligible_cities": ["string"],
    "participant_details": {
      "max_participants": "number",
      "min_level_required": "number",
      "registration_fee": "number",
      "current_participants": "number"
    },
    "winners": "object",
    "tournament_rules": {
      "scoring_method": "string",
      "bonus_multiplier": "number",
      "min_shares_required": "number",
      "max_shares_per_day": "number",
      "tie_breaker": "string",
      "disqualification_rules": ["string"],
      "verification_required": "boolean"
    },
    "status": "string",
    "is_active": "boolean",
    "total_shares": "number",
    "total_participants": "number",
    "total_referral_count": "number",
    "reward_multiplier": "number",
    "created_at": "date",
    "updated_at": "date",
    "created_by": "string",
    "duration_days": "number",
    "time_until_start": "number",
    "time_remaining": "number",
    "registration_open": "boolean",
    "progress_percentage": "number"
  }
}
```

---

### POST `/api/competitions/:id/join`
**Description**: Join a tournament

**Input Fields**: None (tournament ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "message": "Successfully joined tournament"
}
```

---

### DELETE `/api/competitions/:id/leave`
**Description**: Leave a tournament

**Input Fields**: None (tournament ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "message": "Successfully left tournament"
}
```

---

### GET `/api/competitions/user/tournaments`
**Description**: Get user's joined tournaments

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "tournaments": [
    {
      "unique_id": "string",
      "tournament_name": "string",
      "start_date": "date",
      "end_date": "date",
      "apps": ["array"]
    }
  ]
}
```

---

### POST `/api/competitions/:id/submit`
**Description**: Submit tournament entry (share app for tournament)

**Input Fields**:
```json
{
  "appId": "string (required)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Tournament entry submitted successfully",
  "xpGained": "number",
  "pointsGained": "number",
  "breakdown": "object"
}
```

---

### GET `/api/competitions/leaderboard/:tournamentId`
**Description**: Get tournament leaderboard

**Input Fields**: None (tournament ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": "number",
      "user_id": "string",
      "user_name": "string",
      "total_xp": "number",
      "total_points": "number",
      "total_shares": "number"
    }
  ]
}
```

---

## 👤 Profile Routes

### GET `/api/profile`
**Description**: Get user profile information

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "user": {
    "unique_id": "string",
    "name": "string",
    "email": "string",
    "total_xp_earned": "number",
    "total_points_earned": "number",
    "referral_count": "number",
    "badges_ids": ["array"],
    "active_tournament_ids": ["array"],
    "last_login_at": "date",
    "created_at": "date"
  }
}
```

---

### PUT `/api/profile`
**Description**: Update user profile

**Input Fields**:
```json
{
  "name": "string (optional)",
  "phone": "string (optional)",
  "address": "object (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": "updated_user_object"
}
```

---

## 🔗 Referral Routes

### GET `/api/referrals/stats`
**Description**: Get comprehensive user referral statistics

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "stats": {
    "referral_code": "string",
    "total_referrals": "number",
    "active_referrals": "number",
    "completed_referrals": "number",
    "success_rate": "string",
    "total_earnings": {
      "xp": "number",
      "points": "number"
    },
    "average_earnings_per_referral": {
      "xp": "string",
      "points": "string"
    },
    "detailed_stats": ["array"]
  }
}
```

---

### GET `/api/referrals/history`
**Description**: Get user's detailed referral history with filtering

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 20)
status: string (optional, values: 'pending', 'active', 'completed', 'expired', 'fraudulent')
```

**Expected Output**:
```json
{
  "success": true,
  "referrals": [
    {
      "id": "string",
      "referred_user": {
        "name": "string",
        "email": "string",
        "created_at": "date"
      },
      "status": "string",
      "activation_percentage": "number",
      "rewards_earned": {
        "xp": "number",
        "points": "number"
      },
      "created_at": "date",
      "activation_date": "date",
      "completion_date": "date",
      "days_until_expiration": "number",
      "is_expired": "boolean"
    }
  ],
  "pagination": {
    "current_page": "number",
    "total_pages": "number",
    "total_items": "number",
    "items_per_page": "number"
  }
}
```

---

### GET `/api/referrals/leaderboard`
**Description**: Get top referrers leaderboard

**Input Fields** (Query Parameters):
```
limit: number (default: 10)
period: string (default: 'all', options: 'daily', 'weekly', 'monthly', 'all')
```

**Expected Output**:
```json
{
  "success": true,
  "leaderboard": [
    {
      "name": "string",
      "total_referrals": "number",
      "total_xp_earned": "number",
      "total_points_earned": "number",
      "active_referrals": "number",
      "completed_referrals": "number",
      "success_rate": "number"
    }
  ],
  "period": "string"
}
```

---

### POST `/api/referrals/create`
**Description**: Create a referral when someone uses a referral code

**Input Fields**:
```json
{
  "referral_code": "string (required)",
  "metadata": {
    "source": "string (optional)",
    "channel": "string (optional)",
    "utm_source": "string (optional)",
    "utm_medium": "string (optional)",
    "utm_campaign": "string (optional)"
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Referral created successfully",
  "referral": {
    "id": "string",
    "referrer_id": "string",
    "referred_id": "string",
    "referral_code": "string",
    "status": "string",
    "activation_percentage": "number",
    "can_be_activated": "boolean",
    "created_at": "date",
    "expires_at": "date"
  }
}
```

---

### PUT `/api/referrals/progress/:referralId`
**Description**: Update referral activation progress

**Input Fields**:
```json
{
  "shares_completed": "number (optional)",
  "xp_earned": "number (optional)",
  "points_earned": "number (optional)",
  "days_active": "number (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Referral progress updated",
  "referral": {
    "id": "string",
    "status": "string",
    "activation_percentage": "number",
    "can_be_activated": "boolean",
    "activation_progress": {
      "shares_completed": "number",
      "xp_earned": "number",
      "points_earned": "number",
      "days_active": "number"
    }
  }
}
```

---

### POST `/api/referrals/rewards/:referralId/process`
**Description**: Process rewards for both referrer and referred user

**Input Fields**: None (referral ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "message": "Rewards processed successfully",
  "result": {
    "success": true,
    "message": "Both rewards processed successfully",
    "referrer_bonus": {
      "xp": "number",
      "points": "number"
    },
    "referred_bonus": {
      "xp": "number",
      "points": "number"
    }
  }
}
```

---

### GET `/api/referrals/analytics`
**Description**: Get detailed referral analytics for the user

**Input Fields** (Query Parameters):
```
days: number (default: 30)
```

**Expected Output**:
```json
{
  "success": true,
  "analytics": {
    "summary": {
      "referral_code": "string",
      "total_referrals": "number",
      "completed_referrals": "number",
      "total_earnings": {
        "xp": "number",
        "points": "number"
      },
      "success_rate": "string"
    },
    "daily_breakdown": [
      {
        "_id": {
          "year": "number",
          "month": "number",
          "day": "number"
        },
        "referral_count": "number",
        "active_count": "number",
        "total_xp": "number",
        "total_points": "number"
      }
    ],
    "period_days": "number"
  }
}
```

---

### POST `/api/referrals/code/generate`
**Description**: Generate a new referral code for the user

**Input Fields**: None

**Expected Output**:
```json
{
  "success": true,
  "message": "New referral code generated",
  "referral_code": "string"
}
```

---

### GET `/api/referrals/:referralId`
**Description**: Get detailed information about a specific referral

**Input Fields**: None (referral ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "referral": {
    "id": "string",
    "referrer_id": "string",
    "referred_id": "string",
    "referral_code": "string",
    "status": "string",
    "activation_percentage": "number",
    "can_be_activated": "boolean",
    "age_days": "number",
    "days_until_expiration": "number",
    "is_expired": "boolean",
    "rewards": {
      "referrer_bonus": {
        "xp": "number",
        "points": "number"
      },
      "referred_bonus": {
        "xp": "number",
        "points": "number"
      },
      "referrer_rewarded": "boolean",
      "referred_rewarded": "boolean"
    },
    "fraud_detection": {
      "fraud_score": "number",
      "fraud_flags": ["array"],
      "is_suspicious": "boolean"
    },
    "created_at": "date",
    "activation_date": "date",
    "completion_date": "date"
  }
}
```

---

### GET `/api/referrals/progress`
**Description**: Get user's referral milestones and progress

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "progress": [
    {
      "milestone": {
        "count": "number",
        "xp": "number",
        "points": "number"
      },
      "achieved": "boolean",
      "progress": "number"
    }
  ],
  "current_completed": "number",
  "total_referrals": "number"
}
```

---

### GET `/api/referrals/admin/pending`
**Description**: Get all pending referrals for admin review

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 50)
```

**Expected Output**:
```json
{
  "success": true,
  "referrals": [
    {
      "unique_id": "string",
      "referrer_id": {
        "name": "string",
        "email": "string"
      },
      "referred_id": {
        "name": "string",
        "email": "string"
      },
      "status": "string",
      "activation_percentage": "number",
      "created_at": "date"
    }
  ],
  "pagination": {
    "current_page": "number",
    "total_pages": "number",
    "total_items": "number",
    "items_per_page": "number"
  }
}
```

---

### POST `/api/referrals/admin/cleanup-expired`
**Description**: Clean up expired referrals (admin only)

**Input Fields**: None

**Expected Output**:
```json
{
  "success": true,
  "message": "Expired referrals cleaned up",
  "updated_count": "number"
}
```

---

## 💰 Payment Routes

### POST `/api/payments/payout`
**Description**: Request a payout (convert points to cash)

**Input Fields**:
```json
{
  "amount": "number (required, min 0.01)",
  "payment_method": "string (required)",
  "payment_details": "object (required)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Payout request submitted successfully",
  "payment": {
    "unique_id": "string",
    "amount": "number",
    "payment_method": "string",
    "status": "string",
    "created_at": "date"
  },
  "estimated_processing_time": "string"
}
```

---

### GET `/api/payments/history`
**Description**: Get user's payment history

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 20)
status: string (optional)
payment_type: string (optional)
```

**Expected Output**:
```json
{
  "success": true,
  "payments": [
    {
      "unique_id": "string",
      "user_id": "string",
      "host_id": "string",
      "payment_type": "string",
      "amount": "number",
      "currency": "string",
      "points_converted": "number",
      "conversion_rate": "number",
      "payment_method": "string",
      "payment_details": {
        "account_name": "string",
        "account_number": "string",
        "routing_number": "string",
        "swift_code": "string",
        "paypal_email": "string",
        "stripe_payment_intent": "string",
        "crypto_address": "string",
        "check_number": "string"
      },
      "status": "string",
      "external_transaction_id": "string",
      "processor_name": "string",
      "requires_approval": "boolean",
      "approved_by": "string",
      "approved_at": "date",
      "rejection_reason": "string",
      "initiated_at": "date",
      "completed_at": "date",
      "failed_at": "date",
      "failure_reason": "string",
      "processing_fee": "number",
      "platform_fee": "number",
      "net_amount": "number",
      "idempotency_key": "string",
      "notes": "string",
      "metadata": {
        "source": "string",
        "campaign_id": "string",
        "tournament_id": "string",
        "badge_id": "string",
        "referral_id": "string",
        "risk_score": "number",
        "fraud_flags": ["string"]
      },
      "created_at": "date",
      "updated_at": "date",
      "total_fees": "number",
      "processing_time": "number",
      "is_high_value": "boolean",
      "risk_level": "string"
    }
  ],
  "pagination": {
    "current_page": "number",
    "total_pages": "number",
    "total_items": "number",
    "items_per_page": "number"
  }
}
```

---

### GET `/api/payments/:id`
**Description**: Get specific payment details

**Input Fields**: None (payment ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "payment": {
    "unique_id": "string",
    "amount": "number",
    "payment_method": "string",
    "status": "string",
    "created_at": "date",
    "payment_details": "object"
  }
}
```

---

### POST `/api/payments/:id/cancel`
**Description**: Cancel a pending payment request

**Input Fields**: None (payment ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "message": "Payment cancelled successfully",
  "payment": "updated_payment_object"
}
```

---

### GET `/api/payments/admin/pending`
**Description**: Get all pending payments for admin review

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 50)
payment_type: string (optional)
min_amount: number (optional)
max_amount: number (optional)
```

**Expected Output**:
```json
{
  "success": true,
  "payment": {
    "unique_id": "string",
    "user_id": "string",
    "host_id": "string",
    "payment_type": "string",
    "amount": "number",
    "currency": "string",
    "points_converted": "number",
    "conversion_rate": "number",
    "payment_method": "string",
    "payment_details": {
      "account_name": "string",
      "account_number": "string",
      "routing_number": "string",
      "swift_code": "string",
      "paypal_email": "string",
      "stripe_payment_intent": "string",
      "crypto_address": "string",
      "check_number": "string"
    },
    "status": "string",
    "external_transaction_id": "string",
    "processor_name": "string",
    "requires_approval": "boolean",
    "approved_by": "string",
    "approved_at": "date",
    "rejection_reason": "string",
    "initiated_at": "date",
    "completed_at": "date",
    "failed_at": "date",
    "failure_reason": "string",
    "processing_fee": "number",
    "platform_fee": "number",
    "net_amount": "number",
    "idempotency_key": "string",
    "notes": "string",
    "metadata": {
      "source": "string",
      "campaign_id": "string",
      "tournament_id": "string",
      "badge_id": "string",
      "referral_id": "string",
      "risk_score": "number",
      "fraud_flags": ["string"]
    },
    "created_at": "date",
    "updated_at": "date",
    "total_fees": "number",
    "processing_time": "number",
    "is_high_value": "boolean",
    "risk_level": "string"
  },
        "email": "string",
        "phone": "string",
        "region": "string"
      },
      "created_at": "date"
    }
  ],
  "pagination": "object"
}
```

---

### POST `/api/payments/admin/:id/approve`
**Description**: Approve a payment request

**Input Fields**:
```json
{
  "notes": "string (optional)",
  "external_transaction_id": "string (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Payment approved successfully",
  "payment": "updated_payment_object"
}
```

---

### POST `/api/payments/admin/:id/reject`
**Description**: Reject a payment request

**Input Fields**:
```json
{
  "rejection_reason": "string (required)",
  "notes": "string (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Payment rejected successfully",
  "payment": "updated_payment_object"
}
```

---

### GET `/api/payments/admin/analytics`
**Description**: Get payment analytics for admin dashboard

**Input Fields** (Query Parameters):
```
period: string (default: '30d', options: '7d', '30d', '90d', '1y')
```

**Expected Output**:
```json
{
  "success": true,
  "analytics": {
    "period": "string",
    "total_payments": "number",
    "total_amount": "number",
    "status_breakdown": ["array"],
    "payment_method_breakdown": ["array"]
  }
}
```

---

## 🔗 Share Routes

### POST `/api/shares/generate`
**Description**: Generate a share link for an app

**Input Fields**:
```json
{
  "app_id": "string (required)",
  "share_channel": "string (optional)",
  "tournament_id": "string (optional)",
  "custom_message": "string (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Share link generated successfully",
  "share_data": {
    "tracking_id": "string",
    "share_url": "string",
    "share_type": "string",
    "app_name": "string",
    "tournament_name": "string",
    "expires_at": "date",
    "estimated_rewards": {
      "xp": "number",
      "points": "number"
    }
  }
}
```

---

### GET `/api/shares/history`
**Description**: Get user's share history

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 20)
status: string (optional)
share_type: string (optional)
```

**Expected Output**:
```json
{
  "success": true,
  "shares": [
    {
      "unique_id": "string",
      "tracking_id": "string",
      "app_id": {
        "app_name": "string",
        "app_icon": "string"
      },
      "tournament_id": {
        "tournament_name": "string"
      },
      "share_type": "string",
      "validation_status": "string",
      "created_at": "date"
    }
  ],
  "pagination": "object"
}
```

---

## 👨‍💼 Admin Routes

### GET `/api/admin/users`
**Description**: Get all users with filtering and pagination

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 50)
search: string (optional)
status: string (optional)
region: string (optional)
user_level: number (optional)
sort_by: string (default: 'created_at')
sort_order: string (default: 'desc')
```

**Expected Output**:
```json
{
  "success": true,
  "users": [
    {
      "unique_id": "string",
      "name": "string",
      "email": "string",
      "phone": "string",
      "region": "string",
      "user_level": "number",
      "status": "string",
      "created_at": "date"
    }
  ],
  "pagination": "object"
}
```

---

### GET `/api/admin/users/:id`
**Description**: Get detailed user information

**Input Fields**: None (user ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "user": "user_object",
  "recent_activity": ["array"],
  "recent_payments": ["array"],
  "recent_shares": ["array"]
}
```

---

### PUT `/api/admin/users/:id/status`
**Description**: Update user status

**Input Fields**:
```json
{
  "status": "string (required, options: 'active', 'suspended', 'banned')",
  "reason": "string (optional)",
  "duration": "number (optional, hours for suspension)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "User status updated successfully",
  "user": "updated_user_object"
}
```

---

### POST `/api/admin/users/:id/adjust-points`
**Description**: Adjust user's XP or Points

**Input Fields**:
```json
{
  "xp_adjustment": "number (optional)",
  "points_adjustment": "number (optional)",
  "reason": "string (required)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "User points adjusted successfully",
  "user": {
    "unique_id": "string",
    "name": "string",
    "current_xp": "number",
    "current_points": "number",
    "total_xp_earned": "number",
    "total_points_earned": "number"
  }
}
```

---

### POST `/api/admin/tournaments`
**Description**: Create a new tournament

**Input Fields**:
```json
{
  "tournament_name": "string (required)",
  "tournament_description": "string (optional)",
  "start_date": "date (required)",
  "end_date": "date (required)",
  "prize_pool": "number (required)",
  "max_participants": "number (optional)",
  "eligible_regions": ["array (optional)"],
  "apps_involved": ["array (optional)"],
  "rules": ["array (optional)"],
  "reward_multiplier": "number (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Tournament created successfully",
  "tournament": "tournament_object"
}
```

---

### PUT `/api/admin/tournaments/:id`
**Description**: Update tournament details

**Input Fields**:
```json
{
  "tournament_name": "string (optional)",
  "tournament_description": "string (optional)",
  "start_date": "date (optional)",
  "end_date": "date (optional)",
  "prize_pool": "number (optional)",
  "is_active": "boolean (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Tournament updated successfully",
  "tournament": "updated_tournament_object"
}
```

---

### GET `/api/admin/fraud-reports`
**Description**: Get all fraud reports with filtering

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 50)
status: string (optional)
report_type: string (optional)
sort_by: string (default: 'created_at')
sort_order: string (default: 'desc')
```

**Expected Output**:
```json
{
  "success": true,
  "reports": [
    {
      "unique_id": "string",
      "reporter_id": {
        "name": "string",
        "email": "string"
      },
      "reported_user_id": {
        "name": "string",
        "email": "string"
      },
      "report_type": "string",
      "report_reason": "string",
      "status": "string",
      "created_at": "date"
    }
  ],
  "pagination": "object"
}
```

---

### POST `/api/admin/fraud-reports/:id/review`
**Description**: Review and resolve fraud report

**Input Fields**:
```json
{
  "action": "string (required, options: 'resolved', 'dismissed', 'escalated')",
  "resolution_notes": "string (optional)",
  "penalty_applied": "object (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Fraud report reviewed successfully",
  "report": "updated_report_object"
}
```

---

### GET `/api/admin/analytics/dashboard`
**Description**: Get comprehensive platform analytics

**Input Fields** (Query Parameters):
```
period: string (default: '30d', options: '7d', '30d', '90d', '1y')
```

**Expected Output**:
```json
{
  "success": true,
  "analytics": {
    "period": "string",
    "users": {
      "total": "number",
      "active": "number",
      "new": "number",
      "growth_rate": "number"
    },
    "apps": {
      "total": "number",
      "active": "number"
    },
    "tournaments": {
      "total": "number",
      "active": "number"
    },
    "shares": {
      "total": "number",
      "verified": "number",
      "verification_rate": "number"
    },
    "payments": {
      "total": "number",
      "total_amount": "number"
    },
    "fraud": {
      "total_reports": "number",
      "resolved": "number",
      "resolution_rate": "number"
    }
  }
}
```

---

## 🏢 Host Routes

### POST `/api/host/register`
**Description**: Register as an app host

**Input Fields**:
```json
{
  "company_name": "string (required)",
  "business_type": "string (required)",
  "website_url": "string (optional)",
  "contact_person": "string (optional)",
  "contact_email": "string (optional)",
  "contact_phone": "string (optional)",
  "business_address": "object (optional)",
  "tax_id": "string (optional)",
  "bank_details": "object (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Host registration submitted successfully",
  "host_account": "host_account_object",
  "next_steps": "string"
}
```

---

### GET `/api/host/profile`
**Description**: Get host account profile

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "host_account": "host_account_object",
  "apps": ["array"],
  "recent_earnings": ["array"]
}
```

---

### PUT `/api/host/profile`
**Description**: Update host account profile

**Input Fields**:
```json
{
  "company_name": "string (optional)",
  "business_type": "string (optional)",
  "website_url": "string (optional)",
  "contact_person": "string (optional)",
  "contact_email": "string (optional)",
  "contact_phone": "string (optional)",
  "business_address": "object (optional)",
  "tax_id": "string (optional)",
  "bank_details": "object (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Host profile updated successfully",
  "host_account": "updated_host_account_object"
}
```

---

### POST `/api/host/apps`
**Description**: Submit a new app for hosting

**Input Fields**:
```json
{
  "app_name": "string (required)",
  "app_description": "string (required)",
  "app_icon": "string (optional)",
  "app_store_url": "string (optional)",
  "play_store_url": "string (optional)",
  "categories": ["array (optional)"],
  "app_xp": "number (required)",
  "app_points": "number (required)",
  "campaign_budget": "number (optional)",
  "campaign_duration_days": "number (optional)",
  "target_regions": ["array (optional)"],
  "app_features": ["array (optional)"],
  "screenshots": ["array (optional)"]
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "App submitted successfully for review",
  "app": "app_object",
  "next_steps": "string"
}
```

---

### GET `/api/host/apps`
**Description**: Get host's apps with filtering and pagination

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 20)
status: string (optional)
is_active: boolean (optional)
sort_by: string (default: 'created_at')
sort_order: string (default: 'desc')
```

**Expected Output**:
```json
{
  "success": true,
  "apps": ["array"],
  "pagination": "object"
}
```

---

### PUT `/api/host/apps/:id`
**Description**: Update app details

**Input Fields**:
```json
{
  "app_name": "string (optional)",
  "app_description": "string (optional)",
  "app_icon": "string (optional)",
  "app_xp": "number (optional)",
  "app_points": "number (optional)",
  "categories": ["array (optional)"],
  "target_regions": ["array (optional)"]
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "App updated successfully",
  "app": "updated_app_object"
}
```

---

### DELETE `/api/host/apps/:id`
**Description**: Delete an app

**Input Fields**: None (app ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "message": "App deleted successfully"
}
```

---

### GET `/api/host/earnings`
**Description**: Get host earnings and analytics

**Input Fields** (Query Parameters):
```
period: string (default: '30d', options: '7d', '30d', '90d', '1y')
```

**Expected Output**:
```json
{
  "success": true,
  "earnings": {
    "period": "string",
    "total_earnings": "number",
    "app_performance": "object",
    "recent_transactions": ["array"]
  }
}
```

---

### GET `/api/host/apps/:id/analytics`
**Description**: Get specific app analytics

**Input Fields** (Query Parameters):
```
period: string (default: '30d', options: '7d', '30d', '90d', '1y')
```

**Expected Output**:
```json
{
  "success": true,
  "app_analytics": {
    "period": "string",
    "app_name": "string",
    "total_shares": "number",
    "total_xp_allocated": "number",
    "total_points_allocated": "number",
    "share_breakdown": ["array"],
    "daily_trends": ["array"]
  }
}
```

---

## 🔔 Notification Routes

### GET `/api/notifications`
**Description**: Get user's notifications with filtering and pagination

**Input Fields** (Query Parameters):
```
page: number (default: 1)
limit: number (default: 20)
type: string (optional)
is_read: boolean (optional)
sort_by: string (default: 'created_at')
sort_order: string (default: 'desc')
```

**Expected Output**:
```json
{
  "success": true,
  "notifications": [
    {
      "unique_id": "string",
      "title": "string",
      "message": "string",
      "notification_type": "string",
      "is_read": "boolean",
      "created_at": "date"
    }
  ],
  "unread_count": "number",
  "pagination": "object"
}
```

---

### GET `/api/notifications/unread-count`
**Description**: Get count of unread notifications

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "unread_count": "number"
}
```

---

### POST `/api/notifications/:id/read`
**Description**: Mark notification as read

**Input Fields**: None (notification ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "message": "Notification marked as read",
  "notification": "updated_notification_object"
}
```

---

### POST `/api/notifications/read-all`
**Description**: Mark all notifications as read

**Input Fields**: None

**Expected Output**:
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "updated_count": "number"
}
```

---

### DELETE `/api/notifications/:id`
**Description**: Delete a notification

**Input Fields**: None (notification ID in URL)

**Expected Output**:
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### DELETE `/api/notifications/clear-read`
**Description**: Clear all read notifications

**Input Fields**: None

**Expected Output**:
```json
{
  "success": true,
  "message": "Read notifications cleared successfully",
  "deleted_count": "number"
}
```

---

### GET `/api/notifications/preferences`
**Description**: Get user's notification preferences

**Input Fields**: None (uses JWT token)

**Expected Output**:
```json
{
  "success": true,
  "preferences": {
    "push": "boolean",
    "email": "boolean",
    "sms": "boolean",
    "types": {
      "badge_earned": "boolean",
      "tournament_update": "boolean",
      "payment_status": "boolean",
      "referral_bonus": "boolean",
      "system_announcement": "boolean"
    }
  }
}
```

---

### PUT `/api/notifications/preferences`
**Description**: Update user's notification preferences

**Input Fields**:
```json
{
  "preferences": {
    "push": "boolean (optional)",
    "email": "boolean (optional)",
    "sms": "boolean (optional)",
    "types": {
      "badge_earned": "boolean (optional)",
      "tournament_update": "boolean (optional)",
      "payment_status": "boolean (optional)",
      "referral_bonus": "boolean (optional)",
      "system_announcement": "boolean (optional)"
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Notification preferences updated successfully",
  "preferences": "updated_preferences_object"
}
```

---

### POST `/api/notifications/admin/broadcast`
**Description**: Send broadcast notification to all users or specific groups

**Input Fields**:
```json
{
  "title": "string (required)",
  "message": "string (required)",
  "notification_type": "string (required)",
  "target_users": ["array (optional)"],
  "target_regions": ["array (optional)"],
  "target_user_levels": ["array (optional)"],
  "scheduled_at": "date (optional)"
}
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Broadcast notification scheduled successfully",
  "target_users": "number",
  "notifications_created": "number",
  "scheduled_at": "date"
}
```

---

### GET `/api/notifications/admin/analytics`
**Description**: Get notification analytics for admin dashboard

**Input Fields** (Query Parameters):
```
period: string (default: '30d', options: '7d', '30d', '90d', '1y')
```

**Expected Output**:
```json
{
  "success": true,
  "analytics": {
    "period": "string",
    "total_notifications": "number",
    "read_notifications": "number",
    "unread_notifications": "number",
    "read_rate": "number",
    "type_breakdown": ["array"],
    "daily_trends": ["array"],
    "broadcast_stats": "object"
  }
}
```

---

## 📝 Notes

### Authentication
- Most routes require JWT authentication via `Authorization: Bearer <token>` header
- Admin routes require admin privileges
- Some routes have role-based access control

### Error Responses
All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["array of validation errors (optional)"]
}
```

### Pagination
Paginated responses include:
```json
{
  "pagination": {
    "current_page": "number",
    "total_pages": "number",
    "total_items": "number",
    "items_per_page": "number"
  }
}
```

### Date Formats
All dates are returned in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`

### Rate Limiting
- API endpoints are rate-limited to 100 requests per 15 minutes per IP
- Authentication endpoints have stricter rate limiting

### Environment Variables
Required environment variables for the API to function:
- `JWT_SECRET`: Secret key for JWT tokens
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

---

**Document Version**: 1.0.0  
**Last Updated**: 2024  
**Author**: Yash Singh (ER_SKY)
