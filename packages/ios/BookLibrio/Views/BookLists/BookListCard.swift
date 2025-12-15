/**
 * Book List Card Component
 * Displays a book list preview with cover grid, title, and metadata
 */

import SwiftUI

/// Card style for book list display
enum BookListCardStyle {
    case compact      // Horizontal strip with small covers
    case standard     // Standard card with 2x2 grid
    case large        // Large card for featured lists
}

struct BookListCard: View {
    let list: BookList
    var style: BookListCardStyle = .standard
    var onTap: (() -> Void)?

    var body: some View {
        Button {
            onTap?()
        } label: {
            content
        }
        .buttonStyle(PlainButtonStyle())
    }

    @ViewBuilder
    private var content: some View {
        switch style {
        case .compact:
            compactLayout
        case .standard:
            standardLayout
        case .large:
            largeLayout
        }
    }

    // MARK: - Compact Layout (horizontal strip)

    private var compactLayout: some View {
        HStack(spacing: 12) {
            // Preview covers (horizontal strip)
            coverStrip
                .frame(width: 100, height: 60)

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(list.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Label("\(list.itemCount)", systemImage: "book.closed")
                    Label(list.formattedFollowerCount, systemImage: "person.2")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
    }

    // MARK: - Standard Layout (2x2 grid)

    private var standardLayout: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 2x2 Cover grid
            coverGrid
                .frame(height: 140)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            // Title and description
            VStack(alignment: .leading, spacing: 4) {
                Text(list.title)
                    .font(.headline)
                    .foregroundColor(.primary)
                    .lineLimit(2)

                if let description = list.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }

            // Creator and stats
            HStack {
                creatorInfo
                Spacer()
                statsRow
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Large Layout (featured lists)

    private var largeLayout: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Large cover grid
            coverGrid
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 16))

            VStack(alignment: .leading, spacing: 8) {
                // Title
                Text(list.title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                    .lineLimit(2)

                // Description
                if let description = list.description, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(3)
                }

                // Creator and stats
                HStack {
                    creatorInfo
                    Spacer()
                    statsRow
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .shadow(color: .black.opacity(0.1), radius: 12, x: 0, y: 4)
    }

    // MARK: - Subviews

    /// 2x2 grid of book covers
    private var coverGrid: some View {
        let previewBooks = list.previewBooks
        let colors: [Color] = [.blue.opacity(0.1), .green.opacity(0.1), .orange.opacity(0.1), .purple.opacity(0.1)]

        return GeometryReader { geometry in
            let spacing: CGFloat = 4
            let itemWidth = (geometry.size.width - spacing) / 2
            let itemHeight = (geometry.size.height - spacing) / 2

            LazyVGrid(columns: [
                GridItem(.fixed(itemWidth), spacing: spacing),
                GridItem(.fixed(itemWidth), spacing: spacing)
            ], spacing: spacing) {
                ForEach(0..<4, id: \.self) { index in
                    if index < previewBooks.count, let book = previewBooks[index].book {
                        BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
                            .frame(width: itemWidth, height: itemHeight)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    } else {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(colors[index % colors.count])
                            .frame(width: itemWidth, height: itemHeight)
                            .overlay(
                                Image(systemName: "book.closed")
                                    .font(.title2)
                                    .foregroundColor(colors[index % colors.count].opacity(0.5))
                            )
                    }
                }
            }
        }
    }

    /// Horizontal strip of book covers for compact layout
    private var coverStrip: some View {
        let previewBooks = list.previewBooks

        return GeometryReader { geometry in
            let spacing: CGFloat = 2
            let availableWidth = geometry.size.width
            let coverCount = min(previewBooks.count, 3)
            let coverWidth = (availableWidth - CGFloat(coverCount - 1) * spacing) / CGFloat(max(coverCount, 1))

            HStack(spacing: spacing) {
                ForEach(0..<coverCount, id: \.self) { index in
                    if let book = previewBooks[index].book {
                        BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
                            .frame(width: coverWidth, height: geometry.size.height)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }

                // Fill remaining space if fewer than 3 books
                if coverCount < 3 {
                    ForEach(coverCount..<3, id: \.self) { index in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(.systemGray5))
                            .frame(width: coverWidth, height: geometry.size.height)
                    }
                }
            }
        }
    }

    /// Creator avatar and name
    private var creatorInfo: some View {
        HStack(spacing: 6) {
            if let creator = list.creator {
                // Avatar
                AsyncImage(url: URL(string: creator.avatar ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(.systemGray4))
                        .overlay(
                            Text(String(creator.username.prefix(1)).uppercased())
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        )
                }
                .frame(width: 24, height: 24)
                .clipShape(Circle())

                Text(creator.username)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
    }

    /// Stats row (book count, follower count)
    private var statsRow: some View {
        HStack(spacing: 12) {
            Label("\(list.itemCount)", systemImage: "book.closed")
            Label(list.formattedFollowerCount, systemImage: "person.2")
        }
        .font(.caption)
        .foregroundColor(.secondary)
    }
}

// MARK: - Book List Row (for list views)

/// Simple row for book list in lists
struct BookListRow: View {
    let list: BookList
    var showFollowButton: Bool = false
    var isFollowing: Bool = false
    var onFollow: (() -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            // Mini cover grid
            miniCoverGrid
                .frame(width: 60, height: 60)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(list.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                if let creator = list.creator {
                    Text(creator.username)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                HStack(spacing: 8) {
                    Label("\(list.itemCount)", systemImage: "book.closed")
                    Label(list.formattedFollowerCount, systemImage: "person.2")
                }
                .font(.caption2)
                .foregroundColor(.secondary)
            }

            Spacer()

            if showFollowButton {
                Button {
                    onFollow?()
                } label: {
                    Text(isFollowing ? L10n.BookList.following : L10n.BookList.follow)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(isFollowing ? .secondary : .white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(isFollowing ? Color(.systemGray5) : Color.accentColor)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var miniCoverGrid: some View {
        let previewBooks = list.previewBooks
        let colors: [Color] = [.blue.opacity(0.15), .green.opacity(0.15), .orange.opacity(0.15), .purple.opacity(0.15)]

        return GeometryReader { geometry in
            let spacing: CGFloat = 2
            let itemSize = (geometry.size.width - spacing) / 2

            LazyVGrid(columns: [
                GridItem(.fixed(itemSize), spacing: spacing),
                GridItem(.fixed(itemSize), spacing: spacing)
            ], spacing: spacing) {
                ForEach(0..<4, id: \.self) { index in
                    if index < previewBooks.count, let book = previewBooks[index].book {
                        BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
                            .frame(width: itemSize, height: itemSize)
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                    } else {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(colors[index % colors.count])
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("Standard Card") {
    ScrollView {
        VStack(spacing: 16) {
            BookListCard(
                list: BookList(
                    id: 1,
                    title: "2024 年度最佳科幻小说",
                    description: "精选今年最值得一读的科幻作品，包含硬科幻、软科幻、太空歌剧等多个子类型。",
                    coverUrl: nil,
                    creatorId: 1,
                    creator: BookListCreator(id: 1, username: "读书达人", avatar: nil),
                    isPublic: true,
                    itemCount: 25,
                    followerCount: 1234,
                    isFollowing: false,
                    category: "science",
                    tags: ["科幻", "2024"],
                    items: [],
                    createdAt: nil,
                    updatedAt: nil
                ),
                style: .standard
            )
        }
        .padding()
    }
    .background(Color(.systemGroupedBackground))
}

#Preview("Compact Card") {
    List {
        BookListCard(
            list: BookList(
                id: 1,
                title: "经典文学入门书单",
                description: nil,
                coverUrl: nil,
                creatorId: 1,
                creator: BookListCreator(id: 1, username: "文学爱好者", avatar: nil),
                isPublic: true,
                itemCount: 15,
                followerCount: 567,
                isFollowing: true,
                category: "literature",
                tags: nil,
                items: [],
                createdAt: nil,
                updatedAt: nil
            ),
            style: .compact
        )
    }
    .listStyle(.plain)
}
