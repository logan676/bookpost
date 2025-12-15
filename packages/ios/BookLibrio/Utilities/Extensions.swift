import Foundation
import SwiftUI

// MARK: - BookLibrio Brand Colors
extension Color {
    /// Deep Insight Blue - Primary brand color
    static let brandBlue = Color(hex: "0A2342")
    /// Illumination Gold - Accent/highlight color
    static let brandGold = Color(hex: "F4B400")
    /// Electric Azure - Links/interactive elements
    static let brandAzure = Color(hex: "007AFF")
    /// Lighter blue for hover states
    static let brandBlueLight = Color(hex: "1a3a5c")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

extension Int64 {
    var formattedFileSize: String {
        let kb: Int64 = 1024
        let mb = kb * 1024
        let gb = mb * 1024

        if self >= gb {
            return String(format: "%.2f GB", Double(self) / Double(gb))
        } else if self >= mb {
            return String(format: "%.2f MB", Double(self) / Double(mb))
        } else if self >= kb {
            return String(format: "%.2f KB", Double(self) / Double(kb))
        } else {
            return "\(self) B"
        }
    }
}

extension String {
    var toDisplayDate: String {
        let inputFormatter = ISO8601DateFormatter()
        inputFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let date = inputFormatter.date(from: self) else {
            return self
        }

        let outputFormatter = DateFormatter()
        outputFormatter.locale = Locale(identifier: "zh_CN")
        outputFormatter.dateFormat = "yyyy年MM月dd日"

        return outputFormatter.string(from: date)
    }

    var toRelativeTime: String {
        let inputFormatter = ISO8601DateFormatter()
        inputFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let date = inputFormatter.date(from: self) else {
            return self
        }

        let now = Date()
        let diff = now.timeIntervalSince(date)

        let minutes = diff / 60
        let hours = minutes / 60
        let days = hours / 24

        if days > 30 {
            return toDisplayDate
        } else if days >= 1 {
            return "\(Int(days))天前"
        } else if hours >= 1 {
            return "\(Int(hours))小时前"
        } else if minutes >= 1 {
            return "\(Int(minutes))分钟前"
        } else {
            return "刚刚"
        }
    }
}

extension Optional where Wrapped == String {
    var orEmpty: String {
        self ?? ""
    }
}
