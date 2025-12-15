import Foundation

struct User: Codable, Identifiable {
    let id: Int
    let username: String
    let email: String
    let avatar: String?
    let isAdmin: Bool?
    let createdAt: String?
}

struct AuthToken: Codable {
    let accessToken: String
    let refreshToken: String
}

struct AuthResponse: Codable {
    let data: AuthData
}

struct AuthData: Codable {
    let user: User
    let accessToken: String
    let refreshToken: String
}

struct RefreshTokenResponse: Codable {
    let data: RefreshTokenData
}

struct RefreshTokenData: Codable {
    let accessToken: String
    let refreshToken: String
}

struct UserResponse: Codable {
    let data: User
}
