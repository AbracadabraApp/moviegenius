//
//  TrailerView.swift
//  moviegenius
//
//  Professional trailer player with video selection and metadata
//

import SwiftUI

struct TrailerView: View {
    let tmdbId: Int
    let movieTitle: String
    let movieYear: Int?

    @Environment(\.dismiss) private var dismiss
    @State private var videos: TMDBVideosResponse?
    @State private var selectedVideo: TMDBVideo?
    @State private var isLoading = true
    @State private var error: Error?
    @State private var playerReady = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.mgVideoPlayerBackground.ignoresSafeArea()

                if isLoading {
                    loadingView
                } else if let error = error {
                    errorView(error)
                } else if let videos = videos, !videos.results.isEmpty {
                    ScrollView {
                        VStack(spacing: 0) {
                            // Player
                            if let selectedVideo = selectedVideo {
                                ZStack {
                                    YouTubePlayerView(
                                        videoId: selectedVideo.youtubeId,
                                        onReady: {
                                            playerReady = true
                                        },
                                        onError: { errorMessage in
                                            self.error = TrailerError.playerError(errorMessage)
                                        }
                                    )
                                    .aspectRatio(16/9, contentMode: .fit)
                                    .background(Color.mgVideoPlayerBackground)

                                    if !playerReady {
                                        ProgressView()
                                            .tint(Color.mgVideoPlayerText)
                                            .scaleEffect(1.5)
                                    }
                                }
                            }

                            // Video list (if multiple trailers)
                            if videos.results.count > 1 {
                                videoListView
                            }
                        }
                    }
                    .scrollIndicators(.hidden)
                } else {
                    noTrailersView
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text(movieTitle)
                            .font(.mgHeadline)
                            .foregroundStyle(Color.mgVideoPlayerText)
                        if let year = movieYear {
                            Text("(\(String(year)))")
                                .font(.mgCaption)
                                .foregroundStyle(Color.mgVideoPlayerSecondaryText)
                        }
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(Color.mgVideoPlayerText.opacity(0.9))
                            .symbolRenderingMode(.hierarchical)
                    }
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
        }
        .task {
            await loadTrailers()
        }
    }

    // MARK: - Subviews

    private var loadingView: some View {
        VStack(spacing: .mgSpacing16) {
            ProgressView()
                .tint(Color.mgVideoPlayerText)
                .scaleEffect(1.5)
            Text("Loading trailers...")
                .font(.mgCallout)
                .foregroundStyle(Color.mgVideoPlayerSecondaryText)
        }
    }

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: .mgSpacing16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(Color.mgVideoPlayerSecondaryText)
            Text("Unable to load trailers")
                .font(.mgHeadline)
                .foregroundStyle(Color.mgVideoPlayerText)
            Text(error.localizedDescription)
                .font(.mgCaption)
                .foregroundStyle(Color.mgVideoPlayerSecondaryText.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, .mgSpacing32)
            Button("Retry") {
                Task {
                    await loadTrailers()
                }
            }
            .buttonStyle(MGGlassButtonStyle())
        }
    }

    private var noTrailersView: some View {
        VStack(spacing: .mgSpacing16) {
            Image(systemName: "video.slash")
                .font(.system(size: 48))
                .foregroundStyle(Color.mgVideoPlayerSecondaryText)
            Text("No trailers available")
                .font(.mgHeadline)
                .foregroundStyle(Color.mgVideoPlayerText)
            Text("This movie doesn't have any trailers yet")
                .font(.mgCaption)
                .foregroundStyle(Color.mgVideoPlayerSecondaryText.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, .mgSpacing32)
        }
    }

    private var videoListView: some View {
        VStack(spacing: .mgSpacing12) {
            Text("Available Trailers")
                .font(.mgCallout.weight(.semibold))
                .foregroundStyle(Color.mgVideoPlayerText.opacity(0.9))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, .mgSpacing16)
                .padding(.top, .mgSpacing12)

            ForEach(videos?.allTrailers ?? []) { video in
                Button {
                    selectedVideo = video
                    playerReady = false
                } label: {
                    HStack(spacing: .mgSpacing12) {
                        Image(systemName: video.id == selectedVideo?.id ? "play.circle.fill" : "play.circle")
                            .font(.system(size: 24))
                            .foregroundStyle(video.id == selectedVideo?.id ? Color.mgGold : Color.mgVideoPlayerSecondaryText)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(video.name)
                                .font(.mgCallout)
                                .foregroundStyle(Color.mgVideoPlayerText)
                                .lineLimit(nil)
                                .fixedSize(horizontal: false, vertical: true)

                            HStack(spacing: .mgSpacing8) {
                                if video.official {
                                    Text("Official")
                                        .font(.mgCaption2)
                                        .foregroundStyle(Color.mgGold)
                                }
                                Text(video.type)
                                    .font(.mgCaption2)
                                    .foregroundStyle(Color.mgVideoPlayerSecondaryText.opacity(0.85))
                            }
                        }

                        Spacer()
                    }
                    .padding(.mgSpacing12)
                    .background(
                        RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                            .fill(video.id == selectedVideo?.id ? Color.mgGold.opacity(0.2) : Color.mgVideoPlayerText.opacity(0.1))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                            .strokeBorder(
                                video.id == selectedVideo?.id ? Color.mgGold : Color.clear,
                                lineWidth: 2
                            )
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, .mgSpacing16)
        .padding(.bottom, .mgSpacing16)
        .background(Color.mgVideoPlayerOverlay)
    }


    // MARK: - Data Loading

    private func loadTrailers() async {
        isLoading = true
        error = nil
        playerReady = false

        do {
            let response = try await APIClient.shared.fetchVideos(tmdbId: tmdbId)
            videos = response

            // Auto-select primary trailer
            selectedVideo = response.primaryTrailer

            #if DEBUG
            print("✅ [TrailerView] Loaded \(response.results.count) videos")
            print("   Primary: \(response.primaryTrailer?.name ?? "none")")
            #endif
        } catch {
            self.error = error
            #if DEBUG
            print("❌ [TrailerView] Failed to load videos: \(error)")
            #endif
        }

        isLoading = false
    }
}

// MARK: - Error Types

enum TrailerError: LocalizedError {
    case playerError(String)

    var errorDescription: String? {
        switch self {
        case .playerError(let message):
            return message
        }
    }
}

// MARK: - Preview

#Preview {
    TrailerView(
        tmdbId: 153,
        movieTitle: "Lost in Translation",
        movieYear: 2003
    )
}
