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
                        Text(reason)
                            .font(.mgBody)
                    }
                }
            }

            // Context paragraph
            if let context = whyWatch.context {
                Text(context)
                    .font(.mgBody)
                    .foregroundStyle(Color.mgSecondary)
                    .padding(.top, .mgSpacing8)
            }
        }
        .padding(.mgSpacing16)
        .mgProminentCard()
        .padding(.horizontal, .mgSpacing20)
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
