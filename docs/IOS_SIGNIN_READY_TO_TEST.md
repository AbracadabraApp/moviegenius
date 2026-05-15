# iOS Sign-In - Ready to Test

**Date:** 2026-05-14
**Status:** Implementation Complete - Ready for Testing

---

## ✅ What's Been Completed

### Backend Implementation (100%)
- ✅ `/lib/jwt-ios.js` - Custom JWT generation (7-day expiry)
- ✅ `/lib/apple-signin-verify.js` - Apple token verification
- ✅ `/pages/api/v1/auth/apple.js` - POST endpoint for Sign in with Apple
- ✅ `/pages/api/v1/user/favorites.js` - GET/POST favorites
- ✅ `/pages/api/v1/user/favorites/[tmdbId].js` - DELETE favorite
- ✅ Database migration executed (users, user_favorites, user_queue)
- ✅ `IOS_JWT_SECRET` in `.env.local`

### iOS Implementation (100%)
- ✅ `KeychainManager.swift` - Secure token storage
- ✅ `AuthManager.swift` - Apple Sign-In + API communication
- ✅ `SignInPromptView.swift` - Lazy sign-in modal
- ✅ `FavoritesManager.swift` - Cloud sync capabilities
- ✅ `FavoriteButtons.swift` - Sign-in trigger on tap

### View Updates (3 of 4)
- ✅ `MovieDetailView.swift` - Has `.withSignInPrompt`
- ✅ `GeniusView.swift` - Has `.withSignInPrompt`
- ✅ `MoreIdeasView.swift` - Has `.withSignInPrompt`
- ⚠️ `WatchQueueView.swift` - **Needs manual update** (see below)

---

## 🔧 Manual Fix Required

**File:** `WatchQueueView.swift`
**Line:** ~145
**Change:** Add `.withSignInPrompt` after FavoriteButtons

```swift
// Find this around line 145:
FavoriteButtons(
    tmdbId: movie.id,
    title: movie.title,
    year: movie.year,
    posterUrl: movie.posterUrl,
    slug: movie.slug,
    compact: false,
    onDarkBackground: false
)
.withSignInPrompt  // ← ADD THIS LINE
```

---

## 🚀 Quick Start Testing

### Step 1: Test Backend APIs (2 minutes)

**Terminal 1 - Start backend:**
```bash
cd /Users/josh.petersen/moviegenius
npm run dev
```

**Terminal 2 - Test endpoints:**
```bash
# Test auth endpoint (should return error about missing token)
curl http://localhost:3000/api/v1/auth/apple -X POST \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: {"error":"identityToken required"}

# Test favorites endpoint (should return 401)
curl http://localhost:3000/api/v1/user/favorites \
  -H "Authorization: Bearer invalid_token"

# Expected: {"error":"Unauthorized"}
```

✅ If you see those responses, backend is working correctly!

### Step 2: Open in Xcode (1 minute)

```bash
open /Users/josh.petersen/moviegenius/ios/moviegenius/moviegenius.xcodeproj
```

**In Xcode:**
1. Fix `WatchQueueView.swift` (add `.withSignInPrompt`)
2. Add "Sign in with Apple" capability:
   - Select target → Signing & Capabilities
   - Click "+ Capability"
   - Add "Sign in with Apple"

### Step 3: Build & Test (5 minutes)

1. **Build:** Cmd + B
2. **Run:** Cmd + R (in Simulator)
3. **Navigate to a movie**
4. **Tap "Seen it" button**
5. **Expected:** Sign-in modal appears!

---

## 📱 What You'll See

### First Tap (Not Signed In)
```
┌─────────────────────────┐
│    ❤️                   │
│                         │
│ Sign in to save         │
│     favorites           │
│                         │
│ Your favorites will     │
│ sync across devices     │
│                         │
│  [Sign in with Apple]   │
│                         │
│     Maybe later         │
└─────────────────────────┘
```

### After Sign-In
- Modal dismisses
- Favorites work without prompting
- Console logs: `✅ Synced to cloud: Added 550`

---

## 🐛 Common Issues & Fixes

### Build Error: "Cannot find 'HapticManager'"
**Solution:** FavoriteButtons references HapticManager - ensure it exists

### Build Error: "Cannot find type 'SavedMovie'"
**Solution:** Ensure FavoritesManager.swift is in build target

### Sign-In Button Does Nothing
**Solution:**
1. Check "Sign in with Apple" capability is added
2. Check console for errors
3. Verify backend is running on localhost:3000

---

## 📊 Testing Checklist

### Backend Testing
- [ ] Backend starts with `npm run dev`
- [ ] Auth endpoint returns correct error
- [ ] Favorites endpoint requires auth

### iOS Build Testing
- [ ] Xcode build succeeds (Cmd + B)
- [ ] No compile errors
- [ ] App launches in Simulator

### Sign-In Flow Testing
- [ ] Sign-in modal appears on favorite tap
- [ ] "Maybe later" dismisses modal
- [ ] Modal reappears on next tap
- [ ] Sign in with Apple works
- [ ] Favorites save after sign-in
- [ ] No more prompts after sign-in

### Persistence Testing
- [ ] Stop app (Cmd + .)
- [ ] Restart app (Cmd + R)
- [ ] Favorites still work
- [ ] No sign-in prompt

---

## 🎯 Success Criteria

You'll know it's working when:
1. ✅ App builds without errors
2. ✅ Sign-in modal appears on first favorite tap
3. ✅ Apple Sign-In completes successfully
4. ✅ Favorites save to database
5. ✅ Authentication persists after restart
6. ✅ Database shows favorites for user

---

## 📚 Documentation

- **Complete Testing Guide:** `/docs/IOS_SIGNIN_TESTING_GUIDE.md`
- **Architecture Details:** `/docs/IOS_SIGNIN_ARCHITECTURE_PLAN_V2.md`
- **Setup Instructions:** `/docs/IOS_AUTH_SETUP_COMPLETE.md`

---

## 🆘 Need Help?

If something doesn't work:
1. Check Xcode console for error messages
2. Verify backend is running (`npm run dev`)
3. Check Railway logs if using production
4. Review troubleshooting section in testing guide

---

## 🎉 Next Steps

After local testing works:
1. Add `IOS_JWT_SECRET` to Railway
2. Deploy backend to production
3. Update iOS API URLs to production
4. Build for TestFlight
5. Test on real device

**Estimated Time:** 15-30 minutes for local testing
