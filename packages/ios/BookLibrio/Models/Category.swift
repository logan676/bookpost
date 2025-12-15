import Foundation
import SwiftUI

// MARK: - Category Model

struct Category: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let displayName: String?
    let nameEn: String?
    let description: String?
    let slug: String?
    let parentId: Int?
    let level: Int
    let icon: String?
    let iconUrl: String?
    let coverUrl: String?
    let themeColor: String?
    let sortOrder: Int
    let bookTypes: String?
    let ebookCount: Int
    let magazineCount: Int
    let isActive: Bool
    let createdAt: String?
    var children: [Category]?

    // MARK: - Computed Properties

    var localizedName: String {
        displayName ?? name
    }

    var sfSymbolName: String {
        icon ?? "books.vertical"
    }

    var color: Color {
        guard let hex = themeColor else { return .blue }
        return Color(hex: hex)
    }

    var appliesToEbooks: Bool {
        bookTypes?.contains("ebook") ?? true
    }

    var appliesToMagazines: Bool {
        bookTypes?.contains("magazine") ?? true
    }

    var totalBookCount: Int {
        ebookCount + magazineCount
    }

    var isTopLevel: Bool {
        parentId == nil
    }

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Category, rhs: Category) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - API Response Types

struct CategoriesResponse: Codable {
    let data: [Category]
    let total: Int
}

struct CategoryDetailResponse: Codable {
    let data: Category
}

struct CategoryBooksResponse: Codable {
    let data: [CategoryBookItem]
    let pagination: Pagination
}

struct CategoryBookItem: Codable, Identifiable {
    let id: Int
    let title: String
    let author: String?
    let coverUrl: String?
    let description: String?
    let paymentType: String?
    let externalRating: Double?
}

struct Pagination: Codable {
    let page: Int
    let limit: Int
    let total: Int
    let totalPages: Int
}

