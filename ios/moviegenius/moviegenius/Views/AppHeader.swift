//
//  AppHeader.swift
//  moviegenius
//
//  Reusable header with back button and centered search bar
//  Used on all pages for consistent navigation
//
//  USAGE POLICY:
//  ============
//
//  ## When to Use AppHeader
//
//  ✅ Use AppHeader for ALL full-screen views that need:
//     - Search functionality (centered search bar)
//     - Optional back button navigation
//     - Consistent 60pt header height across the app
//
//  ## Parameters
//
//  - `showBackButton: Bool` (default: false)
//    - `false`: Root views (HomeView, GeniusView, etc.)
//    - `true`: Detail views (CollectionDetailView, MovieDetailView, etc.)
//
//  ## Implementation Pattern
//
//  ALL views using AppHeader must follow this structure:
//
//  ```swift
//  var body: some View {
//      ZStack(alignment: .top) {
//          // 1. Main scrolling content
//          ScrollView {
//              VStack(spacing: 0) {
//                  // REQUIRED: Top spacer for header
//                  Color.clear.frame(height: 60)
//
//                  // Your content here...
//              }
//          }
//
//          // 2. Overlaid AppHeader (stays on top while scrolling)
//          VStack {
//              AppHeader(showBackButton: true) // or false
//              Spacer()
//          }
//      }
//      .background(Color.mgBackground)
//      .navigationBarHidden(true) // REQUIRED
//  }
//  ```
//
//  ## Key Requirements
//
//  1. **ZStack Layout**: AppHeader overlays content using ZStack
//  2. **60pt Spacer**: Add `Color.clear.frame(height: 60)` at top of ScrollView content
//  3. **Hide Nav Bar**: Always use `.navigationBarHidden(true)`
//  4. **VStack Wrapper**: Wrap AppHeader in VStack with Spacer() to keep it at top
//
//  ## Examples
//
//  Root view (no back button):
//  ```swift
//  AppHeader() // or AppHeader(showBackButton: false)
//  ```
//
//  Detail view (with back button):
//  ```swift
//  AppHeader(showBackButton: true)
//  ```
//
//  ## Component Features
//
//  - **Height**: 60pt total (8pt vertical padding + 44pt content)
//  - **Search bar width**: 240pt fixed (centered)
//  - **Back button**: 44x44pt tap target (left side when enabled)
//  - **Background**: Semi-transparent (0.95 opacity) for subtle scroll-under effect
//  - **Search**: Tapping opens full-screen SearchView modal
//
//  ## DO NOT
//
//  ❌ DO NOT modify AppHeader spacing/sizing without updating all views
//  ❌ DO NOT use custom headers - always use AppHeader for consistency
//  ❌ DO NOT forget the 60pt spacer - content will appear under the header
//  ❌ DO NOT use NavigationBar alongside AppHeader - they conflict
//

import SwiftUI
import Combine

struct AppHeader: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var auth = AuthManager.shared
    @State private var showSignOutConfirmation = false
    @StateObject private var searchViewModel = InlineSearchViewModel()
    @State private var showInlineResults = false
    let showBackButton: Bool

    init(showBackButton: Bool = false) {
        self.showBackButton = showBackButton
    }

    var body: some View {
        ZStack(alignment: .top) {
            // Dismiss backdrop (tap outside to close)
            if showInlineResults {
                Color.black.opacity(0.001) // Nearly invisible, but tappable
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showInlineResults = false
                            searchViewModel.searchText = ""
                        }
                    }
                    .transition(.opacity)
            }

            // Header and results
            VStack(spacing: 0) {
                // Header bar
                HStack(spacing: .mgSpacing8) {
                    // Back button or spacer (keeps search centered consistently)
                    if showBackButton {
                        Button {
                            dismiss()
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(Color.mgGold)
                                .frame(width: 44, height: 44)
                                .contentShape(Rectangle())
                        }
                    } else {
                        Color.clear
                            .frame(width: 44, height: 44)
                    }

                    // Search bar (centered)
                    Spacer()
                    SearchBarCompactInline(
                        viewModel: searchViewModel,
                        showResults: $showInlineResults
                    )
                    Spacer()

                    // Sign-in indicator / Logout button
                    if auth.isAuthenticated {
                        Button {
                            showSignOutConfirmation = true
                        } label: {
                            Image(systemName: "person.circle.fill")
                                .font(.system(size: 24))
                                .foregroundStyle(Color.mgGold)
                                .frame(width: 44, height: 44)
                                .contentShape(Rectangle())
                        }
                        .confirmationDialog("Sign Out", isPresented: $showSignOutConfirmation) {
                            Button("Sign Out", role: .destructive) {
                                auth.signOut()
                            }
                            Button("Cancel", role: .cancel) {}
                        } message: {
                            if let email = auth.currentUser?.email {
                                Text("Signed in as \(email)")
                            } else {
                                Text("Are you sure you want to sign out?")
                            }
                        }
                    } else {
                        Color.clear
                            .frame(width: 44, height: 44)
                    }
                }
                .padding(.horizontal, .mgSpacing16)
                .padding(.vertical, .mgSpacing8)
                .background(Color.mgBackground.opacity(0.95))

                // Inline search results
                if showInlineResults {
                    InlineSearchResults(
                        results: searchViewModel.results,
                        collections: searchViewModel.collections,  // COLLECTION_SEARCH: Pass collections
                        isSearching: searchViewModel.isSearching,
                        hasCompletedSearch: searchViewModel.hasCompletedSearch,
                        onDismiss: {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                showInlineResults = false
                                searchViewModel.searchText = ""
                            }
                        }
                    )
                    .transition(.move(edge: .top).combined(with: .opacity))
                }

                Spacer(minLength: 0)
            }
        }
    }
}

// MARK: - Inline Search Bar for Header

struct SearchBarCompactInline: View {
    @ObservedObject var viewModel: InlineSearchViewModel
    @Binding var showResults: Bool
    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: .mgSpacing8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Color.mgSecondary)
                .font(.system(size: 16))

            TextField("Search movies...", text: $viewModel.searchText)
                .font(.mgBody)
                .foregroundStyle(Color.mgPrimary)
                .focused($isFocused)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .submitLabel(.search)
                .onChange(of: isFocused) { _, focused in
                    if focused && !viewModel.searchText.isEmpty {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showResults = true
                        }
                    } else if !focused {
                        // Delay to allow tapping results
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                showResults = false
                            }
                        }
                    }
                }
                .onChange(of: viewModel.searchText) { _, text in
                    if isFocused && !text.isEmpty {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showResults = true
                        }
                    } else {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showResults = false
                        }
                    }
                }

            if !viewModel.searchText.isEmpty {
                Button(action: {
                    viewModel.searchText = ""
                    isFocused = false
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showResults = false
                    }
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Color.mgTertiary)
                        .font(.system(size: 16))
                }
                .buttonStyle(.plain)
            }
        }
        .frame(width: 240)
        .padding(.horizontal, .mgSpacing12)
        .padding(.vertical, .mgSpacing8)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
                .strokeBorder(isFocused ? Color.mgGold : Color.mgSecondary.opacity(0.2), lineWidth: isFocused ? 2 : 1)
        )
    }
}

// MARK: - Inline Search Results

struct InlineSearchResults: View {
    let results: [SearchMovie]
    let collections: [SearchCollection]  // COLLECTION_SEARCH: Easy rollback
    let isSearching: Bool
    let hasCompletedSearch: Bool
    let onDismiss: () -> Void

    var body: some View {
        ScrollView {
            if isSearching {
                // Loading state
                VStack(spacing: .mgSpacing16) {
                    ProgressView()
                        .tint(Color.mgGold)
                    Text("Searching...")
                        .font(.mgCallout)
                        .foregroundStyle(Color.mgSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, .mgSpacing32)
            } else if results.isEmpty && collections.isEmpty && hasCompletedSearch {
                // Empty state - only show after a search has completed
                VStack(spacing: .mgSpacing12) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 32))
                        .foregroundStyle(Color.mgSecondary)
                    Text("No results found")
                        .font(.mgCallout)
                        .foregroundStyle(Color.mgSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, .mgSpacing32)
            } else {
                // Results
                LazyVStack(spacing: .mgSpacing12) {
                    // COLLECTION_SEARCH: Collections section (delete to rollback)
                    if !collections.isEmpty {
                        VStack(alignment: .leading, spacing: .mgSpacing8) {
                            Text("Collections")
                                .font(.mgCaption)
                                .foregroundStyle(Color.mgSecondary)
                                .padding(.horizontal, .mgSpacing20)

                            ForEach(collections) { collection in
                                CollectionSearchCard(collection: collection)
                            }
                            .padding(.horizontal, .mgSpacing20)
                        }

                        if !results.isEmpty {
                            Divider()
                                .padding(.horizontal, .mgSpacing20)
                                .padding(.vertical, .mgSpacing8)
                        }
                    }

                    // Movies section
                    if !results.isEmpty {
                        VStack(alignment: .leading, spacing: .mgSpacing8) {
                            Text("Movies")
                                .font(.mgCaption)
                                .foregroundStyle(Color.mgSecondary)
                                .padding(.horizontal, .mgSpacing20)

                            ForEach(results) { movie in
                                StandardMovieCard(
                                    tmdbId: movie.tmdbId,
                                    title: movie.title,
                                    year: movie.year,
                                    posterUrl: movie.posterUrl,
                                    slug: nil,
                                    onDarkBackground: false
                                )
                            }
                        }
                    }
                }
                .padding(.vertical, .mgSpacing12)
            }
        }
        .frame(maxHeight: 400)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous))
        .padding(.horizontal, .mgSpacing16)
        .mgShadowMedium()
    }
}

// MARK: - Inline Search ViewModel

@MainActor
class InlineSearchViewModel: ObservableObject {
    @Published var searchText = ""
    @Published var results: [SearchMovie] = []
    @Published var collections: [SearchCollection] = []  // COLLECTION_SEARCH: Easy rollback
    @Published var isSearching = false
    @Published var hasCompletedSearch = false // Only show empty state after first search completes

    private var searchTask: Task<Void, Never>?
    private var resultCache: [String: [SearchMovie]] = [:] // Cache results by query
    private var collectionCache: [String: [SearchCollection]] = [:]  // COLLECTION_SEARCH: Cache collections

    init() {
        Task {
            for await text in $searchText.values {
                searchTask?.cancel()

                // Require at least 1 character
                guard !text.isEmpty else {
                    results = []
                    collections = []  // COLLECTION_SEARCH: Reset collections
                    isSearching = false
                    hasCompletedSearch = false
                    continue
                }

                // Check cache first for common 1-2 character prefixes
                let cacheKey = text.lowercased()
                if let cachedResults = resultCache[cacheKey],
                   let cachedCollections = collectionCache[cacheKey] {
                    results = cachedResults
                    collections = cachedCollections  // COLLECTION_SEARCH: Use cached collections
                    isSearching = false
                    hasCompletedSearch = true
                    continue
                }

                // Show loading state
                isSearching = true

                searchTask = Task {
                    try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce
                    guard !Task.isCancelled else {
                        await MainActor.run { isSearching = false }
                        return
                    }
                    await performSearch(query: text)
                }
            }
        }
    }

    private func performSearch(query: String) async {
        #if DEBUG
        print("🔍 [InlineSearch] Searching for: '\(query)'")
        #endif

        do {
            let response = try await APIClient.shared.search(query: query)
            guard !Task.isCancelled else {
                #if DEBUG
                print("🔍 [InlineSearch] Task cancelled")
                #endif
                isSearching = false
                return
            }

            #if DEBUG
            print("🔍 [InlineSearch] Got \(response.movies.count) results")
            if let first = response.movies.first {
                print("   First result: \(first.title) (\(first.year ?? 0)) - contentScore: \(first.contentScore)")
            }
            // COLLECTION_SEARCH: Debug logging
            if let responseCollections = response.collections {
                print("🔍 [InlineSearch] Got \(responseCollections.count) collections")
            }
            #endif

            // Use API ordering (already ranked by title relevance)
            results = response.movies
            collections = response.collections ?? []  // COLLECTION_SEARCH: Extract collections
            isSearching = false
            hasCompletedSearch = true

            // Cache results for 1-2 character queries (most common)
            if query.count <= 2 {
                resultCache[query.lowercased()] = response.movies
                collectionCache[query.lowercased()] = response.collections ?? []  // COLLECTION_SEARCH: Cache collections
            }
        } catch {
            #if DEBUG
            print("🔍 [InlineSearch] Search failed: \(error)")
            #endif
            guard !Task.isCancelled else {
                isSearching = false
                return
            }
            results = []
            collections = []  // COLLECTION_SEARCH: Reset on error
            isSearching = false
            hasCompletedSearch = true
        }
    }
}

// MARK: - COLLECTION_SEARCH: Collection Search Card (Easy Rollback)
// To remove this feature: Delete this component and collection-related code from InlineSearchResults

struct CollectionSearchCard: View {
    let collection: SearchCollection

    var body: some View {
        VStack {
            HStack(spacing: .mgSpacing12) {
                // Collection icon/posters
                HStack(spacing: 4) {
                    ForEach(collection.topPosterUrls.prefix(3), id: \.self) { posterUrl in
                        AsyncImage(url: URL(string: posterUrl)) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            case .failure, .empty:
                                Color.mgSecondary.opacity(0.2)
                            @unknown default:
                                Color.mgSecondary.opacity(0.2)
                            }
                        }
                        .frame(width: 28, height: 42)
                        .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                    }
                }
                .frame(width: 92, height: 42)

                // Collection info
                VStack(alignment: .leading, spacing: 2) {
                    Text(collection.title)
                        .font(.mgCallout)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.mgPrimary)
                        .lineLimit(1)

                    if let subtitle = collection.subtitle {
                        Text(subtitle)
                            .font(.mgCaption2)
                            .foregroundStyle(Color.mgSecondary)
                            .lineLimit(1)
                    }

                    Text("\(collection.category) • \(collection.movieCount) films")
                        .font(.mgCaption2)
                        .foregroundStyle(Color.mgTertiary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.mgTertiary)
            }
        }
        .padding(.horizontal, .mgSpacing16)
        .padding(.vertical, .mgSpacing12)
        .background(Color.mgSecondaryBackground)
        .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous))
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

#Preview("App Header") {
    AppHeader()
}
