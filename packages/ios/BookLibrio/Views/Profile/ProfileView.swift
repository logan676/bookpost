import SwiftUI
import PhotosUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutAlert = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploadingAvatar = false
    @State private var showAvatarError = false
    @State private var avatarErrorMessage = ""

    var body: some View {
        NavigationStack {
            List {
                // User info section
                Section {
                    HStack(spacing: 16) {
                        // Avatar with photo picker
                        PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                            UserAvatarView(
                                avatarUrl: authManager.currentUser?.avatar,
                                size: 70,
                                showEditBadge: true
                            )
                            .overlay {
                                if isUploadingAvatar {
                                    Circle()
                                        .fill(Color.black.opacity(0.5))
                                        .frame(width: 70, height: 70)
                                    ProgressView()
                                        .tint(.white)
                                }
                            }
                        }
                        .buttonStyle(.plain)

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
                .onChange(of: selectedPhotoItem) { _, newValue in
                    Task {
                        await handleAvatarSelection(newValue)
                    }
                }

                // Menu section
                Section {
                    NavigationLink(destination: NotesListView()) {
                        Label(L10n.Profile.readingNotes, systemImage: "doc.text")
                    }

                    NavigationLink(destination: StreakView()) {
                        Label(L10n.Profile.readingStreak, systemImage: "flame.fill")
                    }

                    NavigationLink(destination: LeaderboardView()) {
                        Label(L10n.Profile.leaderboard, systemImage: "trophy")
                    }

                    NavigationLink(destination: BadgesView()) {
                        Label(L10n.Profile.myBadges, systemImage: "medal")
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
            .alert("头像更新失败", isPresented: $showAvatarError) {
                Button("确定", role: .cancel) {}
            } message: {
                Text(avatarErrorMessage)
            }
        }
    }

    // MARK: - Avatar Upload

    private func handleAvatarSelection(_ item: PhotosPickerItem?) async {
        guard let item = item else { return }

        isUploadingAvatar = true
        defer { isUploadingAvatar = false }

        do {
            // Load image data from selected photo
            guard let data = try await item.loadTransferable(type: Data.self) else {
                throw AvatarError.loadFailed
            }

            // Validate image size (max 5MB)
            guard data.count <= 5 * 1024 * 1024 else {
                throw AvatarError.tooLarge
            }

            // Upload to server
            let avatarUrl = try await APIClient.shared.uploadAvatar(imageData: data)

            // Update local user data
            await MainActor.run {
                authManager.updateUserAvatar(avatarUrl)
            }
        } catch let error as AvatarError {
            avatarErrorMessage = error.localizedDescription
            showAvatarError = true
        } catch {
            avatarErrorMessage = "上传失败，请稍后重试"
            showAvatarError = true
        }

        // Clear selection
        selectedPhotoItem = nil
    }
}

// MARK: - Avatar Error

enum AvatarError: LocalizedError {
    case loadFailed
    case tooLarge
    case uploadFailed

    var errorDescription: String? {
        switch self {
        case .loadFailed:
            return "无法加载所选图片"
        case .tooLarge:
            return "图片大小不能超过5MB"
        case .uploadFailed:
            return "上传失败，请稍后重试"
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager.shared)
}
