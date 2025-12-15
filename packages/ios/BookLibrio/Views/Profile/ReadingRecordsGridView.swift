import SwiftUI

/// Displays reading records in a 2x2 grid format
/// Shows currently reading, completed books, notes, and subscriptions
struct ReadingRecordsGridView: View {
    let records: ProfileReadingRecords?

    private let columns = [
        GridItem(.flexible(), spacing: 1),
        GridItem(.flexible(), spacing: 1)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 1) {
            recordCell(
                icon: "book.fill",
                iconColor: .blue,
                count: records?.currentlyReading ?? 0,
                label: L10n.ProfileRecords.currentlyReading
            )

            recordCell(
                icon: "checkmark.circle.fill",
                iconColor: .green,
                count: records?.booksCompleted ?? 0,
                label: L10n.ProfileRecords.booksCompleted
            )

            recordCell(
                icon: "doc.text.fill",
                iconColor: .orange,
                count: records?.notesCount ?? 0,
                label: L10n.ProfileRecords.notes
            )

            recordCell(
                icon: "bell.fill",
                iconColor: .purple,
                count: records?.subscriptionsCount ?? 0,
                label: L10n.ProfileRecords.subscriptions
            )
        }
        .background(Color(.systemGroupedBackground))
        .cornerRadius(12)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func recordCell(
        icon: String,
        iconColor: Color,
        count: Int,
        label: String
    ) -> some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .foregroundColor(iconColor)
                    .font(.subheadline)

                Text("\(count)")
                    .font(.title2)
                    .fontWeight(.bold)
            }

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.secondarySystemGroupedBackground))
    }
}

// MARK: - Extended Reading Stats Grid

/// A more comprehensive grid showing additional reading statistics
struct ExtendedReadingStatsGrid: View {
    let records: ProfileReadingRecords?

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            statCard(
                icon: "book.fill",
                iconColor: .blue,
                count: records?.currentlyReading ?? 0,
                label: L10n.ProfileRecords.reading
            )

            statCard(
                icon: "checkmark.circle.fill",
                iconColor: .green,
                count: records?.booksCompleted ?? 0,
                label: L10n.ProfileRecords.completed
            )

            statCard(
                icon: "highlighter",
                iconColor: .yellow,
                count: records?.highlightsCount ?? 0,
                label: L10n.ProfileRecords.highlights
            )

            statCard(
                icon: "doc.text.fill",
                iconColor: .orange,
                count: records?.notesCount ?? 0,
                label: L10n.ProfileRecords.notes
            )

            statCard(
                icon: "list.bullet.rectangle",
                iconColor: .indigo,
                count: records?.listsCount ?? 0,
                label: L10n.ProfileRecords.lists
            )

            statCard(
                icon: "bell.fill",
                iconColor: .purple,
                count: records?.subscriptionsCount ?? 0,
                label: L10n.ProfileRecords.subscriptions
            )
        }
    }

    @ViewBuilder
    private func statCard(
        icon: String,
        iconColor: Color,
        count: Int,
        label: String
    ) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(iconColor)

            Text("\(count)")
                .font(.title3)
                .fontWeight(.bold)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(10)
    }
}

// MARK: - Reading Summary Row

/// Horizontal summary row showing key reading statistics
struct ReadingSummaryRow: View {
    let records: ProfileReadingRecords?

    var body: some View {
        HStack(spacing: 0) {
            summaryItem(
                value: "\(records?.totalReadingHours ?? 0)",
                unit: L10n.ProfileRecords.hoursUnit,
                label: L10n.ProfileRecords.totalHours
            )

            Divider()
                .frame(height: 40)

            summaryItem(
                value: "\(records?.booksCompleted ?? 0)",
                unit: L10n.ProfileRecords.booksUnit,
                label: L10n.ProfileRecords.thisYear
            )

            Divider()
                .frame(height: 40)

            summaryItem(
                value: "\(records?.currentStreak ?? 0)",
                unit: L10n.ProfileRecords.daysUnit,
                label: L10n.ProfileRecords.streak
            )
        }
        .padding(.vertical, 12)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    @ViewBuilder
    private func summaryItem(
        value: String,
        unit: String,
        label: String
    ) -> some View {
        VStack(spacing: 4) {
            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)

                Text(unit)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Streak Highlight Card

/// A highlighted card showing current reading streak with fire animation
struct StreakHighlightCard: View {
    let currentStreak: Int
    let longestStreak: Int

    @State private var isAnimating = false

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                Text(L10n.ProfileRecords.streakTitle)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text("\(currentStreak)")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundColor(.orange)

                    Text(L10n.ProfileRecords.daysUnit)
                        .font(.title3)
                        .foregroundColor(.secondary)
                }

                Text(L10n.ProfileRecords.longestStreak(longestStreak))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            ZStack {
                // Background glow
                Circle()
                    .fill(Color.orange.opacity(0.2))
                    .frame(width: 80, height: 80)
                    .scaleEffect(isAnimating ? 1.1 : 1.0)

                Image(systemName: "flame.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.yellow, .orange, .red],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .scaleEffect(isAnimating ? 1.05 : 1.0)
            }
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color.orange.opacity(0.1), Color.red.opacity(0.05)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(16)
        .onAppear {
            withAnimation(
                .easeInOut(duration: 1.5)
                .repeatForever(autoreverses: true)
            ) {
                isAnimating = true
            }
        }
    }
}

#Preview("Records Grid") {
    ReadingRecordsGridView(records: ProfileReadingRecords(
        currentlyReading: 3,
        booksCompleted: 156,
        notesCount: 1024,
        subscriptionsCount: 12,
        highlightsCount: 2048,
        listsCount: 8,
        totalReadingHours: 520,
        currentStreak: 15
    ))
    .padding()
}

#Preview("Extended Stats") {
    ExtendedReadingStatsGrid(records: ProfileReadingRecords(
        currentlyReading: 3,
        booksCompleted: 156,
        notesCount: 1024,
        subscriptionsCount: 12,
        highlightsCount: 2048,
        listsCount: 8,
        totalReadingHours: 520,
        currentStreak: 15
    ))
    .padding()
}

#Preview("Summary Row") {
    ReadingSummaryRow(records: ProfileReadingRecords(
        currentlyReading: 3,
        booksCompleted: 156,
        notesCount: 1024,
        subscriptionsCount: 12,
        highlightsCount: 2048,
        listsCount: 8,
        totalReadingHours: 520,
        currentStreak: 15
    ))
    .padding()
}

#Preview("Streak Card") {
    StreakHighlightCard(currentStreak: 15, longestStreak: 42)
        .padding()
}
