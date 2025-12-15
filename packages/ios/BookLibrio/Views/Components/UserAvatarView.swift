import SwiftUI

/// Reusable user avatar component with product-themed default avatar
/// Displays user's custom avatar or a book-themed default avatar
struct UserAvatarView: View {
    let avatarUrl: String?
    let size: CGFloat
    var showEditBadge: Bool = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if let avatarUrl = avatarUrl, !avatarUrl.isEmpty, let url = URL(string: avatarUrl) {
                // User's custom avatar
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure, .empty:
                        defaultAvatar
                    @unknown default:
                        defaultAvatar
                    }
                }
                .frame(width: size, height: size)
                .clipShape(Circle())
            } else {
                // Default book-themed avatar
                defaultAvatar
            }

            // Edit badge overlay
            if showEditBadge {
                editBadge
            }
        }
    }

    // MARK: - Default Avatar (Book-themed)

    private var defaultAvatar: some View {
        ZStack {
            // Background gradient with warm book colors
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.96, green: 0.87, blue: 0.70),  // Warm cream/paper color
                            Color(red: 0.85, green: 0.65, blue: 0.45)   // Warm brown/leather color
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)

            // Book icon - product related
            Image(systemName: "book.fill")
                .font(.system(size: size * 0.45, weight: .medium))
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            Color(red: 0.55, green: 0.35, blue: 0.20),  // Dark brown
                            Color(red: 0.40, green: 0.25, blue: 0.15)   // Darker brown
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(
            Circle()
                .stroke(Color(red: 0.75, green: 0.55, blue: 0.35).opacity(0.3), lineWidth: size * 0.03)
        )
    }

    // MARK: - Edit Badge

    private var editBadge: some View {
        ZStack {
            Circle()
                .fill(Color.blue)
                .frame(width: size * 0.3, height: size * 0.3)

            Image(systemName: "camera.fill")
                .font(.system(size: size * 0.14))
                .foregroundColor(.white)
        }
        .offset(x: size * 0.02, y: size * 0.02)
    }
}

// MARK: - Preview

#Preview("Default Avatar") {
    VStack(spacing: 20) {
        UserAvatarView(avatarUrl: nil, size: 100)
        UserAvatarView(avatarUrl: nil, size: 60)
        UserAvatarView(avatarUrl: nil, size: 40)
    }
}

#Preview("With Edit Badge") {
    UserAvatarView(avatarUrl: nil, size: 100, showEditBadge: true)
}
