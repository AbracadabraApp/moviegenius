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
    @Environment(\.dismiss) private var dismiss

    init(tmdbId: Int) {
        self.tmdbId = tmdbId
        _viewModel = StateObject(wrappedValue: MovieDetailViewModel(tmdbId: tmdbId))
    }

    var body: some View {
        ZStack(alignment: .top) {
            ScrollView {
                VStack(spacing: 0) {
                    // Top spacer for overlaid header
                    Color.clear.frame(height: 60)

                    if let movieResponse = viewModel.movieResponse {
                    // Poster with trailer overlay
                    MoviePosterView(
                        posterUrl: movieResponse.movie.posterUrl,
                        tmdbId: movieResponse.movie.tmdbId,
                        title: movieResponse.movie.title,
                        year: movieResponse.movie.year,
                        hasTrailers: viewModel.hasTrailers
                    )

                    // Favorite buttons (below poster, right-aligned)
                    HStack {
                        Spacer()
                        FavoriteButtons(
                            tmdbId: movieResponse.movie.tmdbId,
                            title: movieResponse.movie.title,
                            year: movieResponse.movie.year,
                            posterUrl: movieResponse.movie.posterUrl,
                            slug: movieResponse.movie.slug,
                            compact: false,
                            onDarkBackground: false
                        )
                    }
                    .padding(.horizontal, .mgSpacing20)
                    .padding(.top, .mgSpacing4)
                    .padding(.bottom, .mgSpacing16)

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

                    // TMDB Attribution
                    // TMDBAttributionView()
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
                        .buttonStyle(MGGlassButtonStyle())
                    }
                    .padding()
                    .padding(.top, 100)
                    }
                }
            }
            .scrollIndicators(.hidden)
            .task {
                await viewModel.loadMovie()
            }

            // Overlaid AppHeader
            VStack {
                AppHeader(showBackButton: true)
                Spacer()
            }
        }
        .background(Color.mgBackground)
        .navigationBarHidden(true)
    }
}

// MARK: - TMDB Attribution

struct TMDBAttributionView: View {
    var body: some View {
        VStack(spacing: .mgSpacing12) {
            AsyncImage(url: URL(string: "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_1-8ba2ac31f354005783fab473602c34c3f4fd207150182061e425d366e4f34596.svg")) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(height: 20)
                case .empty, .failure, _:
                    Color.clear.frame(height: 20)
                }
            }

            Text("This product uses the TMDB API but is not endorsed or certified by TMDB")
                .font(.mgCaption)
                .foregroundStyle(Color.mgSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, .mgSpacing20)
        .padding(.vertical, .mgSpacing24)
    }
}

#Preview {
    NavigationStack {
        MovieDetailView(tmdbId: 153)
    }
}
