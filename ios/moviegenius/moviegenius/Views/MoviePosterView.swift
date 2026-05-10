//
//  MoviePosterView.swift
//  moviegenius
//
//  Movie poster with trailer overlay button
//

import SwiftUI

struct MoviePosterView: View {
    let posterUrl: String?
    let trailerUrl: String?
    @State private var showingTrailer = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            AsyncImage(url: posterURL) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .overlay(
                        ProgressView()
                    )
            }
            .frame(width: 125, height: 188)
            .clipped()

            if let trailerUrl = trailerUrl, !trailerUrl.isEmpty {
                Button {
                    showingTrailer = true
                } label: {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 44))
                        .foregroundColor(.white)
                        .shadow(radius: 4)
                }
                .padding()
                .sheet(isPresented: $showingTrailer) {
                    TrailerPlayerView(youtubeId: trailerUrl)
                }
            }
        }
        .padding(.vertical)
    }

    private var posterURL: URL? {
        guard let posterUrl = posterUrl else { return nil }
        return URL(string: posterUrl)
    }
}

#Preview {
    MoviePosterView(
        posterUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        trailerUrl: "SUXWAEX2jlg"  // YouTube video ID, not full URL
    )
}
