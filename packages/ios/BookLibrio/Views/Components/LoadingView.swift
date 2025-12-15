import SwiftUI

struct LoadingView: View {
    var message: String = L10n.Common.loading

    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct ErrorView: View {
    let message: String
    var retryAction: (() -> Void)?

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(.red)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            if let retryAction = retryAction {
                Button(action: retryAction) {
                    Text(L10n.Common.retry)
                        .fontWeight(.medium)
                }
                .buttonStyle(.bordered)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct EmptyView: View {
    var message: String = L10n.Common.noContent

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 50))
                .foregroundColor(.secondary)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    VStack {
        LoadingView()
        ErrorView(message: L10n.Common.error, retryAction: {})
        EmptyView()
    }
}
