//
//  AppHeader.swift
//  moviegenius
//
//  Reusable header with back button and centered search bar
//  Used on all pages for consistent navigation
//
//  USAGE POLICY:
//  ============
//
//  ## When to Use AppHeader
//
//  ✅ Use AppHeader for ALL full-screen views that need:
//     - Search functionality (centered search bar)
//     - Optional back button navigation
//     - Consistent 60pt header height across the app
//
//  ## Parameters
//
//  - `showBackButton: Bool` (default: false)
//    - `false`: Root views (HomeView, GeniusView, etc.)
//    - `true`: Detail views (CollectionDetailView, MovieDetailView, etc.)
//
//  ## Implementation Pattern
//
//  ALL views using AppHeader must follow this structure:
//
//  ```swift
//  var body: some View {
//      ZStack(alignment: .top) {
//          // 1. Main scrolling content
//          ScrollView {
//              VStack(spacing: 0) {
//                  // REQUIRED: Top spacer for header
//                  Color.clear.frame(height: 60)
//
//                  // Your content here...
//              }
//          }
//
//          // 2. Overlaid AppHeader (stays on top while scrolling)
//          VStack {
//              AppHeader(showBackButton: true) // or false
//              Spacer()
//          }
//      }
//      .background(Color.mgBackground)
//      .navigationBarHidden(true) // REQUIRED
//  }
//  ```
//
//  ## Key Requirements
//
//  1. **ZStack Layout**: AppHeader overlays content using ZStack
//  2. **60pt Spacer**: Add `Color.clear.frame(height: 60)` at top of ScrollView content
//  3. **Hide Nav Bar**: Always use `.navigationBarHidden(true)`
//  4. **VStack Wrapper**: Wrap AppHeader in VStack with Spacer() to keep it at top
//
//  ## Examples
//
//  Root view (no back button):
//  ```swift
//  AppHeader() // or AppHeader(showBackButton: false)
//  ```
//
//  Detail view (with back button):
//  ```swift
//  AppHeader(showBackButton: true)
//  ```
//
//  ## Component Features
//
//  - **Height**: 60pt total (8pt vertical padding + 44pt content)
//  - **Search bar width**: 240pt fixed (centered)
//  - **Back button**: 44x44pt tap target (left side when enabled)
//  - **Background**: Semi-transparent (0.95 opacity) for subtle scroll-under effect
//  - **Search**: Tapping opens full-screen SearchView modal
//
//  ## DO NOT
//
//  ❌ DO NOT modify AppHeader spacing/sizing without updating all views
//  ❌ DO NOT use custom headers - always use AppHeader for consistency
//  ❌ DO NOT forget the 60pt spacer - content will appear under the header
//  ❌ DO NOT use NavigationBar alongside AppHeader - they conflict
//

import SwiftUI

struct AppHeader: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var auth = AuthManager.shared
    @State private var showSignOutConfirmation = false
    let showBackButton: Bool

    init(showBackButton: Bool = false) {
        self.showBackButton = showBackButton
    }

    var body: some View {
        HStack(spacing: .mgSpacing8) {
            // Back button or spacer (keeps search centered consistently)
            if showBackButton {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Color.mgGold)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
            } else {
                Color.clear
                    .frame(width: 44, height: 44)
            }

            // Search bar (centered)
            Spacer()
            SearchBarCompactSmaller()
            Spacer()

            // Sign-in indicator / Logout button
            if auth.isAuthenticated {
                Button {
                    showSignOutConfirmation = true
                } label: {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.mgGold)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .confirmationDialog("Sign Out", isPresented: $showSignOutConfirmation) {
                    Button("Sign Out", role: .destructive) {
                        auth.signOut()
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    if let email = auth.currentUser?.email {
                        Text("Signed in as \(email)")
                    } else {
                        Text("Are you sure you want to sign out?")
                    }
                }
            } else {
                Color.clear
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal, .mgSpacing16)
        .padding(.vertical, .mgSpacing8)
        .background(Color.mgBackground.opacity(0.95))
    }
}

// MARK: - Smaller Search Bar for Header

struct SearchBarCompactSmaller: View {
    @State private var showingSearch = false

    var body: some View {
        HStack(spacing: .mgSpacing8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Color.mgSecondary)
                .font(.system(size: 16))

            Text("Search movies...")
                .font(.mgBody)
                .foregroundStyle(Color.mgSecondary)

            Spacer(minLength: 0)
        }
        .frame(width: 240) // Apply width constraint BEFORE padding to ensure it takes effect
        .padding(.horizontal, .mgSpacing12)
        .padding(.vertical, .mgSpacing8)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
                .strokeBorder(Color.mgSecondary.opacity(0.2), lineWidth: 1)
        )
        .onTapGesture {
            showingSearch = true
        }
        .fullScreenCover(isPresented: $showingSearch) {
            NavigationStack {
                SearchView()
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") {
                                showingSearch = false
                            }
                            .foregroundStyle(Color.mgGold)
                        }
                    }
            }
        }
    }
}

#Preview("App Header") {
    AppHeader()
}
