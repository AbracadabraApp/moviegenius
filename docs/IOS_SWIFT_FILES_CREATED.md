# iOS Swift Files - Implementation Complete

**Date:** 2026-05-14
**Status:** All iOS Swift files created via CLI

---

## ✅ Files Created

All iOS Swift implementation files have been successfully created:

### 1. KeychainManager.swift
**Location:** `/ios/moviegenius/moviegenius/Managers/KeychainManager.swift`
**Purpose:** Secure JWT token storage in iOS Keychain (encrypted by OS)

**Key Methods:**
- `saveToken(_ token: String)` - Save JWT to Keychain
- `getToken() -> String?` - Retrieve JWT from Keychain
- `deleteToken()` - Remove JWT on sign-out

### 2. AuthManager.swift
**Location:** `/ios/moviegenius/moviegenius/Managers/AuthManager.swift`
**Purpose:** Handle Sign in with Apple and communicate with backend API

**Key Methods:**
- `signInWithApple()` - Trigger Apple Sign-In flow
- `handleSignInResult(credential:)` - Send identity token to `/api/v1/auth/apple`
- `checkAuthenticationStatus()` - Validate JWT on app launch
- `getAuthToken() -> String?` - Get current JWT for API requests
- `signOut()` - Clear authentication state

**Features:**
- ASAuthorizationControllerDelegate implementation
- Automatic JWT validation on launch
- Error handling with user-friendly messages
- Integration with backend API endpoints

### 3. SignInPromptView.swift
**Location:** `/ios/moviegenius/moviegenius/Views/SignInPromptView.swift`
**Purpose:** Lazy sign-in modal shown on first favorite tap

**Features:**
- "Sign in to save favorites" messaging
- Native Sign in with Apple button
- "Maybe later" dismiss option
- Auto-sync favorites after successful sign-in
- Loading state during authentication

### 4. FavoritesManager.swift (Enhanced)
**Location:** `/ios/moviegenius/moviegenius/Services/FavoritesManager.swift`
**Purpose:** Favorites persistence with cloud sync capabilities

**New Methods Added:**
- `syncWithCloud()` - Union merge local + cloud favorites (never delete)
- `syncToCloud(tmdbId:action:)` - Push single favorite change to API
- Automatic cloud sync on toggle when authenticated

**Sync Strategy:**
- Local ∪ Cloud (union merge)
- First sign-in: Push all local favorites to cloud
- Subsequent opens: Merge cloud favorites into local
- New favorites: Instantly saved to cloud + local

### 5. FavoriteButtons.swift (Enhanced)
**Location:** `/ios/moviegenius/moviegenius/Views/FavoriteButtons.swift`
**Purpose:** Trigger sign-in prompt on first favorite interaction

**New Features:**
- Check `authManager.isAuthenticated` before allowing favorites
- Show `SignInPromptView` sheet if not authenticated
- Auto-sync to cloud after sign-in completes
- Handler methods: `handleLovedTap()`, `handleQueueTap()`

---

## 🎯 Implementation Flow

### User Experience:
1. User taps "Seen it" or "Watch it" button
2. If NOT authenticated → Show SignInPromptView modal
3. User taps "Sign in with Apple"
4. Apple authentication flow completes
5. Identity token sent to `/api/v1/auth/apple`
6. Backend returns JWT (7-day expiry)
7. JWT saved in iOS Keychain
8. Favorites sync from cloud (union merge)
9. Future favorite taps → Instantly saved to cloud

### Authentication Flow:
```
iOS App (SwiftUI)
  ↓ User taps favorite button
  ↓ FavoriteButtons checks authManager.isAuthenticated
  ↓ If NO → Show SignInPromptView
  ↓ User taps "Sign in with Apple"
  ↓ AuthManager.signInWithApple()
  ↓ Apple returns identity token
  ↓ POST /api/v1/auth/apple { identityToken, user }
Next.js API
  ↓ Verify token with Apple's JWKS
  ↓ Create/update user in PostgreSQL
  ↓ Generate custom JWT (7-day expiry)
  ↓ Return { token, user }
iOS App
  ↓ KeychainManager.saveToken(JWT)
  ↓ AuthManager.isAuthenticated = true
  ↓ FavoritesManager.syncWithCloud()
  ↓ All favorites synced (local ∪ cloud)
```

---

## 📋 Remaining Manual Steps

### 1. Add IOS_JWT_SECRET to Railway
```bash
# In Railway dashboard:
# 1. Go to MovieGenius project
# 2. Select the service
# 3. Click "Variables" tab
# 4. Add:
IOS_JWT_SECRET=4e7ab7c2f54209b7281215eaaa67b37b5bfdc235768d026d83d3e06d8bd03c04
```

### 2. Enable Sign in with Apple in Xcode
```
1. Open ios/moviegenius/moviegenius.xcodeproj
2. Select "moviegenius" target
3. Click "Signing & Capabilities" tab
4. Click "+ Capability"
5. Search for "Sign in with Apple"
6. Double-click to add
```

### 3. Enable in Apple Developer Portal
```
1. Go to https://developer.apple.com/account/
2. Navigate to "Certificates, Identifiers & Profiles"
3. Click "Identifiers" → Select "com.moviegenius.app"
4. Scroll to "Sign in with Apple" capability
5. Check the box to enable
6. Click "Save"
```

### 4. Update FavoriteButtons Usage
All existing `FavoriteButtons` usages need to add the `.withSignInPrompt` modifier:

**Before:**
```swift
FavoriteButtons(
    tmdbId: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    posterUrl: movie.posterUrl
)
```

**After:**
```swift
FavoriteButtons(
    tmdbId: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    posterUrl: movie.posterUrl
)
.withSignInPrompt
```

**Files to Update:**
- `MovieDetailView.swift`
- `CollectionDetailView.swift`
- Any other views using FavoriteButtons

---

## ✅ Backend Implementation Status

All backend APIs are complete and tested:

- ✅ `/lib/jwt-ios.js` - Custom JWT generation/verification
- ✅ `/lib/apple-signin-verify.js` - Apple token verification with JWKS
- ✅ `/pages/api/v1/auth/apple.js` - Apple Sign-In endpoint
- ✅ `/pages/api/v1/user/favorites.js` - GET/POST favorites
- ✅ `/pages/api/v1/user/favorites/[tmdbId].js` - DELETE favorite
- ✅ Database migration executed (users, user_favorites, user_queue tables)
- ✅ `IOS_JWT_SECRET` added to local `.env.local`

---

## 🧪 Testing Checklist

### Local Testing:
- [ ] Build iOS app in Xcode (should compile without errors)
- [ ] Run on iOS Simulator
- [ ] Tap favorite button → See SignInPromptView
- [ ] Tap "Maybe later" → Modal dismisses
- [ ] Tap favorite again → See SignInPromptView
- [ ] Complete Apple Sign-In flow
- [ ] Verify favorites save locally
- [ ] Kill app and relaunch
- [ ] Verify authentication persists (JWT in Keychain)

### Production Testing:
- [ ] Deploy backend to Railway with `IOS_JWT_SECRET`
- [ ] Build iOS app with production API URL
- [ ] Test on TestFlight or physical device
- [ ] Verify Apple Sign-In works
- [ ] Verify favorites sync across devices
- [ ] Test sign-out flow
- [ ] Verify JWT expiry (7 days)

---

## 🎉 Summary

**Implementation Status:**
- ✅ All 5 iOS Swift files created via CLI
- ✅ All backend APIs implemented
- ✅ Database migration completed
- ✅ JWT secret generated and added to local env
- ⏳ Manual Xcode configuration pending
- ⏳ Railway environment variable pending
- ⏳ FavoriteButtons usage updates pending

**Next Actions:**
1. Add `IOS_JWT_SECRET` to Railway
2. Enable "Sign in with Apple" in Xcode
3. Enable in Apple Developer Portal
4. Update FavoriteButtons usages with `.withSignInPrompt`
5. Build and test in Xcode
6. Deploy to TestFlight

**Estimated Time to Complete:** 1-2 hours (mostly manual Xcode/Railway setup)
