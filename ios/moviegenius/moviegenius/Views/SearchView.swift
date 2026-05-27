//
//  SearchView.swift
//  moviegenius
//
//  Full-screen search with standard movie cards
//

import SwiftUI
import Combine

struct SearchView: View {
    @StateObject private var viewModel: SearchViewModel

    init(viewModel: SearchViewModel? = nil) {
        self._viewModel = StateObject(wrappedValue: viewModel ?? SearchViewModel())
    }

    var body: some View {
        VStack(spacing: 0) {
            // Content
            if viewModel.searchText.isEmpty || viewModel.searchText.count < 2 {
                    // Empty state
                    VStack(spacing: .mgSpacing16) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 64))
                            .foregroundStyle(Color.mgSecondary.opacity(0.3))
                            .padding(.top, 100)

                        Text("Search for movies")
                            .font(.mgTitle2)
                            .foregroundStyle(Color.mgPrimary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.isLoading {
                    VStack(spacing: .mgSpacing16) {
                        ProgressView()
                            .tint(Color.mgGold)
                            .scaleEffect(1.2)
                        Text("Searching...")
                            .font(.mgCallout)
                            .foregroundStyle(Color.mgSecondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.top, 100)
                } else if let error = viewModel.error {
                    VStack(spacing: .mgSpacing16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48))
                            .foregroundStyle(.red)
                        Text("Search Error")
                            .font(.mgHeadline)
                        Text(error)
                            .font(.mgSubheadline)
                            .foregroundStyle(Color.mgSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, .mgSpacing32)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.top, 100)
                } else if viewModel.results.isEmpty {
                    VStack(spacing: .mgSpacing16) {
                        Image(systemName: "film")
                            .font(.system(size: 48))
                            .foregroundStyle(Color.mgSecondary.opacity(0.5))
                        Text("No movies found")
                            .font(.mgHeadline)
                        Text("Try a different search term")
                            .font(.mgSubheadline)
                            .foregroundStyle(Color.mgSecondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.top, 100)
                } else {
                    // Results list with standard cards
                    SearchResultsList(results: viewModel.results)
                }
            }
        .background(Color.mgBackground)
        .searchable(text: $viewModel.searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search movies...")
    }
}

// MARK: - View Model

@MainActor
class SearchViewModel: ObservableObject {
    @Published var searchText = ""
    @Published var results: [SearchMovie] = []
    @Published var isLoading = false
    @Published var error: String?

    private var searchTask: Task<Void, Never>?

    init() {
        // Observe search text changes with debounce
        Task {
            for await text in $searchText.values {
                searchTask?.cancel()

                guard text.count >= 2 else {
                    results = []
                    error = nil
                    continue
                }

                searchTask = Task {
                    try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce

                    guard !Task.isCancelled else { return }

                    await performSearch(query: text)
                }
            }
        }
    }

    private func performSearch(query: String) async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.search(query: query)

            guard !Task.isCancelled else { return }

            results = response.movies
            isLoading = false
        } catch {
            guard !Task.isCancelled else { return }

            self.error = "Search failed. Please try again."
            results = []
            isLoading = false
        }
    }

    func clearSearch() {
        searchText = ""
        results = []
        error = nil
        isLoading = false
        searchTask?.cancel()
    }
}

// MARK: - Results List (Netflix-style carousel)

struct SearchResultsList: View {
    let results: [SearchMovie]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Results count header
            HStack {
                Text("\(results.count) \(results.count == 1 ? "result" : "results")")
                    .font(.mgCaption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.mgSecondary)
                    .textCase(.uppercase)
                    .tracking(0.5)
                Spacer()
            }
            .padding(.horizontal, .mgSpacing16)
            .padding(.top, .mgSpacing16)
            .padding(.bottom, .mgSpacing12)

            // Horizontal carousel
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(alignment: .top, spacing: .mgSpacing16) {
                    ForEach(results.indices, id: \.self) { index in
                        let movie = results[index]
                        NavigationLink(value: MovieDestination.detail(tmdbId: movie.tmdbId)) {
                            SearchPosterCard(movie: movie)
                        }
                        .buttonStyle(MGCardButtonStyle())
                        .padding(.leading, index == 0 ? .mgSpacing16 : 0)
                        .padding(.trailing, index == results.count - 1 ? .mgSpacing16 : 0)
                    }
                }
            }
            .scrollClipDisabled()
        }
    }
}

// MARK: - Netflix-style Poster Card (80% cover)

struct SearchPosterCard: View {
    let movie: SearchMovie
    @State private var imageLoaded = false

    private let posterWidth: CGFloat = 136 // 80% of carousel poster size (170 * 0.8)

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing8) {
            // Large poster
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
                        .aspectRatio(2/3, contentMode: .fit)
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
            .frame(width: posterWidth)
            .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
            .mgCinematicGlow()
            .mgElevationMedium()

            // Title and year below poster
            VStack(alignment: .leading, spacing: .mgSpacing2) {  // Tightened spacing per user request
                Text(movie.title)
                    .font(.mgBody)
                    .foregroundStyle(Color.mgPrimary)
                    .lineLimit(nil)  // No truncation per MOVIE_REPRESENTATION_SPEC.md
                    .multilineTextAlignment(.leading)

                Text(movie.year.map(String.init) ?? " ")
                    .font(.mgSubheadline)
                    .foregroundStyle(Color.mgSecondary)
            }
            .frame(width: posterWidth, height: 52, alignment: .topLeading)
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
                Image(systemName: "film")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.mgTertiary)
            )
            .contentShape(Rectangle())
    }
}

#Preview {
    SearchView()
}
