# Model Information

This document lists all fields for each model in the INGAIN Share-to-Earn Platform codebase, including type, required status, and default values where applicable.

---

## PlatformUser
- unique_id: String, required, unique
- name: String, required
- email: String, required, unique
- password_hash: String, required
- phone: String
- address: Object, required
- region: String, required
- preferred_regions: [String]
- preferences: Object, default {}
- total_apps_shared: Number, default 0
- total_xp_earned: Number, default 0
- total_points_earned: Number, default 0
- current_xp: Number, default 0
- current_points: Number, default 0
- user_level: Number, default 1
- last_payout_date: Date
- next_payout_date: Date
- total_payouts_received: Number, default 0.0
- total_badges_earned: Number, default 0
- badges_ids: [String]
- total_tournaments_participated: Number, default 0
- total_tournaments_won: Number, default 0
- active_tournament_ids: [String]
- sharing_streak_days: Number, default 0
- longest_sharing_streak: Number, default 0
- last_share_date: Date
- successful_referrals_count: Number, default 0
- is_active: Boolean, default true
- email_verified: Boolean, default false
- kyc_status: String, default 'pending'
- kyc_verified_at: Date
- bank_details: Object
- referral_code: String, unique
- referred_by: String
- referral_count: Number, default 0
- total_referrals_completed: Number, default 0
- total_referral_earnings: { xp: Number, default 0; points: Number, default 0 }
- mfa_enabled: Boolean, default false
- last_login_at: Date
- login_attempts: Number, default 0
- locked_until: Date
- created_at: Date, default Date.now
- updated_at: Date, default Date.now
- created_by: String
- points_to_usd_value: Number, default 0.0

---

## Tournament
- unique_id: String, required, unique
- tournament_name: String, required
- tournament_description: String
- tournament_category: String, enum, default 'weekly_challenge'
- tournament_type: String, enum, default 'regional'
- start_date: Date, required
- end_date: Date, required
- registration_deadline: Date
- apps_involved: [String], required
- prizes: Object, required (see model for structure)
- total_xp_allocated: Number, default 0
- total_points_allocated: Number, default 0
- eligible_regions: [String], required, default ['GLOBAL']
- eligible_cities: [String], default []
- participant_details: Object (see model for structure)
- winners: Object
- tournament_rules: Object, required (see model for structure)
- status: String, enum, default 'draft'
- is_active: Boolean, default true
- total_shares: Number, default 0
- total_participants: Number, default 0
- total_referral_count: Number, default 0
- reward_multiplier: Number, default 1.00
- created_at: Date, default Date.now
- updated_at: Date, default Date.now
- created_by: String, required

---

## App
- unique_id: String, required, unique
- app_name: String, required
- app_description: String
- app_logo: String
- app_xp: Number, default 0
- app_points: Number, default 0
- categories: [String]
- total_shared: Number, default 0
- total_xp_allocated: Number, default 0
- total_points_allocated: Number, default 0
- total_xp_spent: Number, default 0
- total_points_spent: Number, default 0
- is_active: Boolean, default true
- is_featured: Boolean, default false
- geo_availability: [String], default []
- host_id: String, required
- share_rules: Object, default {}
- tracking_config: Object, default {}
- monetization_config: Object, default {}
- created_at: Date, default Date.now
- updated_at: Date, default Date.now
- created_by: String

---

## Badge
- unique_id: String, required, unique
- badge_name: String, required
- badge_classification: String, enum, default 'achievement'
- badge_description: String
- badge_icon: String
- criteria_type: String, required, enum
- threshold_value: Number, required
- threshold_operator: String, enum, default '>='
- secondary_criteria: Object, default null
- rarity: String, enum, default 'common'
- xp_value_gifted: Number, default 0
- points_value_gifted: Number, default 0
- users_achieved_count: Number, default 0
- is_active: Boolean, default true
- is_hidden: Boolean, default false
- is_repeatable: Boolean, default false
- cooldown_days: Number, default 0
- prerequisite_badges: [String], default []
- exclusive_with: [String], default []
- seasonal_start: Date, default null
- seasonal_end: Date, default null

---

## Payment
- unique_id: String, required, unique
- user_id: String, ref PlatformUser
- host_id: String, ref PlatformUser
- payment_type: String, required, enum
- amount: Number, required
- currency: String, default 'USD', enum
- points_converted: Number, default 0
- conversion_rate: Number, default 0.100
- payment_method: String, required, enum
- payment_details: Object (see model for structure)
- status: String, enum, default 'pending'
- external_transaction_id: String
- processor_name: String, enum
- requires_approval: Boolean, default true
- approved_by: String, ref AdminUser
- approved_at: Date
- rejection_reason: String
- initiated_at: Date
- completed_at: Date
- failed_at: Date
- failure_reason: String
- processing_fee: Number, default 0
- platform_fee: Number, default 0
- net_amount: Number, default null
- idempotency_key: String, unique
- notes: String
- metadata: Object (see model for structure)
- created_at: Date, default Date.now
- updated_at: Date, default Date.now

---

*For details on nested objects (prizes, participant_details, tournament_rules, payment_details, metadata, etc.), see the respective model files.*
