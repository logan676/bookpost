import SwiftUI

struct MagazineDetailView: View {
    let magazineId: Int
    @State private var magazine: Magazine?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showReader = false

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if let error = errorMessage {
                ErrorView(message: error) {
                    Task { await loadMagazine() }
                }
            } else if let magazine = magazine {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        HStack(alignment: .top, spacing: 16) {
                            BookCoverView(coverUrl: magazine.coverUrl, title: magazine.title)
                                .frame(width: 150, height: 210)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .shadow(radius: 4)

                            VStack(alignment: .leading, spacing: 8) {
                                Text(magazine.title)
                                    .font(.title2)
                                    .fontWeight(.bold)

                                if let year = magazine.year {
                                    Label(L10n.Magazines.year(year), systemImage: "calendar")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }

                                if let pageCount = magazine.pageCount {
                                    Label(L10n.Magazines.pageCount(pageCount), systemImage: "doc.text")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }

                                if let fileSize = magazine.fileSize {
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
        .navigationTitle(magazine?.title ?? L10n.Magazines.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadMagazine()
        }
        .fullScreenCover(isPresented: $showReader) {
            if let magazine = magazine {
                ReaderContainerView(
                    bookType: "magazine",
                    bookId: magazine.id,
                    title: magazine.title,
                    fileType: "pdf",  // Magazines are always PDF
                    coverUrl: magazine.coverUrl
                )
            }
        }
    }

    private func loadMagazine() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getMagazineCached(id: magazineId)
            magazine = response.data
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    NavigationStack {
        MagazineDetailView(magazineId: 1)
    }
}
