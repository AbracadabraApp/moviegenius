//
//  WatchContainerView.swift
//  moviegenius
//
//  Container view with segmented control for Watchlist and Seen tabs
//

import SwiftUI

struct WatchContainerView: View {
    @State private var selectedTab = 0
    @State private var showingAccountSheet = false
    @ObservedObject var authManager = AuthManager.shared

    var body: some View {
        VStack(spacing: 0) {
            // Header - matching Genius view styling
            VStack(alignment: .leading, spacing: .mgSpacing24) {
                Text("Your movie lists")
                    .font(.mgTitle)
                    .foregroundStyle(Color.mgPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, .mgSpacing16)
            .padding(.top, .mgSpacing24)
            .padding(.bottom, .mgSpacing8)

            // Segmented control + Account button
            HStack(spacing: .mgSpacing12) {
                // Segmented control
                Picker("View", selection: $selectedTab) {
                    Text("Watchlist").tag(0)
                    Text("Seen").tag(1)
                }
                .pickerStyle(.segmented)

                // Account button
                Button(action: {
                    showingAccountSheet = true
                }) {
                    Image(systemName: authManager.isAuthenticated ? "person.circle.fill" : "person.circle")
                        .font(.system(size: 24))
                        .foregroundStyle(authManager.isAuthenticated ? Color.mgGold : Color.mgSecondary)
                }
                .accessibilityLabel(authManager.isAuthenticated ? "Account" : "Sign In")
            }
            .padding(.horizontal, .mgSpacing20)
            .padding(.vertical, .mgSpacing12)
            .background(Color(.systemGroupedBackground))

            // Content
            TabView(selection: $selectedTab) {
                WatchQueueView()
                    .tag(0)

                SeenMoviesView()
                    .tag(1)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .background(Color(.systemGroupedBackground))
        .sheet(isPresented: $showingAccountSheet) {
            AccountSheet()
        }
    }
}

// MARK: - Account Sheet

struct AccountSheet: View {
    @ObservedObject var authManager = AuthManager.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: .mgSpacing24) {
                if authManager.isAuthenticated {
                    // Signed in state
                    VStack(spacing: .mgSpacing16) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 80))
                            .foregroundStyle(Color.mgGold)

                        if let user = authManager.currentUser {
                            if let name = user.name {
                                Text(name)
                                    .font(.mgTitle2)
                                    .foregroundStyle(Color.mgPrimary)
                            }

                            if let email = user.email {
                                Text(email)
                                    .font(.mgBody)
                                    .foregroundStyle(Color.mgSecondary)
                            }
                        }
                    }
                    .padding(.top, .mgSpacing32)

                    Spacer()

                    Button(action: {
                        authManager.signOut()
                        dismiss()
                    }) {
                        Text("Sign Out")
                            .font(.mgBody)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, .mgSpacing16)
                            .background(Color.red)
                            .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous))
                    }
                    .padding(.horizontal, .mgSpacing20)
                    .padding(.bottom, .mgSpacing32)

                } else {
                    // Signed out state
                    VStack(spacing: .mgSpacing20) {
                        Spacer()

                        Image(systemName: "person.circle")
                            .font(.system(size: 80))
                            .foregroundStyle(Color.mgSecondary)

                        Text("Sign in to sync your favorites")
                            .font(.mgTitle3)
                            .foregroundStyle(Color.mgPrimary)
                            .multilineTextAlignment(.center)

                        Text("Keep your watchlist and seen movies synced across all your devices")
                            .font(.mgBody)
                            .foregroundStyle(Color.mgSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, .mgSpacing32)

                        Spacer()

                        Button(action: {
                            authManager.signInWithApple()
                        }) {
                            Text("Sign in with Apple")
                                .font(.mgBody)
                                .fontWeight(.semibold)
                                .foregroundStyle(Color.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, .mgSpacing16)
                                .background(Color.black)
                                .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous))
                        }
                        .padding(.horizontal, .mgSpacing20)
                        .padding(.bottom, .mgSpacing32)
                    }
                }
            }
            .background(Color.mgBackground)
            .navigationTitle(authManager.isAuthenticated ? "Account" : "Sign In")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        WatchContainerView()
    }
}
