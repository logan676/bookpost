import SwiftUI

struct EbookDetailView: View {
    let ebookId: Int
    @State private var ebook: Ebook?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showReader = false

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if let error = errorMessage {
                ErrorView(message: error) {
                    Task { await loadEbook() }
                }
            } else if let ebook = ebook {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        HStack(alignment: .top, spacing: 16) {
                            BookCoverView(coverUrl: ebook.coverUrl, title: ebook.title)
                                .frame(width: 150, height: 210)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .shadow(radius: 4)

                            VStack(alignment: .leading, spacing: 8) {
                                Text(ebook.title)
                                    .font(.title2)
                                    .fontWeight(.bold)

                                if let fileType = ebook.fileType {
                                    Label(fileType.uppercased(), systemImage: "doc")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }

                                if let fileSize = ebook.fileSize {
                                    Label(fileSize.formattedFileSize, systemImage: "arrow.down.circle")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(.horizontal)

                        Button(action: { showReader = true }) {
                            Text(L10n.Ebooks.startReading)
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                        }
                        .buttonStyle(.borderedProminent)
                        .padding(.horizontal)
                    }
                    .padding(.vertical)
                }
            }
        }
        .navigationTitle(ebook?.title ?? L10n.Ebooks.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadEbook()
        }
        .fullScreenCover(isPresented: $showReader) {
            if let ebook = ebook {
                ReaderContainerView(
                    bookType: "ebook",
                    bookId: ebook.id,
                    title: ebook.title,
                    fileType: ebook.fileType ?? "pdf",
                    coverUrl: ebook.coverUrl
                )
            }
        }
    }

    private func loadEbook() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getEbookCached(id: ebookId)
            ebook = response.data
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    NavigationStack {
        EbookDetailView(ebookId: 1)
    }
}
