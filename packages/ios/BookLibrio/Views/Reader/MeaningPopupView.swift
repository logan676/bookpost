import SwiftUI

/// Popup view for displaying AI-generated meaning/explanation
struct MeaningPopupView: View {
    let selectedText: String
    let paragraph: String  // Context paragraph containing the selected text
    let onDismiss: () -> Void

    @State private var meaning: String = ""
    @State private var isLoading = true
    @State private var errorMessage: String?

    @Environment(\.locale) var locale

    init(selectedText: String, paragraph: String = "", onDismiss: @escaping () -> Void) {
        self.selectedText = selectedText
        self.paragraph = paragraph.isEmpty ? selectedText : paragraph
        self.onDismiss = onDismiss
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Label(L10n.AI.meaning, systemImage: "sparkles")
                    .font(.headline)
                    .foregroundColor(.primary)

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
            }

            Divider()

            // Selected text preview
            VStack(alignment: .leading, spacing: 4) {
                Text(L10n.AI.selectedText)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(selectedText)
                    .font(.subheadline)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.yellow.opacity(0.2))
                    .cornerRadius(8)
                    .lineLimit(3)
            }

            // Content area
            ScrollView {
                if isLoading {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text(L10n.AI.analyzing)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                } else if let error = errorMessage {
                    VStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.title2)
                            .foregroundColor(.orange)
                        Text(error)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        Button(L10n.Common.retry) {
                            Task { await loadMeaning() }
                        }
                        .buttonStyle(.bordered)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                } else {
                    MarkdownTextView(text: meaning)
                        .font(.subheadline)
                }
            }
            .frame(maxHeight: 300)
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.2), radius: 16, x: 0, y: 8)
        .frame(maxWidth: 340)
        .task {
            await loadMeaning()
        }
    }

    private func loadMeaning() async {
        isLoading = true
        errorMessage = nil

        // Use device language to determine output language
        let deviceLanguage = Locale.current.language.languageCode?.identifier ?? "en"
        let targetLanguage = deviceLanguage.hasPrefix("zh") ? "zh" : "en"

        do {
            meaning = try await APIClient.shared.getMeaning(
                text: selectedText,
                paragraph: paragraph,
                targetLanguage: targetLanguage
            )
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

/// Simple markdown text renderer
struct MarkdownTextView: View {
    let text: String

    var body: some View {
        // Use AttributedString for basic markdown rendering
        if let attributed = try? AttributedString(markdown: text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)) {
            Text(attributed)
                .textSelection(.enabled)
        } else {
            Text(text)
                .textSelection(.enabled)
        }
    }
}

// MARK: - Ideas Popup View

/// Popup view for viewing and managing ideas associated with an underline
struct IdeasPopupView: View {
    let underlineId: Int
    let bookType: String  // "ebook" or "magazine"
    let selectedText: String
    let onDismiss: () -> Void
    let onIdeaCountChanged: (Int) -> Void

    @State private var ideas: [Idea] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var newIdeaText = ""
    @State private var editingIdeaId: Int?
    @State private var editingText = ""
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Label(L10n.Stats.ideas, systemImage: "lightbulb")
                    .font(.headline)
                    .foregroundColor(.primary)

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
            }

            Divider()

            // Selected text preview
            Text(selectedText)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
                .padding(8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.yellow.opacity(0.15))
                .cornerRadius(6)

            // Ideas list
            if isLoading {
                HStack {
                    ProgressView()
                    Text(L10n.Common.loading)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else if let error = errorMessage {
                VStack(spacing: 8) {
                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Button(L10n.Common.retry) {
                        Task { await loadIdeas() }
                    }
                    .buttonStyle(.bordered)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        if ideas.isEmpty {
                            Text(L10n.Notes.noIdeas)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .padding(.vertical, 16)
                        } else {
                            ForEach(ideas) { idea in
                                ideaRow(idea)
                            }
                        }
                    }
                }
                .frame(maxHeight: 200)
            }

            Divider()

            // Add new idea input
            HStack(spacing: 8) {
                TextField(L10n.Notes.addIdea, text: $newIdeaText)
                    .textFieldStyle(.roundedBorder)
                    .focused($isInputFocused)
                    .onSubmit {
                        Task { await saveNewIdea() }
                    }

                Button(action: { Task { await saveNewIdea() } }) {
                    Image(systemName: "paperplane.fill")
                        .foregroundColor(newIdeaText.isEmpty ? .gray : .blue)
                }
                .disabled(newIdeaText.isEmpty)
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.2), radius: 16, x: 0, y: 8)
        .frame(maxWidth: 340)
        .task {
            await loadIdeas()
        }
    }

    @ViewBuilder
    private func ideaRow(_ idea: Idea) -> some View {
        HStack(alignment: .top, spacing: 8) {
            if editingIdeaId == idea.id {
                // Editing mode
                TextField("", text: $editingText)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit {
                        Task { await updateIdea(idea) }
                    }

                Button(action: { Task { await updateIdea(idea) } }) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }

                Button(action: { editingIdeaId = nil }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.red)
                }
            } else {
                // Display mode
                Text(idea.content)
                    .font(.subheadline)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Button(action: {
                    editingIdeaId = idea.id
                    editingText = idea.content
                }) {
                    Image(systemName: "pencil")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Button(action: { Task { await deleteIdea(idea) } }) {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(8)
    }

    private func loadIdeas() async {
        isLoading = true
        errorMessage = nil

        do {
            if bookType == "ebook" {
                ideas = try await APIClient.shared.getEbookUnderlineIdeas(underlineId: underlineId)
            } else {
                ideas = try await APIClient.shared.getMagazineUnderlineIdeas(underlineId: underlineId)
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func saveNewIdea() async {
        guard !newIdeaText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        do {
            if bookType == "ebook" {
                _ = try await APIClient.shared.createEbookUnderlineIdea(underlineId: underlineId, content: newIdeaText.trimmingCharacters(in: .whitespacesAndNewlines))
            } else {
                _ = try await APIClient.shared.createMagazineUnderlineIdea(underlineId: underlineId, content: newIdeaText.trimmingCharacters(in: .whitespacesAndNewlines))
            }
            newIdeaText = ""
            await loadIdeas()
            onIdeaCountChanged(ideas.count)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func updateIdea(_ idea: Idea) async {
        guard !editingText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        do {
            if bookType == "ebook" {
                _ = try await APIClient.shared.updateEbookIdea(ideaId: idea.id, content: editingText.trimmingCharacters(in: .whitespacesAndNewlines))
            } else {
                _ = try await APIClient.shared.updateMagazineIdea(ideaId: idea.id, content: editingText.trimmingCharacters(in: .whitespacesAndNewlines))
            }
            editingIdeaId = nil
            await loadIdeas()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteIdea(_ idea: Idea) async {
        do {
            if bookType == "ebook" {
                _ = try await APIClient.shared.deleteEbookIdea(ideaId: idea.id)
            } else {
                _ = try await APIClient.shared.deleteMagazineIdea(ideaId: idea.id)
            }
            await loadIdeas()
            onIdeaCountChanged(ideas.count)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Idea Input Bubble

/// Inline bubble for quickly adding an idea after creating an underline
struct IdeaInputBubble: View {
    let onSave: (String) -> Void
    let onSkip: () -> Void

    @State private var ideaText = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 8) {
            TextField(L10n.Notes.addIdea, text: $ideaText, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...3)
                .focused($isFocused)
                .onSubmit {
                    if !ideaText.isEmpty {
                        onSave(ideaText)
                    }
                }

            HStack(spacing: 12) {
                Button(action: onSkip) {
                    Text(L10n.Notes.skip)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Button(action: {
                    if !ideaText.isEmpty {
                        onSave(ideaText)
                    } else {
                        onSkip()
                    }
                }) {
                    Text(L10n.Common.save)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                        .background(ideaText.isEmpty ? Color.gray : Color.blue)
                        .cornerRadius(16)
                }
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
        .frame(width: 260)
        .onAppear {
            isFocused = true
        }
    }
}

// MARK: - Image Analysis Popup

/// Popup view for displaying AI image analysis
struct ImageAnalysisPopupView: View {
    let image: UIImage
    let onDismiss: () -> Void

    @State private var explanation: String = ""
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Label(L10n.AI.imageAnalysis, systemImage: "photo.badge.magnifyingglass")
                    .font(.headline)
                    .foregroundColor(.primary)

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
            }
            .padding()

            Divider()

            // Image preview
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 200)
                .cornerRadius(8)
                .padding()

            Divider()

            // Analysis content
            ScrollView {
                if isLoading {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text(L10n.AI.analyzingImage)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 20)
                } else if let error = errorMessage {
                    VStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.title2)
                            .foregroundColor(.orange)
                        Text(error)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Button(L10n.Common.retry) {
                            Task { await analyzeImage() }
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.vertical, 20)
                } else {
                    MarkdownTextView(text: explanation)
                        .font(.subheadline)
                        .padding()
                }
            }
            .frame(maxHeight: 250)
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
        .frame(maxWidth: 360)
        .task {
            await analyzeImage()
        }
    }

    private func analyzeImage() async {
        isLoading = true
        errorMessage = nil

        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            errorMessage = "Failed to process image"
            isLoading = false
            return
        }

        // Get user's preferred language
        let targetLanguage = Locale.current.language.languageCode?.identifier == "zh" ? "zh" : "en"

        do {
            explanation = try await APIClient.shared.explainImage(imageData: imageData, targetLanguage: targetLanguage)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Previews

#Preview("Meaning Popup") {
    MeaningPopupView(
        selectedText: "The quick brown fox jumps over the lazy dog.",
        onDismiss: {}
    )
    .padding()
    .background(Color.gray.opacity(0.3))
}

#Preview("Ideas Popup") {
    IdeasPopupView(
        underlineId: 1,
        bookType: "ebook",
        selectedText: "Selected text here",
        onDismiss: {},
        onIdeaCountChanged: { _ in }
    )
    .padding()
    .background(Color.gray.opacity(0.3))
}

#Preview("Idea Input") {
    IdeaInputBubble(
        onSave: { _ in },
        onSkip: {}
    )
    .padding()
    .background(Color.gray.opacity(0.3))
}
