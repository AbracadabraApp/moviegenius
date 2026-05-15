# iOS Sign-In Setup - Implementation Complete

**Date:** 2026-05-14
**Status:** Backend Complete - iOS Implementation Ready

---

## ✅ Completed via CLI

### Backend Implementation
- ✅ **JWT Helper Library** - `/lib/jwt-ios.js` (custom token generation/verification)
- ✅ **Apple Token Verification** - `/lib/apple-signin-verify.js` (verifies tokens with Apple's public keys)
- ✅ **Authentication API** - `/pages/api/v1/auth/apple.js` (POST endpoint for Sign in with Apple)
- ✅ **Favorites API** - `/pages/api/v1/user/favorites.js` (GET/POST endpoints)
- ✅ **Delete Favorite API** - `/pages/api/v1/user/favorites/[tmdbId].js` (DELETE endpoint)
- ✅ **Dependencies Installed** - `jsonwebtoken`, `jwks-rsa`

### Database
- ✅ **Migration Complete** - Extended `users` table with `apple_id` column
- ✅ **Tables Created** - `user_favorites`, `user_queue` with proper indexes
- ✅ **Schema Updated** - All constraints and foreign keys in place

### Environment
- ✅ **JWT Secret Generated** - `IOS_JWT_SECRET` added to local `.env.local`
- ✅ **Local Environment** - Ready for development testing

---

## 📋 Remaining Manual Steps

### 1. Add IOS_JWT_SECRET to Railway (Production)

**Action Required:**
```bash
# In Railway dashboard:
# 1. Go to your MovieGenius project
# 2. Select the service
# 3. Click "Variables" tab
# 4. Add new variable:

IOS_JWT_SECRET=4e7ab7c2f54209b7281215eaaa67b37b5bfdc235768d026d83d3e06d8bd03c04
```

**Verification:**
```bash
# After deploying, check the secret is loaded:
curl https://moviegenius.ai/api/v1/auth/apple -X POST \
  -H "Content-Type: application/json" \
  -d '{"identityToken": "invalid"}'
# Should return 401 Unauthorized (not 500 Internal Server Error)
```

---

### 2. Copy iOS Swift Files to Xcode

All iOS implementation code is ready in `/docs/IOS_SIGNIN_ARCHITECTURE_PLAN_V2.md`.

**Files to create in Xcode:**

#### 2.1 KeychainManager.swift
**Location:** `ios/moviegenius/moviegenius/Managers/KeychainManager.swift`
**Purpose:** Secure JWT token storage in iOS Keychain

**Copy code from architecture plan V2, section: "iOS Implementation → KeychainManager (Secure Token Storage)"**

Key methods:
- `saveToken(_ token: String)` - Save JWT to Keychain
- `getToken() -> String?` - Retrieve JWT from Keychain
- `deleteToken()` - Remove JWT on sign-out

#### 2.2 AuthManager.swift
**Location:** `ios/moviegenius/moviegenius/Managers/AuthManager.swift`
**Purpose:** Handle Sign in with Apple and communicate with backend API

**Copy code from architecture plan V2, section: "iOS Implementation → AuthManager (Sign in with Apple + API)"**

Key methods:
- `signInWithApple()` - Trigger Apple Sign-In flow
- `handleSignInResult()` - Send token to `/api/v1/auth/apple`
- `signOut()` - Clear authentication state
- `getAuthToken()` - Get current JWT for API requests

#### 2.3 SignInPromptView.swift
**Location:** `ios/moviegenius/moviegenius/Views/SignInPromptView.swift`
**Purpose:** Lazy sign-in modal shown on first favorite tap

**Copy code from architecture plan V2, section: "iOS Implementation → SignInPromptView (Lazy Sign-In UX)"**

Features:
- "Sign in to save favorites" messaging
- Native Sign in with Apple button
- "Maybe later" dismiss option

#### 2.4 Refactor FavoritesManager.swift
**Location:** Modify existing `ios/moviegenius/moviegenius/Managers/FavoritesManager.swift` (or wherever it currently exists)
**Purpose:** Add cloud sync capabilities

**Copy code from architecture plan V2, section: "iOS Implementation → Refactor FavoritesManager for Cloud Sync"**

New methods:
- `syncWithCloud()` - Union merge local + cloud favorites
- `syncToCloud(tmdbId:action:)` - Push single favorite to API
- Uses AuthManager to get JWT for Authorization header

#### 2.5 Update FavoriteButtons.swift
**Location:** Modify existing `ios/moviegenius/moviegenius/Components/FavoriteButtons.swift`
**Purpose:** Trigger sign-in prompt on first tap

**Copy code from architecture plan V2, section: "iOS Implementation → Update FavoriteButtons to Trigger Sign-In"**

Changes:
- Check `authManager.isAuthenticated` before allowing favorites
- Show `SignInPromptView` sheet if not authenticated
- Sync to cloud after sign-in completes

---

### 3. Enable Sign in with Apple in Xcode

#### 3.1 Add Capability in Xcode
```
1. Open ios/moviegenius/moviegenius.xcodeproj in Xcode
2. Select the project in navigator (top left)
3. Select "moviegenius" target
4. Click "Signing & Capabilities" tab
5. Click "+ Capability" button
6. Search for "Sign in with Apple"
7. Double-click to add it
```

#### 3.2 Enable in Apple Developer Portal
```
1. Go to https://developer.apple.com/account/
2. Navigate to "Certificates, Identifiers & Profiles"
3. Click "Identifiers" → Select your App ID (com.moviegenius.app)
4. Scroll to "Sign in with Apple" capability
5. Check the box to enable it
6. Click "Save"
```

---

### 4. Test the Implementation

#### 4.1 Test Backend API Locally
```bash
# Start local dev server
npm run dev

# Test Apple Sign-In endpoint (should return 400 - identityToken required)
curl http://localhost:3000/api/v1/auth/apple -X POST \
  -H "Content-Type: application/json" \
  -d '{}'

# Test favorites endpoint (should return 401 - Unauthorized)
curl http://localhost:3000/api/v1/user/favorites \
  -H "Authorization: Bearer invalid_token"
```

#### 4.2 Test iOS App
```
1. Build and run on iOS Simulator or device
2. Navigate to a movie detail page
3. Tap "Seen It" or "Watch It" button
4. Should see "Sign in to save favorites" modal
5. Tap "Sign in with Apple"
6. Complete Apple authentication
7. Should see favorites save successfully
8. Kill app and relaunch
9. Favorites should persist (loaded from cloud)
```

---

## 🏗️ Architecture Summary

**Authentication Flow:**
```
iOS App (SwiftUI)
  ↓ User taps favorite button
  ↓ Check if authenticated
  ↓ If NO → Show SignInPromptView
  ↓ User taps "Sign in with Apple"
  ↓ Apple AuthenticationServices framework
  ↓ Returns Apple identity token
  ↓ POST /api/v1/auth/apple { identityToken }
Next.js API
  ↓ Verify token with Apple's public keys (jwks-rsa)
  ↓ Extract Apple user ID (sub claim)
  ↓ Create/update user in PostgreSQL
  ↓ Generate custom JWT (7-day expiry)
  ↓ Return { token, user }
iOS App
  ↓ Save JWT in Keychain (encrypted)
  ↓ Set isAuthenticated = true
  ↓ Sync local favorites to cloud
  ↓ All future API requests include:
     Authorization: Bearer <JWT>
```

**Data Sync Strategy:**
- **Union Merge:** Local ∪ Cloud (never delete)
- **First Sign-In:** Push all local favorites to cloud
- **Subsequent Opens:** Merge cloud favorites into local
- **New Favorites:** Instantly saved to cloud + local

---

## 🔒 Security Features

- ✅ JWT stored in iOS Keychain (encrypted by OS)
- ✅ 7-day token expiry (re-authenticate periodically)
- ✅ Apple token verified with Apple's public keys
- ✅ HTTPS-only API communication
- ✅ No tokens in logs or UserDefaults
- ✅ CASCADE delete on user removal (GDPR compliant)

---

## 📚 Reference Documentation

- **Full Architecture:** `/docs/IOS_SIGNIN_ARCHITECTURE_PLAN_V2.md`
- **Database Migration:** `/migrations/001_add_user_auth_tables.sql`
- **API Reference:** Coming soon - document `/api/v1/auth/apple` and `/api/v1/user/favorites`

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Add `IOS_JWT_SECRET` to Railway environment variables
- [ ] Deploy to Railway (migration already run locally)
- [ ] Verify `/api/v1/auth/apple` endpoint is accessible
- [ ] Verify `/api/v1/user/favorites` endpoint requires auth
- [ ] Add iOS Swift files to Xcode project
- [ ] Enable "Sign in with Apple" capability in Xcode
- [ ] Enable "Sign in with Apple" in Apple Developer Portal
- [ ] Test sign-in flow on TestFlight or physical device
- [ ] Verify favorites sync across devices

---

## 🎯 Success Criteria

Authentication is working when:
1. ✅ User can sign in with Apple on iOS
2. ✅ JWT is saved in Keychain and persists across app launches
3. ✅ Favorites are saved to cloud (visible in Railway database)
4. ✅ Favorites sync across multiple devices
5. ✅ User can sign out and all cloud favorites are cleared locally
6. ✅ No authentication errors in Railway logs

---

## 🆘 Troubleshooting

### "JWT Secret Not Set" Error
- Check that `IOS_JWT_SECRET` is in Railway environment variables
- Restart Railway service after adding the variable
- Verify locally by checking `process.env.IOS_JWT_SECRET` in Node.js

### "Apple Token Verification Failed"
- Ensure iOS bundle ID matches: `com.moviegenius.app`
- Check that "Sign in with Apple" is enabled in Apple Developer Portal
- Verify network connectivity (Apple's JWKS endpoint must be reachable)

### "Unauthorized" on Favorites API
- Check that JWT is being sent in Authorization header
- Verify JWT format: `Bearer <token>` (with space after Bearer)
- Check JWT expiry (7 days) - may need to re-authenticate

### Favorites Not Syncing
- Check Railway logs for API errors
- Verify `user_favorites` table exists in database
- Ensure JWT contains correct user ID in `sub` claim
- Check iOS network requests in Xcode debugger

---

## 📞 Next Steps

After completing manual steps:
1. Test locally with iOS Simulator
2. Deploy to Railway staging environment
3. Test on TestFlight with real Apple Sign-In
4. Monitor Railway logs for authentication errors
5. Gradually roll out to production users

**Estimated time to complete:** 2-3 hours (mostly Xcode setup and testing)
