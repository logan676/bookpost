import SwiftUI

/// AI-powered word/phrase lookup view
/// Shows dictionary definition, AI interpretation, and related books
struct AILookupView: View {
    let word: String
    let context: String?
    let bookTitle: String?
    @Environment(\.dismiss) var dismiss
    @State private var selectedTab: LookupTab = .dictionary
    @State private var isLoading = true
    @State private var dictionaryResult: DictionaryResult?
    @State private var aiInterpretation: String?
    @State private var relatedBooks: [RelatedBook] = []

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Word header
                wordHeader

                // Tab selector
                tabSelector

                // Content
                TabView(selection: $selectedTab) {
                    dictionaryTab
                        .tag(LookupTab.dictionary)

                    aiTab
                        .tag(LookupTab.ai)

                    relatedBooksTab
                        .tag(LookupTab.relatedBooks)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle("查词")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
            .onAppear {
                loadContent()
            }
        }
    }

    // MARK: - Word Header

    private var wordHeader: some View {
        VStack(spacing: 12) {
            Text(word)
                .font(.largeTitle)
                .fontWeight(.bold)

            if let context = context {
                Text("「\(context)」")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }

            if let bookTitle = bookTitle {
                HStack(spacing: 4) {
                    Image(systemName: "book.fill")
                        .font(.caption)
                    Text("来自《\(bookTitle)》")
                        .font(.caption)
                }
                .foregroundColor(.blue)
            }

            // Action buttons
            HStack(spacing: 24) {
                actionButton(icon: "speaker.wave.2.fill", label: "发音") {
                    // Text-to-speech
                }

                actionButton(icon: "doc.on.doc", label: "复制") {
                    UIPasteboard.general.string = word
                }

                actionButton(icon: "bookmark", label: "收藏") {
                    // Add to vocabulary
                }

                actionButton(icon: "square.and.arrow.up", label: "分享") {
                    // Share
                }
            }
            .padding(.top, 8)
        }
        .padding()
        .background(Color(.systemGray6))
    }

    private func actionButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.title3)
                Text(label)
                    .font(.caption2)
            }
            .foregroundColor(.primary)
        }
    }

    // MARK: - Tab Selector

    private var tabSelector: some View {
        HStack(spacing: 0) {
            ForEach(LookupTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 8) {
                        Text(tab.title)
                            .font(.subheadline)
                            .fontWeight(selectedTab == tab ? .semibold : .regular)
                            .foregroundColor(selectedTab == tab ? .blue : .secondary)

                        Rectangle()
                            .fill(selectedTab == tab ? Color.blue : Color.clear)
                            .frame(height: 2)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Dictionary Tab

    private var dictionaryTab: some View {
        ScrollView {
            if isLoading {
                loadingView
            } else if let result = dictionaryResult {
                VStack(alignment: .leading, spacing: 20) {
                    // Pronunciation
                    if let pinyin = result.pinyin {
                        HStack {
                            Text("拼音")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(pinyin)
                                .font(.body)
                        }
                    }

                    // Part of speech & definitions
                    ForEach(result.definitions.indices, id: \.self) { index in
                        definitionRow(result.definitions[index], index: index + 1)
                    }

                    // Etymology
                    if let etymology = result.etymology {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("词源")
                                .font(.headline)

                            Text(etymology)
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                    }

                    // Example sentences
                    if !result.examples.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("例句")
                                .font(.headline)

                            ForEach(result.examples, id: \.self) { example in
                                Text("• \(example)")
                                    .font(.body)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .padding()
            } else {
                emptyState(message: "未找到词典释义")
            }
        }
    }

    private func definitionRow(_ definition: WordDefinition, index: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\(index).")
                    .font(.headline)
                    .foregroundColor(.blue)

                if let partOfSpeech = definition.partOfSpeech {
                    Text(partOfSpeech)
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue)
                        .cornerRadius(4)
                }
            }

            Text(definition.meaning)
                .font(.body)
        }
    }

    // MARK: - AI Tab

    private var aiTab: some View {
        ScrollView {
            if isLoading {
                loadingView
            } else if let interpretation = aiInterpretation {
                VStack(alignment: .leading, spacing: 16) {
                    // AI badge
                    HStack {
                        Image(systemName: "sparkles")
                            .foregroundColor(.purple)
                        Text("AI 智能解读")
                            .font(.headline)
                    }

                    Text(interpretation)
                        .font(.body)
                        .lineSpacing(6)

                    // Context explanation
                    if context != nil {
                        Divider()

                        VStack(alignment: .leading, spacing: 8) {
                            Text("在此语境中")
                                .font(.subheadline)
                                .foregroundColor(.secondary)

                            Text("根据上下文，「\(word)」在这里表达的是...")
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                    }

                    // Related concepts
                    relatedConceptsSection
                }
                .padding()
            } else {
                emptyState(message: "AI 解读加载中...")
            }
        }
    }

    private var relatedConceptsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("相关概念")
                .font(.headline)

            FlowLayout(spacing: 8) {
                ForEach(["同义词", "反义词", "延伸阅读", "历史背景"], id: \.self) { concept in
                    Button {
                        // Show related concept
                    } label: {
                        Text(concept)
                            .font(.caption)
                            .foregroundColor(.blue)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(16)
                    }
                }
            }
        }
    }

    // MARK: - Related Books Tab

    private var relatedBooksTab: some View {
        ScrollView {
            if isLoading {
                loadingView
            } else if !relatedBooks.isEmpty {
                VStack(alignment: .leading, spacing: 16) {
                    Text("包含「\(word)」的书籍")
                        .font(.headline)
                        .padding(.horizontal)

                    ForEach(relatedBooks) { book in
                        relatedBookRow(book)
                    }
                }
                .padding(.vertical)
            } else {
                emptyState(message: "暂无相关书籍推荐")
            }
        }
    }

    private func relatedBookRow(_ book: RelatedBook) -> some View {
        HStack(spacing: 12) {
            // Cover
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray5))
                .frame(width: 50, height: 68)
                .overlay(
                    Image(systemName: "book.fill")
                        .foregroundColor(.secondary)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text(book.author)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text("出现 \(book.occurrences) 次")
                    .font(.caption2)
                    .foregroundColor(.blue)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    // MARK: - Helper Views

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("加载中...")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 60)
    }

    private func emptyState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.largeTitle)
                .foregroundColor(.secondary)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 60)
    }

    // MARK: - Data Loading

    private func loadContent() {
        // Simulate loading
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            dictionaryResult = DictionaryResult(
                word: word,
                pinyin: "cí hǎi",
                definitions: [
                    WordDefinition(partOfSpeech: "名词", meaning: "大型综合性辞书，收录词语、百科知识等"),
                    WordDefinition(partOfSpeech: "比喻", meaning: "知识的海洋，形容知识丰富")
                ],
                etymology: "「辞海」一词源于古代对知识汇集的形象比喻，将文字词汇比作汪洋大海。",
                examples: [
                    "这本辞海收录了十万余条词目。",
                    "他的脑海就像一部活辞海，什么都知道。"
                ]
            )

            aiInterpretation = """
            「\(word)」是一个富有文化内涵的词汇。

            从字面意思理解，它由"辞"（文字、言辞）和"海"（海洋、广阔）组成，形象地表达了词汇知识如海洋般浩瀚无边的意境。

            在实际使用中，它主要有两个含义：
            1. 作为专有名词，指代由中华书局出版的大型综合性辞书《辞海》
            2. 作为普通名词，泛指收录大量词汇的词典或知识库

            这个词体现了中国人对知识的敬畏和追求，将知识比作海洋，既表达了知识的广博，也暗示了学习的无穷无尽。
            """

            relatedBooks = [
                RelatedBook(id: "1", title: "辞海（第七版）", author: "辞海编辑委员会", occurrences: 1),
                RelatedBook(id: "2", title: "现代汉语词典", author: "中国社会科学院", occurrences: 3),
                RelatedBook(id: "3", title: "汉语大词典", author: "汉语大词典编辑委员会", occurrences: 2)
            ]

            isLoading = false
        }
    }
}

// MARK: - Supporting Types

enum LookupTab: String, CaseIterable {
    case dictionary
    case ai
    case relatedBooks

    var title: String {
        switch self {
        case .dictionary: return "词典"
        case .ai: return "AI解读"
        case .relatedBooks: return "相关书籍"
        }
    }
}

struct DictionaryResult {
    let word: String
    let pinyin: String?
    let definitions: [WordDefinition]
    let etymology: String?
    let examples: [String]
}

struct WordDefinition {
    let partOfSpeech: String?
    let meaning: String
}

struct RelatedBook: Identifiable {
    let id: String
    let title: String
    let author: String
    let occurrences: Int
}

// MARK: - Quick Lookup Button

struct QuickLookupButton: View {
    let word: String
    @State private var showLookup = false

    var body: some View {
        Button {
            showLookup = true
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "character.book.closed.fill")
                Text("查词")
            }
            .font(.caption)
            .foregroundColor(.blue)
        }
        .sheet(isPresented: $showLookup) {
            AILookupView(word: word, context: nil, bookTitle: nil)
        }
    }
}

#Preview {
    AILookupView(
        word: "辞海",
        context: "他翻开那本厚重的辞海，开始查找这个生僻字的含义。",
        bookTitle: "读书随想录"
    )
}
