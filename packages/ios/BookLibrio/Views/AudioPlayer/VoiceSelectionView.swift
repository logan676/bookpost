import SwiftUI

/// AI voice selection view for audiobook/TTS playback
/// Allows users to preview and select from multiple AI voices
struct VoiceSelectionView: View {
    @Binding var selectedVoice: VoiceOption
    @Environment(\.dismiss) var dismiss
    @State private var previewingVoice: VoiceOption?
    @State private var isPlaying = false
    @State private var searchText = ""

    private let voices = VoiceOption.allVoices

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                searchBar

                // Category filter
                categoryFilter

                // Voice list
                voiceList
            }
            .navigationTitle("选择朗读声音")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("确定") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)

            TextField("搜索声音", text: $searchText)
                .textFieldStyle(.plain)

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(10)
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding()
    }

    // MARK: - Category Filter

    @State private var selectedCategory: VoiceCategory = .all

    private var categoryFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(VoiceCategory.allCases, id: \.self) { category in
                    categoryChip(category)
                }
            }
            .padding(.horizontal)
        }
        .padding(.bottom, 8)
    }

    private func categoryChip(_ category: VoiceCategory) -> some View {
        let isSelected = selectedCategory == category

        return Button {
            withAnimation {
                selectedCategory = category
            }
        } label: {
            Text(category.displayName)
                .font(.subheadline)
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color(.systemGray6))
                .cornerRadius(20)
        }
    }

    // MARK: - Voice List

    private var filteredVoices: [VoiceOption] {
        var result = voices

        // Filter by category
        if selectedCategory != .all {
            result = result.filter { $0.category == selectedCategory }
        }

        // Filter by search
        if !searchText.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.voiceDescription.localizedCaseInsensitiveContains(searchText)
            }
        }

        return result
    }

    private var voiceList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(filteredVoices) { voice in
                    voiceRow(voice)
                    Divider()
                        .padding(.leading, 76)
                }
            }
        }
    }

    private func voiceRow(_ voice: VoiceOption) -> some View {
        let isSelected = selectedVoice.id == voice.id
        let isPreviewing = previewingVoice?.id == voice.id && isPlaying

        return Button {
            selectedVoice = voice
        } label: {
            HStack(spacing: 12) {
                // Avatar
                voiceAvatar(voice, isPreviewing: isPreviewing)

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(voice.name)
                            .font(.body)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)

                        if voice.isPremium {
                            Text("VIP")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.orange)
                                .cornerRadius(4)
                        }

                        if voice.isNew {
                            Text("NEW")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.green)
                                .cornerRadius(4)
                        }
                    }

                    Text(voice.voiceDescription)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    // Tags
                    HStack(spacing: 4) {
                        ForEach(voice.tags, id: \.self) { tag in
                            Text(tag)
                                .font(.caption2)
                                .foregroundColor(.blue)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(4)
                        }
                    }
                }

                Spacer()

                // Preview button
                Button {
                    togglePreview(voice)
                } label: {
                    Image(systemName: isPreviewing ? "stop.circle.fill" : "play.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                }
                .buttonStyle(.plain)

                // Selection indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.green)
                }
            }
            .padding()
        }
        .buttonStyle(.plain)
        .background(isSelected ? Color.blue.opacity(0.05) : Color.clear)
    }

    private func voiceAvatar(_ voice: VoiceOption, isPreviewing: Bool) -> some View {
        ZStack {
            Circle()
                .fill(voice.avatarGradient)
                .frame(width: 52, height: 52)

            Text(voice.avatarEmoji)
                .font(.title2)

            // Playing indicator
            if isPreviewing {
                Circle()
                    .stroke(Color.blue, lineWidth: 2)
                    .frame(width: 58, height: 58)

                // Sound wave animation
                ForEach(0..<3) { i in
                    Circle()
                        .stroke(Color.blue.opacity(0.3), lineWidth: 1)
                        .frame(width: CGFloat(58 + i * 8), height: CGFloat(58 + i * 8))
                        .scaleEffect(isPreviewing ? 1.2 : 1.0)
                        .opacity(isPreviewing ? 0 : 0.5)
                        .animation(
                            Animation.easeOut(duration: 1.0)
                                .repeatForever(autoreverses: false)
                                .delay(Double(i) * 0.2),
                            value: isPreviewing
                        )
                }
            }
        }
    }

    private func togglePreview(_ voice: VoiceOption) {
        if previewingVoice?.id == voice.id && isPlaying {
            // Stop preview
            isPlaying = false
            previewingVoice = nil
        } else {
            // Start preview
            previewingVoice = voice
            isPlaying = true

            // Simulate preview duration
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                if previewingVoice?.id == voice.id {
                    isPlaying = false
                    previewingVoice = nil
                }
            }
        }
    }
}

// MARK: - Voice Category

enum VoiceCategory: String, CaseIterable {
    case all
    case male
    case female
    case child
    case character
    case celebrity

    var displayName: String {
        switch self {
        case .all: return "全部"
        case .male: return "男声"
        case .female: return "女声"
        case .child: return "童声"
        case .character: return "角色"
        case .celebrity: return "名人"
        }
    }
}

// MARK: - Voice Option Model

struct VoiceOption: Identifiable, Equatable {
    let id: String
    let name: String
    let voiceDescription: String
    let category: VoiceCategory
    let tags: [String]
    let avatarEmoji: String
    let isPremium: Bool
    let isNew: Bool
    let sampleUrl: String?

    var avatarGradient: LinearGradient {
        switch category {
        case .male:
            return LinearGradient(
                colors: [.blue, .blue.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .female:
            return LinearGradient(
                colors: [.pink, .pink.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .child:
            return LinearGradient(
                colors: [.orange, .orange.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .character:
            return LinearGradient(
                colors: [.purple, .purple.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .celebrity:
            return LinearGradient(
                colors: [.yellow, .yellow.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .all:
            return LinearGradient(
                colors: [.gray, .gray.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    static func == (lhs: VoiceOption, rhs: VoiceOption) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Sample Voices

extension VoiceOption {
    static let allVoices: [VoiceOption] = [
        // Male voices
        VoiceOption(
            id: "male_warm",
            name: "温暖男声",
            voiceDescription: "温和亲切，适合情感类书籍",
            category: .male,
            tags: ["温暖", "自然", "情感"],
            avatarEmoji: "🎙️",
            isPremium: false,
            isNew: false,
            sampleUrl: nil
        ),
        VoiceOption(
            id: "male_narrator",
            name: "专业男声",
            voiceDescription: "标准播音腔，适合新闻和纪实类",
            category: .male,
            tags: ["标准", "专业", "清晰"],
            avatarEmoji: "📻",
            isPremium: false,
            isNew: false,
            sampleUrl: nil
        ),
        VoiceOption(
            id: "male_story",
            name: "故事男声",
            voiceDescription: "富有磁性，适合小说故事",
            category: .male,
            tags: ["磁性", "叙事", "沉稳"],
            avatarEmoji: "📖",
            isPremium: true,
            isNew: false,
            sampleUrl: nil
        ),

        // Female voices
        VoiceOption(
            id: "female_sweet",
            name: "甜美女声",
            voiceDescription: "清新甜美，适合青春文学",
            category: .female,
            tags: ["甜美", "清新", "活泼"],
            avatarEmoji: "🎀",
            isPremium: false,
            isNew: false,
            sampleUrl: nil
        ),
        VoiceOption(
            id: "female_gentle",
            name: "温柔女声",
            voiceDescription: "温柔知性，适合散文随笔",
            category: .female,
            tags: ["温柔", "知性", "舒缓"],
            avatarEmoji: "🌸",
            isPremium: false,
            isNew: false,
            sampleUrl: nil
        ),
        VoiceOption(
            id: "female_narrator",
            name: "专业女声",
            voiceDescription: "标准播音，适合有声书和课程",
            category: .female,
            tags: ["标准", "专业", "清晰"],
            avatarEmoji: "🎤",
            isPremium: true,
            isNew: true,
            sampleUrl: nil
        ),

        // Child voices
        VoiceOption(
            id: "child_boy",
            name: "童声男孩",
            voiceDescription: "活泼可爱，适合儿童读物",
            category: .child,
            tags: ["可爱", "活泼", "童真"],
            avatarEmoji: "👦",
            isPremium: false,
            isNew: false,
            sampleUrl: nil
        ),
        VoiceOption(
            id: "child_girl",
            name: "童声女孩",
            voiceDescription: "甜美童真，适合童话故事",
            category: .child,
            tags: ["甜美", "童真", "清脆"],
            avatarEmoji: "👧",
            isPremium: false,
            isNew: true,
            sampleUrl: nil
        ),

        // Character voices
        VoiceOption(
            id: "character_elder",
            name: "智慧长者",
            voiceDescription: "深沉睿智，适合哲学历史类",
            category: .character,
            tags: ["智慧", "深沉", "沧桑"],
            avatarEmoji: "🧙‍♂️",
            isPremium: true,
            isNew: false,
            sampleUrl: nil
        ),
        VoiceOption(
            id: "character_hero",
            name: "热血英雄",
            voiceDescription: "激昂热血，适合武侠玄幻",
            category: .character,
            tags: ["热血", "激昂", "豪迈"],
            avatarEmoji: "⚔️",
            isPremium: true,
            isNew: false,
            sampleUrl: nil
        ),
        VoiceOption(
            id: "character_mystery",
            name: "神秘旁白",
            voiceDescription: "悬疑氛围，适合推理悬疑类",
            category: .character,
            tags: ["神秘", "悬疑", "低沉"],
            avatarEmoji: "🕵️",
            isPremium: true,
            isNew: true,
            sampleUrl: nil
        ),

        // Celebrity voices
        VoiceOption(
            id: "celebrity_anchor",
            name: "央视主播",
            voiceDescription: "权威标准，适合新闻纪实",
            category: .celebrity,
            tags: ["权威", "标准", "专业"],
            avatarEmoji: "📺",
            isPremium: true,
            isNew: false,
            sampleUrl: nil
        ),
        VoiceOption(
            id: "celebrity_poet",
            name: "诗人朗诵",
            voiceDescription: "诗意悠扬，适合诗歌散文",
            category: .celebrity,
            tags: ["诗意", "悠扬", "文艺"],
            avatarEmoji: "🎭",
            isPremium: true,
            isNew: false,
            sampleUrl: nil
        )
    ]

    static let defaultVoice = allVoices.first!
}

// MARK: - Voice Speed Control

struct VoiceSpeedControl: View {
    @Binding var speed: Double
    let range: ClosedRange<Double> = 0.5...2.0

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("朗读速度")
                    .font(.subheadline)

                Spacer()

                Text(speedLabel)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.blue)
            }

            HStack(spacing: 16) {
                Text("0.5x")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Slider(value: $speed, in: range, step: 0.1)
                    .tint(.blue)

                Text("2.0x")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // Quick speed buttons
            HStack(spacing: 8) {
                ForEach([0.75, 1.0, 1.25, 1.5, 1.75], id: \.self) { quickSpeed in
                    Button {
                        withAnimation {
                            speed = quickSpeed
                        }
                    } label: {
                        Text(String(format: "%.2gx", quickSpeed))
                            .font(.caption)
                            .fontWeight(speed == quickSpeed ? .semibold : .regular)
                            .foregroundColor(speed == quickSpeed ? .white : .primary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(speed == quickSpeed ? Color.blue : Color(.systemGray6))
                            .cornerRadius(16)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private var speedLabel: String {
        if speed == 1.0 {
            return "正常"
        } else if speed < 1.0 {
            return "慢速 \(String(format: "%.1f", speed))x"
        } else {
            return "快速 \(String(format: "%.1f", speed))x"
        }
    }
}

#Preview {
    VoiceSelectionView(selectedVoice: .constant(VoiceOption.defaultVoice))
}
