import SwiftUI

/// Settings sheet for customizing reading experience
struct ReaderSettingsSheet: View {
    @Binding var settings: ReadingSettings
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Brightness
                    brightnessSection

                    Divider()

                    // Color Mode
                    colorModeSection

                    Divider()

                    // Font Size
                    fontSizeSection

                    Divider()

                    // Font Family
                    fontFamilySection

                    Divider()

                    // Line Spacing
                    lineSpacingSection

                    Divider()

                    // Margin Size
                    marginSizeSection

                    Divider()

                    // Page Flip Style
                    pageFlipSection

                    Divider()

                    // Other Settings
                    otherSettingsSection
                }
                .padding()
            }
            .navigationTitle(L10n.Reader.settings)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Reader.done) { dismiss() }
                }

                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Reader.reset) {
                        settings = .default
                    }
                    .foregroundColor(.red)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Brightness Section

    private var brightnessSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(L10n.Reader.brightness, systemImage: "sun.max")
                .font(.headline)

            HStack {
                Image(systemName: "sun.min")
                    .foregroundColor(.secondary)

                Slider(value: $settings.brightness, in: 0.1...1.0)

                Image(systemName: "sun.max")
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Color Mode Section

    private var colorModeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(L10n.Reader.backgroundColor, systemImage: "paintpalette")
                .font(.headline)

            HStack(spacing: 12) {
                ForEach(ColorMode.allCases) { mode in
                    colorModeButton(mode: mode)
                }
            }
        }
    }

    private func colorModeButton(mode: ColorMode) -> some View {
        Button {
            settings.colorMode = mode
        } label: {
            VStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(mode.backgroundColor)
                    .frame(width: 50, height: 50)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(settings.colorMode == mode ? Color.blue : Color.gray.opacity(0.3), lineWidth: settings.colorMode == mode ? 2 : 1)
                    )
                    .overlay(
                        Text(L10n.Reader.textSample)
                            .font(.system(size: 16))
                            .foregroundColor(mode.textColor)
                    )

                Text(mode.displayName)
                    .font(.caption)
                    .foregroundColor(settings.colorMode == mode ? .blue : .secondary)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Font Size Section

    private var fontSizeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(L10n.Reader.fontSize, systemImage: "textformat.size")
                    .font(.headline)

                Spacer()

                Text("\(Int(settings.fontSize))")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
            }

            HStack {
                Button {
                    if settings.fontSize > 12 {
                        settings.fontSize -= 2
                    }
                } label: {
                    Image(systemName: "minus.circle")
                        .font(.title2)
                }
                .disabled(settings.fontSize <= 12)

                Slider(value: $settings.fontSize, in: 12...32, step: 2)

                Button {
                    if settings.fontSize < 32 {
                        settings.fontSize += 2
                    }
                } label: {
                    Image(systemName: "plus.circle")
                        .font(.title2)
                }
                .disabled(settings.fontSize >= 32)
            }

            // Preview text
            Text(L10n.Reader.previewText)
                .font(.system(size: settings.fontSize))
                .padding()
                .frame(maxWidth: .infinity)
                .background(settings.colorMode.backgroundColor)
                .foregroundColor(settings.colorMode.textColor)
                .cornerRadius(8)
        }
    }

    // MARK: - Font Family Section

    private var fontFamilySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(L10n.Reader.fontFamily, systemImage: "textformat")
                .font(.headline)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(FontFamily.allCases) { family in
                    fontFamilyButton(family: family)
                }
            }
        }
    }

    private func fontFamilyButton(family: FontFamily) -> some View {
        Button {
            settings.fontFamily = family
        } label: {
            Text(family.displayName)
                .font(family.fontName != nil ? .custom(family.fontName!, size: 16) : .system(size: 16))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(settings.fontFamily == family ? Color.blue.opacity(0.1) : Color(.systemGray6))
                .foregroundColor(settings.fontFamily == family ? .blue : .primary)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(settings.fontFamily == family ? Color.blue : Color.clear, lineWidth: 1)
                )
        }
    }

    // MARK: - Line Spacing Section

    private var lineSpacingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(L10n.Reader.lineSpacing, systemImage: "text.alignleft")
                .font(.headline)

            HStack(spacing: 8) {
                ForEach(LineSpacing.allCases) { spacing in
                    lineSpacingButton(spacing: spacing)
                }
            }
        }
    }

    private func lineSpacingButton(spacing: LineSpacing) -> some View {
        Button {
            settings.lineSpacing = spacing
        } label: {
            VStack(spacing: 4) {
                // Visual representation
                VStack(spacing: spacing == .compact ? 2 : spacing == .normal ? 4 : spacing == .relaxed ? 6 : 8) {
                    ForEach(0..<3, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 1)
                            .fill(settings.lineSpacing == spacing ? Color.blue : Color.gray)
                            .frame(height: 2)
                    }
                }
                .frame(width: 30, height: 24)

                Text(spacing.displayName)
                    .font(.caption)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(settings.lineSpacing == spacing ? Color.blue.opacity(0.1) : Color(.systemGray6))
            .foregroundColor(settings.lineSpacing == spacing ? .blue : .secondary)
            .cornerRadius(8)
        }
    }

    // MARK: - Margin Size Section

    private var marginSizeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(L10n.Reader.margin, systemImage: "arrow.left.and.right")
                .font(.headline)

            HStack(spacing: 8) {
                ForEach(MarginSize.allCases) { margin in
                    marginSizeButton(margin: margin)
                }
            }
        }
    }

    private func marginSizeButton(margin: MarginSize) -> some View {
        Button {
            settings.marginSize = margin
        } label: {
            VStack(spacing: 4) {
                // Visual representation
                RoundedRectangle(cornerRadius: 4)
                    .stroke(settings.marginSize == margin ? Color.blue : Color.gray, lineWidth: 1)
                    .frame(width: 30, height: 40)
                    .overlay(
                        RoundedRectangle(cornerRadius: 2)
                            .fill(settings.marginSize == margin ? Color.blue.opacity(0.3) : Color.gray.opacity(0.3))
                            .padding(margin == .small ? 2 : margin == .medium ? 4 : 6)
                    )

                Text(margin.displayName)
                    .font(.caption)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(settings.marginSize == margin ? Color.blue.opacity(0.1) : Color(.systemGray6))
            .foregroundColor(settings.marginSize == margin ? .blue : .secondary)
            .cornerRadius(8)
        }
    }

    // MARK: - Page Flip Style Section

    private var pageFlipSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(L10n.Reader.pageFlip, systemImage: "book.pages")
                .font(.headline)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(PageFlipStyle.allCases) { style in
                    pageFlipButton(style: style)
                }
            }
        }
    }

    private func pageFlipButton(style: PageFlipStyle) -> some View {
        Button {
            settings.pageFlipStyle = style
        } label: {
            HStack(spacing: 8) {
                Image(systemName: pageFlipIcon(for: style))
                    .font(.system(size: 16))

                Text(style.displayName)
                    .font(.subheadline)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(settings.pageFlipStyle == style ? Color.blue.opacity(0.1) : Color(.systemGray6))
            .foregroundColor(settings.pageFlipStyle == style ? .blue : .primary)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(settings.pageFlipStyle == style ? Color.blue : Color.clear, lineWidth: 1)
            )
        }
    }

    private func pageFlipIcon(for style: PageFlipStyle) -> String {
        switch style {
        case .horizontal: return "arrow.left.arrow.right"
        case .vertical: return "arrow.up.arrow.down"
        case .curl: return "book.pages.fill"
        case .fade: return "circle.hexagongrid.fill"
        }
    }

    // MARK: - Other Settings Section

    private var otherSettingsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label(L10n.Reader.other, systemImage: "gearshape")
                .font(.headline)

            Toggle(L10n.Reader.keepScreenOn, isOn: $settings.keepScreenOn)
                .tint(.blue)

            Toggle(L10n.Reader.syncBrightness, isOn: .constant(true))
                .tint(.blue)
                .disabled(true)

            HStack {
                Text(L10n.Reader.currentBrightness)
                    .foregroundColor(.secondary)
                Spacer()
                Text("\(Int(settings.brightness * 100))%")
                    .foregroundColor(.secondary)
            }
            .font(.caption)
        }
    }
}

#Preview {
    ReaderSettingsSheet(settings: .constant(ReadingSettings()))
}
