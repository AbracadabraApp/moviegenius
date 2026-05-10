//
//  MovieDetailViewModel.swift
//  moviegenius
//
//  ViewModel for movie detail screen
//

import Foundation
import Combine

@MainActor
class MovieDetailViewModel: ObservableObject {
    @Published var movieResponse: MovieResponse?
    @Published var isLoading = false
    @Published var error: Error?

    private let tmdbId: Int

    init(tmdbId: Int) {
        self.tmdbId = tmdbId
    }

    func loadMovie() async {
        print("📱 [MovieDetailViewModel] Starting to load movie \(tmdbId)")
        isLoading = true
        error = nil

        do {
            print("📱 [MovieDetailViewModel] Calling API...")
            movieResponse = try await APIClient.shared.fetchMovie(tmdbId: tmdbId)
            print("📱 [MovieDetailViewModel] SUCCESS! Got movie: \(movieResponse?.movie.title ?? "nil")")
        } catch {
            print("📱 [MovieDetailViewModel] ERROR: \(error.localizedDescription)")
            self.error = error
        }

        isLoading = false
        print("📱 [MovieDetailViewModel] Loading complete. Has data: \(movieResponse != nil)")
    }
}
