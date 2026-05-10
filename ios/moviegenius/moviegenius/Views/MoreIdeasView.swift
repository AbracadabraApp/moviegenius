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
        VStack(alignment: .leading, spacing: 4) {
            Text(idea.title)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(2)

            Text(String(idea.year))
                .font(.caption)
                .foregroundColor(.secondary)

            Text(idea.connection)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(3)
        }
        .frame(width: 125)
        .padding(8)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(8)
    }
}

#Preview {
    MoreIdeasView(moreIdeas: [
        MoreIdea(tmdbId: 152601, title: "Her", year: 2013, connection: "Spike Jonze's film about loneliness in modern Tokyo"),
        MoreIdea(tmdbId: 76, title: "Before Sunrise", year: 1995, connection: "Two strangers form deep connection in foreign city"),
        MoreIdea(tmdbId: 39210, title: "Somewhere", year: 2010, connection: "Sofia Coppola film about Hollywood actor's emptiness")
    ])
}
