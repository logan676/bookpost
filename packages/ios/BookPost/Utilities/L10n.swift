import Foundation

/// Localization helper for BookLibrio
/// Usage: L10n.tab.home, L10n.auth.login, etc.
enum L10n {

    // MARK: - Common
    enum Common {
        static var appName: String { NSLocalizedString("app.name", comment: "") }
        static var loading: String { NSLocalizedString("common.loading", comment: "") }
        static var retry: String { NSLocalizedString("common.retry", comment: "") }
        static var cancel: String { NSLocalizedString("common.cancel", comment: "") }
        static var confirm: String { NSLocalizedString("common.confirm", comment: "") }
        static var ok: String { NSLocalizedString("common.ok", comment: "") }
        static var error: String { NSLocalizedString("common.error", comment: "") }
        static var success: String { NSLocalizedString("common.success", comment: "") }
        static var search: String { NSLocalizedString("common.search", comment: "") }
        static var all: String { NSLocalizedString("common.all", comment: "") }
        static var noContent: String { NSLocalizedString("common.noContent", comment: "") }
        static var unknownTitle: String { NSLocalizedString("common.unknownTitle", comment: "") }
        static var user: String { NSLocalizedString("common.user", comment: "") }
        static var bookLover: String { NSLocalizedString("common.bookLover", comment: "") }
        static var done: String { NSLocalizedString("common.done", comment: "") }
        static var more: String { NSLocalizedString("common.more", comment: "") }
        static var reset: String { NSLocalizedString("common.reset", comment: "") }
        static var progress: String { NSLocalizedString("common.progress", comment: "") }
    }

    // MARK: - Tab Bar
    enum Tab {
        static var home: String { NSLocalizedString("tab.home", comment: "") }
        static var ebooks: String { NSLocalizedString("tab.ebooks", comment: "") }
        static var magazines: String { NSLocalizedString("tab.magazines", comment: "") }
        static var books: String { NSLocalizedString("tab.books", comment: "") }
        static var profile: String { NSLocalizedString("tab.profile", comment: "") }
    }

    // MARK: - Auth
    enum Auth {
        static var login: String { NSLocalizedString("auth.login", comment: "") }
        static var register: String { NSLocalizedString("auth.register", comment: "") }
        static var logout: String { NSLocalizedString("auth.logout", comment: "") }
        static var email: String { NSLocalizedString("auth.email", comment: "") }
        static var password: String { NSLocalizedString("auth.password", comment: "") }
        static var loginToAccount: String { NSLocalizedString("auth.loginToAccount", comment: "") }
        static var createAccount: String { NSLocalizedString("auth.createAccount", comment: "") }
        static var noAccount: String { NSLocalizedString("auth.noAccount", comment: "") }
        static var hasAccount: String { NSLocalizedString("auth.hasAccount", comment: "") }
        static var passwordMinLength: String { NSLocalizedString("auth.passwordMinLength", comment: "") }
        static var logoutConfirm: String { NSLocalizedString("auth.logoutConfirm", comment: "") }
        static var logoutMessage: String { NSLocalizedString("auth.logoutMessage", comment: "") }
    }

    // MARK: - Home
    enum Home {
        static var continueReading: String { NSLocalizedString("home.continueReading", comment: "") }
        static var quickAccess: String { NSLocalizedString("home.quickAccess", comment: "") }
        static var noReadingHistory: String { NSLocalizedString("home.noReadingHistory", comment: "") }

        static func page(_ number: Int) -> String {
            String(format: NSLocalizedString("home.page", comment: ""), number)
        }
    }

    // MARK: - Ebooks
    enum Ebooks {
        static var title: String { NSLocalizedString("ebooks.title", comment: "") }
        static var noEbooks: String { NSLocalizedString("ebooks.noEbooks", comment: "") }
        static var startReading: String { NSLocalizedString("ebooks.startReading", comment: "") }

        static func count(_ number: Int) -> String {
            String(format: NSLocalizedString("ebooks.count", comment: ""), number)
        }
    }

    // MARK: - Magazines
    enum Magazines {
        static var title: String { NSLocalizedString("magazines.title", comment: "") }
        static var noMagazines: String { NSLocalizedString("magazines.noMagazines", comment: "") }
        static var allPublishers: String { NSLocalizedString("magazines.allPublishers", comment: "") }

        static func count(_ number: Int) -> String {
            String(format: NSLocalizedString("magazines.count", comment: ""), number)
        }

        static func year(_ year: Int) -> String {
            String(format: NSLocalizedString("magazines.year", comment: ""), year)
        }

        static func pageCount(_ count: Int) -> String {
            String(format: NSLocalizedString("magazines.pageCount", comment: ""), count)
        }
    }

    // MARK: - Books
    enum Books {
        static var title: String { NSLocalizedString("books.title", comment: "") }
        static var noBooks: String { NSLocalizedString("books.noBooks", comment: "") }
    }

    // MARK: - Profile
    enum Profile {
        static var title: String { NSLocalizedString("profile.title", comment: "") }
        static var readingHistory: String { NSLocalizedString("profile.readingHistory", comment: "") }
        static var settings: String { NSLocalizedString("profile.settings", comment: "") }
        static var myBookshelf: String { NSLocalizedString("profile.myBookshelf", comment: "") }
        static var readingNotes: String { NSLocalizedString("profile.readingNotes", comment: "") }
        static var readingGoals: String { NSLocalizedString("profile.readingGoals", comment: "") }
        static var readingStreak: String { NSLocalizedString("profile.readingStreak", comment: "") }
        static var activity: String { NSLocalizedString("profile.activity", comment: "") }
        static var leaderboard: String { NSLocalizedString("profile.leaderboard", comment: "") }
        static var myBadges: String { NSLocalizedString("profile.myBadges", comment: "") }
    }

    // MARK: - Bookshelf
    enum Bookshelf {
        static var title: String { NSLocalizedString("bookshelf.title", comment: "") }
        static var empty: String { NSLocalizedString("bookshelf.empty", comment: "") }
        static var browseBooks: String { NSLocalizedString("bookshelf.browseBooks", comment: "") }
        static var noBooks: String { NSLocalizedString("bookshelf.noBooks", comment: "") }
        static var wantToRead: String { NSLocalizedString("bookshelf.wantToRead", comment: "") }
        static var reading: String { NSLocalizedString("bookshelf.reading", comment: "") }
        static var finished: String { NSLocalizedString("bookshelf.finished", comment: "") }
        static var abandoned: String { NSLocalizedString("bookshelf.abandoned", comment: "") }
        static var ebook: String { NSLocalizedString("bookshelf.ebook", comment: "") }
        static var magazine: String { NSLocalizedString("bookshelf.magazine", comment: "") }
        static var sortByAdded: String { NSLocalizedString("bookshelf.sortByAdded", comment: "") }
        static var sortByUpdated: String { NSLocalizedString("bookshelf.sortByUpdated", comment: "") }
        static var sortByTitle: String { NSLocalizedString("bookshelf.sortByTitle", comment: "") }
        static var sortByProgress: String { NSLocalizedString("bookshelf.sortByProgress", comment: "") }
        static var sortByLastRead: String { NSLocalizedString("bookshelf.sortByLastRead", comment: "") }
        static var sortByAuthor: String { NSLocalizedString("bookshelf.sortByAuthor", comment: "") }
        static var sortByRating: String { NSLocalizedString("bookshelf.sortByRating", comment: "") }
        static var sortByPublishDate: String { NSLocalizedString("bookshelf.sortByPublishDate", comment: "") }
        static var sort: String { NSLocalizedString("bookshelf.sort", comment: "") }
        static var sortAsc: String { NSLocalizedString("bookshelf.sortAsc", comment: "") }
        static var sortDesc: String { NSLocalizedString("bookshelf.sortDesc", comment: "") }
        static var type: String { NSLocalizedString("bookshelf.type", comment: "") }
    }

    // MARK: - Notes
    enum Notes {
        static var title: String { NSLocalizedString("notes.title", comment: "") }
        static var searchPlaceholder: String { NSLocalizedString("notes.searchPlaceholder", comment: "") }
        static var empty: String { NSLocalizedString("notes.empty", comment: "") }
        static var noNotesForYear: String { NSLocalizedString("notes.noNotesForYear", comment: "") }
        static var noSearchResults: String { NSLocalizedString("notes.noSearchResults", comment: "") }
        static var startReading: String { NSLocalizedString("notes.startReading", comment: "") }
        static var loadMore: String { NSLocalizedString("notes.loadMore", comment: "") }
        static var detail: String { NSLocalizedString("notes.detail", comment: "") }
        static var loadFailed: String { NSLocalizedString("notes.loadFailed", comment: "") }
        static var content: String { NSLocalizedString("notes.content", comment: "") }
        static var underlines: String { NSLocalizedString("notes.underlines", comment: "") }
        static var comments: String { NSLocalizedString("notes.comments", comment: "") }

        static func year(_ year: Int) -> String {
            String(format: NSLocalizedString("notes.year", comment: ""), year)
        }

        static func underlineCount(_ count: Int) -> String {
            String(format: NSLocalizedString("notes.underlineCount", comment: ""), count)
        }

        static func commentCount(_ count: Int) -> String {
            String(format: NSLocalizedString("notes.commentCount", comment: ""), count)
        }
    }

    // MARK: - Goals
    enum Goals {
        static var title: String { NSLocalizedString("goals.title", comment: "") }
        static var setGoal: String { NSLocalizedString("goals.setGoal", comment: "") }
        static var selectGoal: String { NSLocalizedString("goals.selectGoal", comment: "") }
        static var completed: String { NSLocalizedString("goals.completed", comment: "") }
        static var target: String { NSLocalizedString("goals.target", comment: "") }
        static var read: String { NSLocalizedString("goals.read", comment: "") }
        static var remaining: String { NSLocalizedString("goals.remaining", comment: "") }
        static var noGoalSet: String { NSLocalizedString("goals.noGoalSet", comment: "") }
        static var adjustGoal: String { NSLocalizedString("goals.adjustGoal", comment: "") }
        static var currentStreak: String { NSLocalizedString("goals.currentStreak", comment: "") }
        static var maxStreak: String { NSLocalizedString("goals.maxStreak", comment: "") }
        static var light: String { NSLocalizedString("goals.light", comment: "") }
        static var moderate: String { NSLocalizedString("goals.moderate", comment: "") }
        static var standard: String { NSLocalizedString("goals.standard", comment: "") }
        static var intensive: String { NSLocalizedString("goals.intensive", comment: "") }
    }

    // MARK: - Stats
    enum Stats {
        static var title: String { NSLocalizedString("stats.title", comment: "") }
        static var overview: String { NSLocalizedString("stats.overview", comment: "") }
        static var totalReadingTime: String { NSLocalizedString("stats.totalReadingTime", comment: "") }
        static var readingDays: String { NSLocalizedString("stats.readingDays", comment: "") }
        static var booksFinished: String { NSLocalizedString("stats.booksFinished", comment: "") }
        static var currentStreak: String { NSLocalizedString("stats.currentStreak", comment: "") }
        static var longestStreak: String { NSLocalizedString("stats.longestStreak", comment: "") }
        static var days: String { NSLocalizedString("stats.days", comment: "") }
        static var less: String { NSLocalizedString("stats.less", comment: "") }
        static var more: String { NSLocalizedString("stats.more", comment: "") }
        static var booksRead: String { NSLocalizedString("stats.booksRead", comment: "") }
        static var underlines: String { NSLocalizedString("stats.underlines", comment: "") }
        static var ideas: String { NSLocalizedString("stats.ideas", comment: "") }

        // Weekday abbreviations
        static var sun: String { NSLocalizedString("stats.weekday.sun", comment: "") }
        static var mon: String { NSLocalizedString("stats.weekday.mon", comment: "") }
        static var tue: String { NSLocalizedString("stats.weekday.tue", comment: "") }
        static var wed: String { NSLocalizedString("stats.weekday.wed", comment: "") }
        static var thu: String { NSLocalizedString("stats.weekday.thu", comment: "") }
        static var fri: String { NSLocalizedString("stats.weekday.fri", comment: "") }
        static var sat: String { NSLocalizedString("stats.weekday.sat", comment: "") }

        // Time periods
        static var thisWeek: String { NSLocalizedString("stats.thisWeek", comment: "") }
        static var thisMonth: String { NSLocalizedString("stats.thisMonth", comment: "") }
        static var thisYear: String { NSLocalizedString("stats.thisYear", comment: "") }
        static var allTime: String { NSLocalizedString("stats.allTime", comment: "") }

        // Dimension names
        static var week: String { NSLocalizedString("stats.week", comment: "") }
        static var month: String { NSLocalizedString("stats.month", comment: "") }
        static var year: String { NSLocalizedString("stats.year", comment: "") }
        static var total: String { NSLocalizedString("stats.total", comment: "") }
        static var calendar: String { NSLocalizedString("stats.calendar", comment: "") }

        // Charts and sections
        static var readingTimeDist: String { NSLocalizedString("stats.readingTimeDist", comment: "") }
        static var monthlyTrend: String { NSLocalizedString("stats.monthlyTrend", comment: "") }
        static var milestonesMonth: String { NSLocalizedString("stats.milestonesMonth", comment: "") }
        static var noData: String { NSLocalizedString("stats.noData", comment: "") }
        static var timePeriod: String { NSLocalizedString("stats.timePeriod", comment: "") }
        static var daysRead: String { NSLocalizedString("stats.daysRead", comment: "") }
        static var hours: String { NSLocalizedString("stats.hours", comment: "") }
        static var books: String { NSLocalizedString("stats.books", comment: "") }

        static func dailyAvg(_ value: String) -> String {
            String(format: NSLocalizedString("stats.dailyAvg", comment: ""), value)
        }

        static func friendsRank(_ rank: Int) -> String {
            String(format: NSLocalizedString("stats.friendsRank", comment: ""), rank)
        }

        static func hoursReadYear(_ hours: Int) -> String {
            String(format: NSLocalizedString("stats.hoursReadYear", comment: ""), hours)
        }

        static func daysWithReading(_ days: Int) -> String {
            String(format: NSLocalizedString("stats.daysWithReading", comment: ""), days)
        }
    }

    // MARK: - Leaderboard
    enum Leaderboard {
        static var title: String { NSLocalizedString("leaderboard.title", comment: "") }
        static var friends: String { NSLocalizedString("leaderboard.friends", comment: "") }
        static var global: String { NSLocalizedString("leaderboard.global", comment: "") }
        static var loadFailed: String { NSLocalizedString("leaderboard.loadFailed", comment: "") }
        static var weeklyRanking: String { NSLocalizedString("leaderboard.weeklyRanking", comment: "") }
        static var settlementTime: String { NSLocalizedString("leaderboard.settlementTime", comment: "") }
        static var myRanking: String { NSLocalizedString("leaderboard.myRanking", comment: "") }
        static var participants: String { NSLocalizedString("leaderboard.participants", comment: "") }
        static var readingTime: String { NSLocalizedString("leaderboard.readingTime", comment: "") }
        static var readingDays: String { NSLocalizedString("leaderboard.readingDays", comment: "") }
        static var rankChange: String { NSLocalizedString("leaderboard.rankChange", comment: "") }
        static var fullRanking: String { NSLocalizedString("leaderboard.fullRanking", comment: "") }
    }

    // MARK: - Activity
    enum Activity {
        static var title: String { NSLocalizedString("activity.title", comment: "") }
        static var following: String { NSLocalizedString("activity.following", comment: "") }
        static var global: String { NSLocalizedString("activity.global", comment: "") }
        static var empty: String { NSLocalizedString("activity.empty", comment: "") }
        static var followUsers: String { NSLocalizedString("activity.followUsers", comment: "") }
        static var noActivity: String { NSLocalizedString("activity.noActivity", comment: "") }
        static var loadMore: String { NSLocalizedString("activity.loadMore", comment: "") }
    }

    // MARK: - User Profile
    enum UserProfile {
        static var title: String { NSLocalizedString("userProfile.title", comment: "") }
        static var loadFailed: String { NSLocalizedString("userProfile.loadFailed", comment: "") }
        static var followers: String { NSLocalizedString("userProfile.followers", comment: "") }
        static var following: String { NSLocalizedString("userProfile.following", comment: "") }
        static var mutualFollow: String { NSLocalizedString("userProfile.mutualFollow", comment: "") }
        static var follow: String { NSLocalizedString("userProfile.follow", comment: "") }
        static var unfollow: String { NSLocalizedString("userProfile.unfollow", comment: "") }
        static var readingTime: String { NSLocalizedString("userProfile.readingTime", comment: "") }
        static var booksFinished: String { NSLocalizedString("userProfile.booksFinished", comment: "") }
        static var streak: String { NSLocalizedString("userProfile.streak", comment: "") }
    }

    // MARK: - Follow
    enum Follow {
        static var followers: String { NSLocalizedString("follow.followers", comment: "") }
        static var following: String { NSLocalizedString("follow.following", comment: "") }
        static var noFollowers: String { NSLocalizedString("follow.noFollowers", comment: "") }
        static var noFollowing: String { NSLocalizedString("follow.noFollowing", comment: "") }
        static var loadMore: String { NSLocalizedString("follow.loadMore", comment: "") }
    }

    // MARK: - Review
    enum Review {
        static var rating: String { NSLocalizedString("review.rating", comment: "") }
        static var stars: String { NSLocalizedString("review.stars", comment: "") }
        static var detail: String { NSLocalizedString("review.detail", comment: "") }
    }

    // MARK: - Reader
    enum Reader {
        static var close: String { NSLocalizedString("reader.close", comment: "") }
        static var downloadFailed: String { NSLocalizedString("reader.downloadFailed", comment: "") }
        static var openFailed: String { NSLocalizedString("reader.openFailed", comment: "") }
        static var loading: String { NSLocalizedString("reader.loading", comment: "") }
        static var settings: String { NSLocalizedString("reader.settings", comment: "") }
        static var tableOfContents: String { NSLocalizedString("reader.tableOfContents", comment: "") }
        static var highlights: String { NSLocalizedString("reader.highlights", comment: "") }
        static var bookmarks: String { NSLocalizedString("reader.bookmarks", comment: "") }
        static var done: String { NSLocalizedString("reader.done", comment: "") }
        static var reset: String { NSLocalizedString("reader.reset", comment: "") }
        static var noTableOfContents: String { NSLocalizedString("reader.noTableOfContents", comment: "") }

        // Settings sections
        static var brightness: String { NSLocalizedString("reader.brightness", comment: "") }
        static var backgroundColor: String { NSLocalizedString("reader.backgroundColor", comment: "") }
        static var fontSize: String { NSLocalizedString("reader.fontSize", comment: "") }
        static var fontFamily: String { NSLocalizedString("reader.fontFamily", comment: "") }
        static var lineSpacing: String { NSLocalizedString("reader.lineSpacing", comment: "") }
        static var margins: String { NSLocalizedString("reader.margins", comment: "") }
        static var other: String { NSLocalizedString("reader.other", comment: "") }
        static var keepScreenOn: String { NSLocalizedString("reader.keepScreenOn", comment: "") }
        static var previewText: String { NSLocalizedString("reader.previewText", comment: "") }

        // Color modes
        static var colorWhite: String { NSLocalizedString("reader.color.white", comment: "") }
        static var colorSepia: String { NSLocalizedString("reader.color.sepia", comment: "") }
        static var colorGreen: String { NSLocalizedString("reader.color.green", comment: "") }
        static var colorDark: String { NSLocalizedString("reader.color.dark", comment: "") }

        // Font families
        static var fontSystem: String { NSLocalizedString("reader.font.system", comment: "") }
        static var fontSongti: String { NSLocalizedString("reader.font.songti", comment: "") }
        static var fontKaiti: String { NSLocalizedString("reader.font.kaiti", comment: "") }
        static var fontHeiti: String { NSLocalizedString("reader.font.heiti", comment: "") }

        // Line spacing
        static var spacingCompact: String { NSLocalizedString("reader.spacing.compact", comment: "") }
        static var spacingNormal: String { NSLocalizedString("reader.spacing.normal", comment: "") }
        static var spacingRelaxed: String { NSLocalizedString("reader.spacing.relaxed", comment: "") }
        static var spacingLoose: String { NSLocalizedString("reader.spacing.loose", comment: "") }

        // Margin sizes
        static var marginSmall: String { NSLocalizedString("reader.margin.small", comment: "") }
        static var marginMedium: String { NSLocalizedString("reader.margin.medium", comment: "") }
        static var marginLarge: String { NSLocalizedString("reader.margin.large", comment: "") }

        static func page(_ number: Int) -> String {
            String(format: NSLocalizedString("reader.page", comment: ""), number)
        }

        static func pageOf(_ current: Int, _ total: Int) -> String {
            String(format: NSLocalizedString("reader.pageOf", comment: ""), current, total)
        }

        static func totalPages(_ count: Int) -> String {
            String(format: NSLocalizedString("reader.totalPages", comment: ""), count)
        }

        // Search
        static var search: String { NSLocalizedString("reader.search", comment: "") }
        static var searchPlaceholder: String { NSLocalizedString("reader.search.placeholder", comment: "") }
        static var searchNoResults: String { NSLocalizedString("reader.search.noResults", comment: "") }
        static var searchSearching: String { NSLocalizedString("reader.search.searching", comment: "") }

        static func searchResultCount(_ count: Int) -> String {
            String(format: NSLocalizedString("reader.search.resultCount", comment: ""), count)
        }

        static func searchInChapter(_ chapter: String) -> String {
            String(format: NSLocalizedString("reader.search.inChapter", comment: ""), chapter)
        }

        // Bookmarks
        static var bookmarksTitle: String { NSLocalizedString("reader.bookmarks.title", comment: "") }
        static var bookmarksEmpty: String { NSLocalizedString("reader.bookmarks.empty", comment: "") }
        static var bookmarksAdd: String { NSLocalizedString("reader.bookmarks.add", comment: "") }
        static var bookmarksAdded: String { NSLocalizedString("reader.bookmarks.added", comment: "") }
        static var bookmarksRemoved: String { NSLocalizedString("reader.bookmarks.removed", comment: "") }
        static var bookmarksDelete: String { NSLocalizedString("reader.bookmarks.delete", comment: "") }
        static var bookmarksDeleteConfirm: String { NSLocalizedString("reader.bookmarks.deleteConfirm", comment: "") }
        static var bookmarksCurrentPage: String { NSLocalizedString("reader.bookmarks.currentPage", comment: "") }
    }

    // MARK: - Audio Player
    enum AudioPlayer {
        static var chapterList: String { NSLocalizedString("audioPlayer.chapterList", comment: "") }
        static var showOriginal: String { NSLocalizedString("audioPlayer.showOriginal", comment: "") }
        static var share: String { NSLocalizedString("audioPlayer.share", comment: "") }
        static var aiNarration: String { NSLocalizedString("audioPlayer.aiNarration", comment: "") }
        static var speed: String { NSLocalizedString("audioPlayer.speed", comment: "") }
        static var voice: String { NSLocalizedString("audioPlayer.voice", comment: "") }
        static var timer: String { NSLocalizedString("audioPlayer.timer", comment: "") }
        static var contents: String { NSLocalizedString("audioPlayer.contents", comment: "") }
        static var selectVoice: String { NSLocalizedString("audioPlayer.selectVoice", comment: "") }
        static var sleepTimer: String { NSLocalizedString("audioPlayer.sleepTimer", comment: "") }
        static var setSleepTimer: String { NSLocalizedString("audioPlayer.setSleepTimer", comment: "") }
        static var done: String { NSLocalizedString("audioPlayer.done", comment: "") }
        static var cancel: String { NSLocalizedString("audioPlayer.cancel", comment: "") }
        static var minutes: String { NSLocalizedString("audioPlayer.minutes", comment: "") }

        // Voice types
        static var voiceDefaultFemale: String { NSLocalizedString("audioPlayer.voice.defaultFemale", comment: "") }
        static var voiceGentleFemale: String { NSLocalizedString("audioPlayer.voice.gentleFemale", comment: "") }
        static var voiceLivelyFemale: String { NSLocalizedString("audioPlayer.voice.livelyFemale", comment: "") }
        static var voiceDeepMale: String { NSLocalizedString("audioPlayer.voice.deepMale", comment: "") }
        static var voiceYoungMale: String { NSLocalizedString("audioPlayer.voice.youngMale", comment: "") }
        static var voiceChild: String { NSLocalizedString("audioPlayer.voice.child", comment: "") }

        // Voice descriptions
        static var descGentleIntellect: String { NSLocalizedString("audioPlayer.desc.gentleIntellect", comment: "") }
        static var descYoungLively: String { NSLocalizedString("audioPlayer.desc.youngLively", comment: "") }
        static var descDeepMagnetic: String { NSLocalizedString("audioPlayer.desc.deepMagnetic", comment: "") }
        static var descYoungSunny: String { NSLocalizedString("audioPlayer.desc.youngSunny", comment: "") }
        static var descCuteChildish: String { NSLocalizedString("audioPlayer.desc.cuteChildish", comment: "") }

        // Sleep timer options
        static var timer15min: String { NSLocalizedString("audioPlayer.timer.15min", comment: "") }
        static var timer30min: String { NSLocalizedString("audioPlayer.timer.30min", comment: "") }
        static var timer45min: String { NSLocalizedString("audioPlayer.timer.45min", comment: "") }
        static var timer60min: String { NSLocalizedString("audioPlayer.timer.60min", comment: "") }
        static var timerEndOfChapter: String { NSLocalizedString("audioPlayer.timer.endOfChapter", comment: "") }

        static func chapter(_ number: Int) -> String {
            String(format: NSLocalizedString("audioPlayer.chapter", comment: ""), number)
        }

        static func timerActive(_ duration: String) -> String {
            String(format: NSLocalizedString("audioPlayer.timerActive", comment: ""), duration)
        }

        static func minutesCount(_ count: Int) -> String {
            String(format: NSLocalizedString("audioPlayer.minutesCount", comment: ""), count)
        }
    }

    // MARK: - Settings
    enum Settings {
        static var title: String { NSLocalizedString("settings.title", comment: "") }
        static var confirmLogout: String { NSLocalizedString("settings.confirmLogout", comment: "") }
        static var logoutMessage: String { NSLocalizedString("settings.logoutMessage", comment: "") }
        static var logout: String { NSLocalizedString("settings.logout", comment: "") }
        static var clearCache: String { NSLocalizedString("settings.clearCache", comment: "") }
        static var clearCacheMessage: String { NSLocalizedString("settings.clearCacheMessage", comment: "") }
        static var clear: String { NSLocalizedString("settings.clear", comment: "") }

        // Account section
        static var account: String { NSLocalizedString("settings.account", comment: "") }
        static var editProfile: String { NSLocalizedString("settings.editProfile", comment: "") }
        static var memberCenter: String { NSLocalizedString("settings.memberCenter", comment: "") }
        static var activated: String { NSLocalizedString("settings.activated", comment: "") }
        static var accountSecurity: String { NSLocalizedString("settings.accountSecurity", comment: "") }

        // Reading preferences
        static var readingSettings: String { NSLocalizedString("settings.readingSettings", comment: "") }
        static var fontSettings: String { NSLocalizedString("settings.fontSettings", comment: "") }
        static var readingTheme: String { NSLocalizedString("settings.readingTheme", comment: "") }
        static var pageFlipAnimation: String { NSLocalizedString("settings.pageFlipAnimation", comment: "") }
        static var autoBrightness: String { NSLocalizedString("settings.autoBrightness", comment: "") }
        static var keepScreenOnReading: String { NSLocalizedString("settings.keepScreenOnReading", comment: "") }

        // Notifications
        static var notificationSettings: String { NSLocalizedString("settings.notificationSettings", comment: "") }
        static var readingReminder: String { NSLocalizedString("settings.readingReminder", comment: "") }
        static var reminderTime: String { NSLocalizedString("settings.reminderTime", comment: "") }
        static var newBookRecommendation: String { NSLocalizedString("settings.newBookRecommendation", comment: "") }
        static var socialUpdates: String { NSLocalizedString("settings.socialUpdates", comment: "") }
        static var systemNotification: String { NSLocalizedString("settings.systemNotification", comment: "") }

        // Privacy
        static var privacySecurity: String { NSLocalizedString("settings.privacySecurity", comment: "") }
        static var privacySettings: String { NSLocalizedString("settings.privacySettings", comment: "") }
        static var blockedUsers: String { NSLocalizedString("settings.blockedUsers", comment: "") }
        static var downloadMyData: String { NSLocalizedString("settings.downloadMyData", comment: "") }

        // Storage
        static var storage: String { NSLocalizedString("settings.storage", comment: "") }
        static var cacheSize: String { NSLocalizedString("settings.cacheSize", comment: "") }
        static var downloadSettings: String { NSLocalizedString("settings.downloadSettings", comment: "") }
        static var calculating: String { NSLocalizedString("settings.calculating", comment: "") }

        // About
        static var about: String { NSLocalizedString("settings.about", comment: "") }
        static var helpFeedback: String { NSLocalizedString("settings.helpFeedback", comment: "") }
        static var rateUs: String { NSLocalizedString("settings.rateUs", comment: "") }
        static var shareWithFriends: String { NSLocalizedString("settings.shareWithFriends", comment: "") }
        static var termsPrivacy: String { NSLocalizedString("settings.termsPrivacy", comment: "") }
        static var shareText: String { NSLocalizedString("settings.shareText", comment: "") }

        // Profile Edit
        static var changeAvatar: String { NSLocalizedString("settings.changeAvatar", comment: "") }
        static var nickname: String { NSLocalizedString("settings.nickname", comment: "") }
        static var bio: String { NSLocalizedString("settings.bio", comment: "") }
        static var basicInfo: String { NSLocalizedString("settings.basicInfo", comment: "") }
        static var editProfileTitle: String { NSLocalizedString("settings.editProfileTitle", comment: "") }
        static var save: String { NSLocalizedString("settings.save", comment: "") }

        // Account Security
        static var changePassword: String { NSLocalizedString("settings.changePassword", comment: "") }
        static var bindPhone: String { NSLocalizedString("settings.bindPhone", comment: "") }
        static var bindEmail: String { NSLocalizedString("settings.bindEmail", comment: "") }
        static var notBound: String { NSLocalizedString("settings.notBound", comment: "") }
        static var thirdPartyAccounts: String { NSLocalizedString("settings.thirdPartyAccounts", comment: "") }
        static var deleteAccount: String { NSLocalizedString("settings.deleteAccount", comment: "") }

        // Font Settings
        static var fontSize: String { NSLocalizedString("settings.fontSize", comment: "") }
        static var lineSpacing: String { NSLocalizedString("settings.lineSpacing", comment: "") }
        static var font: String { NSLocalizedString("settings.font", comment: "") }
        static var preview: String { NSLocalizedString("settings.preview", comment: "") }
        static var previewText: String { NSLocalizedString("settings.previewText", comment: "") }
        static var fontSystem: String { NSLocalizedString("settings.fontSystem", comment: "") }
        static var fontPingfang: String { NSLocalizedString("settings.fontPingfang", comment: "") }
        static var fontSongti: String { NSLocalizedString("settings.fontSongti", comment: "") }
        static var fontKaiti: String { NSLocalizedString("settings.fontKaiti", comment: "") }
        static var fontHeiti: String { NSLocalizedString("settings.fontHeiti", comment: "") }

        // Theme Settings
        static var theme: String { NSLocalizedString("settings.theme", comment: "") }
        static var themeDefault: String { NSLocalizedString("settings.themeDefault", comment: "") }
        static var themeEyeProtection: String { NSLocalizedString("settings.themeEyeProtection", comment: "") }
        static var themeNight: String { NSLocalizedString("settings.themeNight", comment: "") }
        static var themeParchment: String { NSLocalizedString("settings.themeParchment", comment: "") }
        static var followSystemDark: String { NSLocalizedString("settings.followSystemDark", comment: "") }

        // Reminder Time
        static var `repeat`: String { NSLocalizedString("settings.repeat", comment: "") }
        static var weekdays: String { NSLocalizedString("settings.weekdays", comment: "") }
        static var monday: String { NSLocalizedString("settings.monday", comment: "") }
        static var tuesday: String { NSLocalizedString("settings.tuesday", comment: "") }
        static var wednesday: String { NSLocalizedString("settings.wednesday", comment: "") }
        static var thursday: String { NSLocalizedString("settings.thursday", comment: "") }
        static var friday: String { NSLocalizedString("settings.friday", comment: "") }
        static var saturday: String { NSLocalizedString("settings.saturday", comment: "") }
        static var sunday: String { NSLocalizedString("settings.sunday", comment: "") }

        // Privacy Settings
        static var profileVisibility: String { NSLocalizedString("settings.profileVisibility", comment: "") }
        static var visibilityPublic: String { NSLocalizedString("settings.visibilityPublic", comment: "") }
        static var visibilityFriendsOnly: String { NSLocalizedString("settings.visibilityFriendsOnly", comment: "") }
        static var visibilityPrivate: String { NSLocalizedString("settings.visibilityPrivate", comment: "") }
        static var socialPrivacy: String { NSLocalizedString("settings.socialPrivacy", comment: "") }
        static var showReadingStatus: String { NSLocalizedString("settings.showReadingStatus", comment: "") }
        static var showMyBookshelf: String { NSLocalizedString("settings.showMyBookshelf", comment: "") }
        static var allowStrangerMessages: String { NSLocalizedString("settings.allowStrangerMessages", comment: "") }

        // Blocked Users
        static var noBlockedUsers: String { NSLocalizedString("settings.noBlockedUsers", comment: "") }
        static var blockedUsersDesc: String { NSLocalizedString("settings.blockedUsersDesc", comment: "") }
        static var remove: String { NSLocalizedString("settings.remove", comment: "") }

        // Data Export
        static var dataExportDesc: String { NSLocalizedString("settings.dataExportDesc", comment: "") }
        static var requestDataExport: String { NSLocalizedString("settings.requestDataExport", comment: "") }
        static var downloadData: String { NSLocalizedString("settings.downloadData", comment: "") }

        // Download Settings
        static var wifiOnly: String { NSLocalizedString("settings.wifiOnly", comment: "") }
        static var autoDownloadNewBooks: String { NSLocalizedString("settings.autoDownloadNewBooks", comment: "") }
        static var downloadQuality: String { NSLocalizedString("settings.downloadQuality", comment: "") }
        static var qualitySettings: String { NSLocalizedString("settings.qualitySettings", comment: "") }
        static var qualityHigh: String { NSLocalizedString("settings.qualityHigh", comment: "") }
        static var qualityStandard: String { NSLocalizedString("settings.qualityStandard", comment: "") }
        static var qualitySaveSpace: String { NSLocalizedString("settings.qualitySaveSpace", comment: "") }

        // Help Center
        static var faq: String { NSLocalizedString("settings.faq", comment: "") }
        static var userGuide: String { NSLocalizedString("settings.userGuide", comment: "") }
        static var feedback: String { NSLocalizedString("settings.feedback", comment: "") }
        static var onlineSupport: String { NSLocalizedString("settings.onlineSupport", comment: "") }

        // Feedback
        static var feedbackType: String { NSLocalizedString("settings.feedbackType", comment: "") }
        static var feedbackContent: String { NSLocalizedString("settings.feedbackContent", comment: "") }
        static var feedbackPlaceholder: String { NSLocalizedString("settings.feedbackPlaceholder", comment: "") }
        static var contactInfo: String { NSLocalizedString("settings.contactInfo", comment: "") }
        static var contactPlaceholder: String { NSLocalizedString("settings.contactPlaceholder", comment: "") }
        static var contactFooter: String { NSLocalizedString("settings.contactFooter", comment: "") }
        static var submitFeedback: String { NSLocalizedString("settings.submitFeedback", comment: "") }
        static var typeSuggestion: String { NSLocalizedString("settings.typeSuggestion", comment: "") }
        static var typeBug: String { NSLocalizedString("settings.typeBug", comment: "") }
        static var typeContent: String { NSLocalizedString("settings.typeContent", comment: "") }
        static var typeOther: String { NSLocalizedString("settings.typeOther", comment: "") }

        // About
        static var slogan: String { NSLocalizedString("settings.slogan", comment: "") }
        static var version: String { NSLocalizedString("settings.version", comment: "") }
        static var buildNumber: String { NSLocalizedString("settings.buildNumber", comment: "") }
        static var officialWebsite: String { NSLocalizedString("settings.officialWebsite", comment: "") }
        static var officialWeibo: String { NSLocalizedString("settings.officialWeibo", comment: "") }

        // Legal
        static var legalTerms: String { NSLocalizedString("settings.legalTerms", comment: "") }
        static var termsOfService: String { NSLocalizedString("settings.termsOfService", comment: "") }
        static var privacyPolicy: String { NSLocalizedString("settings.privacyPolicy", comment: "") }
        static var copyright: String { NSLocalizedString("settings.copyright", comment: "") }

        // Font size descriptions
        static var fontSizeSmall: String { NSLocalizedString("settings.fontSizeSmall", comment: "") }
        static var fontSizeMedium: String { NSLocalizedString("settings.fontSizeMedium", comment: "") }
        static var fontSizeLarge: String { NSLocalizedString("settings.fontSizeLarge", comment: "") }

        // Extended Reading Settings
        static var allowLandscape: String { NSLocalizedString("settings.allowLandscape", comment: "") }
        static var showTimeBattery: String { NSLocalizedString("settings.showTimeBattery", comment: "") }
        static var leftTapNextPage: String { NSLocalizedString("settings.leftTapNextPage", comment: "") }

        // Social Reading
        static var socialReading: String { NSLocalizedString("settings.socialReading", comment: "") }
        static var hideOthersThoughts: String { NSLocalizedString("settings.hideOthersThoughts", comment: "") }
        static var hideOthersHighlights: String { NSLocalizedString("settings.hideOthersHighlights", comment: "") }
        static var showFriendBubbles: String { NSLocalizedString("settings.showFriendBubbles", comment: "") }
        static var filterWebNovels: String { NSLocalizedString("settings.filterWebNovels", comment: "") }
        static var autoDownloadOnAdd: String { NSLocalizedString("settings.autoDownloadOnAdd", comment: "") }
        static var socialReadingFooter: String { NSLocalizedString("settings.socialReadingFooter", comment: "") }

        // Youth Mode & Content Safety
        static var contentSafety: String { NSLocalizedString("settings.contentSafety", comment: "") }
        static var youthMode: String { NSLocalizedString("settings.youthMode", comment: "") }
        static var youthModeDesc: String { NSLocalizedString("settings.youthModeDesc", comment: "") }
        static var youthModePassword: String { NSLocalizedString("settings.youthModePassword", comment: "") }
        static var usageTimeLimit: String { NSLocalizedString("settings.usageTimeLimit", comment: "") }
        static var filterMatureContent: String { NSLocalizedString("settings.filterMatureContent", comment: "") }
        static var studentVerification: String { NSLocalizedString("settings.studentVerification", comment: "") }
        static var verified: String { NSLocalizedString("settings.verified", comment: "") }
        static var notVerified: String { NSLocalizedString("settings.notVerified", comment: "") }
        static var youthModeFooter: String { NSLocalizedString("settings.youthModeFooter", comment: "") }
        static var currentPassword: String { NSLocalizedString("settings.currentPassword", comment: "") }
        static var newPassword: String { NSLocalizedString("settings.newPassword", comment: "") }
        static var confirmPassword: String { NSLocalizedString("settings.confirmPassword", comment: "") }
        static var passwordFooter: String { NSLocalizedString("settings.passwordFooter", comment: "") }
        static var savePassword: String { NSLocalizedString("settings.savePassword", comment: "") }
        static var enableTimeLimit: String { NSLocalizedString("settings.enableTimeLimit", comment: "") }
        static var dailyLimit: String { NSLocalizedString("settings.dailyLimit", comment: "") }
        static var dailyUsageLimit: String { NSLocalizedString("settings.dailyUsageLimit", comment: "") }
        static var minutes: String { NSLocalizedString("settings.minutes", comment: "") }
        static var hour: String { NSLocalizedString("settings.hour", comment: "") }
        static var hours: String { NSLocalizedString("settings.hours", comment: "") }
        static var unlimited: String { NSLocalizedString("settings.unlimited", comment: "") }
        static var studentBenefits: String { NSLocalizedString("settings.studentBenefits", comment: "") }
        static var studentBenefitsDesc: String { NSLocalizedString("settings.studentBenefitsDesc", comment: "") }
        static var verificationInfo: String { NSLocalizedString("settings.verificationInfo", comment: "") }
        static var schoolName: String { NSLocalizedString("settings.schoolName", comment: "") }
        static var studentId: String { NSLocalizedString("settings.studentId", comment: "") }
        static var submitVerification: String { NSLocalizedString("settings.submitVerification", comment: "") }

        // Device Management
        static var devices: String { NSLocalizedString("settings.devices", comment: "") }
        static var loggedInDevices: String { NSLocalizedString("settings.loggedInDevices", comment: "") }
        static var currentDevice: String { NSLocalizedString("settings.currentDevice", comment: "") }
        static var syncReadingProgress: String { NSLocalizedString("settings.syncReadingProgress", comment: "") }
        static var deviceSecurityNote: String { NSLocalizedString("settings.deviceSecurityNote", comment: "") }
        static var allDevices: String { NSLocalizedString("settings.allDevices", comment: "") }
        static var logoutAllOtherDevices: String { NSLocalizedString("settings.logoutAllOtherDevices", comment: "") }
    }

    // MARK: - Membership
    enum Membership {
        static var title: String { NSLocalizedString("membership.title", comment: "") }
        static var currentMember: String { NSLocalizedString("membership.currentMember", comment: "") }
        static var days: String { NSLocalizedString("membership.days", comment: "") }
        static var renewalReminder: String { NSLocalizedString("membership.renewalReminder", comment: "") }
        static var renewNow: String { NSLocalizedString("membership.renewNow", comment: "") }
        static var benefits: String { NSLocalizedString("membership.benefits", comment: "") }
        static var choosePlan: String { NSLocalizedString("membership.choosePlan", comment: "") }
        static var recommended: String { NSLocalizedString("membership.recommended", comment: "") }
        static var claimNow: String { NSLocalizedString("membership.claimNow", comment: "") }
        static var useRedeemCode: String { NSLocalizedString("membership.useRedeemCode", comment: "") }
        static var memberFAQ: String { NSLocalizedString("membership.memberFAQ", comment: "") }
        static var selectPlan: String { NSLocalizedString("membership.selectPlan", comment: "") }
        static var newUserPromo: String { NSLocalizedString("membership.newUserPromo", comment: "") }

        // Redeem sheet
        static var redeemCode: String { NSLocalizedString("membership.redeemCode", comment: "") }
        static var enterRedeemCode: String { NSLocalizedString("membership.enterRedeemCode", comment: "") }
        static var redeemPlaceholder: String { NSLocalizedString("membership.redeemPlaceholder", comment: "") }
        static var redeemNow: String { NSLocalizedString("membership.redeemNow", comment: "") }
        static var redeemHelp: String { NSLocalizedString("membership.redeemHelp", comment: "") }
        static var redeemInvalid: String { NSLocalizedString("membership.redeemInvalid", comment: "") }
        static var done: String { NSLocalizedString("membership.done", comment: "") }

        // Plans
        static var monthlyAuto: String { NSLocalizedString("membership.monthlyAuto", comment: "") }
        static var monthlyAutoDesc: String { NSLocalizedString("membership.monthlyAutoDesc", comment: "") }
        static var monthly: String { NSLocalizedString("membership.monthly", comment: "") }
        static var monthlyDesc: String { NSLocalizedString("membership.monthlyDesc", comment: "") }
        static var quarterly: String { NSLocalizedString("membership.quarterly", comment: "") }
        static var quarterlyDesc: String { NSLocalizedString("membership.quarterlyDesc", comment: "") }
        static var yearly: String { NSLocalizedString("membership.yearly", comment: "") }
        static var yearlyDesc: String { NSLocalizedString("membership.yearlyDesc", comment: "") }

        // Benefits
        static var benefitUnlimitedReading: String { NSLocalizedString("membership.benefitUnlimitedReading", comment: "") }
        static var benefitUnlimitedReadingDesc: String { NSLocalizedString("membership.benefitUnlimitedReadingDesc", comment: "") }
        static var benefitAIAudiobook: String { NSLocalizedString("membership.benefitAIAudiobook", comment: "") }
        static var benefitAIAudiobookDesc: String { NSLocalizedString("membership.benefitAIAudiobookDesc", comment: "") }
        static var benefitAIQuestion: String { NSLocalizedString("membership.benefitAIQuestion", comment: "") }
        static var benefitAIQuestionDesc: String { NSLocalizedString("membership.benefitAIQuestionDesc", comment: "") }
        static var benefitOfflineDownload: String { NSLocalizedString("membership.benefitOfflineDownload", comment: "") }
        static var benefitOfflineDownloadDesc: String { NSLocalizedString("membership.benefitOfflineDownloadDesc", comment: "") }
        static var benefitExclusiveEvents: String { NSLocalizedString("membership.benefitExclusiveEvents", comment: "") }
        static var benefitExclusiveEventsDesc: String { NSLocalizedString("membership.benefitExclusiveEventsDesc", comment: "") }
        static var benefitBadge: String { NSLocalizedString("membership.benefitBadge", comment: "") }
        static var benefitBadgeDesc: String { NSLocalizedString("membership.benefitBadgeDesc", comment: "") }

        static func validUntil(_ date: String) -> String {
            String(format: NSLocalizedString("membership.validUntil", comment: ""), date)
        }

        static func subscribeNow(_ price: Int) -> String {
            String(format: NSLocalizedString("membership.subscribeNow", comment: ""), price)
        }
    }

    // MARK: - Store
    enum Store {
        static var title: String { NSLocalizedString("store.title", comment: "") }
        static var searchPlaceholder: String { NSLocalizedString("store.searchPlaceholder", comment: "") }
        static var recommendedForYou: String { NSLocalizedString("store.recommendedForYou", comment: "") }
        static var newArrivals: String { NSLocalizedString("store.newArrivals", comment: "") }
        static var latestEbooks: String { NSLocalizedString("store.latestEbooks", comment: "") }
        static var hotMagazines: String { NSLocalizedString("store.hotMagazines", comment: "") }
        static var everyoneReading: String { NSLocalizedString("store.everyoneReading", comment: "") }
        static var browseCategories: String { NSLocalizedString("store.browseCategories", comment: "") }
        static var allCategories: String { NSLocalizedString("store.allCategories", comment: "") }
        static var more: String { NSLocalizedString("store.more", comment: "") }
        static var rankings: String { NSLocalizedString("store.rankings", comment: "") }
        static var viewAll: String { NSLocalizedString("store.viewAll", comment: "") }

        static func bookCount(_ count: Int) -> String {
            String(format: NSLocalizedString("store.bookCount", comment: ""), count)
        }
    }

    // MARK: - AI Question
    enum AI {
        static var title: String { NSLocalizedString("ai.title", comment: "") }
        static var clearChat: String { NSLocalizedString("ai.clearChat", comment: "") }
        static var exportChat: String { NSLocalizedString("ai.exportChat", comment: "") }
        static var selectedText: String { NSLocalizedString("ai.selectedText", comment: "") }
        static var readingAssistant: String { NSLocalizedString("ai.readingAssistant", comment: "") }
        static var tryAsking: String { NSLocalizedString("ai.tryAsking", comment: "") }
        static var inputPlaceholder: String { NSLocalizedString("ai.inputPlaceholder", comment: "") }
        static var errorMessage: String { NSLocalizedString("ai.errorMessage", comment: "") }

        // Suggested questions
        static var suggestedMain: String { NSLocalizedString("ai.suggestedMain", comment: "") }
        static var suggestedExplain: String { NSLocalizedString("ai.suggestedExplain", comment: "") }
        static var suggestedWhy: String { NSLocalizedString("ai.suggestedWhy", comment: "") }

        // Word lookup
        static var lookingUp: String { NSLocalizedString("ai.lookingUp", comment: "") }
        static var noDefinition: String { NSLocalizedString("ai.noDefinition", comment: "") }
        static var copy: String { NSLocalizedString("ai.copy", comment: "") }
        static var addToVocabulary: String { NSLocalizedString("ai.addToVocabulary", comment: "") }
        static var definitionPrefix: String { NSLocalizedString("ai.definitionPrefix", comment: "") }

        static func welcomeDescription(_ bookTitle: String) -> String {
            String(format: NSLocalizedString("ai.welcomeDescription", comment: ""), bookTitle)
        }

        static func sampleDefinition(_ word: String) -> String {
            String(format: NSLocalizedString("ai.sampleDefinition", comment: ""), word)
        }
    }

    // MARK: - Reader Settings
    enum Reader {
        static var settings: String { NSLocalizedString("reader.settings", comment: "") }
        static var done: String { NSLocalizedString("reader.done", comment: "") }
        static var reset: String { NSLocalizedString("reader.reset", comment: "") }
        static var brightness: String { NSLocalizedString("reader.brightness", comment: "") }
        static var backgroundColor: String { NSLocalizedString("reader.backgroundColor", comment: "") }
        static var textSample: String { NSLocalizedString("reader.textSample", comment: "") }
        static var fontSize: String { NSLocalizedString("reader.fontSize", comment: "") }
        static var previewText: String { NSLocalizedString("reader.previewText", comment: "") }
        static var fontFamily: String { NSLocalizedString("reader.fontFamily", comment: "") }
        static var lineSpacing: String { NSLocalizedString("reader.lineSpacing", comment: "") }
        static var margin: String { NSLocalizedString("reader.margin", comment: "") }
        static var pageFlip: String { NSLocalizedString("reader.pageFlip", comment: "") }
        static var other: String { NSLocalizedString("reader.other", comment: "") }
        static var keepScreenOn: String { NSLocalizedString("reader.keepScreenOn", comment: "") }
        static var syncBrightness: String { NSLocalizedString("reader.syncBrightness", comment: "") }
        static var currentBrightness: String { NSLocalizedString("reader.currentBrightness", comment: "") }

        // Color modes
        static var colorWhite: String { NSLocalizedString("reader.colorWhite", comment: "") }
        static var colorSepia: String { NSLocalizedString("reader.colorSepia", comment: "") }
        static var colorGreen: String { NSLocalizedString("reader.colorGreen", comment: "") }
        static var colorDark: String { NSLocalizedString("reader.colorDark", comment: "") }

        // Font families
        static var fontSystem: String { NSLocalizedString("reader.fontSystem", comment: "") }
        static var fontSongti: String { NSLocalizedString("reader.fontSongti", comment: "") }
        static var fontKaiti: String { NSLocalizedString("reader.fontKaiti", comment: "") }
        static var fontHeiti: String { NSLocalizedString("reader.fontHeiti", comment: "") }

        // Line spacing
        static var spacingCompact: String { NSLocalizedString("reader.spacingCompact", comment: "") }
        static var spacingNormal: String { NSLocalizedString("reader.spacingNormal", comment: "") }
        static var spacingRelaxed: String { NSLocalizedString("reader.spacingRelaxed", comment: "") }
        static var spacingLoose: String { NSLocalizedString("reader.spacingLoose", comment: "") }

        // Margin sizes
        static var marginSmall: String { NSLocalizedString("reader.marginSmall", comment: "") }
        static var marginMedium: String { NSLocalizedString("reader.marginMedium", comment: "") }
        static var marginLarge: String { NSLocalizedString("reader.marginLarge", comment: "") }

        // Page flip styles
        static var flipHorizontal: String { NSLocalizedString("reader.flipHorizontal", comment: "") }
        static var flipVertical: String { NSLocalizedString("reader.flipVertical", comment: "") }
        static var flipCurl: String { NSLocalizedString("reader.flipCurl", comment: "") }
        static var flipFade: String { NSLocalizedString("reader.flipFade", comment: "") }

        // Highlight colors
        static var highlightYellow: String { NSLocalizedString("reader.highlightYellow", comment: "") }
        static var highlightGreen: String { NSLocalizedString("reader.highlightGreen", comment: "") }
        static var highlightBlue: String { NSLocalizedString("reader.highlightBlue", comment: "") }
        static var highlightPink: String { NSLocalizedString("reader.highlightPink", comment: "") }
        static var highlightPurple: String { NSLocalizedString("reader.highlightPurple", comment: "") }
        static var highlightOrange: String { NSLocalizedString("reader.highlightOrange", comment: "") }

        static func pageDisplay(_ current: Int, _ total: Int) -> String {
            String(format: NSLocalizedString("reader.pageDisplay", comment: ""), current, total)
        }
    }

    // MARK: - Social / Publishing
    enum Social {
        static var publishThought: String { NSLocalizedString("social.publishThought", comment: "") }
        static var cancel: String { NSLocalizedString("social.cancel", comment: "") }
        static var publish: String { NSLocalizedString("social.publish", comment: "") }
        static var whoCanSee: String { NSLocalizedString("social.whoCanSee", comment: "") }
        static var me: String { NSLocalizedString("social.me", comment: "") }
        static var sharePlaceholder: String { NSLocalizedString("social.sharePlaceholder", comment: "") }
        static var mentionedPeople: String { NSLocalizedString("social.mentionedPeople", comment: "") }
        static var image: String { NSLocalizedString("social.image", comment: "") }
        static var book: String { NSLocalizedString("social.book", comment: "") }
        static var mention: String { NSLocalizedString("social.mention", comment: "") }
        static var searchBooks: String { NSLocalizedString("social.searchBooks", comment: "") }
        static var recentlyRead: String { NSLocalizedString("social.recentlyRead", comment: "") }
        static var selectBook: String { NSLocalizedString("social.selectBook", comment: "") }
        static var searchUsers: String { NSLocalizedString("social.searchUsers", comment: "") }
        static var recommendedUsers: String { NSLocalizedString("social.recommendedUsers", comment: "") }
        static var selectUser: String { NSLocalizedString("social.selectUser", comment: "") }
        static var done: String { NSLocalizedString("social.done", comment: "") }
        static var addThought: String { NSLocalizedString("social.addThought", comment: "") }
        static var shareQuote: String { NSLocalizedString("social.shareQuote", comment: "") }
        static var share: String { NSLocalizedString("social.share", comment: "") }

        // Visibility options
        static var visibilityPublic: String { NSLocalizedString("social.visibilityPublic", comment: "") }
        static var visibilityFriends: String { NSLocalizedString("social.visibilityFriends", comment: "") }
        static var visibilityPrivate: String { NSLocalizedString("social.visibilityPrivate", comment: "") }

        // Quote styles
        static var styleClassic: String { NSLocalizedString("social.styleClassic", comment: "") }
        static var styleModern: String { NSLocalizedString("social.styleModern", comment: "") }
        static var styleElegant: String { NSLocalizedString("social.styleElegant", comment: "") }
        static var styleMinimal: String { NSLocalizedString("social.styleMinimal", comment: "") }

        static func selectedCount(_ count: Int) -> String {
            String(format: NSLocalizedString("social.selectedCount", comment: ""), count)
        }

        static func imageCount(_ current: Int, _ max: Int) -> String {
            String(format: NSLocalizedString("social.imageCount", comment: ""), current, max)
        }
    }

    // MARK: - Onboarding
    enum Onboarding {
        static var skip: String { NSLocalizedString("onboarding.skip", comment: "") }
        static var `continue`: String { NSLocalizedString("onboarding.continue", comment: "") }
        static var next: String { NSLocalizedString("onboarding.next", comment: "") }
        static var skipForNow: String { NSLocalizedString("onboarding.skipForNow", comment: "") }
        static var startReading: String { NSLocalizedString("onboarding.startReading", comment: "") }

        // Page 1 - Welcome
        static var welcomeTitle: String { NSLocalizedString("onboarding.welcomeTitle", comment: "") }
        static var welcomeSubtitle: String { NSLocalizedString("onboarding.welcomeSubtitle", comment: "") }
        static var welcomeDescription: String { NSLocalizedString("onboarding.welcomeDescription", comment: "") }

        // Page 2 - Reading tracking
        static var trackingTitle: String { NSLocalizedString("onboarding.trackingTitle", comment: "") }
        static var trackingSubtitle: String { NSLocalizedString("onboarding.trackingSubtitle", comment: "") }
        static var trackingDescription: String { NSLocalizedString("onboarding.trackingDescription", comment: "") }

        // Page 3 - Social sharing
        static var sharingTitle: String { NSLocalizedString("onboarding.sharingTitle", comment: "") }
        static var sharingSubtitle: String { NSLocalizedString("onboarding.sharingSubtitle", comment: "") }
        static var sharingDescription: String { NSLocalizedString("onboarding.sharingDescription", comment: "") }

        // Genre selection
        static var genreTitle: String { NSLocalizedString("onboarding.genreTitle", comment: "") }
        static var genreSubtitle: String { NSLocalizedString("onboarding.genreSubtitle", comment: "") }

        // Reading goal
        static var goalTitle: String { NSLocalizedString("onboarding.goalTitle", comment: "") }
        static var goalSubtitle: String { NSLocalizedString("onboarding.goalSubtitle", comment: "") }
        static var minutesPerDay: String { NSLocalizedString("onboarding.minutesPerDay", comment: "") }
        static var whenDoYouRead: String { NSLocalizedString("onboarding.whenDoYouRead", comment: "") }

        // Reading time preferences
        static var timeMorning: String { NSLocalizedString("onboarding.timeMorning", comment: "") }
        static var timeAfternoon: String { NSLocalizedString("onboarding.timeAfternoon", comment: "") }
        static var timeEvening: String { NSLocalizedString("onboarding.timeEvening", comment: "") }
        static var timeNight: String { NSLocalizedString("onboarding.timeNight", comment: "") }

        // Final page
        static var allSetTitle: String { NSLocalizedString("onboarding.allSetTitle", comment: "") }
        static var allSetSubtitle: String { NSLocalizedString("onboarding.allSetSubtitle", comment: "") }

        // Genres
        static var genreNovel: String { NSLocalizedString("onboarding.genreNovel", comment: "") }
        static var genreHistory: String { NSLocalizedString("onboarding.genreHistory", comment: "") }
        static var genreBiography: String { NSLocalizedString("onboarding.genreBiography", comment: "") }
        static var genreSciFi: String { NSLocalizedString("onboarding.genreSciFi", comment: "") }
        static var genreMystery: String { NSLocalizedString("onboarding.genreMystery", comment: "") }
        static var genreRomance: String { NSLocalizedString("onboarding.genreRomance", comment: "") }
        static var genrePopScience: String { NSLocalizedString("onboarding.genrePopScience", comment: "") }
        static var genrePsychology: String { NSLocalizedString("onboarding.genrePsychology", comment: "") }
        static var genrePhilosophy: String { NSLocalizedString("onboarding.genrePhilosophy", comment: "") }
        static var genreBusiness: String { NSLocalizedString("onboarding.genreBusiness", comment: "") }
        static var genreTechnology: String { NSLocalizedString("onboarding.genreTechnology", comment: "") }
        static var genreArt: String { NSLocalizedString("onboarding.genreArt", comment: "") }
        static var genreTravel: String { NSLocalizedString("onboarding.genreTravel", comment: "") }
        static var genreFood: String { NSLocalizedString("onboarding.genreFood", comment: "") }
        static var genreHealth: String { NSLocalizedString("onboarding.genreHealth", comment: "") }

        static func selectedGenres(_ count: Int) -> String {
            String(format: NSLocalizedString("onboarding.selectedGenres", comment: ""), count)
        }

        static func likeGenres(_ count: Int) -> String {
            String(format: NSLocalizedString("onboarding.likeGenres", comment: ""), count)
        }

        static func dailyReading(_ minutes: Int) -> String {
            String(format: NSLocalizedString("onboarding.dailyReading", comment: ""), minutes)
        }

        static func readingAt(_ time: String) -> String {
            String(format: NSLocalizedString("onboarding.readingAt", comment: ""), time)
        }
    }

    // MARK: - Book Lists
    enum BookList {
        // Main titles
        static var title: String { NSLocalizedString("booklist.title", comment: "") }
        static var detail: String { NSLocalizedString("booklist.detail", comment: "") }
        static var popularLists: String { NSLocalizedString("booklist.popularLists", comment: "") }
        static var curatedCollections: String { NSLocalizedString("booklist.curatedCollections", comment: "") }

        // Actions
        static var create: String { NSLocalizedString("booklist.create", comment: "") }
        static var createTitle: String { NSLocalizedString("booklist.createTitle", comment: "") }
        static var createFirst: String { NSLocalizedString("booklist.createFirst", comment: "") }
        static var createAndAdd: String { NSLocalizedString("booklist.createAndAdd", comment: "") }
        static var edit: String { NSLocalizedString("booklist.edit", comment: "") }
        static var editTitle: String { NSLocalizedString("booklist.editTitle", comment: "") }
        static var delete: String { NSLocalizedString("booklist.delete", comment: "") }
        static var follow: String { NSLocalizedString("booklist.follow", comment: "") }
        static var following: String { NSLocalizedString("booklist.following", comment: "") }
        static var add: String { NSLocalizedString("booklist.add", comment: "") }
        static var addToList: String { NSLocalizedString("booklist.addToList", comment: "") }

        // Form labels
        static var titlePlaceholder: String { NSLocalizedString("booklist.titlePlaceholder", comment: "") }
        static var descriptionPlaceholder: String { NSLocalizedString("booklist.descriptionPlaceholder", comment: "") }
        static var basicInfo: String { NSLocalizedString("booklist.basicInfo", comment: "") }
        static var category: String { NSLocalizedString("booklist.category", comment: "") }
        static var categorySection: String { NSLocalizedString("booklist.categorySection", comment: "") }
        static var tagsSection: String { NSLocalizedString("booklist.tagsSection", comment: "") }
        static var addTag: String { NSLocalizedString("booklist.addTag", comment: "") }
        static var tagsHint: String { NSLocalizedString("booklist.tagsHint", comment: "") }
        static var privacy: String { NSLocalizedString("booklist.privacy", comment: "") }
        static var `public`: String { NSLocalizedString("booklist.public", comment: "") }
        static var `private`: String { NSLocalizedString("booklist.private", comment: "") }
        static var publicHint: String { NSLocalizedString("booklist.publicHint", comment: "") }
        static var newListTitle: String { NSLocalizedString("booklist.newListTitle", comment: "") }
        static var quickCreateHint: String { NSLocalizedString("booklist.quickCreateHint", comment: "") }

        // Notes
        static var addNote: String { NSLocalizedString("booklist.addNote", comment: "") }
        static var notePlaceholder: String { NSLocalizedString("booklist.notePlaceholder", comment: "") }
        static var notePrompt: String { NSLocalizedString("booklist.notePrompt", comment: "") }

        // Stats
        static var books: String { NSLocalizedString("booklist.books", comment: "") }
        static var followers: String { NSLocalizedString("booklist.followers", comment: "") }

        // Empty states
        static var emptyTitle: String { NSLocalizedString("booklist.emptyTitle", comment: "") }
        static var emptyMessage: String { NSLocalizedString("booklist.emptyMessage", comment: "") }
        static var noLists: String { NSLocalizedString("booklist.noLists", comment: "") }
        static var noListsHint: String { NSLocalizedString("booklist.noListsHint", comment: "") }
        static var noResults: String { NSLocalizedString("booklist.noResults", comment: "") }
        static var loadError: String { NSLocalizedString("booklist.loadError", comment: "") }

        // Search
        static var search: String { NSLocalizedString("booklist.search", comment: "") }
        static var searchPlaceholder: String { NSLocalizedString("booklist.searchPlaceholder", comment: "") }

        // Delete confirmation
        static var deleteConfirmTitle: String { NSLocalizedString("booklist.deleteConfirmTitle", comment: "") }
        static var deleteConfirmMessage: String { NSLocalizedString("booklist.deleteConfirmMessage", comment: "") }
        static var deleteConfirm: String { NSLocalizedString("booklist.deleteConfirm", comment: "") }

        // Add to list
        static var addingBook: String { NSLocalizedString("booklist.addingBook", comment: "") }

        // Categories
        static var categoryAll: String { NSLocalizedString("booklist.category.all", comment: "") }
        static var categoryLiterature: String { NSLocalizedString("booklist.category.literature", comment: "") }
        static var categoryHistory: String { NSLocalizedString("booklist.category.history", comment: "") }
        static var categoryScience: String { NSLocalizedString("booklist.category.science", comment: "") }
        static var categoryPhilosophy: String { NSLocalizedString("booklist.category.philosophy", comment: "") }
        static var categoryArt: String { NSLocalizedString("booklist.category.art", comment: "") }
        static var categoryBusiness: String { NSLocalizedString("booklist.category.business", comment: "") }
        static var categoryTechnology: String { NSLocalizedString("booklist.category.technology", comment: "") }
        static var categoryLifestyle: String { NSLocalizedString("booklist.category.lifestyle", comment: "") }
        static var categoryOther: String { NSLocalizedString("booklist.category.other", comment: "") }

        // Sort options
        static var sortPopular: String { NSLocalizedString("booklist.sort.popular", comment: "") }
        static var sortRecent: String { NSLocalizedString("booklist.sort.recent", comment: "") }
        static var sortMostBooks: String { NSLocalizedString("booklist.sort.mostBooks", comment: "") }
        static var sortMostFollowers: String { NSLocalizedString("booklist.sort.mostFollowers", comment: "") }

        // Functions with parameters
        static func createdAt(_ date: String) -> String {
            String(format: NSLocalizedString("booklist.createdAt", comment: ""), date)
        }
    }

    // MARK: - Reader Actions
    enum ReaderActions {
        static var title: String { NSLocalizedString("readerActions.title", comment: "") }
        static var quickRating: String { NSLocalizedString("readerActions.quickRating", comment: "") }
        static var writeReview: String { NSLocalizedString("readerActions.writeReview", comment: "") }
        static var quickActions: String { NSLocalizedString("readerActions.quickActions", comment: "") }
        static var readingMode: String { NSLocalizedString("readerActions.readingMode", comment: "") }
        static var more: String { NSLocalizedString("readerActions.more", comment: "") }

        // Action items
        static var reviewBook: String { NSLocalizedString("readerActions.reviewBook", comment: "") }
        static var downloadOffline: String { NSLocalizedString("readerActions.downloadOffline", comment: "") }
        static var downloaded: String { NSLocalizedString("readerActions.downloaded", comment: "") }
        static var autoPageTurn: String { NSLocalizedString("readerActions.autoPageTurn", comment: "") }
        static var autoPageTurnDesc: String { NSLocalizedString("readerActions.autoPageTurnDesc", comment: "") }
        static var addBookmark: String { NSLocalizedString("readerActions.addBookmark", comment: "") }
        static var addToList: String { NSLocalizedString("readerActions.addToList", comment: "") }
        static var searchBook: String { NSLocalizedString("readerActions.searchBook", comment: "") }
        static var viewNotes: String { NSLocalizedString("readerActions.viewNotes", comment: "") }
        static var popularHighlights: String { NSLocalizedString("readerActions.popularHighlights", comment: "") }
        static var giftToFriend: String { NSLocalizedString("readerActions.giftToFriend", comment: "") }
        static var reportError: String { NSLocalizedString("readerActions.reportError", comment: "") }
        static var reportErrorDesc: String { NSLocalizedString("readerActions.reportErrorDesc", comment: "") }
        static var privateReading: String { NSLocalizedString("readerActions.privateReading", comment: "") }
        static var privateReadingDesc: String { NSLocalizedString("readerActions.privateReadingDesc", comment: "") }
        static var communityThoughts: String { NSLocalizedString("readerActions.communityThoughts", comment: "") }
        static var communityThoughtsDesc: String { NSLocalizedString("readerActions.communityThoughtsDesc", comment: "") }
        static var friendNotes: String { NSLocalizedString("readerActions.friendNotes", comment: "") }
        static var friendNotesDesc: String { NSLocalizedString("readerActions.friendNotesDesc", comment: "") }
        static var displaySettings: String { NSLocalizedString("readerActions.displaySettings", comment: "") }
        static var bookInfo: String { NSLocalizedString("readerActions.bookInfo", comment: "") }
        static var bookInfoDesc: String { NSLocalizedString("readerActions.bookInfoDesc", comment: "") }
    }

    // MARK: - Reader Display
    enum ReaderDisplay {
        static var title: String { NSLocalizedString("readerDisplay.title", comment: "") }
        static var displayOptions: String { NSLocalizedString("readerDisplay.displayOptions", comment: "") }

        // Sections
        static var socialFeatures: String { NSLocalizedString("readerDisplay.socialFeatures", comment: "") }
        static var socialFeaturesDesc: String { NSLocalizedString("readerDisplay.socialFeaturesDesc", comment: "") }
        static var interactiveElements: String { NSLocalizedString("readerDisplay.interactiveElements", comment: "") }
        static var uiElements: String { NSLocalizedString("readerDisplay.uiElements", comment: "") }
        static var focusMode: String { NSLocalizedString("readerDisplay.focusMode", comment: "") }
        static var focusModeDesc: String { NSLocalizedString("readerDisplay.focusModeDesc", comment: "") }

        // Toggle items
        static var othersHighlights: String { NSLocalizedString("readerDisplay.othersHighlights", comment: "") }
        static var othersHighlightsDesc: String { NSLocalizedString("readerDisplay.othersHighlightsDesc", comment: "") }
        static var friendThoughts: String { NSLocalizedString("readerDisplay.friendThoughts", comment: "") }
        static var friendThoughtsDesc: String { NSLocalizedString("readerDisplay.friendThoughtsDesc", comment: "") }
        static var popularHighlights: String { NSLocalizedString("readerDisplay.popularHighlights", comment: "") }
        static var popularHighlightsDesc: String { NSLocalizedString("readerDisplay.popularHighlightsDesc", comment: "") }
        static var communityThoughts: String { NSLocalizedString("readerDisplay.communityThoughts", comment: "") }
        static var communityThoughtsDesc: String { NSLocalizedString("readerDisplay.communityThoughtsDesc", comment: "") }
        static var friendNotes: String { NSLocalizedString("readerDisplay.friendNotes", comment: "") }
        static var friendNotesDesc: String { NSLocalizedString("readerDisplay.friendNotesDesc", comment: "") }
        static var queryableWords: String { NSLocalizedString("readerDisplay.queryableWords", comment: "") }
        static var queryableWordsDesc: String { NSLocalizedString("readerDisplay.queryableWordsDesc", comment: "") }
        static var statusBar: String { NSLocalizedString("readerDisplay.statusBar", comment: "") }
        static var statusBarDesc: String { NSLocalizedString("readerDisplay.statusBarDesc", comment: "") }

        // Focus mode buttons
        static var enableFocusMode: String { NSLocalizedString("readerDisplay.enableFocusMode", comment: "") }
        static var enableFocusModeDesc: String { NSLocalizedString("readerDisplay.enableFocusModeDesc", comment: "") }
        static var disableFocusMode: String { NSLocalizedString("readerDisplay.disableFocusMode", comment: "") }
        static var disableFocusModeDesc: String { NSLocalizedString("readerDisplay.disableFocusModeDesc", comment: "") }

        // Compact labels
        static var highlights: String { NSLocalizedString("readerDisplay.highlights", comment: "") }
        static var thoughts: String { NSLocalizedString("readerDisplay.thoughts", comment: "") }
        static var dictionary: String { NSLocalizedString("readerDisplay.dictionary", comment: "") }
    }

    // MARK: - Reader Navigation
    enum ReaderNav {
        static var contents: String { NSLocalizedString("readerNav.contents", comment: "") }
        static var search: String { NSLocalizedString("readerNav.search", comment: "") }
        static var bookmarks: String { NSLocalizedString("readerNav.bookmarks", comment: "") }
        static var aiOutline: String { NSLocalizedString("readerNav.aiOutline", comment: "") }

        // Contents tab
        static var noContents: String { NSLocalizedString("readerNav.noContents", comment: "") }
        static var noContentsDesc: String { NSLocalizedString("readerNav.noContentsDesc", comment: "") }

        // Search tab
        static var searchPlaceholder: String { NSLocalizedString("readerNav.searchPlaceholder", comment: "") }
        static var searchHint: String { NSLocalizedString("readerNav.searchHint", comment: "") }
        static var searchHintDesc: String { NSLocalizedString("readerNav.searchHintDesc", comment: "") }
        static var searching: String { NSLocalizedString("readerNav.searching", comment: "") }

        // Bookmarks tab
        static var noBookmarks: String { NSLocalizedString("readerNav.noBookmarks", comment: "") }
        static var noBookmarksDesc: String { NSLocalizedString("readerNav.noBookmarksDesc", comment: "") }

        // AI Outline tab
        static var aiOutlineTitle: String { NSLocalizedString("readerNav.aiOutlineTitle", comment: "") }
        static var aiOutlineDesc: String { NSLocalizedString("readerNav.aiOutlineDesc", comment: "") }
        static var generateOutline: String { NSLocalizedString("readerNav.generateOutline", comment: "") }
        static var generatingOutline: String { NSLocalizedString("readerNav.generatingOutline", comment: "") }
        static var keyPoints: String { NSLocalizedString("readerNav.keyPoints", comment: "") }
        static var goToSection: String { NSLocalizedString("readerNav.goToSection", comment: "") }
    }

    // MARK: - Friend Thoughts
    enum FriendThoughts {
        static var title: String { NSLocalizedString("friendThoughts.title", comment: "") }
        static var noThoughts: String { NSLocalizedString("friendThoughts.noThoughts", comment: "") }
        static var noThoughtsDesc: String { NSLocalizedString("friendThoughts.noThoughtsDesc", comment: "") }
        static var goToLocation: String { NSLocalizedString("friendThoughts.goToLocation", comment: "") }
        static var viewProfile: String { NSLocalizedString("friendThoughts.viewProfile", comment: "") }
        static var hide: String { NSLocalizedString("friendThoughts.hide", comment: "") }

        static func thoughtsAtLocation(_ count: Int) -> String {
            String(format: NSLocalizedString("friendThoughts.thoughtsAtLocation", comment: ""), count)
        }
    }

    // MARK: - Profile Assets
    enum ProfileAssets {
        static var balance: String { NSLocalizedString("profileAssets.balance", comment: "") }
        static var yuan: String { NSLocalizedString("profileAssets.yuan", comment: "") }
        static var membership: String { NSLocalizedString("profileAssets.membership", comment: "") }
        static var notMember: String { NSLocalizedString("profileAssets.notMember", comment: "") }
        static var credits: String { NSLocalizedString("profileAssets.credits", comment: "") }
        static var creditsUnit: String { NSLocalizedString("profileAssets.creditsUnit", comment: "") }
        static var coupons: String { NSLocalizedString("profileAssets.coupons", comment: "") }
        static var sheets: String { NSLocalizedString("profileAssets.sheets", comment: "") }
        static var giftCards: String { NSLocalizedString("profileAssets.giftCards", comment: "") }
        static var upgrade: String { NSLocalizedString("profileAssets.upgrade", comment: "") }
        static var upgradeBenefits: String { NSLocalizedString("profileAssets.upgradeBenefits", comment: "") }

        static func memberDays(_ days: Int) -> String {
            String(format: NSLocalizedString("profileAssets.memberDays", comment: ""), days)
        }
    }

    // MARK: - Profile Records
    enum ProfileRecords {
        static var currentlyReading: String { NSLocalizedString("profileRecords.currentlyReading", comment: "") }
        static var booksCompleted: String { NSLocalizedString("profileRecords.booksCompleted", comment: "") }
        static var notes: String { NSLocalizedString("profileRecords.notes", comment: "") }
        static var subscriptions: String { NSLocalizedString("profileRecords.subscriptions", comment: "") }
        static var reading: String { NSLocalizedString("profileRecords.reading", comment: "") }
        static var completed: String { NSLocalizedString("profileRecords.completed", comment: "") }
        static var highlights: String { NSLocalizedString("profileRecords.highlights", comment: "") }
        static var lists: String { NSLocalizedString("profileRecords.lists", comment: "") }
        static var totalHours: String { NSLocalizedString("profileRecords.totalHours", comment: "") }
        static var thisYear: String { NSLocalizedString("profileRecords.thisYear", comment: "") }
        static var streak: String { NSLocalizedString("profileRecords.streak", comment: "") }
        static var hoursUnit: String { NSLocalizedString("profileRecords.hoursUnit", comment: "") }
        static var booksUnit: String { NSLocalizedString("profileRecords.booksUnit", comment: "") }
        static var daysUnit: String { NSLocalizedString("profileRecords.daysUnit", comment: "") }
        static var streakTitle: String { NSLocalizedString("profileRecords.streakTitle", comment: "") }

        static func longestStreak(_ days: Int) -> String {
            String(format: NSLocalizedString("profileRecords.longestStreak", comment: ""), days)
        }
    }

    // MARK: - Profile Timeline
    enum ProfileTimeline {
        static var title: String { NSLocalizedString("profileTimeline.title", comment: "") }
        static var milestones: String { NSLocalizedString("profileTimeline.milestones", comment: "") }
        static var noMilestones: String { NSLocalizedString("profileTimeline.noMilestones", comment: "") }
        static var recentAchievements: String { NSLocalizedString("profileTimeline.recentAchievements", comment: "") }
        static var monthlySummary: String { NSLocalizedString("profileTimeline.monthlySummary", comment: "") }
        static var keepItUp: String { NSLocalizedString("profileTimeline.keepItUp", comment: "") }

        // Milestone types
        static var finishedBook: String { NSLocalizedString("profileTimeline.finishedBook", comment: "") }
        static var streakDays: String { NSLocalizedString("profileTimeline.streakDays", comment: "") }
        static var totalHours: String { NSLocalizedString("profileTimeline.totalHours", comment: "") }
        static var badge: String { NSLocalizedString("profileTimeline.badge", comment: "") }
        static var firstBook: String { NSLocalizedString("profileTimeline.firstBook", comment: "") }
        static var anniversary: String { NSLocalizedString("profileTimeline.anniversary", comment: "") }

        // Filter tabs
        static var filterAll: String { NSLocalizedString("profileTimeline.filterAll", comment: "") }
        static var filterBooks: String { NSLocalizedString("profileTimeline.filterBooks", comment: "") }
        static var filterStreaks: String { NSLocalizedString("profileTimeline.filterStreaks", comment: "") }
        static var filterHours: String { NSLocalizedString("profileTimeline.filterHours", comment: "") }
        static var filterBadges: String { NSLocalizedString("profileTimeline.filterBadges", comment: "") }

        // Monthly summary
        static var booksThisMonth: String { NSLocalizedString("profileTimeline.booksThisMonth", comment: "") }
        static var hoursThisMonth: String { NSLocalizedString("profileTimeline.hoursThisMonth", comment: "") }
        static var notesThisMonth: String { NSLocalizedString("profileTimeline.notesThisMonth", comment: "") }

        static func milestonesCount(_ count: Int) -> String {
            String(format: NSLocalizedString("profileTimeline.milestonesCount", comment: ""), count)
        }

        static func comparedToLastMonth(_ percent: Int) -> String {
            String(format: NSLocalizedString("profileTimeline.comparedToLastMonth", comment: ""), percent)
        }
    }

    // MARK: - Profile Privacy
    enum ProfilePrivacy {
        static var onlyMe: String { NSLocalizedString("profilePrivacy.onlyMe", comment: "") }
        static var mutualFollows: String { NSLocalizedString("profilePrivacy.mutualFollows", comment: "") }
        static var followers: String { NSLocalizedString("profilePrivacy.followers", comment: "") }
        static var everyone: String { NSLocalizedString("profilePrivacy.everyone", comment: "") }
    }

    // MARK: - Profile Share Card
    enum ProfileShare {
        static var title: String { NSLocalizedString("profileShare.title", comment: "") }
        static var saveToGallery: String { NSLocalizedString("profileShare.saveToGallery", comment: "") }
        static var share: String { NSLocalizedString("profileShare.share", comment: "") }

        // Templates
        static var templateClassic: String { NSLocalizedString("profileShare.templateClassic", comment: "") }
        static var templateCalendar: String { NSLocalizedString("profileShare.templateCalendar", comment: "") }
        static var templateMinimal: String { NSLocalizedString("profileShare.templateMinimal", comment: "") }
        static var templateGradient: String { NSLocalizedString("profileShare.templateGradient", comment: "") }

        // Card content
        static var readingJourney: String { NSLocalizedString("profileShare.readingJourney", comment: "") }
        static var booksRead: String { NSLocalizedString("profileShare.booksRead", comment: "") }
        static var hoursSpent: String { NSLocalizedString("profileShare.hoursSpent", comment: "") }
        static var dayStreak: String { NSLocalizedString("profileShare.dayStreak", comment: "") }
        static var notesTaken: String { NSLocalizedString("profileShare.notesTaken", comment: "") }
        static var books: String { NSLocalizedString("profileShare.books", comment: "") }
        static var hours: String { NSLocalizedString("profileShare.hours", comment: "") }
        static var streak: String { NSLocalizedString("profileShare.streak", comment: "") }
        static var days: String { NSLocalizedString("profileShare.days", comment: "") }
        static var notes: String { NSLocalizedString("profileShare.notes", comment: "") }
        static var reading: String { NSLocalizedString("profileShare.reading", comment: "") }
        static var booksIn2024: String { NSLocalizedString("profileShare.booksIn2024", comment: "") }
        static var monthlyReport: String { NSLocalizedString("profileShare.monthlyReport", comment: "") }
        static var readingQuote: String { NSLocalizedString("profileShare.readingQuote", comment: "") }

        static func favoriteGenre(_ genre: String) -> String {
            String(format: NSLocalizedString("profileShare.favoriteGenre", comment: ""), genre)
        }

        static func topGenre(_ genre: String) -> String {
            String(format: NSLocalizedString("profileShare.topGenre", comment: ""), genre)
        }
    }

    // MARK: - Profile Charts
    enum ProfileCharts {
        static var categoryDistribution: String { NSLocalizedString("profileCharts.categoryDistribution", comment: "") }
        static var monthlyProgress: String { NSLocalizedString("profileCharts.monthlyProgress", comment: "") }
        static var readingTrend: String { NSLocalizedString("profileCharts.readingTrend", comment: "") }
        static var booksCompleted: String { NSLocalizedString("profileCharts.booksCompleted", comment: "") }
        static var complete: String { NSLocalizedString("profileCharts.complete", comment: "") }
        static var percentage: String { NSLocalizedString("profileCharts.percentage", comment: "") }
        static var month: String { NSLocalizedString("profileCharts.month", comment: "") }
        static var hours: String { NSLocalizedString("profileCharts.hours", comment: "") }
        static var books: String { NSLocalizedString("profileCharts.books", comment: "") }
        static var date: String { NSLocalizedString("profileCharts.date", comment: "") }
        static var minutes: String { NSLocalizedString("profileCharts.minutes", comment: "") }
        static var goal: String { NSLocalizedString("profileCharts.goal", comment: "") }
        static var goalLabel: String { NSLocalizedString("profileCharts.goalLabel", comment: "") }

        static func booksCount(_ count: Int) -> String {
            String(format: NSLocalizedString("profileCharts.booksCount", comment: ""), count)
        }

        static func hoursRead(_ hours: Int) -> String {
            String(format: NSLocalizedString("profileCharts.hoursRead", comment: ""), hours)
        }
    }

    // MARK: - Store Sections
    enum StoreSection {
        // Free Books
        static var freeBooks: String { NSLocalizedString("storeSection.freeBooks", comment: "") }
        static var freeBooksSubtitle: String { NSLocalizedString("storeSection.freeBooksSubtitle", comment: "") }
        static var free: String { NSLocalizedString("storeSection.free", comment: "") }

        // Member Exclusive
        static var memberExclusive: String { NSLocalizedString("storeSection.memberExclusive", comment: "") }
        static var memberExclusiveSubtitle: String { NSLocalizedString("storeSection.memberExclusiveSubtitle", comment: "") }
        static var unlockAll: String { NSLocalizedString("storeSection.unlockAll", comment: "") }
        static var becomeMember: String { NSLocalizedString("storeSection.becomeMember", comment: "") }

        // Daily Lists
        static var dailyLists: String { NSLocalizedString("storeSection.dailyLists", comment: "") }
        static var dailyListsSubtitle: String { NSLocalizedString("storeSection.dailyListsSubtitle", comment: "") }

        // Recommendations
        static var basedOnPreferences: String { NSLocalizedString("storeSection.basedOnPreferences", comment: "") }
        static var refresh: String { NSLocalizedString("storeSection.refresh", comment: "") }

        // Quick Preview
        static var addToShelf: String { NSLocalizedString("storeSection.addToShelf", comment: "") }
        static var startReading: String { NSLocalizedString("storeSection.startReading", comment: "") }

        static func booksInList(_ count: Int) -> String {
            String(format: NSLocalizedString("storeSection.booksInList", comment: ""), count)
        }
    }

    // MARK: - Book Detail Enhancements
    enum BookDetail {
        // AI Guide
        static var aiGuide: String { NSLocalizedString("bookDetail.aiGuide", comment: "") }
        static var aiGuideSubtitle: String { NSLocalizedString("bookDetail.aiGuideSubtitle", comment: "") }

        // Popular Highlights
        static var popularHighlights: String { NSLocalizedString("bookDetail.popularHighlights", comment: "") }
        static var popularHighlightsSubtitle: String { NSLocalizedString("bookDetail.popularHighlightsSubtitle", comment: "") }

        // Publisher
        static var publisherInfo: String { NSLocalizedString("bookDetail.publisherInfo", comment: "") }
        static var moreFromPublisher: String { NSLocalizedString("bookDetail.moreFromPublisher", comment: "") }

        // Related Lists
        static var relatedLists: String { NSLocalizedString("bookDetail.relatedLists", comment: "") }
        static var relatedListsSubtitle: String { NSLocalizedString("bookDetail.relatedListsSubtitle", comment: "") }

        static func questionsCount(_ count: Int) -> String {
            String(format: NSLocalizedString("bookDetail.questionsCount", comment: ""), count)
        }

        static func highlightedBy(_ count: Int) -> String {
            String(format: NSLocalizedString("bookDetail.highlightedBy", comment: ""), count)
        }

        static func booksPublished(_ count: Int) -> String {
            String(format: NSLocalizedString("bookDetail.booksPublished", comment: ""), count)
        }
    }
}
