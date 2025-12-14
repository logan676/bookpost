import SwiftUI

/// Main settings view with categorized settings sections
/// Includes account, reading preferences, notifications, privacy, and app info
struct SettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                // Account section
                accountSection

                // Reading preferences
                readingPreferencesSection

                // Social reading settings
                socialReadingSection

                // Notifications
                notificationsSection

                // Privacy & Security
                privacySection

                // Youth mode & content safety
                youthModeSection

                // Storage & Cache
                storageSection

                // Device management
                deviceSection

                // About & Help
                aboutSection

                // Logout
                logoutSection
            }
            .navigationTitle(L10n.Settings.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                }
            }
            .sheet(isPresented: $viewModel.showMembership) {
                MembershipView()
            }
            .alert(L10n.Settings.confirmLogout, isPresented: $viewModel.showLogoutAlert) {
                Button(L10n.Common.cancel, role: .cancel) { }
                Button(L10n.Settings.logout, role: .destructive) {
                    viewModel.logout()
                }
            } message: {
                Text(L10n.Settings.logoutMessage)
            }
            .alert(L10n.Settings.clearOtherCache, isPresented: $viewModel.showClearCacheAlert) {
                Button(L10n.Common.cancel, role: .cancel) { }
                Button(L10n.Settings.clear, role: .destructive) {
                    viewModel.clearCache()
                }
            } message: {
                Text(L10n.Settings.clearOtherCacheMessage)
            }
        }
    }

    // MARK: - Account Section

    private var accountSection: some View {
        Section {
            // Profile edit
            NavigationLink {
                ProfileEditView()
            } label: {
                HStack(spacing: 12) {
                    Circle()
                        .fill(Color.blue.opacity(0.2))
                        .frame(width: 56, height: 56)
                        .overlay(
                            Text(String(viewModel.username.prefix(1)))
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundColor(.blue)
                        )

                    VStack(alignment: .leading, spacing: 4) {
                        Text(viewModel.username)
                            .font(.headline)

                        Text(L10n.Settings.editProfile)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            // Membership
            Button {
                viewModel.showMembership = true
            } label: {
                HStack {
                    Image(systemName: "crown.fill")
                        .foregroundColor(.yellow)
                        .frame(width: 24)

                    Text(L10n.Settings.memberCenter)
                        .foregroundColor(.primary)

                    Spacer()

                    if viewModel.isMember {
                        Text(L10n.Settings.activated)
                            .font(.caption)
                            .foregroundColor(.orange)
                    }

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Account & Security
            NavigationLink {
                AccountSecurityView()
            } label: {
                HStack {
                    Image(systemName: "lock.shield")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text(L10n.Settings.accountSecurity)
                }
            }
        } header: {
            Text(L10n.Settings.account)
        }
    }

    // MARK: - Reading Preferences Section

    private var readingPreferencesSection: some View {
        Section {
            // Font size
            NavigationLink {
                FontSettingsView()
            } label: {
                HStack {
                    Image(systemName: "textformat.size")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text(L10n.Settings.fontSettings)

                    Spacer()

                    Text(viewModel.fontSizeDescription)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Reading theme
            NavigationLink {
                ThemeSettingsView()
            } label: {
                HStack {
                    Image(systemName: "paintpalette")
                        .foregroundColor(.purple)
                        .frame(width: 24)

                    Text(L10n.Settings.readingTheme)

                    Spacer()

                    Text(viewModel.currentTheme)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Page turn animation
            Toggle(isOn: $viewModel.pageFlipAnimation) {
                HStack {
                    Image(systemName: "book.pages")
                        .foregroundColor(.orange)
                        .frame(width: 24)

                    Text(L10n.Settings.pageFlipAnimation)
                }
            }

            // Auto brightness
            Toggle(isOn: $viewModel.autoBrightness) {
                HStack {
                    Image(systemName: "sun.max")
                        .foregroundColor(.yellow)
                        .frame(width: 24)

                    Text(L10n.Settings.autoBrightness)
                }
            }

            // Keep screen on
            Toggle(isOn: $viewModel.keepScreenOn) {
                HStack {
                    Image(systemName: "display")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text(L10n.Settings.keepScreenOnReading)
                }
            }

            // Allow landscape reading
            Toggle(isOn: $viewModel.allowLandscape) {
                HStack {
                    Image(systemName: "rotate.right")
                        .foregroundColor(.cyan)
                        .frame(width: 24)

                    Text(L10n.Settings.allowLandscape)
                }
            }

            // Show time & battery
            Toggle(isOn: $viewModel.showTimeBattery) {
                HStack {
                    Image(systemName: "battery.100")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text(L10n.Settings.showTimeBattery)
                }
            }

            // Left tap behavior
            Toggle(isOn: $viewModel.leftTapNextPage) {
                HStack {
                    Image(systemName: "hand.tap")
                        .foregroundColor(.indigo)
                        .frame(width: 24)

                    Text(L10n.Settings.leftTapNextPage)
                }
            }
        } header: {
            Text(L10n.Settings.readingSettings)
        }
    }

    // MARK: - Social Reading Section

    private var socialReadingSection: some View {
        Section {
            // Hide others' thoughts
            Toggle(isOn: $viewModel.hideOthersThoughts) {
                HStack {
                    Image(systemName: "text.bubble")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text(L10n.Settings.hideOthersThoughts)
                }
            }

            // Hide others' highlights
            Toggle(isOn: $viewModel.hideOthersHighlights) {
                HStack {
                    Image(systemName: "highlighter")
                        .foregroundColor(.yellow)
                        .frame(width: 24)

                    Text(L10n.Settings.hideOthersHighlights)
                }
            }

            // Show friend thought bubbles
            Toggle(isOn: $viewModel.showFriendBubbles) {
                HStack {
                    Image(systemName: "person.2.circle")
                        .foregroundColor(.purple)
                        .frame(width: 24)

                    Text(L10n.Settings.showFriendBubbles)
                }
            }

            // Filter web novels
            Toggle(isOn: $viewModel.filterWebNovels) {
                HStack {
                    Image(systemName: "doc.text.magnifyingglass")
                        .foregroundColor(.orange)
                        .frame(width: 24)

                    Text(L10n.Settings.filterWebNovels)
                }
            }

            // Auto download on add
            Toggle(isOn: $viewModel.autoDownloadOnAdd) {
                HStack {
                    Image(systemName: "arrow.down.circle")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text(L10n.Settings.autoDownloadOnAdd)
                }
            }
        } header: {
            Text(L10n.Settings.socialReading)
        } footer: {
            Text(L10n.Settings.socialReadingFooter)
        }
    }

    // MARK: - Notifications Section

    private var notificationsSection: some View {
        Section {
            Toggle(isOn: $viewModel.readingReminder) {
                HStack {
                    Image(systemName: "bell.badge")
                        .foregroundColor(.red)
                        .frame(width: 24)

                    Text(L10n.Settings.readingReminder)
                }
            }

            if viewModel.readingReminder {
                NavigationLink {
                    ReminderTimeSettingsView()
                } label: {
                    HStack {
                        Image(systemName: "clock")
                            .foregroundColor(.blue)
                            .frame(width: 24)

                        Text(L10n.Settings.reminderTime)

                        Spacer()

                        Text(viewModel.reminderTime)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Toggle(isOn: $viewModel.newBookNotification) {
                HStack {
                    Image(systemName: "book.circle")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text(L10n.Settings.newBookRecommendation)
                }
            }

            Toggle(isOn: $viewModel.socialNotification) {
                HStack {
                    Image(systemName: "person.2")
                        .foregroundColor(.purple)
                        .frame(width: 24)

                    Text(L10n.Settings.socialUpdates)
                }
            }

            Toggle(isOn: $viewModel.systemNotification) {
                HStack {
                    Image(systemName: "bell")
                        .foregroundColor(.orange)
                        .frame(width: 24)

                    Text(L10n.Settings.systemNotification)
                }
            }
        } header: {
            Text(L10n.Settings.notificationSettings)
        }
    }

    // MARK: - Privacy Section

    private var privacySection: some View {
        Section {
            // Profile visibility
            NavigationLink {
                PrivacySettingsView()
            } label: {
                HStack {
                    Image(systemName: "eye")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text(L10n.Settings.privacySettings)
                }
            }

            // Blocked users
            NavigationLink {
                BlockedUsersView()
            } label: {
                HStack {
                    Image(systemName: "person.crop.circle.badge.minus")
                        .foregroundColor(.red)
                        .frame(width: 24)

                    Text(L10n.Settings.blockedUsers)
                }
            }

            // Data download
            NavigationLink {
                DataExportView()
            } label: {
                HStack {
                    Image(systemName: "square.and.arrow.down")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text(L10n.Settings.downloadMyData)
                }
            }
        } header: {
            Text(L10n.Settings.privacySecurity)
        }
    }

    // MARK: - Youth Mode Section

    private var youthModeSection: some View {
        Section {
            // Youth mode toggle
            Toggle(isOn: $viewModel.youthModeEnabled) {
                HStack {
                    Image(systemName: "figure.and.child.holdinghands")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(L10n.Settings.youthMode)
                        Text(L10n.Settings.youthModeDesc)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            if viewModel.youthModeEnabled {
                // Youth mode password
                NavigationLink {
                    YouthModePasswordView()
                } label: {
                    HStack {
                        Image(systemName: "lock.fill")
                            .foregroundColor(.blue)
                            .frame(width: 24)

                        Text(L10n.Settings.youthModePassword)
                    }
                }

                // Usage time limit
                NavigationLink {
                    UsageTimeLimitView()
                } label: {
                    HStack {
                        Image(systemName: "hourglass")
                            .foregroundColor(.orange)
                            .frame(width: 24)

                        Text(L10n.Settings.usageTimeLimit)

                        Spacer()

                        Text(viewModel.dailyTimeLimit)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                // Content filtering
                Toggle(isOn: $viewModel.filterMatureContent) {
                    HStack {
                        Image(systemName: "eye.slash")
                            .foregroundColor(.red)
                            .frame(width: 24)

                        Text(L10n.Settings.filterMatureContent)
                    }
                }
            }

            // Student verification
            NavigationLink {
                StudentVerificationView()
            } label: {
                HStack {
                    Image(systemName: "graduationcap.fill")
                        .foregroundColor(.purple)
                        .frame(width: 24)

                    Text(L10n.Settings.studentVerification)

                    Spacer()

                    if viewModel.isStudentVerified {
                        Text(L10n.Settings.verified)
                            .font(.caption)
                            .foregroundColor(.green)
                    } else {
                        Text(L10n.Settings.notVerified)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        } header: {
            Text(L10n.Settings.contentSafety)
        } footer: {
            Text(L10n.Settings.youthModeFooter)
        }
    }

    // MARK: - Storage Section

    private var storageSection: some View {
        Section {
            // Book cache (downloads)
            NavigationLink {
                DownloadManagerView()
            } label: {
                HStack {
                    Image(systemName: "arrow.down.circle")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(L10n.Cache.downloadedBooks)
                        Text("\(viewModel.cachedBooksCount) \(L10n.Cache.booksCount)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Text(viewModel.bookCacheSize)
                        .foregroundColor(.secondary)
                }
            }

            // Other cache size
            HStack {
                Image(systemName: "internaldrive")
                    .foregroundColor(.gray)
                    .frame(width: 24)

                Text(L10n.Settings.otherCache)

                Spacer()

                Text(viewModel.otherCacheSize)
                    .foregroundColor(.secondary)
            }

            // Clear other cache button
            Button {
                viewModel.showClearCacheAlert = true
            } label: {
                HStack {
                    Image(systemName: "trash")
                        .foregroundColor(.red)
                        .frame(width: 24)

                    Text(L10n.Settings.clearOtherCache)
                        .foregroundColor(.red)
                }
            }

            // Download settings
            NavigationLink {
                DownloadSettingsView()
            } label: {
                HStack {
                    Image(systemName: "gearshape")
                        .foregroundColor(.gray)
                        .frame(width: 24)

                    Text(L10n.Settings.downloadSettings)
                }
            }
        } header: {
            Text(L10n.Settings.storage)
        }
    }

    // MARK: - Device Section

    private var deviceSection: some View {
        Section {
            // Logged-in devices
            NavigationLink {
                LoggedInDevicesView()
            } label: {
                HStack {
                    Image(systemName: "laptopcomputer.and.iphone")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text(L10n.Settings.loggedInDevices)

                    Spacer()

                    Text("\(viewModel.deviceCount)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // This device info
            HStack {
                Image(systemName: "iphone")
                    .foregroundColor(.gray)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 2) {
                    Text(viewModel.currentDeviceName)
                        .font(.subheadline)

                    Text(L10n.Settings.currentDevice)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Sync settings
            Toggle(isOn: $viewModel.syncReadingProgress) {
                HStack {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text(L10n.Settings.syncReadingProgress)
                }
            }
        } header: {
            Text(L10n.Settings.devices)
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        Section {
            // Help & Feedback
            NavigationLink {
                HelpCenterView()
            } label: {
                HStack {
                    Image(systemName: "questionmark.circle")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text(L10n.Settings.helpFeedback)
                }
            }

            // Rate app
            Button {
                viewModel.rateApp()
            } label: {
                HStack {
                    Image(systemName: "star")
                        .foregroundColor(.yellow)
                        .frame(width: 24)

                    Text(L10n.Settings.rateUs)
                        .foregroundColor(.primary)
                }
            }

            // Share app
            Button {
                viewModel.shareApp()
            } label: {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text(L10n.Settings.shareWithFriends)
                        .foregroundColor(.primary)
                }
            }

            // About
            NavigationLink {
                AboutView()
            } label: {
                HStack {
                    Image(systemName: "info.circle")
                        .foregroundColor(.gray)
                        .frame(width: 24)

                    Text(L10n.Settings.about)

                    Spacer()

                    Text("v\(viewModel.appVersion)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Terms & Privacy
            NavigationLink {
                LegalView()
            } label: {
                HStack {
                    Image(systemName: "doc.text")
                        .foregroundColor(.gray)
                        .frame(width: 24)

                    Text(L10n.Settings.termsPrivacy)
                }
            }
        } header: {
            Text(L10n.Settings.about)
        }
    }

    // MARK: - Logout Section

    private var logoutSection: some View {
        Section {
            Button {
                viewModel.showLogoutAlert = true
            } label: {
                HStack {
                    Spacer()
                    Text(L10n.Settings.logout)
                        .foregroundColor(.red)
                    Spacer()
                }
            }
        }
    }
}

// MARK: - Settings ViewModel

@MainActor
class SettingsViewModel: ObservableObject {
    // Account
    @Published var username = L10n.Common.bookLover
    @Published var isMember = false
    @Published var showMembership = false
    @Published var showLogoutAlert = false

    // Reading preferences
    @Published var fontSizeDescription = L10n.Settings.fontSizeMedium
    @Published var currentTheme = L10n.Settings.themeDefault
    @Published var pageFlipAnimation = true
    @Published var autoBrightness = true
    @Published var keepScreenOn = false
    @Published var allowLandscape = true
    @Published var showTimeBattery = true
    @Published var leftTapNextPage = false

    // Social reading
    @Published var hideOthersThoughts = false
    @Published var hideOthersHighlights = false
    @Published var showFriendBubbles = true
    @Published var filterWebNovels = false
    @Published var autoDownloadOnAdd = false

    // Notifications
    @Published var readingReminder = true
    @Published var reminderTime = "21:00"
    @Published var newBookNotification = true
    @Published var socialNotification = true
    @Published var systemNotification = true

    // Youth mode & content safety
    @Published var youthModeEnabled = false
    @Published var dailyTimeLimit = "2小时"
    @Published var filterMatureContent = true
    @Published var isStudentVerified = false

    // Devices
    @Published var deviceCount = 2
    @Published var currentDeviceName: String
    @Published var syncReadingProgress = true

    // Storage
    @Published var bookCacheSize = L10n.Settings.calculating
    @Published var otherCacheSize = L10n.Settings.calculating
    @Published var cachedBooksCount = 0
    @Published var showClearCacheAlert = false

    // App info
    let appVersion: String

    // Cache manager reference
    private let bookCacheManager = BookCacheManager.shared

    init() {
        appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        currentDeviceName = UIDevice.current.name
        calculateCacheSize()
    }

    private func calculateCacheSize() {
        // Get book cache size from BookCacheManager
        Task {
            await MainActor.run {
                bookCacheSize = BookCacheManager.formatSize(bookCacheManager.totalCacheSize)
                cachedBooksCount = bookCacheManager.cachedBooksCount
            }

            // Calculate other cache size
            let otherSize = await getOtherCacheSize()
            await MainActor.run {
                otherCacheSize = formatBytes(otherSize)
            }
        }
    }

    private func getOtherCacheSize() async -> Int64 {
        var totalSize: Int64 = 0

        // URLCache size
        totalSize += Int64(URLCache.shared.currentDiskUsage)

        // Caches directory (excluding BookCache)
        if let cachesURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first {
            let bookCacheURL = cachesURL.appendingPathComponent("BookCache")
            totalSize += directorySizeExcluding(at: cachesURL, exclude: bookCacheURL)
        }

        return totalSize
    }

    private func directorySizeExcluding(at url: URL, exclude: URL) -> Int64 {
        let fileManager = FileManager.default
        var size: Int64 = 0

        if let enumerator = fileManager.enumerator(at: url, includingPropertiesForKeys: [.fileSizeKey]) {
            for case let fileURL as URL in enumerator {
                // Skip excluded directory
                if fileURL.path.hasPrefix(exclude.path) {
                    continue
                }
                if let fileSize = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                    size += Int64(fileSize)
                }
            }
        }

        return size
    }

    private func directorySize(at url: URL) -> Int64 {
        let fileManager = FileManager.default
        var size: Int64 = 0

        if let enumerator = fileManager.enumerator(at: url, includingPropertiesForKeys: [.fileSizeKey]) {
            for case let fileURL as URL in enumerator {
                if let fileSize = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                    size += Int64(fileSize)
                }
            }
        }

        return size
    }

    private func formatBytes(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }

    func clearCache() {
        // Clear URLCache
        URLCache.shared.removeAllCachedResponses()

        // Clear caches directory (excluding BookCache)
        if let cachesURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first {
            let bookCacheURL = cachesURL.appendingPathComponent("BookCache")
            let fileManager = FileManager.default

            // Get all items in caches directory
            if let contents = try? fileManager.contentsOfDirectory(at: cachesURL, includingPropertiesForKeys: nil) {
                for item in contents {
                    // Skip BookCache directory
                    if item.lastPathComponent == "BookCache" {
                        continue
                    }
                    try? fileManager.removeItem(at: item)
                }
            }
        }

        // Recalculate
        calculateCacheSize()
    }

    func logout() {
        // Clear auth token and user data
        UserDefaults.standard.removeObject(forKey: "authToken")
        UserDefaults.standard.removeObject(forKey: "userId")

        // Post notification to update UI
        NotificationCenter.default.post(name: .userDidLogout, object: nil)
    }

    func rateApp() {
        // Open App Store review page
        if let url = URL(string: "https://apps.apple.com/app/id123456789?action=write-review") {
            UIApplication.shared.open(url)
        }
    }

    func shareApp() {
        let text = L10n.Settings.shareText
        let url = URL(string: "https://apps.apple.com/app/id123456789")!

        let activityVC = UIActivityViewController(activityItems: [text, url], applicationActivities: nil)

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }
}

// MARK: - Notification Extension

extension Notification.Name {
    static let userDidLogout = Notification.Name("userDidLogout")
}

// MARK: - Placeholder Views

struct ProfileEditView: View {
    @Environment(\.dismiss) var dismiss
    @State private var displayName = L10n.Common.bookLover
    @State private var bio = ""
    @State private var showImagePicker = false

    var body: some View {
        Form {
            Section {
                HStack {
                    Spacer()
                    Button {
                        showImagePicker = true
                    } label: {
                        VStack {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 80, height: 80)
                                .overlay(
                                    Image(systemName: "camera.fill")
                                        .foregroundColor(.blue)
                                )

                            Text(L10n.Settings.changeAvatar)
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    }
                    Spacer()
                }
            }

            Section {
                TextField(L10n.Settings.nickname, text: $displayName)

                TextField(L10n.Settings.bio, text: $bio, axis: .vertical)
                    .lineLimit(3...6)
            } header: {
                Text(L10n.Settings.basicInfo)
            }
        }
        .navigationTitle(L10n.Settings.editProfileTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(L10n.Settings.save) {
                    // Save changes
                    dismiss()
                }
            }
        }
    }
}

struct AccountSecurityView: View {
    var body: some View {
        List {
            Section {
                NavigationLink {
                    Text(L10n.Settings.changePassword)
                } label: {
                    HStack {
                        Text(L10n.Settings.changePassword)
                        Spacer()
                    }
                }

                NavigationLink {
                    Text(L10n.Settings.bindPhone)
                } label: {
                    HStack {
                        Text(L10n.Settings.bindPhone)
                        Spacer()
                        Text("138****8888")
                            .foregroundColor(.secondary)
                    }
                }

                NavigationLink {
                    Text(L10n.Settings.bindEmail)
                } label: {
                    HStack {
                        Text(L10n.Settings.bindEmail)
                        Spacer()
                        Text(L10n.Settings.notBound)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section {
                NavigationLink {
                    Text(L10n.Settings.thirdPartyAccounts)
                } label: {
                    Text(L10n.Settings.thirdPartyAccounts)
                }
            }

            Section {
                Button(role: .destructive) {
                    // Delete account
                } label: {
                    Text(L10n.Settings.deleteAccount)
                }
            }
        }
        .navigationTitle(L10n.Settings.accountSecurity)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct FontSettingsView: View {
    @State private var fontSize: Double = 18
    @State private var lineSpacing: Double = 1.5
    @State private var selectedFont = L10n.Settings.fontSystem

    var fonts: [String] {
        [L10n.Settings.fontSystem, L10n.Settings.fontPingfang, L10n.Settings.fontSongti, L10n.Settings.fontKaiti, L10n.Settings.fontHeiti]
    }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text(L10n.Settings.fontSize)
                        Spacer()
                        Text("\(Int(fontSize))")
                            .foregroundColor(.secondary)
                    }

                    Slider(value: $fontSize, in: 12...28, step: 1)
                }

                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text(L10n.Settings.lineSpacing)
                        Spacer()
                        Text(String(format: "%.1f", lineSpacing))
                            .foregroundColor(.secondary)
                    }

                    Slider(value: $lineSpacing, in: 1.0...2.5, step: 0.1)
                }
            } header: {
                Text(L10n.Settings.fontSize)
            }

            Section {
                ForEach(fonts, id: \.self) { font in
                    Button {
                        selectedFont = font
                    } label: {
                        HStack {
                            Text(font)
                                .foregroundColor(.primary)

                            Spacer()

                            if selectedFont == font {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            } header: {
                Text(L10n.Settings.font)
            }

            Section {
                // Preview
                Text(L10n.Settings.previewText)
                    .font(.system(size: fontSize))
                    .lineSpacing(CGFloat((lineSpacing - 1) * fontSize))
                    .padding()
            } header: {
                Text(L10n.Settings.preview)
            }
        }
        .navigationTitle(L10n.Settings.fontSettings)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ThemeSettingsView: View {
    @State private var selectedTheme = L10n.Settings.themeDefault

    var themes: [(name: String, bg: Color, text: Color)] {
        [
            (L10n.Settings.themeDefault, .white, .black),
            (L10n.Settings.themeEyeProtection, Color(red: 0.95, green: 0.93, blue: 0.87), .black),
            (L10n.Settings.themeNight, Color(red: 0.1, green: 0.1, blue: 0.1), .white),
            (L10n.Settings.themeParchment, Color(red: 0.96, green: 0.94, blue: 0.88), Color(red: 0.3, green: 0.2, blue: 0.1))
        ]
    }

    var body: some View {
        List {
            Section {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(themes, id: \.name) { theme in
                        Button {
                            selectedTheme = theme.name
                        } label: {
                            VStack(spacing: 8) {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(theme.bg)
                                    .frame(height: 80)
                                    .overlay(
                                        Text("Aa")
                                            .font(.title)
                                            .foregroundColor(theme.text)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(selectedTheme == theme.name ? Color.blue : Color.gray.opacity(0.3), lineWidth: selectedTheme == theme.name ? 2 : 1)
                                    )

                                Text(theme.name)
                                    .font(.caption)
                                    .foregroundColor(selectedTheme == theme.name ? .blue : .primary)
                            }
                        }
                    }
                }
                .padding(.vertical, 8)
            } header: {
                Text(L10n.Settings.theme)
            }

            Section {
                Toggle(L10n.Settings.followSystemDark, isOn: .constant(true))
            }
        }
        .navigationTitle(L10n.Settings.readingTheme)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ReminderTimeSettingsView: View {
    @State private var reminderTime = Date()
    @State private var selectedDays: Set<Int> = [1, 2, 3, 4, 5, 6, 7]

    var weekdays: [String] {
        [L10n.Settings.monday, L10n.Settings.tuesday, L10n.Settings.wednesday, L10n.Settings.thursday, L10n.Settings.friday, L10n.Settings.saturday, L10n.Settings.sunday]
    }

    var body: some View {
        List {
            Section {
                DatePicker(L10n.Settings.reminderTime, selection: $reminderTime, displayedComponents: .hourAndMinute)
            }

            Section {
                ForEach(1...7, id: \.self) { day in
                    Button {
                        if selectedDays.contains(day) {
                            selectedDays.remove(day)
                        } else {
                            selectedDays.insert(day)
                        }
                    } label: {
                        HStack {
                            Text(weekdays[day - 1])
                                .foregroundColor(.primary)

                            Spacer()

                            if selectedDays.contains(day) {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            } header: {
                Text(L10n.Settings.repeat)
            }
        }
        .navigationTitle(L10n.Settings.reminderTime)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PrivacySettingsView: View {
    @State private var profileVisibility = "public"
    @State private var showReadingStatus = true
    @State private var showBookshelf = true
    @State private var allowMessages = true

    var body: some View {
        List {
            Section {
                Picker(L10n.Settings.profileVisibility, selection: $profileVisibility) {
                    Text(L10n.Settings.visibilityPublic).tag("public")
                    Text(L10n.Settings.visibilityFriendsOnly).tag("friendsOnly")
                    Text(L10n.Settings.visibilityPrivate).tag("private")
                }
            }

            Section {
                Toggle(L10n.Settings.showReadingStatus, isOn: $showReadingStatus)
                Toggle(L10n.Settings.showMyBookshelf, isOn: $showBookshelf)
                Toggle(L10n.Settings.allowStrangerMessages, isOn: $allowMessages)
            } header: {
                Text(L10n.Settings.socialPrivacy)
            }
        }
        .navigationTitle(L10n.Settings.privacySettings)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct BlockedUsersView: View {
    @State private var blockedUsers: [String] = []

    var body: some View {
        List {
            if blockedUsers.isEmpty {
                ContentUnavailableView(
                    L10n.Settings.noBlockedUsers,
                    systemImage: "person.crop.circle.badge.minus",
                    description: Text(L10n.Settings.blockedUsersDesc)
                )
            } else {
                ForEach(blockedUsers, id: \.self) { user in
                    HStack {
                        Text(user)
                        Spacer()
                        Button(L10n.Settings.remove) {
                            blockedUsers.removeAll { $0 == user }
                        }
                        .foregroundColor(.red)
                    }
                }
            }
        }
        .navigationTitle(L10n.Settings.blockedUsers)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DataExportView: View {
    @State private var isExporting = false

    var body: some View {
        List {
            Section {
                Text(L10n.Settings.dataExportDesc)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Section {
                Button {
                    isExporting = true
                    // Export data
                } label: {
                    HStack {
                        Text(L10n.Settings.requestDataExport)
                        if isExporting {
                            Spacer()
                            ProgressView()
                        }
                    }
                }
                .disabled(isExporting)
            }
        }
        .navigationTitle(L10n.Settings.downloadData)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DownloadSettingsView: View {
    @State private var wifiOnly = true
    @State private var autoDownload = false
    @State private var downloadQuality = "standard"

    var body: some View {
        List {
            Section {
                Toggle(L10n.Settings.wifiOnly, isOn: $wifiOnly)
                Toggle(L10n.Settings.autoDownloadNewBooks, isOn: $autoDownload)
            }

            Section {
                Picker(L10n.Settings.downloadQuality, selection: $downloadQuality) {
                    Text(L10n.Settings.qualityHigh).tag("high")
                    Text(L10n.Settings.qualityStandard).tag("standard")
                    Text(L10n.Settings.qualitySaveSpace).tag("saveSpace")
                }
            } header: {
                Text(L10n.Settings.qualitySettings)
            }
        }
        .navigationTitle(L10n.Settings.downloadSettings)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct HelpCenterView: View {
    var body: some View {
        List {
            Section {
                NavigationLink {
                    Text(L10n.Settings.faq)
                } label: {
                    HStack {
                        Image(systemName: "questionmark.circle")
                            .foregroundColor(.blue)
                        Text(L10n.Settings.faq)
                    }
                }

                NavigationLink {
                    Text(L10n.Settings.userGuide)
                } label: {
                    HStack {
                        Image(systemName: "book")
                            .foregroundColor(.green)
                        Text(L10n.Settings.userGuide)
                    }
                }
            }

            Section {
                NavigationLink {
                    FeedbackView()
                } label: {
                    HStack {
                        Image(systemName: "envelope")
                            .foregroundColor(.orange)
                        Text(L10n.Settings.feedback)
                    }
                }

                Button {
                    // Open customer service
                } label: {
                    HStack {
                        Image(systemName: "message")
                            .foregroundColor(.purple)
                        Text(L10n.Settings.onlineSupport)
                            .foregroundColor(.primary)
                    }
                }
            }
        }
        .navigationTitle(L10n.Settings.helpFeedback)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct FeedbackView: View {
    @State private var feedbackType = "suggestion"
    @State private var content = ""
    @State private var contactInfo = ""

    var types: [(key: String, label: String)] {
        [
            ("suggestion", L10n.Settings.typeSuggestion),
            ("bug", L10n.Settings.typeBug),
            ("content", L10n.Settings.typeContent),
            ("other", L10n.Settings.typeOther)
        ]
    }

    var body: some View {
        Form {
            Section {
                Picker(L10n.Settings.feedbackType, selection: $feedbackType) {
                    ForEach(types, id: \.key) { type in
                        Text(type.label).tag(type.key)
                    }
                }
            }

            Section {
                TextField(L10n.Settings.feedbackPlaceholder, text: $content, axis: .vertical)
                    .lineLimit(5...10)
            } header: {
                Text(L10n.Settings.feedbackContent)
            }

            Section {
                TextField(L10n.Settings.contactPlaceholder, text: $contactInfo)
            } header: {
                Text(L10n.Settings.contactInfo)
            } footer: {
                Text(L10n.Settings.contactFooter)
            }

            Section {
                Button(L10n.Settings.submitFeedback) {
                    // Submit feedback
                }
                .frame(maxWidth: .infinity)
                .disabled(content.isEmpty)
            }
        }
        .navigationTitle(L10n.Settings.feedback)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AboutView: View {
    var body: some View {
        List {
            Section {
                HStack {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "book.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)

                        Text("BookPost")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text(L10n.Settings.slogan)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 20)
                    Spacer()
                }
            }

            Section {
                HStack {
                    Text(L10n.Settings.version)
                    Spacer()
                    Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                        .foregroundColor(.secondary)
                }

                HStack {
                    Text(L10n.Settings.buildNumber)
                    Spacer()
                    Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1")
                        .foregroundColor(.secondary)
                }
            }

            Section {
                Link(destination: URL(string: "https://bookpost.app")!) {
                    HStack {
                        Text(L10n.Settings.officialWebsite)
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "arrow.up.right.square")
                            .foregroundColor(.secondary)
                    }
                }

                Link(destination: URL(string: "https://weibo.com/bookpost")!) {
                    HStack {
                        Text(L10n.Settings.officialWeibo)
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "arrow.up.right.square")
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section {
                Text("© 2024 BookPost. All rights reserved.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
        .navigationTitle(L10n.Settings.about)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct LegalView: View {
    var body: some View {
        List {
            NavigationLink {
                ScrollView {
                    Text("Terms of Service content...")
                        .padding()
                }
                .navigationTitle(L10n.Settings.termsOfService)
            } label: {
                Text(L10n.Settings.termsOfService)
            }

            NavigationLink {
                ScrollView {
                    Text("Privacy Policy content...")
                        .padding()
                }
                .navigationTitle(L10n.Settings.privacyPolicy)
            } label: {
                Text(L10n.Settings.privacyPolicy)
            }

            NavigationLink {
                ScrollView {
                    Text("Copyright Notice content...")
                        .padding()
                }
                .navigationTitle(L10n.Settings.copyright)
            } label: {
                Text(L10n.Settings.copyright)
            }
        }
        .navigationTitle(L10n.Settings.legalTerms)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Youth Mode Views

struct YouthModePasswordView: View {
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""

    var body: some View {
        Form {
            Section {
                SecureField(L10n.Settings.currentPassword, text: $currentPassword)
                SecureField(L10n.Settings.newPassword, text: $newPassword)
                SecureField(L10n.Settings.confirmPassword, text: $confirmPassword)
            } header: {
                Text(L10n.Settings.youthModePassword)
            } footer: {
                Text(L10n.Settings.passwordFooter)
            }

            Section {
                Button(L10n.Settings.savePassword) {
                    // Save password
                }
                .disabled(newPassword.isEmpty || newPassword != confirmPassword)
            }
        }
        .navigationTitle(L10n.Settings.youthModePassword)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct UsageTimeLimitView: View {
    @State private var selectedHours = 2
    @State private var isEnabled = true

    var body: some View {
        List {
            Section {
                Toggle(L10n.Settings.enableTimeLimit, isOn: $isEnabled)
            }

            if isEnabled {
                Section {
                    Picker(L10n.Settings.dailyLimit, selection: $selectedHours) {
                        Text("30 \(L10n.Settings.minutes)").tag(0)
                        Text("1 \(L10n.Settings.hour)").tag(1)
                        Text("2 \(L10n.Settings.hours)").tag(2)
                        Text("3 \(L10n.Settings.hours)").tag(3)
                        Text("4 \(L10n.Settings.hours)").tag(4)
                        Text(L10n.Settings.unlimited).tag(-1)
                    }
                    .pickerStyle(.inline)
                } header: {
                    Text(L10n.Settings.dailyUsageLimit)
                }
            }
        }
        .navigationTitle(L10n.Settings.usageTimeLimit)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct StudentVerificationView: View {
    @State private var schoolName = ""
    @State private var studentId = ""
    @State private var isSubmitting = false

    var body: some View {
        Form {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: "graduationcap.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.purple)

                    Text(L10n.Settings.studentBenefits)
                        .font(.headline)

                    Text(L10n.Settings.studentBenefitsDesc)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            }

            Section {
                TextField(L10n.Settings.schoolName, text: $schoolName)
                TextField(L10n.Settings.studentId, text: $studentId)
            } header: {
                Text(L10n.Settings.verificationInfo)
            }

            Section {
                Button {
                    isSubmitting = true
                    // Submit verification
                } label: {
                    HStack {
                        Text(L10n.Settings.submitVerification)
                        if isSubmitting {
                            Spacer()
                            ProgressView()
                        }
                    }
                }
                .disabled(schoolName.isEmpty || studentId.isEmpty || isSubmitting)
            }
        }
        .navigationTitle(L10n.Settings.studentVerification)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Device Management Views

struct LoggedInDevicesView: View {
    @State private var devices: [DeviceInfo] = DeviceInfo.sampleDevices

    var body: some View {
        List {
            Section {
                Text(L10n.Settings.deviceSecurityNote)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section {
                ForEach(devices) { device in
                    HStack {
                        Image(systemName: device.icon)
                            .font(.title2)
                            .foregroundColor(device.isCurrent ? .blue : .gray)
                            .frame(width: 40)

                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(device.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)

                                if device.isCurrent {
                                    Text(L10n.Settings.currentDevice)
                                        .font(.caption2)
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.blue)
                                        .cornerRadius(4)
                                }
                            }

                            Text(device.lastActive)
                                .font(.caption)
                                .foregroundColor(.secondary)

                            Text(device.location)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        if !device.isCurrent {
                            Button {
                                devices.removeAll { $0.id == device.id }
                            } label: {
                                Text(L10n.Settings.logout)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            } header: {
                Text(L10n.Settings.allDevices)
            }

            Section {
                Button(role: .destructive) {
                    devices.removeAll { !$0.isCurrent }
                } label: {
                    HStack {
                        Image(systemName: "arrow.right.square")
                        Text(L10n.Settings.logoutAllOtherDevices)
                    }
                }
            }
        }
        .navigationTitle(L10n.Settings.loggedInDevices)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DeviceInfo: Identifiable {
    let id: String
    let name: String
    let icon: String
    let lastActive: String
    let location: String
    let isCurrent: Bool

    static var sampleDevices: [DeviceInfo] {
        [
            DeviceInfo(
                id: "1",
                name: UIDevice.current.name,
                icon: "iphone",
                lastActive: "当前在线",
                location: "北京",
                isCurrent: true
            ),
            DeviceInfo(
                id: "2",
                name: "iPad Pro",
                icon: "ipad",
                lastActive: "2小时前",
                location: "北京",
                isCurrent: false
            ),
            DeviceInfo(
                id: "3",
                name: "MacBook Pro",
                icon: "laptopcomputer",
                lastActive: "昨天 14:32",
                location: "上海",
                isCurrent: false
            )
        ]
    }
}

#Preview {
    SettingsView()
}
