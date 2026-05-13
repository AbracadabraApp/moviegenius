//
//  CollectionDetailViewModel.swift
//  moviegenius
//
//  Fetches and manages collection detail with subcategories
//

import Foundation
import Combine

@MainActor
class CollectionDetailViewModel: ObservableObject {
    @Published var collection: CollectionDetail?
    @Published var movies: [CollectionDetailMovie] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let collectionId: String
    private let apiClient = APIClient.shared
    private var loadTask: Task<Void, Never>?

    init(collectionId: String) {
        self.collectionId = collectionId
    }

    func loadCollection() async {
        guard !isLoading else { return }

        // Cancel any in-flight request
        loadTask?.cancel()

        loadTask = Task {
            isLoading = true
            error = nil

            do {
                let response = try await apiClient.fetchCollection(id: collectionId)

                collection = response.collection
                movies = response.movies
                isLoading = false
            } catch is CancellationError {
                // User navigated away, this is expected
                return
            } catch {
                self.error = error
                isLoading = false
            }
        }

        await loadTask?.value
    }

    deinit {
        // Cancel task when ViewModel is deallocated
        loadTask?.cancel()
    }

    // Get movies for a specific subcategory
    func moviesForSubcategory(_ subcategory: Subcategory) -> [CollectionDetailMovie] {
        guard let subcategoryMovies = subcategory.movies else { return [] }

        let tmdbIds = subcategoryMovies.map { $0.tmdbId }
        return movies.filter { tmdbIds.contains($0.tmdbId) && $0.posterUrl != nil }
    }
}
