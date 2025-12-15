import Foundation
import SwiftUI

class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var currentUser: User?
    @Published var isLoggedIn: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let userDefaultsKey = "bookpost_auth"

    var accessToken: String? {
        UserDefaults.standard.string(forKey: "\(userDefaultsKey)_access_token")
    }

    var refreshToken: String? {
        UserDefaults.standard.string(forKey: "\(userDefaultsKey)_refresh_token")
    }

    private init() {
        loadStoredAuth()
    }

    private func loadStoredAuth() {
        if let userData = UserDefaults.standard.data(forKey: "\(userDefaultsKey)_user"),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            self.currentUser = user
            self.isLoggedIn = accessToken != nil
        }
    }

    private func saveAuth(user: User, accessToken: String, refreshToken: String) {
        if let userData = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(userData, forKey: "\(userDefaultsKey)_user")
        }
        UserDefaults.standard.set(accessToken, forKey: "\(userDefaultsKey)_access_token")
        UserDefaults.standard.set(refreshToken, forKey: "\(userDefaultsKey)_refresh_token")

        // Set Sentry user context
        SentryManager.setUser(id: user.id, username: user.username)

        DispatchQueue.main.async {
            self.currentUser = user
            self.isLoggedIn = true
        }
    }

    private func clearAuth() {
        UserDefaults.standard.removeObject(forKey: "\(userDefaultsKey)_user")
        UserDefaults.standard.removeObject(forKey: "\(userDefaultsKey)_access_token")
        UserDefaults.standard.removeObject(forKey: "\(userDefaultsKey)_refresh_token")

        // Clear Sentry user context
        SentryManager.clearUser()

        DispatchQueue.main.async {
            self.currentUser = nil
            self.isLoggedIn = false
        }
    }

    @MainActor
    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        Log.i("Login attempt for email: \(email)")

        do {
            let response = try await APIClient.shared.login(email: email, password: password)
            Log.i("Login successful for user ID: \(response.data.user.id)")
            saveAuth(
                user: response.data.user,
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken
            )
        } catch let error as APIError {
            Log.e("Login failed with APIError", error: error)
            errorMessage = error.localizedDescription
        } catch {
            Log.e("Login failed with error: \(String(describing: error))", error: error)
            errorMessage = "Login failed: \(error.localizedDescription)"
        }

        isLoading = false
    }

    @MainActor
    func register(username: String, email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        Log.i("Registering user: \(email)")

        do {
            let response = try await APIClient.shared.register(username: username, email: email, password: password)
            Log.i("Registration successful for user ID: \(response.data.user.id)")
            saveAuth(
                user: response.data.user,
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken
            )
        } catch let error as APIError {
            Log.e("Registration failed", error: error)
            errorMessage = error.localizedDescription
        } catch {
            Log.e("Registration failed", error: error)
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func logout() {
        clearAuth()
    }

    @MainActor
    func refreshAccessToken() async -> Bool {
        guard let refreshToken = refreshToken else { return false }

        do {
            let response = try await APIClient.shared.refreshToken(refreshToken)
            UserDefaults.standard.set(response.data.accessToken, forKey: "\(userDefaultsKey)_access_token")
            UserDefaults.standard.set(response.data.refreshToken, forKey: "\(userDefaultsKey)_refresh_token")
            return true
        } catch {
            clearAuth()
            return false
        }
    }

    /// Update user's avatar URL locally after successful upload
    @MainActor
    func updateUserAvatar(_ avatarUrl: String) {
        guard let currentUser = currentUser else { return }

        // Create updated user with new avatar
        let updatedUser = User(
            id: currentUser.id,
            username: currentUser.username,
            email: currentUser.email,
            avatar: avatarUrl,
            isAdmin: currentUser.isAdmin,
            createdAt: currentUser.createdAt
        )

        // Save to UserDefaults
        if let userData = try? JSONEncoder().encode(updatedUser) {
            UserDefaults.standard.set(userData, forKey: "\(userDefaultsKey)_user")
        }

        // Update published property to trigger UI refresh
        self.currentUser = updatedUser
    }
}
