//
//  TrailerPlayerView.swift
//  moviegenius
//
//  YouTube trailer player using WKWebView (same approach as web and Letterboxd)
//

import SwiftUI
import WebKit

struct TrailerPlayerView: View {
    let youtubeId: String
    @Environment(\.dismiss) private var dismiss
    @State private var loadError: String?
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black
                    .ignoresSafeArea()

                if isLoading {
                    VStack(spacing: .mgSpacing16) {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                        Text("Loading trailer...")
                            .font(.mgCallout)
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }

                if let error = loadError {
                    VStack(spacing: .mgSpacing16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48))
                            .foregroundStyle(.white.opacity(0.8))
                        Text("Trailer unavailable")
                            .font(.mgHeadline)
                            .foregroundStyle(.white)
                        Text(error)
                            .font(.mgCaption)
                            .foregroundStyle(.white.opacity(0.6))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, .mgSpacing32)
                    }
                }

                YouTubePlayerView(
                    youtubeId: youtubeId,
                    onLoad: {
                        isLoading = false
                        #if DEBUG
                        print("✅ [TrailerPlayer] YouTube player loaded successfully")
                        #endif
                    },
                    onError: { errorMessage in
                        loadError = errorMessage
                        isLoading = false
                        #if DEBUG
                        print("❌ [TrailerPlayer] Load failed: \(errorMessage)")
                        #endif
                    }
                )
                .opacity(loadError == nil ? 1 : 0)
                .ignoresSafeArea()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        dismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.white.opacity(0.9))
                            .symbolRenderingMode(.hierarchical)
                    }
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
        }
        .onAppear {
            #if DEBUG
            print("🎥 [TrailerPlayer] Opening trailer view")
            print("   YouTube ID: \(youtubeId)")
            print("   Embed URL: https://www.youtube.com/embed/\(youtubeId)")
            #endif
        }
    }
}

// MARK: - YouTube Player (WKWebView)

struct YouTubePlayerView: UIViewRepresentable {
    let youtubeId: String
    let onLoad: () -> Void
    let onError: (String) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onLoad: onLoad, onError: onError)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.backgroundColor = .black
        webView.isOpaque = false
        webView.scrollView.isScrollEnabled = false
        webView.navigationDelegate = context.coordinator

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        #if DEBUG
        print("🎥 [YouTubePlayerView] Loading YouTube embed")
        print("   YouTube ID: \(youtubeId)")
        #endif
        // YouTube embed URL with autoplay (same as web implementation)
        let embedHTML = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                }
                html, body {
                    width: 100%;
                    height: 100%;
                    background-color: #000;
                    overflow: hidden;
                }
                .video-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                iframe {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 100%;
                    height: 56.25vw; /* 16:9 aspect ratio */
                    max-height: 100%;
                    max-width: 177.78vh; /* 16:9 aspect ratio */
                    border: none;
                }
            </style>
        </head>
        <body>
            <div class="video-container">
                <iframe
                    src="https://www.youtube.com/embed/\(youtubeId)?autoplay=1&playsinline=1&rel=0&modestbranding=1&fs=1"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                    playsinline>
                </iframe>
            </div>
        </body>
        </html>
        """

        webView.loadHTMLString(embedHTML, baseURL: URL(string: "https://www.youtube.com"))
    }

    // MARK: - Navigation Delegate

    class Coordinator: NSObject, WKNavigationDelegate {
        let onLoad: () -> Void
        let onError: (String) -> Void

        init(onLoad: @escaping () -> Void, onError: @escaping (String) -> Void) {
            self.onLoad = onLoad
            self.onError = onError
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            #if DEBUG
            print("✅ [WKWebView] Navigation finished successfully")
            #endif
            onLoad()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            #if DEBUG
            print("❌ [WKWebView] Navigation failed: \(error.localizedDescription)")
            #endif
            onError(error.localizedDescription)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            #if DEBUG
            print("❌ [WKWebView] Provisional navigation failed: \(error.localizedDescription)")
            #endif
            onError(error.localizedDescription)
        }
    }
}

#Preview {
    TrailerPlayerView(youtubeId: "SUXWAEX2jlg")
}
