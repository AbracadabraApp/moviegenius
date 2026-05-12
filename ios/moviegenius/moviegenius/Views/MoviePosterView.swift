//
//  MoviePosterView.swift
//  moviegenius
//
//  HERO movie poster - largest, most prominent element
//

import SwiftUI

struct MoviePosterView: View {
    let posterUrl: String?
    let trailerUrl: String?
    @State private var showingTrailer = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            AsyncImage(url: posterURL) { phase in
                switch phase {
                case .empty:
                    placeholderView
                        .overlay(
                            ProgressView()
                                .scaleEffect(1.5)
                        )
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(2/3, contentMode: .fill)
                        .transition(.opacity.combined(with: .scale(scale: 1.05)))
                case .failure:
                    placeholderView
                        .overlay(
                            VStack(spacing: .mgSpacing8) {
                                Image(systemName: "film.stack")
                                    .font(.system(size: 48))
                                    .foregroundStyle(.tertiary)
                                Text("Poster unavailable")
                                    .font(.mgCaption)
                                    .foregroundStyle(Color.mgSecondary)
                            }
                        )
                @unknown default:
                    placeholderView
                }
            }
            .frame(width: 350, height: 525)  // Nearly full-width hero poster (2:3 ratio)
            .clipShape(RoundedRectangle(cornerRadius: .mgCornerLarge, style: .continuous))
            .shadow(
                color: .black.opacity(0.15),
                radius: 12,
                x: 0,
                y: 6
            )

            // Trailer play button overlay (bottom-right corner)
            if let trailerUrl = trailerUrl, !trailerUrl.isEmpty {
                Button {
                    showingTrailer = true
                } label: {
                    ZStack {
                        Circle()
                            .fill(.ultraThinMaterial)
                            .frame(width: 56, height: 56)

                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 44))
                            .foregroundStyle(.white)
                            .shadow(radius: 4)
                    }
                }
                .accessibilityLabel("Play trailer")
                .accessibilityHint("Opens trailer video")
                .padding(.mgSpacing16)
                .sheet(isPresented: $showingTrailer) {
                    TrailerPlayerView(youtubeId: trailerUrl)
                }
            }
        }
        .padding(.horizontal, .mgSpacing20)
        .padding(.vertical, .mgSpacing16)
    }

    private var posterURL: URL? {
        guard let posterUrl = posterUrl else { return nil }
        return URL(string: posterUrl)
    }

    private var placeholderView: some View {
        RoundedRectangle(cornerRadius: .mgCornerLarge, style: .continuous)
            .fill(Color.mgSecondary.opacity(0.15))
            .overlay(
                RoundedRectangle(cornerRadius: .mgCornerLarge, style: .continuous)
                    .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [8, 4]))
                    .foregroundStyle(.tertiary.opacity(0.3))
            )
    }
}

#Preview {
    MoviePosterView(
        posterUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        trailerUrl: "SUXWAEX2jlg"  // YouTube video ID, not full URL
    )
}
