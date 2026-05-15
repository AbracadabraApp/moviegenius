// ios/moviegenius/moviegenius/Managers/AuthManager.swift
// Handle Sign in with Apple and communicate with backend API

import Foundation
import AuthenticationServices
import Combine

@MainActor
class AuthManager: NSObject, ObservableObject {
    static let shared = AuthManager()

    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?

    struct User: Codable {
        let id: Int
        let email: String?
        let name: String?
    }

    private let keychainManager = KeychainManager.shared
    private let apiBaseURL = "https://moviegenius.ai" // Change to localhost:3000 for local dev

    override init() {
        super.init()
        checkAuthenticationStatus()
    }

    // Check if user is already authenticated (JWT exists in Keychain)
    func checkAuthenticationStatus() {
        if let token = keychainManager.getToken() {
            // Validate token by making a test API call
            Task {
                do {
                    try await validateToken(token)
                    isAuthenticated = true
                } catch {
                    // Token invalid or expired - clear it
                    keychainManager.deleteToken()
                    isAuthenticated = false
                }
            }
        } else {
            isAuthenticated = false
        }
    }

    // Trigger Sign in with Apple
    func signInWithApple() {
        isLoading = true
        errorMessage = nil

        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.performRequests()
    }

    // Handle successful Apple Sign-In
    func handleSignInResult(credential: ASAuthorizationAppleIDCredential) async throws {
        guard let identityToken = credential.identityToken,
              let identityTokenString = String(data: identityToken, encoding: .utf8) else {
            throw AuthError.invalidToken
        }

        // Prepare user data (only available on first sign-in)
        var userData: [String: Any] = [:]
        if let fullName = credential.fullName {
            userData["fullName"] = [
                "givenName": fullName.givenName ?? "",
                "familyName": fullName.familyName ?? ""
            ]
        }
        if let email = credential.email {
            userData["email"] = email
        }

        // Send to backend API
        let requestBody: [String: Any] = [
            "identityToken": identityTokenString,
            "user": userData
        ]

        let url = URL(string: "\(apiBaseURL)/api/v1/auth/apple")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.serverError
        }

        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)

        // Save JWT to Keychain
        keychainManager.saveToken(authResponse.token)

        // Update state
        currentUser = authResponse.user
        isAuthenticated = true
        isLoading = false

        print("✅ Sign-in successful: \(authResponse.user.email ?? "No email")")
    }

    // Validate token by making a test API call
    private func validateToken(_ token: String) async throws {
        let url = URL(string: "\(apiBaseURL)/api/v1/user/favorites")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.invalidToken
        }
    }

    // Get current JWT for API requests
    func getAuthToken() -> String? {
        return keychainManager.getToken()
    }

    // Sign out
    func signOut() {
        keychainManager.deleteToken()
        currentUser = nil
        isAuthenticated = false
        print("✅ Signed out successfully")
    }
}

// MARK: - ASAuthorizationControllerDelegate
extension AuthManager: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        Task { @MainActor in
            do {
                guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                    throw AuthError.invalidCredential
                }
                try await handleSignInResult(credential: credential)
            } catch {
                errorMessage = "Sign-in failed: \(error.localizedDescription)"
                isLoading = false
                print("❌ Sign-in error: \(error)")
            }
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        Task { @MainActor in
            errorMessage = "Sign-in cancelled or failed"
            isLoading = false
            print("❌ Authorization error: \(error)")
        }
    }
}

// MARK: - Supporting Types
enum AuthError: Error, LocalizedError {
    case invalidToken
    case invalidCredential
    case serverError

    var errorDescription: String? {
        switch self {
        case .invalidToken: return "Invalid or expired token"
        case .invalidCredential: return "Invalid Apple credential"
        case .serverError: return "Server authentication failed"
        }
    }
}

struct AuthResponse: Codable {
    let success: Bool
    let token: String
    let user: AuthManager.User
}
