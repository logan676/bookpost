import SwiftUI

/// Mini player overlay that appears at the bottom of the screen during audio playback
/// Provides quick access to play/pause, progress, and expands to full player
struct MiniPlayerView: View {
    @ObservedObject var playerState: AudioPlayerState
    let bookTitle: String
    let coverUrl: String?
    let onExpand: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar at top
            GeometryReader { geometry in
                Rectangle()
                    .fill(Color.blue)
                    .frame(width: geometry.size.width * playerState.progress, height: 2)
            }
            .frame(height: 2)
            .background(Color(.systemGray5))

            // Player content
            HStack(spacing: 12) {
                // Tap to expand
                Button(action: onExpand) {
                    HStack(spacing: 12) {
                        // Cover thumbnail
                        BookCoverView(coverUrl: coverUrl, title: bookTitle)
                            .frame(width: 44, height: 60)
                            .clipShape(RoundedRectangle(cornerRadius: 4))

                        // Book info
                        VStack(alignment: .leading, spacing: 2) {
                            Text(bookTitle)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .lineLimit(1)
                                .foregroundColor(.primary)

                            HStack(spacing: 4) {
                                Image(systemName: "waveform")
                                    .font(.caption2)
                                Text("第\(playerState.currentChapter)章")
                                    .font(.caption)
                            }
                            .foregroundColor(.secondary)
                        }

                        Spacer()
                    }
                }
                .buttonStyle(.plain)

                // Play/Pause button
                Button {
                    playerState.togglePlayPause()
                } label: {
                    Image(systemName: playerState.isPlaying ? "pause.fill" : "play.fill")
                        .font(.title2)
                        .foregroundColor(.primary)
                        .frame(width: 44, height: 44)
                }

                // Close button
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .frame(width: 32, height: 32)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: -4)
        )
        .padding(.horizontal, 8)
    }
}

// MARK: - Mini Player Container

/// Container view that manages the mini player visibility and full player presentation
struct MiniPlayerContainer: View {
    @StateObject private var coordinator = AudioPlayerCoordinator.shared
    @State private var showFullPlayer = false

    var body: some View {
        Group {
            if coordinator.isActive, let currentBook = coordinator.currentBook {
                MiniPlayerView(
                    playerState: coordinator.playerState,
                    bookTitle: currentBook.title,
                    coverUrl: currentBook.coverUrl,
                    onExpand: {
                        showFullPlayer = true
                    },
                    onDismiss: {
                        coordinator.stop()
                    }
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.8), value: coordinator.isActive)
        .fullScreenCover(isPresented: $showFullPlayer) {
            if let book = coordinator.currentBook {
                AudioPlayerView(
                    bookTitle: book.title,
                    bookId: book.id,
                    bookType: book.type,
                    coverUrl: book.coverUrl
                )
            }
        }
    }
}

// MARK: - Audio Player Coordinator

/// Singleton coordinator that manages audio playback state across the app
@MainActor
class AudioPlayerCoordinator: ObservableObject {
    static let shared = AudioPlayerCoordinator()

    @Published var isActive = false
    @Published var currentBook: AudioBook?
    @Published var playerState = AudioPlayerState()

    private init() {}

    struct AudioBook: Identifiable {
        let id: Int
        let title: String
        let coverUrl: String?
        let type: BookType
    }

    func play(book: AudioBook) {
        currentBook = book
        isActive = true
        playerState.isPlaying = true
    }

    func stop() {
        isActive = false
        playerState.isPlaying = false
        currentBook = nil
    }

    func pause() {
        playerState.isPlaying = false
    }

    func resume() {
        playerState.isPlaying = true
    }
}

// MARK: - View Extension for Mini Player

extension View {
    /// Adds a mini player overlay to any view when audio is playing
    func withMiniPlayer() -> some View {
        self.safeAreaInset(edge: .bottom) {
            MiniPlayerContainer()
        }
    }
}

#Preview {
    VStack {
        Spacer()
        MiniPlayerView(
            playerState: AudioPlayerState(),
            bookTitle: "人类简史：从动物到上帝",
            coverUrl: nil,
            onExpand: {},
            onDismiss: {}
        )
    }
}
