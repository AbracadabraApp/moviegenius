//
//  GenreExpertiseManager.swift
//  moviegenius
//
//  Tracks user's genre mastery across Browse collections
//

import Foundation
import SwiftUI
import Combine

// MARK: - Rank System

enum GenreRank: Int, Comparable {
    case beginner = 0
    case student = 1
    case scholar = 2
    case expert = 3
    case master = 4

    var title: String {
        switch self {
        case .beginner: return "Beginner"
        case .student: return "Student"
        case .scholar: return "Scholar"
        case .expert: return "Expert"
        case .master: return "Master"
        }
    }

    var icon: String {
        switch self {
        case .beginner: return "circle"
        case .student: return "circle.lefthalf.filled"
        case .scholar: return "circle.fill"
        case .expert: return "star.circle.fill"
        case .master: return "crown.fill"
        }
    }

    var color: Color {
        switch self {
        case .beginner: return Color.mgSecondary
        case .student: return Color.mgGold.opacity(0.6)
        case .scholar: return Color.mgGold.opacity(0.8)
        case .expert: return Color.mgGold
        case .master: return Color.mgGold
        }
    }

    static func < (lhs: GenreRank, rhs: GenreRank) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

// MARK: - Genre Expertise

struct GenreExpertise: Identifiable {
    let id: String // collection ID
    let name: String
    let category: String?
    let totalFilms: Int
    var seenCount: Int

    var progress: Double {
        min(Double(seenCount) / 10.0, 1.0)
    }

    var rank: GenreRank {
        switch seenCount {
        case 0...2: return .beginner
        case 3...5: return .student
        case 6...8: return .scholar
        case 9: return .expert
        default: return .master
        }
    }

    var nextRank: GenreRank? {
        rank == .master ? nil : GenreRank(rawValue: rank.rawValue + 1)
    }

    var filmsToNextRank: Int? {
        guard let next = nextRank else { return nil }

        switch next {
        case .student: return 3 - seenCount
        case .scholar: return 6 - seenCount
        case .expert: return 9 - seenCount
        case .master: return 10 - seenCount
        default: return nil
        }
    }
}

// MARK: - Manager

@MainActor
class GenreExpertiseManager: ObservableObject {
    static let shared = GenreExpertiseManager()

    @Published var genres: [GenreExpertise] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let favorites = FavoritesManager.shared

    func calculateExpertise(from collections: [Collection]) {
        let seenMovieIds = Set(favorites.lovedMovies.map { $0.id })

        genres = collections.map { collection in
            let collectionMovieIds = Set(collection.movies.map { $0.tmdbId })
            let seenCount = collectionMovieIds.intersection(seenMovieIds).count

            return GenreExpertise(
                id: collection.id,
                name: collection.title,
                category: collection.categories?.first,
                totalFilms: collection.movies.count,
                seenCount: seenCount
            )
        }
        .filter { $0.totalFilms >= 10 } // Only show collections with enough films
        .sorted { lhs, rhs in
            // Sort by progress descending, then by name
            if lhs.seenCount != rhs.seenCount {
                return lhs.seenCount > rhs.seenCount
            }
            return lhs.name < rhs.name
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

    func suggestedGenres() -> [GenreExpertise] {
        genres.filter { $0.seenCount == 0 }.prefix(3).map { $0 }
    }
}
