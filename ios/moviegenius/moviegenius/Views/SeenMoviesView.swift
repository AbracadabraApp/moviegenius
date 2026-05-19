//
//  SeenMoviesView.swift
//  moviegenius
//
//  Seen Movies - vertical list of movies marked "Seen it"
//

import SwiftUI

struct SeenMoviesView: View {
    @StateObject private var viewModel = SeenMoviesViewModel()
    @State private var selectedTrailer: (tmdbId: Int, title: String, year: Int?)?

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if viewModel.seenMovies.isEmpty {
                    emptyStateView
                } else {
                    LazyVStack(spacing: .mgSpacing16) {
                        ForEach(viewModel.seenMovies) { movie in
                            StandardMovieCard(
                                tmdbId: movie.id,
                                title: movie.title,
                                year: movie.year,
                                posterUrl: movie.posterUrl,
                                slug: movie.slug,
                                onDarkBackground: false,
                                onDelete: {
                                    viewModel.removeFromSeen(movie)
                                }
                            )
                            .padding(.horizontal, .mgSpacing20)
                        }
                    }
                    .padding(.vertical, .mgSpacing20)
                }
            }
        }
        .refreshable {
            viewModel.refresh()
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: .mgSpacing20) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(Color.mgGold)

            Text("No movies marked as seen")
                .font(.mgTitle2)
                .foregroundStyle(Color.mgPrimary)

            Text("Tap \"Seen it\" on any movie to track what you've watched")
                .font(.mgBody)
                .foregroundStyle(Color.mgSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, .mgSpacing32)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    NavigationStack {
        SeenMoviesView()
    }
}
