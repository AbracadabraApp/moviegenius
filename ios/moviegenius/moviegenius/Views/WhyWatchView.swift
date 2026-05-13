//
//  WhyWatchView.swift
//  moviegenius
//
//  WhyWatch verdict display (YES/NO + 3 reasons + context)
//

import SwiftUI

struct WhyWatchView: View {
    let whyWatch: WhyWatch
    let tmdbId: Int
    let title: String
    let year: Int?
    let posterUrl: String?
    let slug: String?

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing16) {
            // Verdict line
            HStack {
                Image(systemName: whyWatch.isRecommended ? "sparkles" : "hand.raised")
                    .foregroundStyle(whyWatch.isRecommended ? Color.mgGold : Color.mgDestructive)
                Text(whyWatch.isRecommended ? "Worth Watching" : "Skip It")
                    .font(.mgHeadline)
            }

            // 3 reasons
            VStack(alignment: .leading, spacing: .mgSpacing8) {
                ForEach(whyWatch.reasons, id: \.self) { reason in
                    HStack(alignment: .top, spacing: .mgSpacing8) {
                        Text("•")
                        ParsedReasonText(reason: reason)
                            .font(.mgBody)
                    }
                }
            }

            // Context paragraph
            if let context = whyWatch.context {
                Text(context)
                    .font(.mgBody)
                    .foregroundStyle(Color.mgPrimary)
                    .padding(.top, .mgSpacing8)
            }
        }
        .padding(.mgSpacing16)
        .mgProminentCard()
        .padding(.horizontal, .mgSpacing20)
    }
}

// MARK: - HTML Parsing for Person Links

struct ParsedReasonText: View {
    let reason: String

    var body: some View {
        let segments = parseReasonHTML(reason)

        // Render segments as an inline flow of Text and NavigationLink
        ViewThatFits {
            HStack(spacing: 0) {
                ForEach(Array(segments.enumerated()), id: \.offset) { _, segment in
                    switch segment {
                    case .text(let string):
                        Text(string)
                            .foregroundStyle(Color.mgPrimary)
                    case .link(let name, let personId):
                        NavigationLink(destination: PersonDetailView(personId: personId)) {
                            Text(name)
                                .foregroundStyle(Color.mgGold)
                                .underline()
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func parseReasonHTML(_ html: String) -> [ReasonSegment] {
        var segments: [ReasonSegment] = []
        var currentIndex = html.startIndex

        // Pattern: <a href="/person/123" class="person-name">Name</a>
        let pattern = #"<a href="/person/(\d+)" class="person-name">([^<]+)</a>"#

        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            return [.text(html)]
        }

        let nsString = html as NSString
        let matches = regex.matches(in: html, options: [], range: NSRange(location: 0, length: nsString.length))

        for match in matches {
            // Add text before the link
            if let matchRange = Range(match.range, in: html), currentIndex < matchRange.lowerBound {
                let textBefore = String(html[currentIndex..<matchRange.lowerBound])
                if !textBefore.isEmpty {
                    segments.append(.text(textBefore))
                }
            }

            // Extract person ID and name
            if match.numberOfRanges >= 3,
               let personIdRange = Range(match.range(at: 1), in: html),
               let nameRange = Range(match.range(at: 2), in: html),
               let personId = Int(String(html[personIdRange])) {
                let name = String(html[nameRange])
                segments.append(.link(name: name, personId: personId))
            }

            // Move current index past this match
            if let matchRange = Range(match.range, in: html) {
                currentIndex = matchRange.upperBound
            }
        }

        // Add remaining text after last match
        if currentIndex < html.endIndex {
            let remainingText = String(html[currentIndex...])
            if !remainingText.isEmpty {
                segments.append(.text(remainingText))
            }
        }

        return segments.isEmpty ? [.text(html)] : segments
    }
}

enum ReasonSegment {
    case text(String)
    case link(name: String, personId: Int)
}

#Preview {
    NavigationStack {
        WhyWatchView(
            whyWatch: WhyWatch(
                id: "preview",
                recommendation: "YES",
                reasons: [
                    "<a href=\"/person/36534\" class=\"person-name\">Tom Cruise</a>'s career-best performance",
                    "Relentlessly creative narrative structure",
                    "Ingenious sci-fi action mechanics"
                ],
                context: "Doug Liman's adaptation transformed a Japanese light novel into a Hollywood blockbuster with genuine heart.",
                model: "claude-sonnet-4-6",
                createdAt: "2024-01-15T10:30:00.000Z"
            ),
            tmdbId: 137113,
            title: "Edge of Tomorrow",
            year: 2014,
            posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
            slug: "edge-of-tomorrow-2014"
        )
    }
}
