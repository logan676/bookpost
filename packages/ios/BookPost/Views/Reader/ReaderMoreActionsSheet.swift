import SwiftUI

/// Actions available in the reader "More Actions" sheet
enum ReaderAction: String, CaseIterable, Identifiable {
    case reviewBook
    case downloadOffline
    case autoPageTurn
    case addBookmark
    case addToList
    case searchBook
    case viewNotes
    case popularHighlights
    case giftToFriend
    case reportError
    case privateReading
    case communityThoughts
    case friendNotes
    case displaySettings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .reviewBook: return L10n.ReaderActions.reviewBook
        case .downloadOffline: return L10n.ReaderActions.downloadOffline
        case .autoPageTurn: return L10n.ReaderActions.autoPageTurn
        case .addBookmark: return L10n.ReaderActions.addBookmark
        case .addToList: return L10n.ReaderActions.addToList
        case .searchBook: return L10n.ReaderActions.searchBook
        case .viewNotes: return L10n.ReaderActions.viewNotes
        case .popularHighlights: return L10n.ReaderActions.popularHighlights
        case .giftToFriend: return L10n.ReaderActions.giftToFriend
        case .reportError: return L10n.ReaderActions.reportError
        case .privateReading: return L10n.ReaderActions.privateReading
        case .communityThoughts: return L10n.ReaderActions.communityThoughts
        case .friendNotes: return L10n.ReaderActions.friendNotes
        case .displaySettings: return L10n.ReaderActions.displaySettings
        }
    }

    var icon: String {
        switch self {
        case .reviewBook: return "star"
        case .downloadOffline: return "arrow.down.circle"
        case .autoPageTurn: return "play.circle"
        case .addBookmark: return "bookmark"
        case .addToList: return "text.badge.plus"
        case .searchBook: return "magnifyingglass"
        case .viewNotes: return "note.text"
        case .popularHighlights: return "highlighter"
        case .giftToFriend: return "gift"
        case .reportError: return "exclamationmark.bubble"
        case .privateReading: return "eye.slash"
        case .communityThoughts: return "bubble.left.and.bubble.right"
        case .friendNotes: return "person.2.wave.2"
        case .displaySettings: return "eye"
        }
    }

    var tintColor: Color {
        switch self {
        case .reviewBook: return .orange
        case .downloadOffline: return .blue
        case .autoPageTurn: return .green
        case .addBookmark: return .yellow
        case .addToList: return .purple
        case .searchBook: return .gray
        case .viewNotes: return .mint
        case .popularHighlights: return .pink
        case .giftToFriend: return .red
        case .reportError: return .orange
        case .privateReading: return .indigo
        case .communityThoughts: return .teal
        case .friendNotes: return .cyan
        case .displaySettings: return .blue
        }
    }

    /// Whether this action is a toggle (shows on/off state)
    var isToggle: Bool {
        switch self {
        case .autoPageTurn, .privateReading, .communityThoughts, .friendNotes:
            return true
        default:
            return false
        }
    }
}

/// Comprehensive action sheet for reader view
/// Provides quick access to all reader features
struct ReaderMoreActionsSheet: View {
    let bookType: String
    let bookId: Int
    let bookTitle: String

    @Environment(\.dismiss) var dismiss
    @StateObject private var displaySettings = ReaderDisplaySettingsStore.shared

    // Toggle states
    @State private var isAutoPageTurnEnabled = false
    @State private var isPrivateReading = false
    @State private var showCommunityThoughts = true
    @State private var showFriendNotes = true

    // Action callbacks
    var onReviewBook: (() -> Void)?
    var onDownloadOffline: (() -> Void)?
    var onAddBookmark: (() -> Void)?
    var onAddToList: (() -> Void)?
    var onSearchBook: (() -> Void)?
    var onViewNotes: (() -> Void)?
    var onPopularHighlights: (() -> Void)?
    var onGiftToFriend: (() -> Void)?
    var onReportError: (() -> Void)?
    var onDisplaySettings: (() -> Void)?

    // Download state
    @State private var isDownloaded = false
    @State private var isDownloading = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Quick rating section
                    quickRatingSection
                        .padding()

                    Divider()

                    // Main actions grid
                    actionsGrid
                        .padding()

                    Divider()

                    // Toggle switches section
                    togglesSection
                        .padding()

                    Divider()

                    // Utility actions
                    utilitySection
                        .padding()
                }
            }
            .navigationTitle(L10n.ReaderActions.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Common.done) {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .task {
            loadStates()
        }
    }

    // MARK: - Quick Rating Section

    private var quickRatingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L10n.ReaderActions.quickRating)
                .font(.headline)

            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { rating in
                    Button {
                        submitQuickRating(rating)
                    } label: {
                        Image(systemName: "star.fill")
                            .font(.title2)
                            .foregroundColor(.orange.opacity(0.3))
                    }
                }

                Spacer()

                Button {
                    onReviewBook?()
                    dismiss()
                } label: {
                    Text(L10n.ReaderActions.writeReview)
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
        }
    }

    // MARK: - Actions Grid

    private var actionsGrid: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.ReaderActions.quickActions)
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                actionButton(.addBookmark, action: {
                    onAddBookmark?()
                    dismiss()
                })

                actionButton(.addToList, action: {
                    onAddToList?()
                    dismiss()
                })

                actionButton(.searchBook, action: {
                    onSearchBook?()
                    dismiss()
                })

                actionButton(.viewNotes, action: {
                    onViewNotes?()
                    dismiss()
                })

                actionButton(.popularHighlights, action: {
                    onPopularHighlights?()
                    dismiss()
                })

                actionButton(.displaySettings, action: {
                    onDisplaySettings?()
                    dismiss()
                })

                downloadButton

                actionButton(.giftToFriend, action: {
                    onGiftToFriend?()
                    dismiss()
                })
            }
        }
    }

    private func actionButton(_ action: ReaderAction, isActive: Bool = false, action callback: @escaping () -> Void) -> some View {
        Button(action: callback) {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(action.tintColor.opacity(isActive ? 0.2 : 0.1))
                        .frame(width: 50, height: 50)

                    Image(systemName: isActive ? "\(action.icon).fill" : action.icon)
                        .font(.system(size: 20))
                        .foregroundColor(action.tintColor)
                }

                Text(action.title)
                    .font(.caption2)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var downloadButton: some View {
        Button {
            downloadOffline()
        } label: {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(isDownloaded ? 0.2 : 0.1))
                        .frame(width: 50, height: 50)

                    if isDownloading {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: isDownloaded ? "checkmark.circle.fill" : "arrow.down.circle")
                            .font(.system(size: 20))
                            .foregroundColor(isDownloaded ? .green : .blue)
                    }
                }

                Text(isDownloaded ? L10n.ReaderActions.downloaded : L10n.ReaderActions.downloadOffline)
                    .font(.caption2)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        }
        .disabled(isDownloading || isDownloaded)
    }

    // MARK: - Toggles Section

    private var togglesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.ReaderActions.readingMode)
                .font(.headline)

            VStack(spacing: 0) {
                toggleRow(
                    icon: "play.circle",
                    title: L10n.ReaderActions.autoPageTurn,
                    subtitle: L10n.ReaderActions.autoPageTurnDesc,
                    isOn: $isAutoPageTurnEnabled,
                    tintColor: .green
                )

                Divider()
                    .padding(.leading, 56)

                toggleRow(
                    icon: "eye.slash",
                    title: L10n.ReaderActions.privateReading,
                    subtitle: L10n.ReaderActions.privateReadingDesc,
                    isOn: $isPrivateReading,
                    tintColor: .indigo
                )

                Divider()
                    .padding(.leading, 56)

                toggleRow(
                    icon: "bubble.left.and.bubble.right",
                    title: L10n.ReaderActions.communityThoughts,
                    subtitle: L10n.ReaderActions.communityThoughtsDesc,
                    isOn: $showCommunityThoughts,
                    tintColor: .teal
                )

                Divider()
                    .padding(.leading, 56)

                toggleRow(
                    icon: "person.2.wave.2",
                    title: L10n.ReaderActions.friendNotes,
                    subtitle: L10n.ReaderActions.friendNotesDesc,
                    isOn: $showFriendNotes,
                    tintColor: .cyan
                )
            }
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }

    private func toggleRow(
        icon: String,
        title: String,
        subtitle: String,
        isOn: Binding<Bool>,
        tintColor: Color
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(tintColor)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Toggle("", isOn: isOn)
                .labelsHidden()
                .tint(tintColor)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .onChange(of: isOn.wrappedValue) { _, newValue in
            saveToggleState(title: title, value: newValue)
        }
    }

    // MARK: - Utility Section

    private var utilitySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.ReaderActions.more)
                .font(.headline)

            VStack(spacing: 0) {
                utilityRow(
                    icon: "exclamationmark.bubble",
                    title: L10n.ReaderActions.reportError,
                    subtitle: L10n.ReaderActions.reportErrorDesc,
                    tintColor: .orange
                ) {
                    onReportError?()
                    dismiss()
                }

                Divider()
                    .padding(.leading, 56)

                utilityRow(
                    icon: "info.circle",
                    title: L10n.ReaderActions.bookInfo,
                    subtitle: L10n.ReaderActions.bookInfoDesc,
                    tintColor: .gray
                ) {
                    // Navigate to book detail
                    dismiss()
                }
            }
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }

    private func utilityRow(
        icon: String,
        title: String,
        subtitle: String,
        tintColor: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(tintColor)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)

                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
    }

    // MARK: - Actions

    private func loadStates() {
        isAutoPageTurnEnabled = displaySettings.isAutoPageTurnEnabled
        isPrivateReading = displaySettings.isPrivateReading
        showCommunityThoughts = displaySettings.showCommunityThoughts
        showFriendNotes = displaySettings.showFriendNotes

        // Check download status
        checkDownloadStatus()
    }

    private func saveToggleState(title: String, value: Bool) {
        switch title {
        case L10n.ReaderActions.autoPageTurn:
            displaySettings.isAutoPageTurnEnabled = value
        case L10n.ReaderActions.privateReading:
            displaySettings.isPrivateReading = value
        case L10n.ReaderActions.communityThoughts:
            displaySettings.showCommunityThoughts = value
        case L10n.ReaderActions.friendNotes:
            displaySettings.showFriendNotes = value
        default:
            break
        }
    }

    private func submitQuickRating(_ rating: Int) {
        // Submit quick rating
        Task {
            // API call would go here
            print("Quick rating submitted: \(rating) stars for \(bookTitle)")
        }
    }

    private func downloadOffline() {
        guard !isDownloading && !isDownloaded else { return }

        isDownloading = true
        onDownloadOffline?()

        // Simulate download (actual implementation would be async)
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            await MainActor.run {
                isDownloading = false
                isDownloaded = true
            }
        }
    }

    private func checkDownloadStatus() {
        // Check if book is already downloaded
        // This would check the local file system or download manager
        isDownloaded = false
    }
}

// MARK: - Compact Action Row (for alternative layout)

struct ReaderActionRow: View {
    let action: ReaderAction
    let isActive: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Image(systemName: isActive ? "\(action.icon).fill" : action.icon)
                    .font(.system(size: 18))
                    .foregroundColor(action.tintColor)
                    .frame(width: 24)

                Text(action.title)
                    .font(.subheadline)
                    .foregroundColor(.primary)

                Spacer()

                if action.isToggle {
                    Toggle("", isOn: .constant(isActive))
                        .labelsHidden()
                        .tint(action.tintColor)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ReaderMoreActionsSheet(
        bookType: "ebook",
        bookId: 1,
        bookTitle: "Sample Book"
    )
}
