/**
 * Badges View
 * Displays user's earned and in-progress badges
 */

import SwiftUI

struct BadgesView: View {
    @StateObject private var viewModel = BadgesViewModel()
    @State private var selectedCategory: BadgeCategory?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header summary
                badgeSummaryCard

                // Category pills
                categorySelector

                // Badges list
                if let category = selectedCategory {
                    categoryBadgesSection(category)
                } else {
                    allBadgesSection
                }
            }
            .padding()
        }
        .navigationTitle("My Badges")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadBadges()
        }
        .refreshable {
            await viewModel.loadBadges()
        }
        .alert("New Badge Earned!", isPresented: $viewModel.showNewBadgeAlert) {
            Button("Awesome!") {
                viewModel.showNewBadgeAlert = false
            }
        } message: {
            Text(viewModel.newBadges.map { $0.name }.joined(separator: ", "))
        }
    }

    // MARK: - Summary Card
    private var badgeSummaryCard: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Badges Earned")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text("\(viewModel.totalEarned)")
                        .font(.system(size: 36, weight: .bold))
                        + Text(" / \(viewModel.totalBadges)")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Progress ring
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 8)

                    Circle()
                        .trim(from: 0, to: viewModel.earnedPercentage / 100)
                        .stroke(Color.orange, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))

                    Text("\(Int(viewModel.earnedPercentage))%")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                .frame(width: 60, height: 60)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    // MARK: - Category Selector
    private var categorySelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // All categories pill
                categoryPill(nil, name: "All")

                ForEach(viewModel.sortedCategories, id: \.self) { category in
                    categoryPill(category, name: category.displayName)
                }
            }
        }
    }

    private func categoryPill(_ category: BadgeCategory?, name: String) -> some View {
        let isSelected = selectedCategory == category

        return Button {
            withAnimation {
                selectedCategory = category
            }
        } label: {
            HStack(spacing: 6) {
                if let category = category {
                    Image(systemName: category.icon)
                        .font(.caption)
                }
                Text(name)
                    .font(.subheadline)

                if let category = category,
                   let summary = viewModel.categorySummaries[category.rawValue] {
                    Text("\(summary.earned)/\(summary.total)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.orange : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }

    // MARK: - All Badges Section
    private var allBadgesSection: some View {
        VStack(spacing: 24) {
            // Earned badges
            if !viewModel.earnedBadges.isEmpty {
                badgeSection(
                    title: "Earned",
                    badges: viewModel.earnedBadges.map { .earned($0) }
                )
            }

            // In progress badges
            if !viewModel.inProgressBadges.isEmpty {
                badgeSection(
                    title: "In Progress",
                    badges: viewModel.inProgressBadges.map { .inProgress($0) }
                )
            }
        }
    }

    private func categoryBadgesSection(_ category: BadgeCategory) -> some View {
        let earned = viewModel.earnedBadges(for: category)
        let inProgress = viewModel.inProgressBadges(for: category)

        return VStack(spacing: 24) {
            if !earned.isEmpty {
                badgeSection(
                    title: "Earned",
                    badges: earned.map { .earned($0) }
                )
            }

            if !inProgress.isEmpty {
                badgeSection(
                    title: "In Progress",
                    badges: inProgress.map { .inProgress($0) }
                )
            }

            if earned.isEmpty && inProgress.isEmpty {
                Text("No badges in this category yet")
                    .foregroundColor(.secondary)
                    .padding()
            }
        }
    }

    private func badgeSection(title: String, badges: [BadgeItem]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(badges) { badge in
                    BadgeCardView(badge: badge)
                }
            }
        }
    }
}

// MARK: - Badge Item (for unified display)
enum BadgeItem: Identifiable {
    case earned(EarnedBadge)
    case inProgress(BadgeWithProgress)

    var id: Int {
        switch self {
        case .earned(let badge): return badge.id
        case .inProgress(let badge): return badge.id
        }
    }
}

// MARK: - Badge Card View (Enhanced with 3D styling)
struct BadgeCardView: View {
    let badge: BadgeItem
    @State private var showDetail = false

    var body: some View {
        Button {
            showDetail = true
        } label: {
            VStack(spacing: 8) {
                // Badge icon with 3D effect
                ZStack {
                    // Shadow layer for 3D effect
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [backgroundColor.opacity(0.3), backgroundColor.opacity(0.1)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: 64, height: 64)
                        .offset(y: 4)
                        .blur(radius: 4)

                    // Main badge circle with gradient
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: isEarned
                                    ? [backgroundColor, backgroundColor.opacity(0.7)]
                                    : [Color.gray.opacity(0.5), Color.gray.opacity(0.3)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 60, height: 60)
                        .overlay(
                            // Inner highlight for 3D effect
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [.white.opacity(0.4), .clear],
                                        startPoint: .topLeading,
                                        endPoint: .center
                                    )
                                )
                                .frame(width: 58, height: 58)
                        )
                        .shadow(color: backgroundColor.opacity(isEarned ? 0.5 : 0.2), radius: 8, x: 0, y: 4)

                    // Icon
                    Image(systemName: iconName)
                        .font(.title2)
                        .foregroundStyle(
                            isEarned
                                ? LinearGradient(colors: [.white, .white.opacity(0.9)], startPoint: .top, endPoint: .bottom)
                                : LinearGradient(colors: [.white.opacity(0.7), .white.opacity(0.5)], startPoint: .top, endPoint: .bottom)
                        )

                    // Level badge
                    if level > 1 {
                        Text("Lv.\(level)")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .background(Color.orange)
                            .cornerRadius(4)
                            .offset(x: 22, y: -22)
                    }

                    // Progress ring for in-progress badges
                    if case .inProgress(let b) = badge {
                        Circle()
                            .trim(from: 0, to: b.progress.percentage / 100)
                            .stroke(
                                LinearGradient(
                                    colors: [.orange, .yellow],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ),
                                style: StrokeStyle(lineWidth: 3, lineCap: .round)
                            )
                            .frame(width: 68, height: 68)
                            .rotationEffect(.degrees(-90))
                    }
                }

                // Badge name
                Text(name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                // Progress hint with specific number
                if case .inProgress(let b) = badge {
                    progressHint(b.progress)
                } else if case .earned(let b) = badge {
                    if let date = b.earnedDate {
                        Text(date, style: .date)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .opacity(isEarned ? 1 : 0.8)
        .sheet(isPresented: $showDetail) {
            EnhancedBadgeDetailSheet(badge: badge)
        }
    }

    // Progress hint with specific numbers
    private func progressHint(_ progress: BadgeProgress) -> some View {
        VStack(spacing: 2) {
            Text("\(progress.current)/\(progress.target)")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(.orange)

            Text(progress.remaining)
                .font(.system(size: 9))
                .foregroundColor(.secondary)
        }
    }

    private var isEarned: Bool {
        if case .earned = badge { return true }
        return false
    }

    private var name: String {
        switch badge {
        case .earned(let b): return b.name
        case .inProgress(let b): return b.badge.name
        }
    }

    private var level: Int {
        switch badge {
        case .earned(let b): return b.level
        case .inProgress(let b): return b.badge.level
        }
    }

    private var iconName: String {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }
        return category.icon
    }

    private var backgroundColor: Color {
        switch badge {
        case .earned(let b):
            return categoryColor(b.badgeCategory)
        case .inProgress(let b):
            return categoryColor(b.badge.badgeCategory)
        }
    }

    private func categoryColor(_ category: BadgeCategory) -> Color {
        switch category {
        case .readingStreak: return .orange
        case .readingDuration: return .blue
        case .readingDays: return .green
        case .booksFinished: return .purple
        case .weeklyChallenge: return .cyan
        case .monthlyChallenge: return .yellow
        case .social: return .pink
        case .special: return .indigo
        }
    }
}

// MARK: - Enhanced Badge Detail Sheet

struct EnhancedBadgeDetailSheet: View {
    let badge: BadgeItem
    @Environment(\.dismiss) var dismiss
    @State private var showShareSheet = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Large 3D badge
                    largeBadgeView

                    // Badge info
                    badgeInfoSection

                    // Progress section (for in-progress)
                    if case .inProgress(let b) = badge {
                        progressSection(b.progress)
                    }

                    // Community stats
                    communitySection

                    // Share button
                    if isEarned {
                        shareButton
                    }
                }
                .padding()
            }
            .navigationTitle(name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .sheet(isPresented: $showShareSheet) {
                BadgeShareCardView(badge: badge)
            }
        }
    }

    // Large 3D badge view
    private var largeBadgeView: some View {
        ZStack {
            // Outer glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: [categoryColor.opacity(0.3), .clear],
                        center: .center,
                        startRadius: 50,
                        endRadius: 100
                    )
                )
                .frame(width: 200, height: 200)

            // Shadow
            Circle()
                .fill(categoryColor.opacity(0.2))
                .frame(width: 130, height: 130)
                .offset(y: 8)
                .blur(radius: 12)

            // Main badge
            Circle()
                .fill(
                    LinearGradient(
                        colors: isEarned
                            ? [categoryColor, categoryColor.opacity(0.7)]
                            : [Color.gray.opacity(0.5), Color.gray.opacity(0.3)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 120, height: 120)
                .overlay(
                    // Inner highlight
                    Ellipse()
                        .fill(
                            LinearGradient(
                                colors: [.white.opacity(0.5), .clear],
                                startPoint: .top,
                                endPoint: .center
                            )
                        )
                        .frame(width: 100, height: 60)
                        .offset(y: -20)
                )
                .shadow(color: categoryColor.opacity(0.5), radius: 20, x: 0, y: 10)

            // Icon
            Image(systemName: iconName)
                .font(.system(size: 50))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.white, .white.opacity(0.8)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

            // Level indicator
            if level > 1 {
                Text("Level \(level)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(categoryColor.opacity(0.9))
                    .cornerRadius(12)
                    .offset(y: 70)
            }
        }
        .padding(.top, 20)
    }

    // Badge info section
    private var badgeInfoSection: some View {
        VStack(spacing: 12) {
            Text(name)
                .font(.title2)
                .fontWeight(.bold)

            if let desc = badgeDescription {
                Text(desc)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            if let requirement = badgeRequirement {
                HStack {
                    Image(systemName: "flag.fill")
                        .foregroundColor(.orange)
                    Text(requirement)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(20)
            }

            if case .earned(let b) = badge, let date = b.earnedDate {
                HStack {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundColor(.green)
                    Text("Earned on \(date.formatted(date: .long, time: .omitted))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    // Progress section
    private func progressSection(_ progress: BadgeProgress) -> some View {
        VStack(spacing: 12) {
            Text("Progress")
                .font(.headline)

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.2))

                    RoundedRectangle(cornerRadius: 8)
                        .fill(
                            LinearGradient(
                                colors: [.orange, .yellow],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * (progress.percentage / 100))
                }
            }
            .frame(height: 12)

            HStack {
                Text("\(progress.current) / \(progress.target)")
                    .font(.headline)
                    .foregroundColor(.orange)

                Spacer()

                Text(progress.remaining)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    // Community section
    private var communitySection: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "person.3.fill")
                    .foregroundColor(.blue)
                Text("Community")
                    .font(.headline)
                Spacer()
            }

            HStack(spacing: 20) {
                VStack {
                    Text("\(earnedCount)")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("readers earned")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Divider()
                    .frame(height: 40)

                VStack {
                    Text(rarity)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(rarityColor)
                    Text("rarity")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    // Share button
    private var shareButton: some View {
        Button {
            showShareSheet = true
        } label: {
            HStack {
                Image(systemName: "square.and.arrow.up")
                Text("Share Achievement")
            }
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(
                    colors: [categoryColor, categoryColor.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(12)
        }
    }

    // Helper properties
    private var isEarned: Bool {
        if case .earned = badge { return true }
        return false
    }

    private var name: String {
        switch badge {
        case .earned(let b): return b.name
        case .inProgress(let b): return b.badge.name
        }
    }

    private var level: Int {
        switch badge {
        case .earned(let b): return b.level
        case .inProgress(let b): return b.badge.level
        }
    }

    private var iconName: String {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }
        return category.icon
    }

    private var badgeDescription: String? {
        switch badge {
        case .earned(let b): return b.description
        case .inProgress(let b): return b.badge.description
        }
    }

    private var badgeRequirement: String? {
        switch badge {
        case .earned(let b): return b.requirement
        case .inProgress(let b): return b.badge.requirement
        }
    }

    private var earnedCount: Int {
        switch badge {
        case .earned(let b): return b.earnedCount
        case .inProgress(let b): return b.badge.earnedCount
        }
    }

    private var categoryColor: Color {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }

        switch category {
        case .readingStreak: return .orange
        case .readingDuration: return .blue
        case .readingDays: return .green
        case .booksFinished: return .purple
        case .weeklyChallenge: return .cyan
        case .monthlyChallenge: return .yellow
        case .social: return .pink
        case .special: return .indigo
        }
    }

    private var rarity: String {
        if earnedCount < 100 { return "Legendary" }
        if earnedCount < 500 { return "Epic" }
        if earnedCount < 2000 { return "Rare" }
        if earnedCount < 10000 { return "Uncommon" }
        return "Common"
    }

    private var rarityColor: Color {
        if earnedCount < 100 { return .orange }
        if earnedCount < 500 { return .purple }
        if earnedCount < 2000 { return .blue }
        if earnedCount < 10000 { return .green }
        return .gray
    }
}

// MARK: - Badge Share Card View

struct BadgeShareCardView: View {
    let badge: BadgeItem
    @Environment(\.dismiss) var dismiss
    @State private var isSaving = false
    @State private var showSaveSuccess = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Share card preview
                badgeShareCard
                    .padding()

                Spacer()

                // Save button
                Button {
                    saveToGallery()
                } label: {
                    HStack {
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "square.and.arrow.down")
                        }
                        Text("Save to Photos")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                }
                .disabled(isSaving)
                .padding(.horizontal)
            }
            .navigationTitle("Share Badge")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .overlay {
                if showSaveSuccess {
                    VStack {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.green)
                        Text("Saved!")
                            .font(.headline)
                    }
                    .padding(30)
                    .background(.ultraThinMaterial)
                    .cornerRadius(16)
                }
            }
        }
    }

    private var badgeShareCard: some View {
        VStack(spacing: 16) {
            // Badge
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [categoryColor, categoryColor.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)
                    .shadow(color: categoryColor.opacity(0.5), radius: 15, x: 0, y: 8)

                Image(systemName: iconName)
                    .font(.system(size: 40))
                    .foregroundColor(.white)
            }

            // Achievement text
            VStack(spacing: 8) {
                Text("🎉 Achievement Unlocked!")
                    .font(.headline)
                    .foregroundColor(.orange)

                Text(name)
                    .font(.title2)
                    .fontWeight(.bold)

                if let desc = badgeDescription {
                    Text(desc)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            Divider()

            // Footer
            HStack {
                Text("BookPost")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.blue)

                Spacer()

                Text(Date().formatted(date: .abbreviated, time: .omitted))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(24)
        .background(Color(.systemBackground))
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.1), radius: 20, x: 0, y: 10)
    }

    @MainActor
    private func saveToGallery() {
        isSaving = true

        let renderer = ImageRenderer(content: badgeShareCard.frame(width: 350))
        renderer.scale = 3.0

        if let uiImage = renderer.uiImage {
            UIImageWriteToSavedPhotosAlbum(uiImage, nil, nil, nil)

            withAnimation {
                showSaveSuccess = true
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation {
                    showSaveSuccess = false
                    isSaving = false
                    dismiss()
                }
            }
        } else {
            isSaving = false
        }
    }

    // Helper properties
    private var name: String {
        switch badge {
        case .earned(let b): return b.name
        case .inProgress(let b): return b.badge.name
        }
    }

    private var iconName: String {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }
        return category.icon
    }

    private var badgeDescription: String? {
        switch badge {
        case .earned(let b): return b.description
        case .inProgress(let b): return b.badge.description
        }
    }

    private var categoryColor: Color {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }

        switch category {
        case .readingStreak: return .orange
        case .readingDuration: return .blue
        case .readingDays: return .green
        case .booksFinished: return .purple
        case .weeklyChallenge: return .cyan
        case .monthlyChallenge: return .yellow
        case .social: return .pink
        case .special: return .indigo
        }
    }
}

#Preview {
    NavigationStack {
        BadgesView()
    }
}
