//
//  MovieDetailView.swift
//  moviegenius
//
//  Main movie detail screen (5 components)
//

import SwiftUI

struct MovieDetailView: View {
    let tmdbId: Int
    @StateObject private var viewModel: MovieDetailViewModel

    init(tmdbId: Int) {
        self.tmdbId = tmdbId
        _viewModel = StateObject(wrappedValue: MovieDetailViewModel(tmdbId: tmdbId))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if let movie = viewModel.movieResponse {
                    // 1. Search bar (placeholder for Phase 2)
                    SearchBarPlaceholder()

                    // 2. Poster with trailer overlay
                    MoviePosterView(
                        posterUrl: movie.movie.posterUrl,
                        trailerUrl: movie.movie.trailerUrl
                    )

                    // 3. WhyWatch section
                    if let whyWatch = movie.whyWatch {
                        WhyWatchView(whyWatch: whyWatch)
                    }

                    // 4. Seen/Add buttons (placeholder for Phase 3)
                    ActionButtonsPlaceholder()

                    // 5. MoreIdeas (hide if null)
                    if let moreIdeas = movie.moreIdeas, !moreIdeas.isEmpty {
                        MoreIdeasView(moreIdeas: moreIdeas)
                    }
                } else if viewModel.isLoading {
                    ProgressView("Loading...")
                        .padding()
                } else if let error = viewModel.error {
                    ErrorView(error: error)
                }
            }
        }
        .frame(maxWidth: 390)  // iPhone target width
        .task {
            await viewModel.loadMovie()
        }
    }
}

// MARK: - Placeholders
struct SearchBarPlaceholder: View {
    var body: some View {
        Rectangle()
            .fill(Color.secondary.opacity(0.1))
            .frame(height: 50)
            .overlay(
                Text("Search (Phase 2)")
                    .foregroundColor(.secondary)
            )
    }
}

struct ActionButtonsPlaceholder: View {
    var body: some View {
        HStack {
            Button("Seen") {}
                .buttonStyle(.bordered)
            Button("Add to List") {}
                .buttonStyle(.bordered)
        }
        .padding()
    }
}

struct ErrorView: View {
    let error: Error

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.red)
            Text("Error Loading Movie")
                .font(.headline)
            Text(error.localizedDescription)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    MovieDetailView(tmdbId: 153)
}
