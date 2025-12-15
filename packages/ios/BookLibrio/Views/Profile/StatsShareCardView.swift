import SwiftUI

/// A shareable card displaying reading statistics
/// Can be saved as an image or shared to social media
struct StatsShareCardView: View {
    let cardData: ShareCardData
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTemplate: ShareCardTemplate = .classic
    @State private var isExporting = false
    @State private var showShareSheet = false
    @State private var exportedImage: UIImage?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Template selector
                templateSelector

                // Card preview
                ScrollView {
                    cardPreview
                        .padding()
                }

                // Action buttons
                actionButtons
            }
            .navigationTitle(L10n.ProfileShare.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(L10n.Common.cancel) {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showShareSheet) {
                if let image = exportedImage {
                    StatsActivityShareSheet(items: [image])
                }
            }
        }
    }

    // MARK: - Template Selector

    private var templateSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(ShareCardTemplate.allCases) { template in
                    templateOption(template)
                }
            }
            .padding(.horizontal)
        }
    }

    @ViewBuilder
    private func templateOption(_ template: ShareCardTemplate) -> some View {
        let isSelected = selectedTemplate == template

        Button(action: { selectedTemplate = template }) {
            VStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(template.previewGradient)
                    .frame(width: 50, height: 70)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .strokeBorder(isSelected ? Color.blue : Color.clear, lineWidth: 2)
                    )

                Text(template.displayName)
                    .font(.caption2)
                    .foregroundColor(isSelected ? .blue : .secondary)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Card Preview

    @ViewBuilder
    private var cardPreview: some View {
        switch selectedTemplate {
        case .classic:
            ClassicShareCard(data: cardData)
        case .calendar:
            CalendarShareCard(data: cardData)
        case .minimal:
            MinimalShareCard(data: cardData)
        case .gradient:
            GradientShareCard(data: cardData)
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 16) {
            Button(action: saveToGallery) {
                Label(L10n.ProfileShare.saveToGallery, systemImage: "square.and.arrow.down")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .disabled(isExporting)

            Button(action: shareCard) {
                Label(L10n.ProfileShare.share, systemImage: "square.and.arrow.up")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isExporting)
        }
        .padding(.horizontal)
        .padding(.bottom)
    }

    // MARK: - Actions

    private func saveToGallery() {
        isExporting = true
        let renderer = ImageRenderer(content: cardPreview.frame(width: 350))
        renderer.scale = 3.0

        if let image = renderer.uiImage {
            UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        }
        isExporting = false
    }

    private func shareCard() {
        isExporting = true
        let renderer = ImageRenderer(content: cardPreview.frame(width: 350))
        renderer.scale = 3.0

        if let image = renderer.uiImage {
            exportedImage = image
            showShareSheet = true
        }
        isExporting = false
    }
}

// MARK: - Share Card Templates

enum ShareCardTemplate: String, CaseIterable, Identifiable {
    case classic
    case calendar
    case minimal
    case gradient

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .classic: return L10n.ProfileShare.templateClassic
        case .calendar: return L10n.ProfileShare.templateCalendar
        case .minimal: return L10n.ProfileShare.templateMinimal
        case .gradient: return L10n.ProfileShare.templateGradient
        }
    }

    var previewGradient: LinearGradient {
        switch self {
        case .classic:
            return LinearGradient(colors: [.blue.opacity(0.3), .purple.opacity(0.3)],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        case .calendar:
            return LinearGradient(colors: [.orange.opacity(0.3), .red.opacity(0.3)],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        case .minimal:
            return LinearGradient(colors: [.gray.opacity(0.2), .gray.opacity(0.3)],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        case .gradient:
            return LinearGradient(colors: [.cyan.opacity(0.3), .indigo.opacity(0.3)],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }
}

// MARK: - Classic Share Card

struct ClassicShareCard: View {
    let data: ShareCardData

    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "book.circle.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(
                        LinearGradient(colors: [.blue, .purple],
                                       startPoint: .topLeading, endPoint: .bottomTrailing)
                    )

                Text(data.username)
                    .font(.title2)
                    .fontWeight(.bold)

                Text(L10n.ProfileShare.readingJourney)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // Stats grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                statItem(icon: "book.fill", value: "\(data.totalBooks)", label: L10n.ProfileShare.booksRead)
                statItem(icon: "clock.fill", value: "\(data.totalHours)", label: L10n.ProfileShare.hoursSpent)
                statItem(icon: "flame.fill", value: "\(data.currentStreak)", label: L10n.ProfileShare.dayStreak)
                statItem(icon: "doc.text.fill", value: "\(data.notesCount)", label: L10n.ProfileShare.notesTaken)
            }

            // Footer
            VStack(spacing: 4) {
                Text(L10n.ProfileShare.favoriteGenre(data.topCategory))
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(data.formattedDate)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            // Branding
            HStack {
                Image(systemName: "books.vertical")
                    .font(.caption)
                Text("BookPost")
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .foregroundColor(.secondary)
        }
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.1), radius: 10)
        )
    }

    @ViewBuilder
    private func statItem(icon: String, value: String, label: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)

            Text(value)
                .font(.title)
                .fontWeight(.bold)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Calendar Share Card

struct CalendarShareCard: View {
    let data: ShareCardData

    var body: some View {
        VStack(spacing: 0) {
            // Calendar header
            VStack(spacing: 8) {
                Text(data.formattedDate)
                    .font(.headline)
                    .foregroundColor(.white)

                Text(L10n.ProfileShare.monthlyReport)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                LinearGradient(colors: [.orange, .red],
                               startPoint: .leading, endPoint: .trailing)
            )

            // Stats content
            VStack(spacing: 20) {
                Text(data.username)
                    .font(.title3)
                    .fontWeight(.semibold)

                HStack(spacing: 24) {
                    calendarStat(value: "\(data.totalBooks)", label: L10n.ProfileShare.books)
                    calendarStat(value: "\(data.totalHours)h", label: L10n.ProfileShare.hours)
                    calendarStat(value: "\(data.currentStreak)d", label: L10n.ProfileShare.streak)
                }

                Divider()

                HStack {
                    Image(systemName: "star.fill")
                        .foregroundColor(.yellow)
                    Text(L10n.ProfileShare.topGenre(data.topCategory))
                        .font(.subheadline)
                }
            }
            .padding(24)
            .background(Color(.systemBackground))
        }
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 8)
    }

    @ViewBuilder
    private func calendarStat(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Minimal Share Card

struct MinimalShareCard: View {
    let data: ShareCardData

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            // Logo
            HStack {
                Image(systemName: "book.closed.fill")
                    .font(.title3)
                Text("BookPost")
                    .font(.headline)
            }
            .foregroundColor(.primary)

            // Main stat
            VStack(alignment: .leading, spacing: 4) {
                Text("\(data.totalBooks)")
                    .font(.system(size: 64, weight: .bold, design: .rounded))
                Text(L10n.ProfileShare.booksIn2024)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Secondary stats
            HStack(spacing: 24) {
                minimalStat(value: "\(data.totalHours)h", label: L10n.ProfileShare.reading)
                minimalStat(value: "\(data.notesCount)", label: L10n.ProfileShare.notes)
                minimalStat(value: "\(data.currentStreak)d", label: L10n.ProfileShare.streak)
            }

            Spacer()

            // Footer
            Text("@\(data.username)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(32)
        .frame(width: 300, height: 400)
        .background(Color(.systemBackground))
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.05), radius: 10)
    }

    @ViewBuilder
    private func minimalStat(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.title3)
                .fontWeight(.semibold)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Gradient Share Card

struct GradientShareCard: View {
    let data: ShareCardData

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            // Avatar placeholder
            Circle()
                .fill(.white.opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay(
                    Text(String(data.username.prefix(1)).uppercased())
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )

            Text(data.username)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            // Stats
            HStack(spacing: 32) {
                gradientStat(value: "\(data.totalBooks)", label: L10n.ProfileShare.books)
                gradientStat(value: "\(data.totalHours)", label: L10n.ProfileShare.hours)
                gradientStat(value: "\(data.currentStreak)", label: L10n.ProfileShare.days)
            }

            Spacer()

            // Quote
            VStack(spacing: 8) {
                Text("\"" + L10n.ProfileShare.readingQuote + "\"")
                    .font(.caption)
                    .italic()
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)

                Text(data.formattedDate)
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.6))
            }
            .padding(.bottom, 20)
        }
        .frame(width: 300, height: 420)
        .background(
            LinearGradient(
                colors: [.cyan, .blue, .indigo],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(24)
    }

    @ViewBuilder
    private func gradientStat(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.white)
            Text(label)
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
        }
    }
}

// MARK: - Share Sheet

struct StatsActivityShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview("Share Card View") {
    StatsShareCardView(cardData: ShareCardData(
        username: "书虫小明",
        totalBooks: 156,
        totalHours: 520,
        currentStreak: 15,
        notesCount: 1024,
        topCategory: "文学",
        generatedDate: Date()
    ))
}

#Preview("Classic Card") {
    ClassicShareCard(data: ShareCardData(
        username: "书虫小明",
        totalBooks: 156,
        totalHours: 520,
        currentStreak: 15,
        notesCount: 1024,
        topCategory: "文学",
        generatedDate: Date()
    ))
    .padding()
}

#Preview("Gradient Card") {
    GradientShareCard(data: ShareCardData(
        username: "书虫小明",
        totalBooks: 156,
        totalHours: 520,
        currentStreak: 15,
        notesCount: 1024,
        topCategory: "文学",
        generatedDate: Date()
    ))
    .padding()
}
