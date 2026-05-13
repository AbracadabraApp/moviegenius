//
//  moviegeniusApp.swift
//  moviegenius
//
//  Created by Josh Petersen on 5/10/26.
//

import SwiftUI
import FirebaseCore
import FirebaseCrashlytics

@main
struct moviegeniusApp: App {
    init() {
        FirebaseApp.configure()
        configureURLCache()
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
        }
    }

    private func configureURLCache() {
        // Configure global URLCache for AsyncImage poster caching
        // 50 MB memory for quick access to recently viewed posters
        // 200 MB disk for persistent cache across app launches
        let memoryCapacity = 50 * 1024 * 1024
        let diskCapacity = 200 * 1024 * 1024
        URLCache.shared = URLCache(
            memoryCapacity: memoryCapacity,
            diskCapacity: diskCapacity
        )
    }
}
