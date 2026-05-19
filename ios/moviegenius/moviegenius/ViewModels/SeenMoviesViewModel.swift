//
//  SeenMoviesViewModel.swift
//  moviegenius
//
//  ViewModel for Seen Movies - movies marked "Seen it"
//

import Foundation
import Combine

@MainActor
class SeenMoviesViewModel: ObservableObject {
    @Published var seenMovies: [SavedMovie] = []
    @Published var isLoading = false

    private let favorites = FavoritesManager.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        // Subscribe to favorites changes - "Seen it" movies are stored as lovedMovies
        favorites.$lovedMovies
            .receive(on: DispatchQueue.main)
            .assign(to: &$seenMovies)
    }

    func refresh() {
        favorites.loadFavorites()
    }

    func removeFromSeen(_ movie: SavedMovie) {
        favorites.toggleLoved(movie)  // Remove by toggling off
    }
}
