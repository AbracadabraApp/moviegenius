// ios/moviegenius/moviegenius/Views/SignInPromptView.swift
// Native Apple-style sign-in modal with Face ID support

import SwiftUI
import AuthenticationServices

struct SignInPromptView: View {
    @ObservedObject var authManager = AuthManager.shared
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme
    @State private var isReady = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Content area
                VStack(spacing: 32) {
                    // Icon
                    Image(systemName: "person.crop.circle.fill.badge.checkmark")
                        .font(.system(size: 64))
                        .foregroundStyle(.blue)
                        .padding(.top, 60)

                    // Text
                    VStack(spacing: 12) {
                        Text("Sign in to MovieGenius")
                            .font(.mgTitle3)

                        Text("Save your favorites and watchlist across all your devices with Face ID")
                            .font(.mgSubheadline)
                            .foregroundStyle(Color.mgSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }

                    Spacer()

                    // Sign in with Apple button
                    VStack(spacing: 16) {
                        if authManager.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                        } else if isReady {
                            SignInWithAppleButton(.signIn) { request in
                                #if DEBUG
                                print("🍎 [SignInPromptView] SignInWithAppleButton tapped - preparing request")
                                #endif
                                request.requestedScopes = [.fullName, .email]
                            } onCompletion: { result in
                                #if DEBUG
                                print("🍎 [SignInPromptView] Sign-in completion called")
                                #endif
                                handleSignInResult(result)
                            }
                            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                            .frame(height: 50)
                            .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
                            .contentShape(Rectangle()) // Ensure entire frame is tappable
                        } else {
                            // Placeholder while initializing
                            RoundedRectangle(cornerRadius: .mgCornerSmall)
                                .fill(Color.mgSecondary.opacity(0.2))
                                .frame(height: 50)
                                .overlay {
                                    ProgressView()
                                        .tint(Color.mgGold)
                                }
                        }

                        // Error message
                        if let errorMessage = authManager.errorMessage {
                            Text(errorMessage)
                                .font(.mgCaption)
                                .foregroundStyle(Color.mgDestructive)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 32)
                }

                // Footer
                VStack(spacing: 8) {
                    Divider()

                    Text("Your data is encrypted and private")
                        .font(.mgCaption)
                        .foregroundStyle(Color.mgSecondary)
                        .padding(.vertical, 12)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Not Now") {
                        dismiss()
                    }
                    .font(.mgBody)
                }
            }
            .task {
                // Warm up the authorization system
                // Delay ensures the view is fully rendered before showing the button
                #if DEBUG
                print("🍎 [SignInPromptView] Sheet appeared, warming up auth system...")
                #endif
                try? await Task.sleep(nanoseconds: 500_000_000) // 500ms
                #if DEBUG
                print("🍎 [SignInPromptView] Auth system ready, showing button")
                #endif
                isReady = true
            }
        }
    }

    private func handleSignInResult(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            if let credential = authorization.credential as? ASAuthorizationAppleIDCredential {
                Task {
                    do {
                        try await AuthManager.shared.handleSignInResult(credential: credential)
                        dismiss()
                    } catch {
                        // Error is already handled in AuthManager
                    }
                }
            }
        case .failure(let error):
            // Only log if it's not a user cancellation
            if (error as NSError).code != 1001 {
                print("❌ Sign in failed: \(error.localizedDescription)")
            }
        }
    }
}

#Preview {
    SignInPromptView()
}
