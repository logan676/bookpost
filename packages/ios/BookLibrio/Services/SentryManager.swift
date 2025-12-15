/**
 * Sentry Integration for BookLibrio iOS App
 *
 * Setup Instructions:
 * 1. In Xcode, go to File > Add Package Dependencies
 * 2. Add: https://github.com/getsentry/sentry-cocoa.git
 * 3. Select version 8.x or latest
 * 4. Add SENTRY_DSN to your Info.plist or environment
 */

import Foundation

// Conditionally import Sentry
#if canImport(Sentry)
import Sentry
#endif

/// Manages Sentry error tracking and performance monitoring
enum SentryManager {
    // MARK: - Configuration

    /// Sentry DSN for BookLibrio iOS
    private static let sentryDSN = "https://027c3222e70638d10ec0778a48fbfcf2@o4510539308400640.ingest.us.sentry.io/4510539311284224"

    /// Initialize Sentry SDK - call this in App init
    static func initialize() {
        #if canImport(Sentry)
        // Use Info.plist value if available, otherwise use default DSN
        let dsn = (Bundle.main.object(forInfoDictionaryKey: "SENTRY_DSN") as? String) ?? sentryDSN
        guard !dsn.isEmpty else {
            Log.i("[Sentry] DSN not configured, skipping initialization")
            return
        }

        SentrySDK.start { options in
            options.dsn = dsn

            // Environment
            #if DEBUG
            options.environment = "development"
            options.debug = true
            options.tracesSampleRate = 1.0
            #else
            options.environment = "production"
            options.tracesSampleRate = 0.2
            #endif

            // Release version
            if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
               let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String {
                options.releaseName = "\(version)+\(build)"
            }

            // Performance monitoring
            options.profilesSampleRate = 0.1

            // Breadcrumbs
            options.maxBreadcrumbs = 100

            // Attach stack traces
            options.attachStacktrace = true

            // Privacy - don't send PII
            options.sendDefaultPii = false

            // Enable app hang detection
            options.enableAppHangTracking = true
            options.appHangTimeoutInterval = 2.0

            // Screenshot on crash (optional, disable for privacy)
            options.attachScreenshot = false
            options.attachViewHierarchy = false
        }

        Log.i("[Sentry] Initialized successfully")
        #else
        Log.w("[Sentry] SDK not installed - add via SPM: https://github.com/getsentry/sentry-cocoa.git")
        #endif
    }

    // MARK: - User Context

    /// Set user context after login
    static func setUser(id: Int, username: String?) {
        #if canImport(Sentry)
        let user = Sentry.User()
        user.userId = String(id)
        user.username = username
        SentrySDK.setUser(user)
        Log.d("[Sentry] User context set: \(id)")
        #endif
    }

    /// Clear user context on logout
    static func clearUser() {
        #if canImport(Sentry)
        SentrySDK.setUser(nil)
        Log.d("[Sentry] User context cleared")
        #endif
    }

    // MARK: - Breadcrumbs

    /// Add a breadcrumb for navigation or user action
    static func addBreadcrumb(
        category: String,
        message: String,
        level: SentryLevel = .info,
        data: [String: Any]? = nil
    ) {
        #if canImport(Sentry)
        let crumb = Breadcrumb(level: level, category: category)
        crumb.message = message
        crumb.timestamp = Date()
        if let data = data {
            crumb.data = data
        }
        SentrySDK.addBreadcrumb(crumb)
        #endif
    }

    /// Add UI breadcrumb (view appeared, button tapped, etc.)
    static func addUIBreadcrumb(_ message: String, data: [String: Any]? = nil) {
        addBreadcrumb(category: "ui", message: message, data: data)
    }

    /// Add navigation breadcrumb
    static func addNavigationBreadcrumb(from: String?, to: String) {
        addBreadcrumb(
            category: "navigation",
            message: "Navigated to \(to)",
            data: from != nil ? ["from": from!, "to": to] : ["to": to]
        )
    }

    /// Add HTTP breadcrumb
    static func addHTTPBreadcrumb(method: String, url: String, statusCode: Int? = nil) {
        var data: [String: Any] = ["method": method, "url": url]
        if let statusCode = statusCode {
            data["status_code"] = statusCode
        }
        addBreadcrumb(
            category: "http",
            message: "\(method) \(url)",
            level: statusCode.map { (200...299).contains($0) ? .info : .error } ?? .info,
            data: data
        )
    }

    // MARK: - Error Capture

    /// Capture an error with context
    static func captureError(_ error: Error, context: [String: Any]? = nil) {
        #if canImport(Sentry)
        SentrySDK.capture(error: error) { scope in
            if let context = context {
                for (key, value) in context {
                    scope.setExtra(value: value, key: key)
                }
            }
        }
        #endif
    }

    /// Capture a message
    static func captureMessage(_ message: String, level: SentryLevel = .info) {
        #if canImport(Sentry)
        SentrySDK.capture(message: message) { scope in
            scope.setLevel(level)
        }
        #endif
    }

    // MARK: - Performance

    /// Start a transaction for performance monitoring
    static func startTransaction(name: String, operation: String) -> Any? {
        #if canImport(Sentry)
        return SentrySDK.startTransaction(name: name, operation: operation)
        #else
        return nil
        #endif
    }

    /// Finish a transaction
    static func finishTransaction(_ transaction: Any?, status: SentrySpanStatus = .ok) {
        #if canImport(Sentry)
        if let span = transaction as? Span {
            span.finish(status: status)
        }
        #endif
    }

    // MARK: - Distributed Tracing

    /// Get trace headers for API requests
    static func getTraceHeaders() -> [String: String] {
        #if canImport(Sentry)
        var headers: [String: String] = [:]
        if let span = SentrySDK.span {
            headers["sentry-trace"] = span.toTraceHeader().value()
            if let baggage = span.toBaggageHeader() {
                headers["baggage"] = baggage.value()
            }
        }
        return headers
        #else
        return [:]
        #endif
    }
}

// MARK: - SentryLevel Extension (for when Sentry is not imported)

#if !canImport(Sentry)
enum SentryLevel {
    case debug, info, warning, error, fatal
}

enum SentrySpanStatus {
    case ok, cancelled, internalError, unknownError
}
#endif
