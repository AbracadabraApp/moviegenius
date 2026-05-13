//
//  MoreIdeasView.swift
//  moviegenius
//
//  Vertical feed with rich cards showing posters and connection slugs
//

import SwiftUI

struct MoreIdeasView: View {
    let moreIdeas: [MoreIdea]

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing16) {
            // Section header
            Text("More Ideas")
                .font(.mgTitle2)
                .padding(.horizontal, .mgSpacing20)
                .padding(.top, .mgSpacing8)

            // Vertical scrolling cards - use LazyVStack for proper height calculation
            LazyVStack(spacing: .mgSpacing16) {
                ForEach(moreIdeas) { idea in
                    if let tmdbId = idea.tmdbId {
                        NavigationLink(destination: MovieDetailView(tmdbId: tmdbId)) {
                            MoreIdeaCard(idea: idea)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, .mgSpacing20)
                    } else {
                        MoreIdeaCard(idea: idea)
                            .padding(.horizontal, .mgSpacing20)
                    }
                }
            }
        }
        .padding(.vertical, .mgSpacing12)
    }
}

struct MoreIdeaCard: View {
    let idea: MoreIdea

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: .mgSpacing16) {
                // Poster (left side)
                Group {
                    if let posterURL = posterURL {
                        AsyncImage(url: posterURL) { phase in
                            switch phase {
                            case .empty:
                                posterPlaceholder
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

                // Content (right side)
                VStack(alignment: .leading, spacing: .mgSpacing8) {
                    // Title
                    Text(idea.title)
                        .font(.mgHeadline)
                        .foregroundStyle(Color.mgPrimary)

                    // Connection slug (full text, no truncation)
                    Text(idea.connection)
                        .font(.mgSubheadline)
                        .foregroundStyle(Color.mgSecondary)
                        .lineLimit(nil)
                        .fixedSize(horizontal: false, vertical: true)

                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: 210, alignment: .topLeading)
            }

            // Favorite buttons (bottom-right of card)
            if let tmdbId = idea.tmdbId {
                HStack {
                    Spacer()
                    FavoriteButtons(
                        tmdbId: tmdbId,
                        title: idea.title,
                        year: idea.year,
                        posterUrl: idea.posterUrl,
                        slug: nil,
                        compact: false,
                        onDarkBackground: false
                    )
                }
                .padding(.top, .mgSpacing8)
            }
        }
        .padding(.mgSpacing12)
        .background {
            RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                .fill(Color.mgBackground)
                .shadow(
                    color: .black.opacity(0.08),
                    radius: 8,
                    x: 0,
                    y: 4
                )
        }
    }

    private var posterURL: URL? {
        // If API provides poster_url, use it
        if let posterUrl = idea.posterUrl {
            return URL(string: posterUrl)
        }

        // Otherwise, fetch from TMDB using movie ID
        guard let tmdbId = idea.tmdbId else { return nil }
        return URL(string: "https://moviegenius.ai/api/poster/\(tmdbId)")
    }

    private var posterPlaceholder: some View {
        RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
            .fill(Color.mgSecondary.opacity(0.15))
            .overlay(
                Image(systemName: "film")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.mgSecondary)
            )
    }
}

#Preview {
    ScrollView {
        MoreIdeasView(moreIdeas: [
            MoreIdea(
                tmdbId: 152601,
                title: "Her",
                year: 2013,
                connection: "Spike Jonze's film about loneliness in modern Tokyo, with similar themes of isolation and connection",
                posterUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg"
            ),
            MoreIdea(
                tmdbId: 76,
                title: "Before Sunrise",
                year: 1995,
                connection: "Two strangers form a deep connection in a foreign city over a brief encounter",
                posterUrl: "https://image.tmdb.org/t/p/w500/4RlHr2K5wddUcqhbycROdTNb64I.jpg"
            ),
            MoreIdea(
                tmdbId: 39210,
                title: "Somewhere",
                year: 2010,
                connection: "Sofia Coppola film about a Hollywood actor confronting emptiness and searching for meaning",
                posterUrl: "https://image.tmdb.org/t/p/w500/kx1X3YXBXoSjBpLqJsCSQ6lHo0T.jpg"
            )
        ])
    }
    .background(Color(.systemGroupedBackground))
}
