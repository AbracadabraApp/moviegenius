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
        #if DEBUG
        print("🔥 [Firebase] Starting configuration...")

        // Check if GoogleService-Info.plist exists
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
            print("✅ [Firebase] Found GoogleService-Info.plist at: \(path)")
        } else {
            print("❌ [Firebase] GoogleService-Info.plist NOT FOUND")
        }
        #endif

        FirebaseApp.configure()

        #if DEBUG
        print("✅ [Firebase] Configuration completed")
        print("📊 [Crashlytics] Crashlytics enabled")
        #endif

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
