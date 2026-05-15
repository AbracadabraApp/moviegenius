//
//  WatchQueueView.swift
//  moviegenius
//
//  Watch Queue - vertical list of movies marked "Watch it"
//

import SwiftUI

struct WatchQueueView: View {
    @StateObject private var viewModel = WatchQueueViewModel()
    @State private var selectedTrailer: (tmdbId: Int, title: String, year: Int?)?

    var body: some View {
        ScrollView {
            if viewModel.queuedMovies.isEmpty {
                emptyStateView
            } else {
                LazyVStack(spacing: .mgSpacing16) {
                    ForEach(viewModel.queuedMovies) { movie in
                        WatchQueueCard(
                            movie: movie,
                            onPlayTrailer: {
                                selectedTrailer = (movie.id, movie.title, movie.year)
                            }
                        )
                        .padding(.horizontal, .mgSpacing20)
                    }
                }
                .padding(.vertical, .mgSpacing20)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Watch Queue")
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            viewModel.refresh()
        }
        .sheet(item: Binding(
            get: { selectedTrailer.map { TrailerIdentifier(tmdbId: $0.tmdbId, title: $0.title, year: $0.year) } },
            set: { selectedTrailer = $0.map { ($0.tmdbId, $0.title, $0.year) } }
        )) { identifier in
            TrailerView(tmdbId: identifier.tmdbId, movieTitle: identifier.title, movieYear: identifier.year)
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: .mgSpacing20) {
            Spacer()

            Image(systemName: "play.rectangle")
                .font(.system(size: 64))
                .foregroundStyle(Color.mgSecondary)

            Text("No movies in queue")
                .font(.mgTitle2)
                .foregroundStyle(Color.mgPrimary)

            Text("Tap \"Watch it\" on any movie to add it to your queue")
                .font(.mgBody)
                .foregroundStyle(Color.mgSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, .mgSpacing32)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct WatchQueueCard: View {
    let movie: SavedMovie
    let onPlayTrailer: () -> Void
    @ObservedObject private var favorites = FavoritesManager.shared

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: .mgSpacing16) {
                // Poster (left side)
                NavigationLink(destination: MovieDetailView(tmdbId: movie.id)) {
                    Group {
                        if let posterUrl = movie.posterUrl, let url = URL(string: posterUrl) {
                            AsyncImage(url: url) { phase in
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
                    .frame(width: 100, height: 150)
                    .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
                    .mgCinematicGlow()
                    .mgElevationMedium()
                }

                // Movie info (middle)
                VStack(alignment: .leading, spacing: .mgSpacing8) {
                    Text(movie.title)
                        .font(.mgHeadline)
                        .foregroundStyle(Color.mgPrimary)
                        .lineLimit(2)

                    if let year = movie.year {
                        Text("(\(year))")
                            .font(.mgBody)
                            .foregroundStyle(Color.mgSecondary)
                    }

                    if let slug = movie.slug {
                        Text(slug)
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgTertiary)
                            .lineLimit(1)
                    }

                    Spacer()

                    // Action buttons
                    FavoriteButtons(
                        tmdbId: movie.id,
                        title: movie.title,
                        year: movie.year,
                        posterUrl: movie.posterUrl,
                        slug: movie.slug,
                        compact: false,
                        onDarkBackground: false
                    )
                }

                Spacer()

                // Remove button (top right corner)
                Button {
                    favorites.toggleQueue(movie)
                    HapticManager.light()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.mgSecondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Remove from queue")
            }
        }
        .padding(.mgSpacing16)
        .background {
            RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                .fill(.regularMaterial)
        }
        .mgShadowMedium()
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

// Helper for sheet binding
private struct TrailerIdentifier: Identifiable {
    let id = UUID()
    let tmdbId: Int
    let title: String
    let year: Int?
}

#Preview {
    NavigationStack {
        WatchQueueView()
    }
}
