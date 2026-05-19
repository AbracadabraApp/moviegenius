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
            VStack(spacing: 0) {
                if viewModel.queuedMovies.isEmpty {
                        emptyStateView
                    } else {
                        LazyVStack(spacing: .mgSpacing16) {
                            ForEach(viewModel.queuedMovies) { movie in
                                StandardMovieCard(
                                    tmdbId: movie.id,
                                    title: movie.title,
                                    year: movie.year,
                                    posterUrl: movie.posterUrl,
                                    slug: movie.slug,
                                    onDarkBackground: false,
                                    onDelete: {
                                        viewModel.removeFromQueue(movie)
                                    }
                                )
                                .padding(.horizontal, .mgSpacing20)
                            }
                        }
                        .padding(.vertical, .mgSpacing20)
                    }
            }
            .refreshable {
                viewModel.refresh()
            }
        }
        .background(Color(.systemGroupedBackground))
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

            Image(systemName: "bookmark.fill")
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

// WatchQueueCard removed - now using StandardMovieCard with onDelete parameter

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
