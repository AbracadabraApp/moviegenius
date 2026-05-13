//
//  CollectionCarousel.swift
//  moviegenius
//
//  Horizontal scrolling carousel of movies (Netflix-style)
//

import SwiftUI

struct CollectionCarousel: View {
    let collection: Collection

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Category badge (if exists)
            if let category = collection.categories?.first {
                HStack {
                    Text(category.uppercased())
                        .font(.mgCaption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.black)
                        .padding(.horizontal, .mgSpacing8 + 2)
                        .padding(.vertical, .mgSpacing4 - 1)
                        .background(Color.mgGold)
                        .clipShape(RoundedRectangle(cornerRadius: .mgCornerTiny, style: .continuous))
                        .kerning(0.5)
                }
                .padding(.horizontal, .mgSpacing16)
                .padding(.bottom, .mgSpacing4)
            }

            // Title
            Text(collection.title)
                .font(.mgHeadline)
                .padding(.horizontal, .mgSpacing16)
                .padding(.bottom, .mgSpacing8)

            // Horizontal scrolling movies
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: .mgSpacing8) {
                    ForEach(collection.movies) { movie in
                        NavigationLink(destination: MovieDetailView(tmdbId: movie.tmdbId)) {
                            MoviePosterCard(movie: movie)
                        }
                        .buttonStyle(MGCardButtonStyle())
                        .sensoryFeedback(.selection, trigger: movie.tmdbId)
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("\(movie.title), \(movie.year ?? 0)")
                        .accessibilityHint("View movie details")
                    }
                }
                .padding(.horizontal, .mgSpacing16)
            }
            .scrollClipDisabled()
            .padding(.bottom, .mgSpacing4)

            // View All - below carousel, right-aligned
            HStack {
                Spacer()
                NavigationLink(destination: CollectionDetailView(collectionId: collection.id)) {
                    Text("View All →")
                        .font(.mgCallout)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.mgGold)
                }
                .sensoryFeedback(.selection, trigger: collection.id)
            }
            .padding(.top, .mgSpacing2)
            .padding(.horizontal, .mgSpacing16)
            .padding(.bottom, .mgSpacing8)
        }
        .padding(.bottom, .mgSpacing4)
    }
}

struct MoviePosterCard: View {
    let movie: CollectionMovie
    @State private var imageLoaded = false

    var body: some View {
        // Poster only - title visible in poster art
        AsyncImage(url: posterURL) { phase in
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
                    .opacity(imageLoaded ? 1 : 0)
                    .onAppear {
                        withAnimation(.easeIn(duration: 0.3)) {
                            imageLoaded = true
                        }
                    }
            case .failure:
                posterPlaceholder
            @unknown default:
                posterPlaceholder
            }
        }
        .frame(width: 170, height: 227)
        .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
        .shadow(color: .black.opacity(0.15), radius: 6, x: 0, y: 3)
    }

    private var posterURL: URL? {
        guard let posterUrl = movie.posterUrl else { return nil }
        return URL(string: posterUrl)
    }

    private var posterPlaceholder: some View {
        RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
            .fill(Color.mgSecondary.opacity(0.15))
            .overlay(
                Image(systemName: "film")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.mgTertiary)
            )
            .contentShape(Rectangle())
    }
}
