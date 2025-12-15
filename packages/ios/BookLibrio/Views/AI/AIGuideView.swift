import SwiftUI

/// AI Guide View showing AI-generated book introduction with topic cards
/// Provides quick insights into key themes, characters, and concepts
struct AIGuideView: View {
    let bookId: String
    let bookTitle: String
    @State private var guideTopics: [AIGuideTopic] = []
    @State private var selectedTopic: AIGuideTopic?
    @State private var isLoading = true
    @State private var expandedTopicId: String?
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerSection

                    // Quick insights
                    quickInsightsSection

                    // Topic cards
                    topicCardsSection

                    // Celebrity recommendations
                    celebrityRecsSection

                    // Reading suggestions
                    readingSuggestionsSection
                }
                .padding(.bottom, 32)
            }
            .navigationTitle("AI导读")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
            .onAppear {
                loadGuideContent()
            }
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 16) {
            // AI badge
            HStack {
                Image(systemName: "sparkles")
                    .foregroundColor(.purple)
                Text("AI 智能导读")
                    .font(.headline)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.purple.opacity(0.1))
            .cornerRadius(20)

            Text("《\(bookTitle)》")
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            Text("由 AI 为您生成的智能阅读指南")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
    }

    // MARK: - Quick Insights

    private var quickInsightsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "核心亮点", icon: "star.fill", color: .yellow)

            if isLoading {
                loadingPlaceholder(height: 100)
            } else {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    insightCard(icon: "book.fill", title: "主题", value: "成长与救赎")
                    insightCard(icon: "person.2.fill", title: "人物", value: "12位主角")
                    insightCard(icon: "clock.fill", title: "时代", value: "1960-2000")
                }
            }
        }
        .padding(.horizontal)
    }

    private func insightCard(icon: String, title: String, value: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(value)
                .font(.caption)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Topic Cards Section

    private var topicCardsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "主题探索", icon: "rectangle.stack.fill", color: .purple)

            if isLoading {
                loadingPlaceholder(height: 200)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(guideTopics) { topic in
                            topicCard(topic)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }

    private func topicCard(_ topic: AIGuideTopic) -> some View {
        Button {
            withAnimation {
                if expandedTopicId == topic.id {
                    expandedTopicId = nil
                } else {
                    expandedTopicId = topic.id
                }
            }
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                // Icon and title
                HStack {
                    Image(systemName: topic.iconName)
                        .font(.title2)
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(topic.color)
                        .cornerRadius(12)

                    Spacer()

                    Image(systemName: expandedTopicId == topic.id ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Text(topic.title)
                    .font(.headline)
                    .foregroundColor(.primary)

                Text(topic.subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)

                if expandedTopicId == topic.id {
                    Divider()

                    Text(topic.content)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        .lineSpacing(6)

                    // Related chapters
                    if !topic.relatedChapters.isEmpty {
                        HStack {
                            Image(systemName: "bookmark.fill")
                                .font(.caption)
                            Text("相关章节: \(topic.relatedChapters.joined(separator: ", "))")
                                .font(.caption)
                        }
                        .foregroundColor(.blue)
                        .padding(.top, 4)
                    }
                }
            }
            .padding()
            .frame(width: 280)
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Celebrity Recommendations

    private var celebrityRecsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "名人推荐", icon: "quote.bubble.fill", color: .orange)

            if isLoading {
                loadingPlaceholder(height: 120)
            } else {
                VStack(spacing: 12) {
                    celebrityQuoteCard(
                        name: "余华",
                        title: "作家",
                        quote: "这是一部关于生命韧性的杰作，读完让人对生活有了更深的理解。"
                    )

                    celebrityQuoteCard(
                        name: "王安忆",
                        title: "作家、评论家",
                        quote: "文字朴实却直击人心，是近年来难得的佳作。"
                    )
                }
                .padding(.horizontal)
            }
        }
    }

    private func celebrityQuoteCard(name: String, title: String, quote: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            // Avatar
            Circle()
                .fill(Color.orange.opacity(0.2))
                .frame(width: 48, height: 48)
                .overlay(
                    Text(String(name.prefix(1)))
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                )

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(name)
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Text(title)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Text("「\(quote)」")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineSpacing(4)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Reading Suggestions

    private var readingSuggestionsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "阅读建议", icon: "lightbulb.fill", color: .green)

            if isLoading {
                loadingPlaceholder(height: 150)
            } else {
                VStack(spacing: 12) {
                    suggestionRow(
                        icon: "clock",
                        title: "预计阅读时间",
                        description: "约 8-10 小时，建议分 15 次阅读完成"
                    )

                    suggestionRow(
                        icon: "bookmark",
                        title: "重点章节",
                        description: "第3章「转折」和第7章「觉醒」是核心章节"
                    )

                    suggestionRow(
                        icon: "text.quote",
                        title: "阅读技巧",
                        description: "建议边读边做笔记，关注人物内心变化"
                    )

                    suggestionRow(
                        icon: "books.vertical",
                        title: "延伸阅读",
                        description: "可搭配《活着》《平凡的世界》一起阅读"
                    )
                }
                .padding(.horizontal)
            }
        }
    }

    private func suggestionRow(icon: String, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(.green)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Helper Views

    private func sectionHeader(title: String, icon: String, color: Color) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
            Text(title)
                .font(.headline)
        }
        .padding(.horizontal)
    }

    private func loadingPlaceholder(height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color(.systemGray6))
            .frame(height: height)
            .overlay(ProgressView())
            .padding(.horizontal)
    }

    // MARK: - Data Loading

    private func loadGuideContent() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            guideTopics = [
                AIGuideTopic(
                    id: "1",
                    title: "命运与抗争",
                    subtitle: "探索主人公如何面对命运的安排",
                    content: "本书核心主题之一是对命运的思考。主人公从最初的顺从到后来的觉醒，展现了人类精神的韧性。作者通过细腻的笔触，描绘了一个普通人在时代洪流中的挣扎与坚守。",
                    iconName: "figure.walk",
                    color: .blue,
                    relatedChapters: ["第3章", "第7章", "第12章"]
                ),
                AIGuideTopic(
                    id: "2",
                    title: "亲情与羁绊",
                    subtitle: "家庭关系中的爱与牺牲",
                    content: "家庭是本书的另一条重要线索。通过三代人的故事，作者展现了中国家庭特有的情感纽带。父母对子女的期望、子女对父母的理解，构成了感人至深的情感画卷。",
                    iconName: "heart.fill",
                    color: .pink,
                    relatedChapters: ["第5章", "第9章"]
                ),
                AIGuideTopic(
                    id: "3",
                    title: "时代印记",
                    subtitle: "历史背景下的个人命运",
                    content: "故事跨越了中国近现代几个重要历史时期。作者巧妙地将个人命运与时代变迁结合，让读者在阅读中感受历史的厚重，思考个人与时代的关系。",
                    iconName: "clock.arrow.circlepath",
                    color: .orange,
                    relatedChapters: ["第1章", "第8章", "第15章"]
                ),
                AIGuideTopic(
                    id: "4",
                    title: "成长与蜕变",
                    subtitle: "人物的心理转变历程",
                    content: "主人公的成长是一个渐进的过程。从懵懂少年到成熟个体，每一次挫折都成为成长的契机。这种成长不仅是年龄的增长，更是心智的成熟。",
                    iconName: "arrow.up.right.circle",
                    color: .green,
                    relatedChapters: ["第4章", "第10章", "第14章"]
                )
            ]

            isLoading = false
        }
    }
}

// MARK: - AI Guide Topic Model

struct AIGuideTopic: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let content: String
    let iconName: String
    let color: Color
    let relatedChapters: [String]
}

// MARK: - Compact AI Guide Button

struct AIGuideButton: View {
    let bookId: String
    let bookTitle: String
    @State private var showGuide = false

    var body: some View {
        Button {
            showGuide = true
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                Text("AI导读")
            }
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundColor(.purple)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.purple.opacity(0.1))
            .cornerRadius(20)
        }
        .sheet(isPresented: $showGuide) {
            AIGuideView(bookId: bookId, bookTitle: bookTitle)
        }
    }
}

#Preview {
    AIGuideView(bookId: "1", bookTitle: "平凡的世界")
}
