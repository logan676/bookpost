import SwiftUI

struct BookCoverView: View {
    let coverUrl: String?
    let title: String

    // Base URL for the API - relative paths need this prefix
    private static let baseURL = "https://bookpost-api-hono.fly.dev"

    /// Converts a cover URL to an absolute URL if needed
    private var absoluteURL: URL? {
        guard let urlString = coverUrl, !urlString.isEmpty else { return nil }

        // If it's already an absolute URL, use it directly
        if urlString.hasPrefix("http://") || urlString.hasPrefix("https://") {
            return URL(string: urlString)
        }

        // If it's a relative path, prepend the base URL
        if urlString.hasPrefix("/") {
            return URL(string: Self.baseURL + urlString)
        }

        // Try as-is (shouldn't happen but fallback)
        return URL(string: urlString)
    }

    var body: some View {
        if let url = absoluteURL {
            CachedAsyncImage(url: url) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                PlaceholderCover(title: title)
            }
            .onAppear {
                Log.d("BookCoverView: rendering with URL \(url.absoluteString) for '\(title)'")
            }
        } else {
            PlaceholderCover(title: title)
                .onAppear {
                    Log.d("BookCoverView: no URL for '\(title)', coverUrl=\(coverUrl ?? "nil")")
                }
        }
    }
}

struct PlaceholderCover: View {
    let title: String

    var body: some View {
        ZStack {
            Color(.systemGray5)

            VStack {
                Image(systemName: "book.closed")
                    .font(.system(size: 30))
                    .foregroundColor(.secondary)

                Text(title)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 4)
            }
        }
    }
}

struct BookCoverCard: View {
    let title: String
    let coverUrl: String?
    let subtitle: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                BookCoverView(coverUrl: coverUrl, title: title)
                    .frame(height: 180)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 2)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    BookCoverCard(
        title: "Sample Book Title",
        coverUrl: nil,
        subtitle: "PDF",
        action: {}
    )
    .frame(width: 140)
    .padding()
}
