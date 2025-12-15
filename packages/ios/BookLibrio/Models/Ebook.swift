import Foundation

struct Ebook: Codable, Identifiable {
    let id: Int
    let categoryId: Int?
    let title: String
    let filePath: String?
    let fileSize: Int64?
    let fileType: String?
    let normalizedTitle: String?
    let coverUrl: String?
    let s3Key: String?
    let createdAt: String?

    var isPdf: Bool {
        fileType?.lowercased() == "pdf"
    }

    var isEpub: Bool {
        fileType?.lowercased() == "epub"
    }
}

struct EbookCategory: Codable, Identifiable {
    let id: Int
    let name: String
    let description: String?
    let count: Int?
    let createdAt: String?
}

struct EbooksResponse: Codable {
    let data: [Ebook]
    let total: Int
}

struct EbookResponse: Codable {
    let data: Ebook
}

struct EbookCategoriesResponse: Codable {
    let data: [EbookCategory]
}

struct EbookUnderline: Codable, Identifiable {
    let id: Int
    let ebookId: Int
    let userId: Int
    let text: String
    let paragraph: Int?
    let chapterIndex: Int?
    let paragraphIndex: Int?
    let startOffset: Int?
    let endOffset: Int?
    let cfiRange: String?
    let ideaCount: Int?
    let createdAt: String?
}

struct EbookUnderlinesResponse: Codable {
    let data: [EbookUnderline]
}
