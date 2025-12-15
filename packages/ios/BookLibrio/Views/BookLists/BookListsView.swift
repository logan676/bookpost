/**
 * Book Lists Browse View
 * Main view for discovering and browsing public book lists
 */

import SwiftUI

struct BookListsView: View {
    @StateObject private var viewModel = BookListsViewModel()
    @State private var showingSearch = false
    @State private var showingCreateList = false
    @State private var selectedList: BookList?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Category tabs
                    categoryTabs

                    // Sort options
                    sortBar

                    // Content
                    if viewModel.isLoading && viewModel.lists.isEmpty {
                        loadingView
                    } else if viewModel.lists.isEmpty {
                        emptyView
                    } else {
                        listsGrid
                    }
                }
            }
            .navigationTitle(L10n.BookList.title)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 12) {
                        Button {
                            showingSearch = true
                        } label: {
                            Image(systemName: "magnifyingglass")
                        }

                        Button {
                            showingCreateList = true
                        } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
            }
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                if viewModel.lists.isEmpty {
                    await viewModel.loadLists()
                }
            }
            .sheet(isPresented: $showingSearch) {
                BookListSearchView(viewModel: viewModel)
            }
            .sheet(isPresented: $showingCreateList) {
                CreateBookListView { newList in
                    viewModel.myCreatedLists.insert(newList, at: 0)
                }
            }
            .navigationDestination(item: $selectedList) { list in
                BookListDetailView(listId: list.id)
            }
        }
    }

    // MARK: - Category Tabs

    private var categoryTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(BookListCategory.allCases) { category in
                    BookListCategoryChip(
                        title: category.displayName,
                        icon: category.iconName,
                        isSelected: viewModel.selectedCategory == category
                    ) {
                        Task {
                            await viewModel.setCategory(category)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color(.systemBackground))
    }

    // MARK: - Sort Bar

    private var sortBar: some View {
        HStack {
            Menu {
                ForEach(BookListSortOption.allCases) { option in
                    Button {
                        Task {
                            await viewModel.setSort(option)
                        }
                    } label: {
                        HStack {
                            Text(option.displayName)
                            if viewModel.selectedSort == option {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack(spacing: 4) {
                    Text(viewModel.selectedSort.displayName)
                        .font(.subheadline)
                    Image(systemName: "chevron.down")
                        .font(.caption)
                }
                .foregroundColor(.secondary)
            }

            Spacer()

            if viewModel.isLoadingMore {
                ProgressView()
                    .scaleEffect(0.8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Lists Grid

    private var listsGrid: some View {
        LazyVStack(spacing: 16) {
            ForEach(viewModel.lists) { list in
                BookListCard(list: list, style: .standard) {
                    selectedList = list
                }
                .padding(.horizontal, 16)
                .onAppear {
                    Task {
                        await viewModel.loadMoreIfNeeded(currentItem: list)
                    }
                }
            }

            if viewModel.hasMore {
                ProgressView()
                    .padding()
            }
        }
        .padding(.vertical, 16)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ForEach(0..<3, id: \.self) { _ in
                BookListCardPlaceholder()
                    .padding(.horizontal, 16)
            }
        }
        .padding(.vertical, 16)
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "text.book.closed")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text(L10n.BookList.emptyTitle)
                .font(.headline)

            Text(L10n.BookList.emptyMessage)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button {
                showingCreateList = true
            } label: {
                Label(L10n.BookList.createFirst, systemImage: "plus.circle.fill")
                    .font(.headline)
            }
            .buttonStyle(.borderedProminent)
            .padding(.top, 8)
        }
        .padding(32)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Category Chip

struct BookListCategoryChip: View {
    let title: String
    let icon: String
    var isSelected: Bool = false
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                Text(title)
                    .font(.subheadline)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? Color.accentColor : Color(.systemGray5))
            .foregroundColor(isSelected ? .white : .primary)
            .clipShape(Capsule())
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Placeholder

struct BookListCardPlaceholder: View {
    @State private var isAnimating = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Cover grid placeholder
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray5))
                .frame(height: 140)

            // Title placeholder
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray5))
                .frame(height: 20)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Description placeholder
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray6))
                .frame(height: 14)
                .frame(width: 200)

            // Creator placeholder
            HStack {
                Circle()
                    .fill(Color(.systemGray5))
                    .frame(width: 24, height: 24)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray6))
                    .frame(width: 60, height: 12)
                Spacer()
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        .redacted(reason: .placeholder)
        .shimmering(active: isAnimating)
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Shimmer Effect

extension View {
    @ViewBuilder
    func shimmering(active: Bool = true) -> some View {
        if active {
            self.modifier(ShimmerModifier())
        } else {
            self
        }
    }
}

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        gradient: Gradient(colors: [
                            .clear,
                            .white.opacity(0.3),
                            .clear
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 2)
                    .offset(x: -geometry.size.width + phase * geometry.size.width * 2)
                }
                .mask(content)
            )
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

// MARK: - Search View

struct BookListSearchView: View {
    @ObservedObject var viewModel: BookListsViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)

                    TextField(L10n.BookList.searchPlaceholder, text: $searchText)
                        .textFieldStyle(PlainTextFieldStyle())
                        .focused($isSearchFocused)
                        .onSubmit {
                            Task {
                                await viewModel.search(searchText)
                            }
                        }

                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(12)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding()

                // Results
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if viewModel.lists.isEmpty && !searchText.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .font(.largeTitle)
                            .foregroundColor(.secondary)
                        Text(L10n.BookList.noResults)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    List(viewModel.lists) { list in
                        BookListRow(list: list)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                dismiss()
                                // Navigate to list (handled by parent)
                            }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(L10n.BookList.search)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Common.cancel) {
                        dismiss()
                    }
                }
            }
            .onAppear {
                isSearchFocused = true
            }
        }
    }
}

// MARK: - Preview

#Preview {
    BookListsView()
}
