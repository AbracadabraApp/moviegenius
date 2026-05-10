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
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .aspectRatio(2/3, contentMode: .fit)
                    .overlay(
                        ProgressView()
                    )
            }
            .frame(maxWidth: 267, maxHeight: 400)

            if let trailerUrl = trailerUrl, let url = URL(string: trailerUrl) {
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
                    TrailerPlayerView(url: url)
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
        trailerUrl: "https://www.youtube.com/watch?v=SUXWAEX2jlg"
    )
}
