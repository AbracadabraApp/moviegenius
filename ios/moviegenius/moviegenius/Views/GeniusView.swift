//
//  GeniusView.swift
//  moviegenius
//
//  Your cinematic journey with personalized insights and collections
//

import SwiftUI
import Combine

// MARK: - Tier Progress Tracker
@MainActor
class TierProgressTracker: ObservableObject {
    static let shared = TierProgressTracker()

    // Cache: [category: [tier: completionPercent]]
    @Published private var completionCache: [String: [String: Double]] = [:]

    private init() {}

    func getCompletion(category: String, tier: String) -> Double {
        return completionCache[category]?[tier] ?? 0
    }

    func refreshCategory(_ category: String, seenIds: Set<Int>) {
        var tierCompletions: [String: Double] = [:]

        let allTiers = [
            "Essential", "Foundational", "Classics", "Well-Versed", "Devotee",
            "Connoisseur", "Deep Cuts", "Specialist", "Archivist", "Master"
        ]

        for tier in allTiers {
            let films = CategoryEssentials.films(for: category, subcategory: tier)
            guard !films.isEmpty else {
                tierCompletions[tier] = 0
                continue
            }

            // Count how many films in this tier have been seen
            let seenCount = films.filter { film in
                let lookupKey = "\(category)|\(tier)|\(film.title)|\(film.year)"
                if let tmdbId = CategoryEssentials.tmdbIdLookup[lookupKey] {
                    return seenIds.contains(tmdbId)
                }
                return false
            }.count

            tierCompletions[tier] = Double(seenCount) / Double(films.count)
        }

        completionCache[category] = tierCompletions
    }
}

struct GeniusView: View {
    @ObservedObject var favorites = FavoritesManager.shared
    @StateObject private var viewModel = GeniusViewModel()
    @State private var searchText = ""

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
        ScrollView {
            JourneyTabContent(
                stage: journeyStage,
                lovedCount: favorites.lovedMovies.count,
                queueCount: favorites.queueMovies.count,
                genres: viewModel.genres,
                isLoadingGenres: viewModel.isLoading
            )
        }
        .scrollIndicators(.hidden)
        .refreshable {
            favorites.loadFavorites()
            await viewModel.loadGenreExpertise()
        }
        .background(Color.mgGroupedBackground)
        .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search movies")
        .task {
            favorites.loadFavorites()
            await viewModel.loadGenreExpertise()
        }
    }

}

// MARK: - Journey Tab

struct JourneyTabContent: View {
    let stage: (icon: String, title: String, description: String, insight: String?)
    let lovedCount: Int
    let queueCount: Int
    let genres: [GenreExpertise]
    let isLoadingGenres: Bool
    @ObservedObject private var favorites = FavoritesManager.shared
    @State private var shuffledCategories: [String] = []

    let allCategories = [
        "Action", "Adventure", "Comedy", "Crime",
        "Documentary", "Drama", "Espionage", "Fantasy",
        "History", "Horror", "Mystery", "Noir",
        "Romance", "Science Fiction", "Thriller", "War", "Western",
        "Awards", "Actors", "Actresses", "Directors"
    ]

    // Two-tier categories require subcategory navigation
    private func isTwoTierCategory(_ category: String) -> Bool {
        ["Awards", "Actors", "Actresses", "Directors", "Action", "Adventure", "Comedy", "Crime", "Documentary", "Drama", "Espionage", "Fantasy", "History", "Horror", "Mystery", "Noir", "Romance", "Science Fiction", "Thriller", "War", "Western"].contains(category)
    }

    // Calculate progress for a category (0.0 to 1.0)
    // Uses cached tmdbIds from CategoryProgressManager
    private func categoryProgress(_ category: String) -> Double {
        // Calculate total progress across all tiers in this category
        let seenIds = Set(favorites.lovedMovies.map { $0.id })

        let allTiers = CategoryEssentials.subcategories(for: category)
        var totalFilms = 0
        var seenFilms = 0

        for tier in allTiers {
            let films = CategoryEssentials.films(for: category, subcategory: tier)
            totalFilms += films.count

            seenFilms += films.filter { film in
                let lookupKey = "\(category)|\(tier)|\(film.title)|\(film.year)"
                if let tmdbId = CategoryEssentials.tmdbIdLookup[lookupKey] {
                    return seenIds.contains(tmdbId)
                }
                return false
            }.count
        }

        guard totalFilms > 0 else { return 0 }
        return Double(seenFilms) / Double(totalFilms)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing24) {
            // Header
            Text("Start your cinematic journey")
                .font(.mgLargeTitle)
                .foregroundStyle(Color.mgPrimary)
                .padding(.horizontal, .mgSpacing16)
                .padding(.top, .mgSpacing16)

            // Category Collage
            FlowLayout(spacing: .mgSpacing8) {
                ForEach(shuffledCategories, id: \.self) { category in
                    NavigationLink(destination: CategoryEssentialsView(category: category, subcategory: category == "Awards" ? "Best Picture" : "Essential")) {
                        CategoryBadge(
                            category: category,
                            progress: categoryProgress(category)
                        )
                    }
                    .buttonStyle(MGCardButtonStyle())
                }
            }
            .padding(.horizontal, .mgSpacing16)
            .onAppear {
                if shuffledCategories.isEmpty {
                    shuffledCategories = allCategories.shuffled()
                }
            }

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

    // Gradient color based on completion % (matches tier chip gradient)
    private var badgeColor: Color {
        switch progress {
        case 0..<0.10:
            return Color(red: 0.60, green: 0.60, blue: 0.60) // Light gray
        case 0.10..<0.20:
            return Color(red: 0.65, green: 0.62, blue: 0.60) // Medium gray
        case 0.20..<0.30:
            return Color(red: 0.70, green: 0.65, blue: 0.58) // Warm gray
        case 0.30..<0.40:
            return Color(red: 0.75, green: 0.68, blue: 0.56) // Light bronze
        case 0.40..<0.50:
            return Color(red: 0.80, green: 0.70, blue: 0.52) // Bronze
        case 0.50..<0.60:
            return Color(red: 0.85, green: 0.72, blue: 0.48) // Copper
        case 0.60..<0.70:
            return Color(red: 0.90, green: 0.75, blue: 0.50) // Rose gold
        case 0.70..<0.80:
            return Color(red: 0.95, green: 0.82, blue: 0.55) // Light gold
        default:
            return Color.mgGold // Pure gold (80%+)
        }
    }

    private var textColor: Color {
        // Use white text on darker gradient colors for contrast
        return progress >= 0.40 ? .white : .black
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

// MARK: - Tier Navigation Chips

struct TierNavigationChips: View {
    let category: String
    let currentTier: String
    let onTierSelected: (String) -> Void

    @State private var shuffledTiers: [String] = []
    @StateObject private var tierProgress = TierProgressTracker.shared
    @ObservedObject private var favorites = FavoritesManager.shared

    private let allTiers = [
        "Essential", "Foundational", "Classics", "Well-Versed", "Devotee",
        "Connoisseur", "Deep Cuts", "Specialist", "Archivist", "Master"
    ]

    var body: some View {
        FlowLayout(spacing: .mgSpacing12) {
            ForEach(allTiers, id: \.self) { tier in
                NavigationLink(destination: CategoryEssentialsView(category: category, subcategory: tier)) {
                    TierChip(
                        tier: tier,
                        isSelected: tier == currentTier,
                        completionPercent: tierProgress.getCompletion(category: category, tier: tier)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, .mgSpacing16)
        .onAppear {
            // Calculate all tier completions for this category
            tierProgress.refreshCategory(category, seenIds: Set(favorites.lovedMovies.map { $0.id }))
        }
        .onChange(of: favorites.lovedMovies.count) { _ in
            // Recalculate when user marks movies seen
            tierProgress.refreshCategory(category, seenIds: Set(favorites.lovedMovies.map { $0.id }))
        }
    }
}

struct TierChip: View {
    let tier: String
    let isSelected: Bool
    let completionPercent: Double

    // Gradient color based on completion % (0-80%+ = gray to gold)
    private var gradientColor: Color {
        switch completionPercent {
        case 0..<0.10:
            return Color(red: 0.60, green: 0.60, blue: 0.60) // Light gray
        case 0.10..<0.20:
            return Color(red: 0.65, green: 0.62, blue: 0.60) // Medium gray
        case 0.20..<0.30:
            return Color(red: 0.70, green: 0.65, blue: 0.58) // Warm gray
        case 0.30..<0.40:
            return Color(red: 0.75, green: 0.68, blue: 0.56) // Light bronze
        case 0.40..<0.50:
            return Color(red: 0.80, green: 0.70, blue: 0.52) // Bronze
        case 0.50..<0.60:
            return Color(red: 0.85, green: 0.72, blue: 0.48) // Copper
        case 0.60..<0.70:
            return Color(red: 0.90, green: 0.75, blue: 0.50) // Rose gold
        case 0.70..<0.80:
            return Color(red: 0.95, green: 0.82, blue: 0.55) // Light gold
        default:
            return Color.mgGold // Pure gold (80%+)
        }
    }

    private var backgroundColor: Color {
        if isSelected {
            return Color.white
        } else if completionPercent > 0 {
            return gradientColor
        } else {
            return Color.mgSecondaryBackground
        }
    }

    private var textColor: Color {
        if isSelected {
            return Color.black
        } else if completionPercent >= 0.40 {
            // Use white text on darker gradient colors for contrast
            return Color.white
        } else {
            return Color.mgSecondary
        }
    }

    var body: some View {
        Text(tier.uppercased())
            .font(.system(size: 12, weight: isSelected ? .semibold : .medium))
            .foregroundStyle(textColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .strokeBorder(
                        isSelected ? Color.mgGold : Color.clear,
                        lineWidth: 2
                    )
            )
            .kerning(0.3)
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

    // Get the next tier in sequence
    private var nextTier: String? {
        guard let currentSubcategory = subcategory else { return nil }
        let subcategories = CategoryEssentials.subcategories(for: category)
        guard let currentIndex = subcategories.firstIndex(of: currentSubcategory),
              currentIndex < subcategories.count - 1 else {
            return nil
        }
        return subcategories[currentIndex + 1]
    }

    private var errorView: some View {
        VStack(spacing: .mgSpacing12) {
            Text("Failed to load")
                .font(.mgHeadline)
            if let error = viewModel.error {
                Text(error.localizedDescription)
                    .font(.mgCaption)
                    .foregroundStyle(Color.mgSecondary)
            }
        }
        .padding(.horizontal, .mgSpacing20)
    }

    private var filmListView: some View {
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

    @ViewBuilder
    private var bottomNextTierButton: some View {
        if let nextTier = nextTier {
            NavigationLink(destination: CategoryEssentialsView(category: category, subcategory: nextTier)) {
                HStack {
                    Text("\(category): \(nextTier)")
                        .font(.mgBody)
                        .foregroundStyle(Color.mgPrimary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.mgCaption)
                        .foregroundStyle(Color.mgSecondary)
                }
                .padding(.mgSpacing16)
                .background(Color.mgSecondaryBackground)
                .cornerRadius(.mgCornerSmall)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, .mgSpacing20)
            .padding(.top, .mgSpacing24)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: .mgSpacing16) {
                // Tier navigation chips (top)
                TierNavigationChips(
                    category: category,
                    currentTier: subcategory ?? "Essential",
                    onTierSelected: { _ in }
                )
                .padding(.top, .mgSpacing8)

                // Category > Level indicator
                Text("\(category) › \(subcategory ?? "Essential")")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.mgSecondary)
                    .padding(.horizontal, .mgSpacing20)
                    .padding(.top, .mgSpacing8)

                if viewModel.isLoadingInitial || viewModel.isLoading {
                    VStack(spacing: .mgSpacing12) {
                        ProgressView()
                            .tint(Color.mgGold)
                        Text("Loading \(viewModel.totalFilms > 0 ? "\(viewModel.totalFilms) " : "")films...")
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, .mgSpacing32)
                } else if viewModel.error != nil {
                    errorView
                } else {
                    filmListView

                    // Tier navigation chips (bottom)
                    TierNavigationChips(
                        category: category,
                        currentTier: subcategory ?? "Essential",
                        onTierSelected: { _ in }
                    )
                    .padding(.top, .mgSpacing24)
                }
            }
            .padding(.vertical, .mgSpacing12)
        }
        .background(Color.mgBackground)
        .navigationTitle(subcategory != nil ? "\(category): \(subcategory!)" : category)
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
    @ObservedObject private var favorites = FavoritesManager.shared

    private var isSeen: Bool {
        favorites.lovedMovies.contains { $0.id == movie.tmdbId }
    }

    private var isQueued: Bool {
        favorites.queueMovies.contains { $0.id == movie.tmdbId }
    }

    var body: some View {
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
                    .fixedSize(horizontal: false, vertical: true)

                // Year
                if let year = movie.year {
                    Text(String(year))
                        .font(.mgCaption)
                        .foregroundStyle(Color.mgSecondary)
                }

                // Slug (full text, no truncation)
                Text(movie.slug)
                    .font(.mgSubheadline)
                    .foregroundStyle(Color.mgPrimary)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)

                // Prominent "Seen It" button - Primary action with outline that fills
                Button(action: {
                    toggleSeen()
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: isSeen ? "checkmark.circle.fill" : "checkmark.circle")
                            .font(.system(size: 18, weight: .medium))
                        Text("Seen It")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .foregroundStyle(isSeen ? Color.white : Color.mgPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(isSeen ? Color.mgGold : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .strokeBorder(isSeen ? Color.clear : Color.mgPrimary.opacity(0.3), lineWidth: 2)
                    )
                }
                .buttonStyle(.plain)

                Spacer()

                // "Add to List" button - Secondary action, no icon
                HStack {
                    Spacer()
                    Button(action: {
                        toggleQueue()
                    }) {
                        Text("Add to List")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(isQueued ? Color.mgGold : Color.mgPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(isQueued ? Color.mgGold.opacity(0.15) : Color.clear)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: 210, alignment: .topLeading)
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

    private func toggleSeen() {
        HapticManager.selection()
        let savedMovie = SavedMovie(
            id: movie.tmdbId,
            title: movie.title,
            year: movie.year,
            posterUrl: movie.posterUrl,
            slug: movie.slug
        )
        favorites.toggleLoved(savedMovie)
    }

    private func toggleQueue() {
        HapticManager.selection()
        let savedMovie = SavedMovie(
            id: movie.tmdbId,
            title: movie.title,
            year: movie.year,
            posterUrl: movie.posterUrl,
            slug: movie.slug
        )
        favorites.toggleQueue(savedMovie)
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
    @Published var isLoadingInitial = false  // Prevents partial renders during first load
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
        // Build cache key
        let cacheKey: String
        if let subcategory = subcategory {
            cacheKey = "\(category)_\(subcategory)"
        } else {
            cacheKey = category
        }

        // Check cache first - this survives view recreation
        if let cached = CategoryProgressManager.shared.getCachedMovies(for: cacheKey) {
            print("✅ Using cached movies for \(cacheKey): \(cached.count) films")
            self.movies = cached
            self.availableFilms = cached.count
            self.totalFilms = cached.count
            return  // Exit early - no network calls needed
        }

        // Cache miss - load from network
        print("🔵 CACHE MISS for \(cacheKey) - loading from network")
        isLoadingInitial = true
        defer { isLoadingInitial = false }  // Always clear when done (prevents partial renders)

        isLoading = true
        error = nil

        let filmList: [(title: String, year: Int)]
        if let subcategory = subcategory {
            filmList = CategoryEssentials.films(for: category, subcategory: subcategory)
        } else {
            filmList = []
        }
        totalFilms = filmList.count
        print("📋 Loading \(filmList.count) films for \(category) > \(subcategory ?? "nil")")
        print("📋 First 3 films: \(filmList.prefix(3).map { "\($0.title) (\($0.year))" }.joined(separator: ", "))")

        var loadedMovies: [(index: Int, movie: EssentialMovie)] = []

        // Load all films in parallel for faster performance, preserving original order
        await withTaskGroup(of: (index: Int, film: (title: String, year: Int), movie: EssentialMovie?)?.self) { group in
            for (index, film) in filmList.enumerated() {
                group.addTask {
                    do {
                        // Check if we have a pre-populated TMDB ID
                        let lookupKey = "\(self.category)|\(self.subcategory ?? "")|\(film.title)|\(film.year)"
                        let movie: EssentialMovie?

                        if let tmdbId = CategoryEssentials.tmdbIdLookup[lookupKey] {
                            // Direct fetch with known ID (faster, no search)
                            print("✅ LOOKUP HIT: \(film.title) → ID \(tmdbId)")
                            movie = try await self.fetchMovie(tmdbId: tmdbId)
                        } else {
                            // Fall back to search
                            print("❌ LOOKUP MISS: '\(lookupKey)' - falling back to search")
                            movie = try await self.searchMovie(title: film.title, year: film.year)
                        }
                        return (index, film, movie)
                    } catch {
                        print("⚠️ Error loading \(film.title) (\(film.year)): \(error)")
                        return (index, film, nil)
                    }
                }
            }

            for await result in group {
                guard let result = result else { continue }
                if let movie = result.movie {
                    loadedMovies.append((index: result.index, movie: movie))
                } else {
                    print("⚠️ Couldn't find TMDB match for: \(result.film.title) (\(result.film.year))")
                }
            }
        }

        // Sort by original index to preserve order
        let sortedMovies = loadedMovies.sorted(by: { $0.index < $1.index }).map { $0.movie }
        print("✅ FINAL RESULT: Loaded \(sortedMovies.count)/\(filmList.count) films successfully")
        self.movies = sortedMovies
        self.availableFilms = sortedMovies.count

        // Cache the sorted result - survives view recreation
        CategoryProgressManager.shared.cacheMovies(sortedMovies, for: cacheKey)

        // Register loaded movies with progress manager
        CategoryProgressManager.shared.register(movies: sortedMovies, for: category)

        isLoading = false
    }

    private func fetchMovie(tmdbId: Int) async throws -> EssentialMovie? {
        // Direct fetch with known TMDB ID (skips search step)
        let movieURL = URL(string: "https://moviegenius.ai/api/v1/movie/\(tmdbId)")!
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
    // Pre-populated TMDB IDs to skip search API calls
    // Key format: "Category|Subcategory|Title|Year"
    // Data loaded from TierTmdbLookup.swift extension (1,434 films)
    static var tmdbIdLookup: [String: Int] {
        return tierTmdbData
    }

    // Returns subcategory names for 2-tier categories
    static func subcategories(for category: String) -> [String] {
        switch category {
        case "Awards":
            return ["Best Picture", "Best Director", "Best Actor", "Best Actress", "AFI 100 Greatest Films", "Palme d'Or", "BAFTA Best Film"]
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
        case "Action":
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
        case "Adventure":
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
        case "Comedy":
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
        case "Crime":
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
        case "Documentary":
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
        case "Drama":
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
        case "Espionage":
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
        case "Fantasy":
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
        case "History":
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
        case "Horror":
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
        case "Noir":
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
        case "Romance":
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
        case "Science Fiction":
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
        case "Thriller":
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
        case "War":
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
        case "Western":
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
        case ("Awards", "Best Picture"):
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
        case ("Awards", "Best Director"):
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
        case ("Awards", "Best Actor"):
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
        case ("Awards", "Best Actress"):
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
        case ("Awards", "AFI 100 Greatest Films"):
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

        case ("Awards", "Palme d'Or"):
            return [
                ("Brief Encounter", 1946),
                ("María Candelaria", 1946),
                ("Neecha Nagar", 1946),
                ("Pastoral Symphony", 1946),
                ("Rome, Open City", 1946),
                ("The Last Chance", 1946),
                ("The Lost Weekend", 1946),
                ("The Turning Point", 1946),
                ("Torment", 1946),
                ("Crossfire", 1947),
                ("The Damned", 1947),
                ("Ziegfeld Follies", 1947),
                ("The Third Man", 1949),
                ("Miracle in Milan", 1951),
                ("Miss Julie", 1951),
                ("Othello", 1952),
                ("The Wages of Fear", 1953),
                ("Gate of Hell", 1954),
                ("Marty", 1955),
                ("The Silent World", 1956),
                ("Friendly Persuasion", 1957),
                ("The Cranes Are Flying", 1958),
                ("Black Orpheus", 1959),
                ("La dolce vita", 1960),
                ("The Long Absence", 1961),
                ("Viridiana", 1961),
                ("The Leopard", 1963),
                ("The Umbrellas of Cherbourg", 1964),
                ("The Knack ...and How to Get It", 1965),
                ("A Man and a Woman", 1966),
                ("The Birds, the Bees and the Italians", 1966),
                ("If....", 1969),
                ("M*A*S*H", 1970),
                ("The Mattei Affair", 1972),
                ("The Working Class Goes to Heaven", 1972),
                ("Scarecrow", 1973),
                ("The Conversation", 1974),
                ("Chronicle of the Years of Fire", 1975),
                ("Taxi Driver", 1976),
                ("Padre Padrone", 1977),
                ("The Tree of Wooden Clogs", 1978),
                ("Apocalypse Now", 1979),
                ("The Tin Drum", 1979),
                ("All That Jazz", 1980),
                ("Kagemusha", 1980),
                ("Man of Iron", 1981),
                ("Missing", 1982),
                ("The Ballad of Narayama", 1983),
                ("Paris, Texas", 1984),
                ("When Father Was Away on Business", 1985),
                ("The Mission", 1986),
                ("Under the Sun of Satan", 1987),
                ("Pelle the Conqueror", 1988),
                ("Sex, Lies, and Videotape", 1989),
                ("Wild at Heart", 1990),
                ("Barton Fink", 1991),
                ("The Best Intentions", 1992),
                ("Farewell My Concubine", 1993),
                ("The Piano", 1993),
                ("Pulp Fiction", 1994),
                ("Underground", 1995),
                ("Taste of Cherry", 1997),
                ("The Eel", 1997),
                ("Eternity and a Day", 1998),
                ("Rosetta", 1999),
                ("Dancer in the Dark", 2000),
                ("The Pianist", 2002),
                ("Elephant", 2003),
                ("Fahrenheit 9/11", 2004),
                ("The Wind That Shakes the Barley", 2006),
                ("4 Months, 3 Weeks and 2 Days", 2007),
                ("The Class", 2008),
                ("The White Ribbon", 2009),
                ("Uncle Boonmee Who Can Recall His Past Lives", 2010),
                ("The Tree of Life", 2011),
                ("Amour", 2012),
                ("Winter Sleep", 2014),
                ("Dheepan", 2015),
                ("I, Daniel Blake", 2016),
                ("The Square", 2017),
                ("Shoplifters", 2018),
                ("The Image Book", 2018),
                ("Parasite", 2019),
                ("Titane", 2021),
                ("Triangle of Sadness", 2022)
            ]

        case ("Awards", "BAFTA Best Film"):
            return [
                ("The Best Years of Our Lives", 1947),
                ("Hamlet", 1948),
                ("Bicycle Thieves", 1949),
                ("All About Eve", 1950),
                ("La Ronde", 1951),
                ("The Sound Barrier", 1952),
                ("Forbidden Games", 1953),
                ("The Wages of Fear", 1954),
                ("Richard III", 1955),
                ("Gervaise", 1956),
                ("The Bridge on the River Kwai", 1957),
                ("Room at the Top", 1958),
                ("Ben-Hur", 1959),
                ("The Apartment", 1960),
                ("Ballad of a Soldier", 1961),
                ("The Hustler", 1961),
                ("Lawrence of Arabia", 1962),
                ("Tom Jones", 1963),
                ("Dr. Strangelove", 1964),
                ("My Fair Lady", 1965),
                ("Who's Afraid of Virginia Woolf?", 1966),
                ("A Man For All Seasons", 1967),
                ("The Graduate", 1968),
                ("Midnight Cowboy", 1969),
                ("Butch Cassidy and the Sundance Kid", 1970),
                ("Sunday Bloody Sunday", 1971),
                ("Cabaret", 1972),
                ("Day for Night", 1973),
                ("Lacombe, Lucien", 1974),
                ("Alice Doesn't Live Here Anymore", 1975),
                ("One Flew Over the Cuckoo's Nest", 1976),
                ("Annie Hall", 1977),
                ("Julia", 1978),
                ("Manhattan", 1979),
                ("The Elephant Man", 1980),
                ("Chariots of Fire", 1981),
                ("Gandhi", 1982),
                ("Educating Rita", 1983),
                ("The Killing Fields", 1984),
                ("The Purple Rose of Cairo", 1985),
                ("A Room with a View", 1986),
                ("Jean de Florette", 1987),
                ("The Last Emperor", 1988),
                ("Dead Poets Society", 1989),
                ("Goodfellas", 1990),
                ("The Commitments", 1991),
                ("Howards End", 1992),
                ("Schindler's List", 1993),
                ("Four Weddings and a Funeral", 1994),
                ("Sense and Sensibility", 1995),
                ("The English Patient", 1996),
                ("The Full Monty", 1997),
                ("Shakespeare in Love", 1998),
                ("American Beauty", 1999),
                ("Gladiator", 2000),
                ("The Lord of the Rings: The Fellowship of the Ring", 2001),
                ("The Pianist", 2002),
                ("The Lord of the Rings: The Return of the King", 2003),
                ("The Aviator", 2004),
                ("Brokeback Mountain", 2005),
                ("The Queen", 2006),
                ("Atonement", 2007),
                ("Slumdog Millionaire", 2008),
                ("The Hurt Locker", 2009),
                ("The King's Speech", 2010),
                ("The Artist", 2011),
                ("Argo", 2012),
                ("12 Years a Slave", 2013),
                ("Boyhood", 2014),
                ("The Revenant", 2015),
                ("La La Land", 2016),
                ("Three Billboards Outside Ebbing, Missouri", 2017),
                ("Roma", 2018),
                ("Nomadland", 2020),
                ("The Power of the Dog", 2021),
                ("All Quiet on the Western Front", 2022),
                ("Oppenheimer", 2023),
                ("Conclave", 2024),
                ("One Battle After Another", 2025)
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
        case ("Action", "Essential"):
            return [
                ("Die Hard", 1988),
                ("Mad Max: Fury Road", 2015),
                ("Aliens", 1986),
                ("Terminator 2: Judgment Day", 1991),
                ("The Raid", 2011),
                ("John Wick", 2014),
                ("Crouching Tiger, Hidden Dragon", 2000),
                ("Hard Boiled", 1992),
                ("Enter the Dragon", 1973),
                ("Mission: Impossible — Fallout", 2018),
            ]
        case ("Action", "Foundational"):
            return [
                ("Predator", 1987),
                ("Lethal Weapon", 1987),
                ("RoboCop", 1987),
                ("First Blood", 1982),
                ("The Matrix", 1999),
                ("Speed", 1994),
                ("Point Break", 1991),
                ("Heat", 1995),
                ("The Bourne Identity", 2002),
                ("The Bourne Ultimatum", 2007),
                ("Casino Royale", 2006),
                ("Skyfall", 2012),
                ("Black Hawk Down", 2001),
                ("Master and Commander: The Far Side of the World", 2003),
                ("Gladiator", 2000),
            ]
        case ("Action", "Classics"):
            return [
                ("Once Upon a Time in China", 1991),
                ("Drunken Master II", 1994),
                ("Police Story", 1985),
                ("Project A", 1983),
                ("The Killer", 1989),
                ("A Better Tomorrow", 1986),
                ("Bullet in the Head", 1990),
                ("Yojimbo", 1961),
                ("Sanjuro", 1962),
                ("Seven Samurai", 1954),
                ("Lone Wolf and Cub: Sword of Vengeance", 1972),
                ("Lady Snowblood", 1973),
                ("The Magnificent Seven", 1960),
                ("The Wild Bunch", 1969),
            ]
        case ("Action", "Well-Versed"):
            return [
                ("Hard Target", 1993),
                ("Face/Off", 1997),
                ("The Rock", 1996),
                ("Con Air", 1997),
                ("True Lies", 1994),
                ("Total Recall", 1990),
                ("Commando", 1985),
                ("Rambo: First Blood Part II", 1985),
                ("Cobra", 1986),
                ("Lethal Weapon 2", 1989),
                ("Die Hard with a Vengeance", 1995),
                ("The Long Kiss Goodnight", 1996),
                ("Bad Boys II", 2003),
                ("Crank", 2006),
                ("Shoot 'Em Up", 2007),
            ]
        case ("Action", "Devotee"):
            return [
                ("Ong-Bak: Muay Thai Warrior", 2003),
                ("The Protector", 2005),
                ("Ip Man", 2008),
                ("Fearless", 2006),
                ("Kung Fu Hustle", 2004),
                ("Shaolin Soccer", 2001),
                ("The Legend of Drunken Master", 1994),
                ("Wheels on Meals", 1984),
                ("The Five Deadly Venoms", 1978),
                ("Master of the Flying Guillotine", 1976),
                ("Come Drink with Me", 1966),
                ("A Touch of Zen", 1971),
            ]
        case ("Action", "Connoisseur"):
            return [
                ("Audition", 1999),
                ("Versus", 2000),
                ("Battles Without Honor and Humanity", 1973),
                ("Branded to Kill", 1967),
                ("Tokyo Drifter", 1966),
                ("The Sword of Doom", 1966),
                ("Harakiri", 1962),
                ("Samurai Rebellion", 1967),
                ("13 Assassins", 2010),
                ("Sukiyaki Western Django", 2007),
                ("Ichi the Killer", 2001),
                ("Dead or Alive", 1999),
            ]
        case ("Action", "Deep Cuts"):
            return [
                ("City on Fire", 1987),
                ("Long Arm of the Law", 1984),
                ("Police Story 3: Super Cop", 1992),
                ("The Story of Ricky", 1991),
                ("Tiger Cage", 1988),
                ("In the Line of Duty 4", 1989),
                ("Yes, Madam!", 1985),
                ("Royal Warriors", 1986),
                ("Eastern Condors", 1987),
                ("Pedicab Driver", 1989),
            ]
        case ("Action", "Specialist"):
            return [
                ("The Mercenary", 1968),
                ("Companeros", 1970),
                ("The Big Gundown", 1967),
                ("Day of Anger", 1967),
                ("Death Rides a Horse", 1967),
                ("The Great Silence", 1968),
                ("Django", 1966),
                ("Keoma", 1976),
                ("District B13", 2004),
                ("Banlieue 13: Ultimatum", 2009),
            ]
        case ("Action", "Archivist"):
            return [
                ("The Street Fighter", 1974),
                ("Sister Street Fighter", 1974),
                ("Karate Bear Fighter", 1975),
                ("The Killing Machine", 1975),
                ("Bodyguard Kiba", 1973),
                ("Wolf Guy", 1975),
                ("Female Convict Scorpion: Jailhouse 41", 1972),
                ("Lady Snowblood: Love Song of Vengeance", 1974),
                ("Shogun Assassin", 1980),
            ]
        case ("Action", "Master"):
            return [
                ("Vigilante", 1982),
                ("The Exterminator", 1980),
                ("Mr. Majestyk", 1974),
                ("McQ", 1974),
                ("The Stone Killer", 1973),
                ("The Mechanic", 1972),
                ("Death Wish", 1974),
                ("10 to Midnight", 1983),
                ("Murphy's Law", 1986),
                ("Kinjite: Forbidden Subjects", 1989),
            ]
case ("Documentary", "Essential"):
            return [
                ("Hoop Dreams", 1994),
                ("Shoah", 1985),
                ("The Thin Blue Line", 1988),
                ("Man with a Movie Camera", 1929),
                ("Nanook of the North", 1922),
                ("Grey Gardens", 1975),
                ("Harlan County, USA", 1976),
                ("Roger & Me", 1989),
                ("Bowling for Columbine", 2002),
                ("Won't You Be My Neighbor?", 2018),
            ]
        case ("Documentary", "Foundational"):
            return [
                ("Night and Fog", 1956),
                ("The Sorrow and the Pity", 1969),
                ("Don't Look Back", 1967),
                ("Gimme Shelter", 1970),
                ("Salesman", 1969),
                ("Titicut Follies", 1967),
                ("High School", 1968),
                ("Hospital", 1970),
                ("Crumb", 1994),
                ("Brother's Keeper", 1992),
                ("Paradise Lost: The Child Murders at Robin Hood Hills", 1996),
                ("Capturing the Friedmans", 2003),
                ("Tabloid", 2010),
                ("The Act of Killing", 2012),
                ("The Look of Silence", 2014),
            ]
        case ("Documentary", "Classics"):
            return [
                ("Triumph of the Will", 1935),
                ("Olympia", 1938),
                ("The Battle of San Pietro", 1945),
                ("Let There Be Light", 1946),
                ("Dont Look Back", 1967),
                ("Woodstock", 1970),
                ("The War Room", 1993),
                ("Hearts of Darkness: A Filmmaker's Apocalypse", 1991),
                ("Burden of Dreams", 1982),
                ("Lessons of Darkness", 1992),
                ("Grizzly Man", 2005),
                ("Cave of Forgotten Dreams", 2010),
                ("Into the Abyss", 2011),
            ]
        case ("Documentary", "Well-Versed"):
            return [
                ("March of the Penguins", 2005),
                ("Winged Migration", 2001),
                ("Microcosmos", 1996),
                ("Baraka", 1992),
                ("Koyaanisqatsi", 1982),
                ("Powaqqatsi", 1988),
                ("Samsara", 2011),
                ("Sans Soleil", 1983),
                ("The Gleaners and I", 2000),
                ("Faces Places", 2017),
                ("Stories We Tell", 2012),
                ("The Five Obstructions", 2003),
            ]
        case ("Documentary", "Devotee"):
            return [
                ("American Movie", 1999),
                ("Anvil! The Story of Anvil", 2008),
                ("Searching for Sugar Man", 2012),
                ("Twenty Feet from Stardom", 2013),
                ("Buena Vista Social Club", 1999),
                ("The Last Waltz", 1978),
                ("Stop Making Sense", 1984),
                ("Sign 'o' the Times", 1987),
                ("Madonna: Truth or Dare", 1991),
                ("Some Kind of Monster", 2004),
                ("Amy", 2015),
                ("20,000 Days on Earth", 2014),
            ]
        case ("Documentary", "Connoisseur"):
            return [
                ("Chronicle of a Summer", 1961),
                ("Primary", 1960),
                ("Crisis: Behind a Presidential Commitment", 1963),
                ("A Married Couple", 1969),
                ("An American Family", 1973),
                ("Sherman's March", 1986),
                ("Roger Ebert: Life Itself", 2014),
                ("Tarnation", 2003),
                ("51 Birch Street", 2005),
                ("Stevie", 2002),
            ]
        case ("Documentary", "Deep Cuts"):
            return [
                ("F for Fake", 1973),
                ("Symbiopsychotaxiplasm: Take One", 1968),
                ("David Holzman's Diary", 1967),
                ("No Lies", 1973),
                ("The Falls", 1980),
                ("Close-Up", 1990),
                ("The Gleaners and I: Two Years Later", 2002),
                ("Reassemblage", 1982),
            ]
        case ("Documentary", "Specialist"):
            return [
                ("Night Mail", 1936),
                ("Listen to Britain", 1942),
                ("Fires Were Started", 1943),
                ("A Diary for Timothy", 1945),
                ("The River", 1938),
                ("The Plow That Broke the Plains", 1936),
                ("The City", 1939),
                ("Land Without Bread", 1933),
            ]
        case ("Documentary", "Archivist"):
            return [
                ("Hôtel Terminus: The Life and Times of Klaus Barbie", 1988),
                ("The Memory of Justice", 1976),
                ("Hôtel des Invalides", 1952),
                ("Le Sang des bêtes", 1949),
                ("Letter from Siberia", 1957),
                ("The Lovely Month of May", 1963),
                ("A Grin Without a Cat", 1977),
                ("Le Joli Mai", 1963),
            ]
        case ("Documentary", "Master"):
            return [
                ("Berlin: Symphony of a Great City", 1927),
                ("Rain", 1929),
                ("À propos de Nice", 1930),
                ("People on Sunday", 1930),
                ("Coal Face", 1935),
                ("Spanish Earth", 1937),
                ("The 400 Million", 1939),
                ("Power and the Land", 1940),
            ]
        case ("Drama", "Essential"):
            return [
                ("Citizen Kane", 1941),
                ("The Godfather", 1972),
                ("Schindler's List", 1993),
                ("12 Angry Men", 1957),
                ("On the Waterfront", 1954),
                ("There Will Be Blood", 2007),
                ("Moonlight", 2016),
                ("Tokyo Story", 1953),
                ("The Bicycle Thieves", 1948),
                ("A Streetcar Named Desire", 1951),
            ]
        case ("Drama", "Foundational"):
            return [
                ("Casablanca", 1942),
                ("Gone with the Wind", 1939),
                ("All About Eve", 1950),
                ("Rebel Without a Cause", 1955),
                ("East of Eden", 1955),
                ("Cool Hand Luke", 1967),
                ("One Flew Over the Cuckoo's Nest", 1975),
                ("Kramer vs. Kramer", 1979),
                ("Ordinary People", 1980),
                ("Terms of Endearment", 1983),
                ("Driving Miss Daisy", 1989),
                ("Forrest Gump", 1994),
                ("American Beauty", 1999),
                ("Brokeback Mountain", 2005),
                ("Manchester by the Sea", 2016),
            ]
        case ("Drama", "Classics"):
            return [
                ("The Best Years of Our Lives", 1946),
                ("Sunset Boulevard", 1950),
                ("From Here to Eternity", 1953),
                ("A Place in the Sun", 1951),
                ("Giant", 1956),
                ("The Hustler", 1961),
                ("To Kill a Mockingbird", 1962),
                ("Who's Afraid of Virginia Woolf?", 1966),
                ("In the Heat of the Night", 1967),
                ("The Last Picture Show", 1971),
                ("Network", 1976),
                ("All the President's Men", 1976),
                ("Raging Bull", 1980),
                ("Atlantic City", 1980),
            ]
        case ("Drama", "Well-Versed"):
            return [
                ("Days of Heaven", 1978),
                ("The Tree of Life", 2011),
                ("Magnolia", 1999),
                ("Boogie Nights", 1997),
                ("The Master", 2012),
                ("Phantom Thread", 2017),
                ("No Country for Old Men", 2007),
                ("Inside Llewyn Davis", 2013),
                ("A Serious Man", 2009),
                ("Synecdoche, New York", 2008),
                ("Eternal Sunshine of the Spotless Mind", 2004),
                ("Lost in Translation", 2003),
                ("Sideways", 2004),
                ("Capote", 2005),
                ("The Hours", 2002),
            ]
        case ("Drama", "Devotee"):
            return [
                ("Ikiru", 1952),
                ("Wild Strawberries", 1957),
                ("Persona", 1966),
                ("Cries and Whispers", 1972),
                ("Fanny and Alexander", 1982),
                ("The Seventh Seal", 1957),
                ("Through a Glass Darkly", 1961),
                ("Autumn Sonata", 1978),
                ("Scenes from a Marriage", 1973),
                ("Andrei Rublev", 1966),
                ("Mirror", 1975),
                ("Stalker", 1979),
            ]
        case ("Drama", "Connoisseur"):
            return [
                ("L'Avventura", 1960),
                ("La Notte", 1961),
                ("Eclipse", 1962),
                ("Red Desert", 1964),
                ("La Dolce Vita", 1960),
                ("8½", 1963),
                ("Amarcord", 1973),
                ("Rocco and His Brothers", 1960),
                ("The Leopard", 1963),
                ("Death in Venice", 1971),
            ]
        case ("Drama", "Deep Cuts"):
            return [
                ("A Woman Under the Influence", 1974),
                ("Faces", 1968),
                ("Husbands", 1970),
                ("Opening Night", 1977),
                ("Love Streams", 1984),
                ("Wanda", 1970),
                ("Killer of Sheep", 1978),
                ("Bless Their Little Hearts", 1983),
                ("Daughters of the Dust", 1991),
            ]
        case ("Drama", "Specialist"):
            return [
                ("Late Spring", 1949),
                ("Early Summer", 1951),
                ("Floating Weeds", 1959),
                ("An Autumn Afternoon", 1962),
                ("When a Woman Ascends the Stairs", 1960),
                ("Floating Clouds", 1955),
                ("The Naked Island", 1960),
                ("Woman in the Dunes", 1964),
            ]
        case ("Drama", "Archivist"):
            return [
                ("Make Way for Tomorrow", 1937),
                ("Stella Dallas", 1937),
                ("Mr. Smith Goes to Washington", 1939),
                ("The Mortal Storm", 1940),
                ("Penny Serenade", 1941),
                ("Now, Voyager", 1942),
                ("Random Harvest", 1942),
                ("Brief Encounter", 1945),
            ]
        case ("Drama", "Master"):
            return [
                ("The Crowd", 1928),
                ("Sunrise", 1927),
                ("Street Angel", 1928),
                ("7th Heaven", 1927),
                ("Lonesome", 1928),
                ("Stark Love", 1927),
                ("The Wind", 1928),
                ("The Docks of New York", 1928),
            ]
        case ("Espionage", "Essential"):
            return [
                ("Tinker Tailor Soldier Spy", 2011),
                ("The Spy Who Came in from the Cold", 1965),
                ("Three Days of the Condor", 1975),
                ("Munich", 2005),
                ("The Lives of Others", 2006),
                ("The Conformist", 1970),
                ("Notorious", 1946),
                ("North by Northwest", 1959),
                ("The Bourne Identity", 2002),
                ("Casino Royale", 2006),
            ]
        case ("Espionage", "Foundational"):
            return [
                ("The 39 Steps", 1935),
                ("The Lady Vanishes", 1938),
                ("Foreign Correspondent", 1940),
                ("The Manchurian Candidate", 1962),
                ("From Russia with Love", 1963),
                ("Goldfinger", 1964),
                ("The Ipcress File", 1965),
                ("Funeral in Berlin", 1966),
                ("Billion Dollar Brain", 1967),
                ("Topaz", 1969),
                ("The Conversation", 1974),
                ("The Day of the Jackal", 1973),
                ("The Bourne Ultimatum", 2007),
                ("Skyfall", 2012),
                ("Atomic Blonde", 2017),
            ]
        case ("Espionage", "Classics"):
            return [
                ("Five Fingers", 1952),
                ("Diplomatic Courier", 1952),
                ("Pickup on South Street", 1953),
                ("The Quiller Memorandum", 1966),
                ("The Deadly Affair", 1967),
                ("The Looking Glass War", 1969),
                ("The Tailor of Panama", 2001),
                ("Body of Lies", 2008),
                ("Syriana", 2005),
                ("The Good Shepherd", 2006),
                ("Breach", 2007),
                ("Bridge of Spies", 2015),
                ("The Courier", 2020),
            ]
        case ("Espionage", "Well-Versed"):
            return [
                ("Ronin", 1998),
                ("Spy Game", 2001),
                ("The Recruit", 2003),
                ("The Bourne Supremacy", 2004),
                ("Salt", 2010),
                ("Hanna", 2011),
                ("Argo", 2012),
                ("Zero Dark Thirty", 2012),
                ("A Most Wanted Man", 2014),
                ("Our Kind of Traitor", 2016),
                ("Red Sparrow", 2018),
            ]
        case ("Espionage", "Devotee"):
            return [
                ("The Russia House", 1990),
                ("The Tailor of Panama", 2001),
                ("The Constant Gardener", 2005),
                ("Charlie Wilson's War", 2007),
                ("Fair Game", 2010),
                ("The Debt", 2010),
                ("Black Book", 2006),
                ("The Counterfeiters", 2007),
                ("Persian Lessons", 2020),
            ]
        case ("Espionage", "Connoisseur"):
            return [
                ("Funeral in Berlin", 1966),
                ("The Kremlin Letter", 1970),
                ("Scorpio", 1973),
                ("The Black Windmill", 1974),
                ("The Mackintosh Man", 1973),
                ("Hopscotch", 1980),
                ("The Osterman Weekend", 1983),
                ("Gorky Park", 1983),
                ("The Falcon and the Snowman", 1985),
            ]
        case ("Espionage", "Deep Cuts"):
            return [
                ("The Defector", 1966),
                ("Assignment to Kill", 1968),
                ("A Dandy in Aspic", 1968),
                ("The Bedford Incident", 1965),
                ("The Spy Who Loved Me", 1977),
                ("The Innocent", 1993),
                ("The Tailor of Panama", 2001),
                ("The Whistle Blower", 1986),
            ]
        case ("Espionage", "Specialist"):
            return [
                ("Cloak and Dagger", 1946),
                ("13 Rue Madeleine", 1947),
                ("The Iron Curtain", 1948),
                ("Walk East on Beacon", 1952),
                ("I Was a Communist for the FBI", 1951),
                ("My Son John", 1952),
                ("Big Jim McLain", 1952),
                ("Pickup Alley", 1957),
            ]
        case ("Espionage", "Archivist"):
            return [
                ("Secret Agent", 1936),
                ("Sabotage", 1936),
                ("Confessions of a Nazi Spy", 1939),
                ("Above Suspicion", 1943),
                ("The Mask of Dimitrios", 1944),
                ("Ministry of Fear", 1944),
                ("Notorious", 1946),
                ("Berlin Express", 1948),
            ]
        case ("Espionage", "Master"):
            return [
                ("Mata Hari", 1931),
                ("British Intelligence", 1940),
                ("Background to Danger", 1943),
                ("Five Graves to Cairo", 1943),
                ("13 Rue Madeleine", 1947),
                ("The House on 92nd Street", 1945),
                ("OSS", 1946),
                ("Spy Hunt", 1950),
            ]
        case ("Fantasy", "Essential"):
            return [
                ("The Lord of the Rings: The Fellowship of the Ring", 2001),
                ("The Lord of the Rings: The Two Towers", 2002),
                ("The Lord of the Rings: The Return of the King", 2003),
                ("The Wizard of Oz", 1939),
                ("The Princess Bride", 1987),
                ("Pan's Labyrinth", 2006),
                ("Spirited Away", 2001),
                ("Beauty and the Beast", 1946),
                ("Edward Scissorhands", 1990),
                ("Big Fish", 2003),
            ]
        case ("Fantasy", "Foundational"):
            return [
                ("The Thief of Bagdad", 1940),
                ("The 7th Voyage of Sinbad", 1958),
                ("Jason and the Argonauts", 1963),
                ("Conan the Barbarian", 1982),
                ("Excalibur", 1981),
                ("Legend", 1985),
                ("Willow", 1988),
                ("Labyrinth", 1986),
                ("The NeverEnding Story", 1984),
                ("The Dark Crystal", 1982),
                ("Time Bandits", 1981),
                ("The Adventures of Baron Munchausen", 1988),
                ("Stardust", 2007),
                ("The Shape of Water", 2017),
                ("Harry Potter and the Prisoner of Azkaban", 2004),
            ]
        case ("Fantasy", "Classics"):
            return [
                ("King Kong", 1933),
                ("Lost Horizon", 1937),
                ("The Adventures of Robin Hood", 1938),
                ("The Thief of Bagdad", 1924),
                ("It's a Wonderful Life", 1946),
                ("A Matter of Life and Death", 1946),
                ("The Red Shoes", 1948),
                ("Beauty and the Beast", 1991),
                ("The Black Cauldron", 1985),
                ("Mary Poppins", 1964),
                ("Bedknobs and Broomsticks", 1971),
                ("Pete's Dragon", 1977),
            ]
        case ("Fantasy", "Well-Versed"):
            return [
                ("Princess Mononoke", 1997),
                ("Howl's Moving Castle", 2004),
                ("My Neighbor Totoro", 1988),
                ("Castle in the Sky", 1986),
                ("Nausicaä of the Valley of the Wind", 1984),
                ("Kiki's Delivery Service", 1989),
                ("The Tale of the Princess Kaguya", 2013),
                ("Whisper of the Heart", 1995),
                ("When Marnie Was There", 2014),
                ("The Secret of Kells", 2009),
                ("Song of the Sea", 2014),
                ("Wolfwalkers", 2020),
            ]
        case ("Fantasy", "Devotee"):
            return [
                ("The Fall", 2006),
                ("The Imaginarium of Doctor Parnassus", 2009),
                ("Mirrormask", 2005),
                ("The Brothers Grimm", 2005),
                ("Tideland", 2005),
                ("The City of Lost Children", 1995),
                ("Delicatessen", 1991),
                ("The Fisher King", 1991),
                ("The Adventures of Baron Munchausen", 1988),
                ("Brazil", 1985),
                ("Jabberwocky", 1977),
            ]
        case ("Fantasy", "Connoisseur"):
            return [
                ("Valerie and Her Week of Wonders", 1970),
                ("The Saragossa Manuscript", 1965),
                ("The Hourglass Sanatorium", 1973),
                ("Daisies", 1966),
                ("Marketa Lazarová", 1967),
                ("The Color of Pomegranates", 1969),
                ("The Spirit of the Beehive", 1973),
                ("Cría Cuervos", 1976),
            ]
        case ("Fantasy", "Deep Cuts"):
            return [
                ("Dragonslayer", 1981),
                ("Ladyhawke", 1985),
                ("Krull", 1983),
                ("The Beastmaster", 1982),
                ("The Sword and the Sorcerer", 1982),
                ("Hawk the Slayer", 1980),
                ("Deathstalker", 1983),
                ("Beastmaster", 1982),
            ]
        case ("Fantasy", "Specialist"):
            return [
                ("The Singing Ringing Tree", 1957),
                ("Three Wishes for Cinderella", 1973),
                ("Donkey Skin", 1970),
                ("The Magic Flute", 1975),
                ("The Tales of Hoffmann", 1951),
                ("Black Narcissus", 1947),
                ("The Company of Wolves", 1984),
            ]
        case ("Fantasy", "Archivist"):
            return [
                ("The Cabinet of Dr. Caligari", 1920),
                ("The Golem", 1920),
                ("Häxan", 1922),
                ("Faust", 1926),
                ("The Nibelungen: Siegfried", 1924),
                ("The Nibelungen: Kriemhild's Revenge", 1924),
                ("The Bluebird", 1918),
                ("The Lost World", 1925),
            ]
        case ("Fantasy", "Master"):
            return [
                ("A Trip to the Moon", 1902),
                ("The Impossible Voyage", 1904),
                ("The Conquest of the Pole", 1912),
                ("The Kingdom of the Fairies", 1903),
                ("The Witch", 1906),
                ("The Beautiful Sufferings of the Blonde-Haired Lady", 1909),
                ("The Merry Frolics of Satan", 1906),
                ("Cinderella", 1899),
            ]
        case ("History", "Essential"):
            return [
                ("Lawrence of Arabia", 1962),
                ("Schindler's List", 1993),
                ("Saving Private Ryan", 1998),
                ("Gandhi", 1982),
                ("Apocalypse Now", 1979),
                ("Barry Lyndon", 1975),
                ("The Last Emperor", 1987),
                ("Spartacus", 1960),
                ("Glory", 1989),
                ("12 Years a Slave", 2013),
            ]
        case ("History", "Foundational"):
            return [
                ("Ben-Hur", 1959),
                ("El Cid", 1961),
                ("Doctor Zhivago", 1965),
                ("A Man for All Seasons", 1966),
                ("The Lion in Winter", 1968),
                ("Patton", 1970),
                ("Reds", 1981),
                ("Amadeus", 1984),
                ("The Mission", 1986),
                ("Dances with Wolves", 1990),
                ("Braveheart", 1995),
                ("Gladiator", 2000),
                ("The Last Samurai", 2003),
                ("Master and Commander: The Far Side of the World", 2003),
                ("Oppenheimer", 2023),
            ]
        case ("History", "Classics"):
            return [
                ("Henry V", 1944),
                ("Hamlet", 1948),
                ("Ivanhoe", 1952),
                ("Quo Vadis", 1951),
                ("The Robe", 1953),
                ("The Ten Commandments", 1956),
                ("El Cid", 1961),
                ("Cleopatra", 1963),
                ("The Fall of the Roman Empire", 1964),
                ("Becket", 1964),
                ("A Lion in Winter", 1968),
                ("Mary, Queen of Scots", 1971),
                ("Cromwell", 1970),
                ("Anne of the Thousand Days", 1969),
            ]
        case ("History", "Well-Versed"):
            return [
                ("Andrei Rublev", 1966),
                ("The Battle of Algiers", 1966),
                ("Burn!", 1969),
                ("Waterloo", 1970),
                ("Nicholas and Alexandra", 1971),
                ("Ludwig", 1973),
                ("1900", 1976),
                ("Heaven's Gate", 1980),
                ("Ran", 1985),
                ("Kagemusha", 1980),
                ("The Return of Martin Guerre", 1982),
                ("Danton", 1983),
            ]
        case ("History", "Devotee"):
            return [
                ("Aguirre, the Wrath of God", 1972),
                ("The New World", 2005),
                ("The Last of the Mohicans", 1992),
                ("Black Robe", 1991),
                ("The Mission", 1986),
                ("Black Book", 2006),
                ("Sophie Scholl: The Final Days", 2005),
                ("Downfall", 2004),
                ("The Counterfeiters", 2007),
                ("Hyenas", 1992),
                ("Yeelen", 1987),
            ]
        case ("History", "Connoisseur"):
            return [
                ("The Rise of Louis XIV", 1966),
                ("Socrates", 1971),
                ("Augustine of Hippo", 1972),
                ("The Age of the Medici", 1973),
                ("Cartesius", 1974),
                ("The Tree of Wooden Clogs", 1978),
                ("Padre Padrone", 1977),
                ("Allonsanfàn", 1974),
            ]
        case ("History", "Deep Cuts"):
            return [
                ("La Marseillaise", 1938),
                ("Napoleon", 1927),
                ("The Earrings of Madame de...", 1953),
                ("Senso", 1954),
                ("The Leopard", 1963),
                ("Fellini's Casanova", 1976),
                ("Vatel", 2000),
                ("Marie Antoinette", 2006),
            ]
        case ("History", "Specialist"):
            return [
                ("Ivan the Terrible, Part I", 1944),
                ("Ivan the Terrible, Part II", 1958),
                ("Alexander Nevsky", 1938),
                ("Que Viva Mexico!", 1932),
                ("October: Ten Days That Shook the World", 1928),
                ("The End of St. Petersburg", 1927),
                ("Mother", 1926),
                ("Strike", 1925),
            ]
        case ("History", "Archivist"):
            return [
                ("Cabiria", 1914),
                ("The Birth of a Nation", 1915),
                ("Intolerance", 1916),
                ("Orphans of the Storm", 1921),
                ("The Big Parade", 1925),
                ("Ben-Hur: A Tale of the Christ", 1925),
                ("Wings", 1927),
                ("Way Down East", 1920),
            ]
        case ("History", "Master"):
            return [
                ("The Assassination of the Duke of Guise", 1908),
                ("Quo Vadis", 1913),
                ("The Last Days of Pompeii", 1913),
                ("Joan the Woman", 1916),
                ("Civilization", 1916),
                ("The Fall of Babylon", 1919),
                ("Mothers of Men", 1917),
                ("Atlantis", 1913),
            ]
        case ("Horror", "Essential"):
            return [
                ("Psycho", 1960),
                ("The Exorcist", 1973),
                ("The Shining", 1980),
                ("Halloween", 1978),
                ("The Texas Chain Saw Massacre", 1974),
                ("Night of the Living Dead", 1968),
                ("Rosemary's Baby", 1968),
                ("Alien", 1979),
                ("The Thing", 1982),
                ("Get Out", 2017),
            ]
        case ("Horror", "Foundational"):
            return [
                ("Nosferatu", 1922),
                ("Frankenstein", 1931),
                ("Dracula", 1931),
                ("Bride of Frankenstein", 1935),
                ("Cat People", 1942),
                ("The Innocents", 1961),
                ("Carrie", 1976),
                ("Suspiria", 1977),
                ("An American Werewolf in London", 1981),
                ("The Evil Dead", 1981),
                ("Poltergeist", 1982),
                ("A Nightmare on Elm Street", 1984),
                ("Hereditary", 2018),
                ("The Witch", 2015),
                ("It Follows", 2014),
            ]
        case ("Horror", "Classics"):
            return [
                ("The Cabinet of Dr. Caligari", 1920),
                ("Vampyr", 1932),
                ("Freaks", 1932),
                ("The Mummy", 1932),
                ("The Wolf Man", 1941),
                ("I Walked with a Zombie", 1943),
                ("The Body Snatcher", 1945),
                ("Dead of Night", 1945),
                ("Diabolique", 1955),
                ("Eyes Without a Face", 1960),
                ("The Haunting", 1963),
                ("Onibaba", 1964),
                ("Kwaidan", 1964),
                ("The Wicker Man", 1973),
            ]
        case ("Horror", "Well-Versed"):
            return [
                ("The Babadook", 2014),
                ("It Follows", 2014),
                ("The Witch", 2015),
                ("Hereditary", 2018),
                ("Midsommar", 2019),
                ("Us", 2019),
                ("The Lighthouse", 2019),
                ("Saint Maud", 2019),
                ("Possessor", 2020),
                ("Censor", 2021),
                ("Talk to Me", 2022),
                ("Pearl", 2022),
                ("X", 2022),
            ]
        case ("Horror", "Devotee"):
            return [
                ("Audition", 1999),
                ("Ringu", 1998),
                ("Pulse", 2001),
                ("Ju-on: The Grudge", 2002),
                ("Dark Water", 2002),
                ("A Tale of Two Sisters", 2003),
                ("The Eye", 2002),
                ("Shutter", 2004),
                ("Let the Right One In", 2008),
                ("The Wailing", 2016),
                ("Train to Busan", 2016),
            ]
        case ("Horror", "Connoisseur"):
            return [
                ("Don't Look Now", 1973),
                ("The Tenant", 1976),
                ("Repulsion", 1965),
                ("The Innocents", 1961),
                ("The Haunting", 1963),
                ("Carnival of Souls", 1962),
                ("Targets", 1968),
                ("The Devils", 1971),
                ("Daughters of Darkness", 1971),
                ("Picnic at Hanging Rock", 1975),
            ]
        case ("Horror", "Deep Cuts"):
            return [
                ("The Beyond", 1981),
                ("City of the Living Dead", 1980),
                ("House by the Cemetery", 1981),
                ("Zombie", 1979),
                ("Tenebre", 1982),
                ("Phenomena", 1985),
                ("Opera", 1987),
                ("Black Sunday", 1960),
                ("Blood and Black Lace", 1964),
            ]
        case ("Horror", "Specialist"):
            return [
                ("Whispering Corridors", 1998),
                ("Memento Mori", 1999),
                ("R-Point", 2004),
                ("Alone", 2007),
                ("Reincarnation", 2005),
                ("Marebito", 2004),
                ("Cure", 1997),
            ]
        case ("Horror", "Archivist"):
            return [
                ("The Phantom Carriage", 1921),
                ("Häxan", 1922),
                ("The Hands of Orlac", 1924),
                ("Waxworks", 1924),
                ("The Cat and the Canary", 1927),
                ("The Unknown", 1927),
                ("London After Midnight", 1927),
                ("Nosferatu the Vampyre", 1979),
            ]
        case ("Horror", "Master"):
            return [
                ("Equinox", 1970),
                ("The Boy Who Cried Werewolf", 1973),
                ("Sssssss", 1973),
                ("The Devil's Nightmare", 1971),
                ("A Bell from Hell", 1973),
                ("Symptoms", 1974),
                ("The Premonition", 1976),
                ("Tourist Trap", 1979),
            ]        case ("Comedy", "Essential"):
            return [
                ("Some Like It Hot", 1959),
                ("Dr. Strangelove", 1964),
                ("Annie Hall", 1977),
                ("Groundhog Day", 1993),
                ("Airplane!", 1980),
                ("Duck Soup", 1933),
                ("His Girl Friday", 1940),
                ("The Big Lebowski", 1998),
                ("Monty Python and the Holy Grail", 1975),
                ("This Is Spinal Tap", 1984),
            ]
        case ("Comedy", "Foundational"):
            return [
                ("Bringing Up Baby", 1938),
                ("The Philadelphia Story", 1940),
                ("It Happened One Night", 1934),
                ("Tootsie", 1982),
                ("When Harry Met Sally...", 1989),
                ("The Princess Bride", 1987),
                ("Caddyshack", 1980),
                ("Animal House", 1978),
                ("Ghostbusters", 1984),
                ("Blazing Saddles", 1974),
                ("Young Frankenstein", 1974),
                ("Office Space", 1999),
                ("Anchorman", 2004),
                ("The Big Sick", 2017),
                ("Booksmart", 2019),
            ]
        case ("Comedy", "Classics"):
            return [
                ("Sullivan's Travels", 1941),
                ("The Lady Eve", 1941),
                ("The Apartment", 1960),
                ("Manhattan", 1979),
                ("Tampopo", 1985),
                ("Modern Times", 1936),
                ("City Lights", 1931),
                ("The Gold Rush", 1925),
                ("The General", 1926),
                ("Sherlock Jr.", 1924),
                ("Steamboat Bill, Jr.", 1928),
                ("Safety Last!", 1923),
                ("Born Yesterday", 1950),
                ("Adam's Rib", 1949),
            ]
        case ("Comedy", "Well-Versed"):
            return [
                ("Network", 1976),
                ("Being There", 1979),
                ("The Producers", 1967),
                ("Harold and Maude", 1971),
                ("Local Hero", 1983),
                ("Withnail and I", 1987),
                ("A Fish Called Wanda", 1988),
                ("Trading Places", 1983),
                ("Beverly Hills Cop", 1984),
                ("Coming to America", 1988),
                ("Planes, Trains and Automobiles", 1987),
                ("Ferris Bueller's Day Off", 1986),
                ("The Breakfast Club", 1985),
                ("Heathers", 1989),
                ("Election", 1999),
            ]
        case ("Comedy", "Devotee"):
            return [
                ("Rushmore", 1998),
                ("The Royal Tenenbaums", 2001),
                ("Lost in Translation", 2003),
                ("Sideways", 2004),
                ("Dazed and Confused", 1993),
                ("Clerks", 1994),
                ("Slacker", 1990),
                ("Swingers", 1996),
                ("Bottle Rocket", 1996),
                ("Best in Show", 2000),
                ("Waiting for Guffman", 1996),
                ("A Mighty Wind", 2003),
            ]
        case ("Comedy", "Connoisseur"):
            return [
                ("Playtime", 1967),
                ("Mon Oncle", 1958),
                ("Mr. Hulot's Holiday", 1953),
                ("Trafic", 1971),
                ("The Discreet Charm of the Bourgeoisie", 1972),
                ("The Phantom of Liberty", 1974),
                ("8½", 1963),
                ("Divorce Italian Style", 1961),
                ("Big Deal on Madonna Street", 1958),
                ("Bread and Tulips", 2000),
            ]
        case ("Comedy", "Deep Cuts"):
            return [
                ("Real Life", 1979),
                ("Lost in America", 1985),
                ("Defending Your Life", 1991),
                ("Modern Romance", 1981),
                ("After Hours", 1985),
                ("Repo Man", 1984),
                ("Stranger Than Paradise", 1984),
                ("Down by Law", 1986),
                ("Mystery Train", 1989),
            ]
        case ("Comedy", "Specialist"):
            return [
                ("King of Comedy", 1982),
                ("The In-Laws", 1979),
                ("What's Up, Doc?", 1972),
                ("Paper Moon", 1973),
                ("The Bad News Bears", 1976),
                ("Slap Shot", 1977),
                ("Smile", 1975),
                ("Nashville", 1975),
            ]
        case ("Comedy", "Archivist"):
            return [
                ("The Lavender Hill Mob", 1951),
                ("The Ladykillers", 1955),
                ("Kind Hearts and Coronets", 1949),
                ("Passport to Pimlico", 1949),
                ("The Man in the White Suit", 1951),
                ("I'm All Right Jack", 1959),
                ("School for Scoundrels", 1960),
                ("Whisky Galore!", 1949),
            ]
        case ("Comedy", "Master"):
            return [
                ("The Awful Truth", 1937),
                ("My Man Godfrey", 1936),
                ("Twentieth Century", 1934),
                ("Theodora Goes Wild", 1936),
                ("Easy Living", 1937),
                ("Nothing Sacred", 1937),
                ("Topper", 1937),
                ("Holiday", 1938),
            ]
        case ("Adventure", "Essential"):
            return [
                ("Raiders of the Lost Ark", 1981),
                ("Lawrence of Arabia", 1962),
                ("The Lord of the Rings: The Fellowship of the Ring", 2001),
                ("Indiana Jones and the Last Crusade", 1989),
                ("The Princess Bride", 1987),
                ("Pirates of the Caribbean: The Curse of the Black Pearl", 2003),
                ("Jurassic Park", 1993),
                ("The African Queen", 1951),
                ("The Adventures of Robin Hood", 1938),
                ("King Kong", 1933),
            ]
        case ("Adventure", "Foundational"):
            return [
                ("The Treasure of the Sierra Madre", 1948),
                ("Gunga Din", 1939),
                ("The Man Who Would Be King", 1975),
                ("Romancing the Stone", 1984),
                ("Stand by Me", 1986),
                ("The Goonies", 1985),
                ("Big Trouble in Little China", 1986),
                ("Conan the Barbarian", 1982),
                ("Excalibur", 1981),
                ("The Mask of Zorro", 1998),
                ("Master and Commander: The Far Side of the World", 2003),
                ("The Lord of the Rings: The Two Towers", 2002),
                ("The Lord of the Rings: The Return of the King", 2003),
                ("Star Wars: A New Hope", 1977),
                ("The Empire Strikes Back", 1980),
            ]
        case ("Adventure", "Classics"):
            return [
                ("Mutiny on the Bounty", 1935),
                ("Captain Blood", 1935),
                ("The Sea Hawk", 1940),
                ("The Three Musketeers", 1973),
                ("The Four Musketeers", 1974),
                ("Scaramouche", 1952),
                ("Ivanhoe", 1952),
                ("Knights of the Round Table", 1953),
                ("20,000 Leagues Under the Sea", 1954),
                ("Mysterious Island", 1961),
                ("Jason and the Argonauts", 1963),
                ("The 7th Voyage of Sinbad", 1958),
            ]
        case ("Adventure", "Well-Versed"):
            return [
                ("The Black Stallion", 1979),
                ("Never Cry Wolf", 1983),
                ("The Emerald Forest", 1985),
                ("The Mission", 1986),
                ("Black Robe", 1991),
                ("Aguirre, the Wrath of God", 1972),
                ("Fitzcarraldo", 1982),
                ("Walkabout", 1971),
                ("Picnic at Hanging Rock", 1975),
                ("Gallipoli", 1981),
                ("Master of the World", 1961),
                ("Around the World in 80 Days", 1956),
            ]
        case ("Adventure", "Devotee"):
            return [
                ("The Last of the Mohicans", 1992),
                ("Dances with Wolves", 1990),
                ("Apocalypto", 2006),
                ("The New World", 2005),
                ("Cast Away", 2000),
                ("Life of Pi", 2012),
                ("All Is Lost", 2013),
                ("127 Hours", 2010),
                ("Touching the Void", 2003),
                ("Into the Wild", 2007),
                ("The Way Back", 2010),
            ]
        case ("Adventure", "Connoisseur"):
            return [
                ("The Wages of Fear", 1953),
                ("Sorcerer", 1977),
                ("Deliverance", 1972),
                ("Southern Comfort", 1981),
                ("The Edge", 1997),
                ("The Grey", 2011),
                ("Quest for Fire", 1981),
                ("The Bear", 1988),
                ("White Fang", 1991),
            ]
        case ("Adventure", "Deep Cuts"):
            return [
                ("Time Bandits", 1981),
                ("The Adventures of Baron Munchausen", 1988),
                ("Legend", 1985),
                ("Willow", 1988),
                ("Dragonslayer", 1981),
                ("Ladyhawke", 1985),
                ("The Dark Crystal", 1982),
                ("Krull", 1983),
                ("The Beastmaster", 1982),
            ]
        case ("Adventure", "Specialist"):
            return [
                ("The Naked Prey", 1965),
                ("A Man Called Horse", 1970),
                ("Jeremiah Johnson", 1972),
                ("The Mountain Men", 1980),
                ("Man in the Wilderness", 1971),
                ("The Stalking Moon", 1968),
                ("The Professionals", 1966),
                ("Lonely Are the Brave", 1962),
            ]
        case ("Adventure", "Archivist"):
            return [
                ("The Vikings", 1958),
                ("El Cid", 1961),
                ("The Fall of the Roman Empire", 1964),
                ("Khartoum", 1966),
                ("Zulu", 1964),
                ("55 Days at Peking", 1963),
                ("Solomon and Sheba", 1959),
                ("The Crusades", 1935),
            ]
        case ("Adventure", "Master"):
            return [
                ("She", 1935),
                ("King Solomon's Mines", 1937),
                ("The Four Feathers", 1939),
                ("Stanley and Livingstone", 1939),
                ("The Lost World", 1925),
                ("Trader Horn", 1931),
                ("Tabu: A Story of the South Seas", 1931),
                ("Chang: A Drama of the Wilderness", 1927),
            ]
        case ("Crime", "Essential"):
            return [
                ("The Godfather", 1972),
                ("The Godfather Part II", 1974),
                ("Goodfellas", 1990),
                ("Pulp Fiction", 1994),
                ("Heat", 1995),
                ("Chinatown", 1974),
                ("The Departed", 2006),
                ("Casino", 1995),
                ("Reservoir Dogs", 1992),
                ("Scarface", 1983),
            ]
        case ("Crime", "Foundational"):
            return [
                ("The Untouchables", 1987),
                ("Bonnie and Clyde", 1967),
                ("The French Connection", 1971),
                ("Serpico", 1973),
                ("Dog Day Afternoon", 1975),
                ("Mean Streets", 1973),
                ("Once Upon a Time in America", 1984),
                ("Miller's Crossing", 1990),
                ("A History of Violence", 2005),
                ("Eastern Promises", 2007),
                ("Fargo", 1996),
                ("No Country for Old Men", 2007),
                ("Blood Simple", 1984),
                ("Carlito's Way", 1993),
                ("Donnie Brasco", 1997),
            ]
        case ("Crime", "Classics"):
            return [
                ("The Maltese Falcon", 1941),
                ("Double Indemnity", 1944),
                ("The Big Sleep", 1946),
                ("Out of the Past", 1947),
                ("White Heat", 1949),
                ("The Asphalt Jungle", 1950),
                ("The Killing", 1956),
                ("Sweet Smell of Success", 1957),
                ("Touch of Evil", 1958),
                ("Bullitt", 1968),
                ("Get Carter", 1971),
                ("The Long Good Friday", 1980),
                ("Atlantic City", 1980),
                ("Body Heat", 1981),
            ]
        case ("Crime", "Well-Versed"):
            return [
                ("L.A. Confidential", 1997),
                ("The Usual Suspects", 1995),
                ("Se7en", 1995),
                ("Sexy Beast", 2000),
                ("In Bruges", 2008),
                ("Layer Cake", 2004),
                ("Snatch", 2000),
                ("Lock, Stock and Two Smoking Barrels", 1998),
                ("The Limey", 1999),
                ("Out of Sight", 1998),
                ("Jackie Brown", 1997),
                ("True Romance", 1993),
                ("Killing Them Softly", 2012),
                ("American Gangster", 2007),
                ("Public Enemies", 2009),
            ]
        case ("Crime", "Devotee"):
            return [
                ("City of God", 2002),
                ("Animal Kingdom", 2010),
                ("A Prophet", 2009),
                ("Mesrine: Killer Instinct", 2008),
                ("Gomorrah", 2008),
                ("The Yards", 2000),
                ("We Own the Night", 2007),
                ("The Place Beyond the Pines", 2012),
                ("Drive", 2011),
                ("Nightcrawler", 2014),
                ("Hell or High Water", 2016),
                ("Wind River", 2017),
            ]
        case ("Crime", "Connoisseur"):
            return [
                ("Le Cercle Rouge", 1970),
                ("Le Samouraï", 1967),
                ("Bob le Flambeur", 1956),
                ("Rififi", 1955),
                ("Touchez Pas au Grisbi", 1954),
                ("Pépé le Moko", 1937),
                ("Branded to Kill", 1967),
                ("Pale Flower", 1964),
                ("Sonatine", 1993),
                ("Hana-bi", 1997),
            ]
        case ("Crime", "Deep Cuts"):
            return [
                ("The Friends of Eddie Coyle", 1973),
                ("Charley Varrick", 1973),
                ("The Outfit", 1973),
                ("The Killer Elite", 1975),
                ("Across 110th Street", 1972),
                ("Prime Cut", 1972),
                ("The Yakuza", 1974),
                ("Thunderbolt and Lightfoot", 1974),
                ("Straight Time", 1978),
            ]
        case ("Crime", "Specialist"):
            return [
                ("Point Blank", 1967),
                ("The Split", 1968),
                ("The Hot Rock", 1972),
                ("The Anderson Tapes", 1971),
                ("$ (Dollars)", 1971),
                ("Plunder Road", 1957),
                ("The Lineup", 1958),
                ("Murder by Contract", 1958),
            ]
        case ("Crime", "Archivist"):
            return [
                ("He Walked by Night", 1948),
                ("T-Men", 1947),
                ("Raw Deal", 1948),
                ("Border Incident", 1949),
                ("Side Street", 1950),
                ("Armored Car Robbery", 1950),
                ("The Prowler", 1951),
                ("Kansas City Confidential", 1952),
            ]
        case ("Crime", "Master"):
            return [
                ("City of Fear", 1959),
                ("The Big Combo", 1955),
                ("99 River Street", 1953),
                ("The Hitch-Hiker", 1953),
                ("Crime Wave", 1954),
                ("Hell's Highway", 1932),
                ("The Roaring Twenties", 1939),
                ("Force of Evil", 1948),
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
        case ("Western", "Essential"):
            return [
                ("The Searchers", 1956),
                ("Unforgiven", 1992),
                ("The Good, the Bad and the Ugly", 1966),
                ("Once Upon a Time in the West", 1968),
                ("High Noon", 1952),
                ("Red River", 1948),
                ("Stagecoach", 1939),
                ("The Wild Bunch", 1969),
                ("Butch Cassidy and the Sundance Kid", 1969),
                ("No Country for Old Men", 2007),
            ]
        case ("Western", "Foundational"):
            return [
                ("Shane", 1953),
                ("My Darling Clementine", 1946),
                ("Rio Bravo", 1959),
                ("The Magnificent Seven", 1960),
                ("A Fistful of Dollars", 1964),
                ("For a Few Dollars More", 1965),
                ("True Grit", 1969),
                ("Blazing Saddles", 1974),
                ("Tombstone", 1993),
                ("Dances with Wolves", 1990),
                ("3:10 to Yuma", 1957),
                ("The Treasure of the Sierra Madre", 1948),
                ("Django Unchained", 2012),
                ("The Outlaw Josey Wales", 1976),
                ("Hell or High Water", 2016),
            ]
        case ("Western", "Classics"):
            return [
                ("The Man Who Shot Liberty Valance", 1962),
                ("Johnny Guitar", 1954),
                ("The Ox-Bow Incident", 1943),
                ("McCabe & Mrs. Miller", 1971),
                ("Pat Garrett and Billy the Kid", 1973),
                ("Open Range", 2003),
                ("The Assassination of Jesse James by the Coward Robert Ford", 2007),
                ("There Will Be Blood", 2007),
                ("Bone Tomahawk", 2015),
                ("The Power of the Dog", 2021),
                ("Meek's Cutoff", 2010),
                ("Brokeback Mountain", 2005),
                ("Silverado", 1985),
                ("The Quick and the Dead", 1995),
            ]
        case ("Western", "Well-Versed"):
            return [
                ("Days of Heaven", 1978),
                ("The Proposition", 2005),
                ("Heaven's Gate", 1980),
                ("Pale Rider", 1985),
                ("Bring Me the Head of Alfredo Garcia", 1974),
                ("Major Dundee", 1965),
                ("Junior Bonner", 1972),
                ("The Ballad of Cable Hogue", 1970),
                ("Little Big Man", 1970),
                ("Jeremiah Johnson", 1972),
                ("Ulzana's Raid", 1972),
                ("The Missouri Breaks", 1976),
                ("Hud", 1963),
            ]
        case ("Western", "Devotee"):
            return [
                ("The Naked Spur", 1953),
                ("Winchester '73", 1950),
                ("Bend of the River", 1952),
                ("The Far Country", 1954),
                ("The Man from Laramie", 1955),
                ("Vera Cruz", 1954),
                ("Apache", 1954),
                ("Run of the Arrow", 1957),
                ("Forty Guns", 1957),
                ("Warlock", 1959),
                ("Ride Lonesome", 1959),
            ]
        case ("Western", "Connoisseur"):
            return [
                ("Seven Men from Now", 1956),
                ("The Tall T", 1957),
                ("Comanche Station", 1960),
                ("Ride the High Country", 1962),
                ("The Shooting", 1966),
                ("Ride in the Whirlwind", 1966),
                ("Will Penny", 1968),
                ("The Hired Hand", 1971),
                ("Monte Walsh", 1970),
            ]
        case ("Western", "Deep Cuts"):
            return [
                ("The Great Silence", 1968),
                ("Django", 1966),
                ("Keoma", 1976),
                ("Day of Anger", 1967),
                ("Death Rides a Horse", 1967),
                ("The Big Gundown", 1967),
                ("Companeros", 1970),
                ("The Mercenary", 1968),
            ]
        case ("Western", "Specialist"):
            return [
                ("Duel in the Sun", 1946),
                ("Pursued", 1947),
                ("The Furies", 1950),
                ("Devil's Doorway", 1950),
                ("Broken Arrow", 1950),
                ("The Gunfighter", 1950),
                ("High Noon", 1952),
                ("Hondo", 1953),
            ]
        case ("Western", "Archivist"):
            return [
                ("The Iron Horse", 1924),
                ("3 Bad Men", 1926),
                ("The Vanishing American", 1925),
                ("The Covered Wagon", 1923),
                ("Tumbleweeds", 1925),
                ("The Wind", 1928),
                ("In Old Arizona", 1928),
                ("The Virginian", 1929),
            ]
        case ("Western", "Master"):
            return [
                ("The Great Train Robbery", 1903),
                ("The Bank Robbery", 1908),
                ("The Lonedale Operator", 1911),
                ("The Battle at Elderbush Gulch", 1913),
                ("Hell's Hinges", 1916),
                ("The Aryan", 1916),
                ("Straight Shooting", 1917),
                ("Wild and Woolly", 1917),
            ]

        case ("Romance", "Essential"):
            return [
                ("Casablanca", 1942),
                ("Brief Encounter", 1945),
                ("Roman Holiday", 1953),
                ("In the Mood for Love", 2000),
                ("Before Sunrise", 1995),
                ("Annie Hall", 1977),
                ("When Harry Met Sally...", 1989),
                ("The Apartment", 1960),
                ("Eternal Sunshine of the Spotless Mind", 2004),
                ("Lost in Translation", 2003),
            ]
        case ("Romance", "Foundational"):
            return [
                ("It Happened One Night", 1934),
                ("The Philadelphia Story", 1940),
                ("The Shop Around the Corner", 1940),
                ("An Affair to Remember", 1957),
                ("Sabrina", 1954),
                ("Breakfast at Tiffany's", 1961),
                ("West Side Story", 1961),
                ("The Way We Were", 1973),
                ("Out of Africa", 1985),
                ("Sleepless in Seattle", 1993),
                ("Pretty Woman", 1990),
                ("Notting Hill", 1999),
                ("Love Actually", 2003),
                ("Pride & Prejudice", 2005),
                ("Call Me by Your Name", 2017),
            ]
        case ("Romance", "Classics"):
            return [
                ("Gone with the Wind", 1939),
                ("Wuthering Heights", 1939),
                ("Random Harvest", 1942),
                ("Now, Voyager", 1942),
                ("Penny Serenade", 1941),
                ("The More the Merrier", 1943),
                ("Letter from an Unknown Woman", 1948),
                ("Summertime", 1955),
                ("Marty", 1955),
                ("Splendor in the Grass", 1961),
                ("Doctor Zhivago", 1965),
                ("A Man and a Woman", 1966),
                ("Love Story", 1970),
                ("Two for the Road", 1967),
            ]
        case ("Romance", "Well-Versed"):
            return [
                ("Before Sunset", 2004),
                ("Before Midnight", 2013),
                ("Punch-Drunk Love", 2002),
                ("Her", 2013),
                ("The Big Sick", 2017),
                ("About Time", 2013),
                ("500 Days of Summer", 2009),
                ("Once", 2007),
                ("Like Crazy", 2011),
                ("Blue Valentine", 2010),
                ("Carol", 2015),
                ("Brokeback Mountain", 2005),
                ("Moonlight", 2016),
            ]
        case ("Romance", "Devotee"):
            return [
                ("Amélie", 2001),
                ("Cinema Paradiso", 1988),
                ("Il Postino", 1994),
                ("A Room with a View", 1985),
                ("Howards End", 1992),
                ("Sense and Sensibility", 1995),
                ("The Remains of the Day", 1993),
                ("Atonement", 2007),
                ("The English Patient", 1996),
                ("Cold War", 2018),
                ("Phantom Thread", 2017),
            ]
        case ("Romance", "Connoisseur"):
            return [
                ("The Earrings of Madame de...", 1953),
                ("Letter from an Unknown Woman", 1948),
                ("All That Heaven Allows", 1955),
                ("Written on the Wind", 1956),
                ("Imitation of Life", 1959),
                ("Magnificent Obsession", 1954),
                ("Far from Heaven", 2002),
                ("In the Mood for Love", 2000),
                ("2046", 2004),
                ("Days of Being Wild", 1990),
            ]
        case ("Romance", "Deep Cuts"):
            return [
                ("Last Tango in Paris", 1972),
                ("Don't Look Now", 1973),
                ("Ali: Fear Eats the Soul", 1974),
                ("The Heartbreak Kid", 1972),
                ("Two for the Road", 1967),
                ("Petulia", 1968),
                ("The Go-Between", 1971),
                ("Sunday Bloody Sunday", 1971),
            ]
        case ("Romance", "Specialist"):
            return [
                ("Beauty and the Beast", 1946),
                ("Children of Paradise", 1945),
                ("The Red Shoes", 1948),
                ("Black Narcissus", 1947),
                ("I Know Where I'm Going!", 1945),
                ("A Matter of Life and Death", 1946),
                ("The Tales of Hoffmann", 1951),
                ("Trouble in Paradise", 1932),
            ]
        case ("Romance", "Archivist"):
            return [
                ("7th Heaven", 1927),
                ("Sunrise", 1927),
                ("Street Angel", 1928),
                ("Lonesome", 1928),
                ("City Girl", 1930),
                ("Borzage's Bad Girl", 1931),
                ("A Farewell to Arms", 1932),
                ("Camille", 1936),
            ]
        case ("Romance", "Master"):
            return [
                ("Way Down East", 1920),
                ("True Heart Susie", 1919),
                ("Broken Blossoms", 1919),
                ("Stella Maris", 1918),
                ("Tess of the Storm Country", 1922),
                ("The Crowd", 1928),
                ("Show People", 1928),
                ("Pandora's Box", 1929),
            ]

        case ("Thriller", "Essential"):
            return [
                ("Psycho", 1960),
                ("The Silence of the Lambs", 1991),
                ("North by Northwest", 1959),
                ("Se7en", 1995),
                ("Rear Window", 1954),
                ("No Country for Old Men", 2007),
                ("The Wages of Fear", 1953),
                ("Jaws", 1975),
                ("The Fugitive", 1993),
                ("Parasite", 2019),
            ]
        case ("Thriller", "Foundational"):
            return [
                ("Vertigo", 1958),
                ("Strangers on a Train", 1951),
                ("Notorious", 1946),
                ("Shadow of a Doubt", 1943),
                ("The 39 Steps", 1935),
                ("The Lady Vanishes", 1938),
                ("Marathon Man", 1976),
                ("Three Days of the Condor", 1975),
                ("The Parallax View", 1974),
                ("All the President's Men", 1976),
                ("The Conversation", 1974),
                ("Klute", 1971),
                ("The French Connection", 1971),
                ("Diabolique", 1955),
                ("Charade", 1963),
            ]
        case ("Thriller", "Classics"):
            return [
                ("Wait Until Dark", 1967),
                ("Cape Fear", 1962),
                ("The Manchurian Candidate", 1962),
                ("Experiment in Terror", 1962),
                ("The Spiral Staircase", 1946),
                ("Gaslight", 1944),
                ("Sorry, Wrong Number", 1948),
                ("Sudden Fear", 1952),
                ("The Night of the Hunter", 1955),
                ("Witness for the Prosecution", 1957),
                ("Dial M for Murder", 1954),
                ("Rope", 1948),
                ("Lifeboat", 1944),
                ("Saboteur", 1942),
            ]
        case ("Thriller", "Well-Versed"):
            return [
                ("Misery", 1990),
                ("Fatal Attraction", 1987),
                ("Dressed to Kill", 1980),
                ("Body Double", 1984),
                ("Blow Out", 1981),
                ("Manhunter", 1986),
                ("Thief", 1981),
                ("Body Heat", 1981),
                ("Jagged Edge", 1985),
                ("Sea of Love", 1989),
                ("Basic Instinct", 1992),
                ("The Vanishing", 1988),
                ("The Crying Game", 1992),
                ("The Usual Suspects", 1995),
                ("Gone Girl", 2014),
            ]
        case ("Thriller", "Devotee"):
            return [
                ("Memories of Murder", 2003),
                ("The Chaser", 2008),
                ("I Saw the Devil", 2010),
                ("Oldboy", 2003),
                ("The Wailing", 2016),
                ("Burning", 2018),
                ("Decision to Leave", 2022),
                ("Caché", 2005),
                ("The White Ribbon", 2009),
                ("Tell No One", 2006),
                ("The Secret in Their Eyes", 2009),
            ]
        case ("Thriller", "Connoisseur"):
            return [
                ("Wages of Fear", 1953),
                ("Le Salaire de la Peur", 1953),
                ("Rififi", 1955),
                ("Le Trou", 1960),
                ("Purple Noon", 1960),
                ("Mississippi Mermaid", 1969),
                ("The Bride Wore Black", 1968),
                ("Tenebre", 1982),
                ("Deep Red", 1975),
                ("The Bird with the Crystal Plumage", 1970),
            ]
        case ("Thriller", "Deep Cuts"):
            return [
                ("Cutter's Way", 1981),
                ("Night Moves", 1975),
                ("The Pledge", 2001),
                ("Mystic River", 2003),
                ("Shutter Island", 2010),
                ("Prisoners", 2013),
                ("Wind River", 2017),
                ("Nightcrawler", 2014),
                ("Hell or High Water", 2016),
            ]
        case ("Thriller", "Specialist"):
            return [
                ("Drishyam", 2013),
                ("Drishyam 2", 2021),
                ("Kahaani", 2012),
                ("Talvar", 2015),
                ("Andhadhun", 2018),
                ("Badla", 2019),
                ("Vikram Vedha", 2017),
                ("Talaash", 2012),
            ]
        case ("Thriller", "Archivist"):
            return [
                ("The Spiral Staircase", 1946),
                ("Phantom Lady", 1944),
                ("Ministry of Fear", 1944),
                ("The Stranger", 1946),
                ("The Window", 1949),
                ("Cause for Alarm!", 1951),
                ("Beware, My Lovely", 1952),
                ("The Hitch-Hiker", 1953),
            ]
        case ("Thriller", "Master"):
            return [
                ("The Lodger: A Story of the London Fog", 1927),
                ("Blackmail", 1929),
                ("Murder!", 1930),
                ("Number 17", 1932),
                ("Young and Innocent", 1937),
                ("The Man Who Knew Too Much", 1934),
                ("Secret Agent", 1936),
                ("Sabotage", 1936),
            ]

        case ("War", "Essential"):
            return [
                ("Apocalypse Now", 1979),
                ("Saving Private Ryan", 1998),
                ("Paths of Glory", 1957),
                ("The Bridge on the River Kwai", 1957),
                ("All Quiet on the Western Front", 1930),
                ("Platoon", 1986),
                ("Full Metal Jacket", 1987),
                ("Come and See", 1985),
                ("Das Boot", 1981),
                ("1917", 2019),
            ]
        case ("War", "Foundational"):
            return [
                ("Patton", 1970),
                ("The Deer Hunter", 1978),
                ("The Great Escape", 1963),
                ("The Dirty Dozen", 1967),
                ("Lawrence of Arabia", 1962),
                ("The Longest Day", 1962),
                ("A Bridge Too Far", 1977),
                ("The Thin Red Line", 1998),
                ("Black Hawk Down", 2001),
                ("Letters from Iwo Jima", 2006),
                ("Flags of Our Fathers", 2006),
                ("Dunkirk", 2017),
                ("Hacksaw Ridge", 2016),
                ("Master and Commander: The Far Side of the World", 2003),
                ("Glory", 1989),
            ]
        case ("War", "Classics"):
            return [
                ("Grand Illusion", 1937),
                ("Sergeant York", 1941),
                ("Mrs. Miniver", 1942),
                ("Casablanca", 1942),
                ("Bataan", 1943),
                ("They Were Expendable", 1945),
                ("A Walk in the Sun", 1945),
                ("The Best Years of Our Lives", 1946),
                ("Battleground", 1949),
                ("Twelve O'Clock High", 1949),
                ("The Steel Helmet", 1951),
                ("From Here to Eternity", 1953),
                ("The Caine Mutiny", 1954),
            ]
        case ("War", "Well-Versed"):
            return [
                ("Stalingrad", 1993),
                ("Enemy at the Gates", 2001),
                ("Cross of Iron", 1977),
                ("The Big Red One", 1980),
                ("Empire of the Sun", 1987),
                ("Born on the Fourth of July", 1989),
                ("Casualties of War", 1989),
                ("Three Kings", 1999),
                ("Jarhead", 2005),
                ("The Hurt Locker", 2008),
                ("Restrepo", 2010),
                ("American Sniper", 2014),
            ]
        case ("War", "Devotee"):
            return [
                ("Ran", 1985),
                ("Kagemusha", 1980),
                ("The Hidden Fortress", 1958),
                ("Seven Samurai", 1954),
                ("The Human Condition I: No Greater Love", 1959),
                ("The Human Condition II: Road to Eternity", 1959),
                ("The Human Condition III: A Soldier's Prayer", 1961),
                ("Fires on the Plain", 1959),
                ("Harp of Burma", 1956),
                ("Kwaidan", 1964),
            ]
        case ("War", "Connoisseur"):
            return [
                ("Ivan's Childhood", 1962),
                ("Come and See", 1985),
                ("The Cranes Are Flying", 1957),
                ("Ballad of a Soldier", 1959),
                ("Battle of Algiers", 1966),
                ("The Ascent", 1977),
                ("Idi i Smotri", 1985),
                ("The Tin Drum", 1979),
            ]
        case ("War", "Deep Cuts"):
            return [
                ("Battle of Britain", 1969),
                ("Tora! Tora! Tora!", 1970),
                ("Midway", 1976),
                ("The Bridge at Remagen", 1969),
                ("Where Eagles Dare", 1968),
                ("Kelly's Heroes", 1970),
                ("Catch-22", 1970),
                ("Slaughterhouse-Five", 1972),
            ]
        case ("War", "Specialist"):
            return [
                ("The Battle of San Pietro", 1945),
                ("Let There Be Light", 1946),
                ("Memphis Belle: A Story of a Flying Fortress", 1944),
                ("The Battle of Midway", 1942),
                ("Why We Fight: Prelude to War", 1942),
                ("The Battle of Russia", 1943),
                ("The Negro Soldier", 1944),
                ("San Pietro", 1945),
            ]
        case ("War", "Archivist"):
            return [
                ("The Big Parade", 1925),
                ("Wings", 1927),
                ("All Quiet on the Western Front", 1930),
                ("Hell's Angels", 1930),
                ("Westfront 1918", 1930),
                ("Journey's End", 1930),
                ("The Dawn Patrol", 1930),
                ("Sergeant York", 1941),
            ]
        case ("War", "Master"):
            return [
                ("Hearts of the World", 1918),
                ("Civilization", 1916),
                ("Shoulder Arms", 1918),
                ("The Four Horsemen of the Apocalypse", 1921),
                ("What Price Glory?", 1926),
                ("The Patent Leather Kid", 1927),
                ("Two Arabian Knights", 1927),
                ("Lilac Time", 1928),
            ]

        case ("Science Fiction", "Essential"):
            return [
                ("2001: A Space Odyssey", 1968),
                ("Blade Runner", 1982),
                ("Alien", 1979),
                ("Star Wars: A New Hope", 1977),
                ("The Empire Strikes Back", 1980),
                ("Metropolis", 1927),
                ("Solaris", 1972),
                ("The Matrix", 1999),
                ("Arrival", 2016),
                ("E.T. the Extra-Terrestrial", 1982),
            ]
        case ("Science Fiction", "Foundational"):
            return [
                ("Forbidden Planet", 1956),
                ("The Day the Earth Stood Still", 1951),
                ("Invasion of the Body Snatchers", 1956),
                ("Planet of the Apes", 1968),
                ("A Clockwork Orange", 1971),
                ("Close Encounters of the Third Kind", 1977),
                ("Aliens", 1986),
                ("The Terminator", 1984),
                ("Terminator 2: Judgment Day", 1991),
                ("Back to the Future", 1985),
                ("Jurassic Park", 1993),
                ("Children of Men", 2006),
                ("Inception", 2010),
                ("Ex Machina", 2014),
                ("Mad Max: Fury Road", 2015),
            ]
        case ("Science Fiction", "Classics"):
            return [
                ("Things to Come", 1936),
                ("The War of the Worlds", 1953),
                ("Them!", 1954),
                ("This Island Earth", 1955),
                ("The Incredible Shrinking Man", 1957),
                ("The Fly", 1958),
                ("The Time Machine", 1960),
                ("La Jetée", 1962),
                ("Fahrenheit 451", 1966),
                ("Fantastic Voyage", 1966),
                ("Silent Running", 1972),
                ("Soylent Green", 1973),
                ("Westworld", 1973),
                ("Logan's Run", 1976),
            ]
        case ("Science Fiction", "Well-Versed"):
            return [
                ("Stalker", 1979),
                ("Mad Max 2: The Road Warrior", 1981),
                ("The Thing", 1982),
                ("Videodrome", 1983),
                ("The Brother from Another Planet", 1984),
                ("Brazil", 1985),
                ("The Fly", 1986),
                ("RoboCop", 1987),
                ("Total Recall", 1990),
                ("Twelve Monkeys", 1995),
                ("Gattaca", 1997),
                ("Dark City", 1998),
                ("Eternal Sunshine of the Spotless Mind", 2004),
            ]
        case ("Science Fiction", "Devotee"):
            return [
                ("Akira", 1988),
                ("Ghost in the Shell", 1995),
                ("Tetsuo: The Iron Man", 1989),
                ("Patlabor 2", 1993),
                ("Paprika", 2006),
                ("Wings of Honneamise", 1987),
                ("The Sky Crawlers", 2008),
                ("Memories", 1995),
                ("Mind Game", 2004),
                ("Belladonna of Sadness", 1973),
            ]
        case ("Science Fiction", "Connoisseur"):
            return [
                ("Solaris", 1972),
                ("Stalker", 1979),
                ("Hard to Be a God", 2013),
                ("Letters from a Dead Man", 1986),
                ("Kin-dza-dza!", 1986),
                ("Aelita: Queen of Mars", 1924),
                ("First on the Moon", 2005),
                ("The Andromeda Strain", 1971),
                ("Phase IV", 1974),
            ]
        case ("Science Fiction", "Deep Cuts"):
            return [
                ("Save the Green Planet!", 2003),
                ("The Host", 2006),
                ("Natural City", 2003),
                ("Doomsday Book", 2012),
                ("La Antena", 2007),
                ("Sleep Dealer", 2008),
                ("Mr. Nobody", 2009),
                ("Kontroll", 2003),
            ]
        case ("Science Fiction", "Specialist"):
            return [
                ("Quatermass and the Pit", 1967),
                ("The Quatermass Xperiment", 1955),
                ("Quatermass 2", 1957),
                ("Village of the Damned", 1960),
                ("Children of the Damned", 1964),
                ("The Damned", 1963),
                ("Seconds", 1966),
                ("Charly", 1968),
            ]
        case ("Science Fiction", "Archivist"):
            return [
                ("A Trip to the Moon", 1902),
                ("The Impossible Voyage", 1904),
                ("20,000 Leagues Under the Sea", 1916),
                ("The Lost World", 1925),
                ("Aelita: Queen of Mars", 1924),
                ("Just Imagine", 1930),
                ("Frankenstein", 1931),
                ("The Invisible Man", 1933),
            ]
        case ("Science Fiction", "Master"):
            return [
                ("Phase IV", 1974),
                ("The Ultimate Warrior", 1975),
                ("Embryo", 1976),
                ("Damnation Alley", 1977),
                ("Capricorn One", 1977),
                ("The Quiet Earth", 1985),
                ("Hardware", 1990),
                ("Last Night", 1998),
            ]

        case ("Noir", "Essential"):
            return [
                ("Double Indemnity", 1944),
                ("The Maltese Falcon", 1941),
                ("Out of the Past", 1947),
                ("Sunset Boulevard", 1950),
                ("The Big Sleep", 1946),
                ("Touch of Evil", 1958),
                ("The Third Man", 1949),
                ("Chinatown", 1974),
                ("Blade Runner", 1982),
                ("L.A. Confidential", 1997),
            ]
        case ("Noir", "Foundational"):
            return [
                ("The Killers", 1946),
                ("Murder, My Sweet", 1944),
                ("Laura", 1944),
                ("Mildred Pierce", 1945),
                ("Gilda", 1946),
                ("The Postman Always Rings Twice", 1946),
                ("Notorious", 1946),
                ("The Lady from Shanghai", 1947),
                ("Force of Evil", 1948),
                ("White Heat", 1949),
                ("Night and the City", 1950),
                ("In a Lonely Place", 1950),
                ("The Asphalt Jungle", 1950),
                ("Strangers on a Train", 1951),
                ("The Big Heat", 1953),
            ]
        case ("Noir", "Classics"):
            return [
                ("Detour", 1945),
                ("Scarlet Street", 1945),
                ("The Woman in the Window", 1944),
                ("The Spiral Staircase", 1946),
                ("Dark Passage", 1947),
                ("Brute Force", 1947),
                ("Body and Soul", 1947),
                ("Crossfire", 1947),
                ("Kiss of Death", 1947),
                ("T-Men", 1947),
                ("Raw Deal", 1948),
                ("He Walked by Night", 1948),
                ("Criss Cross", 1949),
                ("Gun Crazy", 1950),
            ]
        case ("Noir", "Well-Versed"):
            return [
                ("Kiss Me Deadly", 1955),
                ("The Big Combo", 1955),
                ("Sweet Smell of Success", 1957),
                ("Nightmare Alley", 1947),
                ("Pickup on South Street", 1953),
                ("The Hitch-Hiker", 1953),
                ("Angel Face", 1953),
                ("The Prowler", 1951),
                ("Where the Sidewalk Ends", 1950),
                ("The Killing", 1956),
                ("While the City Sleeps", 1956),
                ("Beyond a Reasonable Doubt", 1956),
            ]
        case ("Noir", "Devotee"):
            return [
                ("Chinatown", 1974),
                ("The Long Goodbye", 1973),
                ("Night Moves", 1975),
                ("Farewell, My Lovely", 1975),
                ("The Drowning Pool", 1975),
                ("The Late Show", 1977),
                ("Body Heat", 1981),
                ("Blood Simple", 1984),
                ("Blue Velvet", 1986),
                ("House of Games", 1987),
                ("The Grifters", 1990),
                ("Devil in a Blue Dress", 1995),
            ]
        case ("Noir", "Connoisseur"):
            return [
                ("Le Samouraï", 1967),
                ("Le Cercle Rouge", 1970),
                ("Bob le Flambeur", 1956),
                ("Rififi", 1955),
                ("Touchez Pas au Grisbi", 1954),
                ("Pépé le Moko", 1937),
                ("Quai des Orfèvres", 1947),
                ("Diabolique", 1955),
                ("Elevator to the Gallows", 1958),
                ("Le Trou", 1960),
            ]
        case ("Noir", "Deep Cuts"):
            return [
                ("Phantom Lady", 1944),
                ("Black Angel", 1946),
                ("The Locket", 1946),
                ("The Dark Mirror", 1946),
                ("Whirlpool", 1949),
                ("The Reckless Moment", 1949),
                ("Sudden Fear", 1952),
                ("The Sniper", 1952),
                ("The Window", 1949),
            ]
        case ("Noir", "Specialist"):
            return [
                ("Crime of Passion", 1957),
                ("Pushover", 1954),
                ("Slightly Scarlet", 1956),
                ("Murder by Contract", 1958),
                ("Odds Against Tomorrow", 1959),
                ("Blast of Silence", 1961),
                ("The Naked Kiss", 1964),
                ("Shock Corridor", 1963),
            ]
        case ("Noir", "Archivist"):
            return [
                ("Stray Dog", 1949),
                ("Drunken Angel", 1948),
                ("High and Low", 1963),
                ("Pale Flower", 1964),
                ("Branded to Kill", 1967),
                ("Tokyo Drifter", 1966),
                ("Youth of the Beast", 1963),
                ("I Am Waiting", 1957),
            ]
        case ("Noir", "Master"):
            return [
                ("So Dark the Night", 1946),
                ("The Chase", 1946),
                ("Decoy", 1946),
                ("The Devil Thumbs a Ride", 1947),
                ("Railroaded!", 1947),
                ("Born to Kill", 1947),
                ("Desperate", 1947),
                ("Caged", 1950),
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

    // MARK: - Essentials Cache (Singleton - survives view recreation)

    private static var essentialsCache: [String: [EssentialMovie]] = [:]

    func getCachedMovies(for key: String) -> [EssentialMovie]? {
        return Self.essentialsCache[key]
    }

    func cacheMovies(_ movies: [EssentialMovie], for key: String) {
        Self.essentialsCache[key] = movies
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
