import SwiftUI

@main
struct BookLibrioApp: App {
    @StateObject private var authManager = AuthManager.shared

    init() {
        // Initialize Sentry for error tracking (must be first)
        SentryManager.initialize()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
        }
    }
}
