//
//  TMDBVideo.swift
//  moviegenius
//
//  TMDB video models for trailer data from /movie/{id}/videos endpoint
//

import Foundation

// MARK: - TMDB Videos Response

struct TMDBVideosResponse: Codable {
    let id: Int
    let results: [TMDBVideo]

    /// Returns the first official YouTube trailer, or first YouTube video if no official trailer
    var primaryTrailer: TMDBVideo? {
        // Prefer official trailers
        if let official = results.first(where: { $0.isOfficialTrailer }) {
            return official
        }

        // Fallback to first YouTube video
        return results.first(where: { $0.site.lowercased() == "youtube" })
    }

    /// All YouTube trailers, sorted with official trailers first
    var allTrailers: [TMDBVideo] {
        let youtubeVideos = results.filter { $0.site.lowercased() == "youtube" }

        // Sort: official trailers first, then by published date (newest first)
        return youtubeVideos.sorted { video1, video2 in
            // Official trailers always come first
            if video1.official && !video2.official {
                return true
            }
            if !video1.official && video2.official {
                return false
            }

            // Within same official status, sort by published date (newest first)
            return video1.publishedAt ?? "" > video2.publishedAt ?? ""
        }
    }
}

// MARK: - TMDB Video

struct TMDBVideo: Codable, Identifiable {
    let id: String
    let key: String
    let name: String
    let site: String
    let type: String
    let official: Bool
    let publishedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case key
        case name
        case site
        case type
        case official
        case publishedAt = "published_at"
    }

    /// True if this is an official trailer (not a teaser, clip, or featurette)
    var isOfficialTrailer: Bool {
        official && type.lowercased() == "trailer"
    }

    /// YouTube video ID for use with youtube-ios-player-helper
    var youtubeId: String {
        key
    }
}
