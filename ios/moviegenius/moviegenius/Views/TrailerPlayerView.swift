//
//  TrailerPlayerView.swift
//  moviegenius
//
//  Opens YouTube trailer in YouTube app or Safari
//

import SwiftUI

struct TrailerPlayerView: View {
    let youtubeId: String
    @Environment(\.dismiss) var dismiss
    @Environment(\.openURL) var openURL
    @State private var isOpening = true

    var body: some View {
        VStack(spacing: 20) {
            if isOpening {
                Image(systemName: "play.rectangle.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.red)

                Text("Opening trailer...")
                    .font(.headline)

                ProgressView()
                    .padding(.top, 8)
            } else {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.orange)

                Text("Unable to open YouTube")
                    .font(.headline)

                Text("Please check your internet connection")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            Button("Close") {
                dismiss()
            }
            .buttonStyle(.bordered)
            .padding(.top)
        }
        .padding()
        .task {
            await openTrailer()
        }
    }

    @MainActor
    private func openTrailer() async {
        // YouTube app deep link (vnd.youtube:// is more reliable than youtube://)
        guard let youtubeAppURL = URL(string: "vnd.youtube://\(youtubeId)"),
              let webURL = URL(string: "https://www.youtube.com/watch?v=\(youtubeId)") else {
            isOpening = false
            return
        }

        // Try YouTube app first if installed
        if UIApplication.shared.canOpenURL(youtubeAppURL) {
            let opened = await openURL(youtubeAppURL)
            if opened {
                // Give the app time to switch before dismissing
                try? await Task.sleep(for: .milliseconds(500))
                dismiss()
            } else {
                // YouTube app failed, try web URL
                await openWebURL(webURL)
            }
        } else {
            // YouTube app not installed, use web URL
            await openWebURL(webURL)
        }
    }

    @MainActor
    private func openWebURL(_ url: URL) async {
        let opened = await openURL(url)
        if opened {
            try? await Task.sleep(for: .milliseconds(500))
            dismiss()
        } else {
            // Failed to open - show error state
            isOpening = false
        }
    }
}

#Preview {
    TrailerPlayerView(youtubeId: "SUXWAEX2jlg")
}
