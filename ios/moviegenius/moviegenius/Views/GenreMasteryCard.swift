//
//  GenreMasteryCard.swift
//  moviegenius
//
//  Genre expertise progress card with rank and progress bar
//

import SwiftUI

struct GenreMasteryCard: View {
    let genre: GenreExpertise

    var body: some View {
        LayeredGlassCard(elevation: .low) {
            VStack(alignment: .leading, spacing: .mgSpacing12) {
                // Header with rank icon
                HStack(alignment: .top, spacing: .mgSpacing12) {
                    // Rank icon
                    Image(systemName: genre.rank.icon)
                        .font(.system(size: 24))
                        .foregroundStyle(genre.rank.color)
                        .frame(width: 32, height: 32)

                    VStack(alignment: .leading, spacing: .mgSpacing4) {
                        // Genre name
                        Text(genre.name)
                            .font(.mgHeadline)
                            .foregroundStyle(Color.mgPrimary)
                            .lineLimit(nil)
                            .fixedSize(horizontal: false, vertical: true)

                        // Category badge
                        if let category = genre.category {
                            Text(category.uppercased())
                                .font(.mgCaption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(Color.mgBadgeTextOnGold)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.mgGold)
                                .clipShape(RoundedRectangle(cornerRadius: .mgCornerTiny))
                                .kerning(0.3)
                        }
                    }

                    Spacer()

                    // Chevron
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.mgSecondary)
                }

                // Progress section
                VStack(alignment: .leading, spacing: .mgSpacing6) {
                    // Progress bar
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            // Background
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.mgSecondary.opacity(0.15))
                                .frame(height: 8)

                            // Fill
                            RoundedRectangle(cornerRadius: 4)
                                .fill(
                                    LinearGradient(
                                        colors: [genre.rank.color, genre.rank.color.opacity(0.7)],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .frame(width: geometry.size.width * genre.progress, height: 8)
                        }
                    }
                    .frame(height: 8)

                    // Progress text
                    HStack {
                        HStack(spacing: .mgSpacing4) {
                            Text(genre.rank.title)
                                .font(.mgCaption)
                                .fontWeight(.semibold)
                                .foregroundStyle(genre.rank.color)

                            if let next = genre.nextRank, let remaining = genre.filmsToNextRank {
                                Text("·")
                                    .foregroundStyle(Color.mgSecondary)
                                Text("\(remaining) to \(next.title)")
                                    .font(.mgCaption)
                                    .foregroundStyle(Color.mgSecondary)
                            }
                        }

                        Spacer()

                        Text("\(genre.seenCount)/\(min(genre.totalFilms, 10))")
                            .font(.mgCaption)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.mgSecondary)
                    }
                }
            }
        }
    }
}

#Preview {
    VStack(spacing: .mgSpacing12) {
        GenreMasteryCard(
            genre: GenreExpertise(
                id: "1",
                name: "Film Noir",
                category: "Genre",
                totalFilms: 45,
                seenCount: 8
            )
        )

        GenreMasteryCard(
            genre: GenreExpertise(
                id: "2",
                name: "French New Wave",
                category: "Movement",
                totalFilms: 30,
                seenCount: 3
            )
        )

        GenreMasteryCard(
            genre: GenreExpertise(
                id: "3",
                name: "Classic Western",
                category: "Genre",
                totalFilms: 50,
                seenCount: 12
            )
        )
    }
    .padding()
    .background(Color.mgGroupedBackground)
}
