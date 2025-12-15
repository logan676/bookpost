import Foundation

struct Magazine: Codable, Identifiable {
    let id: Int
    let publisherId: Int?
    let title: String
    let filePath: String?
    let fileSize: Int64?
    let year: Int?
    let pageCount: Int?
    let coverUrl: String?
    let preprocessed: Bool?
    let s3Key: String?
    let createdAt: String?
}

struct MagazinePublisher: Codable, Identifiable {
    let id: Int
    let name: String
    let description: String?
    let count: Int?
}

struct MagazinesResponse: Codable {
    let data: [Magazine]
    let total: Int
}

struct MagazineResponse: Codable {
    let data: Magazine
}

struct PublishersResponse: Codable {
    let data: [MagazinePublisher]
}
