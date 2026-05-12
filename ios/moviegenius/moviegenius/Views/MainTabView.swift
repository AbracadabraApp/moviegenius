//
//  MainTabView.swift
//  moviegenius
//
//  Main app navigation with 3 tabs: Browse, Genius, You
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
    @StateObject private var geniusNavigation = NavigationStateManager()

    var body: some View {
        TabView(selection: $selectedTab) {
            // Browse tab
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

            // You tab - already has its own NavigationStack internally
            YouView()
                .tabItem {
                    Label("You", systemImage: "person.fill")
                }
                .tag(2)
        }
        .tint(Color.mgGold)
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
