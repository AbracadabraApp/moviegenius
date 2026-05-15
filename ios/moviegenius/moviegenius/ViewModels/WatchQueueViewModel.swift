//
//  WatchQueueViewModel.swift
//  moviegenius
//
//  ViewModel for Watch Queue - movies marked "Add to list"
//

import Foundation
import Combine

@MainActor
class WatchQueueViewModel: ObservableObject {
    @Published var queuedMovies: [SavedMovie] = []
    @Published var isLoading = false

    private let favorites = FavoritesManager.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        // Subscribe to favorites changes
        favorites.$queueMovies
            .receive(on: DispatchQueue.main)
            .assign(to: &$queuedMovies)
    }

    func refresh() {
        favorites.loadFavorites()
    }

    func removeFromQueue(_ movie: SavedMovie) {
        favorites.toggleQueue(movie)
    }
}
