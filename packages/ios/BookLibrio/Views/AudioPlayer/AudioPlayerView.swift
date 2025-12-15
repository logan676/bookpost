import SwiftUI
import AVFoundation

/// Full-screen audio player view for AI-narrated books
/// Supports chapter navigation, playback speed, sleep timer, and voice selection
struct AudioPlayerView: View {
    let bookTitle: String
    let bookId: Int
    let bookType: BookType
    let coverUrl: String?

    @StateObject private var playerState = AudioPlayerState()
    @Environment(\.dismiss) var dismiss

    @State private var showVoiceSelection = false
    @State private var showSleepTimer = false
    @State private var showChapterList = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.2), Color(.systemBackground)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(spacing: 32) {
                    Spacer()

                    // Cover art
                    coverArtView

                    // Book info
                    bookInfoView

                    // Progress bar
                    progressView

                    // Playback controls
                    playbackControls

                    // Secondary controls
                    secondaryControls

                    Spacer()
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "chevron.down")
                            .font(.title3)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            showChapterList = true
                        } label: {
                            Label(L10n.AudioPlayer.chapterList, systemImage: "list.bullet")
                        }

                        Button {
                            // Show original text
                        } label: {
                            Label(L10n.AudioPlayer.showOriginal, systemImage: "text.alignleft")
                        }

                        Button {
                            // Share
                        } label: {
                            Label(L10n.AudioPlayer.share, systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.title3)
                    }
                }
            }
            .sheet(isPresented: $showVoiceSelection) {
                VoiceSelectionSheet(selectedVoice: $playerState.selectedVoice)
            }
            .sheet(isPresented: $showSleepTimer) {
                SleepTimerSheet(selectedTimer: $playerState.sleepTimer)
            }
            .sheet(isPresented: $showChapterList) {
                ChapterListSheet(
                    chapters: playerState.chapters,
                    currentChapter: playerState.currentChapter,
                    onSelect: { chapter in
                        playerState.goToChapter(chapter)
                        showChapterList = false
                    }
                )
            }
        }
    }

    // MARK: - Cover Art

    private var coverArtView: some View {
        BookCoverView(coverUrl: coverUrl, title: bookTitle)
            .frame(width: 240, height: 320)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
    }

    // MARK: - Book Info

    private var bookInfoView: some View {
        VStack(spacing: 8) {
            Text(bookTitle)
                .font(.title2)
                .fontWeight(.bold)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            Text(L10n.AudioPlayer.chapter(playerState.currentChapter))
                .font(.subheadline)
                .foregroundColor(.secondary)

            // AI Voice indicator
            HStack(spacing: 4) {
                Image(systemName: "waveform")
                    .font(.caption)
                Text("\(L10n.AudioPlayer.aiNarration) · \(playerState.selectedVoice.name)")
                    .font(.caption)
            }
            .foregroundColor(.blue)
        }
    }

    // MARK: - Progress View

    private var progressView: some View {
        VStack(spacing: 8) {
            // Progress slider
            Slider(value: $playerState.progress, in: 0...1) { editing in
                if !editing {
                    playerState.seek(to: playerState.progress)
                }
            }
            .accentColor(.blue)

            // Time labels
            HStack {
                Text(formatTime(playerState.currentTime))
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                Text(formatTime(playerState.duration))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Playback Controls

    private var playbackControls: some View {
        HStack(spacing: 48) {
            // Previous chapter
            Button {
                playerState.previousChapter()
            } label: {
                Image(systemName: "backward.end.fill")
                    .font(.title)
            }
            .disabled(playerState.currentChapter <= 1)

            // Skip backward 15s
            Button {
                playerState.skipBackward()
            } label: {
                ZStack {
                    Image(systemName: "gobackward.15")
                        .font(.title2)
                }
            }

            // Play/Pause
            Button {
                playerState.togglePlayPause()
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 72, height: 72)

                    Image(systemName: playerState.isPlaying ? "pause.fill" : "play.fill")
                        .font(.title)
                        .foregroundColor(.white)
                }
            }

            // Skip forward 15s
            Button {
                playerState.skipForward()
            } label: {
                Image(systemName: "goforward.15")
                    .font(.title2)
            }

            // Next chapter
            Button {
                playerState.nextChapter()
            } label: {
                Image(systemName: "forward.end.fill")
                    .font(.title)
            }
        }
        .foregroundColor(.primary)
    }

    // MARK: - Secondary Controls

    private var secondaryControls: some View {
        HStack(spacing: 40) {
            // Playback speed
            Button {
                playerState.cyclePlaybackSpeed()
            } label: {
                VStack(spacing: 4) {
                    Text(String(format: "%.1fx", playerState.playbackSpeed))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text(L10n.AudioPlayer.speed)
                        .font(.caption2)
                }
            }

            // Voice selection
            Button {
                showVoiceSelection = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "waveform.circle")
                        .font(.title3)
                    Text(L10n.AudioPlayer.voice)
                        .font(.caption2)
                }
            }

            // Sleep timer
            Button {
                showSleepTimer = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: playerState.sleepTimer != nil ? "moon.fill" : "moon")
                        .font(.title3)
                    Text(L10n.AudioPlayer.timer)
                        .font(.caption2)
                }
            }

            // Chapter list
            Button {
                showChapterList = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "list.bullet")
                        .font(.title3)
                    Text(L10n.AudioPlayer.contents)
                        .font(.caption2)
                }
            }
        }
        .foregroundColor(.secondary)
    }

    private func formatTime(_ seconds: TimeInterval) -> String {
        let minutes = Int(seconds) / 60
        let secs = Int(seconds) % 60
        return String(format: "%d:%02d", minutes, secs)
    }
}

// MARK: - Audio Player State

@MainActor
class AudioPlayerState: ObservableObject {
    @Published var isPlaying = false
    @Published var progress: Double = 0
    @Published var currentTime: TimeInterval = 0
    @Published var duration: TimeInterval = 300 // 5 min sample
    @Published var currentChapter = 1
    @Published var totalChapters = 10
    @Published var playbackSpeed: Double = 1.0
    @Published var selectedVoice: AIVoice = .defaultVoice
    @Published var sleepTimer: SleepTimerOption?
    @Published var chapters: [ChapterInfo] = []

    init() {
        // Sample chapters
        chapters = (1...10).map { ChapterInfo(number: $0, title: L10n.AudioPlayer.chapter($0), duration: 300) }
    }

    func togglePlayPause() {
        isPlaying.toggle()
    }

    func skipForward() {
        let newTime = min(currentTime + 15, duration)
        currentTime = newTime
        progress = newTime / duration
    }

    func skipBackward() {
        let newTime = max(currentTime - 15, 0)
        currentTime = newTime
        progress = newTime / duration
    }

    func seek(to progress: Double) {
        currentTime = duration * progress
    }

    func previousChapter() {
        if currentChapter > 1 {
            currentChapter -= 1
            currentTime = 0
            progress = 0
        }
    }

    func nextChapter() {
        if currentChapter < totalChapters {
            currentChapter += 1
            currentTime = 0
            progress = 0
        }
    }

    func goToChapter(_ chapter: ChapterInfo) {
        currentChapter = chapter.number
        currentTime = 0
        progress = 0
    }

    func cyclePlaybackSpeed() {
        let speeds: [Double] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
        if let currentIndex = speeds.firstIndex(of: playbackSpeed) {
            let nextIndex = (currentIndex + 1) % speeds.count
            playbackSpeed = speeds[nextIndex]
        } else {
            playbackSpeed = 1.0
        }
    }
}

// MARK: - Supporting Types

struct AIVoice: Identifiable, Hashable {
    let id: String
    let nameKey: String
    let gender: String
    let descriptionKey: String

    var name: String {
        switch nameKey {
        case "defaultFemale": return L10n.AudioPlayer.voiceDefaultFemale
        case "gentleFemale": return L10n.AudioPlayer.voiceGentleFemale
        case "livelyFemale": return L10n.AudioPlayer.voiceLivelyFemale
        case "deepMale": return L10n.AudioPlayer.voiceDeepMale
        case "youngMale": return L10n.AudioPlayer.voiceYoungMale
        case "child": return L10n.AudioPlayer.voiceChild
        default: return nameKey
        }
    }

    var description: String {
        switch descriptionKey {
        case "gentleIntellect": return L10n.AudioPlayer.descGentleIntellect
        case "youngLively": return L10n.AudioPlayer.descYoungLively
        case "deepMagnetic": return L10n.AudioPlayer.descDeepMagnetic
        case "youngSunny": return L10n.AudioPlayer.descYoungSunny
        case "cuteChildish": return L10n.AudioPlayer.descCuteChildish
        default: return descriptionKey
        }
    }

    static let defaultVoice = AIVoice(id: "default", nameKey: "defaultFemale", gender: "female", descriptionKey: "gentleIntellect")

    static let allVoices: [AIVoice] = [
        AIVoice(id: "female1", nameKey: "gentleFemale", gender: "female", descriptionKey: "gentleIntellect"),
        AIVoice(id: "female2", nameKey: "livelyFemale", gender: "female", descriptionKey: "youngLively"),
        AIVoice(id: "male1", nameKey: "deepMale", gender: "male", descriptionKey: "deepMagnetic"),
        AIVoice(id: "male2", nameKey: "youngMale", gender: "male", descriptionKey: "youngSunny"),
        AIVoice(id: "child", nameKey: "child", gender: "neutral", descriptionKey: "cuteChildish")
    ]
}

struct ChapterInfo: Identifiable {
    var id: Int { number }
    let number: Int
    let title: String
    let duration: TimeInterval
}

enum SleepTimerOption: String, CaseIterable, Identifiable {
    case min15
    case min30
    case min45
    case min60
    case endOfChapter

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .min15: return L10n.AudioPlayer.timer15min
        case .min30: return L10n.AudioPlayer.timer30min
        case .min45: return L10n.AudioPlayer.timer45min
        case .min60: return L10n.AudioPlayer.timer60min
        case .endOfChapter: return L10n.AudioPlayer.timerEndOfChapter
        }
    }
}

// MARK: - Voice Selection Sheet

struct VoiceSelectionSheet: View {
    @Binding var selectedVoice: AIVoice
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(AIVoice.allVoices) { voice in
                    Button {
                        selectedVoice = voice
                        dismiss()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(voice.name)
                                    .font(.headline)
                                    .foregroundColor(.primary)

                                Text(voice.description)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            if selectedVoice.id == voice.id {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.blue)
                            }

                            // Preview button
                            Button {
                                // Play preview
                            } label: {
                                Image(systemName: "play.circle")
                                    .font(.title2)
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            }
            .navigationTitle(L10n.AudioPlayer.selectVoice)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.AudioPlayer.done) { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Sleep Timer Sheet

struct SleepTimerSheet: View {
    @Binding var selectedTimer: SleepTimerOption?
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                // Current timer status
                if let timer = selectedTimer {
                    Section {
                        HStack {
                            Image(systemName: "moon.fill")
                                .foregroundColor(.blue)
                            Text(L10n.AudioPlayer.timerActive(timer.displayName))
                            Spacer()
                            Button(L10n.AudioPlayer.cancel) {
                                selectedTimer = nil
                            }
                            .foregroundColor(.red)
                        }
                    }
                }

                Section(L10n.AudioPlayer.setSleepTimer) {
                    ForEach(SleepTimerOption.allCases) { option in
                        Button {
                            selectedTimer = option
                            dismiss()
                        } label: {
                            HStack {
                                Text(option.displayName)
                                    .foregroundColor(.primary)

                                Spacer()

                                if selectedTimer == option {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(L10n.AudioPlayer.sleepTimer)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.AudioPlayer.done) { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Chapter List Sheet

struct ChapterListSheet: View {
    let chapters: [ChapterInfo]
    let currentChapter: Int
    let onSelect: (ChapterInfo) -> Void

    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(chapters) { chapter in
                    Button {
                        onSelect(chapter)
                    } label: {
                        HStack {
                            Text(chapter.title)
                                .foregroundColor(chapter.number == currentChapter ? .blue : .primary)
                                .fontWeight(chapter.number == currentChapter ? .semibold : .regular)

                            Spacer()

                            if chapter.number == currentChapter {
                                Image(systemName: "speaker.wave.2.fill")
                                    .foregroundColor(.blue)
                            }

                            Text(formatDuration(chapter.duration))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .navigationTitle(L10n.AudioPlayer.chapterList)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.AudioPlayer.done) { dismiss() }
                }
            }
        }
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let minutes = Int(seconds) / 60
        return L10n.AudioPlayer.minutesCount(minutes)
    }
}

#Preview {
    AudioPlayerView(
        bookTitle: "人类简史",
        bookId: 1,
        bookType: .ebook,
        coverUrl: nil
    )
}
