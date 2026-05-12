//
//  MovieDetailView.swift
//  moviegenius
//
//  Movie detail view with poster, WhyWatch, and More Ideas
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
                if let movieResponse = viewModel.movieResponse {
                    // Poster with trailer overlay
                    MoviePosterView(
                        posterUrl: movieResponse.movie.posterUrl,
                        trailerUrl: movieResponse.movie.trailerUrl
                    )

                    // WhyWatch section
                    if let whyWatch = movieResponse.whyWatch {
                        WhyWatchView(whyWatch: whyWatch)
                    }

                    // Favorite action buttons
                    FavoriteButtons(
                        tmdbId: movieResponse.movie.tmdbId,
                        title: movieResponse.movie.title,
                        year: movieResponse.movie.year,
                        posterUrl: movieResponse.movie.posterUrl,
                        slug: movieResponse.movie.slug,
                        compact: false
                    )
                    .padding(.horizontal, .mgSpacing20)
                    .padding(.vertical, .mgSpacing16)

                    // More Ideas section
                    if let moreIdeas = movieResponse.moreIdeas, !moreIdeas.isEmpty {
                        MoreIdeasView(moreIdeas: moreIdeas)
                    }
                } else if viewModel.isLoading {
                    VStack(spacing: .mgSpacing16) {
                        ProgressView()
                            .tint(Color.mgGold)
                        Text("Loading...")
                            .font(.mgCallout)
                            .foregroundStyle(Color.mgSecondary)
                    }
                    .padding()
                    .padding(.top, 100)
                } else if let error = viewModel.error {
                    VStack(spacing: .mgSpacing16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48))
                            .foregroundStyle(.red)
                        Text("Failed to load movie")
                            .font(.mgHeadline)
                        Text(error.localizedDescription)
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, .mgSpacing32)
                        Button("Retry") {
                            Task {
                                await viewModel.loadMovie()
                            }
                        }
                        .buttonStyle(MGPrimaryButtonStyle())
                    }
                    .padding()
                    .padding(.top, 100)
                }
            }
        }
        .scrollIndicators(.hidden)
        .background(Color.mgBackground)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadMovie()
        }
    }
}

#Preview {
    NavigationStack {
        MovieDetailView(tmdbId: 153)
    }
}
