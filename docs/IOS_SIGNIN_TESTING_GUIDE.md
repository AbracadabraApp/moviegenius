# iOS Sign-In Testing Guide

**Date:** 2026-05-14
**Implementation:** Apple Sign-In with Cloud Sync

---

## 🎯 Testing Overview

This guide walks you through testing the complete iOS authentication and favorites sync system, from initial setup to production deployment.

---

## Phase 1: Pre-Testing Setup (Required)

### Step 1: Update FavoriteButtons Usages

All existing `FavoriteButtons` need the `.withSignInPrompt` modifier to enable the sign-in flow.

**Files to Update:**
- `MovieDetailView.swift`
- `GeniusView.swift`
- `MoreIdeasView.swift`
- `WatchQueueView.swift`

**Find each FavoriteButtons instance and add `.withSignInPrompt`:**

```swift
// BEFORE:
FavoriteButtons(
    tmdbId: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    posterUrl: movie.posterUrl
)

// AFTER:
FavoriteButtons(
    tmdbId: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    posterUrl: movie.posterUrl
)
.withSignInPrompt  // ← Add this line
```

### Step 2: Start Local Backend Server

The iOS app needs the backend API running to authenticate.

```bash
# In terminal, navigate to project root
cd /Users/josh.petersen/moviegenius

# Start Next.js dev server
npm run dev
```

**Verify it's running:**
```bash
curl http://localhost:3000/api/v1/auth/apple -X POST \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response:
# {"error":"identityToken required"}
# (This confirms the endpoint is working)
```

### Step 3: Configure iOS App for Local Testing

Update the API base URL in the iOS files to point to localhost:

**Files to update:**
1. `AuthManager.swift` line 30:
   ```swift
   private let apiBaseURL = "http://localhost:3000" // Changed from https://moviegenius.ai
   ```

2. `FavoritesManager.swift` line 27:
   ```swift
   private let apiBaseURL = "http://localhost:3000" // Changed from https://moviegenius.ai
   ```

**Important:** iOS Simulator can access localhost directly. Physical devices need your Mac's IP address:
```bash
# Get your Mac's IP address
ifconfig | grep "inet " | grep -v 127.0.0.1

# Use the IP instead of localhost:
# private let apiBaseURL = "http://192.168.1.xxx:3000"
```

---

## Phase 2: Xcode Build Test

### Step 1: Open Project in Xcode

```bash
open /Users/josh.petersen/moviegenius/ios/moviegenius/moviegenius.xcodeproj
```

### Step 2: Add Sign in with Apple Capability

1. Select the **moviegenius** target in the navigator
2. Click the **Signing & Capabilities** tab
3. Click **+ Capability** button (top left)
4. Search for "Sign in with Apple"
5. Double-click to add it

**What you should see:**
- A new "Sign in with Apple" section appears
- No errors or warnings

### Step 3: Build the Project

**In Xcode:**
1. Select a Simulator (e.g., iPhone 15 Pro)
2. Press **Cmd + B** to build
3. Wait for build to complete

**Expected Result:**
- ✅ Build succeeds with no errors
- ⚠️ If you see warnings, that's okay
- ❌ If you see errors, check:
  - All files are added to the target
  - No typos in file names
  - Swift version is correct

**Common Build Errors:**

**Error: "Cannot find 'HapticManager' in scope"**
- FavoriteButtons uses HapticManager - ensure it exists in your project

**Error: "Cannot find type 'SavedMovie' in scope"**
- Ensure FavoritesManager.swift is included in the build target

**Error: "Value of type 'AuthManager' has no member 'handleSignInResult'"**
- Check that AuthManager.swift has `func handleSignInResult` (not `private func`)

---

## Phase 3: Local Testing (No Sign-In Required)

### Test 1: App Launches Without Crashing

1. Press **Cmd + R** to run the app in Simulator
2. Wait for app to load

**Expected:**
- ✅ App launches successfully
- ✅ No crashes or errors
- ✅ Main screen loads normally

### Test 2: Sign-In Prompt Appears

1. Navigate to a movie detail page
2. Tap the **"Seen it"** or **"Watch it"** button

**Expected:**
- ✅ SignInPromptView modal appears
- ✅ Shows "Sign in to save favorites" message
- ✅ Shows Apple Sign-In button
- ✅ Shows "Maybe later" button

**Screenshot Reference:**
```
┌─────────────────────────┐
│    ❤️ (heart icon)      │
│                         │
│ Sign in to save         │
│     favorites           │
│                         │
│ Your favorites and      │
│ watchlist will sync     │
│ across all devices      │
│                         │
│  [Sign in with Apple]   │
│                         │
│     Maybe later         │
└─────────────────────────┘
```

### Test 3: Modal Dismissal

**Test "Maybe later" button:**
1. Tap **"Maybe later"**
2. Modal should dismiss
3. Navigate to another movie
4. Tap favorite button again
5. Modal should reappear

**Expected:**
- ✅ Modal dismisses smoothly
- ✅ Modal reappears on next favorite tap
- ✅ No crashes or errors

---

## Phase 4: Sign-In Flow Testing (Sandbox Apple ID Required)

**Important:** Sign in with Apple testing requires either:
1. A real Apple ID (will create a real account)
2. A sandbox Apple ID (for testing - recommended)

### Create Sandbox Apple ID (Recommended)

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Users and Access** → **Sandbox Testers**
3. Click **+** to add a new tester
4. Create a test account (e.g., `test@moviegenius.ai`)
5. Remember the password

### Test 4: Complete Sign-In Flow

1. Launch the app in Simulator
2. Navigate to a movie page
3. Tap **"Seen it"** button
4. Tap **"Sign in with Apple"** button
5. **Simulator will prompt for Apple ID:**
   - Use your sandbox Apple ID
   - Or use your real Apple ID (creates real account)
6. Complete the sign-in flow

**Expected Results:**

**Step 1 - Apple Prompts:**
- iOS shows system Sign in with Apple sheet
- Prompts for Apple ID credentials
- Shows privacy consent screen

**Step 2 - Backend Communication:**
- Watch Xcode console for logs:
  ```
  ✅ Sign-in successful: test@example.com
  ```

**Step 3 - Token Storage:**
- No visible UI change (happens in background)
- Check Xcode console:
  ```
  ✅ Synced to cloud: Added 12345
  ```

**Step 4 - Modal Dismisses:**
- SignInPromptView dismisses automatically
- Returns to movie page
- Favorite button now works without prompting

### Test 5: Favorites Persist After Sign-In

1. After signing in, tap **"Seen it"** on a movie
2. Button should turn gold (selected state)
3. Tap it again to deselect
4. Tap **"Watch it"** on another movie
5. Button should turn gold

**Expected:**
- ✅ No sign-in prompt appears
- ✅ Favorites save instantly
- ✅ Xcode console shows: `✅ Synced to cloud: Added 550`
- ✅ Visual feedback (gold highlight)

### Test 6: Check Database Persistence

**In terminal, query the database:**

```bash
node --env-file=.env.local -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const result = await pool.query(\`
    SELECT u.email, uf.movie_tmdb_id, m.title
    FROM users u
    JOIN user_favorites uf ON uf.user_id = u.id
    JOIN movies m ON m.tmdb_id = uf.movie_tmdb_id
    WHERE u.apple_id IS NOT NULL
    ORDER BY uf.created_at DESC
    LIMIT 5
  \`);

  console.log('Recent favorites:');
  result.rows.forEach(row => {
    console.log(\`  \${row.email}: \${row.title} (tmdbId: \${row.movie_tmdb_id})\`);
  });

  await pool.end();
})();
"
```

**Expected Output:**
```
Recent favorites:
  test@example.com: Lost in Translation (tmdbId: 153)
  test@example.com: The Godfather (tmdbId: 238)
```

---

## Phase 5: App Restart & Persistence Testing

### Test 7: JWT Persistence Across Restarts

1. **Stop the app** (Cmd + . in Xcode)
2. **Restart the app** (Cmd + R)
3. Navigate to a movie page
4. Tap **"Seen it"** button

**Expected:**
- ✅ No sign-in prompt appears
- ✅ User is still authenticated
- ✅ Favorites still work
- ✅ Xcode console shows: `✅ Cloud sync complete: X total favorites`

**What's happening:**
- KeychainManager retrieves JWT from iOS Keychain
- AuthManager validates token with backend
- FavoritesManager syncs with cloud on launch

### Test 8: Cloud Sync After Restart

1. Check which movies are favorited
2. Stop the app
3. **Manually delete a favorite from database:**

```bash
node --env-file=.env.local -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  // Get user ID
  const user = await pool.query(\`
    SELECT id FROM users WHERE apple_id IS NOT NULL LIMIT 1
  \`);

  // Delete one favorite
  await pool.query(\`
    DELETE FROM user_favorites
    WHERE user_id = \$1
    AND movie_tmdb_id = 153
  \`, [user.rows[0].id]);

  console.log('✅ Deleted Lost in Translation from cloud');
  await pool.end();
})();
"
```

4. **Restart the app**
5. Check if Lost in Translation is still favorited locally

**Expected:**
- ✅ Local favorite is NOT deleted (union merge strategy)
- ✅ On next toggle, it will re-sync to cloud
- ✅ Union merge: Local ∪ Cloud (never delete)

---

## Phase 6: Sign-Out Testing

### Test 9: Sign-Out Flow

Currently, there's no sign-out UI in the app. To test sign-out programmatically:

1. Add a temporary sign-out button somewhere (e.g., Settings view)
2. Or test via console:

**In Xcode, add to any view:**
```swift
Button("Sign Out (Test)") {
    AuthManager.shared.signOut()
}
```

**Tap the button**

**Expected:**
- ✅ `authManager.isAuthenticated` becomes `false`
- ✅ Keychain token is deleted
- ✅ Next favorite tap shows sign-in prompt again
- ✅ Local favorites remain (not deleted)

---

## Phase 7: Error Handling Tests

### Test 10: Network Failure During Sign-In

1. **Stop the backend server** (Ctrl + C in terminal)
2. Try to sign in
3. Complete Apple authentication

**Expected:**
- ❌ Sign-in fails (cannot reach backend)
- ✅ Error message appears: "Sign-in failed: ..."
- ✅ App doesn't crash
- ✅ User can retry

**Restart backend and retry:**
```bash
npm run dev
```

### Test 11: Invalid JWT Handling

1. Sign in successfully
2. **Manually corrupt the JWT in Keychain** (simulate expiry)
3. Restart the app

**To corrupt JWT manually, add to AuthManager:**
```swift
// Temporary test code
func corruptToken() {
    keychainManager.saveToken("invalid.jwt.token")
}
```

**Expected:**
- ✅ App detects invalid token on launch
- ✅ Token is deleted
- ✅ `isAuthenticated` becomes false
- ✅ User must sign in again

---

## Phase 8: Production Setup

### Step 1: Add IOS_JWT_SECRET to Railway

1. Go to [Railway Dashboard](https://railway.app/)
2. Select MovieGenius project
3. Click **Variables** tab
4. Add new variable:
   ```
   IOS_JWT_SECRET=4e7ab7c2f54209b7281215eaaa67b37b5bfdc235768d026d83d3e06d8bd03c04
   ```
5. Click **Add** then **Deploy**

**Verify it's set:**
```bash
# After deployment completes
curl https://moviegenius.ai/api/v1/auth/apple -X POST \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: {"error":"identityToken required"}
# (Not 500 Internal Server Error)
```

### Step 2: Enable Sign in with Apple in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers**
4. Select your App ID: `com.moviegenius.app`
5. Scroll to **Capabilities** section
6. Find **Sign in with Apple**
7. Check the box to enable it
8. Click **Save**

### Step 3: Update iOS App for Production

**Change API URLs back to production:**

1. `AuthManager.swift` line 30:
   ```swift
   private let apiBaseURL = "https://moviegenius.ai"
   ```

2. `FavoritesManager.swift` line 27:
   ```swift
   private let apiBaseURL = "https://moviegenius.ai"
   ```

### Step 4: Build for TestFlight

1. In Xcode, select **Any iOS Device (arm64)** as target
2. Product → Archive
3. Wait for archive to complete
4. Distribute to TestFlight
5. Upload to App Store Connect

**Test on TestFlight:**
1. Install app from TestFlight
2. Complete full sign-in flow
3. Verify favorites sync
4. Test on multiple devices

---

## Phase 9: Multi-Device Testing

### Test 12: Sync Across Multiple Devices

**Requirements:**
- 2 iOS devices (or 1 device + 1 simulator)
- Same Apple ID on both

**Steps:**

**Device 1:**
1. Sign in with Apple
2. Favorite 3 movies
3. Verify they appear in database

**Device 2:**
1. Install the app
2. Sign in with SAME Apple ID
3. Navigate to "You" tab (favorites list)

**Expected:**
- ✅ All 3 movies appear on Device 2
- ✅ Union merge completed
- ✅ No duplicates

**Add a 4th favorite on Device 2:**
- ✅ Syncs to cloud immediately
- ✅ Device 1 sees it on next launch

---

## Troubleshooting Guide

### Problem: Build Fails with "Cannot find type 'SavedMovie'"

**Solution:**
1. Open Xcode project navigator
2. Find `FavoritesManager.swift`
3. Check **Target Membership** in right panel
4. Ensure "moviegenius" target is checked

### Problem: Sign-In Button Does Nothing

**Possible Causes:**
1. Sign in with Apple capability not enabled
2. AuthManager delegate not set correctly
3. Network issue (check backend is running)

**Debug:**
- Add print statements in `signInWithApple()`:
  ```swift
  print("🔍 Sign in button tapped")
  ```
- Check Xcode console for errors

### Problem: "Unauthorized" Error on Favorites API

**Possible Causes:**
1. JWT not being sent in Authorization header
2. JWT expired (7 days)
3. IOS_JWT_SECRET mismatch

**Debug:**
```bash
# Check JWT in request
# Add to AuthManager:
print("🔑 Token: \(token.prefix(20))...")
```

### Problem: Favorites Not Syncing to Cloud

**Check:**
1. Is user authenticated? `authManager.isAuthenticated`
2. Is backend running?
3. Is IOS_JWT_SECRET set in Railway?
4. Check Xcode console for API errors

**Test API manually:**
```bash
# Get a valid JWT from Xcode console
# Then test:
curl https://moviegenius.ai/api/v1/user/favorites \
  -H "Authorization: Bearer YOUR_JWT_HERE"

# Should return: {"favorites": [...]}
```

---

## Success Criteria Checklist

### ✅ Phase 1: Setup
- [ ] All FavoriteButtons have `.withSignInPrompt` modifier
- [ ] Backend running on localhost:3000
- [ ] iOS app configured for localhost

### ✅ Phase 2: Build
- [ ] Xcode build succeeds with no errors
- [ ] Sign in with Apple capability added
- [ ] All Swift files compile correctly

### ✅ Phase 3: Local Testing
- [ ] App launches without crashing
- [ ] Sign-in prompt appears on favorite tap
- [ ] "Maybe later" dismisses modal
- [ ] Modal reappears on next tap

### ✅ Phase 4: Sign-In
- [ ] Apple Sign-In flow completes
- [ ] JWT saved to Keychain
- [ ] Favorites save without prompt after sign-in
- [ ] Database shows favorites for user

### ✅ Phase 5: Persistence
- [ ] JWT persists after app restart
- [ ] Favorites sync from cloud on launch
- [ ] No sign-in prompt after restart

### ✅ Phase 6: Production
- [ ] IOS_JWT_SECRET added to Railway
- [ ] Sign in with Apple enabled in Developer Portal
- [ ] iOS app uses production API URL
- [ ] TestFlight build works correctly

### ✅ Phase 7: Multi-Device
- [ ] Favorites sync across devices
- [ ] Union merge works (no deletions)
- [ ] Real-time sync on favorite tap

---

## Next Steps After Testing

Once all tests pass:

1. **Deploy to Production:**
   - Push code to main branch
   - Railway auto-deploys backend
   - Submit iOS app to App Store Review

2. **Monitor Production:**
   - Check Railway logs for authentication errors
   - Monitor user sign-in success rate
   - Track favorites sync reliability

3. **User Feedback:**
   - Add analytics for sign-in conversion
   - Track "Maybe later" dismissal rate
   - Monitor cloud sync failures

---

## Quick Reference: Testing Commands

**Start backend:**
```bash
cd /Users/josh.petersen/moviegenius && npm run dev
```

**Test auth endpoint:**
```bash
curl http://localhost:3000/api/v1/auth/apple -X POST -H "Content-Type: application/json" -d '{}'
```

**Check recent favorites:**
```bash
node --env-file=.env.local -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); (async () => { const r = await pool.query('SELECT COUNT(*) as count FROM user_favorites'); console.log('Total favorites:', r.rows[0].count); await pool.end(); })();"
```

**Clear all user data (for fresh testing):**
```bash
node --env-file=.env.local -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); (async () => { await pool.query('DELETE FROM user_favorites'); await pool.query('DELETE FROM users WHERE apple_id IS NOT NULL'); console.log('✅ All test data cleared'); await pool.end(); })();"
```

---

**Estimated Testing Time:**
- Phase 1-3 (Setup & Build): 30 minutes
- Phase 4-5 (Sign-In & Persistence): 30 minutes
- Phase 6-7 (Error Handling): 20 minutes
- Phase 8-9 (Production & Multi-Device): 1 hour
- **Total: ~2.5 hours** for complete testing
