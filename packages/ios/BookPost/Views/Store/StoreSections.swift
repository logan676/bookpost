import SwiftUI

// MARK: - Free Books Section

/// Section displaying free ebooks available to all users
struct FreeBooksSection: View {
    let books: [StoreItem]
    var onBookTap: ((StoreItem) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "gift.fill")
                        .foregroundColor(.green)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(L10n.StoreSection.freeBooks)
                            .font(.title2)
                            .fontWeight(.bold)

                        Text(L10n.StoreSection.freeBooksSubtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Button(L10n.Store.more) {
                    onShowAll?()
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            // Books scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(books) { book in
                        FreeBookCard(item: book) {
                            onBookTap?(book)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

/// Card for free book display with "FREE" badge
struct FreeBookCard: View {
    let item: StoreItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                ZStack(alignment: .topLeading) {
                    BookCoverView(coverUrl: item.coverUrl, title: item.title)
                        .frame(width: 100, height: 140)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(radius: 2)

                    // Free badge
                    Text(L10n.StoreSection.free)
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green)
                        .cornerRadius(4)
                        .padding(4)
                }

                Text(item.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .lineLimit(2)
            }
            .frame(width: 100)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Member Exclusive Section

/// Section displaying member-only content with premium styling
struct MemberExclusiveSection: View {
    let books: [StoreItem]
    var onBookTap: ((StoreItem) -> Void)?
    var onShowAll: (() -> Void)?
    var onUpgrade: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with gradient background
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "crown.fill")
                        .foregroundColor(.yellow)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(L10n.StoreSection.memberExclusive)
                            .font(.title2)
                            .fontWeight(.bold)

                        Text(L10n.StoreSection.memberExclusiveSubtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Button(L10n.Store.more) {
                    onShowAll?()
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            // Books scroll with premium styling
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(books) { book in
                        MemberBookCard(item: book) {
                            onBookTap?(book)
                        }
                    }

                    // Upgrade CTA card
                    if onUpgrade != nil {
                        upgradeCard
                    }
                }
                .padding(.horizontal)
            }
        }
        .padding(.vertical, 16)
        .background(
            LinearGradient(
                colors: [Color.purple.opacity(0.05), Color.blue.opacity(0.05)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
    }

    private var upgradeCard: some View {
        Button(action: { onUpgrade?() }) {
            VStack(spacing: 12) {
                Image(systemName: "sparkles")
                    .font(.title)
                    .foregroundColor(.purple)

                Text(L10n.StoreSection.unlockAll)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)

                Text(L10n.StoreSection.becomeMember)
                    .font(.caption2)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        LinearGradient(
                            colors: [.purple, .blue],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(12)
            }
            .frame(width: 100, height: 180)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .purple.opacity(0.2), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
    }
}

/// Card for member-exclusive book with crown badge
struct MemberBookCard: View {
    let item: StoreItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                ZStack(alignment: .topTrailing) {
                    BookCoverView(coverUrl: item.coverUrl, title: item.title)
                        .frame(width: 100, height: 140)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(radius: 2)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(
                                    LinearGradient(
                                        colors: [.purple, .blue],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 2
                                )
                        )

                    // Crown badge
                    Image(systemName: "crown.fill")
                        .font(.caption)
                        .foregroundColor(.yellow)
                        .padding(6)
                        .background(Color.purple)
                        .clipShape(Circle())
                        .offset(x: 4, y: -4)
                }

                Text(item.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .lineLimit(2)
            }
            .frame(width: 100)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Daily Book Lists Section

/// Section showing curated daily book lists with date display
struct DailyBookListsSection: View {
    let lists: [DailyBookList]
    var onListTap: ((DailyBookList) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(L10n.StoreSection.dailyLists)
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(L10n.StoreSection.dailyListsSubtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(L10n.Store.more) {
                    onShowAll?()
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            // Lists scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(lists) { list in
                        DailyListCard(list: list) {
                            onListTap?(list)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

/// Card for daily book list with calendar date display
struct DailyListCard: View {
    let list: DailyBookList
    let action: () -> Void

    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: list.date)
    }

    private var monthAbbr: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M月"
        return formatter.string(from: list.date)
    }

    private var weekday: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        formatter.locale = Locale(identifier: "zh_CN")
        return formatter.string(from: list.date)
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 0) {
                // Date header
                VStack(spacing: 2) {
                    Text(monthAbbr)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.8))

                    Text(dayNumber)
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text(weekday)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.8))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(list.themeColor)

                // Content
                VStack(alignment: .leading, spacing: 8) {
                    Text(list.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    Text(list.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)

                    HStack {
                        Image(systemName: "book.closed.fill")
                            .font(.caption2)
                        Text(L10n.StoreSection.booksInList(list.bookCount))
                            .font(.caption2)
                    }
                    .foregroundColor(.secondary)

                    // Book covers preview
                    HStack(spacing: -12) {
                        ForEach(list.previewCovers.prefix(3), id: \.self) { coverUrl in
                            AsyncImage(url: URL(string: coverUrl)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                            }
                            .frame(width: 36, height: 50)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(Color.white, lineWidth: 2)
                            )
                        }

                        if list.bookCount > 3 {
                            ZStack {
                                Circle()
                                    .fill(Color(.systemGray5))
                                    .frame(width: 36, height: 36)

                                Text("+\(list.bookCount - 3)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
            }
            .frame(width: 200)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.08), radius: 6, x: 0, y: 3)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Recommendations Section with Refresh

/// Enhanced recommendations section with refresh button
struct RecommendationsSection: View {
    let books: [StoreItem]
    let isRefreshing: Bool
    var onBookTap: ((StoreItem) -> Void)?
    var onRefresh: (() -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with refresh button
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(L10n.Store.recommendedForYou)
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(L10n.StoreSection.basedOnPreferences)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Refresh button
                Button(action: { onRefresh?() }) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.clockwise")
                            .rotationEffect(.degrees(isRefreshing ? 360 : 0))
                            .animation(
                                isRefreshing
                                    ? Animation.linear(duration: 1).repeatForever(autoreverses: false)
                                    : .default,
                                value: isRefreshing
                            )

                        Text(L10n.StoreSection.refresh)
                    }
                    .font(.subheadline)
                    .foregroundColor(.blue)
                }
                .disabled(isRefreshing)
            }
            .padding(.horizontal)

            // Featured carousel
            TabView {
                ForEach(books) { item in
                    FeaturedBookCard(item: item) {
                        onBookTap?(item)
                    }
                    .padding(.horizontal)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .automatic))
            .frame(height: 200)
        }
    }
}

// MARK: - Quick Preview Card

/// A preview card shown on long-press of book cover
struct QuickPreviewCard: View {
    let item: StoreItem
    let rating: Double
    let ratingCount: Int
    let description: String
    var onStartReading: (() -> Void)?
    var onAddToBookshelf: (() -> Void)?
    var onDismiss: (() -> Void)?

    @State private var offset: CGFloat = 0
    @GestureState private var dragOffset: CGFloat = 0

    var body: some View {
        ZStack {
            // Dimmed background
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss?()
                }

            // Card content
            VStack(spacing: 0) {
                // Drag handle
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(.systemGray4))
                    .frame(width: 36, height: 4)
                    .padding(.top, 8)

                HStack(alignment: .top, spacing: 16) {
                    // Large cover
                    BookCoverView(coverUrl: item.coverUrl, title: item.title)
                        .frame(width: 140, height: 200)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)

                    // Info
                    VStack(alignment: .leading, spacing: 12) {
                        Text(item.title)
                            .font(.title3)
                            .fontWeight(.bold)
                            .lineLimit(2)

                        if let subtitle = item.subtitle {
                            Text(subtitle)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }

                        // Rating
                        HStack(spacing: 4) {
                            ForEach(0..<5) { index in
                                Image(systemName: index < Int(rating) ? "star.fill" : "star")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                            }
                            Text(String(format: "%.1f", rating))
                                .font(.caption)
                                .fontWeight(.medium)
                            Text("(\(ratingCount))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        // Badge
                        if let badge = item.badge {
                            Text(badge)
                                .font(.caption2)
                                .fontWeight(.medium)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue.opacity(0.1))
                                .foregroundColor(.blue)
                                .cornerRadius(4)
                        }

                        Spacer()
                    }
                }
                .padding(16)

                // Description
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
                    .padding(.horizontal, 16)

                // Action buttons
                HStack(spacing: 12) {
                    Button(action: { onAddToBookshelf?() }) {
                        Label(L10n.StoreSection.addToShelf, systemImage: "plus")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color(.systemGray5))
                            .foregroundColor(.primary)
                            .cornerRadius(10)
                    }

                    Button(action: { onStartReading?() }) {
                        Label(L10n.StoreSection.startReading, systemImage: "book.fill")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                }
                .padding(16)
            }
            .background(Color(.systemBackground))
            .cornerRadius(20, corners: [.topLeft, .topRight])
            .offset(y: max(0, offset + dragOffset))
            .gesture(
                DragGesture()
                    .updating($dragOffset) { value, state, _ in
                        if value.translation.height > 0 {
                            state = value.translation.height
                        }
                    }
                    .onEnded { value in
                        if value.translation.height > 100 {
                            onDismiss?()
                        }
                    }
            )
            .frame(maxHeight: .infinity, alignment: .bottom)
        }
        .transition(.move(edge: .bottom))
    }
}

// MARK: - Daily Book List Model

struct DailyBookList: Identifiable {
    let id: Int
    let date: Date
    let title: String
    let description: String
    let bookCount: Int
    let previewCovers: [String]
    let themeColor: Color

    static var samples: [DailyBookList] {
        [
            DailyBookList(
                id: 1,
                date: Date(),
                title: "今日必读",
                description: "编辑精选的今日推荐书单",
                bookCount: 8,
                previewCovers: [],
                themeColor: .blue
            ),
            DailyBookList(
                id: 2,
                date: Date().addingTimeInterval(-86400),
                title: "经典文学",
                description: "永恒的文学经典作品",
                bookCount: 12,
                previewCovers: [],
                themeColor: .purple
            ),
            DailyBookList(
                id: 3,
                date: Date().addingTimeInterval(-86400 * 2),
                title: "科技前沿",
                description: "探索科技的未来",
                bookCount: 6,
                previewCovers: [],
                themeColor: .green
            )
        ]
    }
}

// MARK: - Corner Radius Extension

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Previews

#Preview("Free Books") {
    FreeBooksSection(books: [])
}

#Preview("Member Exclusive") {
    MemberExclusiveSection(books: [])
}

#Preview("Daily Lists") {
    DailyBookListsSection(lists: DailyBookList.samples)
}
