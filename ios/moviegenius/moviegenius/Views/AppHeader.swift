//
//  AppHeader.swift
//  moviegenius
//
//  Reusable header with back button and centered search bar
//  Used on all pages for consistent navigation
//

import SwiftUI

struct AppHeader: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.presentationMode) private var presentationMode

    // Automatically detect if back button should show
    private var canGoBack: Bool {
        presentationMode.wrappedValue.isPresented
    }

    var body: some View {
        HStack(spacing: .mgSpacing8) {
            // Back button (only shown when navigation can go back)
            if canGoBack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Color.mgGold)
                        .frame(width: 44, height: 44) // Standard iOS touch target
                }
            } else {
                // Spacer when no back button to keep search centered
                Spacer()
                    .frame(width: 8)
            }

            // Search bar (centered, smaller to accommodate back button)
            Spacer()
            SearchBarCompactSmaller()
            Spacer()

            // Invisible spacer on right to balance back button (keeps search centered)
            if canGoBack {
                Color.clear
                    .frame(width: 44, height: 44)
            } else {
                Spacer()
                    .frame(width: 8)
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

            Spacer()
        }
        .padding(.horizontal, .mgSpacing12)
        .padding(.vertical, .mgSpacing8)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
                .strokeBorder(Color.mgSecondary.opacity(0.2), lineWidth: 1)
        )
        .frame(width: 280) // Smaller to fit with back button
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
