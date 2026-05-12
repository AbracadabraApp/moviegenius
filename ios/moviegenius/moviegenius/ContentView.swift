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
        ScrollView {
            VStack(spacing: 0) {
                if let movieResponse = viewModel.movieResponse {
                    // Search bar
                    SearchBarView()

                    // Poster with trailer and favorite buttons overlay
                    MoviePosterView(
                        posterUrl: movieResponse.movie.posterUrl,
                        trailerUrl: movieResponse.movie.trailerUrl,
                        tmdbId: movieResponse.movie.tmdbId,
                        title: movieResponse.movie.title,
                        year: movieResponse.movie.year,
                        slug: movieResponse.movie.slug
                    )

                    // WhyWatch section
                    if let whyWatch = movieResponse.whyWatch {
                        WhyWatchView(
                            whyWatch: whyWatch,
                            tmdbId: movieResponse.movie.tmdbId,
                            title: movieResponse.movie.title,
                            year: movieResponse.movie.year,
                            posterUrl: movieResponse.movie.posterUrl,
                            slug: movieResponse.movie.slug
                        )
                    }

                    // More Ideas section
                    if let moreIdeas = movieResponse.moreIdeas, !moreIdeas.isEmpty {
                        MoreIdeasView(moreIdeas: moreIdeas)
                    }
                } else if viewModel.isLoading {
                    ProgressView("Loading...")
                        .padding()
                } else if let error = viewModel.error {
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

#Preview {
    ContentView()
}
