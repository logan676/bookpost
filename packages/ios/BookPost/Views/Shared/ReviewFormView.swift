import SwiftUI

/// Form for creating or editing a book review
struct ReviewFormView: View {
    let bookType: BookType
    let bookId: Int
    let bookTitle: String
    let existingReview: BookReview?
    let onSaved: (BookReview) -> Void
    let onDeleted: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var rating: Int = 0
    @State private var recommendType: RecommendType?
    @State private var title: String = ""
    @State private var content: String = ""
    @State private var isSubmitting = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    private var isEditing: Bool {
        existingReview != nil
    }

    private var isValid: Bool {
        !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    init(
        bookType: BookType,
        bookId: Int,
        bookTitle: String,
        existingReview: BookReview? = nil,
        onSaved: @escaping (BookReview) -> Void,
        onDeleted: (() -> Void)? = nil
    ) {
        self.bookType = bookType
        self.bookId = bookId
        self.bookTitle = bookTitle
        self.existingReview = existingReview
        self.onSaved = onSaved
        self.onDeleted = onDeleted

        // Initialize state from existing review
        if let review = existingReview {
            _rating = State(initialValue: review.rating ?? 0)
            _recommendType = State(initialValue: {
                guard let type = review.recommendType else { return nil }
                return RecommendType(rawValue: type)
            }())
            _title = State(initialValue: review.title ?? "")
            _content = State(initialValue: review.content)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                // Book info header
                Section {
                    HStack {
                        Image(systemName: bookType == .ebook ? "book.fill" : "newspaper.fill")
                            .foregroundColor(.accentColor)
                        Text(bookTitle)
                            .lineLimit(2)
                    }
                }

                // Rating section
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("评分 (可选)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        HStack(spacing: 8) {
                            ForEach(1...5, id: \.self) { star in
                                Button {
                                    withAnimation(.easeInOut(duration: 0.1)) {
                                        rating = rating == star ? 0 : star
                                    }
                                } label: {
                                    Image(systemName: star <= rating ? "star.fill" : "star")
                                        .font(.title2)
                                        .foregroundColor(star <= rating ? .yellow : .gray.opacity(0.3))
                                }
                                .buttonStyle(.plain)
                            }

                            Spacer()

                            if rating > 0 {
                                Text("\(rating) 星")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }

                // Recommendation section
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("推荐 (可选)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        HStack(spacing: 12) {
                            ForEach(RecommendType.allCases, id: \.self) { type in
                                Button {
                                    withAnimation(.easeInOut(duration: 0.1)) {
                                        recommendType = recommendType == type ? nil : type
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Image(systemName: type.iconName)
                                        Text(type.displayName)
                                    }
                                    .font(.subheadline)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(recommendType == type ? recommendColor(type).opacity(0.2) : Color(.systemGray6))
                                    .foregroundColor(recommendType == type ? recommendColor(type) : .primary)
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                // Review title (optional)
                Section {
                    TextField("标题 (可选)", text: $title)
                } header: {
                    Text("标题")
                }

                // Review content
                Section {
                    TextEditor(text: $content)
                        .frame(minHeight: 150)
                } header: {
                    Text("评论内容")
                } footer: {
                    Text("\(content.count)/5000 字符")
                        .foregroundColor(content.count > 5000 ? .red : .secondary)
                }

                // Error message
                if let error = errorMessage {
                    Section {
                        Label(error, systemImage: "exclamationmark.triangle")
                            .foregroundColor(.red)
                    }
                }

                // Delete button (only for editing)
                if isEditing, onDeleted != nil {
                    Section {
                        Button(role: .destructive) {
                            showDeleteConfirm = true
                        } label: {
                            HStack {
                                Spacer()
                                Label("删除评论", systemImage: "trash")
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle(isEditing ? "编辑评论" : "写评论")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        dismiss()
                    }
                    .disabled(isSubmitting)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "保存" : "发布") {
                        Task { await submitReview() }
                    }
                    .disabled(!isValid || isSubmitting || content.count > 5000)
                }
            }
            .disabled(isSubmitting)
            .overlay {
                if isSubmitting {
                    ProgressView()
                        .scaleEffect(1.5)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.2))
                }
            }
            .confirmationDialog("删除评论", isPresented: $showDeleteConfirm) {
                Button("删除", role: .destructive) {
                    Task { await deleteReview() }
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text("确定要删除这条评论吗？此操作不可撤销。")
            }
        }
    }

    private func recommendColor(_ type: RecommendType) -> Color {
        switch type {
        case .recommend: return .green
        case .neutral: return .gray
        case .notRecommend: return .red
        }
    }

    private func submitReview() async {
        isSubmitting = true
        errorMessage = nil

        let request = CreateReviewRequest(
            rating: rating > 0 ? rating : nil,
            recommendType: recommendType?.rawValue,
            title: title.isEmpty ? nil : title,
            content: content.trimmingCharacters(in: .whitespacesAndNewlines)
        )

        do {
            let response: ReviewResponse
            if isEditing {
                response = try await APIClient.shared.updateReview(type: bookType, id: bookId, review: request)
            } else {
                response = try await APIClient.shared.createReview(type: bookType, id: bookId, review: request)
            }
            onSaved(response.data)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }

    private func deleteReview() async {
        isSubmitting = true
        errorMessage = nil

        do {
            _ = try await APIClient.shared.deleteReview(type: bookType, id: bookId)
            onDeleted?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }
}

#Preview {
    ReviewFormView(
        bookType: .ebook,
        bookId: 1,
        bookTitle: "测试书籍名称",
        onSaved: { _ in }
    )
}
