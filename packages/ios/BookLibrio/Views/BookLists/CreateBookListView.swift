/**
 * Create Book List View
 * Form for creating a new book list
 */

import SwiftUI

struct CreateBookListView: View {
    var onCreate: ((BookList) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var isPublic = true
    @State private var selectedCategory: BookListCategory = .literature
    @State private var tags: [String] = []
    @State private var newTag = ""
    @State private var isCreating = false
    @State private var errorMessage: String?

    @FocusState private var focusedField: Field?

    enum Field {
        case title, description, tag
    }

    var body: some View {
        NavigationStack {
            Form {
                // Basic Info Section
                Section {
                    TextField(L10n.BookList.titlePlaceholder, text: $title)
                        .focused($focusedField, equals: .title)

                    TextField(L10n.BookList.descriptionPlaceholder, text: $description, axis: .vertical)
                        .focused($focusedField, equals: .description)
                        .lineLimit(3...6)
                } header: {
                    Text(L10n.BookList.basicInfo)
                }

                // Category Section
                Section {
                    Picker(L10n.BookList.category, selection: $selectedCategory) {
                        ForEach(BookListCategory.allCases.filter { $0 != .all }) { category in
                            Label(category.displayName, systemImage: category.iconName)
                                .tag(category)
                        }
                    }
                    .pickerStyle(.navigationLink)
                } header: {
                    Text(L10n.BookList.categorySection)
                }

                // Tags Section
                Section {
                    // Existing tags
                    if !tags.isEmpty {
                        FlowLayout(spacing: 8) {
                            ForEach(tags, id: \.self) { tag in
                                TagChip(tag: tag) {
                                    tags.removeAll { $0 == tag }
                                }
                            }
                        }
                    }

                    // Add new tag
                    HStack {
                        TextField(L10n.BookList.addTag, text: $newTag)
                            .focused($focusedField, equals: .tag)
                            .onSubmit {
                                addTag()
                            }

                        Button {
                            addTag()
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.accentColor)
                        }
                        .disabled(newTag.isEmpty || tags.count >= 5)
                    }
                } header: {
                    Text(L10n.BookList.tagsSection)
                } footer: {
                    Text(L10n.BookList.tagsHint)
                }

                // Privacy Section
                Section {
                    Toggle(isOn: $isPublic) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(L10n.BookList.public)
                            Text(L10n.BookList.publicHint)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text(L10n.BookList.privacy)
                }

                // Error message
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle(L10n.BookList.createTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Common.cancel) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        createList()
                    } label: {
                        if isCreating {
                            ProgressView()
                        } else {
                            Text(L10n.BookList.create)
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(title.isEmpty || isCreating)
                }
            }
            .onAppear {
                focusedField = .title
            }
        }
    }

    private func addTag() {
        let trimmed = newTag.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !tags.contains(trimmed), tags.count < 5 else { return }
        tags.append(trimmed)
        newTag = ""
    }

    private func createList() {
        isCreating = true
        errorMessage = nil

        Task {
            let request = CreateBookListRequest(
                title: title,
                description: description.isEmpty ? nil : description,
                isPublic: isPublic,
                category: selectedCategory.rawValue,
                tags: tags.isEmpty ? nil : tags
            )

            do {
                let response = try await APIClient.shared.createBookList(request: request)
                await MainActor.run {
                    onCreate?(response.data)
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isCreating = false
                }
            }
        }
    }
}

// MARK: - Tag Chip

struct TagChip: View {
    let tag: String
    var onRemove: (() -> Void)?

    var body: some View {
        HStack(spacing: 4) {
            Text("#\(tag)")
                .font(.caption)

            if onRemove != nil {
                Button {
                    onRemove?()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.caption)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .foregroundColor(.accentColor)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.accentColor.opacity(0.1))
        .clipShape(Capsule())
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.width ?? 0,
            subviews: subviews,
            spacing: spacing
        )
        return CGSize(width: proposal.width ?? 0, height: result.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )

        for (index, subview) in subviews.enumerated() {
            let position = result.positions[index]
            subview.place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: ProposedViewSize(subview.sizeThatFits(.unspecified))
            )
        }
    }

    struct FlowResult {
        var positions: [CGPoint] = []
        var height: CGFloat = 0

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                x += size.width + spacing
                lineHeight = max(lineHeight, size.height)
            }

            height = y + lineHeight
        }
    }
}

// MARK: - Preview

#Preview {
    CreateBookListView()
}
