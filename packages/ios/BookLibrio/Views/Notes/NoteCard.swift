/**
 * Note Card Component
 * Displays a note preview in the list
 */

import SwiftUI

struct NoteCard: View {
    let note: Note

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title
            Text(note.displayTitle)
                .font(.headline)
                .lineLimit(2)

            // Content preview
            if let preview = note.contentPreview, !preview.isEmpty {
                Text(preview)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }

            // Metadata row
            HStack(spacing: 12) {
                // Author
                if let author = note.author, !author.isEmpty {
                    Label(author, systemImage: "person")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Date
                if let date = note.formattedDate {
                    Label(date, systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Year badge
                if let year = note.year {
                    Text("\(year)")
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.accentColor.opacity(0.1))
                        .foregroundColor(.accentColor)
                        .clipShape(Capsule())
                }
            }

            // Tags
            if !note.tagsArray.isEmpty {
                tagsView
            }
        }
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private var tagsView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(note.tagsArray.prefix(5), id: \.self) { tag in
                    Text(tag)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(.systemGray5))
                        .foregroundColor(.secondary)
                        .clipShape(Capsule())
                }

                if note.tagsArray.count > 5 {
                    Text("+\(note.tagsArray.count - 5)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
}

#Preview {
    List {
        NoteCard(note: Note(
            id: 1,
            userId: 1,
            title: "The Great Gatsby - Reading Notes",
            filePath: nil,
            year: 2024,
            contentPreview: "This is a preview of the note content. It should be limited to a few lines to give the user a sense of what the note contains without overwhelming them.",
            author: "F. Scott Fitzgerald",
            publishDate: "2024-01-15T00:00:00.000Z",
            tags: "fiction,classic,american",
            categories: nil,
            slug: nil,
            createdAt: "2024-01-15T10:30:00.000Z"
        ))
    }
    .listStyle(.plain)
}
