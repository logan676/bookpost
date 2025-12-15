import SwiftUI

struct BookCoverView: View {
    let coverUrl: String?
    let title: String
    var useThumbnail: Bool = false

    // Base URL for the API - relative paths need this prefix
    private static let baseURL = "https://bookpost-api-hono.fly.dev"

    /// Converts a cover URL to an absolute URL if needed
    /// Appends ?thumb=1 for thumbnail requests
    private var absoluteURL: URL? {
        guard let urlString = coverUrl, !urlString.isEmpty else { return nil }

        var finalUrl: String

        // If it's already an absolute URL, use it directly
        if urlString.hasPrefix("http://") || urlString.hasPrefix("https://") {
            finalUrl = urlString
        } else if urlString.hasPrefix("/") {
            // If it's a relative path, prepend the base URL
            finalUrl = Self.baseURL + urlString
        } else {
            // Try as-is (shouldn't happen but fallback)
            finalUrl = urlString
        }

        // Append thumbnail parameter if requested
        if useThumbnail {
            let separator = finalUrl.contains("?") ? "&" : "?"
            finalUrl += "\(separator)thumb=1"
        }

        return URL(string: finalUrl)
    }

    var body: some View {
        if let url = absoluteURL {
            CachedAsyncImage(url: url) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
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

    // Standard book cover aspect ratio (width:height ≈ 2:3)
    private let coverAspectRatio: CGFloat = 2.0 / 3.0

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
        .aspectRatio(coverAspectRatio, contentMode: .fit)
    }
}

struct BookCoverCard: View {
    let title: String
    let coverUrl: String?
    let subtitle: String?
    let action: () -> Void

    // Standard book cover aspect ratio (width:height ≈ 2:3)
    private let coverAspectRatio: CGFloat = 2.0 / 3.0

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                BookCoverView(coverUrl: coverUrl, title: title, useThumbnail: true)
                    .aspectRatio(coverAspectRatio, contentMode: .fit)
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
