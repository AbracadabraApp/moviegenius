//
//  MainTabView.swift
//  moviegenius
//
//  Main app navigation with 3 tabs: Movies, Search, Genius
//

import SwiftUI
import Combine

// MARK: - Navigation Destination Types

enum MovieDestination: Hashable, Codable {
    case detail(tmdbId: Int)
    case collection(id: String)
    case person(id: Int)
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

    // Track tab selection to detect re-taps
    private var selectedTabBinding: Binding<Int> {
        Binding(
            get: { selectedTab },
            set: { newValue in
                if newValue == selectedTab {
                    // Same tab tapped - pop to root
                    popToRoot(for: newValue)
                }
                selectedTab = newValue
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

            // Search tab
            NavigationStack(path: $searchNavigation.path) {
                SearchView()
                    .navigationDestination(for: MovieDestination.self) { destination in
                        destinationView(for: destination)
                    }
            }
            .tabItem {
                Image(systemName: "magnifyingglass")
                Text("Search")
            }
            .tag(1)

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
            .tag(2)
        }
        .tint(Color.mgGold)
    }

    // MARK: - Helper Methods

    private func popToRoot(for tab: Int) {
        switch tab {
        case 0:
            browseNavigation.path = NavigationPath()
        case 1:
            searchNavigation.path = NavigationPath()
        case 2:
            geniusNavigation.path = NavigationPath()
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
        }
    }
}

#Preview {
    MainTabView()
}
