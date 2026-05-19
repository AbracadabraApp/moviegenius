//
//  StandardMovieCard.swift
//  moviegenius
//
//  Standard movie card format used throughout the app
//  - 140×210 poster on left
//  - Title with year (tight spacing)
//  - Optional slug/description text
//  - Favorite buttons in top-right corner
//  - Compact vertical spacing
//

import SwiftUI

struct StandardMovieCard: View {
    let tmdbId: Int
    let title: String
    let year: Int?
    let posterUrl: String?
    let slug: String?
    let onDarkBackground: Bool
    let onDelete: (() -> Void)?

    init(
        tmdbId: Int,
        title: String,
        year: Int? = nil,
        posterUrl: String? = nil,
        slug: String? = nil,
        onDarkBackground: Bool = false,
        onDelete: (() -> Void)? = nil
    ) {
        self.tmdbId = tmdbId
        self.title = title
        self.year = year
        self.posterUrl = posterUrl
        self.slug = slug
        self.onDarkBackground = onDarkBackground
        self.onDelete = onDelete
    }

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing12) {
            // Main content area - tappable for navigation
            NavigationLink(value: MovieDestination.detail(tmdbId: tmdbId)) {
                HStack(alignment: .top, spacing: .mgSpacing16) {
                    // Poster (left side)
                    posterView

                    // Content (right side)
                    VStack(alignment: .leading, spacing: 0) {
                        // Title + Year
                        VStack(alignment: .leading, spacing: .mgSpacing4) {
                            Text(title)
                                .font(.mgHeadline)
                                .foregroundStyle(Color.mgPrimary)
                                .lineLimit(nil)
                                .fixedSize(horizontal: false, vertical: true)

                            if let year = year {
                                Text(String(year))
                                    .font(.mgCaption)
                                    .foregroundStyle(Color.mgSecondary)
                            }
                        }

                        // Slug/description (if exists)
                        if let slug = slug {
                            Text(slug)
                                .font(.mgSubheadline)
                                .foregroundStyle(Color.mgPrimary)
                                .lineLimit(nil)
                                .fixedSize(horizontal: false, vertical: true)
                                .padding(.top, .mgSpacing8)
                        }

                        Spacer()
                    }
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                }
                .frame(minHeight: 210) // Ensure content area is at least as tall as poster
            }
            .buttonStyle(.plain)

            // Favorite buttons with optional delete button - below all content
            HStack(spacing: .mgSpacing12) {
                // Favorite buttons
                FavoriteButtons(
                    tmdbId: tmdbId,
                    title: title,
                    year: year,
                    posterUrl: posterUrl,
                    slug: slug,
                    onDarkBackground: onDarkBackground
                )

                Spacer()

                // Delete button (when provided, appears at far right)
                if let onDelete = onDelete {
                    Button(action: {
                        HapticManager.light()
                        onDelete()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(Color.mgSecondary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Remove from queue")
                }
            }
        }
        .padding(.mgSpacing16)
        .background {
            RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                .fill(.regularMaterial)
        }
        .mgShadowMedium()
    }

    private var posterView: some View {
        Group {
            if let posterUrl = posterUrl, let url = URL(string: posterUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        posterPlaceholder
                            .overlay {
                                ProgressView()
                                    .tint(Color.mgGold)
                            }
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(2/3, contentMode: .fill)
                    case .failure:
                        posterPlaceholder
                    @unknown default:
                        posterPlaceholder
                    }
                }
            } else {
                posterPlaceholder
            }
        }
        .frame(width: 140, height: 210)
        .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
        .mgCinematicGlow()
        .mgElevationLow()
    }

    private var posterPlaceholder: some View {
        RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
            .fill(Color.mgSecondary.opacity(0.15))
            .overlay(
                VStack(spacing: .mgSpacing4) {
                    Image(systemName: "film")
                        .font(.system(size: 32))
                        .foregroundStyle(Color.mgSecondary)
                    if let year = year {
                        Text(String(year))
                            .font(.mgCaption2)
                            .foregroundStyle(Color.mgTertiary)
                    }
                }
            )
    }
}

#Preview("With Slug") {
    ScrollView {
        VStack(spacing: .mgSpacing16) {
            StandardMovieCard(
                tmdbId: 152601,
                title: "Her",
                year: 2013,
                posterUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
                slug: "Spike Jonze's film about loneliness in modern Tokyo, with similar themes of isolation and connection"
            )

            StandardMovieCard(
                tmdbId: 76,
                title: "Before Sunrise",
                year: 1995,
                posterUrl: "https://image.tmdb.org/t/p/w500/4RlHr2K5wddUcqhbycROdTNb64I.jpg",
                slug: "Two strangers form a deep connection in a foreign city over a brief encounter"
            )
        }
        .padding(.mgSpacing20)
    }
    .background(Color.mgBackground)
}

#Preview("Without Slug") {
    ScrollView {
        VStack(spacing: .mgSpacing16) {
            StandardMovieCard(
                tmdbId: 152601,
                title: "Her",
                year: 2013,
                posterUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg"
            )

            StandardMovieCard(
                tmdbId: 76,
                title: "The Before Trilogy Collection",
                year: 1995
            )
        }
        .padding(.mgSpacing20)
    }
    .background(Color.mgBackground)
}

#Preview("Long Title") {
    ScrollView {
        StandardMovieCard(
            tmdbId: 76,
            title: "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb",
            year: 1964,
            posterUrl: "https://image.tmdb.org/t/p/w500/7Z8HaYgamLOzufQ5iRYIPLHp1Py.jpg",
            slug: "Stanley Kubrick's dark satire about nuclear war and Cold War tensions between the US and Soviet Union"
        )
        .padding(.mgSpacing20)
    }
    .background(Color.mgBackground)
}
