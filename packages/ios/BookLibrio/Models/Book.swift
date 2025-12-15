import Foundation

struct Book: Codable, Identifiable {
    let id: Int
    let title: String
    let author: String
    let coverUrl: String?
    let coverPhotoUrl: String?
    let isbn: String?
    let publisher: String?
    let publishYear: Int?
    let description: String?
    let pageCount: Int?
    let categories: String?
    let language: String?
    let createdAt: String?
    let posts: [BlogPost]?

    enum CodingKeys: String, CodingKey {
        case id, title, author, isbn, publisher, description, categories, language, posts
        case coverUrl = "cover_url"
        case coverPhotoUrl = "cover_photo_url"
        case publishYear = "publish_year"
        case pageCount = "page_count"
        case createdAt = "created_at"
    }
}

struct BlogPost: Codable, Identifiable {
    let id: Int
    let bookId: Int
    let title: String
    let content: String
    let pagePhotoUrl: String?
    let pageNumber: Int?
    let extractedText: String?
    let createdAt: String?
    let bookTitle: String?
    let bookAuthor: String?

    enum CodingKeys: String, CodingKey {
        case id, title, content
        case bookId = "book_id"
        case pagePhotoUrl = "page_photo_url"
        case pageNumber = "page_number"
        case extractedText = "extracted_text"
        case createdAt = "created_at"
        case bookTitle = "book_title"
        case bookAuthor = "book_author"
    }
}

struct BooksResponse: Codable {
    let data: [Book]?
    let books: [Book]?

    var allBooks: [Book] {
        data ?? books ?? []
    }
}

struct BookResponse: Codable {
    let data: Book?
    let book: Book?

    var theBook: Book? {
        data ?? book
    }
}
