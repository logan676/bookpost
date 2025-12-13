import SwiftUI
import PhotosUI

/// Publish thought/post view with support for images, mentions, and book tagging
/// Allows users to share reading thoughts, quotes, and discussions
struct PublishThoughtView: View {
    @Environment(\.dismiss) var dismiss
    @State private var thoughtText = ""
    @State private var selectedImages: [PhotosPickerItem] = []
    @State private var loadedImages: [UIImage] = []
    @State private var selectedBook: TaggedBook?
    @State private var mentionedUsers: [MentionedUser] = []
    @State private var selectedVisibility: PostVisibility = .publicPost
    @State private var isPublishing = false
    @State private var showBookPicker = false
    @State private var showMentionPicker = false
    @State private var showVisibilityPicker = false
    @FocusState private var isTextFocused: Bool

    // Character limit
    private let maxCharacters = 2000
    private let maxImages = 9

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Main content
                ScrollView {
                    VStack(spacing: 16) {
                        // Text input
                        textInputSection

                        // Tagged book
                        if let book = selectedBook {
                            taggedBookSection(book)
                        }

                        // Mentioned users
                        if !mentionedUsers.isEmpty {
                            mentionedUsersSection
                        }

                        // Selected images
                        if !loadedImages.isEmpty {
                            imagesSection
                        }
                    }
                    .padding()
                }

                Divider()

                // Bottom toolbar
                bottomToolbar
            }
            .navigationTitle(L10n.Social.publishThought)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Social.cancel) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        publishThought()
                    } label: {
                        if isPublishing {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Text(L10n.Social.publish)
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(!canPublish || isPublishing)
                }
            }
            .sheet(isPresented: $showBookPicker) {
                BookPickerView(selectedBook: $selectedBook)
            }
            .sheet(isPresented: $showMentionPicker) {
                UserMentionPickerView(mentionedUsers: $mentionedUsers)
            }
            .confirmationDialog(L10n.Social.whoCanSee, isPresented: $showVisibilityPicker) {
                ForEach(PostVisibility.allCases, id: \.self) { visibility in
                    Button(visibility.displayName) {
                        selectedVisibility = visibility
                    }
                }
            }
            .onChange(of: selectedImages) { _, newItems in
                loadImages(from: newItems)
            }
        }
    }

    // MARK: - Text Input Section

    private var textInputSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            // User avatar and input
            HStack(alignment: .top, spacing: 12) {
                // Avatar
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Text(L10n.Social.me)
                            .font(.headline)
                            .foregroundColor(.blue)
                    )

                // Text field
                VStack(alignment: .leading, spacing: 8) {
                    TextEditor(text: $thoughtText)
                        .frame(minHeight: 100)
                        .focused($isTextFocused)
                        .scrollContentBackground(.hidden)
                        .overlay(alignment: .topLeading) {
                            if thoughtText.isEmpty {
                                Text(L10n.Social.sharePlaceholder)
                                    .foregroundColor(.secondary)
                                    .padding(.top, 8)
                                    .padding(.leading, 4)
                                    .allowsHitTesting(false)
                            }
                        }

                    // Character count
                    HStack {
                        Spacer()
                        Text("\(thoughtText.count)/\(maxCharacters)")
                            .font(.caption)
                            .foregroundColor(thoughtText.count > maxCharacters ? .red : .secondary)
                    }
                }
            }
        }
    }

    // MARK: - Tagged Book Section

    private func taggedBookSection(_ book: TaggedBook) -> some View {
        HStack(spacing: 12) {
            // Book cover
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray5))
                .frame(width: 40, height: 56)
                .overlay(
                    Image(systemName: "book.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                )

            // Book info
            VStack(alignment: .leading, spacing: 2) {
                Text(book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text(book.author)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Remove button
            Button {
                selectedBook = nil
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Mentioned Users Section

    private var mentionedUsersSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L10n.Social.mentionedPeople)
                .font(.caption)
                .foregroundColor(.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(mentionedUsers) { user in
                        HStack(spacing: 6) {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 24, height: 24)
                                .overlay(
                                    Text(String(user.name.prefix(1)))
                                        .font(.caption2)
                                        .foregroundColor(.blue)
                                )

                            Text("@\(user.name)")
                                .font(.caption)

                            Button {
                                mentionedUsers.removeAll { $0.id == user.id }
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.caption2)
                            }
                        }
                        .foregroundColor(.blue)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(16)
                    }
                }
            }
        }
    }

    // MARK: - Images Section

    private var imagesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L10n.Social.imageCount(loadedImages.count, maxImages))
                .font(.caption)
                .foregroundColor(.secondary)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 8) {
                ForEach(loadedImages.indices, id: \.self) { index in
                    imageCell(loadedImages[index], index: index)
                }
            }
        }
    }

    private func imageCell(_ image: UIImage, index: Int) -> some View {
        ZStack(alignment: .topTrailing) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(height: 100)
                .clipped()
                .cornerRadius(8)

            Button {
                loadedImages.remove(at: index)
                selectedImages.remove(at: index)
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title3)
                    .foregroundColor(.white)
                    .shadow(radius: 2)
            }
            .offset(x: -4, y: 4)
        }
    }

    // MARK: - Bottom Toolbar

    private var bottomToolbar: some View {
        HStack(spacing: 20) {
            // Image picker
            PhotosPicker(
                selection: $selectedImages,
                maxSelectionCount: maxImages,
                matching: .images
            ) {
                VStack(spacing: 4) {
                    Image(systemName: "photo")
                        .font(.title3)
                    Text(L10n.Social.image)
                        .font(.caption2)
                }
                .foregroundColor(loadedImages.count < maxImages ? .blue : .secondary)
            }
            .disabled(loadedImages.count >= maxImages)

            // Book tag
            Button {
                showBookPicker = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "book")
                        .font(.title3)
                    Text(L10n.Social.book)
                        .font(.caption2)
                }
                .foregroundColor(selectedBook == nil ? .blue : .green)
            }

            // Mention
            Button {
                showMentionPicker = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "at")
                        .font(.title3)
                    Text(L10n.Social.mention)
                        .font(.caption2)
                }
                .foregroundColor(mentionedUsers.isEmpty ? .blue : .green)
            }

            // Visibility
            Button {
                showVisibilityPicker = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: selectedVisibility.iconName)
                        .font(.title3)
                    Text(selectedVisibility.displayName)
                        .font(.caption2)
                }
                .foregroundColor(.blue)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
    }

    // MARK: - Helpers

    private var canPublish: Bool {
        !thoughtText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        thoughtText.count <= maxCharacters
    }

    private func loadImages(from items: [PhotosPickerItem]) {
        loadedImages = []

        for item in items {
            item.loadTransferable(type: Data.self) { result in
                DispatchQueue.main.async {
                    if case .success(let data) = result, let data = data,
                       let image = UIImage(data: data) {
                        loadedImages.append(image)
                    }
                }
            }
        }
    }

    private func publishThought() {
        isPublishing = true

        // Simulate publishing
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isPublishing = false
            dismiss()
        }
    }
}

// MARK: - Book Picker View

struct BookPickerView: View {
    @Binding var selectedBook: TaggedBook?
    @Environment(\.dismiss) var dismiss
    @State private var searchText = ""
    @State private var recentBooks: [TaggedBook] = TaggedBook.sampleData

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField(L10n.Social.searchBooks, text: $searchText)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
                .padding()

                // Book list
                List {
                    Section(L10n.Social.recentlyRead) {
                        ForEach(filteredBooks) { book in
                            Button {
                                selectedBook = book
                                dismiss()
                            } label: {
                                HStack(spacing: 12) {
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color(.systemGray5))
                                        .frame(width: 40, height: 56)
                                        .overlay(
                                            Image(systemName: "book.fill")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        )

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(book.title)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                            .foregroundColor(.primary)

                                        Text(book.author)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }

                                    Spacer()

                                    if selectedBook?.id == book.id {
                                        Image(systemName: "checkmark")
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(L10n.Social.selectBook)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Social.cancel) { dismiss() }
                }
            }
        }
    }

    private var filteredBooks: [TaggedBook] {
        if searchText.isEmpty {
            return recentBooks
        }
        return recentBooks.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            $0.author.localizedCaseInsensitiveContains(searchText)
        }
    }
}

// MARK: - User Mention Picker View

struct UserMentionPickerView: View {
    @Binding var mentionedUsers: [MentionedUser]
    @Environment(\.dismiss) var dismiss
    @State private var searchText = ""
    @State private var suggestedUsers: [MentionedUser] = MentionedUser.sampleData

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField(L10n.Social.searchUsers, text: $searchText)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
                .padding()

                // User list
                List {
                    Section(L10n.Social.recommendedUsers) {
                        ForEach(filteredUsers) { user in
                            Button {
                                toggleUser(user)
                            } label: {
                                HStack(spacing: 12) {
                                    Circle()
                                        .fill(Color.blue.opacity(0.2))
                                        .frame(width: 40, height: 40)
                                        .overlay(
                                            Text(String(user.name.prefix(1)))
                                                .font(.headline)
                                                .foregroundColor(.blue)
                                        )

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(user.name)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                            .foregroundColor(.primary)

                                        Text("@\(user.username)")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }

                                    Spacer()

                                    if mentionedUsers.contains(where: { $0.id == user.id }) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(L10n.Social.selectUser)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Social.cancel) { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Social.done) { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
    }

    private var filteredUsers: [MentionedUser] {
        if searchText.isEmpty {
            return suggestedUsers
        }
        return suggestedUsers.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.username.localizedCaseInsensitiveContains(searchText)
        }
    }

    private func toggleUser(_ user: MentionedUser) {
        if let index = mentionedUsers.firstIndex(where: { $0.id == user.id }) {
            mentionedUsers.remove(at: index)
        } else {
            mentionedUsers.append(user)
        }
    }
}

// MARK: - Post Visibility

enum PostVisibility: String, CaseIterable {
    case publicPost = "public"
    case friends
    case privatePost = "private"

    var displayName: String {
        switch self {
        case .publicPost: return L10n.Social.visibilityPublic
        case .friends: return L10n.Social.visibilityFriends
        case .privatePost: return L10n.Social.visibilityPrivate
        }
    }

    var iconName: String {
        switch self {
        case .publicPost: return "globe"
        case .friends: return "person.2"
        case .privatePost: return "lock"
        }
    }
}

// MARK: - Tagged Book Model

struct TaggedBook: Identifiable {
    let id: String
    let title: String
    let author: String
    let coverUrl: String?
}

extension TaggedBook {
    static let sampleData: [TaggedBook] = [
        TaggedBook(id: "1", title: "平凡的世界", author: "路遥", coverUrl: nil),
        TaggedBook(id: "2", title: "活着", author: "余华", coverUrl: nil),
        TaggedBook(id: "3", title: "三体", author: "刘慈欣", coverUrl: nil),
        TaggedBook(id: "4", title: "围城", author: "钱钟书", coverUrl: nil),
        TaggedBook(id: "5", title: "红楼梦", author: "曹雪芹", coverUrl: nil)
    ]
}

// MARK: - Mentioned User Model

struct MentionedUser: Identifiable {
    let id: String
    let name: String
    let username: String
    let avatarUrl: String?
}

extension MentionedUser {
    static let sampleData: [MentionedUser] = [
        MentionedUser(id: "1", name: "书虫小王", username: "bookworm_wang", avatarUrl: nil),
        MentionedUser(id: "2", name: "阅读达人", username: "reading_master", avatarUrl: nil),
        MentionedUser(id: "3", name: "文学爱好者", username: "lit_lover", avatarUrl: nil),
        MentionedUser(id: "4", name: "每日阅读", username: "daily_reader", avatarUrl: nil),
        MentionedUser(id: "5", name: "书友会", username: "book_club", avatarUrl: nil)
    ]
}

// MARK: - Quote Share View

/// Specialized view for sharing book quotes with styled presentation
struct QuoteShareView: View {
    let quote: String
    let bookTitle: String
    let author: String
    @Environment(\.dismiss) var dismiss
    @State private var selectedStyle: QuoteStyle = .classic
    @State private var additionalThought = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Style picker
                    styleSelector

                    // Quote preview
                    quotePreview

                    // Additional thought
                    VStack(alignment: .leading, spacing: 8) {
                        Text(L10n.Social.addThought)
                            .font(.headline)

                        TextEditor(text: $additionalThought)
                            .frame(minHeight: 80)
                            .padding(8)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    }
                }
                .padding()
            }
            .navigationTitle(L10n.Social.shareQuote)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Social.cancel) { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Social.share) {
                        // Share quote
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private var styleSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(QuoteStyle.allCases, id: \.self) { style in
                    Button {
                        selectedStyle = style
                    } label: {
                        Text(style.displayName)
                            .font(.subheadline)
                            .foregroundColor(selectedStyle == style ? .white : .primary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedStyle == style ? Color.blue : Color(.systemGray6))
                            .cornerRadius(20)
                    }
                }
            }
        }
    }

    private var quotePreview: some View {
        VStack(spacing: 16) {
            Text("「\(quote)」")
                .font(selectedStyle.font)
                .multilineTextAlignment(.center)
                .lineSpacing(8)
                .foregroundColor(selectedStyle.textColor)

            Text("——《\(bookTitle)》\(author)")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(selectedStyle.backgroundColor)
        .cornerRadius(16)
    }
}

enum QuoteStyle: String, CaseIterable {
    case classic
    case modern
    case elegant
    case minimal

    var displayName: String {
        switch self {
        case .classic: return L10n.Social.styleClassic
        case .modern: return L10n.Social.styleModern
        case .elegant: return L10n.Social.styleElegant
        case .minimal: return L10n.Social.styleMinimal
        }
    }

    var font: Font {
        switch self {
        case .classic: return .system(.title3, design: .serif)
        case .modern: return .system(.title3, design: .rounded)
        case .elegant: return .system(.title3).italic()
        case .minimal: return .system(.body)
        }
    }

    var textColor: Color {
        switch self {
        case .classic: return .primary
        case .modern: return .blue
        case .elegant: return .purple
        case .minimal: return .secondary
        }
    }

    var backgroundColor: Color {
        switch self {
        case .classic: return Color(.systemGray6)
        case .modern: return Color.blue.opacity(0.1)
        case .elegant: return Color.purple.opacity(0.1)
        case .minimal: return Color(.systemBackground)
        }
    }
}

#Preview {
    PublishThoughtView()
}
