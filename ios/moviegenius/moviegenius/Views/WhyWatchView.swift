//
//  WhyWatchView.swift
//  moviegenius
//
//  WhyWatch verdict display (YES/NO + 3 reasons + context)
//

import SwiftUI

struct WhyWatchView: View {
    let whyWatch: WhyWatch

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Verdict line
            HStack {
                Image(systemName: whyWatch.isRecommended ? "sparkles" : "hand.raised")
                    .foregroundColor(whyWatch.isRecommended ? .yellow : .red)
                Text(whyWatch.isRecommended ? "Worth Watching" : "Skip It")
                    .font(.headline)
            }

            // 3 reasons
            VStack(alignment: .leading, spacing: 8) {
                ForEach(whyWatch.reasons, id: \.self) { reason in
                    HStack(alignment: .top, spacing: 8) {
                        Text("•")
                        Text(reason)
                    }
                }
            }

            // Context paragraph
            if let context = whyWatch.context {
                Text(context)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .padding(.top, 8)
            }
        }
        .padding()
    }
}

#Preview {
    WhyWatchView(whyWatch: WhyWatch(
        id: "preview",
        recommendation: "YES",
        reasons: [
            "Murray's restrained performance carries every quiet scene",
            "Dialogue feels genuinely overheard, not written",
            "Redefined American indie romance for the 2000s"
        ],
        context: "Coppola shot guerrilla-style in real Tokyo locations without permits, which gives the film its authentic disorientation.",
        model: "claude-sonnet-4-6",
        createdAt: "2024-01-15T10:30:00.000Z"
    ))
}
