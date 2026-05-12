//
//  FavoriteButtons.swift
//  moviegenius
//
//  Reusable favorite action buttons (Seen/Add) matching web UX
//

import SwiftUI

struct FavoriteButtons: View {
    let movie: SavedMovie
    let compact: Bool
    @ObservedObject var favorites = FavoritesManager.shared

    init(tmdbId: Int, title: String, year: Int?, posterUrl: String?, slug: String? = nil, compact: Bool = false) {
        self.movie = SavedMovie(
            id: tmdbId,
            title: title,
            year: year,
            posterUrl: posterUrl,
            slug: slug
        )
        self.compact = compact
    }

    var body: some View {
        HStack(spacing: compact ? .mgSpacing8 : .mgSpacing16) {
            // Seen button (Check icon)
            Button(action: {
                HapticManager.selection()
                favorites.toggleLoved(movie)
            }) {
                HStack(spacing: compact ? 4 : 6) {
                    Image(systemName: "checkmark")
                        .font(.system(size: compact ? 14 : 16, weight: isLoved ? .bold : .regular))
                        .foregroundStyle(isLoved ? Color.mgPrimary : Color.mgSecondary)

                    if !compact {
                        Text("Seen")
                            .font(isLoved ? .mgCallout.weight(.bold) : .mgCallout)
                            .foregroundStyle(isLoved ? Color.mgPrimary : Color.mgSecondary)
                    }
                }
                .padding(.horizontal, compact ? 8 : 12)
                .padding(.vertical, compact ? 6 : 8)
                .background(
                    isLoved ?
                        Color.mgGold.opacity(0.15) :
                        Color.mgSecondary.opacity(0.1)
                )
                .clipShape(RoundedRectangle(cornerRadius: compact ? 6 : 8, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isLoved ? "Marked as seen" : "Mark as seen")
            .accessibilityHint("Toggles whether you've seen this movie")
            .accessibilityValue(isLoved ? "Loved" : "Not marked")

            // Add button (Plus icon)
            Button(action: {
                HapticManager.selection()
                favorites.toggleQueue(movie)
            }) {
                HStack(spacing: compact ? 4 : 6) {
                    Image(systemName: "plus")
                        .font(.system(size: compact ? 14 : 16, weight: isInQueue ? .bold : .regular))
                        .foregroundStyle(isInQueue ? Color.mgPrimary : Color.mgSecondary)

                    if !compact {
                        Text("Add")
                            .font(isInQueue ? .mgCallout.weight(.bold) : .mgCallout)
                            .foregroundStyle(isInQueue ? Color.mgPrimary : Color.mgSecondary)
                    }
                }
                .padding(.horizontal, compact ? 8 : 12)
                .padding(.vertical, compact ? 6 : 8)
                .background(
                    isInQueue ?
                        Color.mgGold.opacity(0.15) :
                        Color.mgSecondary.opacity(0.1)
                )
                .clipShape(RoundedRectangle(cornerRadius: compact ? 6 : 8, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isInQueue ? "In queue" : "Add to queue")
            .accessibilityHint("Toggles whether this movie is in your watch queue")
            .accessibilityValue(isInQueue ? "Added" : "Not added")
        }
    }

    private var isLoved: Bool {
        favorites.isLoved(movie.id)
    }

    private var isInQueue: Bool {
        favorites.isInQueue(movie.id)
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
