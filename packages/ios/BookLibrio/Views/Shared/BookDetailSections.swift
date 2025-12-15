import SwiftUI

// MARK: - AI Guide Topic Cards

/// Horizontal scrolling AI-generated topic cards for book exploration
struct AIGuideSection: View {
    let bookId: Int
    let topics: [BookDetailAITopic]
    var onTopicTap: ((BookDetailAITopic) -> Void)?

    @State private var isLoading = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.purple, .blue],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )

                    Text(L10n.BookDetail.aiGuide)
                        .font(.headline)
                }

                Spacer()

                if isLoading {
                    ProgressView()
                        .scaleEffect(0.7)
                }
            }
            .padding(.horizontal)

            Text(L10n.BookDetail.aiGuideSubtitle)
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            // Topic cards scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(topics) { topic in
                        AIGuideTopicCard(topic: topic) {
                            onTopicTap?(topic)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

/// Individual AI guide topic card
struct AIGuideTopicCard: View {
    let topic: BookDetailAITopic
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                // Topic icon
                ZStack {
                    Circle()
                        .fill(topic.color.opacity(0.15))
                        .frame(width: 36, height: 36)

                    Image(systemName: topic.icon)
                        .font(.system(size: 16))
                        .foregroundColor(topic.color)
                }

                // Topic title
                Text(topic.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                    .lineLimit(1)

                // Topic description
                Text(topic.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)

                Spacer()

                // Question count
                HStack {
                    Text(L10n.BookDetail.questionsCount(topic.questionsCount))
                        .font(.caption2)
                        .foregroundColor(.secondary)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(12)
            .frame(width: 160, height: 150)
            .background(Color(.secondarySystemGroupedBackground))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

/// AI Guide topic model for book detail view
struct BookDetailAITopic: Identifiable {
    let id: Int
    let title: String
    let description: String
    let icon: String
    let color: Color
    let questionsCount: Int
    let questions: [String]

    static var samples: [BookDetailAITopic] {
        [
            BookDetailAITopic(
                id: 1,
                title: "核心主题",
                description: "探索书中的核心思想和主要论点",
                icon: "lightbulb.fill",
                color: .orange,
                questionsCount: 5,
                questions: ["这本书的核心观点是什么？", "作者想传达什么信息？"]
            ),
            BookDetailAITopic(
                id: 2,
                title: "人物分析",
                description: "深入了解书中的主要人物",
                icon: "person.2.fill",
                color: .blue,
                questionsCount: 4,
                questions: ["主角有哪些性格特点？", "人物之间的关系是什么？"]
            ),
            BookDetailAITopic(
                id: 3,
                title: "背景知识",
                description: "了解书中涉及的历史和文化背景",
                icon: "clock.arrow.circlepath",
                color: .purple,
                questionsCount: 3,
                questions: ["故事发生在什么时代？", "有哪些文化背景需要了解？"]
            ),
            BookDetailAITopic(
                id: 4,
                title: "写作技巧",
                description: "分析作者的写作风格和手法",
                icon: "pencil.line",
                color: .green,
                questionsCount: 4,
                questions: ["作者使用了什么叙事手法？", "有哪些独特的写作技巧？"]
            )
        ]
    }
}

// MARK: - Popular Highlights Section

/// Section showing most highlighted passages from the community
struct PopularHighlightsSection: View {
    let highlights: [BookDetailPopularHighlight]
    var onHighlightTap: ((BookDetailPopularHighlight) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "highlighter")
                        .foregroundColor(.yellow)

                    Text(L10n.BookDetail.popularHighlights)
                        .font(.headline)
                }

                Spacer()

                if highlights.count > 3 {
                    Button(L10n.Store.more) {
                        onShowAll?()
                    }
                    .font(.subheadline)
                }
            }
            .padding(.horizontal)

            Text(L10n.BookDetail.popularHighlightsSubtitle)
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            // Highlights list
            VStack(spacing: 12) {
                ForEach(highlights.prefix(3)) { highlight in
                    PopularHighlightCard(highlight: highlight) {
                        onHighlightTap?(highlight)
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

/// Individual popular highlight card
struct PopularHighlightCard: View {
    let highlight: BookDetailPopularHighlight
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                // Highlight text with quote styling
                HStack(alignment: .top, spacing: 8) {
                    Rectangle()
                        .fill(Color.yellow)
                        .frame(width: 3)

                    Text(highlight.text)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        .lineLimit(3)
                        .italic()
                }

                // Stats row
                HStack {
                    // Highlighters count
                    HStack(spacing: 4) {
                        Image(systemName: "person.2.fill")
                            .font(.caption2)
                        Text(L10n.BookDetail.highlightedBy(highlight.highlightersCount))
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)

                    Spacer()

                    // Chapter/location
                    Text(highlight.location)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(12)
            .background(Color(.secondarySystemGroupedBackground))
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
    }
}

/// Popular highlight model for book detail view
struct BookDetailPopularHighlight: Identifiable {
    let id: Int
    let text: String
    let location: String
    let highlightersCount: Int
    let chapterTitle: String?

    static var samples: [BookDetailPopularHighlight] {
        [
            BookDetailPopularHighlight(
                id: 1,
                text: "多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。",
                location: "第一章",
                highlightersCount: 2341,
                chapterTitle: "第一章"
            ),
            BookDetailPopularHighlight(
                id: 2,
                text: "过去都是假的，回忆是一条没有归途的路，以往的一切春天都无法复原。",
                location: "第八章",
                highlightersCount: 1892,
                chapterTitle: "第八章"
            ),
            BookDetailPopularHighlight(
                id: 3,
                text: "生命中曾经有过的所有灿烂，原来终究，都需要用寂寞来偿还。",
                location: "第十五章",
                highlightersCount: 1567,
                chapterTitle: "第十五章"
            )
        ]
    }
}

// MARK: - Publisher Info Section

/// Section displaying publisher information and other books
struct PublisherInfoSection: View {
    let publisher: BookPublisher
    let otherBooks: [PublisherBook]
    var onBookTap: ((PublisherBook) -> Void)?
    var onPublisherTap: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text(L10n.BookDetail.publisherInfo)
                    .font(.headline)

                Spacer()
            }
            .padding(.horizontal)

            // Publisher card
            Button(action: { onPublisherTap?() }) {
                HStack(spacing: 12) {
                    // Publisher logo
                    if let logoUrl = publisher.logoUrl {
                        AsyncImage(url: URL(string: logoUrl)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                        } placeholder: {
                            publisherLogoPlaceholder
                        }
                        .frame(width: 50, height: 50)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        publisherLogoPlaceholder
                    }

                    // Publisher info
                    VStack(alignment: .leading, spacing: 4) {
                        Text(publisher.name)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)

                        Text(L10n.BookDetail.booksPublished(publisher.booksCount))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground))
                .cornerRadius(10)
            }
            .buttonStyle(.plain)
            .padding(.horizontal)

            // Other books from publisher
            if !otherBooks.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text(L10n.BookDetail.moreFromPublisher)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.horizontal)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(otherBooks) { book in
                                PublisherBookCard(book: book) {
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

    private var publisherLogoPlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.2))
                .frame(width: 50, height: 50)

            Image(systemName: "building.2.fill")
                .foregroundColor(.gray)
        }
    }
}

/// Publisher book card
struct PublisherBookCard: View {
    let book: PublisherBook
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                BookCoverView(coverUrl: book.coverUrl, title: book.title)
                    .frame(width: 80, height: 110)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .shadow(radius: 2)

                Text(book.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .lineLimit(2)
            }
            .frame(width: 80)
        }
        .buttonStyle(.plain)
    }
}

/// Publisher model for book detail view
struct BookPublisher: Identifiable {
    let id: Int
    let name: String
    let logoUrl: String?
    let booksCount: Int
    let description: String?
}

/// Publisher book model
struct PublisherBook: Identifiable {
    let id: Int
    let title: String
    let coverUrl: String?
    let author: String
}

// MARK: - Related Book Lists Section

/// Section showing book lists that include this book
struct RelatedBookListsSection: View {
    let lists: [RelatedBookList]
    var onListTap: ((RelatedBookList) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "list.bullet.rectangle.fill")
                        .foregroundColor(.indigo)

                    Text(L10n.BookDetail.relatedLists)
                        .font(.headline)
                }

                Spacer()

                if lists.count > 3 {
                    Button(L10n.Store.more) {
                        onShowAll?()
                    }
                    .font(.subheadline)
                }
            }
            .padding(.horizontal)

            Text(L10n.BookDetail.relatedListsSubtitle)
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            // Lists scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(lists) { list in
                        RelatedListCard(list: list) {
                            onListTap?(list)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

/// Related list card
struct RelatedListCard: View {
    let list: RelatedBookList
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                // Stacked book covers
                ZStack(alignment: .bottomTrailing) {
                    HStack(spacing: -20) {
                        ForEach(list.previewCovers.prefix(3).indices, id: \.self) { index in
                            AsyncImage(url: URL(string: list.previewCovers[index])) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                            }
                            .frame(width: 50, height: 70)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(Color.white, lineWidth: 2)
                            )
                            .zIndex(Double(3 - index))
                        }
                    }

                    // Book count badge
                    Text("\(list.bookCount)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.black.opacity(0.6))
                        .cornerRadius(8)
                }

                // List info
                Text(list.title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                    .lineLimit(2)

                HStack(spacing: 4) {
                    Image(systemName: "person.fill")
                        .font(.caption2)
                    Text(list.creatorName)
                        .font(.caption2)
                }
                .foregroundColor(.secondary)
            }
            .frame(width: 140)
        }
        .buttonStyle(.plain)
    }
}

/// Related book list model
struct RelatedBookList: Identifiable {
    let id: Int
    let title: String
    let creatorName: String
    let bookCount: Int
    let previewCovers: [String]
    let followersCount: Int
}

// MARK: - Previews

#Preview("AI Guide") {
    AIGuideSection(bookId: 1, topics: BookDetailAITopic.samples)
}

#Preview("Popular Highlights") {
    PopularHighlightsSection(highlights: BookDetailPopularHighlight.samples)
}

#Preview("Publisher Info") {
    PublisherInfoSection(
        publisher: BookPublisher(
            id: 1,
            name: "人民文学出版社",
            logoUrl: nil,
            booksCount: 1234,
            description: nil
        ),
        otherBooks: []
    )
}
