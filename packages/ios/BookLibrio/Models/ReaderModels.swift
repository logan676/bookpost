import SwiftUI

// MARK: - Reading Settings

/// User preferences for reading experience
/// Persisted via @AppStorage for automatic sync
struct ReadingSettings: Codable, Equatable {
    var fontSize: CGFloat = 22
    var fontFamily: FontFamily = .system
    var colorMode: ColorMode = .light
    var lineSpacing: LineSpacing = .normal
    var marginSize: MarginSize = .medium
    var pageFlipStyle: PageFlipStyle = .horizontal
    var brightness: Double = 1.0
    var keepScreenOn: Bool = true

    /// Default settings instance
    static let `default` = ReadingSettings()
}

// MARK: - Font Family

enum FontFamily: String, Codable, CaseIterable, Identifiable {
    case system = "system"
    case songti = "songti"
    case kaiti = "kaiti"
    case heiti = "heiti"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .system: return L10n.Reader.fontSystem
        case .songti: return L10n.Reader.fontSongti
        case .kaiti: return L10n.Reader.fontKaiti
        case .heiti: return L10n.Reader.fontHeiti
        }
    }

    var fontName: String? {
        switch self {
        case .system: return nil
        case .songti: return "STSong"
        case .kaiti: return "STKaiti"
        case .heiti: return "STHeiti"
        }
    }
}

// MARK: - Color Mode

enum ColorMode: String, Codable, CaseIterable, Identifiable {
    case light = "light"
    case sepia = "sepia"
    case green = "green"
    case dark = "dark"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .light: return L10n.Reader.colorWhite
        case .sepia: return L10n.Reader.colorSepia
        case .green: return L10n.Reader.colorGreen
        case .dark: return L10n.Reader.colorDark
        }
    }

    var backgroundColor: Color {
        switch self {
        case .light: return .white
        case .sepia: return Color(red: 0.98, green: 0.95, blue: 0.88)
        case .green: return Color(red: 0.88, green: 0.95, blue: 0.88)
        case .dark: return Color(red: 0.12, green: 0.12, blue: 0.12)
        }
    }

    var textColor: Color {
        switch self {
        case .light, .sepia, .green: return Color(red: 0.1, green: 0.1, blue: 0.1)
        case .dark: return Color(red: 0.9, green: 0.9, blue: 0.9)
        }
    }

    var secondaryTextColor: Color {
        switch self {
        case .light, .sepia, .green: return .secondary
        case .dark: return Color(red: 0.6, green: 0.6, blue: 0.6)
        }
    }
}

// MARK: - Line Spacing

enum LineSpacing: String, Codable, CaseIterable, Identifiable {
    case compact = "compact"
    case normal = "normal"
    case relaxed = "relaxed"
    case loose = "loose"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .compact: return L10n.Reader.spacingCompact
        case .normal: return L10n.Reader.spacingNormal
        case .relaxed: return L10n.Reader.spacingRelaxed
        case .loose: return L10n.Reader.spacingLoose
        }
    }

    var multiplier: CGFloat {
        switch self {
        case .compact: return 1.2
        case .normal: return 1.5
        case .relaxed: return 1.8
        case .loose: return 2.0
        }
    }
}

// MARK: - Margin Size

enum MarginSize: String, Codable, CaseIterable, Identifiable {
    case small = "small"
    case medium = "medium"
    case large = "large"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .small: return L10n.Reader.marginSmall
        case .medium: return L10n.Reader.marginMedium
        case .large: return L10n.Reader.marginLarge
        }
    }

    var horizontalPadding: CGFloat {
        switch self {
        case .small: return 16
        case .medium: return 24
        case .large: return 40
        }
    }

    var verticalPadding: CGFloat {
        switch self {
        case .small: return 20
        case .medium: return 32
        case .large: return 48
        }
    }
}

// MARK: - Page Flip Style

enum PageFlipStyle: String, Codable, CaseIterable, Identifiable {
    case horizontal = "horizontal"
    case vertical = "vertical"
    case curl = "curl"
    case fade = "fade"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .horizontal: return L10n.Reader.flipHorizontal
        case .vertical: return L10n.Reader.flipVertical
        case .curl: return L10n.Reader.flipCurl
        case .fade: return L10n.Reader.flipFade
        }
    }
}

// MARK: - Highlight Color

enum HighlightColor: String, Codable, CaseIterable, Identifiable {
    case yellow = "yellow"
    case green = "green"
    case blue = "blue"
    case pink = "pink"
    case purple = "purple"
    case orange = "orange"

    var id: String { rawValue }

    var color: Color {
        switch self {
        case .yellow: return Color(hex: "#FFEB3B")
        case .green: return Color(hex: "#4CAF50")
        case .blue: return Color(hex: "#2196F3")
        case .pink: return Color(hex: "#E91E63")
        case .purple: return Color(hex: "#9C27B0")
        case .orange: return Color(hex: "#FF9800")
        }
    }

    var uiColor: UIColor {
        switch self {
        case .yellow: return UIColor(red: 1.0, green: 0.92, blue: 0.23, alpha: 0.5)
        case .green: return UIColor(red: 0.30, green: 0.69, blue: 0.31, alpha: 0.5)
        case .blue: return UIColor(red: 0.13, green: 0.59, blue: 0.95, alpha: 0.5)
        case .pink: return UIColor(red: 0.91, green: 0.12, blue: 0.39, alpha: 0.5)
        case .purple: return UIColor(red: 0.61, green: 0.15, blue: 0.69, alpha: 0.5)
        case .orange: return UIColor(red: 1.0, green: 0.60, blue: 0.0, alpha: 0.5)
        }
    }

    var displayName: String {
        switch self {
        case .yellow: return L10n.Reader.highlightYellow
        case .green: return L10n.Reader.highlightGreen
        case .blue: return L10n.Reader.highlightBlue
        case .pink: return L10n.Reader.highlightPink
        case .purple: return L10n.Reader.highlightPurple
        case .orange: return L10n.Reader.highlightOrange
        }
    }
}

// MARK: - Underline Model (API-compatible)

/// Represents a text underline/highlight from the API
/// Matches the backend schema for ebook_underlines and magazine_underlines
struct Underline: Identifiable, Codable {
    let id: Int
    let ebookId: Int?
    let magazineId: Int?
    let userId: Int?
    let text: String?
    let paragraph: Int?         // Used for page number in PDFs
    let chapterIndex: Int?
    let paragraphIndex: Int?
    let startOffset: Int?
    let endOffset: Int?
    let cfiRange: String?       // For EPUB positioning
    let pageNumber: Int?        // For magazine underlines
    let ideaCount: Int?
    let createdAt: String?

    /// Computed page number (works for both ebook and magazine)
    var effectivePageNumber: Int? {
        pageNumber ?? paragraph
    }
}

// MARK: - API Response Types

struct UnderlineListResponse: Codable {
    let data: [Underline]
}

struct UnderlineResponse: Codable {
    let data: Underline
}

struct DeleteResponse: Codable {
    let success: Bool?
}

// MARK: - Highlight Model (Local UI representation)

/// Local representation of a highlight for UI display
/// Can be created from Underline API response
struct Highlight: Identifiable {
    let id: Int
    let bookId: Int
    let bookType: String        // "ebook" or "magazine"
    let userId: Int
    let text: String
    let pageNumber: Int?
    let chapterIndex: Int?
    let paragraphIndex: Int?
    let startOffset: Int?
    let endOffset: Int?
    let cfiRange: String?
    var color: HighlightColor
    var note: String?
    let ideaCount: Int
    let createdAt: Date?

    /// Create from API Underline response
    init(from underline: Underline, bookType: String) {
        self.id = underline.id
        self.bookId = underline.ebookId ?? underline.magazineId ?? 0
        self.bookType = bookType
        self.userId = underline.userId ?? 0
        self.text = underline.text ?? ""
        self.pageNumber = underline.effectivePageNumber
        self.chapterIndex = underline.chapterIndex
        self.paragraphIndex = underline.paragraphIndex
        self.startOffset = underline.startOffset
        self.endOffset = underline.endOffset
        self.cfiRange = underline.cfiRange
        self.color = .yellow // Default color
        self.note = nil
        self.ideaCount = underline.ideaCount ?? 0

        if let dateStr = underline.createdAt {
            let formatter = ISO8601DateFormatter()
            self.createdAt = formatter.date(from: dateStr)
        } else {
            self.createdAt = nil
        }
    }

    /// Create a new local highlight (before saving to API)
    init(bookId: Int, bookType: String, userId: Int, text: String, pageNumber: Int?, color: HighlightColor = .yellow) {
        self.id = 0 // Will be assigned by API
        self.bookId = bookId
        self.bookType = bookType
        self.userId = userId
        self.text = text
        self.pageNumber = pageNumber
        self.chapterIndex = nil
        self.paragraphIndex = nil
        self.startOffset = nil
        self.endOffset = nil
        self.cfiRange = nil
        self.color = color
        self.note = nil
        self.ideaCount = 0
        self.createdAt = Date()
    }
}

// MARK: - Table of Contents

/// Represents a chapter/section in book navigation
struct TOCItem: Identifiable {
    let id: String
    let title: String
    let level: Int              // Nesting level (0 = top level)
    let pageNumber: Int?        // For PDF
    let href: String?           // For EPUB (chapter file reference)
    let children: [TOCItem]

    init(id: String = UUID().uuidString, title: String, level: Int = 0, pageNumber: Int? = nil, href: String? = nil, children: [TOCItem] = []) {
        self.id = id
        self.title = title
        self.level = level
        self.pageNumber = pageNumber
        self.href = href
        self.children = children
    }
}

// MARK: - Reading Progress

/// Tracks current reading position
struct ReadingPosition: Codable, Equatable {
    let bookId: Int
    let bookType: String        // "ebook" or "magazine"
    var currentPage: Int?       // For PDF
    var totalPages: Int?
    var cfi: String?            // For EPUB (Canonical Fragment Identifier)
    var chapterIndex: Int?
    var chapterTitle: String?
    var progress: Double        // 0.0 - 1.0

    var formattedProgress: String {
        "\(Int(progress * 100))%"
    }

    var pageDisplay: String? {
        guard let current = currentPage, let total = totalPages else { return nil }
        return L10n.Reader.pageDisplay(current, total)
    }
}

// MARK: - AI Meaning Models

/// Request for AI text meaning/explanation
struct MeaningRequest: Encodable {
    let text: String
    let paragraph: String
    let targetLanguage: String  // "en" or "zh"
}

/// Response from AI meaning API
struct MeaningResponse: Decodable {
    let meaning: String
}

/// Response wrapper for AI meaning API
struct AIMeaningAPIResponse: Decodable {
    let meaning: String
}

/// Request for AI image explanation
struct ImageExplainRequest: Encodable {
    let imageUrl: String  // Base64 encoded image
    let targetLanguage: String
}

/// Response from AI image explanation API
struct ImageExplainResponse: Decodable {
    let explanation: String
}

// MARK: - AI Author/Book Info Models

/// Request for AI author introduction
struct AuthorInfoRequest: Encodable {
    let authorName: String
    let bookTitle: String?  // Optional context
    let targetLanguage: String  // "en" or "zh"
}

/// Response from AI author info API
struct AuthorInfoResponse: Decodable {
    let introduction: String
}

/// Request for AI book introduction
struct BookInfoRequest: Encodable {
    let bookTitle: String
    let authorName: String?
    let targetLanguage: String  // "en" or "zh"
}

/// Response from AI book info API
struct BookInfoResponse: Decodable {
    let introduction: String
}

// MARK: - Ideas Models

/// Represents an idea/thought associated with an underline
struct Idea: Identifiable, Codable {
    let id: Int
    let underlineId: Int
    let content: String
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case underlineId = "underline_id"
        case content
        case createdAt = "created_at"
    }
}

/// Response for ideas list
struct IdeasListResponse: Decodable {
    let data: [Idea]?

    // Handle both array response and wrapped response
    init(from decoder: Decoder) throws {
        // Try to decode as array first
        if let array = try? [Idea](from: decoder) {
            self.data = array
            return
        }
        // Otherwise try wrapped format
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.data = try container.decodeIfPresent([Idea].self, forKey: .data)
    }

    enum CodingKeys: String, CodingKey {
        case data
    }
}

/// Response for single idea
struct IdeaResponse: Decodable {
    let id: Int
    let underlineId: Int
    let content: String
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case underlineId = "underline_id"
        case content
        case createdAt = "created_at"
    }
}

/// Request to create/update an idea
struct IdeaRequest: Encodable {
    let content: String
}

// MARK: - Bubble Menu State

/// State machine for text selection bubble menu
enum BubbleMenuState: Equatable {
    case hidden
    case confirm(text: String, rect: CGRect)           // New text selected
    case existing(underlineId: Int, text: String, rect: CGRect)  // Clicked existing underline
    case ideaInput(underlineId: Int, text: String, rect: CGRect) // Adding idea
    case meaning(text: String, paragraph: String, rect: CGRect)  // Showing AI meaning
}

// MARK: - Settings Storage Helper

/// Helper class for persisting reading settings
class ReadingSettingsStore: ObservableObject {
    static let shared = ReadingSettingsStore()

    private let key = "reading_settings"

    @Published var settings: ReadingSettings {
        didSet {
            save()
        }
    }

    private init() {
        if let data = UserDefaults.standard.data(forKey: key),
           let decoded = try? JSONDecoder().decode(ReadingSettings.self, from: data) {
            settings = decoded
        } else {
            settings = .default
        }
    }

    private func save() {
        if let encoded = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(encoded, forKey: key)
        }
    }

    func reset() {
        settings = .default
    }
}
