import Foundation
import os.log

/// Unified logging utility for BookLibrio iOS app
/// Usage: Log.d("message"), Log.i("message"), Log.w("message"), Log.e("message")
enum Log {
    // MARK: - Configuration

    /// Set to false to disable all logging in production
    static var isEnabled: Bool = {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }()

    /// Minimum log level to display
    static var minLevel: Level = .debug

    // MARK: - Log Levels

    enum Level: Int, Comparable {
        case debug = 0    // 🔍 Detailed debugging info
        case network = 1  // 🌐 Network requests/responses
        case info = 2     // ℹ️ General information
        case warning = 3  // ⚠️ Warning messages
        case error = 4    // ❌ Error messages

        var emoji: String {
            switch self {
            case .debug: return "🔍"
            case .info: return "ℹ️"
            case .warning: return "⚠️"
            case .error: return "❌"
            case .network: return "🌐"
            }
        }

        var name: String {
            switch self {
            case .debug: return "DEBUG"
            case .info: return "INFO"
            case .warning: return "WARN"
            case .error: return "ERROR"
            case .network: return "NET"
            }
        }

        static func < (lhs: Level, rhs: Level) -> Bool {
            lhs.rawValue < rhs.rawValue
        }
    }

    // MARK: - Private Logger

    private static let subsystem = Bundle.main.bundleIdentifier ?? "com.booklibrio.app"
    private static let logger = os.Logger(subsystem: subsystem, category: "BookLibrio")

    // MARK: - Log Methods

    /// Debug log - detailed info for debugging
    static func d(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        log(.debug, message, file: file, function: function, line: line)
    }

    /// Info log - general information
    static func i(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        log(.info, message, file: file, function: function, line: line)
    }

    /// Warning log
    static func w(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        log(.warning, message, file: file, function: function, line: line)
    }

    /// Error log
    static func e(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        log(.error, message, file: file, function: function, line: line)
    }

    /// Error log with Error object
    static func e(_ message: String, error: Error, file: String = #file, function: String = #function, line: Int = #line) {
        log(.error, "\(message): \(error.localizedDescription)", file: file, function: function, line: line)
    }

    // MARK: - Network Logging

    /// Log network request
    static func request(_ method: String, url: String, body: Data? = nil) {
        guard isEnabled else { return }

        var message = "➡️ \(method) \(url)"
        if let body = body, let bodyString = String(data: body, encoding: .utf8) {
            message += "\n   📤 Body: \(bodyString.prefix(500))"
        }
        log(.network, message)
    }

    /// Log network response
    static func response(_ statusCode: Int, url: String, data: Data?, duration: TimeInterval? = nil) {
        guard isEnabled else { return }

        let statusEmoji = (200...299).contains(statusCode) ? "✅" : "❌"
        var message = "⬅️ \(statusEmoji) \(statusCode) \(url)"

        if let duration = duration {
            message += " (\(String(format: "%.2f", duration * 1000))ms)"
        }

        if let data = data, let dataString = String(data: data, encoding: .utf8) {
            let preview = dataString.prefix(500)
            message += "\n   📥 Response: \(preview)\(dataString.count > 500 ? "..." : "")"
        }
        log(.network, message)
    }

    // MARK: - Lifecycle Logging

    /// Log view appeared
    static func viewAppeared(_ viewName: String) {
        i("📱 View appeared: \(viewName)")
    }

    /// Log view disappeared
    static func viewDisappeared(_ viewName: String) {
        d("📱 View disappeared: \(viewName)")
    }

    // MARK: - Private Implementation

    private static func log(_ level: Level, _ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        guard isEnabled && level >= minLevel else { return }

        let fileName = (file as NSString).lastPathComponent
        let logMessage = "\(level.emoji) [\(level.name)] [\(fileName):\(line)] \(function) → \(message)"

        // Log to unified logging system (visible in Xcode console and Console.app)
        switch level {
        case .debug:
            logger.debug("\(logMessage)")
        case .info:
            logger.info("\(logMessage)")
        case .warning:
            logger.warning("\(logMessage)")
        case .error:
            logger.error("\(logMessage)")
        case .network:
            logger.info("\(logMessage)")
        }

        // Add Sentry breadcrumb for non-debug levels
        if level >= .info {
            SentryManager.addBreadcrumb(
                category: level == .network ? "http" : "log",
                message: message,
                level: sentryLevel(for: level)
            )
        }

        // Capture error-level messages as Sentry events
        if level == .error {
            SentryManager.captureMessage(message, level: .error)
        }
    }

    /// Convert Log.Level to SentryLevel
    private static func sentryLevel(for level: Level) -> SentryLevel {
        switch level {
        case .debug: return .debug
        case .info, .network: return .info
        case .warning: return .warning
        case .error: return .error
        }
    }
}

// MARK: - Convenience Extensions

extension Log {
    /// Log JSON data in pretty format
    static func json(_ label: String, data: Data?) {
        guard isEnabled, let data = data else { return }

        if let json = try? JSONSerialization.jsonObject(with: data),
           let prettyData = try? JSONSerialization.data(withJSONObject: json, options: .prettyPrinted),
           let prettyString = String(data: prettyData, encoding: .utf8) {
            d("\(label):\n\(prettyString)")
        }
    }

    /// Log dictionary
    static func dict(_ label: String, _ dictionary: [String: Any]) {
        guard isEnabled else { return }
        d("\(label): \(dictionary)")
    }

    /// Measure execution time
    static func measure(_ label: String, block: () -> Void) {
        let start = CFAbsoluteTimeGetCurrent()
        block()
        let duration = (CFAbsoluteTimeGetCurrent() - start) * 1000
        i("⏱️ \(label): \(String(format: "%.2f", duration))ms")
    }

    /// Measure async execution time
    static func measureAsync(_ label: String, block: () async -> Void) async {
        let start = CFAbsoluteTimeGetCurrent()
        await block()
        let duration = (CFAbsoluteTimeGetCurrent() - start) * 1000
        i("⏱️ \(label): \(String(format: "%.2f", duration))ms")
    }
}
