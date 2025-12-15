/**
 * Reading Session Manager
 * Manages reading session lifecycle with heartbeat mechanism
 */

import Foundation
import UIKit
import Combine

@MainActor
class ReadingSessionManager: ObservableObject {
    static let shared = ReadingSessionManager()

    // MARK: - Published Properties
    @Published var currentSession: ReadingSession?
    @Published var todayDuration: Int = 0
    @Published var isActive: Bool = false
    @Published var isPaused: Bool = false
    @Published var elapsedSeconds: Int = 0  // For UI display timer

    // MARK: - Private Properties
    private var heartbeatTimer: Timer?
    private var displayTimer: Timer?  // 1-second timer for UI updates
    private let heartbeatInterval: TimeInterval = 30  // 30 seconds
    private var cancellables = Set<AnyCancellable>()

    private init() {
        setupNotifications()
    }

    // MARK: - Lifecycle Notifications
    private func setupNotifications() {
        NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)
            .sink { [weak self] _ in
                Task { @MainActor in
                    await self?.handleAppBackgrounded()
                }
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)
            .sink { [weak self] _ in
                self?.handleAppForegrounded()
            }
            .store(in: &cancellables)
    }

    // MARK: - Session Management

    /// Start a new reading session
    func startSession(
        bookId: Int,
        bookType: String,
        position: String? = nil,
        chapterIndex: Int? = nil
    ) async throws {
        let request = StartSessionRequest(
            bookId: bookId,
            bookType: bookType,
            position: position,
            chapterIndex: chapterIndex,
            deviceType: "ios",
            deviceId: UIDevice.current.identifierForVendor?.uuidString
        )

        let response: APIResponse<StartSessionResponse> = try await APIClient.shared.post(
            "/reading/sessions/start",
            body: request
        )

        guard let data = response.data else {
            throw ReadingSessionError.invalidResponse
        }

        currentSession = ReadingSession(
            id: data.sessionId,
            bookId: bookId,
            bookType: bookType,
            startTime: data.startTime,
            durationSeconds: 0
        )

        isActive = true
        isPaused = false
        elapsedSeconds = 0
        startHeartbeat()
        startDisplayTimer()
    }

    /// Pause the current reading session
    func pauseSession() async throws {
        guard let session = currentSession else { return }

        let response: APIResponse<PauseResumeResponse> = try await APIClient.shared.post(
            "/reading/sessions/\(session.id)/pause",
            body: EmptyBody()
        )

        if let data = response.data, data.isPaused {
            isPaused = true
            stopDisplayTimer()
        }
    }

    /// Resume the current reading session
    func resumeSession() async throws {
        guard let session = currentSession else { return }

        let response: APIResponse<PauseResumeResponse> = try await APIClient.shared.post(
            "/reading/sessions/\(session.id)/resume",
            body: EmptyBody()
        )

        if let data = response.data, !data.isPaused {
            isPaused = false
            startDisplayTimer()
        }
    }

    /// Toggle pause/resume state
    func togglePause() async throws {
        if isPaused {
            try await resumeSession()
        } else {
            try await pauseSession()
        }
    }

    /// Update current position (called by reader views)
    func updatePosition(_ position: String, chapterIndex: Int? = nil, pagesRead: Int = 0) {
        // Store for next heartbeat
        // This would be implemented with local storage for the current position
    }

    /// End the current session
    func endSession(
        endPosition: String? = nil,
        chapterIndex: Int? = nil,
        pagesRead: Int? = nil
    ) async throws -> EndSessionResponse? {
        guard let session = currentSession else { return nil }

        stopHeartbeat()
        stopDisplayTimer()

        let request = EndSessionRequest(
            endPosition: endPosition,
            chapterIndex: chapterIndex,
            pagesRead: pagesRead
        )

        let response: APIResponse<EndSessionResponse> = try await APIClient.shared.post(
            "/reading/sessions/\(session.id)/end",
            body: request
        )

        currentSession = nil
        isActive = false
        isPaused = false

        if let data = response.data {
            todayDuration = data.todayDuration

            // Notify about new milestones
            if !data.milestonesAchieved.isEmpty {
                NotificationCenter.default.post(
                    name: .milestonesAchieved,
                    object: data.milestonesAchieved
                )
            }

            return data
        }

        return nil
    }

    // MARK: - Heartbeat

    private func startHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = Timer.scheduledTimer(
            withTimeInterval: heartbeatInterval,
            repeats: true
        ) { [weak self] _ in
            Task { @MainActor in
                await self?.sendHeartbeat()
            }
        }
    }

    private func stopHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
    }

    // MARK: - Display Timer (1-second for UI)

    private func startDisplayTimer() {
        displayTimer?.invalidate()
        displayTimer = Timer.scheduledTimer(
            withTimeInterval: 1.0,
            repeats: true
        ) { [weak self] _ in
            Task { @MainActor in
                self?.elapsedSeconds += 1
            }
        }
    }

    private func stopDisplayTimer() {
        displayTimer?.invalidate()
        displayTimer = nil
    }

    /// Format elapsed seconds as readable string (e.g., "5:32" or "1:05:32")
    var formattedElapsedTime: String {
        let hours = elapsedSeconds / 3600
        let minutes = (elapsedSeconds % 3600) / 60
        let seconds = elapsedSeconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }

    // MARK: - Heartbeat Network Sync

    private func sendHeartbeat() async {
        guard let session = currentSession else { return }

        do {
            let request = HeartbeatRequest(
                currentPosition: nil,  // Would be stored from updatePosition
                chapterIndex: nil,
                pagesRead: nil
            )

            let response: APIResponse<HeartbeatResponse> = try await APIClient.shared.post(
                "/reading/sessions/\(session.id)/heartbeat",
                body: request
            )

            if let data = response.data {
                todayDuration = data.todayDuration
                currentSession?.durationSeconds = data.durationSeconds
            }
        } catch {
            print("Heartbeat failed: \(error)")
        }
    }

    // MARK: - App Lifecycle

    private func handleAppBackgrounded() async {
        // Stop display timer to save battery
        stopDisplayTimer()
        // Send final heartbeat before backgrounding
        await sendHeartbeat()
    }

    private func handleAppForegrounded() {
        // Resume timers if session is active
        if currentSession != nil {
            startHeartbeat()
            startDisplayTimer()
        }
    }

    // MARK: - Today Duration

    func fetchTodayDuration() async throws {
        let response: APIResponse<TodayDurationResponse> = try await APIClient.shared.get(
            "/reading/today"
        )

        if let data = response.data {
            todayDuration = data.todayDuration
        }
    }

    // MARK: - Active Session Check

    func checkActiveSession() async throws {
        struct ActiveSessionResponse: Codable {
            let sessionId: Int?
            let bookId: Int?
            let bookType: String?
            let startTime: String?
            let durationSeconds: Int?
        }

        let response: APIResponse<ActiveSessionResponse?> = try await APIClient.shared.get(
            "/reading/sessions/active"
        )

        if let data = response.data, let session = data,
           let sessionId = session.sessionId,
           let bookId = session.bookId,
           let bookType = session.bookType,
           let startTime = session.startTime,
           let durationSeconds = session.durationSeconds {
            currentSession = ReadingSession(
                id: sessionId,
                bookId: bookId,
                bookType: bookType,
                startTime: startTime,
                durationSeconds: durationSeconds
            )
            isActive = true
            elapsedSeconds = durationSeconds  // Restore from server
            startHeartbeat()
            startDisplayTimer()
        }
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let milestonesAchieved = Notification.Name("milestonesAchieved")
}

// MARK: - Reading Session API Error (used internally)
enum ReadingSessionError: Error {
    case invalidResponse
    case networkError(Error)
    case serverError(String)
}

