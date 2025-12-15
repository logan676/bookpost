import SwiftUI

// MARK: - Share Quote Card View

/// View for creating shareable quote cards with multiple templates
struct ShareQuoteCardView: View {
    let quote: String
    let bookTitle: String
    let author: String
    let coverUrl: String?

    @Environment(\.dismiss) var dismiss
    @State private var selectedTemplate: QuoteCardTemplate = .calendar
    @State private var isSaving = false
    @State private var showSaveSuccess = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Preview area
                ScrollView {
                    cardPreview
                        .padding()
                }

                // Template selector
                templateSelector
                    .padding(.vertical, 12)
                    .background(Color(.systemBackground))
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("分享金句")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        saveToGallery()
                    } label: {
                        if isSaving {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Text("保存")
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(isSaving)
                }
            }
            .overlay {
                if showSaveSuccess {
                    saveSuccessOverlay
                }
            }
        }
    }

    // MARK: - Card Preview

    @ViewBuilder
    private var cardPreview: some View {
        switch selectedTemplate {
        case .calendar:
            CalendarQuoteCard(quote: quote, bookTitle: bookTitle, author: author)
        case .minimal:
            MinimalQuoteCard(quote: quote, bookTitle: bookTitle, author: author)
        case .book:
            BookQuoteCard(quote: quote, bookTitle: bookTitle, author: author, coverUrl: coverUrl)
        case .gradient:
            GradientQuoteCard(quote: quote, bookTitle: bookTitle, author: author)
        }
    }

    // MARK: - Template Selector

    private var templateSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(QuoteCardTemplate.allCases) { template in
                    Button {
                        withAnimation {
                            selectedTemplate = template
                        }
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: template.icon)
                                .font(.title2)
                                .frame(width: 60, height: 60)
                                .background(
                                    selectedTemplate == template
                                        ? Color.blue.opacity(0.15)
                                        : Color(.systemGray6)
                                )
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(selectedTemplate == template ? Color.blue : Color.clear, lineWidth: 2)
                                )

                            Text(template.name)
                                .font(.caption)
                                .foregroundColor(selectedTemplate == template ? .blue : .secondary)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Save Success Overlay

    private var saveSuccessOverlay: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 50))
                .foregroundColor(.green)

            Text("已保存到相册")
                .font(.headline)
        }
        .padding(30)
        .background(.ultraThinMaterial)
        .cornerRadius(16)
        .transition(.scale.combined(with: .opacity))
    }

    // MARK: - Save to Gallery

    @MainActor
    private func saveToGallery() {
        isSaving = true

        let cardView: AnyView
        switch selectedTemplate {
        case .calendar:
            cardView = AnyView(CalendarQuoteCard(quote: quote, bookTitle: bookTitle, author: author))
        case .minimal:
            cardView = AnyView(MinimalQuoteCard(quote: quote, bookTitle: bookTitle, author: author))
        case .book:
            cardView = AnyView(BookQuoteCard(quote: quote, bookTitle: bookTitle, author: author, coverUrl: coverUrl))
        case .gradient:
            cardView = AnyView(GradientQuoteCard(quote: quote, bookTitle: bookTitle, author: author))
        }

        let renderer = ImageRenderer(content: cardView.frame(width: 350))
        renderer.scale = 3.0

        if let uiImage = renderer.uiImage {
            UIImageWriteToSavedPhotosAlbum(uiImage, nil, nil, nil)

            withAnimation {
                showSaveSuccess = true
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation {
                    showSaveSuccess = false
                    isSaving = false
                }
            }
        } else {
            isSaving = false
        }
    }
}

// MARK: - Quote Card Templates

enum QuoteCardTemplate: String, CaseIterable, Identifiable {
    case calendar
    case minimal
    case book
    case gradient

    var id: String { rawValue }

    var name: String {
        switch self {
        case .calendar: return "日历"
        case .minimal: return "简约"
        case .book: return "书籍"
        case .gradient: return "渐变"
        }
    }

    var icon: String {
        switch self {
        case .calendar: return "calendar"
        case .minimal: return "text.quote"
        case .book: return "book.fill"
        case .gradient: return "paintbrush.fill"
        }
    }
}

// MARK: - Calendar Quote Card

/// Calendar-style quote card with date display
struct CalendarQuoteCard: View {
    let quote: String
    let bookTitle: String
    let author: String

    private var currentDate: Date { Date() }

    var body: some View {
        VStack(spacing: 0) {
            // Calendar header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(currentDate.formatted(.dateTime.month(.wide)))
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))

                    Text(currentDate.formatted(.dateTime.day()))
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.white)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(currentDate.formatted(.dateTime.weekday(.wide)))
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))

                    Text(currentDate.formatted(.dateTime.year()))
                        .font(.subheadline)
                        .foregroundColor(.white)
                }
            }
            .padding()
            .background(Color.orange)

            // Quote content
            VStack(alignment: .leading, spacing: 16) {
                Text(""\(quote)"")
                    .font(.system(size: 18, weight: .medium))
                    .lineSpacing(6)
                    .foregroundColor(.primary)

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("—— 《\(bookTitle)》")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        Text(author)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Image(systemName: "book.fill")
                        .font(.title2)
                        .foregroundColor(.orange.opacity(0.3))
                }
            }
            .padding()
            .background(Color(.systemBackground))

            // Footer
            HStack {
                Text("BookPost · 每日金句")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                Spacer()

                Image(systemName: "qrcode")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(.systemGray6))
        }
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 4)
    }
}

// MARK: - Minimal Quote Card

/// Clean minimal quote card
struct MinimalQuoteCard: View {
    let quote: String
    let bookTitle: String
    let author: String

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            // Large quote mark
            Text(""")
                .font(.system(size: 60, weight: .bold))
                .foregroundColor(.blue.opacity(0.3))
                .offset(x: -8, y: 0)

            // Quote text
            Text(quote)
                .font(.system(size: 20, weight: .regular, design: .serif))
                .lineSpacing(8)
                .foregroundColor(.primary)

            // Attribution
            HStack {
                Rectangle()
                    .fill(Color.blue)
                    .frame(width: 30, height: 2)

                Text("《\(bookTitle)》· \(author)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Footer
            HStack {
                Text("BookPost")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(.blue)

                Spacer()

                Text(Date().formatted(.dateTime.month().day().year()))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(24)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 4)
    }
}

// MARK: - Book Quote Card

/// Quote card with book cover
struct BookQuoteCard: View {
    let quote: String
    let bookTitle: String
    let author: String
    let coverUrl: String?

    var body: some View {
        VStack(spacing: 0) {
            // Quote section
            VStack(alignment: .leading, spacing: 16) {
                Text(""\(quote)"")
                    .font(.system(size: 18, weight: .medium))
                    .lineSpacing(6)
                    .foregroundColor(.primary)
                    .italic()
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemBackground))

            // Book info section
            HStack(spacing: 12) {
                // Book cover
                if let coverUrl = coverUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                    }
                    .frame(width: 50, height: 70)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .shadow(radius: 2)
                } else {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.blue.opacity(0.2))
                        .frame(width: 50, height: 70)
                        .overlay(
                            Image(systemName: "book.fill")
                                .foregroundColor(.blue.opacity(0.5))
                        )
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(bookTitle)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .lineLimit(2)

                    Text(author)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                }

                Spacer()

                Image(systemName: "bookmark.fill")
                    .font(.title2)
                    .foregroundColor(.white.opacity(0.3))
            }
            .padding()
            .background(
                LinearGradient(
                    colors: [.blue, .blue.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )

            // Footer
            HStack {
                Text("来自 BookPost")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(.systemGray6))
        }
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 4)
    }
}

// MARK: - Gradient Quote Card

/// Gradient background quote card
struct GradientQuoteCard: View {
    let quote: String
    let bookTitle: String
    let author: String

    @State private var gradientColors: [Color] = [.purple, .blue, .cyan]

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Decorative element
            HStack {
                Circle()
                    .fill(.white.opacity(0.2))
                    .frame(width: 40, height: 40)

                Circle()
                    .fill(.white.opacity(0.1))
                    .frame(width: 20, height: 20)

                Spacer()
            }

            Spacer()

            // Quote
            Text(""\(quote)"")
                .font(.system(size: 20, weight: .semibold))
                .lineSpacing(8)
                .foregroundColor(.white)

            // Attribution
            HStack {
                Rectangle()
                    .fill(.white.opacity(0.5))
                    .frame(width: 20, height: 2)

                Text("《\(bookTitle)》")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.9))

                Text("· \(author)")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }

            Spacer()

            // Footer
            HStack {
                Text("BookPost")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                Spacer()

                Text(Date().formatted(.dateTime.month().day()))
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
        .padding(24)
        .frame(height: 400)
        .background(
            LinearGradient(
                colors: gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.2), radius: 15, x: 0, y: 8)
    }
}

// MARK: - Preview

#Preview("Share Quote Card") {
    ShareQuoteCardView(
        quote: "多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。",
        bookTitle: "百年孤独",
        author: "加西亚·马尔克斯",
        coverUrl: nil
    )
}

#Preview("Calendar Template") {
    CalendarQuoteCard(
        quote: "过去都是假的，回忆是一条没有归途的路。",
        bookTitle: "百年孤独",
        author: "加西亚·马尔克斯"
    )
    .padding()
}

#Preview("Gradient Template") {
    GradientQuoteCard(
        quote: "生命中曾经有过的所有灿烂，原来终究，都需要用寂寞来偿还。",
        bookTitle: "百年孤独",
        author: "加西亚·马尔克斯"
    )
    .padding()
}
