import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var localError: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Logo and title - matching LoginView theme
            VStack(spacing: 16) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 100, height: 100)
                    .cornerRadius(20)

                Text(L10n.Common.appName)
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.brandBlue)

                Text(L10n.Auth.createAccount)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(spacing: 16) {
                // Email
                HStack {
                    Image(systemName: "envelope")
                        .foregroundColor(.secondary)
                    TextField(L10n.Auth.email, text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)

                // Password
                HStack {
                    Image(systemName: "lock")
                        .foregroundColor(.secondary)

                    if showPassword {
                        TextField(L10n.Auth.password, text: $password)
                    } else {
                        SecureField(L10n.Auth.password, text: $password)
                    }

                    Button(action: { showPassword.toggle() }) {
                        Image(systemName: showPassword ? "eye" : "eye.slash")
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }

            // Error message
            if let error = localError ?? authManager.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            // Register button - using brandBlue
            Button(action: register) {
                if authManager.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(L10n.Auth.register)
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.brandBlue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(authManager.isLoading || !isFormValid)

            // Login link
            Button(action: { dismiss() }) {
                Text(L10n.Auth.hasAccount)
                    .font(.subheadline)
            }

            Spacer()
        }
        .padding(.horizontal, 24)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var isFormValid: Bool {
        !email.isEmpty && password.count >= 6
    }

    private func register() {
        localError = nil

        guard password.count >= 6 else {
            localError = L10n.Auth.passwordMinLength
            return
        }

        // Username will be derived from email on the server
        Task {
            await authManager.register(username: email.split(separator: "@").first.map(String.init) ?? email, email: email, password: password)
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView()
            .environmentObject(AuthManager.shared)
    }
}
