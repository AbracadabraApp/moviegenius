//
//  HomeViewModel.swift
//  moviegenius
//
//  Manages homepage collections fetching and state
//

import Foundation
import Combine

@MainActor
class HomeViewModel: ObservableObject {
    @Published var collections: [Collection] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let apiClient = APIClient.shared
    private var currentPage = 0
    private var seed: Int
    private let firstBatch = 5
    private let collectionsPerPage = 10

    private var initialLoadTask: Task<Void, Never>?
    private var loadMoreTask: Task<Void, Never>?

    init() {
        // Generate random seed for this session
        self.seed = Int.random(in: 0..<1_000_000)
    }

    func loadInitialCollections() async {
        // Cancel any in-flight initial load
        initialLoadTask?.cancel()

        initialLoadTask = Task {
            isLoading = true
            error = nil

            do {
                // Fetch first 5 collections quickly using v1 API
                let response = try await apiClient.fetchFeaturedCollections(
                    limit: firstBatch,
                    offset: 0,
                    moviesPerCollection: 10,
                    seed: seed
                )

                collections = response.collections
                isLoading = false

                // Load next batch in background
                loadMoreTask = Task {
                    await loadMoreCollections()
                }
            } catch is CancellationError {
                // User navigated away, this is expected
                return
            } catch {
                self.error = error
                isLoading = false
            }
        }

        await initialLoadTask?.value
    }

    func loadMoreCollections() async {
        guard !isLoading else { return }

        // Cancel any in-flight load more operation
        loadMoreTask?.cancel()

        loadMoreTask = Task {
            currentPage += 1
            let offset = currentPage * collectionsPerPage

            do {
                let response = try await apiClient.fetchFeaturedCollections(
                    limit: collectionsPerPage,
                    offset: offset,
                    moviesPerCollection: 10,
                    seed: seed
                )

                collections.append(contentsOf: response.collections)
            } catch is CancellationError {
                // User navigated away or triggered new load, this is expected
                return
            } catch {
                self.error = error
            }
        }

        await loadMoreTask?.value
    }

    deinit {
        // Cancel all in-flight tasks when ViewModel is deallocated
        initialLoadTask?.cancel()
        loadMoreTask?.cancel()
    }
}
