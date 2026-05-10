//
//  TrailerPlayerView.swift
//  moviegenius
//
//  Full-screen trailer player with AVKit
//

import SwiftUI
import AVKit

struct TrailerPlayerView: View {
    let url: URL
    @Environment(\.dismiss) var dismiss
    @State private var player: AVPlayer?

    var body: some View {
        NavigationView {
            ZStack {
                if let player = player {
                    VideoPlayer(player: player)
                } else {
                    ProgressView("Loading trailer...")
                }
            }
            .navigationTitle("Trailer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        player?.pause()
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            // Initialize and auto-play
            player = AVPlayer(url: url)
            player?.play()
        }
        .onDisappear {
            player?.pause()
            player = nil
        }
    }
}

#Preview {
    TrailerPlayerView(url: URL(string: "https://www.youtube.com/watch?v=SUXWAEX2jlg")!)
}
