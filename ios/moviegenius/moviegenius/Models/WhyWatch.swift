//
//  WhyWatch.swift
//  moviegenius
//
//  WhyWatch recommendation model (YES/NO + 3 reasons + context)
//

import Foundation

struct WhyWatch: Codable {
    let id: String?
    let recommendation: String  // "YES" or "NO"
    let reasons: [String]       // Always 3 reasons
    let context: String?        // Closing paragraph
    let model: String?
    let createdAt: String?

    var isRecommended: Bool {
        recommendation == "YES"
    }

    enum CodingKeys: String, CodingKey {
        case id
        case recommendation
        case reasons
        case context
        case model
        case createdAt = "created_at"
    }
}
