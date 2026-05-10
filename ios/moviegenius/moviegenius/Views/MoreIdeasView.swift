//
//  MoreIdeasView.swift
//  moviegenius
//
//  Horizontal scrolling list of related movies
//

import SwiftUI

struct MoreIdeasView: View {
    let moreIdeas: [MoreIdea]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("More Ideas")
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(moreIdeas) { idea in
                        MoreIdeaCard(idea: idea)
                    }
                }
                .padding(.horizontal)
            }
        }
        .padding(.vertical)
    }
}

struct MoreIdeaCard: View {
    let idea: MoreIdea

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Poster placeholder (will add real posters in Phase 2)
            Rectangle()
                .fill(Color.gray.opacity(0.2))
                .frame(width: 100, height: 150)
                .cornerRadius(4)
                .overlay(
                    VStack(spacing: 4) {
                        Image(systemName: "film")
                            .font(.system(size: 32))
                            .foregroundColor(.gray)
                        Text(String(idea.year))
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                )

            Text(idea.title)
                .font(.caption)
                .fontWeight(.medium)
                .lineLimit(2)
                .frame(width: 100, alignment: .leading)
        }
    }
}

#Preview {
    MoreIdeasView(moreIdeas: [
        MoreIdea(tmdbId: 152601, title: "Her", year: 2013, connection: "Spike Jonze's film about loneliness in modern Tokyo"),
        MoreIdea(tmdbId: 76, title: "Before Sunrise", year: 1995, connection: "Two strangers form deep connection in foreign city"),
        MoreIdea(tmdbId: 39210, title: "Somewhere", year: 2010, connection: "Sofia Coppola film about Hollywood actor's emptiness")
    ])
}
