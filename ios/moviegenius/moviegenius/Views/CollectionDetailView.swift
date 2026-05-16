//
//  CollectionDetailView.swift
//  moviegenius
//
//  Full collection view with subcategories and 3-column poster grid
//

import SwiftUI

struct CollectionDetailView: View {
    let collectionId: String
    @StateObject private var viewModel: CollectionDetailViewModel
    @Environment(\.dismiss) private var dismiss

    init(collectionId: String) {
        self.collectionId = collectionId
        _viewModel = StateObject(wrappedValue: CollectionDetailViewModel(collectionId: collectionId))
    }

    var body: some View {
        ZStack(alignment: .top) {
            // Main content
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Top spacer for overlaid search bar and back button
                    Color.clear.frame(height: 60)

                    if let collection = viewModel.collection {
                        // Collection header
                        VStack(alignment: .leading, spacing: .mgSpacing6) {
                            Text(collection.title)
                                .font(.mgTitle)
                                .foregroundStyle(Color.mgPrimary)

                            if let subtitle = collection.subtitle {
                                Text(subtitle)
                                    .font(.mgSubheadline)
                                    .foregroundStyle(Color.mgSecondary)
                                    .lineSpacing(2)
                            }
                        }
                        .padding(.mgSpacing20)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.mgBackground)
                        .overlay(
                            Rectangle()
                                .fill(Color.mgSecondary.opacity(0.2))
                                .frame(height: 1),
                            alignment: .bottom
                        )

                        // Empty state (collection loaded but no movies)
                        if viewModel.movies.isEmpty {
                            VStack(spacing: .mgSpacing16) {
                                Text("📚")
                                    .font(.system(size: 64))
                                    .padding(.top, 60)

                                Text("No movies in this collection")
                                    .font(.mgHeadline)
                                    .foregroundStyle(Color.mgPrimary)

                                Text("This collection is currently empty")
                                    .font(.mgCallout)
                                    .foregroundStyle(Color.mgSecondary)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, .mgSpacing32)
                        } else {
                            // Subcategories
                            if let subcategories = collection.subcategories {
                                ForEach(Array(subcategories.enumerated()), id: \.element.id) { index, subcategory in
                                    SubcategorySection(
                                        subcategory: subcategory,
                                        movies: viewModel.moviesForSubcategory(subcategory),
                                        isFirst: index == 0
                                    )
                                }
                            }
                        }

                        // Footer
                        if !viewModel.movies.isEmpty {
                            HStack {
                                Text("\(viewModel.movies.count) films")
                                Text("·")
                                Text(collection.title)
                            }
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgSecondary)
                            .kerning(0.3)
                            .padding(.horizontal, .mgSpacing16)
                            .padding(.top, .mgSpacing32)
                            .padding(.bottom, .mgSpacing48)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .overlay(
                                Rectangle()
                                    .fill(Color.mgSecondary.opacity(0.2))
                                    .frame(height: 1),
                                alignment: .top
                            )
                        }
                    } else if viewModel.isLoading {
                        VStack(spacing: .mgSpacing16) {
                            ProgressView()
                                .tint(Color.mgGold)
                            Text("Loading collection...")
                                .font(.mgCallout)
                                .foregroundStyle(Color.mgSecondary)
                        }
                        .padding(.top, 100)
                    } else if let error = viewModel.error {
                        VStack(spacing: .mgSpacing16) {
                            Text("📚")
                                .font(.system(size: 64))
                            Text("Failed to load collection")
                                .font(.mgHeadline)
                            Text(error.localizedDescription)
                                .font(.mgCaption)
                                .foregroundStyle(Color.mgSecondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, .mgSpacing32)
                            Button("Retry") {
                                Task {
                                    await viewModel.loadCollection()
                                }
                            }
                            .buttonStyle(MGGlassButtonStyle())
                        }
                        .padding()
                        .padding(.top, 80)
                    }
                }
            }
            .scrollIndicators(.hidden)

            // Overlaid back button and search bar
            VStack(spacing: 0) {
                AppHeader(showBackButton: true)

                Spacer()
            }
        }
        .background(Color.mgBackground)
        .navigationBarHidden(true)
        .enableSwipeBack()
        .task {
            await viewModel.loadCollection()
        }
    }
}

struct SubcategorySection: View {
    let subcategory: Subcategory
    let movies: [CollectionDetailMovie]
    let isFirst: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Aisle marker with gold accent
            HStack(alignment: .center, spacing: .mgSpacing12) {
                // Gold vertical bar
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(Color.mgGold)
                    .frame(width: 3, height: 22)

                // Subcategory name
                Text(subcategory.name)
                    .font(.mgTitle3)
                    .foregroundStyle(Color.mgPrimary)
                    .kerning(-0.2)
                    .lineLimit(2)

                Spacer()
            }
            .padding(.horizontal, .mgSpacing16)
            .padding(.top, isFirst ? .mgSpacing16 : .mgSpacing32)
            .padding(.bottom, .mgSpacing6)

            // Description (if exists)
            if let description = subcategory.description {
                Text(description)
                    .font(.mgSubheadline)
                    .foregroundStyle(Color.mgSecondary)
                    .lineSpacing(2)
                    .padding(.horizontal, .mgSpacing16)
                    .padding(.bottom, .mgSpacing16)
            }

            // 3-column movie grid
            if !movies.isEmpty {
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: .mgSpacing12),
                    GridItem(.flexible(), spacing: .mgSpacing12),
                    GridItem(.flexible(), spacing: .mgSpacing12)
                ], spacing: .mgSpacing12) {
                    ForEach(movies) { movie in
                        NavigationLink(destination: MovieDetailView(tmdbId: movie.tmdbId)) {
                            MovieGridCard(movie: movie)
                        }
                        .buttonStyle(MGCardButtonStyle())
                        .sensoryFeedback(.selection, trigger: movie.tmdbId)
                    }
                }
                .padding(.horizontal, .mgSpacing16)
                .padding(.top, .mgSpacing16)
            }
        }
        .padding(.bottom, .mgSpacing8)
    }
}

struct MovieGridCard: View {
    let movie: CollectionDetailMovie
    @State private var imageLoaded = false

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing6) {
            // Poster
            AsyncImage(url: posterURL) { phase in
                switch phase {
                case .empty:
                    posterPlaceholder
                        .overlay {
                            ProgressView()
                                .tint(Color.mgGold)
                        }
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(2/3, contentMode: .fill)
                        .opacity(imageLoaded ? 1 : 0)
                        .onAppear {
                            withAnimation(.easeIn(duration: 0.3)) {
                                imageLoaded = true
                            }
                        }
                case .failure:
                    posterPlaceholder
                @unknown default:
                    posterPlaceholder
                }
            }
            .aspectRatio(2/3, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
            .mgCinematicGlow()
            .mgElevationLow()

            // Title
            Text(movie.title)
                .font(.mgCaption)
                .fontWeight(.medium)
                .foregroundStyle(Color.mgPrimary)
                .fixedSize(horizontal: false, vertical: true)
                .lineSpacing(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Year
            if let year = movie.year {
                Text(String(year))
                    .font(.mgCaption2)
                    .foregroundStyle(Color.mgSecondary)
            }
        }
    }

    private var posterURL: URL? {
        guard let posterUrl = movie.posterUrl else { return nil }
        return URL(string: posterUrl)
    }

    private var posterPlaceholder: some View {
        RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
            .fill(Color.mgSecondary.opacity(0.15))
            .aspectRatio(2/3, contentMode: .fit)
            .overlay(
                VStack(spacing: .mgSpacing4) {
                    Image(systemName: "film")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.mgTertiary)
                    if let year = movie.year {
                        Text(String(year))
                            .font(.mgCaption2)
                            .foregroundStyle(Color.mgTertiary)
                    }
                }
            )
    }
}

#Preview {
    NavigationStack {
        CollectionDetailView(collectionId: "demo")
    }
}
