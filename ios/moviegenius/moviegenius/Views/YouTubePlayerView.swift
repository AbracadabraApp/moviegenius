//
//  YouTubePlayerView.swift
//  moviegenius
//
//  SwiftUI wrapper for YTPlayerView from youtube-ios-player-helper
//

import SwiftUI
import YouTubeiOSPlayerHelper

struct YouTubePlayerView: UIViewRepresentable {
    let videoId: String
    let onReady: (() -> Void)?
    let onError: ((String) -> Void)?

    init(videoId: String, onReady: (() -> Void)? = nil, onError: ((String) -> Void)? = nil) {
        self.videoId = videoId
        self.onReady = onReady
        self.onError = onError
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onReady: onReady, onError: onError)
    }

    func makeUIView(context: Context) -> YTPlayerView {
        let playerView = YTPlayerView()
        playerView.delegate = context.coordinator

        #if DEBUG
        print("🎥 [YouTubePlayerView] Creating player for video: \(videoId)")
        #endif

        return playerView
    }

    func updateUIView(_ uiView: YTPlayerView, context: Context) {
        // Only load if video ID changed
        guard context.coordinator.currentVideoId != videoId else { return }

        context.coordinator.currentVideoId = videoId

        let playerVars: [AnyHashable: Any] = [
            "playsinline": 1,
            "autoplay": 1,
            "rel": 0,
            "modestbranding": 1,
            "fs": 1
        ]

        #if DEBUG
        print("🎥 [YouTubePlayerView] Loading video: \(videoId)")
        #endif

        uiView.load(withVideoId: videoId, playerVars: playerVars)
    }

    // MARK: - Coordinator

    class Coordinator: NSObject, YTPlayerViewDelegate {
        let onReady: (() -> Void)?
        let onError: ((String) -> Void)?
        var currentVideoId: String?

        init(onReady: (() -> Void)?, onError: ((String) -> Void)?) {
            self.onReady = onReady
            self.onError = onError
        }

        func playerViewDidBecomeReady(_ playerView: YTPlayerView) {
            #if DEBUG
            print("✅ [YouTubePlayerView] Player ready")
            #endif
            onReady?()
        }

        func playerView(_ playerView: YTPlayerView, didChangeTo state: YTPlayerState) {
            #if DEBUG
            print("🎥 [YouTubePlayerView] State changed: \(state.rawValue)")
            #endif
        }

        func playerView(_ playerView: YTPlayerView, receivedError error: YTPlayerError) {
            let errorMessage: String
            switch error {
            case .invalidParam:
                errorMessage = "Invalid video ID"
            case .html5Error:
                errorMessage = "HTML5 player error"
            case .videoNotFound:
                errorMessage = "Video not found or unavailable"
            case .notEmbeddable:
                errorMessage = "Video cannot be embedded"
            case .unknown:
                errorMessage = "Unknown error occurred"
            @unknown default:
                errorMessage = "Player error"
            }

            #if DEBUG
            print("❌ [YouTubePlayerView] Error: \(errorMessage) (code: \(error.rawValue))")
            #endif

            onError?(errorMessage)
        }
    }
}
