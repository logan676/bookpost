import SwiftUI

/// Sheet for toggling reader display options
/// Controls visibility of social features, highlights, and interactive elements
struct ReaderDisplayToggleSheet: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var settings = ReaderDisplaySettingsStore.shared

    var body: some View {
        NavigationStack {
            List {
                // Social Features Section
                Section {
                    displayToggle(
                        icon: "highlighter",
                        title: L10n.ReaderDisplay.othersHighlights,
                        description: L10n.ReaderDisplay.othersHighlightsDesc,
                        isOn: $settings.showOthersHighlights,
                        tint: .yellow
                    )

                    displayToggle(
                        icon: "bubble.left",
                        title: L10n.ReaderDisplay.friendThoughts,
                        description: L10n.ReaderDisplay.friendThoughtsDesc,
                        isOn: $settings.showFriendThoughts,
                        tint: .cyan
                    )

                    displayToggle(
                        icon: "star.bubble",
                        title: L10n.ReaderDisplay.popularHighlights,
                        description: L10n.ReaderDisplay.popularHighlightsDesc,
                        isOn: $settings.showPopularHighlights,
                        tint: .pink
                    )

                    displayToggle(
                        icon: "text.bubble",
                        title: L10n.ReaderDisplay.communityThoughts,
                        description: L10n.ReaderDisplay.communityThoughtsDesc,
                        isOn: $settings.showCommunityThoughts,
                        tint: .teal
                    )

                    displayToggle(
                        icon: "person.2",
                        title: L10n.ReaderDisplay.friendNotes,
                        description: L10n.ReaderDisplay.friendNotesDesc,
                        isOn: $settings.showFriendNotes,
                        tint: .blue
                    )
                } header: {
                    Label(L10n.ReaderDisplay.socialFeatures, systemImage: "person.3")
                } footer: {
                    Text(L10n.ReaderDisplay.socialFeaturesDesc)
                }

                // Interactive Elements Section
                Section {
                    displayToggle(
                        icon: "character.book.closed",
                        title: L10n.ReaderDisplay.queryableWords,
                        description: L10n.ReaderDisplay.queryableWordsDesc,
                        isOn: $settings.showQueryableWords,
                        tint: .purple
                    )
                } header: {
                    Label(L10n.ReaderDisplay.interactiveElements, systemImage: "hand.tap")
                }

                // UI Elements Section
                Section {
                    displayToggle(
                        icon: "battery.100",
                        title: L10n.ReaderDisplay.statusBar,
                        description: L10n.ReaderDisplay.statusBarDesc,
                        isOn: $settings.showStatusBar,
                        tint: .gray
                    )
                } header: {
                    Label(L10n.ReaderDisplay.uiElements, systemImage: "rectangle.3.group")
                }

                // Focus Mode Section
                Section {
                    focusModeButton
                } header: {
                    Label(L10n.ReaderDisplay.focusMode, systemImage: "moon.stars")
                } footer: {
                    Text(L10n.ReaderDisplay.focusModeDesc)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle(L10n.ReaderDisplay.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Common.done) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Common.reset) {
                        resetToDefaults()
                    }
                    .foregroundColor(.red)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Display Toggle Row

    private func displayToggle(
        icon: String,
        title: String,
        description: String,
        isOn: Binding<Bool>,
        tint: Color
    ) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(tint)
                .frame(width: 28, height: 28)
                .background(tint.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 6))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            Toggle("", isOn: isOn)
                .labelsHidden()
                .tint(tint)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Focus Mode Button

    private var focusModeButton: some View {
        Button {
            toggleFocusMode()
        } label: {
            HStack {
                Image(systemName: settings.allSocialOptionsEnabled ? "moon" : "sun.max")
                    .font(.system(size: 18))
                    .foregroundColor(.indigo)
                    .frame(width: 28, height: 28)
                    .background(Color.indigo.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                VStack(alignment: .leading, spacing: 4) {
                    Text(settings.allSocialOptionsEnabled ?
                         L10n.ReaderDisplay.enableFocusMode :
                         L10n.ReaderDisplay.disableFocusMode)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)

                    Text(settings.allSocialOptionsEnabled ?
                         L10n.ReaderDisplay.enableFocusModeDesc :
                         L10n.ReaderDisplay.disableFocusModeDesc)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 4)
        }
    }

    // MARK: - Actions

    private func toggleFocusMode() {
        withAnimation {
            if settings.allSocialOptionsEnabled {
                settings.enableFocusMode()
            } else {
                settings.disableFocusMode()
            }
        }
    }

    private func resetToDefaults() {
        withAnimation {
            settings.showOthersHighlights = true
            settings.showFriendThoughts = true
            settings.showPopularHighlights = true
            settings.showCommunityThoughts = true
            settings.showFriendNotes = true
            settings.showQueryableWords = true
            settings.showStatusBar = false
        }
    }
}

// MARK: - Compact Toggle Row (for inline use)

struct ReaderDisplayToggleRow: View {
    let icon: String
    let title: String
    let tint: Color
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(tint)
                .frame(width: 24)

            Text(title)
                .font(.subheadline)

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(tint)
                .scaleEffect(0.9)
        }
    }
}

// MARK: - Display Options Preview Card

struct ReaderDisplayOptionsCard: View {
    @StateObject private var settings = ReaderDisplaySettingsStore.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L10n.ReaderDisplay.displayOptions)
                    .font(.headline)

                Spacer()

                Button {
                    // Open full settings
                } label: {
                    Text(L10n.Common.more)
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }

            HStack(spacing: 16) {
                optionPill(
                    icon: "highlighter",
                    label: L10n.ReaderDisplay.highlights,
                    isEnabled: settings.showOthersHighlights,
                    color: .yellow
                ) {
                    settings.showOthersHighlights.toggle()
                }

                optionPill(
                    icon: "bubble.left",
                    label: L10n.ReaderDisplay.thoughts,
                    isEnabled: settings.showFriendThoughts,
                    color: .cyan
                ) {
                    settings.showFriendThoughts.toggle()
                }

                optionPill(
                    icon: "character.book.closed",
                    label: L10n.ReaderDisplay.dictionary,
                    isEnabled: settings.showQueryableWords,
                    color: .purple
                ) {
                    settings.showQueryableWords.toggle()
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private func optionPill(
        icon: String,
        label: String,
        isEnabled: Bool,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)

                Text(label)
                    .font(.caption)
            }
            .foregroundColor(isEnabled ? color : .secondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isEnabled ? color.opacity(0.15) : Color(.systemGray6))
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isEnabled ? color.opacity(0.3) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ReaderDisplayToggleSheet()
}
