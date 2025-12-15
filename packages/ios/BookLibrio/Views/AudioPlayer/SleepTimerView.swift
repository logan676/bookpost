import SwiftUI

/// Sleep timer view for audio playback
/// Allows users to set auto-stop timers with various presets and custom duration
struct SleepTimerView: View {
    @Binding var isPresented: Bool
    @Binding var timerDuration: TimeInterval?
    @StateObject private var timerManager = SleepTimerManager.shared
    @State private var selectedPreset: TimerPreset?
    @State private var customMinutes: Int = 30
    @State private var showCustomPicker = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Current timer status
                if timerManager.isRunning {
                    activeTimerView
                } else {
                    // Timer icon
                    timerIcon
                }

                // Preset options
                presetGrid

                // Custom duration
                customDurationSection

                // End of chapter option
                endOfChapterOption

                Spacer()
            }
            .padding()
            .navigationTitle("睡眠定时")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") {
                        isPresented = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Timer Icon

    private var timerIcon: some View {
        ZStack {
            Circle()
                .fill(Color.blue.opacity(0.1))
                .frame(width: 100, height: 100)

            Image(systemName: "moon.zzz.fill")
                .font(.system(size: 44))
                .foregroundColor(.blue)
        }
    }

    // MARK: - Active Timer View

    private var activeTimerView: some View {
        VStack(spacing: 16) {
            // Countdown display
            ZStack {
                Circle()
                    .stroke(Color(.systemGray5), lineWidth: 8)
                    .frame(width: 120, height: 120)

                Circle()
                    .trim(from: 0, to: timerManager.progress)
                    .stroke(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        style: StrokeStyle(lineWidth: 8, lineCap: .round)
                    )
                    .frame(width: 120, height: 120)
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: timerManager.progress)

                VStack(spacing: 4) {
                    Text(timerManager.remainingTimeString)
                        .font(.title2)
                        .fontWeight(.bold)
                        .monospacedDigit()

                    Text("剩余时间")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Cancel button
            Button {
                timerManager.cancel()
                timerDuration = nil
            } label: {
                HStack {
                    Image(systemName: "xmark.circle.fill")
                    Text("取消定时")
                }
                .font(.subheadline)
                .foregroundColor(.red)
            }
        }
    }

    // MARK: - Preset Grid

    private var presetGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("快速设置")
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(TimerPreset.allCases, id: \.self) { preset in
                    presetButton(preset)
                }
            }
        }
    }

    private func presetButton(_ preset: TimerPreset) -> some View {
        let isSelected = selectedPreset == preset && timerManager.isRunning

        return Button {
            selectPreset(preset)
        } label: {
            VStack(spacing: 8) {
                Image(systemName: preset.iconName)
                    .font(.title2)

                Text(preset.displayName)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(12)
        }
    }

    private func selectPreset(_ preset: TimerPreset) {
        selectedPreset = preset
        let duration = preset.duration
        timerDuration = duration
        timerManager.start(duration: duration)
    }

    // MARK: - Custom Duration

    private var customDurationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("自定义时间")
                    .font(.headline)

                Spacer()

                Button {
                    showCustomPicker.toggle()
                } label: {
                    HStack {
                        Text("\(customMinutes) 分钟")
                            .foregroundColor(.primary)
                        Image(systemName: "chevron.down")
                            .font(.caption)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
            }

            if showCustomPicker {
                customTimePicker
            }

            Button {
                startCustomTimer()
            } label: {
                Text("开始 \(customMinutes) 分钟定时")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(10)
            }
        }
    }

    private var customTimePicker: some View {
        VStack(spacing: 8) {
            // Quick select buttons
            HStack(spacing: 8) {
                ForEach([5, 10, 20, 45, 60, 90], id: \.self) { minutes in
                    Button {
                        customMinutes = minutes
                    } label: {
                        Text("\(minutes)")
                            .font(.caption)
                            .fontWeight(customMinutes == minutes ? .semibold : .regular)
                            .foregroundColor(customMinutes == minutes ? .white : .primary)
                            .frame(width: 44, height: 32)
                            .background(customMinutes == minutes ? Color.blue : Color(.systemGray5))
                            .cornerRadius(8)
                    }
                }
            }

            // Slider for fine control
            HStack {
                Text("5")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Slider(value: Binding(
                    get: { Double(customMinutes) },
                    set: { customMinutes = Int($0) }
                ), in: 5...120, step: 5)
                .tint(.blue)

                Text("120")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func startCustomTimer() {
        selectedPreset = nil
        let duration = TimeInterval(customMinutes * 60)
        timerDuration = duration
        timerManager.start(duration: duration)
    }

    // MARK: - End of Chapter Option

    private var endOfChapterOption: some View {
        Button {
            // End of chapter timer
            selectedPreset = nil
            timerManager.setEndOfChapter()
        } label: {
            HStack {
                Image(systemName: "bookmark.fill")
                    .foregroundColor(.orange)

                VStack(alignment: .leading, spacing: 2) {
                    Text("本章结束后停止")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)

                    Text("当前章节播放完毕后自动停止")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if timerManager.isEndOfChapter {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Timer Preset

enum TimerPreset: CaseIterable {
    case fifteenMinutes
    case thirtyMinutes
    case fortyFiveMinutes
    case oneHour
    case ninetyMinutes
    case twoHours

    var displayName: String {
        switch self {
        case .fifteenMinutes: return "15分钟"
        case .thirtyMinutes: return "30分钟"
        case .fortyFiveMinutes: return "45分钟"
        case .oneHour: return "1小时"
        case .ninetyMinutes: return "1.5小时"
        case .twoHours: return "2小时"
        }
    }

    var duration: TimeInterval {
        switch self {
        case .fifteenMinutes: return 15 * 60
        case .thirtyMinutes: return 30 * 60
        case .fortyFiveMinutes: return 45 * 60
        case .oneHour: return 60 * 60
        case .ninetyMinutes: return 90 * 60
        case .twoHours: return 120 * 60
        }
    }

    var iconName: String {
        switch self {
        case .fifteenMinutes: return "15.circle"
        case .thirtyMinutes: return "30.circle"
        case .fortyFiveMinutes: return "45.circle"
        case .oneHour: return "clock"
        case .ninetyMinutes: return "clock.badge.checkmark"
        case .twoHours: return "clock.fill"
        }
    }
}

// MARK: - Sleep Timer Manager

class SleepTimerManager: ObservableObject {
    static let shared = SleepTimerManager()

    @Published var isRunning = false
    @Published var remainingTime: TimeInterval = 0
    @Published var totalDuration: TimeInterval = 0
    @Published var isEndOfChapter = false

    private var timer: Timer?

    var progress: Double {
        guard totalDuration > 0 else { return 0 }
        return remainingTime / totalDuration
    }

    var remainingTimeString: String {
        let minutes = Int(remainingTime) / 60
        let seconds = Int(remainingTime) % 60

        if minutes >= 60 {
            let hours = minutes / 60
            let mins = minutes % 60
            return String(format: "%d:%02d:%02d", hours, mins, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }

    func start(duration: TimeInterval) {
        cancel()
        totalDuration = duration
        remainingTime = duration
        isRunning = true
        isEndOfChapter = false

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self = self else { return }

            if self.remainingTime > 0 {
                self.remainingTime -= 1
            } else {
                self.timerEnded()
            }
        }
    }

    func setEndOfChapter() {
        cancel()
        isEndOfChapter = true
        isRunning = false
    }

    func cancel() {
        timer?.invalidate()
        timer = nil
        isRunning = false
        remainingTime = 0
        totalDuration = 0
        isEndOfChapter = false
    }

    private func timerEnded() {
        // Stop audio playback
        NotificationCenter.default.post(name: .sleepTimerEnded, object: nil)
        cancel()
    }
}

extension Notification.Name {
    static let sleepTimerEnded = Notification.Name("sleepTimerEnded")
}

// MARK: - Compact Sleep Timer Button

struct SleepTimerButton: View {
    @Binding var showTimer: Bool
    @ObservedObject var timerManager = SleepTimerManager.shared

    var body: some View {
        Button {
            showTimer = true
        } label: {
            ZStack {
                Image(systemName: timerManager.isRunning ? "moon.zzz.fill" : "moon.zzz")
                    .font(.title2)
                    .foregroundColor(timerManager.isRunning ? .blue : .primary)

                if timerManager.isRunning {
                    // Mini countdown badge
                    Text(timerManager.shortRemainingTime)
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(Color.blue)
                        .cornerRadius(4)
                        .offset(x: 10, y: -10)
                }
            }
        }
    }
}

extension SleepTimerManager {
    var shortRemainingTime: String {
        let minutes = Int(remainingTime) / 60
        if minutes >= 60 {
            return "\(minutes / 60)h"
        } else {
            return "\(minutes)m"
        }
    }
}

#Preview {
    SleepTimerView(
        isPresented: .constant(true),
        timerDuration: .constant(nil)
    )
}
