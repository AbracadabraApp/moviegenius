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
    @Published var hasTrailers = false

    private let tmdbId: Int
    private var loadTask: Task<Void, Never>?

    init(tmdbId: Int) {
        self.tmdbId = tmdbId
    }

    func loadMovie() async {
        // Cancel any in-flight request to prevent wasted network/memory
        loadTask?.cancel()

        loadTask = Task {
            isLoading = true
            error = nil

            do {
                movieResponse = try await APIClient.shared.fetchMovie(tmdbId: tmdbId)

                // Check if trailers are available (parallel fetch)
                Task {
                    await checkTrailersAvailable()
                }
            } catch is CancellationError {
                // User navigated away, this is expected - don't show error
                return
            } catch {
                self.error = error
            }

            isLoading = false
        }

        await loadTask?.value
    }

    private func checkTrailersAvailable() async {
        do {
            let videos = try await APIClient.shared.fetchVideos(tmdbId: tmdbId)
            hasTrailers = !videos.results.isEmpty
        } catch {
            // Silently fail - trailer availability is not critical
            hasTrailers = false
            #if DEBUG
            print("⚠️ [MovieDetailViewModel] Failed to check trailers: \(error)")
            #endif
        }
    }

    deinit {
        // Cancel task when ViewModel is deallocated
        loadTask?.cancel()
    }
}
