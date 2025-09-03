# Password Hashing Issue Fix - INGAIN Platform

## 🚨 Problem Identified

The login system was failing due to a **double password hashing** issue caused by inconsistent password handling in the codebase.

### Root Cause Analysis

1. **Double Hashing Issue**: Passwords were being hashed twice:
   - **Registration Route**: Hashed the password with 12 salt rounds using `config.security.bcryptRounds`
   - **Pre-save Middleware**: Hashed the `password_hash` field again with 10 salt rounds using hardcoded values

2. **Inconsistent Salt Rounds**:
   - Registration used 12 rounds (from config)
   - Pre-save middleware used 10 rounds (hardcoded)

3. **Logic Error**: The pre-save middleware wasn't properly detecting already-hashed passwords

## ✅ Solution Implemented

### 1. Fixed PlatformUser Model (`core/models/App/PlatformUser.js`)

**Before:**
```javascript
platformUserSchema.pre("save", async function (next) {
    if (!this.isModified("password_hash")) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
});
```

**After:**
```javascript
platformUserSchema.pre("save", async function (next) {
    if (this.isModified("password_hash")) {
        // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
        const isBcryptHash = /^\$2[aby]\$/.test(this.password_hash);
        
        if (!isBcryptHash) {
            // Password is plain text, hash it with consistent salt rounds
            const config = require('../../config');
            const saltRounds = config.security.bcryptRounds || 12;
            this.password_hash = await bcrypt.hash(this.password_hash, saltRounds);
        }
        // If it's already hashed, don't hash again
    }
    next();
});
```

### 2. Fixed Registration Route (`core/routes/authRoutes.js`)

**Before:**
```javascript
// Hash password
const saltRounds = config.security.bcryptRounds || 12;
const passwordHash = await bcrypt.hash(password, saltRounds);

// Create user
const user = new PlatformUser({
    password_hash: passwordHash,
    // ...
});
```

**After:**
```javascript
// Create user (password will be hashed by the model's pre-save middleware)
const user = new PlatformUser({
    password_hash: password, // Pass plain password, model will hash it
    // ...
});
```

### 3. Fixed Password Change and Reset Routes

Updated both password change and password reset routes to pass plain text passwords to the model instead of pre-hashing them.

### 4. Fixed Seed Script (`scripts/seed.js`)

Updated admin user creation to pass plain text password instead of pre-hashed password.

### 5. Cleaned Up Debug Logging

Removed excessive debug logging from the `comparePassword` method while keeping error logging.

## 🔧 For Existing Users with Double-Hashed Passwords

### Option 1: Use the Password Fix Script

Run the fix script for the specific user:
```bash
node scripts/fix-password-hashing.js yash@gmail.com "Pass123#%"
```

Or fix all users with suspicious double-hashed passwords:
```bash
node scripts/fix-password-hashing.js
```

### Option 2: Manual Database Update

If you have access to MongoDB directly, you can update the user's password:
```javascript
// In MongoDB shell or through a script
db.platformusers.updateOne(
    { email: "yash@gmail.com" },
    { $set: { password_hash: "Pass123#%" } }
);
```

After the update, the pre-save middleware will properly hash the plain text password on the next save.

## 🧪 Testing the Fix

Run the test script to verify everything is working:
```bash
# Test general functionality
node scripts/test-password-hashing.js

# Test specific user login
node scripts/test-password-hashing.js yash@gmail.com "Pass123#%"
```

## 📋 Verification Checklist

- [ ] **New User Registration**: Creates users with properly hashed passwords (60-character bcrypt hash)
- [ ] **User Login**: Existing and new users can log in successfully
- [ ] **Password Change**: Users can change their passwords without issues
- [ ] **Password Reset**: Password reset functionality works correctly
- [ ] **No Double Hashing**: Passwords are only hashed once with consistent salt rounds
- [ ] **Consistent Salt Rounds**: All password hashing uses the configured salt rounds (12)

## 🔒 Security Improvements

1. **Consistent Hashing**: All passwords now use the same hashing configuration
2. **Proper Hash Detection**: System correctly identifies already-hashed passwords
3. **No Double Hashing**: Eliminates the security weakness of double-hashed passwords
4. **Centralized Logic**: Password hashing logic is now centralized in the model

## 🚀 Next Steps

1. **Test in Development**: Verify all authentication flows work correctly
2. **Update Existing Users**: Run the fix script for any existing users with login issues
3. **Remove Debug Routes**: Remove the debug routes (`/debug/users`, `/debug/test-password`) in production
4. **Monitor Logs**: Watch for any authentication errors after deployment

## 📝 Files Modified

- `core/models/App/PlatformUser.js` - Fixed pre-save middleware and cleaned up logging
- `core/routes/authRoutes.js` - Updated registration, password change, and reset routes  
- `scripts/seed.js` - Fixed admin user creation
- `scripts/fix-password-hashing.js` - **NEW** - Script to fix existing double-hashed passwords
- `scripts/test-password-hashing.js` - **NEW** - Script to test password functionality

The password mismatch error should now be resolved for all users, including the existing `yash@gmail.com` account after running the fix script.