# MovieGenius iOS Sign-In Architecture Plan

**Created:** 2026-05-14
**Status:** Approved - Ready for Implementation
**Timeline:** 3 weeks (Phase 1 MVP)
**Cost:** $0 (Firebase free tier)

---

## Executive Summary

Implement account-level data persistence for MovieGenius iOS app using Firebase Authentication with Sign in with Apple. Enable cross-device sync of favorites and queue with lazy sign-in UX pattern (prompt only on first stateful interaction).

**Key Decision:** Use Firebase Authentication (not NextAuth extension) for faster MVP delivery and iOS-native integration.

---

## Current State

### iOS App
- **FavoritesManager**: Stores loved movies and queue in UserDefaults (device-local only)
- **Genre Expertise**: Calculated from favorites, stored locally
- **Risk**: All user data lost on app deletion or device change

### Web App
- **NextAuth**: Google OAuth exists but unused for favorites
- **localStorage**: Favorites stored locally (same pattern as iOS)
- **Database**: `users` table exists but no `user_favorites` table

### Database (Railway PostgreSQL)
```sql
-- Currently exists (from NextAuth)
users (id, email, name, image, created_at)

-- Missing (needs migration)
user_favorites (user_id, movie_tmdb_id, created_at)
user_queue (user_id, movie_tmdb_id, created_at)
```

---

## Recommended Architecture

### Backend: Firebase Authentication

**Why Firebase (not NextAuth extension):**
1. ✅ iOS-native SDK (battle-tested, well-maintained)
2. ✅ Sign in with Apple built-in (no manual JWT validation)
3. ✅ Free tier generous (50K MAU)
4. ✅ Simpler than NextAuth (designed for mobile tokens, not sessions)
5. ✅ Cross-platform ready (same backend for future Android)

**Auth Flow:**
```
iOS App (SwiftUI)
  ↓ Firebase.Auth.signIn(with: .apple)
  ↓ Returns Firebase ID Token (JWT)
  ↓ API request with Authorization: Bearer <token>
Next.js API Routes
  ↓ Verify token with Firebase Admin SDK
  ↓ Extract user_id from verified token
  ↓ Query Railway PostgreSQL
Railway PostgreSQL
  ↓ users (firebase_uid, email, created_at)
  ↓ user_favorites (user_id, movie_tmdb_id)
  ↓ user_queue (user_id, movie_tmdb_id)
```

### Auth Provider: Sign in with Apple (Phase 1)

**Why Apple-only initially:**
- Required by App Store if adding other social auth later
- Best iOS UX (1-tap, native)
- Privacy-focused (Hide My Email supported)
- Defer Google/email auth to Phase 2+

---

## Phase 1: MVP Auth (2-3 weeks)

### Backend Setup (6-8 hours)

#### 1. Firebase Project Setup
```bash
# Create Firebase project at console.firebase.google.com
# Add web app configuration
# Add iOS app with bundle ID: com.moviegenius.app
# Download GoogleService-Info.plist for iOS
# Download service account key for Node.js
```

#### 2. Database Migration
```sql
-- migrations/001_add_user_auth_tables.sql

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255),  -- NULL if "Hide My Email"
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);

CREATE TABLE user_favorites (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  movie_tmdb_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, movie_tmdb_id)
);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);

CREATE TABLE user_queue (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  movie_tmdb_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, movie_tmdb_id)
);

CREATE INDEX idx_user_queue_user_id ON user_queue(user_id);
```

#### 3. API Endpoints

**File: `/pages/api/v1/auth/verify.js`**
```javascript
// Verify Firebase ID token and upsert user
POST /api/v1/auth/verify
Request: { Authorization: Bearer <firebase_token> }
Response: { userId: 123, firebaseUid: "abc..." }
```

**File: `/pages/api/v1/user/favorites.js`**
```javascript
// Fetch user's cloud favorites
GET /api/v1/user/favorites
Response: { favorites: [{ tmdb_id, title, year, poster_url }] }

// Sync local favorites to cloud (union merge)
POST /api/v1/user/favorites
Request: { favorites: [550, 13, 680, ...] }  // TMDB IDs
Response: { synced: 47 }

// Remove favorite
DELETE /api/v1/user/favorites/:tmdbId
Response: { removed: true }
```

**File: `/pages/api/v1/user/queue.js`**
```javascript
// Same pattern as favorites
GET /api/v1/user/queue
POST /api/v1/user/queue
DELETE /api/v1/user/queue/:tmdbId
```

#### 4. Firebase Admin SDK Setup
```bash
npm install firebase-admin
```

```javascript
// lib/firebase-admin.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export { admin };
```

### iOS Setup (13-15 hours)

#### 1. Add Firebase SDK
```swift
// Package.swift or CocoaPods
dependencies: [
  .package(url: "https://github.com/firebase/firebase-ios-sdk", from: "10.0.0")
]

// Import in AppDelegate or @main
import FirebaseCore
import FirebaseAuth
```

#### 2. Create AuthManager.swift
```swift
import FirebaseAuth
import Combine

@MainActor
class AuthManager: ObservableObject {
    @Published var user: User?
    @Published var isSignedIn: Bool = false

    static let shared = AuthManager()

    private init() {
        self.user = Auth.auth().currentUser
        self.isSignedIn = user != nil

        // Listen for auth state changes
        Auth.auth().addStateDidChangeListener { [weak self] _, user in
            self?.user = user
            self?.isSignedIn = user != nil
        }
    }

    func signInWithApple() async throws {
        // Implement Apple Sign-In flow
        // Uses AuthenticationServices framework
        // Returns Firebase credential
    }

    func getIDToken(forceRefresh: Bool = false) async throws -> String {
        guard let user = Auth.auth().currentUser else {
            throw AuthError.notSignedIn
        }
        return try await user.getIDToken(forcingRefresh: forceRefresh)
    }

    func signOut() throws {
        try Auth.auth().signOut()
        self.user = nil
        self.isSignedIn = false
    }
}

enum AuthError: Error {
    case notSignedIn
    case signInFailed
}
```

#### 3. Create KeychainManager.swift
```swift
import Security
import Foundation

class KeychainManager {
    static let shared = KeychainManager()

    func save(_ value: String, forKey key: String) throws {
        let data = value.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed
        }
    }

    func load(forKey key: String) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    func delete(forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}

enum KeychainError: Error {
    case saveFailed
    case loadFailed
}
```

#### 4. Create SignInPromptView.swift
```swift
import SwiftUI
import AuthenticationServices

struct SignInPromptView: View {
    @ObservedObject var authManager = AuthManager.shared
    @Environment(\.dismiss) var dismiss
    let onSignInComplete: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "heart.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(Color.mgGold)

            Text("Sign in to sync your favorites")
                .font(.mgTitle2)

            Text("Access your movie collection on all your devices")
                .font(.mgBody)
                .foregroundStyle(Color.mgSecondary)
                .multilineTextAlignment(.center)

            SignInWithAppleButton(
                .signIn,
                onRequest: { request in
                    request.requestedScopes = [.fullName, .email]
                },
                onCompletion: { result in
                    Task {
                        switch result {
                        case .success(let authorization):
                            try await handleAppleSignIn(authorization)
                        case .failure(let error):
                            print("Sign in failed: \(error)")
                        }
                    }
                }
            )
            .frame(height: 50)
            .signInWithAppleButtonStyle(.black)

            Button("Maybe Later") {
                dismiss()
            }
            .font(.mgCaption)
            .foregroundStyle(Color.mgSecondary)
        }
        .padding(32)
    }

    func handleAppleSignIn(_ authorization: ASAuthorization) async throws {
        try await authManager.signInWithApple(authorization)
        onSignInComplete()
        dismiss()
    }
}
```

#### 5. Refactor FavoritesManager.swift
```swift
@MainActor
class FavoritesManager: ObservableObject {
    @Published var lovedMovies: [SavedMovie] = []
    @Published var queueMovies: [SavedMovie] = []
    @Published var needsSignIn: Bool = false

    static let shared = FavoritesManager()
    private let authManager = AuthManager.shared

    func toggleLoved(_ movie: SavedMovie) {
        // Check if signed in
        guard authManager.isSignedIn else {
            needsSignIn = true  // Triggers sign-in sheet
            return
        }

        // Update local state (optimistic UI)
        if let index = lovedMovies.firstIndex(where: { $0.id == movie.id }) {
            lovedMovies.remove(at: index)
        } else {
            lovedMovies.append(movie)
        }
        saveLoved()

        // Sync to cloud in background
        Task {
            try await syncToCloud()
        }
    }

    func syncToCloud() async throws {
        guard let token = try? await authManager.getIDToken(forceRefresh: false) else {
            return
        }

        let url = URL(string: "https://moviegenius.ai/api/v1/user/favorites")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["favorites": lovedMovies.map { $0.id }]
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw SyncError.failed
        }
    }

    func syncFromCloud() async throws {
        guard let token = try? await authManager.getIDToken(forceRefresh: false) else {
            return
        }

        let url = URL(string: "https://moviegenius.ai/api/v1/user/favorites")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(FavoritesResponse.self, from: data)

        // Union merge: keep local + add cloud
        let cloudIds = Set(response.favorites.map { $0.tmdb_id })
        let localOnly = lovedMovies.filter { !cloudIds.contains($0.id) }

        lovedMovies = response.favorites.map { SavedMovie(from: $0) }

        // Upload local-only back to cloud
        if !localOnly.isEmpty {
            lovedMovies.append(contentsOf: localOnly)
            try await syncToCloud()
        }

        saveLoved()
    }
}
```

#### 6. Update FavoriteButtons.swift
```swift
struct FavoriteButtons: View {
    @ObservedObject var favorites = FavoritesManager.shared
    @State private var showSignInSheet = false
    let movie: SavedMovie

    var body: some View {
        HStack(spacing: 16) {
            Button(action: {
                favorites.toggleLoved(movie)
            }) {
                Image(systemName: isLoved ? "heart.fill" : "heart")
                    .foregroundStyle(isLoved ? .mgGold : .mgSecondary)
            }

            Button(action: {
                favorites.toggleQueue(movie)
            }) {
                Image(systemName: isQueued ? "bookmark.fill" : "bookmark")
                    .foregroundStyle(isQueued ? .mgGold : .mgSecondary)
            }
        }
        .sheet(isPresented: $favorites.needsSignIn) {
            SignInPromptView {
                // Retry action after sign-in
                favorites.toggleLoved(movie)
            }
        }
    }

    var isLoved: Bool {
        favorites.lovedMovies.contains(where: { $0.id == movie.id })
    }

    var isQueued: Bool {
        favorites.queueMovies.contains(where: { $0.id == movie.id })
    }
}
```

---

## UX Pattern: Lazy Sign-In

### When to Prompt
✅ **Do prompt:**
- First time user taps "Seen it" (heart) button
- First time user taps "Watch it" (bookmark) button
- Optional: Banner in "You" tab if >5 local favorites exist

❌ **Don't prompt:**
- App launch (let users explore first)
- Search or browse actions
- Reading movie analyses
- Watching trailers

### Sign-In Sheet Design
```
┌─────────────────────────────────┐
│                                 │
│       [Heart Icon - Gold]       │
│                                 │
│  Sign in to sync your favorites │
│                                 │
│  Access your movie collection   │
│  on all your devices            │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Continue with Apple       │  │
│  └───────────────────────────┘  │
│                                 │
│         Maybe Later             │
│                                 │
└─────────────────────────────────┘
```

---

## Data Migration Strategy

### On First Sign-In
```
1. User taps favorite button
   ↓
2. Check AuthManager.shared.isSignedIn
   ↓
3. If NO → Show sign-in sheet
   ↓
4. User signs in with Apple
   ↓
5. Firebase returns ID token
   ↓
6. Upload local favorites to cloud:
   POST /api/v1/user/favorites
   Body: { favorites: [550, 13, 680, ...] }
   ↓
7. Fetch cloud favorites:
   GET /api/v1/user/favorites
   ↓
8. Union merge:
   - Keep all local favorites
   - Add any cloud favorites not in local
   - No deletions
   ↓
9. Save merged list locally
   ↓
10. Complete original favorite action
```

### Conflict Resolution
**Phase 1 (MVP):**
- **Union merge** - Combine local + cloud favorites
- No deletions - always additive
- Server becomes source of truth

**Phase 2:**
- Timestamp-based deduplication
- Last-write-wins for conflicts

---

## Risk Mitigation

### 1. Data Loss During Migration
**Risk:** User signs in, migration fails, local data cleared prematurely

**Mitigation:**
- Never clear UserDefaults until server confirms successful write
- Use `didMigrateToCloud` flag for atomic migration
- Retry logic if migration fails
- Server idempotency (bulk-sync accepts duplicate requests)

### 2. Token Expiration
**Risk:** User opens app after 1 month, Firebase token expired

**Mitigation:**
- Firebase SDK auto-refreshes tokens
- Call `getIDToken(forcingRefresh: true)` before API calls
- Fallback: Re-auth if refresh fails

### 3. Offline Actions
**Risk:** User toggles favorites while offline

**Mitigation:**
- Optimistic UI updates (instant feedback)
- Queue actions locally
- Sync on reconnect with retry logic
- Show "Syncing..." banner after reconnect

### 4. Apple Review Rejection
**Risk:** Violating App Store Review Guideline 4.8

**Mitigation:**
- Implement Sign in with Apple (required)
- No forced auth on launch (lazy pattern compliant)
- Hide My Email supported
- Privacy policy linked in settings

---

## Phase 2: Enhanced Features (Month 2+)

### Deferred to Phase 2:
- Real-time sync (polling every 5 minutes)
- Sign-out functionality
- Delete account
- Google Sign-In option
- Email/password auth
- Web app sign-in
- Social features (public profiles, shared lists)

---

## Configuration Checklist

### Firebase Project Setup
- [ ] Create Firebase project at console.firebase.google.com
- [ ] Add iOS app (bundle ID: `com.moviegenius.app`)
- [ ] Download `GoogleService-Info.plist`
- [ ] Add web app configuration
- [ ] Generate service account key for Node.js
- [ ] Add Firebase Admin credentials to Railway env vars

### Apple Developer Setup
- [ ] Enable Sign in with Apple capability in App ID
- [ ] Configure Sign in with Apple service in Certificates
- [ ] Add Sign in with Apple entitlement in Xcode

### Railway Environment Variables
```bash
FIREBASE_PROJECT_ID=moviegenius-xyz
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@moviegenius-xyz.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### iOS Configuration
- [ ] Add `GoogleService-Info.plist` to Xcode project
- [ ] Enable Sign in with Apple capability
- [ ] Configure URL schemes for Firebase
- [ ] Update Info.plist with privacy descriptions

---

## Timeline & Effort

### Backend (6-8 hours)
- Firebase project setup: 1 hour
- Database migration: 1 hour
- API endpoint implementation: 3-4 hours
- Testing: 2 hours

### iOS (13-15 hours)
- Firebase SDK integration: 2 hours
- AuthManager implementation: 3 hours
- KeychainManager implementation: 1 hour
- SignInPromptView implementation: 2 hours
- FavoritesManager refactor: 3 hours
- FavoriteButtons updates: 1 hour
- Testing: 3-4 hours

### Total: 19-23 hours (~3 weeks part-time)

---

## Success Criteria

- ✅ User can sign in with Apple on first favorite tap
- ✅ Local favorites upload to cloud automatically
- ✅ Reinstalling app → sign in → favorites restored
- ✅ Multiple devices show same favorites after sign-in
- ✅ No data loss during migration
- ✅ Build passes, TestFlight deployment succeeds
- ✅ App Store review approved

---

## Cost Analysis

- **Firebase Authentication**: $0 (free tier <50K MAU)
- **Railway PostgreSQL**: $0 (existing)
- **Apple Developer**: $99/year (existing)
- **Total new cost**: $0

---

## Next Steps

1. ✅ Get approval for plan (COMPLETED)
2. Set up Firebase project
3. Run database migration on Railway
4. Implement backend API endpoints
5. Add Firebase SDK to iOS
6. Implement iOS auth flow
7. TestFlight beta testing
8. App Store submission

---

## References

- Firebase iOS Setup: https://firebase.google.com/docs/ios/setup
- Sign in with Apple: https://developer.apple.com/documentation/sign_in_with_apple
- Firebase Authentication: https://firebase.google.com/docs/auth
- Keychain Services: https://developer.apple.com/documentation/security/keychain_services

---

**Plan created by:** iOS Swift Architect + Principal Engineer Mentor
**Approved by:** Josh Petersen
**Implementation start:** TBD
