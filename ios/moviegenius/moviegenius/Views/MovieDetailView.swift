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
            // Main content
            ScrollView {
                VStack(spacing: 0) {
                    // Top spacer for overlaid search bar and back button
                    Color.clear.frame(height: 60)

                    if let movieResponse = viewModel.movieResponse {
                        // Poster with trailer overlay
                        MoviePosterView(
                            posterUrl: movieResponse.movie.posterUrl,
                            trailerUrl: movieResponse.movie.trailerUrl,
                            tmdbId: movieResponse.movie.tmdbId,
                            title: movieResponse.movie.title,
                            year: movieResponse.movie.year,
                            slug: movieResponse.movie.slug
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
                        TMDBAttributionView()
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

            // Overlaid back button and search bar
            VStack(spacing: 0) {
                HStack(spacing: .mgSpacing12) {
                    // Back button
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(Color.mgGold)
                    }

                    // Search bar
                    SearchBarCompact()
                }
                .padding(.horizontal, .mgSpacing16)
                .padding(.top, .mgSpacing8)
                .padding(.bottom, .mgSpacing8)
                .background(Color.mgBackground.opacity(0.95))

                Spacer()
            }
        }
        .background(Color.mgBackground)
        .navigationBarHidden(true)
        .task {
            await viewModel.loadMovie()
        }
    }
}

// MARK: - Compact Search Bar

struct SearchBarCompact: View {
    @State private var showingSearch = false

    var body: some View {
        HStack(spacing: .mgSpacing8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Color.mgSecondary)
                .font(.system(size: 16))

            Text("Search movies...")
                .font(.mgBody)
                .foregroundStyle(Color.mgSecondary)

            Spacer()
        }
        .padding(.horizontal, .mgSpacing12)
        .padding(.vertical, .mgSpacing8)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
                .strokeBorder(Color.mgSecondary.opacity(0.2), lineWidth: 1)
        )
        .onTapGesture {
            showingSearch = true
        }
        .fullScreenCover(isPresented: $showingSearch) {
            NavigationStack {
                SearchView()
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") {
                                showingSearch = false
                            }
                            .foregroundStyle(Color.mgGold)
                        }
                    }
            }
        }
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
