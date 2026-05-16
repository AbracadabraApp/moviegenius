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
                        StandardMovieCard(
                            tmdbId: tmdbId,
                            title: idea.title,
                            year: idea.year,
                            posterUrl: idea.posterUrl,
                            slug: idea.connection,
                            onDarkBackground: false
                        )
                        .padding(.horizontal, .mgSpacing20)
                    }
                }
            }
        }
        .padding(.vertical, .mgSpacing12)
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
