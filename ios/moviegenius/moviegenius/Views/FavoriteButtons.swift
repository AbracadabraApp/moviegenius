//
//  FavoriteButtons.swift
//  moviegenius
//
//  Reusable favorite action buttons (Seen/Add) with lazy sign-in
//

import SwiftUI

struct FavoriteButtons: View {
    let movie: SavedMovie
    let compact: Bool
    let onDarkBackground: Bool
    @ObservedObject var favorites = FavoritesManager.shared

    init(tmdbId: Int, title: String, year: Int?, posterUrl: String?, slug: String? = nil, compact: Bool = false, onDarkBackground: Bool = false) {
        self.movie = SavedMovie(
            id: tmdbId,
            title: title,
            year: year,
            posterUrl: posterUrl,
            slug: slug
        )
        self.compact = compact
        self.onDarkBackground = onDarkBackground
    }

    // Dynamic colors based on background
    private var inactiveColor: Color {
        onDarkBackground ? .white : Color.mgPrimary
    }

    private var borderColor: Color {
        onDarkBackground ? Color.white.opacity(0.3) : Color.mgSecondary.opacity(0.3)
    }

    var body: some View {
        HStack(spacing: compact ? .mgSpacing8 : .mgSpacing12) {
            // Seen button - Glass capsule with circle icon
            Button(action: {
                HapticManager.selection()
                handleLovedTap()
            }) {
                HStack(spacing: 5) {
                    Image(systemName: isLoved ? "checkmark.circle.fill" : "checkmark.circle")
                        .font(.system(size: compact ? 14 : 15))
                        .foregroundStyle(isLoved ? Color.mgGold : inactiveColor)

                    if !compact {
                        Text("Seen it")
                            .font(.mgCaption)
                            .fontWeight(isLoved ? .semibold : .regular)
                            .foregroundStyle(isLoved ? Color.mgGold : inactiveColor)
                    }
                }
                .frame(minHeight: compact ? 30 : 36)
                .padding(.horizontal, compact ? 8 : 10)
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

            // Add button - Glass capsule with circle icon
            Button(action: {
                HapticManager.selection()
                handleQueueTap()
            }) {
                HStack(spacing: 5) {
                    Image(systemName: isInQueue ? "plus.circle.fill" : "plus.circle")
                        .font(.system(size: compact ? 14 : 15))
                        .foregroundStyle(isInQueue ? Color.mgGold : inactiveColor)

                    if !compact {
                        Text("Add to list")
                            .font(.mgCaption)
                            .fontWeight(isInQueue ? .semibold : .regular)
                            .foregroundStyle(isInQueue ? Color.mgGold : inactiveColor)
                    }
                }
                .frame(minHeight: compact ? 30 : 36)
                .padding(.horizontal, compact ? 8 : 10)
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
        favorites.isInQueue(movie.id)
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
            posterUrl: nil,
            compact: false
        )

        FavoriteButtons(
            tmdbId: 153,
            title: "Lost in Translation",
            year: 2003,
            posterUrl: nil,
            compact: true
        )
    }
    .padding()
}
