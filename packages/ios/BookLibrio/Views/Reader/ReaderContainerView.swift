import SwiftUI

/// Container view that routes to the appropriate reader based on file type
/// This provides a unified entry point for reading any book type
struct ReaderContainerView: View {
    let bookType: String        // "ebook" or "magazine"
    let bookId: Int
    let title: String
    let fileType: String        // "pdf" or "epub"
    let coverUrl: String?

    @Environment(\.dismiss) var dismiss

    var body: some View {
        Group {
            if fileType.lowercased() == "epub" {
                // EPUB reader with Readium integration
                EPUBReaderView(
                    bookType: bookType,
                    id: bookId,
                    title: title,
                    coverUrl: coverUrl
                )
            } else {
                // PDF reader (enhanced version)
                EnhancedPDFReaderView(
                    type: bookType,
                    id: bookId,
                    title: title,
                    coverUrl: coverUrl
                )
            }
        }
        .onAppear {
            Log.i("📖 ReaderContainerView opened: bookType=\(bookType), id=\(bookId), fileType=\(fileType), title=\(title)")
        }
    }
}

/// Placeholder view for EPUB reader until Readium is integrated
/// This shows a message that EPUB support requires additional setup
struct EPUBReaderPlaceholderView: View {
    let bookType: String
    let id: Int
    let title: String
    let coverUrl: String?

    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // Book cover
                if let coverUrl = coverUrl {
                    BookCoverView(coverUrl: coverUrl, title: title)
                        .frame(width: 150, height: 210)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(radius: 8)
                }

                Text(title)
                    .font(.title2)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                VStack(spacing: 12) {
                    Image(systemName: "book.closed")
                        .font(.system(size: 48))
                        .foregroundColor(.orange)

                    Text("EPUB Reader")
                        .font(.headline)

                    Text("EPUB format requires Readium framework integration.\nPlease add Readium Swift Toolkit dependency in Xcode and rebuild.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
                .padding(.vertical, 24)
                .frame(maxWidth: .infinity)
                .background(Color(.systemGray6))
                .cornerRadius(16)
                .padding(.horizontal)

                Spacer()
            }
            .navigationTitle("EPUB")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Reader.close) {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview("PDF Book") {
    ReaderContainerView(
        bookType: "ebook",
        bookId: 1,
        title: "Sample PDF Book",
        fileType: "pdf",
        coverUrl: nil
    )
}

#Preview("EPUB Book") {
    ReaderContainerView(
        bookType: "ebook",
        bookId: 2,
        title: "Sample EPUB Book",
        fileType: "epub",
        coverUrl: nil
    )
}
