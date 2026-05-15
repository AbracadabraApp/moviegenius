# MovieGenius iOS Sign-In Architecture Plan (NextAuth Approach)

**Created:** 2026-05-14
**Status:** Approved - NextAuth Implementation
**Timeline:** 3-4 weeks (Phase 1 MVP)
**Cost:** $0 (no external auth dependencies)

---

## Executive Summary

Implement account-level data persistence for MovieGenius iOS app by extending the existing NextAuth infrastructure to support native iOS authentication. Enable cross-device sync of favorites and queue with lazy sign-in UX pattern (prompt only on first stateful interaction).

**Key Decision:** Extend NextAuth (not Firebase) to avoid Google dependencies and maintain unified authentication across web and iOS platforms.

---

## Current State

### iOS App
- **FavoritesManager**: Stores loved movies and queue in UserDefaults (device-local only)
- **Genre Expertise**: Calculated from favorites, stored locally
- **Risk**: All user data lost on app deletion or device change

### Web App
- **NextAuth**: Google OAuth exists but unused for favorites
- **localStorage**: Favorites stored locally (same pattern as iOS)
- **Database**: `users` table exists from NextAuth, but no `user_favorites` table

### Database (Railway PostgreSQL)
```sql
-- Currently exists (from NextAuth)
users (id, email, name, image, created_at)
accounts (provider, provider_account_id, user_id)
sessions (session_token, user_id, expires)

-- Missing (needs migration)
user_favorites (user_id, movie_tmdb_id, created_at)
user_queue (user_id, movie_tmdb_id, created_at)
```

---

## Recommended Architecture

### Backend: NextAuth Extended for iOS

**Why NextAuth extension (not Firebase):**
1. ✅ Already exists in codebase (no new dependencies)
2. ✅ Unified auth system (web + iOS use same database)
3. ✅ No Google/Firebase dependencies
4. ✅ Full control over JWT generation and validation
5. ✅ Easier to add more providers later (email, Google)

**Tradeoffs vs. Firebase:**
- ❌ More backend code (~10 additional hours)
- ❌ Manual Apple Sign-In token validation required
- ❌ Custom JWT generation for iOS consumption
- ✅ But: Complete ownership and no vendor lock-in

**Auth Flow:**
```
iOS App (SwiftUI)
  ↓ AuthenticationServices.framework (Sign in with Apple)
  ↓ Returns Apple identity token + user info
  ↓ POST /api/v1/auth/apple with token
Next.js API Route (/api/v1/auth/apple)
  ↓ Verify Apple token with Apple's public keys
  ↓ Create/update user in PostgreSQL
  ↓ Generate custom JWT for iOS (7-day expiry)
  ↓ Return JWT to iOS app
iOS App
  ↓ Store JWT in Keychain
  ↓ Include in Authorization header for all API requests
Next.js API Routes (/api/v1/*)
  ↓ Verify JWT signature
  ↓ Extract user_id from claims
  ↓ Query Railway PostgreSQL
Railway PostgreSQL
  ↓ users (id, email, name, apple_id)
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

## Phase 1: MVP Auth (3-4 weeks)

### Backend Setup (10-12 hours)

#### 1. Database Migration
```sql
-- migrations/001_add_user_auth_tables.sql

-- Extend existing NextAuth users table (already exists)
-- Add apple_id column if not exists
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);

-- User favorites table (loved movies)
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  movie_tmdb_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, movie_tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);

-- User queue table (movies to watch)
CREATE TABLE IF NOT EXISTS user_queue (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  movie_tmdb_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, movie_tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_user_queue_user_id ON user_queue(user_id);

-- Comments
COMMENT ON TABLE user_favorites IS 'Movies marked as "Seen it" (loved)';
COMMENT ON TABLE user_queue IS 'Movies marked as "Watch it" (bookmarked)';
COMMENT ON COLUMN users.apple_id IS 'Apple Sign-In unique identifier';
```

**Run migration:**
```bash
node --env-file=.env.local -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const sql = fs.readFileSync('migrations/001_add_user_auth_tables.sql', 'utf8');
  await pool.query(sql);
  console.log('✅ Migration complete');
  await pool.end();
})();
"
```

#### 2. JWT Helper Library
```javascript
// lib/jwt-ios.js - Custom JWT generation and validation for iOS

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.IOS_JWT_SECRET; // Add to Railway env vars
const JWT_EXPIRY = '7d'; // 7 days

/**
 * Generate JWT for iOS app after successful Apple Sign-In
 */
function generateIOSToken(userId, email, appleId) {
  return jwt.sign(
    {
      sub: userId,        // User ID (primary key)
      email: email,       // User email (may be relay)
      appleId: appleId,   // Apple unique identifier
      iat: Math.floor(Date.now() / 1000),
      iss: 'moviegenius-api'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify JWT from iOS Authorization header
 * Returns decoded payload or throws error
 */
function verifyIOSToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'moviegenius-api'
    });
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

/**
 * Middleware to extract user ID from Authorization header
 * Usage: const userId = await authenticateRequest(req);
 */
async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7); // Remove "Bearer "
  const payload = verifyIOSToken(token);

  return payload.sub; // Return user ID
}

module.exports = {
  generateIOSToken,
  verifyIOSToken,
  authenticateRequest
};
```

**Add to Railway env vars:**
```bash
# Generate a secure random secret
IOS_JWT_SECRET=<openssl rand -hex 32>
```

#### 3. Apple Sign-In Token Verification
```javascript
// lib/apple-signin-verify.js - Verify Apple identity tokens

const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

// Apple's public keys endpoint
const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';

const client = jwksClient({
  jwksUri: APPLE_JWKS_URI,
  cache: true,
  cacheMaxAge: 86400000 // 24 hours
});

/**
 * Get Apple's signing key for token verification
 */
function getAppleSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify Apple identity token from iOS app
 * Returns decoded payload with user info
 */
async function verifyAppleToken(identityToken) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getAppleSigningKey,
      {
        issuer: 'https://appleid.apple.com',
        audience: 'com.moviegenius.app' // iOS bundle ID
      },
      (error, decoded) => {
        if (error) {
          reject(new Error(`Apple token verification failed: ${error.message}`));
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

module.exports = {
  verifyAppleToken
};
```

**Install dependencies:**
```bash
npm install jsonwebtoken jwks-rsa
```

#### 4. API Endpoint: POST /api/v1/auth/apple
```javascript
// pages/api/v1/auth/apple.js - Apple Sign-In verification and JWT generation

import { Pool } from 'pg';
import { verifyAppleToken } from '@/lib/apple-signin-verify';
import { generateIOSToken } from '@/lib/jwt-ios';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { identityToken, user } = req.body;

  if (!identityToken) {
    return res.status(400).json({ error: 'identityToken required' });
  }

  try {
    // 1. Verify Apple token with Apple's public keys
    const applePayload = await verifyAppleToken(identityToken);
    const appleId = applePayload.sub; // Apple's unique user ID

    // 2. Extract user info (only provided on first sign-in)
    const email = applePayload.email || user?.email || null;
    const name = user?.fullName
      ? `${user.fullName.givenName || ''} ${user.fullName.familyName || ''}`.trim()
      : null;

    const client = await pool.connect();

    try {
      // 3. Create or update user in database
      const userResult = await client.query(
        `INSERT INTO users (apple_id, email, name, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (apple_id)
         DO UPDATE SET
           email = COALESCE(users.email, EXCLUDED.email),
           name = COALESCE(users.name, EXCLUDED.name),
           updated_at = NOW()
         RETURNING id, email, name`,
        [appleId, email, name]
      );

      const dbUser = userResult.rows[0];

      // 4. Generate iOS JWT (7-day expiry)
      const token = generateIOSToken(dbUser.id, dbUser.email, appleId);

      // 5. Return JWT to iOS app
      return res.status(200).json({
        success: true,
        token: token,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Apple sign-in error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
```

**Request format:**
```json
POST /api/v1/auth/apple
Content-Type: application/json

{
  "identityToken": "eyJraWQiOiJBQ...",  // From Apple Sign-In
  "user": {                              // Only on first sign-in
    "email": "user@privaterelay.appleid.com",
    "fullName": {
      "givenName": "John",
      "familyName": "Doe"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "user@privaterelay.appleid.com",
    "name": "John Doe"
  }
}
```

#### 5. API Endpoint: GET /api/v1/user/favorites
```javascript
// pages/api/v1/user/favorites.js - Get user's favorites

import { Pool } from 'pg';
import { authenticateRequest } from '@/lib/jwt-ios';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET allowed' });
  }

  try {
    // Verify JWT and extract user ID
    const userId = await authenticateRequest(req);

    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT uf.movie_tmdb_id, uf.created_at, m.title, m.year, m.poster_url
         FROM user_favorites uf
         JOIN movies m ON m.tmdb_id = uf.movie_tmdb_id
         WHERE uf.user_id = $1
         ORDER BY uf.created_at DESC`,
        [userId]
      );

      return res.status(200).json({
        favorites: result.rows.map(row => ({
          tmdb_id: row.movie_tmdb_id,
          title: row.title,
          year: row.year,
          poster_url: row.poster_url,
          added_at: row.created_at
        }))
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get favorites error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
```

**Request:**
```http
GET /api/v1/user/favorites
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "favorites": [
    {
      "tmdb_id": 550,
      "title": "Fight Club",
      "year": 1999,
      "poster_url": "https://image.tmdb.org/t/p/w500/...",
      "added_at": "2026-05-14T10:30:00.000Z"
    }
  ]
}
```

#### 6. API Endpoint: POST /api/v1/user/favorites
```javascript
// pages/api/v1/user/favorites.js - Add favorite (extend above file)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // ... existing GET handler above
  }

  if (req.method === 'POST') {
    const { tmdb_id } = req.body;

    if (!tmdb_id) {
      return res.status(400).json({ error: 'tmdb_id required' });
    }

    try {
      const userId = await authenticateRequest(req);

      const client = await pool.connect();

      try {
        await client.query(
          `INSERT INTO user_favorites (user_id, movie_tmdb_id, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id, movie_tmdb_id) DO NOTHING`,
          [userId, tmdb_id]
        );

        return res.status(201).json({ success: true });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Add favorite error:', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

#### 7. API Endpoint: DELETE /api/v1/user/favorites/:tmdbId
```javascript
// pages/api/v1/user/favorites/[tmdbId].js - Remove favorite

import { Pool } from 'pg';
import { authenticateRequest } from '@/lib/jwt-ios';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Only DELETE allowed' });
  }

  const { tmdbId } = req.query;

  try {
    const userId = await authenticateRequest(req);

    const client = await pool.connect();

    try {
      const result = await client.query(
        `DELETE FROM user_favorites
         WHERE user_id = $1 AND movie_tmdb_id = $2`,
        [userId, parseInt(tmdbId)]
      );

      return res.status(200).json({
        success: true,
        deleted: result.rowCount > 0
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete favorite error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
```

---

### iOS Implementation (8-10 hours)

#### 1. Enable Sign in with Apple Capability
```bash
# In Xcode:
# 1. Select project → Target → Signing & Capabilities
# 2. Click "+ Capability"
# 3. Add "Sign in with Apple"
```

#### 2. KeychainManager (Secure Token Storage)
```swift
// ios/moviegenius/moviegenius/Managers/KeychainManager.swift

import Foundation
import Security

class KeychainManager {
    static let shared = KeychainManager()

    private let service = "com.moviegenius.app"
    private let tokenKey = "auth_token"

    // Save JWT to Keychain
    func saveToken(_ token: String) {
        let data = token.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data
        ]

        // Delete existing item first
        SecItemDelete(query as CFDictionary)

        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)

        if status != errSecSuccess {
            print("❌ Keychain save failed: \(status)")
        }
    }

    // Get JWT from Keychain
    func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecSuccess, let data = result as? Data {
            return String(data: data, encoding: .utf8)
        }

        return nil
    }

    // Delete JWT from Keychain
    func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey
        ]

        SecItemDelete(query as CFDictionary)
    }
}
```

#### 3. AuthManager (Sign in with Apple + API)
```swift
// ios/moviegenius/moviegenius/Managers/AuthManager.swift

import SwiftUI
import AuthenticationServices

@MainActor
class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false

    private let keychainManager = KeychainManager.shared
    private let apiBaseURL = "https://moviegenius.ai/api/v1"

    struct User: Codable {
        let id: Int
        let email: String?
        let name: String?
    }

    init() {
        // Check if token exists in Keychain on init
        if keychainManager.getToken() != nil {
            isAuthenticated = true
        }
    }

    // Trigger Sign in with Apple
    func signInWithApple() async throws {
        isLoading = true
        defer { isLoading = false }

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        let delegate = SignInDelegate { [weak self] result in
            Task { @MainActor in
                await self?.handleSignInResult(result)
            }
        }

        controller.delegate = delegate
        controller.performRequests()
    }

    // Handle Apple Sign-In result and send to backend
    private func handleSignInResult(_ result: Result<ASAuthorization, Error>) async {
        do {
            let authorization = try result.get()

            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                throw NSError(domain: "AuthManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid credential type"])
            }

            guard let identityTokenData = appleIDCredential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                throw NSError(domain: "AuthManager", code: -2, userInfo: [NSLocalizedDescriptionKey: "Missing identity token"])
            }

            // Build request payload
            var payload: [String: Any] = [
                "identityToken": identityToken
            ]

            // Add user info (only provided on first sign-in)
            if let fullName = appleIDCredential.fullName {
                payload["user"] = [
                    "email": appleIDCredential.email ?? "",
                    "fullName": [
                        "givenName": fullName.givenName ?? "",
                        "familyName": fullName.familyName ?? ""
                    ]
                ]
            }

            // Send to backend
            let url = URL(string: "\(apiBaseURL)/auth/apple")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw NSError(domain: "AuthManager", code: -3, userInfo: [NSLocalizedDescriptionKey: "Backend authentication failed"])
            }

            let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)

            // Save JWT to Keychain
            keychainManager.saveToken(authResponse.token)

            // Update state
            currentUser = authResponse.user
            isAuthenticated = true

            print("✅ Sign-in successful - User ID: \(authResponse.user.id)")

        } catch {
            print("❌ Sign-in failed: \(error.localizedDescription)")
            throw error
        }
    }

    // Sign out
    func signOut() {
        keychainManager.deleteToken()
        currentUser = nil
        isAuthenticated = false
    }

    // Get auth token for API requests
    func getAuthToken() -> String? {
        return keychainManager.getToken()
    }
}

// Response structure from /api/v1/auth/apple
private struct AuthResponse: Codable {
    let success: Bool
    let token: String
    let user: AuthManager.User
}

// Delegate for ASAuthorizationController
private class SignInDelegate: NSObject, ASAuthorizationControllerDelegate {
    let completion: (Result<ASAuthorization, Error>) -> Void

    init(completion: @escaping (Result<ASAuthorization, Error>) -> Void) {
        self.completion = completion
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        completion(.success(authorization))
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        completion(.failure(error))
    }
}
```

#### 4. SignInPromptView (Lazy Sign-In UX)
```swift
// ios/moviegenius/moviegenius/Views/SignInPromptView.swift

import SwiftUI
import AuthenticationServices

struct SignInPromptView: View {
    @StateObject private var authManager = AuthManager.shared
    @Environment(\.dismiss) var dismiss

    let onSignInComplete: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            // Icon
            Image(systemName: "heart.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.red)

            // Title
            Text("Sign in to save favorites")
                .font(.title2)
                .fontWeight(.bold)

            // Description
            Text("Create an account to sync your favorites across all your devices")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Spacer()

            // Sign in with Apple button
            SignInWithAppleButton(
                onRequest: { request in
                    request.requestedScopes = [.fullName, .email]
                },
                onCompletion: { result in
                    Task {
                        do {
                            try await authManager.signInWithApple()
                            onSignInComplete()
                            dismiss()
                        } catch {
                            print("❌ Sign-in error: \(error)")
                        }
                    }
                }
            )
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)
            .padding(.horizontal, 32)

            // Cancel button
            Button("Maybe later") {
                dismiss()
            }
            .foregroundColor(.secondary)
            .padding(.bottom, 8)
        }
        .padding()
    }
}
```

#### 5. Refactor FavoritesManager for Cloud Sync
```swift
// ios/moviegenius/moviegenius/Managers/FavoritesManager.swift (modifications)

@MainActor
class FavoritesManager: ObservableObject {
    static let shared = FavoritesManager()

    @Published var favorites: Set<Int> = []
    @Published var queue: Set<Int> = []

    private let authManager = AuthManager.shared
    private let apiBaseURL = "https://moviegenius.ai/api/v1"

    init() {
        loadLocalFavorites()

        // Sync with cloud on init if authenticated
        if authManager.isAuthenticated {
            Task {
                await syncWithCloud()
            }
        }
    }

    // Load from UserDefaults (local cache)
    private func loadLocalFavorites() {
        if let data = UserDefaults.standard.data(forKey: "favorites"),
           let decoded = try? JSONDecoder().decode(Set<Int>.self, from: data) {
            favorites = decoded
        }

        if let data = UserDefaults.standard.data(forKey: "queue"),
           let decoded = try? JSONDecoder().decode(Set<Int>.self, from: data) {
            queue = decoded
        }
    }

    // Save to UserDefaults (local cache)
    private func saveLocalFavorites() {
        if let encoded = try? JSONEncoder().encode(favorites) {
            UserDefaults.standard.set(encoded, forKey: "favorites")
        }

        if let encoded = try? JSONEncoder().encode(queue) {
            UserDefaults.standard.set(encoded, forKey: "queue")
        }
    }

    // Add favorite (local + cloud)
    func addFavorite(tmdbId: Int) async {
        favorites.insert(tmdbId)
        saveLocalFavorites()

        // Sync to cloud if authenticated
        if authManager.isAuthenticated {
            await syncToCloud(tmdbId: tmdbId, action: .add)
        }
    }

    // Remove favorite (local + cloud)
    func removeFavorite(tmdbId: Int) async {
        favorites.remove(tmdbId)
        saveLocalFavorites()

        // Sync to cloud if authenticated
        if authManager.isAuthenticated {
            await syncToCloud(tmdbId: tmdbId, action: .remove)
        }
    }

    // Sync with cloud (union merge - never delete)
    func syncWithCloud() async {
        guard let token = authManager.getAuthToken() else { return }

        do {
            // GET cloud favorites
            let url = URL(string: "\(apiBaseURL)/user/favorites")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

            let (data, _) = try await URLSession.shared.data(for: request)
            let response = try JSONDecoder().decode(FavoritesResponse.self, from: data)

            let cloudFavorites = Set(response.favorites.map { $0.tmdb_id })

            // Union merge: local ∪ cloud
            let mergedFavorites = favorites.union(cloudFavorites)

            // Update local
            favorites = mergedFavorites
            saveLocalFavorites()

            // Push any new local favorites to cloud
            let newLocalFavorites = favorites.subtracting(cloudFavorites)
            for tmdbId in newLocalFavorites {
                await syncToCloud(tmdbId: tmdbId, action: .add)
            }

            print("✅ Synced favorites - Local: \(favorites.count)")

        } catch {
            print("❌ Sync failed: \(error)")
        }
    }

    // Sync single favorite to cloud
    private func syncToCloud(tmdbId: Int, action: SyncAction) async {
        guard let token = authManager.getAuthToken() else { return }

        do {
            let url: URL
            var request: URLRequest

            switch action {
            case .add:
                url = URL(string: "\(apiBaseURL)/user/favorites")!
                request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = try JSONSerialization.data(withJSONObject: ["tmdb_id": tmdbId])

            case .remove:
                url = URL(string: "\(apiBaseURL)/user/favorites/\(tmdbId)")!
                request = URLRequest(url: url)
                request.httpMethod = "DELETE"
            }

            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

            let (_, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse,
               (200...299).contains(httpResponse.statusCode) {
                print("✅ Synced \(action) for movie \(tmdbId)")
            }

        } catch {
            print("❌ Sync failed for \(tmdbId): \(error)")
        }
    }

    enum SyncAction {
        case add, remove
    }
}

private struct FavoritesResponse: Codable {
    let favorites: [CloudFavorite]
}

private struct CloudFavorite: Codable {
    let tmdb_id: Int
}
```

#### 6. Update FavoriteButtons to Trigger Sign-In
```swift
// ios/moviegenius/moviegenius/Components/FavoriteButtons.swift (modifications)

struct FavoriteButtons: View {
    let movieId: Int

    @StateObject private var favoritesManager = FavoritesManager.shared
    @StateObject private var authManager = AuthManager.shared
    @State private var showSignInPrompt = false

    var body: some View {
        HStack(spacing: 16) {
            // Seen It button
            Button {
                handleFavoriteToggle()
            } label: {
                // ... existing button UI
            }

            // Watch It button
            Button {
                handleQueueToggle()
            } label: {
                // ... existing button UI
            }
        }
        .sheet(isPresented: $showSignInPrompt) {
            SignInPromptView {
                // After sign-in, sync local favorites to cloud
                Task {
                    await favoritesManager.syncWithCloud()
                }
            }
        }
    }

    private func handleFavoriteToggle() {
        // Check if authenticated
        if !authManager.isAuthenticated {
            showSignInPrompt = true
            return
        }

        // Toggle favorite
        Task {
            if favoritesManager.favorites.contains(movieId) {
                await favoritesManager.removeFavorite(tmdbId: movieId)
            } else {
                await favoritesManager.addFavorite(tmdbId: movieId)
            }
        }
    }

    private func handleQueueToggle() {
        // Same logic for queue
        if !authManager.isAuthenticated {
            showSignInPrompt = true
            return
        }

        // ... toggle queue logic
    }
}
```

---

## Security Considerations

### Token Security
- ✅ JWT stored in iOS Keychain (encrypted by OS)
- ✅ 7-day expiry (re-authenticate periodically)
- ✅ HTTPS-only API communication
- ✅ No tokens in logs or UserDefaults

### Apple Token Validation
- ✅ Verify with Apple's public keys (JWKS)
- ✅ Check issuer (`https://appleid.apple.com`)
- ✅ Check audience (iOS bundle ID)
- ✅ Verify expiration timestamp

### Database
- ✅ CASCADE delete on user removal (GDPR compliant)
- ✅ No raw Apple identity tokens stored
- ✅ Email optional (supports "Hide My Email")

---

## Testing Strategy

### Backend Testing
```bash
# 1. Test Apple token verification with mock token
curl -X POST https://moviegenius.ai/api/v1/auth/apple \
  -H "Content-Type: application/json" \
  -d '{"identityToken": "mock_token"}'

# 2. Test favorites GET with valid JWT
curl https://moviegenius.ai/api/v1/user/favorites \
  -H "Authorization: Bearer YOUR_JWT_HERE"

# 3. Test favorites POST
curl -X POST https://moviegenius.ai/api/v1/user/favorites \
  -H "Authorization: Bearer YOUR_JWT_HERE" \
  -H "Content-Type: application/json" \
  -d '{"tmdb_id": 550}'
```

### iOS Testing
1. **Sign-In Flow**: Tap favorite → Sign-in prompt → Apple auth → Success
2. **Local Persistence**: Add favorite → Kill app → Relaunch → Favorite persists
3. **Cloud Sync**: Sign in → Favorites from web appear
4. **Conflict Resolution**: Add local favorite → Sign in → Union merge works

---

## Rollback Plan

**If authentication fails in production:**

1. **Disable sign-in requirement** (temporary):
   ```swift
   // In FavoriteButtons.swift
   private func handleFavoriteToggle() {
       // SKIP auth check temporarily
       // if !authManager.isAuthenticated { ... }

       Task {
           await favoritesManager.addFavorite(tmdbId: movieId)
       }
   }
   ```

2. **Revert database migration** (if schema issues):
   ```sql
   DROP TABLE user_favorites;
   DROP TABLE user_queue;
   ALTER TABLE users DROP COLUMN apple_id;
   ```

3. **Remove API endpoints** (disable via 503 status):
   ```javascript
   // In each /api/v1/* endpoint
   return res.status(503).json({ error: 'Authentication temporarily disabled' });
   ```

---

## Summary

**What we're building:**
- Extend NextAuth to support native iOS authentication
- Manual Apple Sign-In token verification
- Custom JWT generation for iOS consumption
- Cloud sync with union merge strategy
- Lazy sign-in UX (prompt only on favorite tap)

**Why NextAuth (not Firebase):**
- No Google/external dependencies
- Unified auth across web + iOS
- Full control over JWT lifecycle
- Easier to extend later

**Timeline:**
- Backend: 10-12 hours
- iOS: 8-10 hours
- Testing: 4-6 hours
- **Total: 3-4 weeks** (with QA and polish)

**Next step:** Run database migration and create backend API endpoints.
