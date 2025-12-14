/**
 * CuratedListsView
 * Browse external book lists (NYT, Amazon, Bill Gates, etc.)
 */

import SwiftUI

struct CuratedListsView: View {
    @StateObject private var viewModel = CuratedListsViewModel()
    @State private var showingYearPicker = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filters
                filtersSection

                // Lists
                if viewModel.isLoading && viewModel.lists.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = viewModel.errorMessage, viewModel.lists.isEmpty {
                    ContentUnavailableView(
                        "Failed to Load",
                        systemImage: "exclamationmark.triangle",
                        description: Text(error)
                    )
                } else if viewModel.lists.isEmpty {
                    ContentUnavailableView(
                        "No Lists Found",
                        systemImage: "books.vertical",
                        description: Text("No curated lists match your filters")
                    )
                } else {
                    listsContent
                }
            }
            .navigationTitle("Curated Lists")
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                if viewModel.lists.isEmpty {
                    await viewModel.loadListTypes()
                    await viewModel.loadLists()
                }
            }
        }
    }

    // MARK: - Filters Section

    private var filtersSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // Type filter chips
                typeFilterChip(nil, label: "All")

                ForEach(viewModel.listTypes, id: \.type) { typeInfo in
                    typeFilterChip(typeInfo.type, label: typeInfo.name)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
        }
        .background(Color(.systemBackground))
        .overlay(
            // Year picker button
            HStack {
                Spacer()
                yearPickerButton
                    .padding(.trailing, 8)
            }
        )
    }

    private func typeFilterChip(_ type: String?, label: String) -> some View {
        let isSelected = viewModel.selectedType == type

        return Button {
            viewModel.setType(type)
        } label: {
            Text(label)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? Color.accentColor : Color(.systemGray5))
                )
                .foregroundColor(isSelected ? .white : .primary)
        }
    }

    private var yearPickerButton: some View {
        Menu {
            Button {
                viewModel.setYear(nil)
            } label: {
                if viewModel.selectedYear == nil {
                    Label("All Years", systemImage: "checkmark")
                } else {
                    Text("All Years")
                }
            }

            Divider()

            ForEach(viewModel.availableYears, id: \.self) { year in
                Button {
                    viewModel.setYear(year)
                } label: {
                    if viewModel.selectedYear == year {
                        Label(String(year), systemImage: "checkmark")
                    } else {
                        Text(String(year))
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "calendar")
                Text(viewModel.selectedYear.map { String($0) } ?? "Year")
                    .fontWeight(.medium)
            }
            .font(.subheadline)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(viewModel.selectedYear != nil ? Color.accentColor : Color(.systemGray5))
            )
            .foregroundColor(viewModel.selectedYear != nil ? .white : .primary)
        }
    }

    // MARK: - Lists Content

    private var listsContent: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(viewModel.lists) { list in
                    NavigationLink(destination: CuratedListDetailView(listId: list.id)) {
                        CuratedListCard(list: list)
                    }
                    .buttonStyle(.plain)
                    .onAppear {
                        Task {
                            await viewModel.loadMoreIfNeeded(currentItem: list)
                        }
                    }
                }

                if viewModel.isLoadingMore {
                    ProgressView()
                        .padding()
                }
            }
            .padding()
        }
    }
}

// MARK: - CuratedListCard

struct CuratedListCard: View {
    let list: CuratedList

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with source info
            HStack {
                // Source logo/icon
                if let logoUrl = list.sourceLogoUrl, let url = URL(string: logoUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Image(systemName: listTypeIcon)
                            .foregroundColor(.secondary)
                    }
                    .frame(width: 24, height: 24)
                    .clipShape(Circle())
                } else {
                    Image(systemName: listTypeIcon)
                        .foregroundColor(.accentColor)
                        .frame(width: 24, height: 24)
                }

                Text(list.sourceName ?? list.listTypeDisplayName)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if let year = list.year {
                    Text(String(year))
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.accentColor.opacity(0.1))
                        .foregroundColor(.accentColor)
                        .cornerRadius(4)
                }
            }

            // Title
            Text(list.title)
                .font(.headline)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            // Description
            if let description = list.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            // Stats
            HStack(spacing: 16) {
                Label("\(list.bookCount)", systemImage: "book.closed")
                Label("\(formatCount(list.viewCount))", systemImage: "eye")

                Spacer()

                if list.isFeatured {
                    Label("Featured", systemImage: "star.fill")
                        .foregroundColor(.orange)
                }
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    private var listTypeIcon: String {
        CuratedListType(rawValue: list.listType)?.icon ?? "book.closed"
    }

    private func formatCount(_ count: Int) -> String {
        if count >= 1000 {
            return String(format: "%.1fK", Double(count) / 1000.0)
        }
        return "\(count)"
    }
}

#Preview {
    CuratedListsView()
}
