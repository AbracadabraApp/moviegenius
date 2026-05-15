# Firebase Setup Guide for MovieGenius iOS Sign-In

**Time Required:** 30-45 minutes
**Prerequisites:** Google account, Apple Developer account

---

## Step 1: Create Firebase Project (5 min)

1. Go to https://console.firebase.google.com/
2. Click "Add project" or "Create a project"
3. **Project name:** `moviegenius` (or `moviegenius-prod`)
4. **Google Analytics:** Disable (not needed for auth)
5. Click "Create project"
6. Wait for project to be created (~1 minute)

---

## Step 2: Add Web App (3 min)

1. In Firebase Console, click the **web icon** (</>)
2. **App nickname:** `MovieGenius Web`
3. **Do NOT** check "Also set up Firebase Hosting"
4. Click "Register app"
5. **Copy the config** - you'll see something like:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "moviegenius-xxxxx.firebaseapp.com",
     projectId: "moviegenius-xxxxx",
     storageBucket: "moviegenius-xxxxx.appspot.com",
     messagingSenderId: "...",
     appId: "1:...:web:..."
   };
   ```
6. **Save this** - you won't need it immediately but keep it for reference
7. Click "Continue to console"

---

## Step 3: Add iOS App (5 min)

1. In Firebase Console, click the **iOS icon** (Apple logo)
2. **iOS bundle ID:** `com.moviegenius.app`
   - ⚠️ **IMPORTANT:** This must match your Xcode project bundle ID exactly
   - Check in Xcode: Select project → General → Bundle Identifier
3. **App nickname:** `MovieGenius iOS`
4. **App Store ID:** Leave blank (will add later after App Store submission)
5. Click "Register app"

6. **Download GoogleService-Info.plist:**
   - Click "Download GoogleService-Info.plist"
   - **Save this file** - you'll add it to Xcode later

7. Click "Next" (skip SDK setup instructions - we'll do this via code)
8. Click "Next" (skip initialization code)
9. Click "Continue to console"

---

## Step 4: Enable Authentication (3 min)

1. In Firebase Console sidebar, click **"Authentication"**
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Click **"Add new provider"**
5. Select **"Apple"**
6. Toggle **"Enable"** to ON
7. Click **"Save"** (we'll configure Apple Sign-In details later)

---

## Step 5: Generate Service Account Key for Backend (5 min)

1. In Firebase Console, click the **gear icon** → "Project settings"
2. Click the **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** in the confirmation dialog
5. A JSON file will download - **SAVE THIS SECURELY**
   - File name: `moviegenius-xxxxx-firebase-adminsdk-xxxxx.json`
   - ⚠️ **DO NOT commit this to Git** - it contains sensitive credentials

6. Open the downloaded JSON file and extract these values:
   ```json
   {
     "project_id": "moviegenius-xxxxx",  ← Copy this
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",  ← Copy this (entire string)
     "client_email": "firebase-adminsdk-xxxxx@moviegenius-xxxxx.iam.gserviceaccount.com"  ← Copy this
   }
   ```

---

## Step 6: Add Credentials to Railway (5 min)

1. Go to https://railway.app/
2. Select your MovieGenius project
3. Click on your service (e.g., "moviegenius-web")
4. Click the **"Variables"** tab
5. Click **"+ New Variable"**

6. Add these three variables:

   **Variable 1:**
   - Name: `FIREBASE_PROJECT_ID`
   - Value: `moviegenius-xxxxx` (from JSON file)

   **Variable 2:**
   - Name: `FIREBASE_CLIENT_EMAIL`
   - Value: `firebase-adminsdk-xxxxx@moviegenius-xxxxx.iam.gserviceaccount.com`

   **Variable 3:**
   - Name: `FIREBASE_PRIVATE_KEY`
   - Value: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`
   - ⚠️ **IMPORTANT:** Paste the entire string INCLUDING the `\n` characters
   - ⚠️ Must be wrapped in quotes in Railway: `"-----BEGIN...-----\n"`

7. Click "Deploy" to restart the service with new env vars

---

## Step 7: Configure Sign in with Apple (Apple Developer) (10 min)

### 7A: Enable Sign in with Apple Capability

1. Go to https://developer.apple.com/account/
2. Navigate to **"Certificates, Identifiers & Profiles"**
3. Click **"Identifiers"** in the sidebar
4. Find and click your **App ID** (com.moviegenius.app)
   - If it doesn't exist, create it: Click "+", select "App IDs", Continue
   - Description: "MovieGenius iOS App"
   - Bundle ID: com.moviegenius.app (Explicit)

5. In the Capabilities list, scroll to **"Sign in with Apple"**
6. **Check the box** to enable it
7. Click **"Save"** at the top right

### 7B: Create Service ID for Firebase (Optional - only if you need web sign-in later)

1. Still in developer.apple.com, click **"Identifiers"** → **"+"**
2. Select **"Services IDs"** → Click "Continue"
3. **Description:** MovieGenius Firebase Service
4. **Identifier:** com.moviegenius.firebase (or similar)
5. Click "Continue" → "Register"

---

## Step 8: Add GoogleService-Info.plist to Xcode (3 min)

1. Open Xcode project: `/ios/moviegenius/moviegenius.xcodeproj`
2. In the project navigator (left sidebar), select the **"moviegenius"** folder
3. **Drag and drop** the `GoogleService-Info.plist` file you downloaded in Step 3
4. In the dialog that appears:
   - ✅ Check **"Copy items if needed"**
   - ✅ Check **"Add to targets: moviegenius"**
   - Click "Finish"

5. **Verify it was added:**
   - Select `GoogleService-Info.plist` in project navigator
   - In the right panel, under "Target Membership", ensure **"moviegenius"** is checked

---

## Step 9: Add Firebase SDK to iOS via Swift Package Manager (5 min)

1. In Xcode, with the project open, go to:
   **File** → **Add Package Dependencies...**

2. In the search bar (top right), paste:
   ```
   https://github.com/firebase/firebase-ios-sdk
   ```

3. **Dependency Rule:** Up to Next Major Version: 10.0.0
4. Click **"Add Package"**

5. In the "Choose Package Products" dialog, select:
   - ✅ `FirebaseAuth`
   - ✅ `FirebaseCore`
   - (Deselect all others)

6. Ensure **"Add to Target"** shows **"moviegenius"**
7. Click **"Add Package"**

8. Wait for Swift Package Manager to resolve dependencies (~1-2 min)

---

## Step 10: Enable Sign in with Apple in Xcode (2 min)

1. In Xcode, select the **project** (top of navigator)
2. Select the **"moviegenius" target**
3. Click the **"Signing & Capabilities"** tab
4. Click **"+ Capability"** (top left)
5. Search for and double-click **"Sign in with Apple"**
6. Verify it appears in the capabilities list

---

## Step 11: Verify Setup (3 min)

### Backend Verification

1. SSH into Railway or use local env:
   ```bash
   echo $FIREBASE_PROJECT_ID
   echo $FIREBASE_CLIENT_EMAIL
   echo $FIREBASE_PRIVATE_KEY | head -1
   ```

2. All three should print values (private key should start with `-----BEGIN`)

### iOS Verification

1. In Xcode, try building the project: **Cmd+B**
2. Should compile successfully (we haven't added Firebase code yet)
3. Check `GoogleService-Info.plist` exists in project navigator

---

## Troubleshooting

### "GoogleService-Info.plist not found"
- Make sure you dragged it into the **moviegenius** folder, not the root
- Check "Target Membership" in File Inspector (right panel)

### "Firebase SDK not found"
- Go to File → Packages → Resolve Package Versions
- Delete DerivedData: Shift+Cmd+K, then Cmd+B

### "Sign in with Apple capability missing"
- Check Apple Developer portal that capability is enabled for your App ID
- Try removing and re-adding the capability in Xcode
- Ensure you're using the correct bundle ID

### "Private key invalid" error in backend
- Check that `\n` characters are preserved in the env var
- Make sure the value is quoted: `"-----BEGIN...-----\n"`
- Try regenerating the service account key

---

## Security Checklist

Before deploying to production:

- [ ] `firebase-adminsdk-xxxxx.json` is in `.gitignore`
- [ ] `GoogleService-Info.plist` is committed (it's safe - no secrets)
- [ ] Railway env vars are set (not in `.env.local` or committed)
- [ ] Sign in with Apple is enabled in Apple Developer portal
- [ ] Firebase project has billing enabled (even for free tier)

---

## Next Steps

After completing this setup:

1. ✅ Firebase project created
2. ✅ iOS and Web apps registered
3. ✅ Service account credentials in Railway
4. ✅ GoogleService-Info.plist in Xcode
5. ✅ Firebase SDK installed
6. ✅ Sign in with Apple capability enabled

**You're ready to run the iOS sign-in implementation!**

The code is already written and waiting in:
- `/pages/api/v1/auth/verify.js`
- `/ios/moviegenius/moviegenius/Managers/AuthManager.swift`
- `/ios/moviegenius/moviegenius/Views/SignInPromptView.swift`

---

## Reference Links

- Firebase Console: https://console.firebase.google.com/
- Apple Developer: https://developer.apple.com/account/
- Firebase iOS Setup: https://firebase.google.com/docs/ios/setup
- Sign in with Apple Docs: https://developer.apple.com/documentation/sign_in_with_apple

---

**Questions?** Check `/docs/IOS_SIGNIN_ARCHITECTURE_PLAN.md` for full implementation details.
