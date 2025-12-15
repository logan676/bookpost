/**
 * Notes List View
 * Displays user's reading notes with year filtering and search
 */

import SwiftUI

struct NotesListView: View {
    @State private var notes: [Note] = []
    @State private var years: [NoteYear] = []
    @State private var selectedYear: Int?
    @State private var searchText = ""
    @State private var isLoading = false
    @State private var hasMore = false
    @State private var offset = 0
    @State private var total = 0

    private let pageSize = 20

    var body: some View {
        VStack(spacing: 0) {
            // Search bar
            searchBarView

            // Year filter pills
            if !years.isEmpty {
                yearFilterView
            }

            Divider()

            // Content
            if notes.isEmpty && isLoading {
                LoadingView()
            } else if notes.isEmpty {
                emptyStateView
            } else {
                notesListView
            }
        }
        .navigationTitle(L10n.Notes.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadYears()
            await loadNotes()
        }
        .onChange(of: selectedYear) { _, _ in
            resetAndReload()
        }
    }

    // MARK: - Search Bar

    @ViewBuilder
    private var searchBarView: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)

            TextField(L10n.Notes.searchPlaceholder, text: $searchText)
                .textFieldStyle(.plain)
                .submitLabel(.search)
                .onSubmit {
                    resetAndReload()
                }

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                    resetAndReload()
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
        .padding(.vertical, 8)
    }

    // MARK: - Year Filter

    @ViewBuilder
    private var yearFilterView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // "All" button
                Button {
                    selectedYear = nil
                } label: {
                    HStack(spacing: 4) {
                        Text(L10n.Common.all)
                        Text("(\(total))")
                            .font(.caption2)
                    }
                    .font(.subheadline)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(selectedYear == nil ? Color.accentColor : Color(.systemGray6))
                    .foregroundColor(selectedYear == nil ? .white : .primary)
                    .clipShape(Capsule())
                }

                // Year buttons
                ForEach(years) { year in
                    Button {
                        selectedYear = year.year
                    } label: {
                        HStack(spacing: 4) {
                            Text(L10n.Notes.year(year.year))
                            Text("(\(year.count))")
                                .font(.caption2)
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(selectedYear == year.year ? Color.accentColor : Color(.systemGray6))
                        .foregroundColor(selectedYear == year.year ? .white : .primary)
                        .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Empty State

    @ViewBuilder
    private var emptyStateView: some View {
        ContentUnavailableView {
            Label(L10n.Notes.empty, systemImage: "doc.text")
        } description: {
            if selectedYear != nil {
                Text(L10n.Notes.noNotesForYear)
            } else if !searchText.isEmpty {
                Text(L10n.Notes.noSearchResults)
            } else {
                Text(L10n.Notes.startReading)
            }
        }
    }

    // MARK: - Notes List

    @ViewBuilder
    private var notesListView: some View {
        List {
            ForEach(notes) { note in
                NavigationLink(destination: NoteDetailView(noteId: note.id)) {
                    NoteCard(note: note)
                }
            }

            if hasMore {
                Button(L10n.Notes.loadMore) {
                    Task { await loadMore() }
                }
                .frame(maxWidth: .infinity)
                .disabled(isLoading)
            }
        }
        .listStyle(.plain)
        .refreshable {
            await loadNotes()
        }
    }

    // MARK: - Data Loading

    private func resetAndReload() {
        notes = []
        offset = 0
        Task { await loadNotes() }
    }

    private func loadYears() async {
        do {
            let response = try await APIClient.shared.getNoteYears()
            years = response.data
        } catch {
            Log.e("Failed to load note years", error: error)
        }
    }

    private func loadNotes() async {
        isLoading = true

        do {
            let response = try await APIClient.shared.getNotes(
                year: selectedYear,
                search: searchText.isEmpty ? nil : searchText,
                limit: pageSize,
                offset: 0
            )
            notes = response.data
            total = response.total
            hasMore = notes.count < response.total
            offset = notes.count
        } catch {
            Log.e("Failed to load notes", error: error)
        }

        isLoading = false
    }

    private func loadMore() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            let response = try await APIClient.shared.getNotes(
                year: selectedYear,
                search: searchText.isEmpty ? nil : searchText,
                limit: pageSize,
                offset: offset
            )
            notes.append(contentsOf: response.data)
            hasMore = notes.count < response.total
            offset = notes.count
        } catch {
            Log.e("Failed to load more notes", error: error)
        }

        isLoading = false
    }
}

#Preview {
    NavigationStack {
        NotesListView()
    }
}
