//
//  SearchView.swift
//  moviegenius
//
//  Search movies with big centered search box
//

import SwiftUI
import Combine

struct SearchView: View {
    @StateObject private var viewModel = SearchViewModel()

    var body: some View {
        ZStack {
            // Gold background
            Color.mgGold.ignoresSafeArea()

            if viewModel.searchText.isEmpty || viewModel.searchText.count < 3 {
                // Empty state: big search box in center
                VStack {
                    Spacer()

                    VStack(spacing: .mgSpacing24) {
                        // Big search box
                        HStack(spacing: .mgSpacing12) {
                            Image(systemName: "magnifyingglass")
                                .foregroundStyle(.black.opacity(0.6))
                                .font(.system(size: 24))

                            TextField("Search movies...", text: $viewModel.searchText)
                                .font(.system(size: 20))
                                .foregroundStyle(.black)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .submitLabel(.search)

                            if !viewModel.searchText.isEmpty {
                                Button(action: {
                                    viewModel.searchText = ""
                                }) {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundStyle(.black.opacity(0.4))
                                        .font(.system(size: 20))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, .mgSpacing20)
                        .padding(.vertical, .mgSpacing16)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous))
                        .shadow(color: .black.opacity(0.1), radius: 12, x: 0, y: 4)

                        // Always show hint when not searching (empty or <3 chars)
                        Text(viewModel.searchText.isEmpty ? "Type 3+ characters to search" : "Type \(3 - viewModel.searchText.count) more character\(3 - viewModel.searchText.count == 1 ? "" : "s")")
                            .font(.mgSubheadline)
                            .foregroundStyle(.black.opacity(0.7))
                    }
                    .padding(.horizontal, .mgSpacing32)

                    Spacer()
                }
            } else {
                // Search results
                VStack(spacing: 0) {
                    // Small search bar at top
                    HStack(spacing: .mgSpacing8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(.black.opacity(0.6))
                            .font(.system(size: 16))

                        TextField("Search movies...", text: $viewModel.searchText)
                            .font(.mgBody)
                            .foregroundStyle(.black)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .submitLabel(.search)

                        if !viewModel.searchText.isEmpty {
                            Button(action: {
                                viewModel.searchText = ""
                            }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.black.opacity(0.4))
                                    .font(.system(size: 16))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, .mgSpacing12)
                    .padding(.vertical, .mgSpacing8)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
                    .padding(.horizontal, .mgSpacing16)
                    .padding(.top, .mgSpacing8)
                    .padding(.bottom, .mgSpacing8)

                    // Results
                    if viewModel.isLoading {
                        LoadingState()
                    } else if let error = viewModel.error {
                        ErrorState(message: error)
                    } else if viewModel.results.isEmpty {
                        NoResultsState(query: viewModel.searchText)
                    } else {
                        SearchResultsList(
                            query: viewModel.searchText,
                            results: viewModel.results
                        )
                    }
                }
                .background(Color.mgGroupedBackground)
            }
        }
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

                guard text.count >= 3 else {
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
}

// MARK: - State Views

struct LoadingState: View {
    var body: some View {
        VStack(spacing: .mgSpacing16) {
            ProgressView()
                .tint(Color.mgGold)
                .scaleEffect(1.5)

            Text("Searching...")
                .font(.mgCallout)
                .foregroundStyle(Color.mgSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }
}

struct ErrorState: View {
    let message: String

    var body: some View {
        VStack(spacing: .mgSpacing16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.red)

            Text("Search Error")
                .font(.mgHeadline)
                .foregroundStyle(Color.mgPrimary)

            Text(message)
                .font(.mgSubheadline)
                .foregroundStyle(Color.mgSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, .mgSpacing32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }
}

struct NoResultsState: View {
    let query: String

    var body: some View {
        VStack(spacing: .mgSpacing16) {
            Image(systemName: "film")
                .font(.system(size: 48))
                .foregroundStyle(Color.mgSecondary.opacity(0.5))

            Text("No movies found")
                .font(.mgHeadline)
                .foregroundStyle(Color.mgPrimary)

            Text("Try a different search term")
                .font(.mgSubheadline)
                .foregroundStyle(Color.mgSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }
}

// MARK: - Results List

struct SearchResultsList: View {
    let query: String
    let results: [SearchMovie]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Results count header
                Text("\(results.count) \(results.count == 1 ? "result" : "results")")
                    .font(.mgCaption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.mgSecondary)
                    .textCase(.uppercase)
                    .tracking(0.5)
                    .padding(.horizontal, .mgSpacing16)
                    .padding(.top, .mgSpacing16)
                    .padding(.bottom, .mgSpacing12)

                // Movie items
                LazyVStack(spacing: 0) {
                    ForEach(results) { movie in
                        NavigationLink(destination: MovieDetailView(tmdbId: movie.tmdbId)) {
                            SearchResultRow(movie: movie)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .background(Color.mgBackground)
            }
        }
    }
}

struct SearchResultRow: View {
    let movie: SearchMovie

    var body: some View {
        HStack(alignment: .center, spacing: .mgSpacing12) {
            // Poster thumbnail
            AsyncImage(url: posterURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .empty, .failure, _:
                    RoundedRectangle(cornerRadius: .mgCornerTiny)
                        .fill(Color.mgSecondary.opacity(0.15))
                        .overlay(
                            Image(systemName: "film")
                                .foregroundStyle(Color.mgSecondary)
                                .font(.system(size: 16))
                        )
                }
            }
            .frame(width: 40, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: .mgCornerTiny))

            // Movie info
            VStack(alignment: .leading, spacing: 2) {
                Text(movie.title)
                    .font(.mgCallout)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.mgPrimary)
                    .fixedSize(horizontal: false, vertical: true)

                if let year = movie.year {
                    Text(String(year))
                        .font(.mgCaption)
                        .foregroundStyle(Color.mgSecondary)
                }
            }

            Spacer()

            // Chevron
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.mgSecondary)
        }
        .padding(.horizontal, .mgSpacing16)
        .padding(.vertical, .mgSpacing12)
        .background(Color.mgBackground)
        .overlay(
            Rectangle()
                .fill(Color.mgSecondary.opacity(0.1))
                .frame(height: 1),
            alignment: .bottom
        )
    }

    private var posterURL: URL? {
        guard let posterUrl = movie.posterUrl else { return nil }
        return URL(string: posterUrl)
    }
}

#Preview {
    NavigationStack {
        SearchView()
    }
}
