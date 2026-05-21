//
//  ImageURLOptimizer.swift
//  moviegenius
//
//  Optimizes TMDB image URLs based on display context
//

import SwiftUI

struct ImageURLOptimizer {
    enum ImageContext {
        case thumbnail      // Small cards in carousels (w185)
        case standardCard   // Standard movie cards (w342)
        case fullPoster     // Full screen posters (w500)
        case backdrop       // Backdrop images (w780)

        var tmdbSize: String {
            switch self {
            case .thumbnail:
                return "w185"
            case .standardCard:
                return "w342"
            case .fullPoster:
                return "w500"
            case .backdrop:
                return "w780"
            }
        }
    }

    /// Optimizes a TMDB image URL for the given context
    static func optimizeURL(_ urlString: String?, for context: ImageContext) -> String? {
        guard let urlString = urlString else { return nil }

        // If it's already a TMDB URL, replace the size parameter
        if urlString.contains("image.tmdb.org/t/p/") {
            // Extract everything after the size parameter
            let patterns = ["w92", "w154", "w185", "w342", "w500", "w780", "w1280", "original"]

            for pattern in patterns {
                if urlString.contains("/\(pattern)/") {
                    return urlString.replacingOccurrences(
                        of: "/\(pattern)/",
                        with: "/\(context.tmdbSize)/"
                    )
                }
            }
        }

        // Return as-is if not a TMDB URL or no size found
        return urlString
    }

    /// Creates optimized poster URL from path
    static func posterURL(from path: String?, context: ImageContext = .standardCard) -> URL? {
        guard let path = path else { return nil }

        // If it's a full URL, optimize it
        if path.starts(with: "http") {
            guard let optimized = optimizeURL(path, for: context) else { return nil }
            return URL(string: optimized)
        }

        // If it's just a path, construct the URL
        let urlString = "https://image.tmdb.org/t/p/\(context.tmdbSize)\(path)"
        return URL(string: urlString)
    }
}

// MARK: - AsyncImage Extension for Optimized Loading

extension View {
    /// Loads an image with size optimization and progressive loading
    @ViewBuilder
    func optimizedAsyncImage(
        url: String?,
        context: ImageURLOptimizer.ImageContext
    ) -> some View {
        let optimizedURL = ImageURLOptimizer.posterURL(
            from: url,
            context: context
        )

        AsyncImage(url: optimizedURL) { phase in
            switch phase {
            case .empty:
                ProgressView()
                    .tint(Color.mgGold)
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            case .failure:
                Image(systemName: "photo")
                    .foregroundStyle(Color.mgSecondary)
            @unknown default:
                ProgressView()
                    .tint(Color.mgGold)
            }
        }
    }
}