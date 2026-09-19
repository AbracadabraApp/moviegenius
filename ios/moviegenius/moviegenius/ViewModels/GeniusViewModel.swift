//
//  GeniusViewModel.swift
//  moviegenius
//
//  Manages genre expertise calculation and recommendations
//

import Foundation
import Combine

@MainActor
class GeniusViewModel: ObservableObject {
    @Published var genres: [GenreExpertise] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let apiClient = APIClient.shared
    private let expertiseManager = GenreExpertiseManager.shared
    private let favorites = FavoritesManager.shared

    private var loadTask: Task<Void, Never>?
    private var cancellables = Set<AnyCancellable>()

    init() {
        // Observe favorites changes to recalculate expertise
        favorites.objectWillChange
            .sink { [weak self] _ in
                Task { @MainActor in
                    await self?.calculateExpertise()
                }
            }
            .store(in: &cancellables)
    }

    func loadGenreExpertise() async {
        loadTask?.cancel()

        loadTask = Task {
            isLoading = true
            error = nil

            do {
                // Fetch all collections (for genre mastery calculation)
                let response = try await apiClient.fetchFeaturedCollections(
                    limit: 100,
                    offset: 0,
                    moviesPerCollection: 50,  // Need full lists for accurate progress
                    seed: 0  // Use consistent seed for genre lists
                )

                guard !Task.isCancelled else { return }

                expertiseManager.calculateExpertise(from: response.collections)
                genres = expertiseManager.genres

                isLoading = false
            } catch is CancellationError {
                return
            } catch {
                self.error = error
                isLoading = false
            }
        }

        await loadTask?.value
    }

    func calculateExpertise() async {
        // Recalculate without re-fetching
        if !expertiseManager.genres.isEmpty {
            let _ = Set(favorites.lovedMovies.map { $0.id })  // Future use: filtering by loved movies

            genres = expertiseManager.genres.map { genre in
                // This is inefficient - ideally we'd have movie IDs per genre
                // For now, just update the struct
                genre
            }
        }
    }

    func topGenres(limit: Int = 5) -> [GenreExpertise] {
        Array(genres.prefix(limit))
    }

    func genresInProgress() -> [GenreExpertise] {
        genres.filter { $0.seenCount > 0 && $0.rank != .master }
    }

    func masteredGenres() -> [GenreExpertise] {
        genres.filter { $0.rank == .master }
    }

    deinit {
        loadTask?.cancel()
    }
}
