//
//  FavoriteButtons.swift
//  moviegenius
//
//  Reusable favorite action buttons (Seen/Add) with lazy sign-in
//

import SwiftUI

struct FavoriteButtons: View {
    let movie: SavedMovie
    let onDarkBackground: Bool
    @ObservedObject var favorites = FavoritesManager.shared

    init(tmdbId: Int, title: String, year: Int?, posterUrl: String?, slug: String? = nil, onDarkBackground: Bool = false) {
        self.movie = SavedMovie(
            id: tmdbId,
            title: title,
            year: year,
            posterUrl: posterUrl,
            slug: slug
        )
        self.onDarkBackground = onDarkBackground
    }

    // Dynamic colors based on background context
    // Note: .white literals are intentional when onDarkBackground=true for guaranteed contrast
    private var inactiveColor: Color {
        onDarkBackground ? .white : Color.mgPrimary
    }

    private var borderColor: Color {
        onDarkBackground ? Color.white.opacity(0.3) : Color.mgSecondary.opacity(0.3)
    }

    var body: some View {
        HStack(spacing: .mgSpacing12) {
            // Seen button - Glass capsule with text label
            Button(action: {
                HapticManager.selection()
                handleLovedTap()
            }) {
                HStack(spacing: 5) {
                    Image(systemName: isLoved ? "checkmark.circle.fill" : "checkmark.circle")
                        .font(.system(size: 15))
                        .foregroundStyle(isLoved ? Color.mgGold : inactiveColor)

                    Text("Seen it")
                        .font(.mgCaption)
                        .fontWeight(isLoved ? .semibold : .regular)
                        .foregroundStyle(isLoved ? Color.mgGold : inactiveColor)
                }
                .frame(minHeight: 36)
                .padding(.horizontal, 10)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(
                            isLoved ? Color.mgGold : borderColor,
                            lineWidth: isLoved ? 2 : 1
                        )
                )
                .mgShadowSubtle()
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isLoved ? "Seen it - marked" : "Seen it")
            .accessibilityHint("Mark movies you've already seen")
            .accessibilityValue(isLoved ? "Marked" : "Not marked")

            // Add button - Glass capsule with text label
            Button(action: {
                HapticManager.selection()
                handleQueueTap()
            }) {
                HStack(spacing: 5) {
                    Image(systemName: isInQueue ? "plus.circle.fill" : "plus.circle")
                        .font(.system(size: 15))
                        .foregroundStyle(isInQueue ? Color.mgGold : inactiveColor)

                    Text("Add to list")
                        .font(.mgCaption)
                        .fontWeight(isInQueue ? .semibold : .regular)
                        .foregroundStyle(isInQueue ? Color.mgGold : inactiveColor)
                }
                .frame(minHeight: 36)
                .padding(.horizontal, 10)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(
                            isInQueue ? Color.mgGold : borderColor,
                            lineWidth: isInQueue ? 2 : 1
                        )
                )
                .mgShadowSubtle()
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isInQueue ? "Add to list - queued" : "Add to list")
            .accessibilityHint("Add movies to your watch list")
            .accessibilityValue(isInQueue ? "Queued" : "Not queued")
        }
    }

    private var isLoved: Bool {
        favorites.isLoved(movie.id)
    }

    private var isInQueue: Bool {
        favorites.isInQueue(movie.id) && favorites.isQueueActive(movie.id)
    }

    // MARK: - Action Handlers

    private func handleLovedTap() {
        favorites.toggleLoved(movie)
    }

    private func handleQueueTap() {
        favorites.toggleQueue(movie)
    }
}

#Preview {
    VStack(spacing: 20) {
        FavoriteButtons(
            tmdbId: 153,
            title: "Lost in Translation",
            year: 2003,
            posterUrl: nil
        )
    }
    .padding()
}
