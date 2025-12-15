import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var showRegister = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // Logo and title
                VStack(spacing: 16) {
                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)
                        .cornerRadius(24)

                    Text(L10n.Common.appName)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.brandBlue)

                    Text(L10n.Auth.loginToAccount)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Input fields
                VStack(spacing: 16) {
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
                if let error = authManager.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                }

                // Login button
                Button(action: {
                    Task {
                        await authManager.login(email: email, password: password)
                    }
                }) {
                    if authManager.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text(L10n.Auth.login)
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.brandBlue)
                .foregroundColor(.white)
                .cornerRadius(10)
                .disabled(authManager.isLoading || email.isEmpty || password.isEmpty)

                // Register link
                Button(action: { showRegister = true }) {
                    Text(L10n.Auth.noAccount)
                        .font(.subheadline)
                }

                Spacer()
            }
            .padding(.horizontal, 24)
            .navigationDestination(isPresented: $showRegister) {
                RegisterView()
            }
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthManager.shared)
}
