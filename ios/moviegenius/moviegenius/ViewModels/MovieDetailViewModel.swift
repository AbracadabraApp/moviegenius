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
        isLoading = true
        error = nil

        do {
            movieResponse = try await APIClient.shared.fetchMovie(tmdbId: tmdbId)
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
