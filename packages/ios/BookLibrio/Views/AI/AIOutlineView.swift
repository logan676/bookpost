import SwiftUI

/// AI-generated book outline view
/// Shows hierarchical structure of the book with AI summaries for each section
struct AIOutlineView: View {
    let bookId: String
    let bookTitle: String
    @State private var outline: [OutlineSection] = []
    @State private var isLoading = true
    @State private var expandedSections: Set<String> = []
    @State private var searchText = ""
    @State private var selectedViewMode: OutlineViewMode = .tree
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // View mode selector
                viewModeSelector

                // Search bar
                searchBar

                // Content
                if isLoading {
                    loadingView
                } else if filteredOutline.isEmpty {
                    emptyState
                } else {
                    outlineContent
                }
            }
            .navigationTitle("AI大纲")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("关闭") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            expandAll()
                        } label: {
                            Label("展开全部", systemImage: "arrow.down.right.and.arrow.up.left")
                        }

                        Button {
                            collapseAll()
                        } label: {
                            Label("折叠全部", systemImage: "arrow.up.left.and.arrow.down.right")
                        }

                        Divider()

                        Button {
                            // Export outline
                        } label: {
                            Label("导出大纲", systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .onAppear {
                loadOutline()
            }
        }
    }

    // MARK: - View Mode Selector

    private var viewModeSelector: some View {
        Picker("视图模式", selection: $selectedViewMode) {
            ForEach(OutlineViewMode.allCases, id: \.self) { mode in
                Text(mode.displayName).tag(mode)
            }
        }
        .pickerStyle(.segmented)
        .padding()
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)

            TextField("搜索章节或关键词", text: $searchText)
                .textFieldStyle(.plain)

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(10)
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal)
        .padding(.bottom, 8)
    }

    // MARK: - Outline Content

    private var filteredOutline: [OutlineSection] {
        guard !searchText.isEmpty else { return outline }

        return outline.compactMap { section in
            filterSection(section, searchText: searchText.lowercased())
        }
    }

    private func filterSection(_ section: OutlineSection, searchText: String) -> OutlineSection? {
        let titleMatches = section.title.lowercased().contains(searchText)
        let summaryMatches = section.aiSummary?.lowercased().contains(searchText) ?? false
        let keywordsMatch = section.keywords.contains { $0.lowercased().contains(searchText) }

        let filteredChildren = section.children.compactMap { filterSection($0, searchText: searchText) }

        if titleMatches || summaryMatches || keywordsMatch || !filteredChildren.isEmpty {
            var result = section
            result.children = filteredChildren
            return result
        }

        return nil
    }

    private var outlineContent: some View {
        ScrollView {
            switch selectedViewMode {
            case .tree:
                treeView
            case .list:
                listView
            case .mindmap:
                mindmapView
            }
        }
    }

    // MARK: - Tree View

    private var treeView: some View {
        LazyVStack(spacing: 0) {
            ForEach(filteredOutline) { section in
                outlineSectionRow(section, level: 0)
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private func outlineSectionRow(_ section: OutlineSection, level: Int) -> some View {
        VStack(spacing: 0) {
            // Section header
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    if expandedSections.contains(section.id) {
                        expandedSections.remove(section.id)
                    } else {
                        expandedSections.insert(section.id)
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    // Indent
                    ForEach(0..<level, id: \.self) { _ in
                        Rectangle()
                            .fill(Color.clear)
                            .frame(width: 20)
                    }

                    // Expand indicator
                    if !section.children.isEmpty {
                        Image(systemName: expandedSections.contains(section.id) ? "chevron.down" : "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(width: 16)
                    } else {
                        Circle()
                            .fill(levelColor(level))
                            .frame(width: 8, height: 8)
                            .padding(.horizontal, 4)
                    }

                    // Title
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(section.title)
                                .font(.subheadline)
                                .fontWeight(level == 0 ? .semibold : .regular)
                                .foregroundColor(.primary)

                            if section.isKeySection {
                                Image(systemName: "star.fill")
                                    .font(.caption2)
                                    .foregroundColor(.yellow)
                            }
                        }

                        // Page range
                        if let pages = section.pageRange {
                            Text("P.\(pages)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()

                    // Reading progress
                    if let progress = section.readingProgress {
                        Text("\(Int(progress * 100))%")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 12)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // AI Summary (when expanded)
            if expandedSections.contains(section.id), let summary = section.aiSummary {
                aiSummaryCard(summary, keywords: section.keywords, level: level)
            }

            // Children (non-recursive approach using Group)
            if expandedSections.contains(section.id) {
                ForEach(section.children) { child in
                    childSectionRow(child, level: level + 1)
                }
            }

            Divider()
                .padding(.leading, CGFloat(level * 20 + 24))
        }
    }

    // Separate function for children to avoid recursion type inference issues
    private func childSectionRow(_ section: OutlineSection, level: Int) -> AnyView {
        AnyView(outlineSectionRow(section, level: level))
    }

    private func aiSummaryCard(_ summary: String, keywords: [String], level: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "sparkles")
                    .font(.caption)
                Text("AI摘要")
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .foregroundColor(.purple)

            Text(summary)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineSpacing(4)

            if !keywords.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(keywords, id: \.self) { keyword in
                            Text(keyword)
                                .font(.caption2)
                                .foregroundColor(.blue)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
        .padding(.leading, CGFloat(level * 20 + 24))
        .padding(.trailing)
        .padding(.bottom, 8)
    }

    private func levelColor(_ level: Int) -> Color {
        switch level {
        case 0: return .blue
        case 1: return .green
        case 2: return .orange
        default: return .gray
        }
    }

    // MARK: - List View

    private var listView: some View {
        LazyVStack(spacing: 12) {
            ForEach(flattenedOutline) { item in
                listItemCard(item)
            }
        }
        .padding()
    }

    private var flattenedOutline: [OutlineSection] {
        var result: [OutlineSection] = []

        func flatten(_ sections: [OutlineSection]) {
            for section in sections {
                result.append(section)
                flatten(section.children)
            }
        }

        flatten(filteredOutline)
        return result
    }

    private func listItemCard(_ section: OutlineSection) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(section.title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if section.isKeySection {
                    Text("重点")
                        .font(.caption2)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.orange)
                        .cornerRadius(4)
                }

                Spacer()

                if let pages = section.pageRange {
                    Text("P.\(pages)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            if let summary = section.aiSummary {
                Text(summary)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    // MARK: - Mindmap View

    private var mindmapView: some View {
        VStack(spacing: 24) {
            // Center node (book title)
            Text(bookTitle)
                .font(.headline)
                .fontWeight(.bold)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)

            // First level nodes in a circle pattern
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(filteredOutline.prefix(6)) { section in
                    mindmapNode(section)
                }
            }
            .padding()
        }
        .padding()
    }

    private func mindmapNode(_ section: OutlineSection) -> some View {
        VStack(spacing: 8) {
            Text(section.title)
                .font(.caption)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
                .lineLimit(2)

            if !section.children.isEmpty {
                Text("+\(section.children.count)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Helper Views

    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer()
            ProgressView()
            Text("AI正在生成大纲...")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 50))
                .foregroundColor(.secondary)
            Text("未找到匹配内容")
                .font(.headline)
                .foregroundColor(.secondary)
            Text("尝试其他关键词")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
        }
    }

    // MARK: - Actions

    private func expandAll() {
        func getAllIds(_ sections: [OutlineSection]) -> Set<String> {
            var ids = Set<String>()
            for section in sections {
                ids.insert(section.id)
                ids.formUnion(getAllIds(section.children))
            }
            return ids
        }

        expandedSections = getAllIds(outline)
    }

    private func collapseAll() {
        expandedSections.removeAll()
    }

    // MARK: - Data Loading

    private func loadOutline() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            outline = [
                OutlineSection(
                    id: "1",
                    title: "第一部 少年时代",
                    pageRange: "1-120",
                    aiSummary: "讲述主人公的童年和青少年时期，建立了故事的基础背景和人物关系。",
                    keywords: ["童年", "家庭", "成长"],
                    isKeySection: true,
                    readingProgress: 1.0,
                    children: [
                        OutlineSection(id: "1-1", title: "第一章 黄土地", pageRange: "1-25", aiSummary: "介绍故事发生的地点和时代背景。", keywords: ["环境", "背景"], isKeySection: false, readingProgress: 1.0, children: []),
                        OutlineSection(id: "1-2", title: "第二章 家", pageRange: "26-50", aiSummary: "描写主人公的家庭成员和家庭关系。", keywords: ["家庭", "亲情"], isKeySection: false, readingProgress: 1.0, children: []),
                        OutlineSection(id: "1-3", title: "第三章 学校", pageRange: "51-80", aiSummary: "主人公的求学经历和梦想的萌芽。", keywords: ["教育", "梦想"], isKeySection: true, readingProgress: 1.0, children: [])
                    ]
                ),
                OutlineSection(
                    id: "2",
                    title: "第二部 青年奋斗",
                    pageRange: "121-280",
                    aiSummary: "主人公离开家乡，在城市中寻找自己的人生道路。",
                    keywords: ["奋斗", "城市", "挫折"],
                    isKeySection: true,
                    readingProgress: 0.6,
                    children: [
                        OutlineSection(id: "2-1", title: "第四章 离乡", pageRange: "121-150", aiSummary: "主人公告别家乡，踏上新的征程。", keywords: ["离别", "期望"], isKeySection: false, readingProgress: 1.0, children: []),
                        OutlineSection(id: "2-2", title: "第五章 初到城市", pageRange: "151-190", aiSummary: "描写主人公在城市的初次体验和困惑。", keywords: ["适应", "挑战"], isKeySection: false, readingProgress: 0.5, children: []),
                        OutlineSection(id: "2-3", title: "第六章 爱情", pageRange: "191-230", aiSummary: "主人公的感情线展开。", keywords: ["爱情", "选择"], isKeySection: true, readingProgress: 0.3, children: [])
                    ]
                ),
                OutlineSection(
                    id: "3",
                    title: "第三部 成熟与回归",
                    pageRange: "281-400",
                    aiSummary: "经历磨难后的主人公对人生有了新的理解，最终找到内心的平静。",
                    keywords: ["成熟", "回归", "和解"],
                    isKeySection: true,
                    readingProgress: 0,
                    children: []
                )
            ]

            isLoading = false
        }
    }
}

// MARK: - Supporting Types

enum OutlineViewMode: String, CaseIterable {
    case tree
    case list
    case mindmap

    var displayName: String {
        switch self {
        case .tree: return "树形"
        case .list: return "列表"
        case .mindmap: return "脑图"
        }
    }
}

struct OutlineSection: Identifiable {
    let id: String
    let title: String
    let pageRange: String?
    let aiSummary: String?
    let keywords: [String]
    let isKeySection: Bool
    let readingProgress: Double?
    var children: [OutlineSection]
}

#Preview {
    AIOutlineView(bookId: "1", bookTitle: "平凡的世界")
}
