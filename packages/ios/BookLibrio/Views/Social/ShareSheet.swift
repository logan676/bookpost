import SwiftUI
import UIKit

/// ShareSheet provides rich sharing options for books, quotes, and reading progress
/// Supports multiple destinations: Friends, WeChat, Quote Cards, and System Share
struct ShareSheet: View {
    let content: ShareContent
    @Environment(\.dismiss) var dismiss
    @State private var selectedTemplate: QuoteCardTemplate = .calendar
    @State private var showQuoteCardPreview = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Preview area
                contentPreview

                Divider()

                // Share destinations
                ScrollView {
                    VStack(spacing: 24) {
                        // Quick share options
                        quickShareSection

                        // Quote card section (for text content)
                        if case .quote = content {
                            quoteCardSection
                        }

                        // More options
                        moreOptionsSection
                    }
                    .padding()
                }
            }
            .navigationTitle("分享")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
            .sheet(isPresented: $showQuoteCardPreview) {
                QuoteCardPreviewSheet(
                    content: content,
                    template: selectedTemplate
                )
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Content Preview

    private var contentPreview: some View {
        Group {
            switch content {
            case .book(let title, let author, let coverUrl):
                bookPreview(title: title, author: author, coverUrl: coverUrl)
            case .quote(let text, let bookTitle, let author):
                quotePreview(text: text, bookTitle: bookTitle, author: author)
            case .progress(let bookTitle, let progress, let coverUrl):
                progressPreview(bookTitle: bookTitle, progress: progress, coverUrl: coverUrl)
            case .thought(let text, let bookTitle):
                thoughtPreview(text: text, bookTitle: bookTitle)
            }
        }
        .padding()
        .background(Color(.systemGray6))
    }

    private func bookPreview(title: String, author: String?, coverUrl: String?) -> some View {
        HStack(spacing: 12) {
            BookCoverView(coverUrl: coverUrl, title: title)
                .frame(width: 60, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 4))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .lineLimit(2)

                if let author = author {
                    Text(author)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Text("分享给好友")
                    .font(.caption)
                    .foregroundColor(.blue)
            }

            Spacer()
        }
    }

    private func quotePreview(text: String, bookTitle: String, author: String?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\"\(text)\"")
                .font(.body)
                .italic()
                .lineLimit(3)

            HStack {
                Text("—— 《\(bookTitle)》")
                    .font(.caption)
                    .foregroundColor(.secondary)

                if let author = author {
                    Text("· \(author)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    private func progressPreview(bookTitle: String, progress: Double, coverUrl: String?) -> some View {
        HStack(spacing: 12) {
            BookCoverView(coverUrl: coverUrl, title: bookTitle)
                .frame(width: 50, height: 68)
                .clipShape(RoundedRectangle(cornerRadius: 4))

            VStack(alignment: .leading, spacing: 4) {
                Text("我正在读《\(bookTitle)》")
                    .font(.subheadline)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    ProgressView(value: progress)
                        .frame(width: 100)

                    Text(String(format: "%.0f%%", progress * 100))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
    }

    private func thoughtPreview(text: String, bookTitle: String?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(text)
                .font(.body)
                .lineLimit(3)

            if let bookTitle = bookTitle {
                HStack(spacing: 4) {
                    Image(systemName: "book.fill")
                        .font(.caption)
                    Text(bookTitle)
                        .font(.caption)
                }
                .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Quick Share Section

    private var quickShareSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("分享到")
                .font(.subheadline)
                .foregroundColor(.secondary)

            HStack(spacing: 20) {
                shareDestinationButton(
                    icon: "message.fill",
                    label: "微信",
                    color: .green
                ) {
                    shareToWeChat()
                }

                shareDestinationButton(
                    icon: "circle.grid.3x3.fill",
                    label: "朋友圈",
                    color: .green
                ) {
                    shareToMoments()
                }

                shareDestinationButton(
                    icon: "person.2.fill",
                    label: "书友",
                    color: .blue
                ) {
                    shareToFriends()
                }

                shareDestinationButton(
                    icon: "ellipsis",
                    label: "更多",
                    color: .gray
                ) {
                    shareToSystem()
                }
            }
        }
    }

    private func shareDestinationButton(icon: String, label: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Image(systemName: icon)
                            .font(.title3)
                            .foregroundColor(color)
                    )

                Text(label)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
        }
    }

    // MARK: - Quote Card Section

    private var quoteCardSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("生成书摘卡片")
                .font(.subheadline)
                .foregroundColor(.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(QuoteCardTemplate.allCases, id: \.self) { template in
                        QuoteCardTemplateButton(
                            template: template,
                            isSelected: selectedTemplate == template
                        ) {
                            selectedTemplate = template
                            showQuoteCardPreview = true
                        }
                    }
                }
            }
        }
    }

    // MARK: - More Options Section

    private var moreOptionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("更多操作")
                .font(.subheadline)
                .foregroundColor(.secondary)

            VStack(spacing: 0) {
                moreOptionRow(icon: "doc.on.doc", label: "复制链接") {
                    copyLink()
                }

                Divider().padding(.leading, 44)

                moreOptionRow(icon: "qrcode", label: "生成二维码") {
                    generateQRCode()
                }

                Divider().padding(.leading, 44)

                moreOptionRow(icon: "bookmark", label: "收藏") {
                    saveToCollection()
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }

    private func moreOptionRow(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundColor(.blue)
                    .frame(width: 24)

                Text(label)
                    .font(.body)
                    .foregroundColor(.primary)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
    }

    // MARK: - Share Actions

    private func shareToWeChat() {
        // In real app, use WeChat SDK
        dismiss()
    }

    private func shareToMoments() {
        // In real app, use WeChat SDK
        dismiss()
    }

    private func shareToFriends() {
        // Show friend selection
        dismiss()
    }

    private func shareToSystem() {
        // Use UIActivityViewController
        let text = content.shareText
        let activityVC = UIActivityViewController(activityItems: [text], applicationActivities: nil)

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
        dismiss()
    }

    private func copyLink() {
        UIPasteboard.general.string = content.shareLink
        dismiss()
    }

    private func generateQRCode() {
        // Generate QR code
        dismiss()
    }

    private func saveToCollection() {
        // Save to user's collection
        dismiss()
    }
}

// MARK: - Share Content Types

enum ShareContent {
    case book(title: String, author: String?, coverUrl: String?)
    case quote(text: String, bookTitle: String, author: String?)
    case progress(bookTitle: String, progress: Double, coverUrl: String?)
    case thought(text: String, bookTitle: String?)

    var shareText: String {
        switch self {
        case .book(let title, let author, _):
            return "我在读《\(title)》\(author.map { " - \($0)" } ?? "")"
        case .quote(let text, let bookTitle, _):
            return "\"\(text)\" —— 《\(bookTitle)》"
        case .progress(let bookTitle, let progress, _):
            return "我正在读《\(bookTitle)》，已完成 \(Int(progress * 100))%"
        case .thought(let text, let bookTitle):
            return text + (bookTitle.map { " #\($0)#" } ?? "")
        }
    }

    var shareLink: String {
        // Generate deep link
        return "bookpost://share/..."
    }
}

// MARK: - Quote Card Template

enum QuoteCardTemplate: String, CaseIterable {
    case calendar = "日历"
    case minimal = "简约"
    case elegant = "典雅"
    case dark = "暗黑"

    var backgroundColor: Color {
        switch self {
        case .calendar: return Color.white
        case .minimal: return Color(.systemGray6)
        case .elegant: return Color(red: 0.96, green: 0.94, blue: 0.90)
        case .dark: return Color(.systemGray6).opacity(0.9)
        }
    }

    var textColor: Color {
        switch self {
        case .calendar, .minimal, .elegant: return .primary
        case .dark: return .white
        }
    }
}

// MARK: - Quote Card Template Button

struct QuoteCardTemplateButton: View {
    let template: QuoteCardTemplate
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(template.backgroundColor)
                    .frame(width: 80, height: 100)
                    .overlay(
                        VStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(template.textColor.opacity(0.3))
                                .frame(width: 50, height: 4)
                            RoundedRectangle(cornerRadius: 2)
                                .fill(template.textColor.opacity(0.3))
                                .frame(width: 40, height: 4)
                            RoundedRectangle(cornerRadius: 2)
                                .fill(template.textColor.opacity(0.3))
                                .frame(width: 45, height: 4)
                        }
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
                    )
                    .shadow(color: .black.opacity(0.1), radius: 2)

                Text(template.rawValue)
                    .font(.caption)
                    .foregroundColor(isSelected ? .blue : .secondary)
            }
        }
    }
}

// MARK: - Quote Card Preview Sheet

struct QuoteCardPreviewSheet: View {
    let content: ShareContent
    let template: QuoteCardTemplate
    @Environment(\.dismiss) var dismiss
    @State private var cardImage: UIImage?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Card preview
                quoteCard
                    .padding(.horizontal, 32)

                // Action buttons
                HStack(spacing: 24) {
                    Button {
                        saveToPhotos()
                    } label: {
                        Label("保存图片", systemImage: "square.and.arrow.down")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(24)
                    }

                    Button {
                        shareImage()
                    } label: {
                        Label("分享", systemImage: "square.and.arrow.up")
                            .font(.headline)
                            .foregroundColor(.blue)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(24)
                    }
                }

                Spacer()
            }
            .padding(.top, 32)
            .navigationTitle("书摘卡片")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
        }
    }

    private var quoteCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            if case .quote(let text, let bookTitle, let author) = content {
                // Quote text
                Text("\"\(text)\"")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(template.textColor)
                    .lineSpacing(6)

                // Divider
                Rectangle()
                    .fill(template.textColor.opacity(0.2))
                    .frame(height: 1)

                // Source
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("《\(bookTitle)》")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        if let author = author {
                            Text(author)
                                .font(.caption)
                                .foregroundColor(template.textColor.opacity(0.7))
                        }
                    }

                    Spacer()

                    // App logo
                    VStack(spacing: 2) {
                        Image(systemName: "book.fill")
                            .font(.caption)
                        Text("BookPost")
                            .font(.system(size: 8))
                    }
                    .foregroundColor(template.textColor.opacity(0.5))
                }
            }
        }
        .padding(24)
        .background(template.backgroundColor)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 4)
    }

    private func saveToPhotos() {
        // Render card to image and save
        dismiss()
    }

    private func shareImage() {
        // Share rendered card image
        dismiss()
    }
}

#Preview {
    ShareSheet(content: .quote(
        text: "人类之所以能够统治世界，是因为我们是唯一能够相信虚构故事的动物。",
        bookTitle: "人类简史",
        author: "尤瓦尔·赫拉利"
    ))
}
