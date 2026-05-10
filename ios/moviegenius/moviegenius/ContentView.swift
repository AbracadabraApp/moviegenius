//
//  ContentView.swift
//  moviegenius
//
//  Main movie detail view - testing with Lost in Translation (tmdbId: 153)
//

import SwiftUI

struct ContentView: View {
    let tmdbId: Int = 153  // Lost in Translation
    @StateObject private var viewModel: MovieDetailViewModel

    init() {
        _viewModel = StateObject(wrappedValue: MovieDetailViewModel(tmdbId: 153))
    }

    var body: some View {
        let _ = print("🎬 [ContentView] Rendering - hasData: \(viewModel.movieResponse != nil), isLoading: \(viewModel.isLoading), hasError: \(viewModel.error != nil)")

        ScrollView {
            VStack(spacing: 0) {
                if let movieResponse = viewModel.movieResponse {
                    let _ = print("🎬 [ContentView] Showing movie data for: \(movieResponse.movie.title)")
                    // Search bar placeholder
                    SearchBarPlaceholder()

                    // Poster with trailer button
                    MoviePosterView(
                        posterUrl: movieResponse.movie.posterUrl,
                        trailerUrl: movieResponse.movie.trailerUrl
                    )

                    // WhyWatch section
                    if let whyWatch = movieResponse.whyWatch {
                        WhyWatchView(whyWatch: whyWatch)
                    }

                    // Action buttons placeholder
                    ActionButtonsPlaceholder()

                    // More Ideas section
                    if let moreIdeas = movieResponse.moreIdeas, !moreIdeas.isEmpty {
                        MoreIdeasView(moreIdeas: moreIdeas)
                    }
                } else if viewModel.isLoading {
                    ProgressView("Loading...")
                        .padding()
                } else if let error = viewModel.error {
                    let _ = print("🎬 [ContentView] Showing error: \(error.localizedDescription)")
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48))
                            .foregroundColor(.red)
                        Text("Failed to load movie")
                            .font(.headline)
                        Text(error.localizedDescription)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Button("Retry") {
                            Task {
                                await viewModel.loadMovie()
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .frame(maxWidth: 390)
        .task {
            await viewModel.loadMovie()
        }
    }
}

// Placeholder components
struct SearchBarPlaceholder: View {
    var body: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.2))
            .frame(height: 44)
            .overlay(
                Text("Search placeholder")
                    .foregroundColor(.secondary)
            )
    }
}

struct ActionButtonsPlaceholder: View {
    var body: some View {
        HStack(spacing: 20) {
            Button(action: {}) {
                VStack {
                    Image(systemName: "checkmark.circle")
                    Text("Seen")
                        .font(.caption)
                }
            }
            Button(action: {}) {
                VStack {
                    Image(systemName: "plus.circle")
                    Text("Add")
                        .font(.caption)
                }
            }
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
