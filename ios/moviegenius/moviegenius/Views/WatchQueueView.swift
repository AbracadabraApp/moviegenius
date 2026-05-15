//
//  WatchQueueView.swift
//  moviegenius
//
//  Watch Queue - vertical list of movies marked "Add to list"
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
                            },
                            onRemove: {
                                viewModel.removeFromQueue(movie)
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

            Text("Tap \"Add to list\" on any movie to add it to your queue")
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
    let onRemove: () -> Void
    @ObservedObject private var favorites = FavoritesManager.shared

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: .mgSpacing16) {
                // Poster (left side) - More Ideas size
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
                    .frame(width: 140, height: 210)
                    .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
                    .mgCinematicGlow()
                    .mgElevationLow()
                }

                // Content (right side)
                VStack(alignment: .leading, spacing: .mgSpacing8) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: .mgSpacing8) {
                            // Title
                            Text(movie.title)
                                .font(.mgHeadline)
                                .foregroundStyle(Color.mgPrimary)

                            // Slug (full text, no truncation)
                            if let slug = movie.slug {
                                Text(slug)
                                    .font(.mgSubheadline)
                                    .foregroundStyle(Color.mgPrimary)
                                    .lineLimit(nil)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }

                        Spacer()

                        // Delete button (top-right)
                        Button {
                            onRemove()
                            HapticManager.light()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 24))
                                .foregroundStyle(Color.mgSecondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Remove from queue")
                    }

                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: 210, alignment: .topLeading)
            }

            // Favorite buttons (bottom-right of card)
            HStack {
                Spacer()
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
            .padding(.top, .mgSpacing12)
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
