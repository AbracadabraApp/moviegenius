//
//  MainTabView.swift
//  moviegenius
//
//  Main app navigation with 4 tabs: Movies, Genius, Search, Watchlist
//

import SwiftUI
import Combine

// MARK: - Navigation Destination Types

enum MovieDestination: Hashable, Codable {
    case detail(tmdbId: Int)
    case collection(id: String)
    case person(id: Int)
    case categoryEssentials(category: String, subcategory: String)
    case personsGenius(categoryType: PersonCategoryType)
    case awardsGenius
}

// MARK: - Navigation State Manager

@MainActor
class NavigationStateManager: ObservableObject {
    @Published var path = NavigationPath()
}

// MARK: - Main Tab View

struct MainTabView: View {
    @SceneStorage("selectedTab") private var selectedTab = 0
    @StateObject private var browseNavigation = NavigationStateManager()
    @StateObject private var searchNavigation = NavigationStateManager()
    @StateObject private var geniusNavigation = NavigationStateManager()
    @StateObject private var watchNavigation = NavigationStateManager()
    @StateObject private var searchViewModel = SearchViewModel()

    // Track previous tab to detect repeated taps
    @State private var previousTab = 0

    // Track tab selection - always pop to root when tab is tapped
    private var selectedTabBinding: Binding<Int> {
        Binding(
            get: { selectedTab },
            set: { newValue in
                // If tapping the same tab that's already selected, pop to root
                if newValue == selectedTab {
                    popToRoot(for: newValue)
                    // Special case for Search tab: also clear search text
                    if newValue == 2 {
                        searchViewModel.clearSearch()
                    }
                } else {
                    // Switching to a different tab
                    selectedTab = newValue
                }
                previousTab = selectedTab
            }
        )
    }

    var body: some View {
        TabView(selection: selectedTabBinding) {
            // Movies tab
            NavigationStack(path: $browseNavigation.path) {
                HomeView()
                    .navigationDestination(for: MovieDestination.self) { destination in
                        destinationView(for: destination)
                    }
            }
            .tabItem {
                Label("Movies", systemImage: "film.stack")
            }
            .tag(0)

            // Genius tab
            NavigationStack(path: $geniusNavigation.path) {
                GeniusView()
                    .navigationDestination(for: MovieDestination.self) { destination in
                        destinationView(for: destination)
                    }
            }
            .tabItem {
                Label("Genius", systemImage: "wand.and.stars")
            }
            .tag(1)

            // Search tab
            NavigationStack(path: $searchNavigation.path) {
                SearchView(viewModel: searchViewModel)
                    .navigationDestination(for: MovieDestination.self) { destination in
                        destinationView(for: destination)
                    }
            }
            .tabItem {
                Label("Search", systemImage: "magnifyingglass")
            }
            .tag(2)

            // Watch tab
            NavigationStack(path: $watchNavigation.path) {
                WatchContainerView()
                    .navigationDestination(for: MovieDestination.self) { destination in
                        destinationView(for: destination)
                    }
            }
            .tabItem {
                Label("Watchlist", systemImage: "bookmark.fill")
            }
            .tag(3)
        }
        .tint(Color.mgGold)
    }

    // MARK: - Helper Methods

    private func popToRoot(for tab: Int) {
        switch tab {
        case 0:
            browseNavigation.path = NavigationPath()
        case 1:
            geniusNavigation.path = NavigationPath()
        case 2:
            searchNavigation.path = NavigationPath()
        case 3:
            watchNavigation.path = NavigationPath()
        default:
            break
        }
    }

    @ViewBuilder
    private func destinationView(for destination: MovieDestination) -> some View {
        switch destination {
        case .detail(let tmdbId):
            MovieDetailView(tmdbId: tmdbId)
        case .collection(let id):
            CollectionDetailView(collectionId: id)
        case .person(let id):
            PersonDetailView(personId: id)
        case .categoryEssentials(let category, let subcategory):
            CategoryEssentialsView(category: category, subcategory: subcategory)
        case .personsGenius(let categoryType):
            PersonsGeniusView(categoryType: categoryType)
        case .awardsGenius:
            AwardsGeniusView()
        }
    }
}

#Preview {
    MainTabView()
}
