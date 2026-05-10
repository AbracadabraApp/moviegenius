//
//  MoreIdeasView_V2.swift
//  moviegenius
//
//  Vertical feed with rich cards (matches web quality)
//

import SwiftUI

struct MoreIdeasView: View {
    let moreIdeas: [MoreIdea]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section header
            Text("More Ideas")
                .font(.title2)
                .fontWeight(.bold)
                .padding(.horizontal, 20)
                .padding(.top, 8)

            // Vertical scrolling cards
            VStack(spacing: 16) {
                ForEach(moreIdeas) { idea in
                    MoreIdeaCard(idea: idea)
                        .padding(.horizontal, 20)
                }
            }
        }
        .padding(.vertical, 12)
    }
}

struct MoreIdeaCard: View {
    let idea: MoreIdea
    @State private var isPressed = false

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // Poster (left side)
            AsyncImage(url: posterURL) { phase in
                switch phase {
                case .empty:
                    posterPlaceholder
                        .overlay(ProgressView())
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(2/3, contentMode: .fill)
                case .failure:
                    posterPlaceholder
                        .overlay(
                            Image(systemName: "film.stack")
                                .font(.title2)
                                .foregroundStyle(.tertiary)
                        )
                @unknown default:
                    posterPlaceholder
                }
            }
            .frame(width: 90, height: 135)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            // Content (right side)
            VStack(alignment: .leading, spacing: 8) {
                // Title + Year
                VStack(alignment: .leading, spacing: 2) {
                    Text(idea.title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .lineLimit(2)

                    Text(String(idea.year))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                // Connection (the "why" slug)
                Text(idea.connection)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(12)
        .background {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(.background)
                .shadow(
                    color: .black.opacity(0.08),
                    radius: isPressed ? 4 : 8,
                    x: 0,
                    y: isPressed ? 2 : 4
                )
        }
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.easeInOut(duration: 0.15), value: isPressed)
        .onTapGesture {
            // Navigate to movie detail
            if let tmdbId = idea.tmdbId {
                print("Navigate to movie: \(tmdbId)")
            }
        }
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }

    private var posterURL: URL? {
        guard let posterUrl = idea.posterUrl else { return nil }
        return URL(string: posterUrl)
    }

    private var posterPlaceholder: some View {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(Color.gray.opacity(0.15))
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
