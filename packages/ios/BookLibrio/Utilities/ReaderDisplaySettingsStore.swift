import Foundation
import SwiftUI
import Combine

/// Stores reader display toggle settings
/// Manages persistence and synchronization of reader UI preferences
@MainActor
class ReaderDisplaySettingsStore: ObservableObject {
    static let shared = ReaderDisplaySettingsStore()

    // MARK: - Display Toggles

    /// Show highlights made by other readers
    @Published var showOthersHighlights: Bool {
        didSet {
            UserDefaults.standard.set(showOthersHighlights, forKey: Keys.showOthersHighlights)
        }
    }

    /// Show friend thought bubbles in the margin
    @Published var showFriendThoughts: Bool {
        didSet {
            UserDefaults.standard.set(showFriendThoughts, forKey: Keys.showFriendThoughts)
        }
    }

    /// Show underlines for queryable words (dictionary lookup)
    @Published var showQueryableWords: Bool {
        didSet {
            UserDefaults.standard.set(showQueryableWords, forKey: Keys.showQueryableWords)
        }
    }

    /// Show popular highlights from the community
    @Published var showPopularHighlights: Bool {
        didSet {
            UserDefaults.standard.set(showPopularHighlights, forKey: Keys.showPopularHighlights)
        }
    }

    // MARK: - Reading Mode Toggles

    /// Auto page turn enabled
    @Published var isAutoPageTurnEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isAutoPageTurnEnabled, forKey: Keys.autoPageTurn)
        }
    }

    /// Auto page turn interval in seconds
    @Published var autoPageTurnInterval: TimeInterval {
        didSet {
            UserDefaults.standard.set(autoPageTurnInterval, forKey: Keys.autoPageTurnInterval)
        }
    }

    /// Private reading mode (hides from activity feed)
    @Published var isPrivateReading: Bool {
        didSet {
            UserDefaults.standard.set(isPrivateReading, forKey: Keys.privateReading)
        }
    }

    /// Show community thoughts/comments
    @Published var showCommunityThoughts: Bool {
        didSet {
            UserDefaults.standard.set(showCommunityThoughts, forKey: Keys.communityThoughts)
        }
    }

    /// Show friend notes in the reader
    @Published var showFriendNotes: Bool {
        didSet {
            UserDefaults.standard.set(showFriendNotes, forKey: Keys.friendNotes)
        }
    }

    // MARK: - UI Settings

    /// Show time and battery in reader header
    @Published var showStatusBar: Bool {
        didSet {
            UserDefaults.standard.set(showStatusBar, forKey: Keys.showStatusBar)
        }
    }

    /// Left tap goes to next page (instead of previous)
    @Published var leftTapNextPage: Bool {
        didSet {
            UserDefaults.standard.set(leftTapNextPage, forKey: Keys.leftTapNextPage)
        }
    }

    /// Allow landscape orientation in reader
    @Published var allowLandscape: Bool {
        didSet {
            UserDefaults.standard.set(allowLandscape, forKey: Keys.allowLandscape)
        }
    }

    /// Auto-download books when added to library
    @Published var autoDownloadOnAdd: Bool {
        didSet {
            UserDefaults.standard.set(autoDownloadOnAdd, forKey: Keys.autoDownloadOnAdd)
        }
    }

    // MARK: - Content Filtering

    /// Filter web novels from recommendations
    @Published var filterWebNovels: Bool {
        didSet {
            UserDefaults.standard.set(filterWebNovels, forKey: Keys.filterWebNovels)
        }
    }

    /// Youth mode (content filtering for young readers)
    @Published var youthModeEnabled: Bool {
        didSet {
            UserDefaults.standard.set(youthModeEnabled, forKey: Keys.youthMode)
        }
    }

    // MARK: - Keys

    private enum Keys {
        static let showOthersHighlights = "reader.display.othersHighlights"
        static let showFriendThoughts = "reader.display.friendThoughts"
        static let showQueryableWords = "reader.display.queryableWords"
        static let showPopularHighlights = "reader.display.popularHighlights"
        static let autoPageTurn = "reader.mode.autoPageTurn"
        static let autoPageTurnInterval = "reader.mode.autoPageTurnInterval"
        static let privateReading = "reader.mode.privateReading"
        static let communityThoughts = "reader.mode.communityThoughts"
        static let friendNotes = "reader.mode.friendNotes"
        static let showStatusBar = "reader.ui.showStatusBar"
        static let leftTapNextPage = "reader.ui.leftTapNextPage"
        static let allowLandscape = "reader.ui.allowLandscape"
        static let autoDownloadOnAdd = "reader.ui.autoDownloadOnAdd"
        static let filterWebNovels = "reader.content.filterWebNovels"
        static let youthMode = "reader.content.youthMode"
    }

    // MARK: - Initialization

    private init() {
        // Load saved values or use defaults
        self.showOthersHighlights = UserDefaults.standard.object(forKey: Keys.showOthersHighlights) as? Bool ?? true
        self.showFriendThoughts = UserDefaults.standard.object(forKey: Keys.showFriendThoughts) as? Bool ?? true
        self.showQueryableWords = UserDefaults.standard.object(forKey: Keys.showQueryableWords) as? Bool ?? true
        self.showPopularHighlights = UserDefaults.standard.object(forKey: Keys.showPopularHighlights) as? Bool ?? true

        self.isAutoPageTurnEnabled = UserDefaults.standard.object(forKey: Keys.autoPageTurn) as? Bool ?? false
        self.autoPageTurnInterval = UserDefaults.standard.object(forKey: Keys.autoPageTurnInterval) as? TimeInterval ?? 10.0
        self.isPrivateReading = UserDefaults.standard.object(forKey: Keys.privateReading) as? Bool ?? false
        self.showCommunityThoughts = UserDefaults.standard.object(forKey: Keys.communityThoughts) as? Bool ?? true
        self.showFriendNotes = UserDefaults.standard.object(forKey: Keys.friendNotes) as? Bool ?? true

        self.showStatusBar = UserDefaults.standard.object(forKey: Keys.showStatusBar) as? Bool ?? false
        self.leftTapNextPage = UserDefaults.standard.object(forKey: Keys.leftTapNextPage) as? Bool ?? false
        self.allowLandscape = UserDefaults.standard.object(forKey: Keys.allowLandscape) as? Bool ?? false
        self.autoDownloadOnAdd = UserDefaults.standard.object(forKey: Keys.autoDownloadOnAdd) as? Bool ?? false

        self.filterWebNovels = UserDefaults.standard.object(forKey: Keys.filterWebNovels) as? Bool ?? false
        self.youthModeEnabled = UserDefaults.standard.object(forKey: Keys.youthMode) as? Bool ?? false
    }

    // MARK: - Reset

    /// Reset all display settings to defaults
    func resetToDefaults() {
        showOthersHighlights = true
        showFriendThoughts = true
        showQueryableWords = true
        showPopularHighlights = true

        isAutoPageTurnEnabled = false
        autoPageTurnInterval = 10.0
        isPrivateReading = false
        showCommunityThoughts = true
        showFriendNotes = true

        showStatusBar = false
        leftTapNextPage = false
        allowLandscape = false
        autoDownloadOnAdd = false

        filterWebNovels = false
        youthModeEnabled = false
    }

    // MARK: - Group Getters

    /// All social display options enabled
    var allSocialOptionsEnabled: Bool {
        showOthersHighlights && showFriendThoughts && showCommunityThoughts && showFriendNotes
    }

    /// Hide all social features for focused reading
    func enableFocusMode() {
        showOthersHighlights = false
        showFriendThoughts = false
        showCommunityThoughts = false
        showFriendNotes = false
        showPopularHighlights = false
    }

    /// Re-enable all social features
    func disableFocusMode() {
        showOthersHighlights = true
        showFriendThoughts = true
        showCommunityThoughts = true
        showFriendNotes = true
        showPopularHighlights = true
    }
}

// MARK: - SwiftUI Environment Key

struct ReaderDisplaySettingsKey: EnvironmentKey {
    static let defaultValue = ReaderDisplaySettingsStore.shared
}

extension EnvironmentValues {
    var readerDisplaySettings: ReaderDisplaySettingsStore {
        get { self[ReaderDisplaySettingsKey.self] }
        set { self[ReaderDisplaySettingsKey.self] = newValue }
    }
}
