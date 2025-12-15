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
                            AsyncImage(url: URL(string: coverUrl)) { phase in
                                switch phase {
                                case .empty:
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.2))
                                        .frame(width: 36, height: 50)
                                case .success(let image):
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 36, height: 50)
                                        .clipped()
                                case .failure:
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.2))
                                        .frame(width: 36, height: 50)
                                @unknown default:
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.2))
                                        .frame(width: 36, height: 50)
                                }
                            }
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

// MARK: - Recommended Covers Section (Covers Only)

/// Section displaying recommended books as covers only without text
struct RecommendedCoversSection: View {
    let books: [StoreItem]
    var onBookTap: ((StoreItem) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(L10n.Store.recommendedForYou)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal)

            // Covers-only horizontal scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(books) { book in
                        Button {
                            onBookTap?(book)
                        } label: {
                            BookCoverView(coverUrl: book.coverUrl, title: book.title)
                                .frame(width: 100, height: 150)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .shadow(radius: 2)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Mixed Year Books Section

/// Section displaying books from mixed years with year badge overlay
struct MixedYearBooksSection: View {
    let books: [BookByYear]
    var onBookTap: ((BookByYear) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(L10n.Store.booksByYear)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal)

            // Mixed books horizontal scroll with year badges
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(books) { book in
                        MixedYearBookCard(book: book) {
                            onBookTap?(book)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

/// Card for mixed year book with year badge overlay
struct MixedYearBookCard: View {
    let book: BookByYear
    let action: () -> Void

    private var yearString: String {
        if let dateString = book.publicationDate {
            // Extract year from date string (e.g., "2023-05-15" -> "2023")
            let year = dateString.prefix(4)
            return String(year)
        }
        return ""
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                ZStack(alignment: .bottomTrailing) {
                    BookCoverView(coverUrl: book.coverUrl, title: book.title)
                        .frame(width: 100, height: 150)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(radius: 2)

                    // Year badge overlay
                    if !yearString.isEmpty {
                        Text(yearString)
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.black.opacity(0.7))
                            .cornerRadius(4)
                            .padding(4)
                    }
                }

                // Fixed height text area for consistent card heights
                VStack(alignment: .leading, spacing: 4) {
                    Text(book.title)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    Text(book.author ?? " ")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                .frame(height: 50, alignment: .top)
            }
            .frame(width: 100)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Curated Collection Card

/// Card for curated book collection/list display
struct CuratedCollectionCard: View {
    let list: BookList
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                // Cover image or gradient background
                if let coverUrl = list.coverUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            collectionPlaceholder
                                .frame(width: 160, height: 100)
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 160, height: 100)
                                .clipped()
                        case .failure:
                            collectionPlaceholder
                                .frame(width: 160, height: 100)
                        @unknown default:
                            collectionPlaceholder
                                .frame(width: 160, height: 100)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    collectionPlaceholder
                        .frame(width: 160, height: 100)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                // Title
                Text(list.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                // Subtitle/description
                if let description = list.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                // Book count
                HStack(spacing: 4) {
                    Image(systemName: "book.closed.fill")
                        .font(.caption2)
                    Text(L10n.Store.booksCountLabel(list.itemCount))
                        .font(.caption2)
                }
                .foregroundColor(.secondary)
            }
            .frame(width: 160)
        }
        .buttonStyle(.plain)
    }

    private var collectionPlaceholder: some View {
        LinearGradient(
            colors: [.purple.opacity(0.6), .blue.opacity(0.6)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            Image(systemName: "books.vertical.fill")
                .font(.title)
                .foregroundColor(.white.opacity(0.8))
        )
    }
}

// MARK: - Books by Year Section

/// Section displaying books grouped by publication year with horizontal scroll
struct BooksByYearSection: View {
    let booksByYear: [BooksByYearGroup]
    var onBookTap: ((BookByYear) -> Void)?
    var onShowAll: ((Int) -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            ForEach(booksByYear) { group in
                VStack(alignment: .leading, spacing: 12) {
                    // Year header
                    HStack {
                        Text(String(group.year) + "年")
                            .font(.title2)
                            .fontWeight(.bold)

                        Spacer()

                        Button("查看全部") {
                            onShowAll?(group.year)
                        }
                        .font(.subheadline)
                    }
                    .padding(.horizontal)

                    // Books scroll
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(group.books) { book in
                                BookByYearCard(book: book) {
                                    onBookTap?(book)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
        }
    }
}

/// Card for book by year display
struct BookByYearCard: View {
    let book: BookByYear
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                BookCoverView(coverUrl: book.coverUrl, title: book.title)
                    .frame(width: 100, height: 140)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 2)

                // Fixed height text area for consistent card heights
                VStack(alignment: .leading, spacing: 4) {
                    Text(book.title)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    Text(book.author ?? " ")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    // Rating if available
                    HStack(spacing: 2) {
                        if let rating = book.rating {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.orange)
                            Text(String(format: "%.1f", rating))
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        } else {
                            Text(" ")
                                .font(.caption2)
                        }
                    }
                }
                .frame(height: 60, alignment: .top)
            }
            .frame(width: 100)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Top Rated Section

/// Section displaying highest rated books with rating info
struct TopRatedSection: View {
    let books: [TopRatedBook]
    var onBookTap: ((TopRatedBook) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(L10n.Store.topRated)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal)

            // Books scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(books) { book in
                        TopRatedBookCard(book: book) {
                            onBookTap?(book)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

/// Card for top rated book with prominent rating display
struct TopRatedBookCard: View {
    let book: TopRatedBook
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                BookCoverView(coverUrl: book.coverUrl, title: book.title)
                    .frame(width: 100, height: 150)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 3)

                // Fixed height text area for consistent card heights
                VStack(alignment: .leading, spacing: 4) {
                    Text(book.title)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    Text(book.author ?? " ")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    // Rating display below title and author
                    HStack(spacing: 2) {
                        if let rating = book.rating {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.orange)
                            Text(String(format: "%.1f", rating))
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            Text("(\(book.ratingCountFormatted))")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        } else {
                            Text(" ")
                                .font(.caption2)
                        }
                    }
                }
                .frame(height: 60, alignment: .top)
            }
            .frame(width: 100)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - External Rankings Section

/// Section displaying external ranking lists (NYT, Amazon, etc.)
struct ExternalRankingsSection: View {
    let rankings: [ExternalRanking]
    var onRankingTap: ((ExternalRanking) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(L10n.Store.externalRankings)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal)

            // Rankings scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        ExternalRankingCard(
                            ranking: ranking,
                            action: { onRankingTap?(ranking) },
                            colorIndex: index
                        )
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

/// Card for external ranking list - compact design with stacked book covers
struct ExternalRankingCard: View {
    let ranking: ExternalRanking
    let action: () -> Void
    let colorIndex: Int  // Index for color selection to avoid adjacent duplicates

    // Compact dimensions
    private let cardWidth: CGFloat = 240
    private let cardHeight: CGFloat = 260
    private let mainCoverWidth: CGFloat = 70
    private let mainCoverHeight: CGFloat = 105
    private let sideCoverWidth: CGFloat = 56
    private let sideCoverHeight: CGFloat = 84

    // Color palettes - 80% split colors (8/10), 20% solid (2/10)
    private static let colorPalettes: [(top: Color, bottom: Color, titleColor: Color, isLight: Bool)] = [
        // 1. Split: Teal top → Dark navy bottom (Amazon style)
        (Color(red: 0.07, green: 0.45, blue: 0.52), Color(red: 0.04, green: 0.18, blue: 0.25), .white, false),
        // 2. Solid: Cream (NYT style) - 20%
        (Color(red: 0.96, green: 0.94, blue: 0.90), Color(red: 0.96, green: 0.94, blue: 0.90), .black, true),
        // 3. Split: Light blue top → Deep blue bottom
        (Color(red: 0.55, green: 0.75, blue: 0.9), Color(red: 0.12, green: 0.25, blue: 0.45), .white, false),
        // 4. Split: Lavender top → Deep purple bottom
        (Color(red: 0.75, green: 0.65, blue: 0.85), Color(red: 0.3, green: 0.15, blue: 0.4), .white, false),
        // 5. Split: Peach top → Burgundy bottom
        (Color(red: 0.98, green: 0.8, blue: 0.7), Color(red: 0.55, green: 0.2, blue: 0.25), .white, false),
        // 6. Split: Mint top → Forest green bottom
        (Color(red: 0.7, green: 0.9, blue: 0.8), Color(red: 0.1, green: 0.35, blue: 0.25), .white, false),
        // 7. Split: Light coral top → Deep red bottom
        (Color(red: 0.95, green: 0.6, blue: 0.55), Color(red: 0.5, green: 0.12, blue: 0.15), .white, false),
        // 8. Solid: Warm sand - 20%
        (Color(red: 0.94, green: 0.9, blue: 0.82), Color(red: 0.94, green: 0.9, blue: 0.82), .black, true),
        // 9. Split: Sky blue top → Navy bottom
        (Color(red: 0.6, green: 0.8, blue: 0.95), Color(red: 0.08, green: 0.15, blue: 0.3), .white, false),
        // 10. Split: Gold/yellow top → Brown bottom
        (Color(red: 0.95, green: 0.85, blue: 0.55), Color(red: 0.4, green: 0.25, blue: 0.15), .white, false),
    ]

    private var palette: (top: Color, bottom: Color, titleColor: Color, isLight: Bool) {
        let index = colorIndex % Self.colorPalettes.count
        return Self.colorPalettes[index]
    }

    private var titleColor: Color { palette.titleColor }
    private var subtitleColor: Color { palette.isLight ? .gray : .white.opacity(0.8) }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 0) {
                // Logo at top (centered)
                logoView
                    .frame(height: 32)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 12)

                // Stacked book covers
                stackedBooksView
                    .frame(height: mainCoverHeight + 30)
                    .padding(.top, 8)

                // Title and subtitle at bottom
                VStack(spacing: 2) {
                    Text(ranking.title)
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(titleColor)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)

                    if let subtitle = ranking.subtitle {
                        Text(subtitle)
                            .font(.caption2)
                            .foregroundColor(subtitleColor)
                            .multilineTextAlignment(.center)
                            .lineLimit(1)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 8)
                .padding(.bottom, 12)
            }
            .frame(width: cardWidth, height: cardHeight)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(
                        LinearGradient(
                            stops: [
                                .init(color: palette.top, location: 0),
                                .init(color: palette.top, location: 0.45),
                                .init(color: palette.bottom, location: 0.55),
                                .init(color: palette.bottom, location: 1.0)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            )
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .shadow(color: .black.opacity(0.1), radius: 6, x: 0, y: 3)
        }
        .buttonStyle(.plain)
    }

    // Stacked books: always show 3 books (use placeholders if needed)
    private var stackedBooksView: some View {
        let covers = ranking.previewCovers ?? []

        return ZStack {
            // Left book (behind, offset left)
            bookCover(url: covers.count > 1 ? covers[1] : nil, width: sideCoverWidth, height: sideCoverHeight)
                .offset(x: -50, y: 15)
                .zIndex(0)

            // Right book (behind, offset right)
            bookCover(url: covers.count > 2 ? covers[2] : nil, width: sideCoverWidth, height: sideCoverHeight)
                .offset(x: 50, y: 15)
                .zIndex(0)

            // Center book (front, elevated)
            bookCover(url: covers.count > 0 ? covers[0] : nil, width: mainCoverWidth, height: mainCoverHeight)
                .zIndex(1)
                .shadow(color: .black.opacity(0.25), radius: 6, x: 0, y: 3)
        }
    }

    // Book cover view - always shows something (image or placeholder)
    // IMPORTANT: Frame and clipped must be applied INSIDE the image handler for consistent sizing
    private func bookCover(url: String?, width: CGFloat, height: CGFloat) -> some View {
        Group {
            if let coverUrl = url, let imageUrl = URL(string: coverUrl) {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .empty:
                        placeholderCover
                            .frame(width: width, height: height)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: width, height: height)
                            .clipped()
                    case .failure:
                        placeholderCover
                            .frame(width: width, height: height)
                    @unknown default:
                        placeholderCover
                            .frame(width: width, height: height)
                    }
                }
            } else {
                placeholderCover
                    .frame(width: width, height: height)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color.white.opacity(0.2), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }

    private var placeholderCover: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.2)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .overlay(
                Image(systemName: "book.closed")
                    .font(.caption)
                    .foregroundColor(.gray.opacity(0.5))
            )
    }

    // Logo view
    @ViewBuilder
    private var logoView: some View {
        if let logoUrl = ranking.sourceLogoUrl, !logoUrl.isEmpty {
            AsyncImage(url: URL(string: logoUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFit()
                default:
                    sourceNameText
                }
            }
        } else {
            sourceNameText
        }
    }

    private var sourceNameText: some View {
        Text(ranking.displaySourceName)
            .font(.caption)
            .fontWeight(.bold)
            .foregroundColor(titleColor)
            .italic(ranking.displaySourceName.lowercased().contains("times"))
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
