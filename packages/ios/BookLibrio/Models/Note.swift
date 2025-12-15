/**
 * Note Models
 * Data models for reading notes with underlines, comments, and ideas
 */

import Foundation

// MARK: - Note List Item

struct Note: Codable, Identifiable {
    let id: Int
    let userId: Int?
    let title: String?
    let filePath: String?
    let year: Int?
    let contentPreview: String?
    let author: String?
    let publishDate: String?
    let tags: String?
    let categories: String?
    let slug: String?
    let createdAt: String?

    var displayTitle: String {
        title ?? "Untitled"
    }

    var tagsArray: [String] {
        guard let tags = tags, !tags.isEmpty else { return [] }
        return tags.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }
    }

    var formattedDate: String? {
        guard let dateStr = publishDate ?? createdAt else { return nil }

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let date = isoFormatter.date(from: dateStr) {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "zh_CN")
            formatter.dateFormat = "yyyy年M月d日"
            return formatter.string(from: date)
        }

        // Try without fractional seconds
        isoFormatter.formatOptions = [.withInternetDateTime]
        if let date = isoFormatter.date(from: dateStr) {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "zh_CN")
            formatter.dateFormat = "yyyy年M月d日"
            return formatter.string(from: date)
        }

        return dateStr
    }
}

// MARK: - Note Underline

struct NoteUnderline: Codable, Identifiable {
    let id: Int
    let noteId: Int?
    let userId: Int?
    let text: String?
    let paragraphIndex: Int?
    let startOffset: Int?
    let endOffset: Int?
    let createdAt: String?
    let ideas: [NoteIdea]?

    var displayText: String {
        text ?? ""
    }
}

// MARK: - Note Comment

struct NoteComment: Codable, Identifiable {
    let id: Int
    let noteId: Int?
    let userId: Int?
    let nick: String?
    let content: String?
    let originalDate: String?
    let createdAt: String?

    var displayContent: String {
        content ?? ""
    }

    var displayNick: String {
        nick ?? "Anonymous"
    }
}

// MARK: - Note Idea

struct NoteIdea: Codable, Identifiable {
    let id: Int
    let underlineId: Int?
    let userId: Int?
    let content: String?
    let createdAt: String?

    var displayContent: String {
        content ?? ""
    }
}

// MARK: - Note Year

struct NoteYear: Codable, Identifiable {
    var id: Int { year }
    let year: Int
    let count: Int
}

// MARK: - Note Content (Full Detail)

struct NoteContent: Codable {
    let id: Int
    let userId: Int?
    let title: String?
    let filePath: String?
    let year: Int?
    let contentPreview: String?
    let author: String?
    let publishDate: String?
    let tags: String?
    let categories: String?
    let slug: String?
    let createdAt: String?
    let underlines: [NoteUnderline]?
    let comments: [NoteComment]?

    var displayTitle: String {
        title ?? "Untitled"
    }

    var tagsArray: [String] {
        guard let tags = tags, !tags.isEmpty else { return [] }
        return tags.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }
    }
}

// MARK: - API Responses

struct NotesListResponse: Codable {
    let data: [Note]
    let total: Int
}

struct NoteYearsResponse: Codable {
    let data: [NoteYear]
}

struct NoteDetailResponse: Codable {
    let data: NoteContent
}
