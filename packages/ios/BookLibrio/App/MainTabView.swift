import SwiftUI

/// Main tab view - 3-tab structure:
/// Bookshelf | Store | Profile
/// Note: Store contains two separate sections - Ebooks and Magazines - they are NEVER mixed
/// Note: Reading tab removed - recent reading moved to Bookshelf
/// Note: Friends tab temporarily removed - FriendsTabView.swift kept for future use
struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Bookshelf - Personal library with recent reading
            NavigationStack {
                MyBookshelfView()
            }
            .tabItem {
                Label(L10n.Tab.bookshelf, systemImage: "books.vertical")
            }
            .tag(0)

            // Tab 2: Store - Separate tabs for ebooks and magazines
            StoreTabView()
                .tabItem {
                    Label(L10n.Store.title, systemImage: "storefront")
                }
                .tag(1)

            // Tab 3: Profile - User profile and settings
            ProfileView()
                .tabItem {
                    Label(L10n.Tab.profile, systemImage: "person")
                }
                .tag(2)
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthManager.shared)
}
