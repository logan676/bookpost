import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutAlert = false

    var body: some View {
        NavigationStack {
            List {
                // User info section
                Section {
                    HStack(spacing: 16) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(authManager.currentUser?.username ?? L10n.Common.user)
                                .font(.title2)
                                .fontWeight(.semibold)

                            Text(authManager.currentUser?.email ?? "")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // Menu section
                Section {
                    NavigationLink(destination: MyBookshelfView()) {
                        Label("我的书架", systemImage: "books.vertical")
                    }

                    NavigationLink(destination: ActivityFeedView()) {
                        Label("动态", systemImage: "bubble.left.and.bubble.right")
                    }

                    NavigationLink(destination: LeaderboardView()) {
                        Label("阅读排行榜", systemImage: "trophy")
                    }

                    NavigationLink(destination: BadgesView()) {
                        Label("我的徽章", systemImage: "medal")
                    }

                    NavigationLink(destination: Text(L10n.Profile.readingHistory)) {
                        Label(L10n.Profile.readingHistory, systemImage: "clock")
                    }

                    NavigationLink(destination: Text(L10n.Profile.settings)) {
                        Label(L10n.Profile.settings, systemImage: "gear")
                    }
                }

                // Logout section
                Section {
                    Button(role: .destructive) {
                        showLogoutAlert = true
                    } label: {
                        Label(L10n.Auth.logout, systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle(L10n.Profile.title)
            .alert(L10n.Auth.logoutConfirm, isPresented: $showLogoutAlert) {
                Button(L10n.Common.cancel, role: .cancel) {}
                Button(L10n.Common.confirm, role: .destructive) {
                    authManager.logout()
                }
            } message: {
                Text(L10n.Auth.logoutMessage)
            }
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager.shared)
}
