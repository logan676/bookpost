import SwiftUI

/// AI Question & Answer view for asking questions about books
/// Provides chat-like interface with context from the current book
struct AIQuestionView: View {
    let bookId: Int
    let bookTitle: String
    let bookType: BookType
    let selectedText: String?

    @StateObject private var viewModel = AIQuestionViewModel()
    @Environment(\.dismiss) var dismiss
    @FocusState private var isInputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Chat messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            // Context banner if text was selected
                            if let text = selectedText, !text.isEmpty {
                                contextBanner(text: text)
                                    .id("context")
                            }

                            // Welcome message
                            if viewModel.messages.isEmpty {
                                welcomeMessage
                            }

                            // Messages
                            ForEach(viewModel.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }

                            // Loading indicator
                            if viewModel.isLoading {
                                HStack {
                                    LoadingDots()
                                    Spacer()
                                }
                                .padding(.horizontal)
                                .id("loading")
                            }
                        }
                        .padding()
                    }
                    .onChange(of: viewModel.messages.count) { _, _ in
                        withAnimation {
                            if let lastId = viewModel.messages.last?.id {
                                proxy.scrollTo(lastId, anchor: .bottom)
                            } else {
                                proxy.scrollTo("loading", anchor: .bottom)
                            }
                        }
                    }
                }

                Divider()

                // Input area
                inputArea
            }
            .navigationTitle(L10n.AI.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            viewModel.clearHistory()
                        } label: {
                            Label(L10n.AI.clearChat, systemImage: "trash")
                        }

                        Button {
                            // Export conversation
                        } label: {
                            Label(L10n.AI.exportChat, systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .onAppear {
            viewModel.configure(bookId: bookId, bookType: bookType, context: selectedText)
        }
    }

    // MARK: - Context Banner

    private func contextBanner(text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "text.quote")
                    .foregroundColor(.blue)
                Text(L10n.AI.selectedText)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
                .lineLimit(4)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Welcome Message

    private var welcomeMessage: some View {
        VStack(spacing: 16) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundColor(.blue)

            Text(L10n.AI.readingAssistant)
                .font(.title2)
                .fontWeight(.semibold)

            Text(L10n.AI.welcomeDescription(bookTitle))
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            // Suggested questions
            VStack(spacing: 8) {
                Text(L10n.AI.tryAsking)
                    .font(.caption)
                    .foregroundColor(.secondary)

                ForEach(suggestedQuestions, id: \.self) { question in
                    Button {
                        viewModel.inputText = question
                        Task {
                            await viewModel.sendMessage()
                        }
                    } label: {
                        Text(question)
                            .font(.subheadline)
                            .foregroundColor(.blue)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(16)
                    }
                }
            }
        }
        .padding(.vertical, 40)
    }

    private var suggestedQuestions: [String] {
        [
            L10n.AI.suggestedMain,
            L10n.AI.suggestedExplain,
            L10n.AI.suggestedWhy
        ]
    }

    // MARK: - Input Area

    private var inputArea: some View {
        HStack(spacing: 12) {
            // Text field
            TextField(L10n.AI.inputPlaceholder, text: $viewModel.inputText, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1...5)
                .focused($isInputFocused)
                .padding(12)
                .background(Color(.systemGray6))
                .cornerRadius(20)

            // Send button
            Button {
                Task {
                    await viewModel.sendMessage()
                }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(viewModel.canSend ? .blue : .gray)
            }
            .disabled(!viewModel.canSend)
        }
        .padding()
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: AIMessage

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if message.isUser {
                Spacer(minLength: 60)
            } else {
                // AI avatar
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Image(systemName: "sparkles")
                            .font(.caption)
                            .foregroundColor(.blue)
                    )
            }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.body)
                    .foregroundColor(message.isUser ? .white : .primary)
                    .padding(12)
                    .background(
                        message.isUser
                            ? Color.blue
                            : Color(.systemGray6)
                    )
                    .aiCornerRadius(16, corners: message.isUser
                        ? [.topLeft, .topRight, .bottomLeft]
                        : [.topLeft, .topRight, .bottomRight])

                if !message.isUser {
                    HStack(spacing: 16) {
                        Button {
                            // Copy action
                            UIPasteboard.general.string = message.content
                        } label: {
                            Image(systemName: "doc.on.doc")
                                .font(.caption)
                        }

                        Button {
                            // Bookmark action
                        } label: {
                            Image(systemName: "bookmark")
                                .font(.caption)
                        }
                    }
                    .foregroundColor(.secondary)
                    .padding(.leading, 4)
                }
            }

            if !message.isUser {
                Spacer(minLength: 60)
            }
        }
    }
}

// MARK: - Rounded Corner Extension

extension View {
    func aiCornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(AIRoundedCorner(radius: radius, corners: corners))
    }
}

struct AIRoundedCorner: Shape {
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

// MARK: - Loading Dots

struct LoadingDots: View {
    @State private var dotCount = 0

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(Color.blue.opacity(0.2))
                .frame(width: 32, height: 32)
                .overlay(
                    Image(systemName: "sparkles")
                        .font(.caption)
                        .foregroundColor(.blue)
                )

            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(Color(.systemGray4))
                        .frame(width: 8, height: 8)
                        .opacity(dotCount > index ? 1 : 0.3)
                }
            }
            .padding(12)
            .background(Color(.systemGray6))
            .cornerRadius(16)
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { _ in
                withAnimation {
                    dotCount = (dotCount + 1) % 4
                }
            }
        }
    }
}

// MARK: - AI Message Model

struct AIMessage: Identifiable, Equatable {
    let id: UUID
    let content: String
    let isUser: Bool
    let timestamp: Date

    init(content: String, isUser: Bool) {
        self.id = UUID()
        self.content = content
        self.isUser = isUser
        self.timestamp = Date()
    }
}

// MARK: - ViewModel

@MainActor
class AIQuestionViewModel: ObservableObject {
    @Published var messages: [AIMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false

    private var bookId: Int = 0
    private var bookType: BookType = .ebook
    private var context: String?

    var canSend: Bool {
        !inputText.trimmingCharacters(in: .whitespaces).isEmpty && !isLoading
    }

    func configure(bookId: Int, bookType: BookType, context: String?) {
        self.bookId = bookId
        self.bookType = bookType
        self.context = context
    }

    func sendMessage() async {
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }

        // Add user message
        let userMessage = AIMessage(content: text, isUser: true)
        messages.append(userMessage)
        inputText = ""
        isLoading = true

        do {
            // Call AI API
            let response = try await APIClient.shared.askAIQuestion(
                bookId: bookId,
                bookType: bookType.rawValue,
                question: text,
                context: context
            )

            // Add AI response
            let aiMessage = AIMessage(content: response.answer, isUser: false)
            messages.append(aiMessage)
        } catch {
            // Show error message
            let errorMessage = AIMessage(
                content: L10n.AI.errorMessage,
                isUser: false
            )
            messages.append(errorMessage)
            print("AI question error: \(error)")
        }

        isLoading = false
    }

    func clearHistory() {
        messages.removeAll()
    }
}

// MARK: - API Extension (placeholder)

extension APIClient {
    struct AIQuestionResponse: Decodable {
        let answer: String
    }

    func askAIQuestion(bookId: Int, bookType: String, question: String, context: String?) async throws -> AIQuestionResponse {
        // Placeholder - implement actual API call
        // For now, return a simulated response
        try await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 second delay

        // Simulated responses based on question keywords
        let answers = [
            "这是一个很好的问题！根据书中的内容，这个概念主要指的是...",
            "作者在这里想要表达的观点是...",
            "这个问题涉及到书中第三章的核心内容...",
            "让我为你解释一下这个概念的背景..."
        ]

        return AIQuestionResponse(answer: answers.randomElement()!)
    }
}

// MARK: - Word Lookup View

/// Quick word/phrase lookup overlay
struct WordLookupView: View {
    let word: String
    let onDismiss: () -> Void

    @State private var definition: String?
    @State private var isLoading = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(word)
                    .font(.headline)

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }

            Divider()

            // Content
            if isLoading {
                HStack {
                    ProgressView()
                    Text(L10n.AI.lookingUp)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            } else if let definition = definition {
                Text(definition)
                    .font(.subheadline)
            } else {
                Text(L10n.AI.noDefinition)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Actions
            HStack(spacing: 16) {
                Button {
                    UIPasteboard.general.string = word
                } label: {
                    Label(L10n.AI.copy, systemImage: "doc.on.doc")
                        .font(.caption)
                }

                Button {
                    // Add to vocabulary
                } label: {
                    Label(L10n.AI.addToVocabulary, systemImage: "plus.circle")
                        .font(.caption)
                }

                Spacer()
            }
            .foregroundColor(.blue)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThickMaterial)
                .shadow(color: .black.opacity(0.15), radius: 10, x: 0, y: 4)
        )
        .task {
            await lookupWord()
        }
    }

    private func lookupWord() async {
        // Simulated lookup
        try? await Task.sleep(nanoseconds: 800_000_000)
        definition = L10n.AI.sampleDefinition(word)
        isLoading = false
    }
}

#Preview {
    AIQuestionView(
        bookId: 1,
        bookTitle: "人类简史",
        bookType: .ebook,
        selectedText: "认知革命"
    )
}
