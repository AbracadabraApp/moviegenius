//
//  GeniusView.swift
//  moviegenius
//
//  Your cinematic journey with personalized insights and collections
//

import SwiftUI

struct GeniusView: View {
    @ObservedObject var favorites = FavoritesManager.shared
    @State private var activeTab: GeniusTab = .journey
    @State private var searchText = ""

    enum GeniusTab: String, CaseIterable {
        case journey = "Journey"
        case loved = "Loved"
        case queue = "Queue"

        var icon: String {
            switch self {
            case .journey: return "eye"
            case .loved: return "heart.fill"
            case .queue: return "bookmark.fill"
            }
        }
    }

    var journeyStage: (icon: String, title: String, description: String, insight: String?) {
        let totalFilms = favorites.lovedMovies.count

        if totalFilms == 0 {
            return ("🎬", "Your Cinematic Journey Begins", "Start building your film collection", nil)
        } else if totalFilms <= 5 {
            return ("🌱", "Building Your Foundation", "\(totalFilms) \(totalFilms == 1 ? "film" : "films") loved", "Every film you love teaches us about your taste")
        } else if totalFilms <= 15 {
            return ("🔍", "Patterns Emerging", "\(totalFilms) films • Taste developing", "Your collection reveals emerging patterns in your cinematic preferences")
        } else {
            return ("🎭", "Cinematic Understanding", "\(totalFilms) films • Strong profile", "Your sophisticated collection spans genres, eras, and storytelling traditions")
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
                        onTabSwitch: { tab in
                            withAnimation {
                                activeTab = tab
                            }
                        }
                    )
                case .loved:
                    LovedTabContent(movies: favorites.lovedMovies)
                case .queue:
                    QueueTabContent(movies: favorites.queueMovies)
                }
            }
            .scrollIndicators(.hidden)
        }
        .background(Color.mgGroupedBackground)
        .navigationTitle("Genius")
        .navigationBarTitleDisplayMode(.large)
        .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search movies")
        .onAppear {
            favorites.loadFavorites()
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
                        .foregroundStyle(isActive ? .black : Color.mgSecondary)
                        .clipShape(Capsule())
                }
            }
            .foregroundStyle(isActive ? Color.mgGold : Color.mgSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, .mgSpacing8)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Journey Tab

struct JourneyTabContent: View {
    let stage: (icon: String, title: String, description: String, insight: String?)
    let lovedCount: Int
    let queueCount: Int
    let onTabSwitch: (GeniusView.GeniusTab) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing24) {
            // Progress Card
            VStack(alignment: .leading, spacing: .mgSpacing12) {
                HStack(alignment: .top, spacing: .mgSpacing16) {
                    Text(stage.icon)
                        .font(.system(size: 48))

                    VStack(alignment: .leading, spacing: .mgSpacing4) {
                        Text(stage.title)
                            .font(.mgTitle3)
                            .foregroundStyle(Color.mgPrimary)

                        Text(stage.description)
                            .font(.mgSubheadline)
                            .foregroundStyle(Color.mgSecondary)
                    }
                }

                if let insight = stage.insight {
                    HStack(spacing: .mgSpacing8) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.mgGold)

                        Text(insight)
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgSecondary)
                    }
                    .padding(.mgSpacing12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.mgGold.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: .mgCornerSmall))
                }
            }
            .padding(.mgSpacing16)
            .mgProminentCard()
            .padding(.horizontal, .mgSpacing16)
            .padding(.top, .mgSpacing16)

            // Stats Grid
            HStack(spacing: .mgSpacing12) {
                StatsCard(icon: "heart.fill", color: .red, count: lovedCount, label: "Films Loved")
                StatsCard(icon: "bookmark.fill", color: .blue, count: queueCount, label: "In Queue")
                StatsCard(icon: "eye", color: .gray, count: lovedCount + queueCount, label: "Total")
            }
            .padding(.horizontal, .mgSpacing16)

            // What We're Learning
            if lovedCount > 0 {
                VStack(alignment: .leading, spacing: .mgSpacing12) {
                    Text("What We're Learning")
                        .font(.mgTitle3)
                        .foregroundStyle(Color.mgPrimary)
                        .padding(.horizontal, .mgSpacing16)

                    VStack(alignment: .leading, spacing: .mgSpacing8) {
                        Text(learningText)
                            .font(.mgBody)
                            .foregroundStyle(Color.mgPrimary)
                            .lineSpacing(4)

                        Text(learningNote)
                            .font(.mgCaption)
                            .foregroundStyle(Color.mgSecondary)
                            .padding(.horizontal, .mgSpacing12)
                            .padding(.vertical, .mgSpacing6)
                            .background(Color.mgSecondary.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: .mgCornerTiny))
                    }
                    .padding(.mgSpacing16)
                    .mgCard()
                    .padding(.horizontal, .mgSpacing16)
                }
            }

            // Learning Opportunities
            if lovedCount >= 3 {
                VStack(alignment: .leading, spacing: .mgSpacing12) {
                    LearningCard(
                        icon: "book.fill",
                        iconColor: Color.mgGold,
                        title: "Essential Films",
                        description: "Explore curated collections on the Browse page to discover new films that match your taste",
                        buttonText: "Explore Collections",
                        action: { /* Navigate to Browse */ }
                    )

                    if queueCount > 0 {
                        LearningCard(
                            icon: "sparkles",
                            iconColor: Color.mgGold,
                            title: "Your Queue",
                            description: "You have \(queueCount) \(queueCount == 1 ? "film" : "films") waiting to watch. Start with your earliest bookmarks for a natural progression.",
                            buttonText: "View Queue",
                            action: { onTabSwitch(.queue) }
                        )
                    }
                }
                .padding(.horizontal, .mgSpacing16)
            }

            Spacer(minLength: .mgSpacing40)
        }
        .padding(.bottom, .mgSpacing40)
    }

    private var learningText: String {
        if lovedCount <= 5 {
            return "Based on your early selections, we're starting to see patterns in your taste. Keep exploring to help us understand what resonates with you."
        } else if lovedCount <= 15 {
            return "With your viewing history, we can identify themes you gravitate toward. Your collection shows developing sophistication and range."
        } else {
            return "Your film collection reveals sophisticated taste patterns across genres and eras. We have a strong understanding of your cinematic preferences."
        }
    }

    private var learningNote: String {
        if lovedCount <= 5 {
            return "Love more films for deeper insights"
        } else if lovedCount <= 15 {
            return "Pattern recognition developing"
        } else {
            return "Strong taste profile established"
        }
    }
}

// MARK: - Stats Card

struct StatsCard: View {
    let icon: String
    let color: Color
    let count: Int
    let label: String

    var body: some View {
        VStack(spacing: .mgSpacing8) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(color)

            VStack(spacing: .mgSpacing2) {
                Text("\(count)")
                    .font(.mgTitle3)
                    .foregroundStyle(Color.mgPrimary)

                Text(label)
                    .font(.mgCaption2)
                    .foregroundStyle(Color.mgSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, .mgSpacing16)
        .mgCard()
    }
}

// MARK: - Learning Card

struct LearningCard: View {
    let icon: String
    let iconColor: Color
    let title: String
    let description: String
    let buttonText: String
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: .mgSpacing12) {
            HStack(spacing: .mgSpacing8) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(iconColor)

                Text(title)
                    .font(.mgHeadline)
                    .foregroundStyle(Color.mgPrimary)
            }

            Text(description)
                .font(.mgSubheadline)
                .foregroundStyle(Color.mgSecondary)
                .lineSpacing(2)

            Button(action: action) {
                HStack(spacing: .mgSpacing6) {
                    Text(buttonText)
                        .font(.mgSubheadline.weight(.medium))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundStyle(Color.mgGold)
            }
            .buttonStyle(.plain)
        }
        .padding(.mgSpacing16)
        .mgCard()
    }
}

// MARK: - Loved Tab

struct LovedTabContent: View {
    let movies: [SavedMovie]

    var body: some View {
        if movies.isEmpty {
            EmptyStateView(
                icon: "heart",
                title: "No Loved Films Yet",
                description: "Search for films and tap the heart ❤️ to mark films you love"
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
                description: "Search for films and tap the bookmark 🔖 to save films to watch later"
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
        .buttonStyle(.plain)
    }

    private var posterURL: URL? {
        guard let posterUrl = movie.posterUrl else { return nil }
        return URL(string: posterUrl)
    }
}

#Preview {
    GeniusView()
}
