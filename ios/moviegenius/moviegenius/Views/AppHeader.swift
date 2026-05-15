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

            // Invisible spacer on right to balance left side
            Color.clear
                .frame(width: 44, height: 44)
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
