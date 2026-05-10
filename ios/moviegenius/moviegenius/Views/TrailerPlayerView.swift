//
//  TrailerPlayerView.swift
//  moviegenius
//
//  Embedded YouTube trailer player using WKWebView
//

import SwiftUI
import WebKit

struct TrailerPlayerView: View {
    let youtubeId: String
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // YouTube embedded player
            YouTubePlayerView(videoId: youtubeId)
                .edgesIgnoringSafeArea(.all)

            // Close button
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 30))
                    .foregroundColor(.white)
                    .shadow(radius: 4)
            }
            .padding()
        }
        .background(Color.black)
    }
}

struct YouTubePlayerView: UIViewRepresentable {
    let videoId: String

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.isScrollEnabled = false
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // YouTube embed URL with autoplay
        let embedHTML = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; }
                body { background: #000; }
                .video-container {
                    position: relative;
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                iframe {
                    width: 100%;
                    height: 100%;
                }
            </style>
        </head>
        <body>
            <div class="video-container">
                <iframe
                    src="https://www.youtube.com/embed/\(videoId)?autoplay=1&playsinline=1&rel=0&modestbranding=1"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen>
                </iframe>
            </div>
        </body>
        </html>
        """

        webView.loadHTMLString(embedHTML, baseURL: nil)
    }
}

#Preview {
    TrailerPlayerView(youtubeId: "SUXWAEX2jlg")
}
