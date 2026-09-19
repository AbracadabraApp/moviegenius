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
        #if DEBUG
        print("[CollectionDetailVM] loadCollection called - isLoading: \(isLoading), collection: \(collection?.id ?? "nil")")
        #endif

        guard !isLoading else {
            #if DEBUG
            print("[CollectionDetailVM] Skipped - already loading")
            #endif
            return
        }

        // Cancel any in-flight request
        loadTask?.cancel()

        loadTask = Task {
            isLoading = true
            error = nil

            // Retry configuration
            let maxRetries = 3
            var retryCount = 0
            var lastError: Error?

            while retryCount <= maxRetries {
                do {
                    #if DEBUG
                    if retryCount > 0 {
                        print("[CollectionDetailVM] Retry attempt \(retryCount) for collection: \(collectionId)")
                    } else {
                        print("[CollectionDetailVM] Starting fetch for collection: \(collectionId)")
                    }
                    #endif

                    let response = try await apiClient.fetchCollection(id: collectionId)

                    collection = response.collection
                    movies = response.movies
                    isLoading = false

                    #if DEBUG
                    print("[CollectionDetailVM] Successfully loaded collection: \(response.collection.title) with \(response.movies.count) movies")
                    #endif

                    // Success - break out of retry loop
                    return

                } catch is CancellationError {
                    // User navigated away, this is expected - don't retry
                    #if DEBUG
                    print("[CollectionDetailVM] Request cancelled - user navigated away")
                    #endif
                    isLoading = false
                    return
                } catch {
                    lastError = error

                    // Check if we should retry
                    if retryCount < maxRetries {
                        // Calculate exponential backoff delay: 1s, 2s, 4s
                        let delaySeconds = pow(2.0, Double(retryCount))

                        #if DEBUG
                        print("[CollectionDetailVM] Error on attempt \(retryCount + 1): \(error)")
                        print("[CollectionDetailVM] Retrying in \(delaySeconds) seconds...")
                        #endif

                        // Wait with exponential backoff
                        try? await Task.sleep(nanoseconds: UInt64(delaySeconds * 1_000_000_000))

                        // Check if task was cancelled during sleep
                        if Task.isCancelled {
                            #if DEBUG
                            print("[CollectionDetailVM] Task cancelled during retry delay")
                            #endif
                            isLoading = false
                            return
                        }

                        retryCount += 1
                    } else {
                        // Max retries exceeded
                        #if DEBUG
                        print("[CollectionDetailVM] Max retries exceeded. Final error: \(error)")
                        #endif
                        break
                    }
                }
            }

            // If we get here, all retries failed
            self.error = lastError
            isLoading = false

            #if DEBUG
            print("[CollectionDetailVM] Failed to load collection after \(retryCount + 1) attempts")
            #endif
        }

        await loadTask?.value
    }

    // Manual retry method that can be called from UI
    func retry() async {
        #if DEBUG
        print("[CollectionDetailVM] Manual retry requested for collection: \(collectionId)")
        #endif
        await loadCollection()
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
