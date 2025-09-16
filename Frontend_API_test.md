# Ingain API Documentation

This document provides comprehensive documentation for all APIs used in the Ingain application, including input parameters, output fields, and response structures.

## Base Configuration

- **Base URL**: `https://608448862f3b.ngrok-free.app/api` (or `process.env.EXPO_PUBLIC_API_BASE_URL`)
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token (stored in AsyncStorage as `authToken`)

## Response Structure

All API responses follow this general structure:
```typescript
{
  success: boolean;
  message?: string;
  data?: any;
  errors?: string[];
}
```

For paginated responses:
```typescript
{
  data: {
    [items]: any[];
    currentPage: number;
    total: number;
    totalPages: number;
  };
  status: number;
}
```

---

## 1. Authentication API (`authAPI`)

### 1.1 Register User
**Endpoint**: `POST /auth/register`

**Input**:
```typescript
{
  name: string;
  email: string;
  password: string;
  referral_code?: string;
  device_info: {
    device_id: string;
    device_type: 'ios' | 'android' | 'mobile';
    os_version: string;
    app_version: string;
    platform: string;
    app_name: string;
  };
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: {
    token: string;
    refresh_token?: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      current_xp: number;
      current_points: number;
      referral_code: string;
      user_level: number;
      kyc_status: string;
      email_verified: boolean;
      badges_ids: string[];
      tournaments: string[];
      saved_apps: string[];
      activity_history: any[];
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
  };
}
```

### 1.2 Login User
**Endpoint**: `POST /auth/login`

**Input**:
```typescript
{
  email: string;
  password: string;
  device_info: DeviceInfo;
}
```

**Output**: Same as Register User

### 1.3 Refresh Token
**Endpoint**: `POST /auth/refresh`

**Input**:
```typescript
{
  refresh_token: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  token: string;
  refresh_token?: string;
}
```

### 1.4 Logout User
**Endpoint**: `POST /auth/logout`

**Input**:
```typescript
{
  refresh_token: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 1.5 Forgot Password
**Endpoint**: `POST /auth/forgot-password`

**Input**:
```typescript
{
  email: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 1.6 Reset Password
**Endpoint**: `POST /auth/reset-password`

**Input**:
```typescript
{
  reset_token: string;
  new_password: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 1.7 Get Auth Profile
**Endpoint**: `GET /auth/profile`

**Output**:
```typescript
{
  success: boolean;
  data: User;
}
```

### 1.8 Update Auth Profile
**Endpoint**: `PUT /auth/profile`

**Input**:
```typescript
{
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  address?: Address;
}
```

**Output**:
```typescript
{
  success: boolean;
  data: User;
}
```

### 1.9 Change Password
**Endpoint**: `POST /auth/change-password`

**Input**:
```typescript
{
  current_password: string;
  new_password: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

---

## 2. Apps API (`appsAPI`)

### 2.1 List Apps
**Endpoint**: `GET /apps`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  featured?: boolean;
  active?: boolean;
}
```

**Output**:
```typescript
{
  data: {
    apps: App[];
    currentPage: number;
    total: number;
    totalPages: number;
  };
  status: number;
}
```

**App Object**:
```typescript
{
  _id: string;
  app_name: string;
  app_description: string;
  app_icon: string;
  app_logo?: string;
  app_xp: number;
  app_points: number;
  rating: number;
  total_shared: number;
  categories: string[];
  app_features?: string[];
  screenshots?: string[];
  app_store_url?: string;
  play_store_url?: string;
  unique_id: string;
  is_active: boolean;
  is_featured: boolean;
  geo_availability: string[];
  created_at: string;
  updated_at: string;
  monetization_config?: any;
  share_rules?: any;
  tracking_config?: any;
}
```

### 2.2 Get App by ID
**Endpoint**: `GET /apps/{id}`

**Input**: App ID as path parameter

**Output**:
```typescript
{
  data: {
    app: App;
  };
  status: number;
}
```

### 2.3 Get App Stats
**Endpoint**: `GET /apps/{id}/stats`

**Input**: App ID as path parameter

**Output**:
```typescript
{
  data: {
    total_shares: number;
    total_referrals: number;
    conversion_rate: number;
    daily_stats: any[];
  };
  status: number;
}
```

### 2.4 Successful Referral
**Endpoint**: `POST /apps/{id}/successful-referral`

**Input**: App ID as path parameter

**Output**:
```typescript
{
  success: boolean;
  message: string;
  xpGained: number;
  pointsGained: number;
  newlyAwardedBadges: Badge[];
}
```

---

## 3. Badges API (`badgesAPI`)

### 3.1 List Badges
**Endpoint**: `GET /badges`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  active?: boolean;
}
```

**Output**:
```typescript
{
  data: {
    badges: Badge[];
    currentPage: number;
    total: number;
    totalPages: number;
  };
  status: number;
}
```

**Badge Object**:
```typescript
{
  _id: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  badge_type: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: {
    type: 'shares' | 'referrals' | 'xp' | 'points' | 'days_active' | 'level';
    target_value: number;
    current_value: number;
    conditions?: {
      min_level?: number;
      specific_apps?: string[];
      time_period_days?: number;
      consecutive_days?: boolean;
      tournament_participation?: boolean;
    };
    progress_tracking: {
      start_date: string;
      end_date?: string;
      reset_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
    };
  };
  xp_reward: number;
  points_reward: number;
  is_active: boolean;
  users_achieved_count?: number;
}
```

### 3.2 Get Badge by ID
**Endpoint**: `GET /badges/{id}`

**Input**: Badge ID as path parameter

**Output**:
```typescript
{
  data: Badge;
  status: number;
}
```

### 3.3 Get User Badges
**Endpoint**: `GET /badges/user`

**Output**:
```typescript
{
  data: UserBadge[];
  status: number;
}
```

**UserBadge Object**:
```typescript
{
  _id: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  earned_at: string;
  xp_reward: number;
  points_reward: number;
}
```

### 3.4 Get Badge Progress
**Endpoint**: `GET /badges/progress`

**Output**:
```typescript
{
  data: BadgeProgress[];
  status: number;
}
```

**BadgeProgress Object**:
```typescript
{
  badge_id: string;
  badge_name: string;
  current_progress: number;
  required_progress: number;
  progress_percentage: number;
}
```

---

## 4. Tournaments API (`tournamentsAPI`)

### 4.1 List Tournaments
**Endpoint**: `GET /competitions`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  active?: boolean;
  upcoming?: boolean;
  status?: string;
}
```

**Output**:
```typescript
{
  data: {
    tournaments: Tournament[];
    currentPage: number;
    total: number;
    totalPages: number;
  };
  status: number;
}
```

**Tournament Object**:
```typescript
{
  _id: string;
  tournament_name: string;
  tournament_description: string;
  tournament_category: string;
  tournament_type: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  apps_involved: string[];
  prizes: {
    first_place: { xp: number; points: number; cash: number };
    second_place: { xp: number; points: number; cash: number };
    third_place: { xp: number; points: number; cash: number };
    participation: { xp: number; points: number };
  };
  total_xp_allocated: number;
  total_points_allocated: number;
  eligible_regions: string[];
  eligible_cities: string[];
  participant_details: {
    max_participants: number;
    min_level_required: number;
    registration_fee: number;
    current_participants: number;
  };
  tournament_rules: {
    scoring_method: string;
    bonus_multiplier: number;
    min_shares_required: number;
    max_shares_per_day: number;
    tie_breaker: string;
    disqualification_rules: string[];
    verification_required: boolean;
  };
  status: string;
  is_active: boolean;
  total_shares: number;
  total_participants: number;
  total_referral_count: number;
  reward_multiplier: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  duration_days: number;
  time_until_start: number;
  time_remaining: number;
  registration_open: boolean;
  progress_percentage: number;
  prize_pool: number;
}
```

### 4.2 Get Tournament by ID
**Endpoint**: `GET /competitions/{id}`

**Input**: Tournament ID as path parameter

**Output**:
```typescript
{
  data: Tournament;
  status: number;
}
```

### 4.3 Join Tournament
**Endpoint**: `POST /competitions/{id}/join`

**Input**: Tournament ID as path parameter

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 4.4 Leave Tournament
**Endpoint**: `DELETE /competitions/{id}/leave`

**Input**: Tournament ID as path parameter

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 4.5 Submit Tournament Entry
**Endpoint**: `POST /competitions/{id}/submit`

**Input**:
```typescript
{
  app_id: string;
  additional_data?: any;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  submission: any;
}
```

### 4.6 Get User Tournaments
**Endpoint**: `GET /competitions/user/tournaments`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  status?: string;
}
```

**Output**:
```typescript
{
  data: Tournament[];
  status: number;
}
```

### 4.7 Get Tournament Leaderboard
**Endpoint**: `GET /competitions/leaderboard/{tournamentId}`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
}
```

**Output**:
```typescript
{
  data: {
    tournament_id: string;
    tournament_name: string;
    last_updated: string;
    total_participants: number;
    leaderboard: LeaderboardEntry[];
  };
  status: number;
}
```

**LeaderboardEntry Object**:
```typescript
{
  rank: number;
  user_id: string;
  user_name: string;
  total_xp: number;
  total_points: number;
  total_shares: number;
}
```

---

## 5. Categories API (`categoriesAPI`)

### 5.1 List Categories
**Endpoint**: `GET /categories`

**Input** (Query Parameters):
```typescript
{
  active?: boolean;
}
```

**Output**:
```typescript
{
  data: Category[];
  status: number;
}
```

**Category Object**:
```typescript
{
  _id: string;
  name: string;
  description: string;
  slug: string;
  icon: string;
  is_active: boolean;
  app_count: number;
}
```

### 5.2 Get Category by ID
**Endpoint**: `GET /categories/{id}`

**Input**: Category ID as path parameter

**Output**:
```typescript
{
  data: Category;
  status: number;
}
```

---

## 6. Referrals API (`referralsAPI`)

### 6.1 Get Referral Info
**Endpoint**: `GET /referrals`

**Output**:
```typescript
{
  data: {
    referral_code: string;
    total_referrals: number;
    active_referrals: number;
    completed_referrals: number;
    success_rate: string;
    total_earnings: {
      xp: number;
      points: number;
    };
  };
  status: number;
}
```

### 6.2 Get Referral Stats
**Endpoint**: `GET /referrals/stats`

**Output**:
```typescript
{
  data: ReferralStats;
  status: number;
}
```

**ReferralStats Object**:
```typescript
{
  referral_code: string;
  total_referrals: number;
  active_referrals: number;
  completed_referrals: number;
  success_rate: string;
  total_earnings: {
    xp: number;
    points: number;
  };
  average_earnings_per_referral: {
    xp: string;
    points: string;
  };
  detailed_stats: ReferralDetail[];
}
```

### 6.3 Get Referral History
**Endpoint**: `GET /referrals/history`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  status?: string;
}
```

**Output**:
```typescript
{
  data: ReferralDetail[];
  status: number;
}
```

### 6.4 Get Referral Leaderboard
**Endpoint**: `GET /referrals/leaderboard`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  period?: string;
}
```

**Output**:
```typescript
{
  data: LeaderboardEntry[];
  status: number;
}
```

### 6.5 Create Referral
**Endpoint**: `POST /referrals/create`

**Input**:
```typescript
{
  referral_code: string;
  metadata?: any;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: ReferralDetail;
}
```

### 6.6 Generate Referral Code
**Endpoint**: `POST /referrals/code/generate`

**Output**:
```typescript
{
  success: boolean;
  data: {
    referral_code: string;
  };
}
```

### 6.7 Get Referral by ID
**Endpoint**: `GET /referrals/{referralId}`

**Input**: Referral ID as path parameter

**Output**:
```typescript
{
  data: ReferralDetail;
  status: number;
}
```

### 6.8 Update Referral Progress
**Endpoint**: `PUT /referrals/progress/{referralId}`

**Input**:
```typescript
{
  status?: string;
  activation_percentage?: number;
  notes?: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: ReferralDetail;
}
```

### 6.9 Process Referral Rewards
**Endpoint**: `POST /referrals/rewards/{referralId}/process`

**Input**: Referral ID as path parameter

**Output**:
```typescript
{
  success: boolean;
  message: string;
  rewards: {
    xp: number;
    points: number;
  };
}
```

### 6.10 Get Referral Analytics
**Endpoint**: `GET /referrals/analytics`

**Input** (Query Parameters):
```typescript
{
  period?: string;
  start_date?: string;
  end_date?: string;
}
```

**Output**:
```typescript
{
  data: {
    period: string;
    total_referrals: number;
    conversion_rate: number;
    total_earnings: {
      xp: number;
      points: number;
    };
    daily_stats: any[];
  };
  status: number;
}
```

### 6.11 Get Referral Progress
**Endpoint**: `GET /referrals/progress`

**Output**:
```typescript
{
  data: {
    milestones: any[];
    current_progress: any;
  };
  status: number;
}
```

---

## 7. Profile API (`profileAPI`)

### 7.1 Get Profile
**Endpoint**: `GET /profile`

**Output**:
```typescript
{
  data: User;
  status: number;
}
```

### 7.2 Update Profile
**Endpoint**: `PUT /profile`

**Input**:
```typescript
{
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  address?: Address;
  preferences?: any;
}
```

**Output**:
```typescript
{
  data: User;
  status: number;
}
```

---

## 8. Payments API (`paymentsAPI`)

### 8.1 Request Payout
**Endpoint**: `POST /payments/payout`

**Input**:
```typescript
{
  amount: number;
  payment_method: string;
  payment_details: {
    account_name?: string;
    account_number?: string;
    routing_number?: string;
    swift_code?: string;
    paypal_email?: string;
    stripe_payment_intent?: string;
    crypto_address?: string;
    check_number?: string;
  };
  notes?: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: {
    payment_id: string;
    status: string;
    estimated_processing_time: string;
  };
}
```

### 8.2 Get Payment History
**Endpoint**: `GET /payments/history`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}
```

**Output**:
```typescript
{
  data: Payment[];
  pagination: Pagination;
  status: number;
}
```

### 8.3 Get Payment by ID
**Endpoint**: `GET /payments/{id}`

**Input**: Payment ID as path parameter

**Output**:
```typescript
{
  data: Payment;
  status: number;
}
```

---

## 9. Shares API (`sharesAPI`)

### 9.1 Generate Share Link
**Endpoint**: `POST /shares/generate`

**Input**:
```typescript
{
  app_id: string;
  tournament_id?: string;
  share_type: string;
  metadata?: any;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: {
    tracking_id: string;
    share_url: string;
    share_type: string;
    app_name: string;
    tournament_name?: string;
    expires_at: string;
    estimated_rewards: {
      xp: number;
      points: number;
    };
  };
}
```

### 9.2 Get Share History
**Endpoint**: `GET /shares/history`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  app_id?: string;
  tournament_id?: string;
  status?: string;
}
```

**Output**:
```typescript
{
  data: ShareHistory[];
  pagination: Pagination;
  status: number;
}
```

---

## 10. Notifications API (`notificationsAPI`)

### 10.1 List Notifications
**Endpoint**: `GET /notifications`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  unread_only?: boolean;
  type?: string;
}
```

**Output**:
```typescript
{
  data: {
    notifications: Notification[];
    currentPage: number;
    total: number;
    totalPages: number;
  };
  status: number;
}
```

**Notification Object**:
```typescript
{
  _id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}
```

### 10.2 Get Unread Count
**Endpoint**: `GET /notifications/unread-count`

**Output**:
```typescript
{
  data: {
    count: number;
  };
  status: number;
}
```

### 10.3 Mark Notification as Read
**Endpoint**: `POST /notifications/{id}/read`

**Input**: Notification ID as path parameter

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 10.4 Mark All as Read
**Endpoint**: `POST /notifications/read-all`

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 10.5 Delete Notification
**Endpoint**: `DELETE /notifications/{id}`

**Input**: Notification ID as path parameter

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 10.6 Clear Read Notifications
**Endpoint**: `DELETE /notifications/clear-read`

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 10.7 Get Notification Preferences
**Endpoint**: `GET /notifications/preferences`

**Output**:
```typescript
{
  data: {
    email_notifications: boolean;
    push_notifications: boolean;
    sms_notifications: boolean;
    notification_types: any;
  };
  status: number;
}
```

### 10.8 Update Notification Preferences
**Endpoint**: `PUT /notifications/preferences`

**Input**:
```typescript
{
  preferences: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    sms_notifications?: boolean;
    notification_types?: any;
  };
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

---

## 11. Admin API (`adminAPI`)

### 11.1 User Management

#### 11.1.1 List Users
**Endpoint**: `GET /admin/users`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}
```

**Output**:
```typescript
{
  data: User[];
  pagination: Pagination;
  status: number;
}
```

#### 11.1.2 Get User by ID
**Endpoint**: `GET /admin/users/{id}`

**Input**: User ID as path parameter

**Output**:
```typescript
{
  data: User;
  status: number;
}
```

#### 11.1.3 Update User Status
**Endpoint**: `PUT /admin/users/{id}/status`

**Input**:
```typescript
{
  status: 'active' | 'suspended' | 'banned';
  reason?: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

#### 11.1.4 Adjust User Points
**Endpoint**: `POST /admin/users/{id}/adjust-points`

**Input**:
```typescript
{
  points: number;
  reason: string;
  type: 'add' | 'subtract';
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  new_balance: number;
}
```

### 11.2 Tournament Management

#### 11.2.1 Create Tournament
**Endpoint**: `POST /admin/tournaments`

**Input**:
```typescript
{
  tournament_name: string;
  tournament_description: string;
  tournament_category: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  apps_involved: string[];
  prizes: TournamentPrizes;
  participant_details: ParticipantDetails;
  tournament_rules: TournamentRules;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: Tournament;
}
```

#### 11.2.2 Update Tournament
**Endpoint**: `PUT /admin/tournaments/{id}`

**Input**: Same as Create Tournament

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: Tournament;
}
```

### 11.3 Fraud Management

#### 11.3.1 Get Fraud Reports
**Endpoint**: `GET /admin/fraud-reports`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
}
```

**Output**:
```typescript
{
  data: any[];
  pagination: Pagination;
  status: number;
}
```

#### 11.3.2 Review Fraud Report
**Endpoint**: `POST /admin/fraud-reports/{id}/review`

**Input**:
```typescript
{
  action: 'dismiss' | 'investigate' | 'resolve';
  notes?: string;
  severity?: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

### 11.4 Analytics

#### 11.4.1 Get Dashboard Analytics
**Endpoint**: `GET /admin/analytics/dashboard`

**Input** (Query Parameters):
```typescript
{
  period?: string;
  start_date?: string;
  end_date?: string;
}
```

**Output**:
```typescript
{
  data: PlatformAnalytics;
  status: number;
}
```

---

## 12. Host API (`hostAPI`)

### 12.1 Register Host Account
**Endpoint**: `POST /host/register`

**Input**:
```typescript
{
  company_name: string;
  business_type: string;
  website_url?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  business_address?: Address;
  tax_id?: string;
  bank_details?: PaymentDetails;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: HostAccount;
}
```

### 12.2 Get Host Profile
**Endpoint**: `GET /host/profile`

**Output**:
```typescript
{
  data: HostAccount;
  status: number;
}
```

### 12.3 Update Host Profile
**Endpoint**: `PUT /host/profile`

**Input**: Same as Register Host Account

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: HostAccount;
}
```

### 12.4 App Management

#### 12.4.1 Create App
**Endpoint**: `POST /host/apps`

**Input**:
```typescript
{
  app_name: string;
  app_description: string;
  app_icon: string;
  app_store_url?: string;
  play_store_url?: string;
  app_xp: number;
  app_points: number;
  categories: string[];
  app_features?: string[];
  screenshots?: string[];
  monetization_config?: any;
  share_rules?: any;
  tracking_config?: any;
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: App;
}
```

#### 12.4.2 List Host Apps
**Endpoint**: `GET /host/apps`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  status?: string;
}
```

**Output**:
```typescript
{
  data: App[];
  pagination: Pagination;
  status: number;
}
```

#### 12.4.3 Update App
**Endpoint**: `PUT /host/apps/{id}`

**Input**: Same as Create App

**Output**:
```typescript
{
  success: boolean;
  message: string;
  data: App;
}
```

#### 12.4.4 Delete App
**Endpoint**: `DELETE /host/apps/{id}`

**Input**: App ID as path parameter

**Output**:
```typescript
{
  success: boolean;
  message: string;
}
```

#### 12.4.5 Get App Analytics
**Endpoint**: `GET /host/apps/{id}/analytics`

**Input** (Query Parameters):
```typescript
{
  period?: string;
  start_date?: string;
  end_date?: string;
}
```

**Output**:
```typescript
{
  data: {
    total_shares: number;
    total_referrals: number;
    conversion_rate: number;
    daily_stats: any[];
    user_demographics: any;
    performance_metrics: any;
  };
  status: number;
}
```

### 12.5 Get Host Earnings
**Endpoint**: `GET /host/earnings`

**Input** (Query Parameters):
```typescript
{
  page?: number;
  limit?: number;
  period?: string;
  start_date?: string;
  end_date?: string;
}
```

**Output**:
```typescript
{
  data: {
    total_earnings: number;
    pending_earnings: number;
    paid_earnings: number;
    earnings_breakdown: any[];
    payment_history: Payment[];
  };
  pagination: Pagination;
  status: number;
}
```

---

## Common Data Types

### Address
```typescript
{
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  apartment?: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  is_primary: boolean;
  address_type: 'home' | 'work' | 'other';
}
```

### DeviceInfo
```typescript
{
  device_id: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  os_version: string;
  app_version: string;
  device_model: string;
  screen_resolution: string;
  timezone: string;
  language: string;
  push_token?: string;
  last_seen: string;
}
```

### Pagination
```typescript
{
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next_page: boolean;
  has_previous_page: boolean;
  next_page_url?: string;
  previous_page_url?: string;
}
```

### PaymentDetails
```typescript
{
  account_name?: string;
  account_number?: string;
  routing_number?: string;
  swift_code?: string;
  paypal_email?: string;
  stripe_payment_intent?: string;
  crypto_address?: string;
  check_number?: string;
}
```

---

## Error Handling

All APIs can return the following error responses:

### 400 Bad Request
```typescript
{
  success: false;
  message: string;
  errors: string[];
}
```

### 401 Unauthorized
```typescript
{
  success: false;
  message: "Authentication failed";
  code: "AUTH_ERROR";
}
```

### 403 Forbidden
```typescript
{
  success: false;
  message: "Access denied";
  code: "FORBIDDEN";
}
```

### 404 Not Found
```typescript
{
  success: false;
  message: "Resource not found";
  code: "NOT_FOUND";
}
```

### 500 Internal Server Error
```typescript
{
  success: false;
  message: "Server error occurred";
  code: "SERVER_ERROR";
}
```

---

## Authentication

Most endpoints require authentication via Bearer token:

```
Authorization: Bearer <token>
```

The token is automatically added to requests via the axios interceptor from AsyncStorage.

---

## Rate Limiting

API requests are subject to rate limiting. If you exceed the rate limit, you'll receive a 429 status code with:

```typescript
{
  success: false;
  message: "Rate limit exceeded";
  code: "RATE_LIMIT_EXCEEDED";
  retry_after: number; // seconds
}
```

---

## Notes

1. All timestamps are in ISO 8601 format
2. All monetary values are in the base currency (USD)
3. Pagination is 1-indexed (page 1, 2, 3...)
4. Boolean values are `true`/`false` (not 1/0)
5. Empty arrays are returned as `[]`, not `null`
6. Optional fields are marked with `?` in TypeScript definitions
7. All API responses include proper HTTP status codes
8. Error responses include descriptive messages and error codes
9. The API supports CORS for web applications
10. All endpoints support JSON content type
