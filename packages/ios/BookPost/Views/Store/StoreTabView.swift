import SwiftUI

/// Store tab container with separate sections for Ebooks and Magazines
/// Ebooks and Magazines must NEVER be mixed - this is a full-stack requirement
struct StoreTabView: View {
    @State private var selectedTab: StoreContentType = .ebook
    @State private var showSearch = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar at the very top (above tab picker)
                Button {
                    showSearch = true
                } label: {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)

                        Text(selectedTab == .ebook ? "搜索电子书" : "搜索杂志")
                            .foregroundColor(.secondary)

                        Spacer()
                    }
                    .padding(12)
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Tab picker below search bar
                Picker("", selection: $selectedTab) {
                    Text("电子书").tag(StoreContentType.ebook)
                    Text("杂志").tag(StoreContentType.magazine)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.vertical, 8)

                Divider()

                // Content based on selected tab
                switch selectedTab {
                case .ebook:
                    EbookStoreView()
                case .magazine:
                    MagazineStoreView()
                }
            }
            .navigationTitle(L10n.Store.title)
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showSearch) {
                StoreSearchView()
            }
        }
    }
}

/// Content type for store tabs
enum StoreContentType: String, CaseIterable {
    case ebook = "ebook"
    case magazine = "magazine"

    var displayName: String {
        switch self {
        case .ebook: return "电子书"
        case .magazine: return "杂志"
        }
    }

    var iconName: String {
        switch self {
        case .ebook: return "book.fill"
        case .magazine: return "newspaper.fill"
        }
    }
}

#Preview {
    StoreTabView()
}
