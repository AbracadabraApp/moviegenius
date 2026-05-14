//
//  GeniusView.swift
//  moviegenius
//
//  Your cinematic journey with personalized insights and collections
//

import SwiftUI
import Combine

struct GeniusView: View {
    @ObservedObject var favorites = FavoritesManager.shared
    @StateObject private var viewModel = GeniusViewModel()
    @State private var activeTab: GeniusTab = .journey
    @State private var searchText = ""

    enum GeniusTab: String, CaseIterable {
        case journey = "Journey"
        case loved = "Seen"
        case queue = "Queue"

        var icon: String {
            switch self {
            case .journey: return "wand.and.stars"
            case .loved: return "heart.fill"
            case .queue: return "bookmark.fill"
            }
        }
    }

    var journeyStage: (icon: String, title: String, description: String, insight: String?) {
        let totalFilms = favorites.lovedMovies.count

        if totalFilms == 0 {
            return ("film", "Your Cinematic Journey", "Start building your collection", nil)
        } else if totalFilms <= 5 {
            return ("leaf", "Building Foundation", "\(totalFilms) \(totalFilms == 1 ? "film" : "films") seen", "Every film you watch teaches us about your taste")
        } else if totalFilms <= 15 {
            return ("chart.line.uptrend.xyaxis", "Patterns Emerging", "\(totalFilms) films • Taste developing", "Your collection reveals emerging patterns in your preferences")
        } else {
            return ("star", "Sophisticated Profile", "\(totalFilms) films seen", "Your collection spans genres, eras, and storytelling traditions")
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab Bar
            HStack(spacing: 0) {
                ForEach(GeniusTab.allCases, id: \.self) { tab in
                    TabButton(
                        tab: tab,
                        isActive: activeTab == tab,
                        count: tabCount(for: tab)
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            activeTab = tab
                        }
                        HapticManager.selection()
                    }
                }
            }
            .padding(.horizontal, .mgSpacing16)
            .padding(.vertical, .mgSpacing8)
            .background(Color.mgBackground)
            .overlay(
                Rectangle()
                    .fill(Color.mgSecondary.opacity(0.2))
                    .frame(height: 1),
                alignment: .bottom
            )

            // Content
            ScrollView {
                switch activeTab {
                case .journey:
                    JourneyTabContent(
                        stage: journeyStage,
                        lovedCount: favorites.lovedMovies.count,
                        queueCount: favorites.queueMovies.count,
                        genres: viewModel.genres,
                        isLoadingGenres: viewModel.isLoading,
                        onTabSwitch: { tab in
                            withAnimation {
                                activeTab = tab
                            }
                        }
                    )
                case .loved:
                    SeenTabContent(movies: favorites.lovedMovies)
                case .queue:
                    QueueTabContent(movies: favorites.queueMovies)
                }
            }
            .scrollIndicators(.hidden)
            .refreshable {
                favorites.loadFavorites()
                await viewModel.loadGenreExpertise()
            }
        }
        .background(Color.mgGroupedBackground)
        .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search movies")
        .task {
            favorites.loadFavorites()
            await viewModel.loadGenreExpertise()
        }
    }

    private func tabCount(for tab: GeniusTab) -> Int? {
        switch tab {
        case .journey: return nil
        case .loved: return favorites.lovedMovies.count
        case .queue: return favorites.queueMovies.count
        }
    }
}

// MARK: - Tab Button

struct TabButton: View {
    let tab: GeniusView.GeniusTab
    let isActive: Bool
    let count: Int?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: .mgSpacing6) {
                Image(systemName: tab.icon)
                    .font(.system(size: 16, weight: isActive ? .semibold : .regular))

                Text(tab.rawValue)
                    .font(isActive ? .mgCallout.weight(.semibold) : .mgCallout)

                if let count = count {
                    Text("\(count)")
                        .font(.mgCaption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isActive ? Color.mgGold : Color.mgSecondary.opacity(0.2))
                        .foregroundStyle(isActive ? Color.mgPrimary : Color.mgSecondary)
                        .clipShape(Capsule())
                }
            }
            .foregroundStyle(isActive ? Color.mgGold : Color.mgSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, .mgSpacing8)
        }
        .buttonStyle(MGCardButtonStyle())
    }
}

// MARK: - Journey Tab

struct JourneyTabContent: View {
    let stage: (icon: String, title: String, description: String, insight: String?)
    let lovedCount: Int
    let queueCount: Int
    let genres: [GenreExpertise]
    let isLoadingGenres: Bool
    let onTabSwitch: (GeniusView.GeniusTab) -> Void
    @ObservedObject private var favorites = FavoritesManager.shared

    let allCategories = [
        "Action", "Adventure", "Animation", "Comedy", "Crime",
        "Documentary", "Drama", "Espionage", "Fantasy",
        "History", "Horror", "Mystery", "Noir",
        "Romance", "Science Fiction", "Thriller", "War", "Western",
        "Academy Awards", "AFI Awards", "Actors", "Actresses", "Directors"
    ]

    // Two-tier categories require subcategory navigation
    private func isTwoTierCategory(_ category: String) -> Bool {
        ["Academy Awards", "AFI Awards", "Actors", "Actresses", "Directors", "Mystery"].contains(category)
    }

    // Calculate progress for a category (0.0 to 1.0)
    // Uses cached tmdbIds from CategoryProgressManager
    private func categoryProgress(_ category: String) -> Double {
        CategoryProgressManager.shared.progress(for: category, lovedMovies: favorites.lovedMovies)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing24) {
            // Header
            Text("Your Cinematic Journey")
                .font(.mgLargeTitle)
                .foregroundStyle(Color.mgPrimary)
                .padding(.horizontal, .mgSpacing16)
                .padding(.top, .mgSpacing16)

            // Category Collage
            FlowLayout(spacing: .mgSpacing8) {
                ForEach(allCategories, id: \.self) { category in
                    if isTwoTierCategory(category) {
                        NavigationLink(destination: CategorySubcategoriesView(category: category)) {
                            CategoryBadge(
                                category: category,
                                progress: categoryProgress(category)
                            )
                        }
                        .buttonStyle(MGCardButtonStyle())
                    } else {
                        NavigationLink(destination: CategoryEssentialsView(category: category, subcategory: nil)) {
                            CategoryBadge(
                                category: category,
                                progress: categoryProgress(category)
                            )
                        }
                        .buttonStyle(MGCardButtonStyle())
                    }
                }
            }
            .padding(.horizontal, .mgSpacing16)

            Spacer(minLength: .mgSpacing40)
        }
        .padding(.bottom, .mgSpacing40)
    }
}

// MARK: - Category Badge

struct CategoryBadge: View {
    let category: String
    let progress: Double  // 0.0 to 1.0
    @ObservedObject private var favorites = FavoritesManager.shared

    private var badgeColor: Color {
        let percentage = progress * 100
        switch percentage {
        case 0:
            return Color.mgSecondary  // Untouched grey — 0%
        case 0.01..<12:
            return Color(red: 0.70, green: 0.70, blue: 0.70)  // Warm grey — ~10%
        case 12..<25:
            return Color(red: 0.96, green: 0.94, blue: 0.88)  // Cream — ~20%
        case 25..<40:
            return Color(red: 0.98, green: 0.96, blue: 0.90)  // Pale champagne — ~35%
        case 40..<55:
            return Color(red: 0.98, green: 0.95, blue: 0.82)  // Champagne — ~50%
        case 55..<70:
            return Color(red: 0.95, green: 0.87, blue: 0.57)  // Light gold — ~65%
        case 70..<85:
            return Color.mgGold  // MovieGenius Gold — ~80%
        case 85..<96:
            return Color(red: 0.85, green: 0.65, blue: 0.13)  // Rich gold — ~95%
        default:
            return Color(red: 0.72, green: 0.53, blue: 0.04)  // Deep gold — 100%
        }
    }

    private var textColor: Color {
        // Use black text for lighter colors, white for darker golds
        let percentage = progress * 100
        return percentage >= 85 ? .white : .black
    }

    private var isComplete: Bool {
        progress >= 1.0
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Text(category.uppercased())
                .font(.mgCallout)
                .fontWeight(.semibold)
                .foregroundStyle(textColor)
                .padding(.horizontal, .mgSpacing16)
                .padding(.vertical, .mgSpacing8)
                .background(badgeColor)
                .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
                        .strokeBorder(
                            isComplete ? Color.mgGold : Color.clear,
                            lineWidth: isComplete ? 2 : 0
                        )
                )
                .kerning(0.5)

            // Completion badge
            if isComplete {
                Image(systemName: "star.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(Color.mgGold)
                    .padding(3)
                    .background(.black)
                    .clipShape(Circle())
                    .offset(x: 4, y: -4)
            }
        }
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            let position = result.positions[index]
            let finalPosition = CGPoint(x: position.x + bounds.origin.x, y: position.y + bounds.origin.y)
            subview.place(at: finalPosition, proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                lineHeight = max(lineHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + lineHeight)
        }
    }
}


// MARK: - Seen Tab

struct SeenTabContent: View {
    let movies: [SavedMovie]

    var body: some View {
        if movies.isEmpty {
            EmptyStateView(
                icon: "heart",
                title: "No Films Seen Yet",
                description: "Search for films and mark the ones you've watched"
            )
            .padding(.top, 100)
        } else {
            LazyVStack(spacing: .mgSpacing12) {
                ForEach(movies) { movie in
                    MovieRowCard(movie: movie)
                }
            }
            .padding(.mgSpacing16)
        }
    }
}

// MARK: - Queue Tab

struct QueueTabContent: View {
    let movies: [SavedMovie]

    var body: some View {
        if movies.isEmpty {
            EmptyStateView(
                icon: "bookmark",
                title: "Your Queue is Empty",
                description: "Search for films and save ones you want to watch"
            )
            .padding(.top, 100)
        } else {
            LazyVStack(spacing: .mgSpacing12) {
                ForEach(movies) { movie in
                    MovieRowCard(movie: movie)
                }
            }
            .padding(.mgSpacing16)
        }
    }
}

// MARK: - Empty State

struct EmptyStateView: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        VStack(spacing: .mgSpacing16) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(Color.mgSecondary.opacity(0.5))

            Text(title)
                .font(.mgHeadline)
                .foregroundStyle(Color.mgPrimary)

            Text(description)
                .font(.mgSubheadline)
                .foregroundStyle(Color.mgSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, .mgSpacing32)
        }
    }
}

// MARK: - Movie Row Card

struct MovieRowCard: View {
    let movie: SavedMovie

    var body: some View {
        NavigationLink(destination: MovieDetailView(tmdbId: movie.id)) {
            HStack(spacing: .mgSpacing12) {
                // Poster
                AsyncImage(url: posterURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(2/3, contentMode: .fill)
                    case .empty, .failure, _:
                        RoundedRectangle(cornerRadius: .mgCornerSmall)
                            .fill(Color.mgSecondary.opacity(0.15))
                            .overlay(
                                Image(systemName: "film")
                                    .foregroundStyle(Color.mgSecondary)
                            )
                    }
                }
                .frame(width: 60, height: 90)
                .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall))

                // Info
                VStack(alignment: .leading, spacing: .mgSpacing4) {
                    Text(movie.title)
                        .font(.mgHeadline)
                        .foregroundStyle(Color.mgPrimary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.mgSecondary)
            }
            .padding(.mgSpacing12)
            .mgCard()
        }
        .buttonStyle(MGCardButtonStyle())
    }

    private var posterURL: URL? {
        guard let posterUrl = movie.posterUrl else { return nil }
        return URL(string: posterUrl)
    }
}

// MARK: - Category Subcategories View

struct CategorySubcategoriesView: View {
    let category: String
    @ObservedObject private var favorites = FavoritesManager.shared

    private var subcategories: [String] {
        CategoryEssentials.subcategories(for: category)
    }

    private func subcategoryProgress(_ subcategory: String) -> Double {
        CategoryProgressManager.shared.progress(
            for: "\(category):\(subcategory)",
            lovedMovies: favorites.lovedMovies
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: .mgSpacing16) {
                // Header
                Text(category)
                    .font(.mgTitle2)
                    .foregroundStyle(Color.mgSecondary)
                    .padding(.horizontal, .mgSpacing20)
                    .padding(.top, .mgSpacing8)

                // Subcategory badges
                FlowLayout(spacing: .mgSpacing8) {
                    ForEach(subcategories, id: \.self) { subcategory in
                        NavigationLink(destination: CategoryEssentialsView(category: category, subcategory: subcategory)) {
                            CategoryBadge(
                                category: subcategory,
                                progress: subcategoryProgress(subcategory)
                            )
                        }
                        .buttonStyle(MGCardButtonStyle())
                    }
                }
                .padding(.horizontal, .mgSpacing16)

                Spacer(minLength: .mgSpacing40)
            }
            .padding(.vertical, .mgSpacing12)
        }
        .background(Color.mgBackground)
        .navigationTitle(category)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                SearchBarCompactSmaller()
            }
        }
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
    }
}

// MARK: - Category Essentials View

struct CategoryEssentialsView: View {
    let category: String
    let subcategory: String?
    @StateObject private var viewModel: CategoryEssentialsViewModel
    @ObservedObject private var favorites = FavoritesManager.shared

    init(category: String, subcategory: String? = nil) {
        self.category = category
        self.subcategory = subcategory
        _viewModel = StateObject(wrappedValue: CategoryEssentialsViewModel(category: category, subcategory: subcategory))
    }

    // Count how many movies in this list have been seen
    private var seenCount: Int {
        let lovedIds = Set(favorites.lovedMovies.map { $0.id })
        return viewModel.movies.filter { lovedIds.contains($0.tmdbId) }.count
    }

    private var totalCount: Int {
        viewModel.movies.count
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: .mgSpacing16) {
                // Progress header (only show when movies loaded)
                if !viewModel.isLoading && viewModel.error == nil && !viewModel.movies.isEmpty {
                    CategoryProgressHeader(
                        seenCount: seenCount,
                        totalCount: totalCount,
                        category: category
                    )
                    .padding(.horizontal, .mgSpacing20)
                    .padding(.top, .mgSpacing8)
                }

                if viewModel.isLoading {
                    VStack(spacing: .mgSpacing12) {
                        ProgressView()
                            .tint(Color.mgGold)
                        Text("Loading essentials...")
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, .mgSpacing32)
                } else if let error = viewModel.error {
                    VStack(spacing: .mgSpacing12) {
                        Text("Failed to load")
                            .font(.mgHeadline)
                        Text(error.localizedDescription)
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgSecondary)
                    }
                    .padding(.horizontal, .mgSpacing20)
                } else {
                    // Films in More Ideas card format
                    LazyVStack(spacing: .mgSpacing16) {
                        ForEach(viewModel.movies) { movie in
                            NavigationLink(destination: MovieDetailView(tmdbId: movie.tmdbId)) {
                                EssentialFilmCard(movie: movie)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, .mgSpacing20)
                }
            }
            .padding(.vertical, .mgSpacing12)
        }
        .background(Color.mgBackground)
        .navigationTitle(subcategory ?? category)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                SearchBarCompactSmaller()
            }
        }
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
        .task {
            await viewModel.loadMovies()
        }
    }
}

struct EssentialFilmCard: View {
    let movie: EssentialMovie

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: .mgSpacing16) {
                // Poster (left side)
                AsyncImage(url: posterURL) { phase in
                    switch phase {
                    case .empty:
                        posterPlaceholder
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(2/3, contentMode: .fill)
                    case .failure:
                        posterPlaceholder
                    @unknown default:
                        posterPlaceholder
                    }
                }
                .frame(width: 140, height: 210)
                .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous))

                // Content (right side)
                VStack(alignment: .leading, spacing: .mgSpacing8) {
                    // Title
                    Text(movie.title)
                        .font(.mgHeadline)
                        .foregroundStyle(Color.mgPrimary)

                    // Slug (full text, no truncation)
                    Text(movie.slug)
                        .font(.mgSubheadline)
                        .foregroundStyle(Color.mgPrimary)
                        .lineLimit(nil)
                        .fixedSize(horizontal: false, vertical: true)

                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: 210, alignment: .topLeading)
            }

            // Favorite buttons (bottom-right of card)
            HStack {
                Spacer()
                FavoriteButtons(
                    tmdbId: movie.tmdbId,
                    title: movie.title,
                    year: movie.year,
                    posterUrl: movie.posterUrl,
                    slug: movie.slug,
                    compact: false,
                    onDarkBackground: false
                )
            }
            .padding(.top, .mgSpacing12)
        }
        .padding(.mgSpacing16)
        .background {
            RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                .fill(.regularMaterial)
                .shadow(
                    color: .black.opacity(0.1),
                    radius: 8,
                    x: 0,
                    y: 4
                )
        }
    }

    private var posterURL: URL? {
        guard let posterUrl = movie.posterUrl else { return nil }
        return URL(string: posterUrl)
    }

    private var posterPlaceholder: some View {
        RoundedRectangle(cornerRadius: .mgCornerSmall, style: .continuous)
            .fill(Color.mgSecondary.opacity(0.15))
            .overlay(
                Image(systemName: "film")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.mgSecondary)
            )
    }
}

// MARK: - Category Progress Header

struct CategoryProgressHeader: View {
    let seenCount: Int
    let totalCount: Int
    let category: String

    private var progress: Double {
        guard totalCount > 0 else { return 0 }
        return Double(seenCount) / Double(totalCount)
    }

    private var progressColor: Color {
        let percentage = progress * 100
        switch percentage {
        case 0:
            return Color.mgSecondary  // Untouched grey — 0%
        case 0.01..<12:
            return Color(red: 0.70, green: 0.70, blue: 0.70)  // Warm grey — ~10%
        case 12..<25:
            return Color(red: 0.96, green: 0.94, blue: 0.88)  // Cream — ~20%
        case 25..<40:
            return Color(red: 0.98, green: 0.96, blue: 0.90)  // Pale champagne — ~35%
        case 40..<55:
            return Color(red: 0.98, green: 0.95, blue: 0.82)  // Champagne — ~50%
        case 55..<70:
            return Color(red: 0.95, green: 0.87, blue: 0.57)  // Light gold — ~65%
        case 70..<85:
            return Color.mgGold  // MovieGenius Gold — ~80%
        case 85..<96:
            return Color(red: 0.85, green: 0.65, blue: 0.13)  // Rich gold — ~95%
        default:
            return Color(red: 0.72, green: 0.53, blue: 0.04)  // Deep gold — 100%
        }
    }

    private var isComplete: Bool {
        seenCount == totalCount && totalCount > 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing8) {
            // Counter
            HStack {
                Text("\(seenCount)/\(totalCount)")
                    .font(.mgTitle3)
                    .fontWeight(.bold)
                    .foregroundStyle(progressColor)

                if isComplete {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(Color.mgGold)
                }
            }

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(Color.mgSecondary.opacity(0.15))
                        .frame(height: 8)

                    // Fill
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(progressColor)
                        .frame(width: geometry.size.width * progress, height: 8)
                        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: progress)
                }
            }
            .frame(height: 8)

            // Completion message
            if isComplete {
                HStack(spacing: .mgSpacing4) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(Color.mgGold)
                    Text("Mastered \(category)!")
                        .font(.mgCaption)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.mgGold)
                }
                .padding(.top, .mgSpacing4)
            }
        }
        .padding(.mgSpacing16)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                .strokeBorder(progressColor.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Essential Movie Model

struct EssentialFilm {
    let title: String
    let year: Int
    var tmdbId: Int?  // nil if not found in TMDB
}

struct EssentialMovie: Identifiable {
    let id = UUID()
    let tmdbId: Int
    let title: String
    let year: Int?
    let slug: String
    let posterUrl: String?
}

// MARK: - Category Essentials ViewModel

@MainActor
class CategoryEssentialsViewModel: ObservableObject {
    @Published var movies: [EssentialMovie] = []  // Only films with tmdbId
    @Published var isLoading = false
    @Published var error: Error?

    let category: String
    let subcategory: String?
    var totalFilms: Int = 0        // Total films in category (including unavailable)
    var availableFilms: Int = 0    // Films successfully matched to TMDB

    init(category: String, subcategory: String? = nil) {
        self.category = category
        self.subcategory = subcategory
    }

    func loadMovies() async {
        isLoading = true
        error = nil

        let filmList: [(title: String, year: Int)]
        if let subcategory = subcategory {
            filmList = CategoryEssentials.films(for: category, subcategory: subcategory)
        } else {
            filmList = []
        }
        totalFilms = filmList.count

        do {
            var loadedMovies: [EssentialMovie] = []

            // Load all films in parallel for faster performance
            await withTaskGroup(of: EssentialMovie?.self) { group in
                for film in filmList {
                    group.addTask {
                        try? await self.searchMovie(title: film.title, year: film.year)
                    }
                }

                for await movie in group {
                    if let movie = movie {
                        loadedMovies.append(movie)
                    }
                }
            }

            self.movies = loadedMovies
            self.availableFilms = loadedMovies.count

            // Register loaded movies with progress manager
            CategoryProgressManager.shared.register(movies: loadedMovies, for: category)
        } catch {
            self.error = error
        }

        isLoading = false
    }

    private func searchMovie(title: String, year: Int) async throws -> EssentialMovie? {
        // Step 1: Search for the movie to get tmdbId
        let searchURL = URL(string: "https://moviegenius.ai/api/v1/search")!
        var searchRequest = URLRequest(url: searchURL)
        searchRequest.httpMethod = "POST"
        searchRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let searchBody = ["query": title, "type": "movie"]
        searchRequest.httpBody = try JSONEncoder().encode(searchBody)

        let (searchData, _) = try await URLSession.shared.data(for: searchRequest)
        let searchResponse = try JSONDecoder().decode(SearchResponse.self, from: searchData)

        // Find exact match by year
        guard let match = searchResponse.movies.first(where: { $0.year == year }) else {
            return nil
        }

        // Step 2: Fetch full movie data to get slug
        let movieURL = URL(string: "https://moviegenius.ai/api/v1/movie/\(match.tmdbId)")!
        let (movieData, _) = try await URLSession.shared.data(from: movieURL)
        let movieResponse = try JSONDecoder().decode(MovieResponse.self, from: movieData)

        return EssentialMovie(
            tmdbId: movieResponse.movie.tmdbId,
            title: movieResponse.movie.title,
            year: movieResponse.movie.year,
            slug: movieResponse.movie.slug ?? "",
            posterUrl: movieResponse.movie.posterUrl
        )
    }
}

// MARK: - Category Essentials Data

struct CategoryEssentials {
    // Returns subcategory names for 2-tier categories
    static func subcategories(for category: String) -> [String] {
        switch category {
        case "Academy Awards":
            return ["Best Picture", "Best Director", "Best Actor", "Best Actress"]
        case "AFI Awards":
            return ["AFI 100 Greatest Films"]
        case "Actors":
            return [
                "Adrien Brody",
                "Al Pacino",
                "Anthony Hopkins",
                "Burt Lancaster",
                "Cary Grant",
                "Casey Affleck",
                "Christian Bale",
                "Clark Gable",
                "Clint Eastwood",
                "Daniel Day-Lewis",
                "Denzel Washington",
                "Dustin Hoffman",
                "Forest Whitaker",
                "Gary Cooper",
                "Gary Oldman",
                "Gene Hackman",
                "Gérard Depardieu",
                "Gregory Peck",
                "Henry Fonda",
                "Humphrey Bogart",
                "Jack Nicholson",
                "James Cagney",
                "James Stewart",
                "Jean-Paul Belmondo",
                "Jeff Bridges",
                "Joaquin Phoenix",
                "John Wayne",
                "Kirk Douglas",
                "Leonardo DiCaprio",
                "Mahershala Ali",
                "Marcello Mastroianni",
                "Marlon Brando",
                "Max von Sydow",
                "Paul Newman",
                "Peter O'Toole",
                "Philip Seymour Hoffman",
                "Robert De Niro",
                "Robert Duvall",
                "Robert Mitchum",
                "Robert Redford",
                "Russell Crowe",
                "Sean Penn",
                "Sidney Poitier",
                "Song Kang-ho",
                "Spencer Tracy",
                "Steve McQueen",
                "Tom Hanks",
                "Tony Leung Chiu-wai",
                "Toshiro Mifune",
                "Warren Beatty"
            ]
        case "Actresses":
            return [
                "Audrey Hepburn",
                "Barbara Stanwyck",
                "Bette Davis",
                "Cate Blanchett",
                "Diane Keaton",
                "Elizabeth Taylor",
                "Ellen Burstyn",
                "Emma Thompson",
                "Faye Dunaway",
                "Frances McDormand",
                "Helen Mirren",
                "Ingrid Bergman",
                "Jane Fonda",
                "Jessica Lange",
                "Joan Crawford",
                "Judi Dench",
                "Julianne Moore",
                "Kate Winslet",
                "Katharine Hepburn",
                "Liv Ullmann",
                "Marion Cotillard",
                "Meryl Streep",
                "Michelle Yeoh",
                "Nicole Kidman",
                "Sigourney Weaver",
                "Sissy Spacek",
                "Tilda Swinton",
                "Vanessa Redgrave",
                "Viola Davis",
                "Vivien Leigh"
            ]
        case "Directors":
            return [
                "Akira Kurosawa",
                "Alfred Hitchcock",
                "Andrei Tarkovsky",
                "Billy Wilder",
                "Bong Joon-ho",
                "Buster Keaton",
                "Charlie Chaplin",
                "Christopher Nolan",
                "Coen Brothers",
                "David Fincher",
                "David Lynch",
                "F.W. Murnau",
                "Federico Fellini",
                "Francis Ford Coppola",
                "Hayao Miyazaki",
                "Howard Hawks",
                "Ingmar Bergman",
                "John Ford",
                "John Huston",
                "Kelly Reichardt",
                "Martin Scorsese",
                "Orson Welles",
                "Paul Thomas Anderson",
                "Quentin Tarantino",
                "Robert Altman",
                "Stanley Kubrick",
                "Steven Spielberg",
                "Terrence Malick",
                "Wong Kar-wai",
                "Yasujirō Ozu"
            ]
        case "Mystery":
            return [
                "Essential",
                "Foundational",
                "Classics",
                "Well-Versed",
                "Devotee",
                "Connoisseur",
                "Deep Cuts",
                "Specialist",
                "Archivist",
                "Master"
            ]
        default:
            return []
        }
    }

    // Returns films for a specific subcategory within a category
    static func films(for category: String, subcategory: String) -> [(title: String, year: Int)] {
        switch (category, subcategory) {
        case ("Academy Awards", "Best Picture"):
            return [
                ("Wings", 1927),
                ("The Broadway Melody", 1929),
                ("All Quiet on the Western Front", 1930),
                ("Cimarron", 1931),
                ("Grand Hotel", 1932),
                ("Cavalcade", 1933),
                ("It Happened One Night", 1934),
                ("Mutiny on the Bounty", 1935),
                ("The Great Ziegfeld", 1936),
                ("The Life of Emile Zola", 1937),
                ("You Can't Take It with You", 1938),
                ("Gone with the Wind", 1939),
                ("Rebecca", 1940),
                ("How Green Was My Valley", 1941),
                ("Mrs. Miniver", 1942),
                ("Casablanca", 1943),
                ("Going My Way", 1944),
                ("The Lost Weekend", 1945),
                ("The Best Years of Our Lives", 1946),
                ("Gentleman's Agreement", 1947),
                ("Hamlet", 1948),
                ("All the King's Men", 1949),
                ("All About Eve", 1950),
                ("An American in Paris", 1951),
                ("The Greatest Show on Earth", 1952),
                ("From Here to Eternity", 1953),
                ("On the Waterfront", 1954),
                ("Marty", 1955),
                ("Around the World in 80 Days", 1956),
                ("The Bridge on the River Kwai", 1957),
                ("Gigi", 1958),
                ("Ben-Hur", 1959),
                ("The Apartment", 1960),
                ("West Side Story", 1961),
                ("Lawrence of Arabia", 1962),
                ("Tom Jones", 1963),
                ("My Fair Lady", 1964),
                ("The Sound of Music", 1965),
                ("A Man for All Seasons", 1966),
                ("In the Heat of the Night", 1967),
                ("Oliver!", 1968),
                ("Midnight Cowboy", 1969),
                ("Patton", 1970),
                ("The French Connection", 1971),
                ("The Godfather", 1972),
                ("The Sting", 1973),
                ("The Godfather Part II", 1974),
                ("One Flew Over the Cuckoo's Nest", 1975),
                ("Rocky", 1976),
                ("Annie Hall", 1977),
                ("The Deer Hunter", 1978),
                ("Kramer vs. Kramer", 1979),
                ("Ordinary People", 1980),
                ("Chariots of Fire", 1981),
                ("Gandhi", 1982),
                ("Terms of Endearment", 1983),
                ("Amadeus", 1984),
                ("Out of Africa", 1985),
                ("Platoon", 1986),
                ("The Last Emperor", 1987),
                ("Rain Man", 1988),
                ("Driving Miss Daisy", 1989),
                ("Dances with Wolves", 1990),
                ("The Silence of the Lambs", 1991),
                ("Unforgiven", 1992),
                ("Schindler's List", 1993),
                ("Forrest Gump", 1994),
                ("Braveheart", 1995),
                ("The English Patient", 1996),
                ("Titanic", 1997),
                ("Shakespeare in Love", 1998),
                ("American Beauty", 1999),
                ("Gladiator", 2000),
                ("A Beautiful Mind", 2001),
                ("Chicago", 2002),
                ("The Lord of the Rings: The Return of the King", 2003),
                ("Million Dollar Baby", 2004),
                ("Crash", 2004),
                ("The Departed", 2006),
                ("No Country for Old Men", 2007),
                ("Slumdog Millionaire", 2008),
                ("The Hurt Locker", 2008),
                ("The King's Speech", 2010),
                ("The Artist", 2011),
                ("Argo", 2012),
                ("12 Years a Slave", 2013),
                ("Birdman", 2014),
                ("Spotlight", 2015),
                ("Moonlight", 2016),
                ("The Shape of Water", 2017),
                ("Green Book", 2018),
                ("Parasite", 2019),
                ("Nomadland", 2020),
                ("CODA", 2021),
                ("Everything Everywhere All at Once", 2022),
                ("Oppenheimer", 2023)
            ]
        case ("Academy Awards", "Best Director"):
            return [
                ("All Quiet on the Western Front", 1930),
                ("Bad Girl", 1931),
                ("Cavalcade", 1933),
                ("It Happened One Night", 1934),
                ("The Informer", 1935),
                ("Mr. Deeds Goes to Town", 1936),
                ("The Awful Truth", 1937),
                ("You Can't Take It with You", 1938),
                ("Gone with the Wind", 1939),
                ("The Grapes of Wrath", 1940),
                ("How Green Was My Valley", 1941),
                ("Mrs. Miniver", 1942),
                ("Casablanca", 1942),
                ("Going My Way", 1944),
                ("The Lost Weekend", 1945),
                ("The Best Years of Our Lives", 1946),
                ("Gentleman's Agreement", 1947),
                ("The Treasure of the Sierra Madre", 1948),
                ("A Letter to Three Wives", 1949),
                ("All About Eve", 1950),
                ("A Place in the Sun", 1951),
                ("The Quiet Man", 1952),
                ("From Here to Eternity", 1953),
                ("On the Waterfront", 1954),
                ("Marty", 1955),
                ("Giant", 1956),
                ("The Bridge on the River Kwai", 1957),
                ("Gigi", 1958),
                ("Ben-Hur", 1959),
                ("The Apartment", 1960),
                ("West Side Story", 1961),
                ("Lawrence of Arabia", 1962),
                ("Tom Jones", 1963),
                ("My Fair Lady", 1964),
                ("The Sound of Music", 1965),
                ("A Man for All Seasons", 1966),
                ("The Graduate", 1967),
                ("Oliver!", 1968),
                ("Midnight Cowboy", 1969),
                ("Patton", 1970),
                ("The French Connection", 1971),
                ("Cabaret", 1972),
                ("The Sting", 1973),
                ("The Godfather Part II", 1974),
                ("One Flew Over the Cuckoo's Nest", 1975),
                ("Rocky", 1976),
                ("Annie Hall", 1977),
                ("The Deer Hunter", 1978),
                ("Kramer vs. Kramer", 1979),
                ("Ordinary People", 1980),
                ("Reds", 1981),
                ("Gandhi", 1982),
                ("Terms of Endearment", 1983),
                ("Amadeus", 1984),
                ("Out of Africa", 1985),
                ("Platoon", 1986),
                ("The Last Emperor", 1987),
                ("Rain Man", 1988),
                ("Born on the Fourth of July", 1989),
                ("Dances with Wolves", 1990),
                ("The Silence of the Lambs", 1991),
                ("Unforgiven", 1992),
                ("Schindler's List", 1993),
                ("Forrest Gump", 1994),
                ("Braveheart", 1995),
                ("The English Patient", 1996),
                ("Titanic", 1997),
                ("Saving Private Ryan", 1998),
                ("American Beauty", 1999),
                ("Traffic", 2000),
                ("A Beautiful Mind", 2001),
                ("The Pianist", 2002),
                ("The Lord of the Rings: The Return of the King", 2003),
                ("Million Dollar Baby", 2004),
                ("Brokeback Mountain", 2005),
                ("The Departed", 2006),
                ("No Country for Old Men", 2007),
                ("Slumdog Millionaire", 2008),
                ("The Hurt Locker", 2009),
                ("The King's Speech", 2010),
                ("The Artist", 2011),
                ("Life of Pi", 2012),
                ("Gravity", 2013),
                ("Birdman", 2014),
                ("The Revenant", 2015),
                ("La La Land", 2016),
                ("The Shape of Water", 2017),
                ("Roma", 2018),
                ("Parasite", 2019),
                ("Nomadland", 2020),
                ("The Power of the Dog", 2021),
                ("Everything Everywhere All at Once", 2022),
                ("Oppenheimer", 2023)
            ]
        case ("Academy Awards", "Best Actor"):
            return [
                ("The Way of All Flesh", 1927),
                ("The Last Command", 1928),
                ("In Old Arizona", 1928),
                ("Disraeli", 1929),
                ("A Free Soul", 1931),
                ("Dr. Jekyll and Mr. Hyde", 1931),
                ("The Private Life of Henry VIII", 1933),
                ("It Happened One Night", 1934),
                ("The Informer", 1935),
                ("The Story of Louis Pasteur", 1936),
                ("Captains Courageous", 1937),
                ("Boys Town", 1938),
                ("Goodbye, Mr. Chips", 1939),
                ("The Philadelphia Story", 1940),
                ("Sergeant York", 1941),
                ("Yankee Doodle Dandy", 1942),
                ("Watch on the Rhine", 1943),
                ("Going My Way", 1944),
                ("The Lost Weekend", 1945),
                ("The Best Years of Our Lives", 1946),
                ("A Double Life", 1947),
                ("Hamlet", 1948),
                ("All the King's Men", 1949),
                ("Cyrano de Bergerac", 1950),
                ("The African Queen", 1952),
                ("High Noon", 1952),
                ("Stalag 17", 1953),
                ("On the Waterfront", 1954),
                ("Marty", 1955),
                ("The King and I", 1956),
                ("The Bridge on the River Kwai", 1957),
                ("Separate Tables", 1958),
                ("Ben-Hur", 1959),
                ("Elmer Gantry", 1960),
                ("Judgment at Nuremberg", 1961),
                ("To Kill a Mockingbird", 1962),
                ("Lilies of the Field", 1963),
                ("My Fair Lady", 1964),
                ("Cat Ballou", 1965),
                ("A Man for All Seasons", 1966),
                ("In the Heat of the Night", 1967),
                ("Charly", 1968),
                ("True Grit", 1969),
                ("Patton", 1970),
                ("The French Connection", 1971),
                ("The Godfather", 1972),
                ("Save the Tiger", 1973),
                ("Harry and Tonto", 1974),
                ("One Flew Over the Cuckoo's Nest", 1975),
                ("Network", 1976),
                ("The Goodbye Girl", 1977),
                ("Coming Home", 1978),
                ("Kramer vs. Kramer", 1979),
                ("Raging Bull", 1980),
                ("On Golden Pond", 1981),
                ("Gandhi", 1982),
                ("Tender Mercies", 1983),
                ("Amadeus", 1984),
                ("Kiss of the Spider Woman", 1985),
                ("The Color of Money", 1986),
                ("Wall Street", 1987),
                ("Rain Man", 1988),
                ("My Left Foot", 1989),
                ("Reversal of Fortune", 1990),
                ("The Silence of the Lambs", 1991),
                ("Scent of a Woman", 1992),
                ("Philadelphia", 1993),
                ("Forrest Gump", 1994),
                ("Leaving Las Vegas", 1995),
                ("Shine", 1996),
                ("As Good as It Gets", 1997),
                ("Life Is Beautiful", 1997),
                ("American Beauty", 1999),
                ("Gladiator", 2000),
                ("Training Day", 2001),
                ("The Pianist", 2002),
                ("Mystic River", 2003),
                ("Ray", 2004),
                ("Capote", 2005),
                ("The Last King of Scotland", 2006),
                ("There Will Be Blood", 2007),
                ("Milk", 2008),
                ("Crazy Heart", 2009),
                ("The King's Speech", 2010),
                ("The Artist", 2011),
                ("Lincoln", 2012),
                ("Dallas Buyers Club", 2013),
                ("The Theory of Everything", 2014),
                ("The Revenant", 2015),
                ("Manchester by the Sea", 2016),
                ("Darkest Hour", 2017),
                ("Bohemian Rhapsody", 2018),
                ("Joker", 2019),
                ("The Father", 2020),
                ("King Richard", 2021),
                ("The Whale", 2022),
                ("Oppenheimer", 2023)
            ]
        case ("Academy Awards", "Best Actress"):
            return [
                ("7th Heaven", 1927),
                ("Coquette", 1929),
                ("The Divorcee", 1930),
                ("Min and Bill", 1930),
                ("The Sin of Madelon Claudet", 1931),
                ("Morning Glory", 1933),
                ("It Happened One Night", 1934),
                ("Dangerous", 1935),
                ("The Great Ziegfeld", 1936),
                ("The Good Earth", 1937),
                ("Jezebel", 1938),
                ("Gone with the Wind", 1939),
                ("Kitty Foyle", 1940),
                ("Suspicion", 1941),
                ("Mrs. Miniver", 1942),
                ("The Song of Bernadette", 1943),
                ("Gaslight", 1944),
                ("Mildred Pierce", 1945),
                ("To Each His Own", 1946),
                ("The Farmer's Daughter", 1947),
                ("Johnny Belinda", 1948),
                ("The Heiress", 1949),
                ("Born Yesterday", 1950),
                ("A Streetcar Named Desire", 1951),
                ("Come Back, Little Sheba", 1952),
                ("Roman Holiday", 1953),
                ("The Country Girl", 1954),
                ("The Rose Tattoo", 1955),
                ("Anastasia", 1956),
                ("The Three Faces of Eve", 1957),
                ("I Want to Live!", 1958),
                ("Room at the Top", 1959),
                ("BUtterfield 8", 1960),
                ("Two Women", 1960),
                ("The Miracle Worker", 1962),
                ("Hud", 1963),
                ("Mary Poppins", 1964),
                ("Darling", 1965),
                ("Who's Afraid of Virginia Woolf?", 1966),
                ("Guess Who's Coming to Dinner", 1967),
                ("Funny Girl", 1968),
                ("The Prime of Miss Jean Brodie", 1969),
                ("Women in Love", 1969),
                ("Klute", 1971),
                ("Cabaret", 1972),
                ("A Touch of Class", 1973),
                ("Alice Doesn't Live Here Anymore", 1974),
                ("One Flew Over the Cuckoo's Nest", 1975),
                ("Network", 1976),
                ("Annie Hall", 1977),
                ("Coming Home", 1978),
                ("Norma Rae", 1979),
                ("Coal Miner's Daughter", 1980),
                ("On Golden Pond", 1981),
                ("Sophie's Choice", 1982),
                ("Terms of Endearment", 1983),
                ("Places in the Heart", 1984),
                ("The Trip to Bountiful", 1985),
                ("Children of a Lesser God", 1986),
                ("Moonstruck", 1987),
                ("The Accused", 1988),
                ("Driving Miss Daisy", 1989),
                ("Misery", 1990),
                ("The Silence of the Lambs", 1991),
                ("Howards End", 1992),
                ("The Piano", 1993),
                ("Blue Sky", 1994),
                ("Dead Man Walking", 1995),
                ("Fargo", 1996),
                ("As Good as It Gets", 1997),
                ("Shakespeare in Love", 1998),
                ("Boys Don't Cry", 1999),
                ("Erin Brockovich", 2000),
                ("Monster's Ball", 2001),
                ("The Hours", 2002),
                ("Monster", 2003),
                ("Million Dollar Baby", 2004),
                ("Walk the Line", 2005),
                ("The Queen", 2006),
                ("La Vie en Rose", 2007),
                ("The Reader", 2008),
                ("The Blind Side", 2009),
                ("Black Swan", 2010),
                ("The Iron Lady", 2011),
                ("Silver Linings Playbook", 2012),
                ("Blue Jasmine", 2013),
                ("Still Alice", 2014),
                ("Room", 2015),
                ("La La Land", 2016),
                ("Three Billboards Outside Ebbing, Missouri", 2017),
                ("The Favourite", 2018),
                ("Judy", 2019),
                ("Nomadland", 2020),
                ("The Eyes of Tammy Faye", 2021),
                ("Everything Everywhere All at Once", 2022),
                ("Poor Things", 2023)
            ]

        // AFI Awards
        case ("AFI Awards", "AFI 100 Greatest Films"):
            return [
                ("Citizen Kane", 1941),
                ("The Godfather", 1972),
                ("Casablanca", 1943),
                ("Raging Bull", 1980),
                ("Singin' in the Rain", 1952),
                ("Gone with the Wind", 1939),
                ("Lawrence of Arabia", 1962),
                ("Schindler's List", 1993),
                ("Vertigo", 1958),
                ("The Wizard of Oz", 1939),
                ("Bride of Frankenstein", 1935),
                ("Once Upon a Time in America", 1984),
                ("Star Wars", 1977),
                ("Psycho", 1960),
                ("2001: A Space Odyssey", 1968),
                ("Sunset Boulevard", 1950),
                ("The Graduate", 1967),
                ("The General", 1926),
                ("Miller's Crossing", 1990),
                ("It's a Wonderful Life", 1946),
                ("Chinatown", 1974),
                ("Love on the Run", 1979),
                ("A Star Is Born", 1954),
                ("E.T. the Extra-Terrestrial", 1982),
                ("12 Angry Men", 1957),
                ("Yankee Doodle Dandy", 1942),
                ("High Noon", 1952),
                ("Rear Window", 1954),
                ("Apocalypse Now", 1979),
                ("Coffee and Cigarettes", 2004),
                ("The Godfather Part II", 1974),
                ("One Flew Over the Cuckoo's Nest", 1975),
                ("Snow White and the Seven Dwarfs", 1937),
                ("Annie Hall", 1977),
                ("The Bridge on the River Kwai", 1957),
                ("French Kiss", 1995),
                ("The Treasure of the Sierra Madre", 1948),
                ("Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb", 1964),
                ("The Sound of Music", 1965),
                ("King Kong", 1933),
                ("Mary Poppins", 1964),
                ("Shéhérazade", 1971),
                ("Frankenstein", 1931),
                ("Bollywood/Hollywood", 2002),
                ("It Happened One Night", 1934),
                ("Ebirah, Horror of the Deep", 1966),
                ("A Clockwork Orange", 1971),
                ("The Wild Bunch", 1969),
                ("Jaws", 1975),
                ("Rocky", 1976),
                ("A Few Good Men", 1992),
                ("Rome, Open City", 1945),
                ("Raiders of the Lost Ark", 1981),
                ("Audition", 2000)
            ]

        // Actors
        case ("Actors", "Humphrey Bogart"):
            return [
                ("The Petrified Forest", 1936),
                ("High Sierra", 1941),
                ("The Maltese Falcon", 1941),
                ("Casablanca", 1942),
                ("To Have and Have Not", 1944),
                ("The Big Sleep", 1946),
                ("Dark Passage", 1947),
                ("The Treasure of the Sierra Madre", 1948),
                ("Key Largo", 1948),
                ("In a Lonely Place", 1950),
                ("The African Queen", 1951),
                ("The Caine Mutiny", 1954),
                ("Sabrina", 1954),
                ("The Barefoot Contessa", 1954),
                ("The Harder They Fall", 1956),
            ]
        case ("Actors", "James Stewart"):
            return [
                ("Mr. Smith Goes to Washington", 1939),
                ("The Shop Around the Corner", 1940),
                ("The Philadelphia Story", 1940),
                ("It's a Wonderful Life", 1946),
                ("Call Northside 777", 1948),
                ("Winchester '73", 1950),
                ("Harvey", 1950),
                ("Rear Window", 1954),
                ("The Far Country", 1954),
                ("The Man Who Knew Too Much", 1956),
                ("Vertigo", 1958),
                ("Anatomy of a Murder", 1959),
                ("The Man Who Shot Liberty Valance", 1962),
                ("How the West Was Won", 1962),
            ]
        case ("Actors", "Cary Grant"):
            return [
                ("The Awful Truth", 1937),
                ("Bringing Up Baby", 1938),
                ("Holiday", 1938),
                ("Gunga Din", 1939),
                ("Only Angels Have Wings", 1939),
                ("His Girl Friday", 1940),
                ("The Philadelphia Story", 1940),
                ("Suspicion", 1941),
                ("Arsenic and Old Lace", 1944),
                ("Notorious", 1946),
                ("To Catch a Thief", 1955),
                ("An Affair to Remember", 1957),
                ("North by Northwest", 1959),
                ("Charade", 1963),
            ]
        case ("Actors", "Henry Fonda"):
            return [
                ("You Only Live Once", 1937),
                ("Jezebel", 1938),
                ("Young Mr. Lincoln", 1939),
                ("Drums Along the Mohawk", 1939),
                ("The Grapes of Wrath", 1940),
                ("The Lady Eve", 1941),
                ("The Ox-Bow Incident", 1943),
                ("My Darling Clementine", 1946),
                ("Fort Apache", 1948),
                ("Mister Roberts", 1955),
                ("12 Angry Men", 1957),
                ("The Wrong Man", 1956),
                ("Once Upon a Time in the West", 1968),
                ("On Golden Pond", 1981),
            ]
        case ("Actors", "Gary Cooper"):
            return [
                ("Mr. Deeds Goes to Town", 1936),
                ("The Plainsman", 1936),
                ("Beau Geste", 1939),
                ("The Westerner", 1940),
                ("Meet John Doe", 1941),
                ("Sergeant York", 1941),
                ("The Pride of the Yankees", 1942),
                ("For Whom the Bell Tolls", 1943),
                ("The Fountainhead", 1949),
                ("High Noon", 1952),
                ("Vera Cruz", 1954),
                ("Friendly Persuasion", 1956),
                ("Man of the West", 1958),
            ]
        case ("Actors", "Spencer Tracy"):
            return [
                ("Fury", 1936),
                ("Captains Courageous", 1937),
                ("Boys Town", 1938),
                ("Woman of the Year", 1942),
                ("Adam's Rib", 1949),
                ("Father of the Bride", 1950),
                ("Pat and Mike", 1952),
                ("Bad Day at Black Rock", 1955),
                ("The Old Man and the Sea", 1958),
                ("Inherit the Wind", 1960),
                ("Judgment at Nuremberg", 1961),
                ("It's a Mad, Mad, Mad, Mad World", 1963),
                ("Guess Who's Coming to Dinner", 1967),
            ]
        case ("Actors", "Clark Gable"):
            return [
                ("It Happened One Night", 1934),
                ("Mutiny on the Bounty", 1935),
                ("San Francisco", 1936),
                ("Test Pilot", 1938),
                ("Gone with the Wind", 1939),
                ("Boom Town", 1940),
                ("The Hucksters", 1947),
                ("Mogambo", 1953),
                ("Run Silent, Run Deep", 1958),
                ("The Misfits", 1961),
            ]
        case ("Actors", "James Cagney"):
            return [
                ("The Public Enemy", 1931),
                ("Footlight Parade", 1933),
                ("G Men", 1935),
                ("Angels with Dirty Faces", 1938),
                ("The Roaring Twenties", 1939),
                ("Yankee Doodle Dandy", 1942),
                ("White Heat", 1949),
                ("Love Me or Leave Me", 1955),
                ("Mister Roberts", 1955),
                ("One, Two, Three", 1961),
            ]
        case ("Actors", "Robert Mitchum"):
            return [
                ("The Story of G.I. Joe", 1945),
                ("Out of the Past", 1947),
                ("The Lusty Men", 1952),
                ("Angel Face", 1953),
                ("River of No Return", 1954),
                ("The Night of the Hunter", 1955),
                ("Heaven Knows, Mr. Allison", 1957),
                ("Thunder Road", 1958),
                ("The Sundowners", 1960),
                ("Cape Fear", 1962),
                ("El Dorado", 1966),
                ("Ryan's Daughter", 1970),
                ("The Friends of Eddie Coyle", 1973),
                ("Farewell, My Lovely", 1975),
            ]
        case ("Actors", "Burt Lancaster"):
            return [
                ("The Killers", 1946),
                ("Brute Force", 1947),
                ("Criss Cross", 1949),
                ("From Here to Eternity", 1953),
                ("Vera Cruz", 1954),
                ("Sweet Smell of Success", 1957),
                ("Gunfight at the O.K. Corral", 1957),
                ("Elmer Gantry", 1960),
                ("Judgment at Nuremberg", 1961),
                ("Birdman of Alcatraz", 1962),
                ("The Leopard", 1963),
                ("Seven Days in May", 1964),
                ("The Swimmer", 1968),
                ("Atlantic City", 1980),
            ]
        case ("Actors", "Kirk Douglas"):
            return [
                ("Out of the Past", 1947),
                ("Champion", 1949),
                ("Ace in the Hole", 1951),
                ("Detective Story", 1951),
                ("The Bad and the Beautiful", 1952),
                ("20,000 Leagues Under the Sea", 1954),
                ("Lust for Life", 1956),
                ("Paths of Glory", 1957),
                ("Gunfight at the O.K. Corral", 1957),
                ("The Vikings", 1958),
                ("Spartacus", 1960),
                ("Lonely Are the Brave", 1962),
                ("Seven Days in May", 1964),
            ]
        case ("Actors", "Gregory Peck"):
            return [
                ("Spellbound", 1945),
                ("The Yearling", 1946),
                ("Duel in the Sun", 1946),
                ("Gentleman's Agreement", 1947),
                ("Twelve O'Clock High", 1949),
                ("The Gunfighter", 1950),
                ("Roman Holiday", 1953),
                ("Moby Dick", 1956),
                ("The Big Country", 1958),
                ("Pork Chop Hill", 1959),
                ("On the Beach", 1959),
                ("Cape Fear", 1962),
                ("To Kill a Mockingbird", 1962),
                ("The Omen", 1976),
            ]
        case ("Actors", "John Wayne"):
            return [
                ("Stagecoach", 1939),
                ("Red River", 1948),
                ("Fort Apache", 1948),
                ("She Wore a Yellow Ribbon", 1949),
                ("Sands of Iwo Jima", 1949),
                ("Rio Grande", 1950),
                ("The Quiet Man", 1952),
                ("The Searchers", 1956),
                ("Rio Bravo", 1959),
                ("The Man Who Shot Liberty Valance", 1962),
                ("El Dorado", 1966),
                ("True Grit", 1969),
                ("The Cowboys", 1972),
                ("The Shootist", 1976),
            ]
        case ("Actors", "Sidney Poitier"):
            return [
                ("Blackboard Jungle", 1955),
                ("Edge of the City", 1957),
                ("The Defiant Ones", 1958),
                ("Porgy and Bess", 1959),
                ("A Raisin in the Sun", 1961),
                ("Lilies of the Field", 1963),
                ("A Patch of Blue", 1965),
                ("To Sir, with Love", 1967),
                ("In the Heat of the Night", 1967),
                ("Guess Who's Coming to Dinner", 1967),
                ("Buck and the Preacher", 1972),
                ("Uptown Saturday Night", 1974),
            ]
        case ("Actors", "Paul Newman"):
            return [
                ("Somebody Up There Likes Me", 1956),
                ("The Long, Hot Summer", 1958),
                ("Cat on a Hot Tin Roof", 1958),
                ("The Hustler", 1961),
                ("Hud", 1963),
                ("Harper", 1966),
                ("Hombre", 1967),
                ("Cool Hand Luke", 1967),
                ("Butch Cassidy and the Sundance Kid", 1969),
                ("The Sting", 1973),
                ("Slap Shot", 1977),
                ("The Verdict", 1982),
                ("The Color of Money", 1986),
                ("Nobody's Fool", 1994),
                ("Road to Perdition", 2002),
            ]
        case ("Actors", "Marlon Brando"):
            return [
                ("A Streetcar Named Desire", 1951),
                ("Viva Zapata!", 1952),
                ("Julius Caesar", 1953),
                ("The Wild One", 1953),
                ("On the Waterfront", 1954),
                ("Guys and Dolls", 1955),
                ("Sayonara", 1957),
                ("One-Eyed Jacks", 1961),
                ("Mutiny on the Bounty", 1962),
                ("Reflections in a Golden Eye", 1967),
                ("The Godfather", 1972),
                ("Last Tango in Paris", 1972),
                ("Apocalypse Now", 1979),
                ("A Dry White Season", 1989),
            ]
        case ("Actors", "Jack Nicholson"):
            return [
                ("Easy Rider", 1969),
                ("Five Easy Pieces", 1970),
                ("Carnal Knowledge", 1971),
                ("The Last Detail", 1973),
                ("Chinatown", 1974),
                ("One Flew Over the Cuckoo's Nest", 1975),
                ("The Passenger", 1975),
                ("The Shining", 1980),
                ("Reds", 1981),
                ("Terms of Endearment", 1983),
                ("Prizzi's Honor", 1985),
                ("The Witches of Eastwick", 1987),
                ("Batman", 1989),
                ("A Few Good Men", 1992),
                ("As Good as It Gets", 1997),
                ("About Schmidt", 2002),
                ("The Departed", 2006),
            ]
        case ("Actors", "Robert De Niro"):
            return [
                ("Mean Streets", 1973),
                ("The Godfather Part II", 1974),
                ("Taxi Driver", 1976),
                ("1900", 1976),
                ("The Deer Hunter", 1978),
                ("Raging Bull", 1980),
                ("The King of Comedy", 1982),
                ("Once Upon a Time in America", 1984),
                ("Brazil", 1985),
                ("The Mission", 1986),
                ("The Untouchables", 1987),
                ("Midnight Run", 1988),
                ("Goodfellas", 1990),
                ("Awakenings", 1990),
                ("Cape Fear", 1991),
                ("Casino", 1995),
                ("Heat", 1995),
                ("Jackie Brown", 1997),
                ("The Irishman", 2019),
                ("Killers of the Flower Moon", 2023),
            ]
        case ("Actors", "Al Pacino"):
            return [
                ("The Panic in Needle Park", 1971),
                ("The Godfather", 1972),
                ("Serpico", 1973),
                ("The Godfather Part II", 1974),
                ("Dog Day Afternoon", 1975),
                ("...And Justice for All", 1979),
                ("Scarface", 1983),
                ("Sea of Love", 1989),
                ("The Godfather Part III", 1990),
                ("Dick Tracy", 1990),
                ("Glengarry Glen Ross", 1992),
                ("Scent of a Woman", 1992),
                ("Carlito's Way", 1993),
                ("Heat", 1995),
                ("Donnie Brasco", 1997),
                ("The Insider", 1999),
                ("The Irishman", 2019),
            ]
        case ("Actors", "Dustin Hoffman"):
            return [
                ("The Graduate", 1967),
                ("Midnight Cowboy", 1969),
                ("Little Big Man", 1970),
                ("Straw Dogs", 1971),
                ("Papillon", 1973),
                ("Lenny", 1974),
                ("All the President's Men", 1976),
                ("Marathon Man", 1976),
                ("Kramer vs. Kramer", 1979),
                ("Tootsie", 1982),
                ("Rain Man", 1988),
                ("Wag the Dog", 1997),
                ("I Heart Huckabees", 2004),
            ]
        case ("Actors", "Gene Hackman"):
            return [
                ("Bonnie and Clyde", 1967),
                ("I Never Sang for My Father", 1970),
                ("The French Connection", 1971),
                ("The Poseidon Adventure", 1972),
                ("The Conversation", 1974),
                ("Night Moves", 1975),
                ("Superman", 1978),
                ("Hoosiers", 1986),
                ("Mississippi Burning", 1988),
                ("Unforgiven", 1992),
                ("The Firm", 1993),
                ("Crimson Tide", 1995),
                ("The Birdcage", 1996),
                ("The Royal Tenenbaums", 2001),
            ]
        case ("Actors", "Robert Duvall"):
            return [
                ("To Kill a Mockingbird", 1962),
                ("The Godfather", 1972),
                ("The Conversation", 1974),
                ("The Godfather Part II", 1974),
                ("Network", 1976),
                ("Apocalypse Now", 1979),
                ("The Great Santini", 1979),
                ("True Confessions", 1981),
                ("Tender Mercies", 1983),
                ("The Natural", 1984),
                ("Colors", 1988),
                ("Lonesome Dove", 1989),
                ("The Apostle", 1997),
                ("A Civil Action", 1998),
                ("Get Low", 2009),
            ]
        case ("Actors", "Warren Beatty"):
            return [
                ("Splendor in the Grass", 1961),
                ("Bonnie and Clyde", 1967),
                ("McCabe & Mrs. Miller", 1971),
                ("The Parallax View", 1974),
                ("Shampoo", 1975),
                ("Heaven Can Wait", 1978),
                ("Reds", 1981),
                ("Dick Tracy", 1990),
                ("Bugsy", 1991),
                ("Bulworth", 1998),
            ]
        case ("Actors", "Robert Redford"):
            return [
                ("Barefoot in the Park", 1967),
                ("Butch Cassidy and the Sundance Kid", 1969),
                ("Downhill Racer", 1969),
                ("Jeremiah Johnson", 1972),
                ("The Candidate", 1972),
                ("The Way We Were", 1973),
                ("The Sting", 1973),
                ("The Great Gatsby", 1974),
                ("Three Days of the Condor", 1975),
                ("All the President's Men", 1976),
                ("The Natural", 1984),
                ("Out of Africa", 1985),
                ("Sneakers", 1992),
                ("All Is Lost", 2013),
            ]
        case ("Actors", "Clint Eastwood"):
            return [
                ("A Fistful of Dollars", 1964),
                ("For a Few Dollars More", 1965),
                ("The Good, the Bad and the Ugly", 1966),
                ("Hang 'Em High", 1968),
                ("Dirty Harry", 1971),
                ("High Plains Drifter", 1973),
                ("The Outlaw Josey Wales", 1976),
                ("Escape from Alcatraz", 1979),
                ("Pale Rider", 1985),
                ("Unforgiven", 1992),
                ("In the Line of Fire", 1993),
                ("The Bridges of Madison County", 1995),
                ("Million Dollar Baby", 2004),
                ("Gran Torino", 2008),
            ]
        case ("Actors", "Steve McQueen"):
            return [
                ("The Magnificent Seven", 1960),
                ("The Great Escape", 1963),
                ("Love with the Proper Stranger", 1963),
                ("The Cincinnati Kid", 1965),
                ("Nevada Smith", 1966),
                ("The Sand Pebbles", 1966),
                ("The Thomas Crown Affair", 1968),
                ("Bullitt", 1968),
                ("Le Mans", 1971),
                ("The Getaway", 1972),
                ("Papillon", 1973),
                ("The Towering Inferno", 1974),
            ]
        case ("Actors", "Peter O'Toole"):
            return [
                ("Lawrence of Arabia", 1962),
                ("Becket", 1964),
                ("Lord Jim", 1965),
                ("How to Steal a Million", 1966),
                ("The Lion in Winter", 1968),
                ("Goodbye, Mr. Chips", 1969),
                ("The Ruling Class", 1972),
                ("Man of La Mancha", 1972),
                ("The Stunt Man", 1980),
                ("My Favorite Year", 1982),
                ("The Last Emperor", 1987),
                ("Venus", 2006),
            ]
        case ("Actors", "Daniel Day-Lewis"):
            return [
                ("My Beautiful Laundrette", 1985),
                ("A Room with a View", 1985),
                ("The Unbearable Lightness of Being", 1988),
                ("My Left Foot", 1989),
                ("The Last of the Mohicans", 1992),
                ("The Age of Innocence", 1993),
                ("In the Name of the Father", 1993),
                ("The Crucible", 1996),
                ("The Boxer", 1997),
                ("Gangs of New York", 2002),
                ("There Will Be Blood", 2007),
                ("Lincoln", 2012),
                ("Phantom Thread", 2017),
            ]
        case ("Actors", "Anthony Hopkins"):
            return [
                ("The Lion in Winter", 1968),
                ("Magic", 1978),
                ("The Elephant Man", 1980),
                ("The Bounty", 1984),
                ("The Silence of the Lambs", 1991),
                ("Howards End", 1992),
                ("The Remains of the Day", 1993),
                ("Shadowlands", 1993),
                ("Nixon", 1995),
                ("Amistad", 1997),
                ("The Mask of Zorro", 1998),
                ("Hannibal", 2001),
                ("The World's Fastest Indian", 2005),
                ("The Father", 2020),
            ]
        case ("Actors", "Tom Hanks"):
            return [
                ("Splash", 1984),
                ("Big", 1988),
                ("Punchline", 1988),
                ("A League of Their Own", 1992),
                ("Sleepless in Seattle", 1993),
                ("Philadelphia", 1993),
                ("Forrest Gump", 1994),
                ("Apollo 13", 1995),
                ("Toy Story", 1995),
                ("Saving Private Ryan", 1998),
                ("The Green Mile", 1999),
                ("Cast Away", 2000),
                ("Road to Perdition", 2002),
                ("Catch Me If You Can", 2002),
                ("Captain Phillips", 2013),
                ("Bridge of Spies", 2015),
                ("A Beautiful Day in the Neighborhood", 2019),
            ]
        case ("Actors", "Denzel Washington"):
            return [
                ("Cry Freedom", 1987),
                ("Glory", 1989),
                ("Mo' Better Blues", 1990),
                ("Malcolm X", 1992),
                ("Philadelphia", 1993),
                ("Crimson Tide", 1995),
                ("Devil in a Blue Dress", 1995),
                ("He Got Game", 1998),
                ("The Hurricane", 1999),
                ("Remember the Titans", 2000),
                ("Training Day", 2001),
                ("Man on Fire", 2004),
                ("Inside Man", 2006),
                ("American Gangster", 2007),
                ("Flight", 2012),
                ("Fences", 2016),
                ("Roman J. Israel, Esq.", 2017),
            ]
        case ("Actors", "Sean Penn"):
            return [
                ("Bad Boys", 1983),
                ("At Close Range", 1986),
                ("Casualties of War", 1989),
                ("State of Grace", 1990),
                ("Carlito's Way", 1993),
                ("Dead Man Walking", 1995),
                ("She's So Lovely", 1997),
                ("The Thin Red Line", 1998),
                ("Sweet and Lowdown", 1999),
                ("I Am Sam", 2001),
                ("Mystic River", 2003),
                ("21 Grams", 2003),
                ("Milk", 2008),
                ("The Tree of Life", 2011),
            ]
        case ("Actors", "Philip Seymour Hoffman"):
            return [
                ("Boogie Nights", 1997),
                ("Happiness", 1998),
                ("The Big Lebowski", 1998),
                ("Magnolia", 1999),
                ("The Talented Mr. Ripley", 1999),
                ("Almost Famous", 2000),
                ("25th Hour", 2002),
                ("Capote", 2005),
                ("Charlie Wilson's War", 2007),
                ("The Savages", 2007),
                ("Before the Devil Knows You're Dead", 2007),
                ("Synecdoche, New York", 2008),
                ("Doubt", 2008),
                ("The Master", 2012),
                ("A Most Wanted Man", 2014),
            ]
        case ("Actors", "Joaquin Phoenix"):
            return [
                ("To Die For", 1995),
                ("Gladiator", 2000),
                ("The Village", 2004),
                ("Walk the Line", 2005),
                ("We Own the Night", 2007),
                ("Two Lovers", 2008),
                ("The Master", 2012),
                ("Her", 2013),
                ("Inherent Vice", 2014),
                ("You Were Never Really Here", 2017),
                ("Joker", 2019),
                ("C'mon C'mon", 2021),
                ("Beau Is Afraid", 2023),
                ("Napoleon", 2023),
            ]
        case ("Actors", "Christian Bale"):
            return [
                ("Empire of the Sun", 1987),
                ("American Psycho", 2000),
                ("The Machinist", 2004),
                ("Batman Begins", 2005),
                ("The Prestige", 2006),
                ("Rescue Dawn", 2006),
                ("3:10 to Yuma", 2007),
                ("The Dark Knight", 2008),
                ("The Fighter", 2010),
                ("The Dark Knight Rises", 2012),
                ("American Hustle", 2013),
                ("The Big Short", 2015),
                ("Hostiles", 2017),
                ("Vice", 2018),
                ("Ford v Ferrari", 2019),
            ]
        case ("Actors", "Leonardo DiCaprio"):
            return [
                ("What's Eating Gilbert Grape", 1993),
                ("Romeo + Juliet", 1996),
                ("Titanic", 1997),
                ("Catch Me If You Can", 2002),
                ("Gangs of New York", 2002),
                ("The Aviator", 2004),
                ("The Departed", 2006),
                ("Blood Diamond", 2006),
                ("Revolutionary Road", 2008),
                ("Shutter Island", 2010),
                ("Inception", 2010),
                ("Django Unchained", 2012),
                ("The Wolf of Wall Street", 2013),
                ("The Revenant", 2015),
                ("Once Upon a Time in Hollywood", 2019),
                ("Killers of the Flower Moon", 2023),
            ]
        case ("Actors", "Gary Oldman"):
            return [
                ("Sid and Nancy", 1986),
                ("Prick Up Your Ears", 1987),
                ("State of Grace", 1990),
                ("JFK", 1991),
                ("Bram Stoker's Dracula", 1992),
                ("True Romance", 1993),
                ("Léon: The Professional", 1994),
                ("Immortal Beloved", 1994),
                ("The Fifth Element", 1997),
                ("Hannibal", 2001),
                ("Tinker Tailor Soldier Spy", 2011),
                ("The Dark Knight Rises", 2012),
                ("Darkest Hour", 2017),
                ("Mank", 2020),
            ]
        case ("Actors", "Russell Crowe"):
            return [
                ("Romper Stomper", 1992),
                ("L.A. Confidential", 1997),
                ("The Insider", 1999),
                ("Gladiator", 2000),
                ("A Beautiful Mind", 2001),
                ("Master and Commander: The Far Side of the World", 2003),
                ("Cinderella Man", 2005),
                ("3:10 to Yuma", 2007),
                ("American Gangster", 2007),
                ("The Nice Guys", 2016),
            ]
        case ("Actors", "Jeff Bridges"):
            return [
                ("The Last Picture Show", 1971),
                ("Thunderbolt and Lightfoot", 1974),
                ("Cutter's Way", 1981),
                ("Starman", 1984),
                ("The Fabulous Baker Boys", 1989),
                ("The Fisher King", 1991),
                ("Fearless", 1993),
                ("The Big Lebowski", 1998),
                ("Seabiscuit", 2003),
                ("Crazy Heart", 2009),
                ("True Grit", 2010),
                ("Hell or High Water", 2016),
            ]
        case ("Actors", "Forest Whitaker"):
            return [
                ("Fast Times at Ridgemont High", 1982),
                ("The Color of Money", 1986),
                ("Platoon", 1986),
                ("Good Morning, Vietnam", 1987),
                ("Bird", 1988),
                ("The Crying Game", 1992),
                ("Ghost Dog: The Way of the Samurai", 1999),
                ("The Last King of Scotland", 2006),
                ("The Butler", 2013),
                ("Black Panther", 2018),
            ]
        case ("Actors", "Adrien Brody"):
            return [
                ("Summer of Sam", 1999),
                ("The Thin Red Line", 1998),
                ("The Pianist", 2002),
                ("The Village", 2004),
                ("King Kong", 2005),
                ("The Darjeeling Limited", 2007),
                ("Predators", 2010),
                ("Midnight in Paris", 2011),
                ("The Grand Budapest Hotel", 2014),
                ("The French Dispatch", 2021),
                ("The Brutalist", 2024),
            ]
        case ("Actors", "Casey Affleck"):
            return [
                ("Gerry", 2002),
                ("Ocean's Eleven", 2001),
                ("The Assassination of Jesse James by the Coward Robert Ford", 2007),
                ("Gone Baby Gone", 2007),
                ("Out of the Furnace", 2013),
                ("Interstellar", 2014),
                ("Manchester by the Sea", 2016),
                ("A Ghost Story", 2017),
                ("The Old Man & the Gun", 2018),
            ]
        case ("Actors", "Mahershala Ali"):
            return [
                ("The Curious Case of Benjamin Button", 2008),
                ("The Place Beyond the Pines", 2012),
                ("Moonlight", 2016),
                ("Hidden Figures", 2016),
                ("Green Book", 2018),
                ("Swan Song", 2021),
            ]
        case ("Actors", "Toshiro Mifune"):
            return [
                ("Drunken Angel", 1948),
                ("Stray Dog", 1949),
                ("Rashomon", 1950),
                ("Seven Samurai", 1954),
                ("I Live in Fear", 1955),
                ("Throne of Blood", 1957),
                ("The Hidden Fortress", 1958),
                ("Yojimbo", 1961),
                ("Sanjuro", 1962),
                ("High and Low", 1963),
                ("Red Beard", 1965),
                ("Samurai Rebellion", 1967),
            ]
        case ("Actors", "Marcello Mastroianni"):
            return [
                ("Big Deal on Madonna Street", 1958),
                ("La Dolce Vita", 1960),
                ("Il Bell'Antonio", 1960),
                ("La Notte", 1961),
                ("Divorce Italian Style", 1961),
                ("8½", 1963),
                ("Yesterday, Today and Tomorrow", 1963),
                ("Marriage Italian Style", 1964),
                ("The Stranger", 1967),
                ("A Special Day", 1977),
                ("City of Women", 1980),
                ("Ginger and Fred", 1986),
                ("Dark Eyes", 1987),
            ]
        case ("Actors", "Max von Sydow"):
            return [
                ("The Seventh Seal", 1957),
                ("Wild Strawberries", 1957),
                ("The Magician", 1958),
                ("The Virgin Spring", 1960),
                ("Through a Glass Darkly", 1961),
                ("Winter Light", 1963),
                ("The Greatest Story Ever Told", 1965),
                ("Hour of the Wolf", 1968),
                ("Shame", 1968),
                ("The Exorcist", 1973),
                ("Three Days of the Condor", 1975),
                ("Hannah and Her Sisters", 1986),
                ("Pelle the Conqueror", 1987),
                ("Minority Report", 2002),
            ]
        case ("Actors", "Tony Leung Chiu-wai"):
            return [
                ("A City of Sadness", 1989),
                ("Hard Boiled", 1992),
                ("Chungking Express", 1994),
                ("Cyclo", 1995),
                ("Happy Together", 1997),
                ("Flowers of Shanghai", 1998),
                ("In the Mood for Love", 2000),
                ("Hero", 2002),
                ("Infernal Affairs", 2002),
                ("2046", 2004),
                ("Lust, Caution", 2007),
                ("The Grandmaster", 2013),
            ]
        case ("Actors", "Song Kang-ho"):
            return [
                ("The Quiet Family", 1998),
                ("Joint Security Area", 2000),
                ("Sympathy for Mr. Vengeance", 2002),
                ("Memories of Murder", 2003),
                ("The Host", 2006),
                ("Secret Sunshine", 2007),
                ("Thirst", 2009),
                ("The Attorney", 2013),
                ("Snowpiercer", 2013),
                ("A Taxi Driver", 2017),
                ("Parasite", 2019),
                ("Broker", 2022),
            ]
        case ("Actors", "Jean-Paul Belmondo"):
            return [
                ("Breathless", 1960),
                ("Léon Morin, Priest", 1961),
                ("A Woman Is a Woman", 1961),
                ("That Man from Rio", 1964),
                ("Pierrot le Fou", 1965),
                ("Mississippi Mermaid", 1969),
                ("Borsalino", 1970),
                ("Stavisky", 1974),
            ]
        case ("Actors", "Gérard Depardieu"):
            return [
                ("Going Places", 1974),
                ("1900", 1976),
                ("The Last Metro", 1980),
                ("The Return of Martin Guerre", 1982),
                ("Danton", 1983),
                ("Jean de Florette", 1986),
                ("Camille Claudel", 1988),
                ("Cyrano de Bergerac", 1990),
                ("Green Card", 1990),
                ("Tous les Matins du Monde", 1991),
                ("Germinal", 1993),
                ("The Count of Monte Cristo", 1998),
            ]
case ("Actresses", "Bette Davis"):
            return [
                ("Of Human Bondage", 1934),
                ("Dangerous", 1935),
                ("Jezebel", 1938),
                ("Dark Victory", 1939),
                ("The Letter", 1940),
                ("The Little Foxes", 1941),
                ("Now, Voyager", 1942),
                ("Mr. Skeffington", 1944),
                ("All About Eve", 1950),
                ("The Star", 1952),
                ("What Ever Happened to Baby Jane?", 1962),
                ("Hush... Hush, Sweet Charlotte", 1964),
            ]
        case ("Actresses", "Katharine Hepburn"):
            return [
                ("Morning Glory", 1933),
                ("Little Women", 1933),
                ("Alice Adams", 1935),
                ("Stage Door", 1937),
                ("Bringing Up Baby", 1938),
                ("Holiday", 1938),
                ("The Philadelphia Story", 1940),
                ("Woman of the Year", 1942),
                ("Adam's Rib", 1949),
                ("The African Queen", 1951),
                ("Summertime", 1955),
                ("Long Day's Journey into Night", 1962),
                ("Guess Who's Coming to Dinner", 1967),
                ("The Lion in Winter", 1968),
                ("On Golden Pond", 1981),
            ]
        case ("Actresses", "Joan Crawford"):
            return [
                ("Grand Hotel", 1932),
                ("The Women", 1939),
                ("A Woman's Face", 1941),
                ("Mildred Pierce", 1945),
                ("Humoresque", 1946),
                ("Possessed", 1947),
                ("Sudden Fear", 1952),
                ("Johnny Guitar", 1954),
                ("What Ever Happened to Baby Jane?", 1962),
            ]
        case ("Actresses", "Barbara Stanwyck"):
            return [
                ("Baby Face", 1933),
                ("Stella Dallas", 1937),
                ("The Lady Eve", 1941),
                ("Ball of Fire", 1941),
                ("Meet John Doe", 1941),
                ("Double Indemnity", 1944),
                ("Christmas in Connecticut", 1945),
                ("The Strange Love of Martha Ivers", 1946),
                ("Sorry, Wrong Number", 1948),
                ("Clash by Night", 1952),
            ]
        case ("Actresses", "Ingrid Bergman"):
            return [
                ("Intermezzo", 1939),
                ("Dr. Jekyll and Mr. Hyde", 1941),
                ("Casablanca", 1942),
                ("For Whom the Bell Tolls", 1943),
                ("Gaslight", 1944),
                ("Spellbound", 1945),
                ("Notorious", 1946),
                ("Joan of Arc", 1948),
                ("Stromboli", 1950),
                ("Journey to Italy", 1954),
                ("Anastasia", 1956),
                ("Indiscreet", 1958),
                ("Murder on the Orient Express", 1974),
                ("Autumn Sonata", 1978),
            ]
        case ("Actresses", "Audrey Hepburn"):
            return [
                ("Roman Holiday", 1953),
                ("Sabrina", 1954),
                ("Funny Face", 1957),
                ("Love in the Afternoon", 1957),
                ("The Nun's Story", 1959),
                ("Breakfast at Tiffany's", 1961),
                ("The Children's Hour", 1961),
                ("Charade", 1963),
                ("My Fair Lady", 1964),
                ("Two for the Road", 1967),
                ("Wait Until Dark", 1967),
            ]
        case ("Actresses", "Elizabeth Taylor"):
            return [
                ("National Velvet", 1944),
                ("Father of the Bride", 1950),
                ("A Place in the Sun", 1951),
                ("Giant", 1956),
                ("Raintree County", 1957),
                ("Cat on a Hot Tin Roof", 1958),
                ("Suddenly, Last Summer", 1959),
                ("BUtterfield 8", 1960),
                ("Cleopatra", 1963),
                ("Who's Afraid of Virginia Woolf?", 1966),
                ("Reflections in a Golden Eye", 1967),
            ]
        case ("Actresses", "Vivien Leigh"):
            return [
                ("Fire Over England", 1937),
                ("Gone with the Wind", 1939),
                ("Waterloo Bridge", 1940),
                ("That Hamilton Woman", 1941),
                ("Caesar and Cleopatra", 1945),
                ("Anna Karenina", 1948),
                ("A Streetcar Named Desire", 1951),
                ("The Roman Spring of Mrs. Stone", 1961),
                ("Ship of Fools", 1965),
            ]
        case ("Actresses", "Faye Dunaway"):
            return [
                ("Bonnie and Clyde", 1967),
                ("The Thomas Crown Affair", 1968),
                ("Little Big Man", 1970),
                ("Chinatown", 1974),
                ("The Towering Inferno", 1974),
                ("Three Days of the Condor", 1975),
                ("Network", 1976),
                ("Eyes of Laura Mars", 1978),
                ("Mommie Dearest", 1981),
                ("Barfly", 1987),
            ]
        case ("Actresses", "Jane Fonda"):
            return [
                ("Cat Ballou", 1965),
                ("Barefoot in the Park", 1967),
                ("Barbarella", 1968),
                ("They Shoot Horses, Don't They?", 1969),
                ("Klute", 1971),
                ("Julia", 1977),
                ("Coming Home", 1978),
                ("The China Syndrome", 1979),
                ("9 to 5", 1980),
                ("On Golden Pond", 1981),
            ]
        case ("Actresses", "Ellen Burstyn"):
            return [
                ("The Last Picture Show", 1971),
                ("The Exorcist", 1973),
                ("Alice Doesn't Live Here Anymore", 1974),
                ("Same Time, Next Year", 1978),
                ("Resurrection", 1980),
                ("Requiem for a Dream", 2000),
                ("Interstellar", 2014),
            ]
        case ("Actresses", "Liv Ullmann"):
            return [
                ("Persona", 1966),
                ("Hour of the Wolf", 1968),
                ("Shame", 1968),
                ("The Passion of Anna", 1969),
                ("Cries and Whispers", 1972),
                ("Scenes from a Marriage", 1973),
                ("Face to Face", 1976),
                ("Autumn Sonata", 1978),
                ("Saraband", 2003),
            ]
        case ("Actresses", "Vanessa Redgrave"):
            return [
                ("Morgan: A Suitable Case for Treatment", 1966),
                ("Blowup", 1966),
                ("Camelot", 1967),
                ("Isadora", 1968),
                ("Mary, Queen of Scots", 1971),
                ("Julia", 1977),
                ("Howards End", 1992),
                ("Mrs Dalloway", 1997),
                ("Atonement", 2007),
                ("Coriolanus", 2011),
            ]
        case ("Actresses", "Sissy Spacek"):
            return [
                ("Badlands", 1973),
                ("Carrie", 1976),
                ("3 Women", 1977),
                ("Coal Miner's Daughter", 1980),
                ("Missing", 1982),
                ("The River", 1984),
                ("Crimes of the Heart", 1986),
                ("JFK", 1991),
                ("In the Bedroom", 2001),
            ]
        case ("Actresses", "Jessica Lange"):
            return [
                ("Frances", 1982),
                ("Tootsie", 1982),
                ("Country", 1984),
                ("Sweet Dreams", 1985),
                ("Crimes of the Heart", 1986),
                ("Music Box", 1989),
                ("Cape Fear", 1991),
                ("Blue Sky", 1994),
                ("Rob Roy", 1995),
                ("Big Fish", 2003),
            ]
        case ("Actresses", "Diane Keaton"):
            return [
                ("The Godfather", 1972),
                ("Sleeper", 1973),
                ("The Godfather Part II", 1974),
                ("Love and Death", 1975),
                ("Annie Hall", 1977),
                ("Looking for Mr. Goodbar", 1977),
                ("Interiors", 1978),
                ("Manhattan", 1979),
                ("Reds", 1981),
                ("Baby Boom", 1987),
                ("Father of the Bride", 1991),
                ("Something's Gotta Give", 2003),
            ]
        case ("Actresses", "Meryl Streep"):
            return [
                ("The Deer Hunter", 1978),
                ("Kramer vs. Kramer", 1979),
                ("The French Lieutenant's Woman", 1981),
                ("Sophie's Choice", 1982),
                ("Silkwood", 1983),
                ("Out of Africa", 1985),
                ("Ironweed", 1987),
                ("A Cry in the Dark", 1988),
                ("Postcards from the Edge", 1990),
                ("The Bridges of Madison County", 1995),
                ("Adaptation", 2002),
                ("The Hours", 2002),
                ("The Devil Wears Prada", 2006),
                ("Doubt", 2008),
                ("Julie & Julia", 2009),
                ("The Iron Lady", 2011),
                ("August: Osage County", 2013),
            ]
        case ("Actresses", "Cate Blanchett"):
            return [
                ("Elizabeth", 1998),
                ("The Talented Mr. Ripley", 1999),
                ("The Lord of the Rings: The Fellowship of the Ring", 2001),
                ("The Aviator", 2004),
                ("Notes on a Scandal", 2006),
                ("I'm Not There", 2007),
                ("Elizabeth: The Golden Age", 2007),
                ("Blue Jasmine", 2013),
                ("Carol", 2015),
                ("Manifesto", 2015),
                ("Ocean's 8", 2018),
                ("Nightmare Alley", 2021),
                ("TÁR", 2022),
            ]
        case ("Actresses", "Julianne Moore"):
            return [
                ("Short Cuts", 1993),
                ("Safe", 1995),
                ("Boogie Nights", 1997),
                ("The Big Lebowski", 1998),
                ("Magnolia", 1999),
                ("The End of the Affair", 1999),
                ("Far from Heaven", 2002),
                ("The Hours", 2002),
                ("Children of Men", 2006),
                ("A Single Man", 2009),
                ("The Kids Are All Right", 2010),
                ("Still Alice", 2014),
                ("May December", 2023),
            ]
        case ("Actresses", "Frances McDormand"):
            return [
                ("Blood Simple", 1984),
                ("Mississippi Burning", 1988),
                ("Fargo", 1996),
                ("Almost Famous", 2000),
                ("Wonder Boys", 2000),
                ("North Country", 2005),
                ("Burn After Reading", 2008),
                ("Olive Kitteridge", 2014),
                ("Three Billboards Outside Ebbing, Missouri", 2017),
                ("Nomadland", 2020),
                ("The Tragedy of Macbeth", 2021),
            ]
        case ("Actresses", "Nicole Kidman"):
            return [
                ("Dead Calm", 1989),
                ("To Die For", 1995),
                ("Eyes Wide Shut", 1999),
                ("Moulin Rouge!", 2001),
                ("The Others", 2001),
                ("The Hours", 2002),
                ("Dogville", 2003),
                ("Birth", 2004),
                ("Margot at the Wedding", 2007),
                ("Rabbit Hole", 2010),
                ("Lion", 2016),
                ("The Beguiled", 2017),
                ("Big Little Lies", 2017),
                ("Destroyer", 2018),
            ]
        case ("Actresses", "Kate Winslet"):
            return [
                ("Heavenly Creatures", 1994),
                ("Sense and Sensibility", 1995),
                ("Titanic", 1997),
                ("Iris", 2001),
                ("Eternal Sunshine of the Spotless Mind", 2004),
                ("Finding Neverland", 2004),
                ("Little Children", 2006),
                ("Revolutionary Road", 2008),
                ("The Reader", 2008),
                ("Mildred Pierce", 2011),
                ("Steve Jobs", 2015),
                ("Mare of Easttown", 2021),
            ]
        case ("Actresses", "Tilda Swinton"):
            return [
                ("Orlando", 1992),
                ("The Deep End", 2001),
                ("Young Adam", 2003),
                ("Michael Clayton", 2007),
                ("I Am Love", 2009),
                ("We Need to Talk About Kevin", 2011),
                ("Moonrise Kingdom", 2012),
                ("Only Lovers Left Alive", 2013),
                ("Snowpiercer", 2013),
                ("A Bigger Splash", 2015),
                ("Suspiria", 2018),
                ("The Souvenir", 2019),
                ("Memoria", 2021),
            ]
        case ("Actresses", "Viola Davis"):
            return [
                ("Doubt", 2008),
                ("The Help", 2011),
                ("Fences", 2016),
                ("Widows", 2018),
                ("Ma Rainey's Black Bottom", 2020),
                ("The Woman King", 2022),
            ]
        case ("Actresses", "Helen Mirren"):
            return [
                ("The Long Good Friday", 1980),
                ("Excalibur", 1981),
                ("The Cook, the Thief, His Wife & Her Lover", 1989),
                ("The Madness of King George", 1994),
                ("Gosford Park", 2001),
                ("Calendar Girls", 2003),
                ("The Queen", 2006),
                ("The Last Station", 2009),
                ("Hitchcock", 2012),
                ("Trumbo", 2015),
            ]
        case ("Actresses", "Judi Dench"):
            return [
                ("A Room with a View", 1985),
                ("Mrs Brown", 1997),
                ("Shakespeare in Love", 1998),
                ("Iris", 2001),
                ("Notes on a Scandal", 2006),
                ("Mrs Henderson Presents", 2005),
                ("Philomena", 2013),
                ("Belfast", 2021),
            ]
        case ("Actresses", "Emma Thompson"):
            return [
                ("Howards End", 1992),
                ("Much Ado About Nothing", 1993),
                ("The Remains of the Day", 1993),
                ("In the Name of the Father", 1993),
                ("Sense and Sensibility", 1995),
                ("Love Actually", 2003),
                ("Stranger Than Fiction", 2006),
                ("An Education", 2009),
                ("Saving Mr. Banks", 2013),
                ("Late Night", 2019),
            ]
        case ("Actresses", "Marion Cotillard"):
            return [
                ("Taxi", 1998),
                ("A Very Long Engagement", 2004),
                ("La Vie en Rose", 2007),
                ("Public Enemies", 2009),
                ("Nine", 2009),
                ("Inception", 2010),
                ("Midnight in Paris", 2011),
                ("Rust and Bone", 2012),
                ("The Immigrant", 2013),
                ("Two Days, One Night", 2014),
                ("Macbeth", 2015),
                ("Annette", 2021),
            ]
        case ("Actresses", "Sigourney Weaver"):
            return [
                ("Alien", 1979),
                ("The Year of Living Dangerously", 1982),
                ("Ghostbusters", 1984),
                ("Aliens", 1986),
                ("Gorillas in the Mist", 1988),
                ("Working Girl", 1988),
                ("Alien 3", 1992),
                ("Dave", 1993),
                ("Death and the Maiden", 1994),
                ("The Ice Storm", 1997),
                ("Galaxy Quest", 1999),
                ("Avatar", 2009),
            ]
        case ("Actresses", "Michelle Yeoh"):
            return [
                ("Police Story 3: Super Cop", 1992),
                ("Tomorrow Never Dies", 1997),
                ("Crouching Tiger, Hidden Dragon", 2000),
                ("Memoirs of a Geisha", 2005),
                ("The Lady", 2011),
                ("Crazy Rich Asians", 2018),
                ("Last Christmas", 2019),
                ("Everything Everywhere All at Once", 2022),
                ("A Haunting in Venice", 2023),
            ]case ("Directors", "Alfred Hitchcock"):
            return [
                ("The 39 Steps", 1935),
                ("The Lady Vanishes", 1938),
                ("Rebecca", 1940),
                ("Shadow of a Doubt", 1943),
                ("Notorious", 1946),
                ("Strangers on a Train", 1951),
                ("Rear Window", 1954),
                ("Dial M for Murder", 1954),
                ("To Catch a Thief", 1955),
                ("The Man Who Knew Too Much", 1956),
                ("Vertigo", 1958),
                ("North by Northwest", 1959),
                ("Psycho", 1960),
                ("The Birds", 1963),
            ]
        case ("Directors", "Orson Welles"):
            return [
                ("Citizen Kane", 1941),
                ("The Magnificent Ambersons", 1942),
                ("The Stranger", 1946),
                ("The Lady from Shanghai", 1947),
                ("Macbeth", 1948),
                ("Othello", 1951),
                ("Touch of Evil", 1958),
                ("The Trial", 1962),
                ("Chimes at Midnight", 1965),
                ("F for Fake", 1973),
            ]
        case ("Directors", "John Ford"):
            return [
                ("Stagecoach", 1939),
                ("Young Mr. Lincoln", 1939),
                ("The Grapes of Wrath", 1940),
                ("How Green Was My Valley", 1941),
                ("My Darling Clementine", 1946),
                ("Fort Apache", 1948),
                ("She Wore a Yellow Ribbon", 1949),
                ("Rio Grande", 1950),
                ("The Quiet Man", 1952),
                ("The Searchers", 1956),
                ("The Man Who Shot Liberty Valance", 1962),
            ]
        case ("Directors", "Howard Hawks"):
            return [
                ("Scarface", 1932),
                ("Twentieth Century", 1934),
                ("Bringing Up Baby", 1938),
                ("Only Angels Have Wings", 1939),
                ("His Girl Friday", 1940),
                ("Sergeant York", 1941),
                ("To Have and Have Not", 1944),
                ("The Big Sleep", 1946),
                ("Red River", 1948),
                ("Gentlemen Prefer Blondes", 1953),
                ("Rio Bravo", 1959),
            ]
        case ("Directors", "Billy Wilder"):
            return [
                ("Double Indemnity", 1944),
                ("The Lost Weekend", 1945),
                ("Sunset Boulevard", 1950),
                ("Ace in the Hole", 1951),
                ("Stalag 17", 1953),
                ("Sabrina", 1954),
                ("The Seven Year Itch", 1955),
                ("Witness for the Prosecution", 1957),
                ("Some Like It Hot", 1959),
                ("The Apartment", 1960),
                ("One, Two, Three", 1961),
            ]
        case ("Directors", "John Huston"):
            return [
                ("The Maltese Falcon", 1941),
                ("The Treasure of the Sierra Madre", 1948),
                ("Key Largo", 1948),
                ("The Asphalt Jungle", 1950),
                ("The African Queen", 1951),
                ("Moulin Rouge", 1952),
                ("Moby Dick", 1956),
                ("The Misfits", 1961),
                ("Fat City", 1972),
                ("The Man Who Would Be King", 1975),
                ("Prizzi's Honor", 1985),
                ("The Dead", 1987),
            ]
        case ("Directors", "Charlie Chaplin"):
            return [
                ("The Kid", 1921),
                ("A Woman of Paris", 1923),
                ("The Gold Rush", 1925),
                ("The Circus", 1928),
                ("City Lights", 1931),
                ("Modern Times", 1936),
                ("The Great Dictator", 1940),
                ("Monsieur Verdoux", 1947),
                ("Limelight", 1952),
            ]
        case ("Directors", "Buster Keaton"):
            return [
                ("Our Hospitality", 1923),
                ("Sherlock Jr.", 1924),
                ("The Navigator", 1924),
                ("Seven Chances", 1925),
                ("Go West", 1925),
                ("The General", 1926),
                ("College", 1927),
                ("Steamboat Bill, Jr.", 1928),
                ("The Cameraman", 1928),
            ]
        case ("Directors", "F.W. Murnau"):
            return [
                ("Nosferatu", 1922),
                ("The Last Laugh", 1924),
                ("Faust", 1926),
                ("Sunrise: A Song of Two Humans", 1927),
                ("City Girl", 1930),
                ("Tabu", 1931),
            ]
        case ("Directors", "Martin Scorsese"):
            return [
                ("Mean Streets", 1973),
                ("Alice Doesn't Live Here Anymore", 1974),
                ("Taxi Driver", 1976),
                ("New York, New York", 1977),
                ("Raging Bull", 1980),
                ("The King of Comedy", 1982),
                ("After Hours", 1985),
                ("The Last Temptation of Christ", 1988),
                ("Goodfellas", 1990),
                ("Cape Fear", 1991),
                ("The Age of Innocence", 1993),
                ("Casino", 1995),
                ("Gangs of New York", 2002),
                ("The Departed", 2006),
                ("Shutter Island", 2010),
                ("The Wolf of Wall Street", 2013),
                ("Silence", 2016),
                ("The Irishman", 2019),
                ("Killers of the Flower Moon", 2023),
            ]
        case ("Directors", "Francis Ford Coppola"):
            return [
                ("The Rain People", 1969),
                ("The Godfather", 1972),
                ("The Conversation", 1974),
                ("The Godfather Part II", 1974),
                ("Apocalypse Now", 1979),
                ("Rumble Fish", 1983),
                ("The Outsiders", 1983),
                ("Peggy Sue Got Married", 1986),
                ("The Godfather Part III", 1990),
                ("Bram Stoker's Dracula", 1992),
                ("Megalopolis", 2024),
            ]
        case ("Directors", "Steven Spielberg"):
            return [
                ("Duel", 1971),
                ("The Sugarland Express", 1974),
                ("Jaws", 1975),
                ("Close Encounters of the Third Kind", 1977),
                ("Raiders of the Lost Ark", 1981),
                ("E.T. the Extra-Terrestrial", 1982),
                ("The Color Purple", 1985),
                ("Empire of the Sun", 1987),
                ("Jurassic Park", 1993),
                ("Schindler's List", 1993),
                ("Saving Private Ryan", 1998),
                ("A.I. Artificial Intelligence", 2001),
                ("Minority Report", 2002),
                ("Munich", 2005),
                ("Lincoln", 2012),
                ("Bridge of Spies", 2015),
                ("The Fabelmans", 2022),
            ]
        case ("Directors", "Robert Altman"):
            return [
                ("M*A*S*H", 1970),
                ("McCabe & Mrs. Miller", 1971),
                ("The Long Goodbye", 1973),
                ("Thieves Like Us", 1974),
                ("California Split", 1974),
                ("Nashville", 1975),
                ("3 Women", 1977),
                ("The Player", 1992),
                ("Short Cuts", 1993),
                ("Gosford Park", 2001),
            ]
        case ("Directors", "Terrence Malick"):
            return [
                ("Badlands", 1973),
                ("Days of Heaven", 1978),
                ("The Thin Red Line", 1998),
                ("The New World", 2005),
                ("The Tree of Life", 2011),
                ("To the Wonder", 2012),
                ("Knight of Cups", 2015),
                ("A Hidden Life", 2019),
            ]
        case ("Directors", "Stanley Kubrick"):
            return [
                ("The Killing", 1956),
                ("Paths of Glory", 1957),
                ("Spartacus", 1960),
                ("Lolita", 1962),
                ("Dr. Strangelove", 1964),
                ("2001: A Space Odyssey", 1968),
                ("A Clockwork Orange", 1971),
                ("Barry Lyndon", 1975),
                ("The Shining", 1980),
                ("Full Metal Jacket", 1987),
                ("Eyes Wide Shut", 1999),
            ]
        case ("Directors", "David Lynch"):
            return [
                ("Eraserhead", 1977),
                ("The Elephant Man", 1980),
                ("Dune", 1984),
                ("Blue Velvet", 1986),
                ("Wild at Heart", 1990),
                ("Twin Peaks: Fire Walk with Me", 1992),
                ("Lost Highway", 1997),
                ("The Straight Story", 1999),
                ("Mulholland Drive", 2001),
                ("Inland Empire", 2006),
            ]
        case ("Directors", "Coen Brothers"):
            return [
                ("Blood Simple", 1984),
                ("Raising Arizona", 1987),
                ("Miller's Crossing", 1990),
                ("Barton Fink", 1991),
                ("Fargo", 1996),
                ("The Big Lebowski", 1998),
                ("O Brother, Where Art Thou?", 2000),
                ("No Country for Old Men", 2007),
                ("Burn After Reading", 2008),
                ("A Serious Man", 2009),
                ("True Grit", 2010),
                ("Inside Llewyn Davis", 2013),
                ("Hail, Caesar!", 2016),
                ("The Ballad of Buster Scruggs", 2018),
            ]
        case ("Directors", "Paul Thomas Anderson"):
            return [
                ("Hard Eight", 1996),
                ("Boogie Nights", 1997),
                ("Magnolia", 1999),
                ("Punch-Drunk Love", 2002),
                ("There Will Be Blood", 2007),
                ("The Master", 2012),
                ("Inherent Vice", 2014),
                ("Phantom Thread", 2017),
                ("Licorice Pizza", 2021),
                ("One Battle After Another", 2025),
            ]
        case ("Directors", "Quentin Tarantino"):
            return [
                ("Reservoir Dogs", 1992),
                ("Pulp Fiction", 1994),
                ("Jackie Brown", 1997),
                ("Kill Bill: Vol. 1", 2003),
                ("Kill Bill: Vol. 2", 2004),
                ("Death Proof", 2007),
                ("Inglourious Basterds", 2009),
                ("Django Unchained", 2012),
                ("The Hateful Eight", 2015),
                ("Once Upon a Time in Hollywood", 2019),
            ]
        case ("Directors", "David Fincher"):
            return [
                ("Se7en", 1995),
                ("The Game", 1997),
                ("Fight Club", 1999),
                ("Panic Room", 2002),
                ("Zodiac", 2007),
                ("The Curious Case of Benjamin Button", 2008),
                ("The Social Network", 2010),
                ("The Girl with the Dragon Tattoo", 2011),
                ("Gone Girl", 2014),
                ("Mank", 2020),
                ("The Killer", 2023),
            ]
        case ("Directors", "Christopher Nolan"):
            return [
                ("Following", 1998),
                ("Memento", 2000),
                ("Insomnia", 2002),
                ("Batman Begins", 2005),
                ("The Prestige", 2006),
                ("The Dark Knight", 2008),
                ("Inception", 2010),
                ("The Dark Knight Rises", 2012),
                ("Interstellar", 2014),
                ("Dunkirk", 2017),
                ("Tenet", 2020),
                ("Oppenheimer", 2023),
            ]
        case ("Directors", "Kelly Reichardt"):
            return [
                ("River of Grass", 1994),
                ("Old Joy", 2006),
                ("Wendy and Lucy", 2008),
                ("Meek's Cutoff", 2010),
                ("Night Moves", 2013),
                ("Certain Women", 2016),
                ("First Cow", 2019),
                ("Showing Up", 2022),
            ]
        case ("Directors", "Akira Kurosawa"):
            return [
                ("Drunken Angel", 1948),
                ("Stray Dog", 1949),
                ("Rashomon", 1950),
                ("Ikiru", 1952),
                ("Seven Samurai", 1954),
                ("Throne of Blood", 1957),
                ("The Hidden Fortress", 1958),
                ("Yojimbo", 1961),
                ("Sanjuro", 1962),
                ("High and Low", 1963),
                ("Red Beard", 1965),
                ("Dersu Uzala", 1975),
                ("Kagemusha", 1980),
                ("Ran", 1985),
            ]
        case ("Directors", "Yasujirō Ozu"):
            return [
                ("I Was Born, But...", 1932),
                ("Late Spring", 1949),
                ("Early Summer", 1951),
                ("Tokyo Story", 1953),
                ("Early Spring", 1956),
                ("Equinox Flower", 1958),
                ("Good Morning", 1959),
                ("Floating Weeds", 1959),
                ("Late Autumn", 1960),
                ("An Autumn Afternoon", 1962),
            ]
        case ("Directors", "Hayao Miyazaki"):
            return [
                ("The Castle of Cagliostro", 1979),
                ("Nausicaä of the Valley of the Wind", 1984),
                ("Castle in the Sky", 1986),
                ("My Neighbor Totoro", 1988),
                ("Kiki's Delivery Service", 1989),
                ("Porco Rosso", 1992),
                ("Princess Mononoke", 1997),
                ("Spirited Away", 2001),
                ("Howl's Moving Castle", 2004),
                ("Ponyo", 2008),
                ("The Wind Rises", 2013),
                ("The Boy and the Heron", 2023),
            ]
        case ("Directors", "Ingmar Bergman"):
            return [
                ("Summer with Monika", 1953),
                ("Smiles of a Summer Night", 1955),
                ("The Seventh Seal", 1957),
                ("Wild Strawberries", 1957),
                ("The Virgin Spring", 1960),
                ("Through a Glass Darkly", 1961),
                ("Winter Light", 1963),
                ("The Silence", 1963),
                ("Persona", 1966),
                ("Shame", 1968),
                ("Cries and Whispers", 1972),
                ("Scenes from a Marriage", 1973),
                ("Autumn Sonata", 1978),
                ("Fanny and Alexander", 1982),
            ]
        case ("Directors", "Federico Fellini"):
            return [
                ("I Vitelloni", 1953),
                ("La Strada", 1954),
                ("Nights of Cabiria", 1957),
                ("La Dolce Vita", 1960),
                ("8½", 1963),
                ("Juliet of the Spirits", 1965),
                ("Fellini Satyricon", 1969),
                ("Roma", 1972),
                ("Amarcord", 1973),
                ("Casanova", 1976),
                ("And the Ship Sails On", 1983),
            ]
        case ("Directors", "Andrei Tarkovsky"):
            return [
                ("Ivan's Childhood", 1962),
                ("Andrei Rublev", 1966),
                ("Solaris", 1972),
                ("Mirror", 1975),
                ("Stalker", 1979),
                ("Nostalghia", 1983),
                ("The Sacrifice", 1986),
            ]
        case ("Directors", "Wong Kar-wai"):
            return [
                ("As Tears Go By", 1988),
                ("Days of Being Wild", 1990),
                ("Chungking Express", 1994),
                ("Ashes of Time", 1994),
                ("Fallen Angels", 1995),
                ("Happy Together", 1997),
                ("In the Mood for Love", 2000),
                ("2046", 2004),
                ("My Blueberry Nights", 2007),
                ("The Grandmaster", 2013),
            ]
        case ("Directors", "Bong Joon-ho"):
            return [
                ("Barking Dogs Never Bite", 2000),
                ("Memories of Murder", 2003),
                ("The Host", 2006),
                ("Mother", 2009),
                ("Snowpiercer", 2013),
                ("Okja", 2017),
                ("Parasite", 2019),
                ("Mickey 17", 2025),
            ]
        case ("Mystery", "Essential"):
            return [
                ("Chinatown", 1974),
                ("Vertigo", 1958),
                ("Rear Window", 1954),
                ("The Third Man", 1949),
                ("The Maltese Falcon", 1941),
                ("Memento", 2000),
                ("Mulholland Drive", 2001),
                ("Zodiac", 2007),
                ("Knives Out", 2019),
                ("The Big Sleep", 1946),
            ]
        case ("Mystery", "Foundational"):
            return [
                ("Laura", 1944),
                ("The Long Goodbye", 1973),
                ("L.A. Confidential", 1997),
                ("Blue Velvet", 1986),
                ("The Usual Suspects", 1995),
                ("Se7en", 1995),
                ("Gone Girl", 2014),
                ("Prisoners", 2013),
                ("Murder on the Orient Express", 1974),
                ("Witness for the Prosecution", 1957),
                ("The Lady Vanishes", 1938),
                ("Strangers on a Train", 1951),
                ("Dial M for Murder", 1954),
                ("Klute", 1971),
                ("The Conversation", 1974),
            ]
        case ("Mystery", "Classics"):
            return [
                ("Mystic River", 2003),
                ("Insomnia", 2002),
                ("The Silence of the Lambs", 1991),
                ("Blow-Up", 1966),
                ("Sleuth", 1972),
                ("Murder, My Sweet", 1944),
                ("The Big Heat", 1953),
                ("Kiss Me Deadly", 1955),
                ("Touch of Evil", 1958),
                ("The Spiral Staircase", 1946),
                ("Gaslight", 1944),
                ("Shadow of a Doubt", 1943),
                ("Anatomy of a Murder", 1959),
                ("Body Heat", 1981),
                ("The Name of the Rose", 1986),
            ]
        case ("Mystery", "Well-Versed"):
            return [
                ("Brick", 2005),
                ("Inherent Vice", 2014),
                ("Nightcrawler", 2014),
                ("Wind River", 2017),
                ("The Girl with the Dragon Tattoo", 2011),
                ("Shutter Island", 2010),
                ("The Prestige", 2006),
                ("Identity", 2003),
                ("Devil in a Blue Dress", 1995),
                ("Mulholland Falls", 1996),
                ("Hollywoodland", 2006),
                ("The Black Dahlia", 2006),
                ("True Confessions", 1981),
                ("The Two Jakes", 1990),
                ("Twin Peaks: Fire Walk with Me", 1992),
                ("Lost Highway", 1997),
                ("The Pledge", 2001),
                ("Capote", 2005),
                ("Foxcatcher", 2014),
                ("Spotlight", 2015),
            ]
        case ("Mystery", "Devotee"):
            return [
                ("Memories of Murder", 2003),
                ("Oldboy", 2003),
                ("The Chaser", 2008),
                ("The Wailing", 2016),
                ("Burning", 2018),
                ("Decision to Leave", 2022),
                ("The Vanishing", 1988),
                ("Diabolique", 1955),
                ("Caché", 2005),
                ("The White Ribbon", 2009),
                ("The Secret in Their Eyes", 2009),
                ("Headhunters", 2011),
                ("Tell No One", 2006),
                ("The Girl on the Train", 2016),
                ("A Most Violent Year", 2014),
                ("Mystery Road", 2013),
                ("Animal Kingdom", 2010),
                ("The Dry", 2020),
                ("Snowtown", 2011),
                ("Goodnight Mommy", 2014),
            ]
        case ("Mystery", "Connoisseur"):
            return [
                ("Charade", 1963),
                ("Wait Until Dark", 1967),
                ("The Manchurian Candidate", 1962),
                ("Klute", 1971),
                ("The Parallax View", 1974),
                ("Three Days of the Condor", 1975),
                ("Marathon Man", 1976),
                ("All the President's Men", 1976),
                ("The Onion Field", 1979),
                ("Cutter's Way", 1981),
                ("Body Double", 1984),
                ("Blow Out", 1981),
                ("House of Games", 1987),
                ("The Vanishing", 1993),
                ("Jagged Edge", 1985),
                ("No Way Out", 1987),
                ("The Morning After", 1986),
                ("Frantic", 1988),
                ("Presumed Innocent", 1990),
                ("Final Analysis", 1992),
            ]
        case ("Mystery", "Deep Cuts"):
            return [
                ("The Browning Version", 1951),
                ("Niagara", 1953),
                ("Sudden Fear", 1952),
                ("The Big Clock", 1948),
                ("The Window", 1949),
                ("Crime of Passion", 1957),
                ("Pushover", 1954),
                ("Slightly Scarlet", 1956),
                ("Black Angel", 1946),
                ("Phantom Lady", 1944),
                ("The Stranger", 1946),
                ("So Dark the Night", 1946),
                ("The Locket", 1946),
                ("The Dark Mirror", 1946),
                ("Whirlpool", 1949),
            ]
        case ("Mystery", "Specialist"):
            return [
                ("The Reckless Moment", 1949),
                ("The Sniper", 1952),
                ("While the City Sleeps", 1956),
                ("Beyond a Reasonable Doubt", 1956),
                ("The Tattered Dress", 1957),
                ("The Brothers Rico", 1957),
                ("Murder by Contract", 1958),
                ("Odds Against Tomorrow", 1959),
                ("Blast of Silence", 1961),
                ("The Naked Kiss", 1964),
            ]
        case ("Mystery", "Archivist"):
            return [
                ("Investigation of a Citizen Above Suspicion", 1970),
                ("The Conformist", 1970),
                ("The Bird with the Crystal Plumage", 1970),
                ("Deep Red", 1975),
                ("Don't Look Now", 1973),
                ("The Wicker Man", 1973),
                ("Get Carter", 1971),
                ("The Offence", 1973),
                ("Hickey & Boggs", 1972),
                ("Night Moves", 1975),
                ("The Drowning Pool", 1975),
                ("Farewell, My Lovely", 1975),
                ("The Late Show", 1977),
            ]
        case ("Mystery", "Master"):
            return [
                ("Cop", 1988),
                ("Stormy Monday", 1988),
                ("Mortal Thoughts", 1991),
                ("Deceived", 1991),
                ("Shattered", 1991),
                ("Whispers in the Dark", 1992),
                ("Malice", 1993),
                ("Dolores Claiborne", 1995),
                ("Mute Witness", 1995),
                ("Twilight", 1998),
                ("Croupier", 1998),
                ("The Limey", 1999),
            ]
        default:
            return []
        }
    }
}

// MARK: - Category Progress Manager

@MainActor
class CategoryProgressManager: ObservableObject {
    static let shared = CategoryProgressManager()

    private let defaults = UserDefaults.standard
    private let cacheKey = "categoryProgressCache"

    // In-memory cache of category -> Set<tmdbId>
    private var categoryCache: [String: Set<Int>] = [:]

    private init() {
        loadFromStorage()
        migrateTierKeys()
    }

    // Migrate old "Tier X:" format keys to new format
    private func migrateTierKeys() {
        let migrationKey = "tierKeysMigrated"
        guard !defaults.bool(forKey: migrationKey) else { return }

        var updated = false
        var newCache: [String: Set<Int>] = categoryCache

        for (key, value) in categoryCache {
            // Check if key contains "Tier X:" pattern
            if key.contains("Tier ") && key.contains(":") {
                let components = key.split(separator: ":", maxSplits: 2)
                if components.count == 2 {
                    let category = String(components[0])
                    let oldTier = String(components[1])

                    // Extract tier name after "Tier X: "
                    if let tierNameStart = oldTier.range(of: ": ")?.upperBound {
                        let tierName = String(oldTier[tierNameStart...])
                        let newKey = "\(category):\(tierName)"

                        // Migrate to new key
                        newCache[newKey] = value
                        newCache.removeValue(forKey: key)
                        updated = true
                        print("✅ Migrated progress key: \(key) → \(newKey)")
                    }
                }
            }
        }

        if updated {
            categoryCache = newCache
            saveToStorage()
        }

        defaults.set(true, forKey: migrationKey)
    }

    // MARK: - Storage

    private func loadFromStorage() {
        guard let data = defaults.data(forKey: cacheKey),
              let decoded = try? JSONDecoder().decode([String: [Int]].self, from: data) else {
            return
        }

        // Convert [Int] arrays back to Set<Int>
        categoryCache = decoded.mapValues { Set($0) }
    }

    private func saveToStorage() {
        // Convert Set<Int> to [Int] for JSON encoding
        let encodable = categoryCache.mapValues { Array($0) }

        guard let encoded = try? JSONEncoder().encode(encodable) else { return }
        defaults.set(encoded, forKey: cacheKey)
    }

    // MARK: - Public API

    // Register a movie as part of a category
    func register(tmdbId: Int, for category: String) {
        if categoryCache[category] == nil {
            categoryCache[category] = Set()
        }
        categoryCache[category]?.insert(tmdbId)
        saveToStorage()
    }

    // Register multiple movies for a category (replaces existing)
    func register(movies: [EssentialMovie], for category: String) {
        let tmdbIds = Set(movies.map { $0.tmdbId })
        categoryCache[category] = tmdbIds
        saveToStorage()
    }

    // Calculate progress for a category (0.0 to 1.0)
    func progress(for category: String, lovedMovies: [SavedMovie]) -> Double {
        guard let categoryMovies = categoryCache[category], !categoryMovies.isEmpty else {
            return 0.0
        }

        let lovedIds = Set(lovedMovies.map { $0.id })
        let seenCount = categoryMovies.intersection(lovedIds).count

        return Double(seenCount) / Double(categoryMovies.count)
    }

    // Get seen count for a category
    func seenCount(for category: String, lovedMovies: [SavedMovie]) -> Int {
        guard let categoryMovies = categoryCache[category] else { return 0 }
        let lovedIds = Set(lovedMovies.map { $0.id })
        return categoryMovies.intersection(lovedIds).count
    }

    // Get total count for a category
    func totalCount(for category: String) -> Int {
        categoryCache[category]?.count ?? 0
    }

    // Check if a category has cached data
    func hasCachedData(for category: String) -> Bool {
        if let cache = categoryCache[category] {
            return !cache.isEmpty
        }
        return false
    }

    // Clear all cached data (for testing/debugging)
    func clearCache() {
        categoryCache.removeAll()
        defaults.removeObject(forKey: cacheKey)
    }
}

#Preview {
    GeniusView()
}
