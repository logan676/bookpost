import SwiftUI
import PDFKit

struct PDFReaderView: View {
    let type: String
    let id: Int
    let title: String

    @Environment(\.dismiss) var dismiss
    @StateObject private var sessionManager = ReadingSessionManager.shared
    @State private var pdfDocument: PDFDocument?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var currentPage = 0
    @State private var totalPages = 0
    @State private var downloadProgress: Double = 0
    @State private var sessionStarted = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)

                        if downloadProgress > 0 {
                            ProgressView(value: downloadProgress)
                                .frame(width: 200)

                            Text("\(Int(downloadProgress * 100))%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        } else {
                            Text(L10n.Common.loading)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                } else if let error = errorMessage {
                    ErrorView(message: error) {
                        Task { await loadPDF() }
                    }
                } else if let document = pdfDocument {
                    PDFKitView(document: document, currentPage: $currentPage)
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Reader.close) {
                        closeReader()
                    }
                }

                ToolbarItem(placement: .principal) {
                    // Reading timer display with pause/play button
                    if sessionManager.isActive {
                        Button {
                            Task {
                                try? await sessionManager.togglePause()
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: sessionManager.isPaused ? "play.fill" : "pause.fill")
                                    .font(.caption)
                                Text(sessionManager.formattedElapsedTime)
                                    .font(.system(.caption, design: .monospaced))
                                    .fontWeight(.medium)
                            }
                            .foregroundColor(sessionManager.isPaused ? .gray : .orange)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(sessionManager.isPaused ? Color.gray.opacity(0.15) : Color.orange.opacity(0.15))
                            .cornerRadius(8)
                        }
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    if totalPages > 0 {
                        Text(L10n.Reader.pageOf(currentPage + 1, totalPages))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .task {
            await loadPDF()
        }
        .onDisappear {
            // Ensure session ends if view disappears without explicit close
            if sessionStarted {
                Task {
                    await endReadingSession()
                }
            }
        }
    }

    private func closeReader() {
        // Save position locally (instant)
        saveReadingProgress()

        // Dismiss immediately for responsive UX
        dismiss()

        // Background: end session (fire-and-forget)
        // Note: Session ending happens via onDisappear
    }

    private func startReadingSession() async {
        guard !sessionStarted else { return }
        do {
            try await sessionManager.startSession(
                bookId: id,
                bookType: type,
                position: "\(currentPage)",
                chapterIndex: nil
            )
            sessionStarted = true
        } catch {
            print("Failed to start reading session: \(error)")
        }
    }

    private func endReadingSession() async {
        guard sessionStarted else { return }
        do {
            _ = try await sessionManager.endSession(
                endPosition: "\(currentPage)",
                chapterIndex: nil,
                pagesRead: currentPage + 1
            )
            sessionStarted = false
        } catch {
            print("Failed to end reading session: \(error)")
        }
    }

    private func loadPDF() async {
        isLoading = true
        errorMessage = nil

        // Check cache first
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let cachedFile = cacheDir.appendingPathComponent("pdfs/\(type)s/\(id).pdf")

        if FileManager.default.fileExists(atPath: cachedFile.path),
           let document = PDFDocument(url: cachedFile) {
            self.pdfDocument = document
            self.totalPages = document.pageCount
            isLoading = false
            // Start reading session after PDF loads
            await startReadingSession()
            return
        }

        // Download from API
        do {
            let fileURL: URL
            if type == "ebook" {
                fileURL = try await APIClient.shared.downloadEbookFile(id: id, fileType: "pdf")
            } else {
                fileURL = try await APIClient.shared.downloadMagazineFile(id: id)
            }

            if let document = PDFDocument(url: fileURL) {
                self.pdfDocument = document
                self.totalPages = document.pageCount
                // Start reading session after PDF loads
                await startReadingSession()
            } else {
                errorMessage = L10n.Reader.openFailed
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func saveReadingProgress() {
        guard totalPages > 0 else { return }

        Task {
            let itemType: ItemType = type == "ebook" ? .ebook : .magazine
            try? await APIClient.shared.updateReadingHistory(
                itemType: itemType,
                itemId: id,
                title: title,
                coverUrl: nil,
                lastPage: currentPage + 1
            )
        }
    }
}

struct PDFKitView: UIViewRepresentable {
    let document: PDFDocument
    @Binding var currentPage: Int

    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.document = document
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical

        // Add observer for page changes
        NotificationCenter.default.addObserver(
            context.coordinator,
            selector: #selector(Coordinator.pageChanged(_:)),
            name: .PDFViewPageChanged,
            object: pdfView
        )

        return pdfView
    }

    func updateUIView(_ uiView: PDFView, context: Context) {
        // Update if needed
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject {
        var parent: PDFKitView

        init(_ parent: PDFKitView) {
            self.parent = parent
        }

        @objc func pageChanged(_ notification: Notification) {
            guard let pdfView = notification.object as? PDFView,
                  let currentPage = pdfView.currentPage,
                  let pageIndex = pdfView.document?.index(for: currentPage) else {
                return
            }

            DispatchQueue.main.async {
                self.parent.currentPage = pageIndex
            }
        }
    }
}

#Preview {
    PDFReaderView(type: "ebook", id: 1, title: "Sample Book")
}
