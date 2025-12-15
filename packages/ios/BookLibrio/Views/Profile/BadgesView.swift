/**
 * Badges View
 * Displays user's earned and in-progress badges
 */

import SwiftUI

struct BadgesView: View {
    @StateObject private var viewModel = BadgesViewModel()
    @State private var selectedTier: BadgeTier?  // Filter by tier (Gold/Silver/etc)
    @State private var selectedBadge: BadgeItem?
    @Namespace private var badgeNamespace

    var body: some View {
        ZStack {
            // Main content
            ScrollView {
                VStack(spacing: 20) {
                    // Header summary
                    badgeSummaryCard

                    // Tier filter pills (All / Gold / Silver / Bronze / Iron)
                    tierFilterSelector

                    // Badges grouped by rarity
                    badgesByRaritySection
                }
                .padding()
            }
            .navigationTitle(L10n.Badges.title)
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.loadBadges()
            }
            .refreshable {
                await viewModel.loadBadges()
            }
            .alert(L10n.Badges.newBadgeEarned, isPresented: $viewModel.showNewBadgeAlert) {
                Button(L10n.Badges.awesome) {
                    viewModel.showNewBadgeAlert = false
                }
            } message: {
                Text(viewModel.newBadges.map { $0.name }.joined(separator: ", "))
            }

            // Badge detail overlay with transition animation
            if let badge = selectedBadge {
                BadgeDetailOverlay(
                    badge: badge,
                    namespace: badgeNamespace
                ) {
                    selectedBadge = nil
                }
                .zIndex(100)
                .transition(.opacity)
            }
        }
    }

    // MARK: - Summary Card (Redesigned to match design)
    private var badgeSummaryCard: some View {
        VStack(spacing: 16) {
            // Top stats row
            HStack(spacing: 0) {
                // Earned badges
                statItem(
                    value: "\(viewModel.totalEarned)/\(viewModel.totalBadges)",
                    label: "Earned",
                    icon: "star.fill",
                    color: .orange
                )

                Divider()
                    .frame(height: 40)

                // Read (placeholder - need real data from API)
                statItem(
                    value: formatNumber(viewModel.totalReadCount),
                    label: "Read",
                    icon: "book.fill",
                    color: .blue
                )

                Divider()
                    .frame(height: 40)

                // Level
                statItem(
                    value: "Lv\(viewModel.userLevel)",
                    label: "Level",
                    icon: "trophy.fill",
                    color: .purple
                )
            }

            // Next milestone progress
            VStack(spacing: 8) {
                HStack {
                    Text("Next Milestone: \(viewModel.nextMilestoneName)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(Int(viewModel.milestoneProgress * 100))%")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                }

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.2))

                        RoundedRectangle(cornerRadius: 4)
                            .fill(
                                LinearGradient(
                                    colors: [.orange, .yellow],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * viewModel.milestoneProgress)
                    }
                }
                .frame(height: 8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private func statItem(value: String, label: String, icon: String, color: Color) -> some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(color)
                Text(value)
                    .font(.system(size: 18, weight: .bold))
            }
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func formatNumber(_ number: Int) -> String {
        if number >= 1000 {
            return String(format: "%.1fK", Double(number) / 1000.0)
        }
        return "\(number)"
    }

    // MARK: - Tier Filter Selector
    private var tierFilterSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // All tiers pill
                tierPill(nil, name: L10n.Badges.all)

                // Tier pills
                ForEach(BadgeTier.allCases, id: \.self) { tier in
                    tierPill(tier, name: tier.displayName)
                }
            }
        }
    }

    private func tierPill(_ tier: BadgeTier?, name: String) -> some View {
        let isSelected = selectedTier == tier
        let pillColor: Color = tier?.gradientColors.first ?? .orange

        return Button {
            withAnimation {
                selectedTier = tier
            }
        } label: {
            HStack(spacing: 6) {
                if tier != nil {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: tier!.gradientColors,
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 12, height: 12)
                }
                Text(name)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)

                // Count for this tier
                let count = badgesForTier(tier).count
                if count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                isSelected
                    ? AnyShapeStyle(LinearGradient(colors: tier?.gradientColors ?? [.orange, .orange.opacity(0.8)], startPoint: .leading, endPoint: .trailing))
                    : AnyShapeStyle(Color(.systemGray6))
            )
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }

    // MARK: - Badges By Rarity Section
    private var badgesByRaritySection: some View {
        VStack(spacing: 24) {
            // Group badges by rarity (Legendary -> Common)
            ForEach(BadgeRarity.allCases, id: \.self) { rarity in
                let badges = badgesForRarity(rarity)
                if !badges.isEmpty {
                    raritySection(rarity: rarity, badges: badges)
                }
            }

            // Empty state
            if allFilteredBadges.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "medal")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    Text(L10n.Badges.noBadgesInCategory)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 40)
            }
        }
    }

    private func raritySection(rarity: BadgeRarity, badges: [BadgeItem]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Rarity header
            RaritySectionHeader(
                rarity: rarity,
                count: badges.filter { isEarned($0) }.count,
                total: badges.count
            )

            // Badge grid with metallic cards
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(badges) { badge in
                    BadgeGridCard(
                        badge: badge,
                        namespace: badgeNamespace,
                        isSelected: selectedBadge?.id == badge.id
                    ) {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                            selectedBadge = badge
                        }
                    }
                }
            }
        }
    }

    // MARK: - Helper Methods

    /// Get all badges filtered by selected tier
    private var allFilteredBadges: [BadgeItem] {
        var badges: [BadgeItem] = []
        badges.append(contentsOf: viewModel.earnedBadges.map { .earned($0) })
        badges.append(contentsOf: viewModel.inProgressBadges.map { .inProgress($0) })

        if let tier = selectedTier {
            badges = badges.filter { getBadgeTier($0) == tier }
        }

        return badges
    }

    /// Get badges for a specific tier filter
    private func badgesForTier(_ tier: BadgeTier?) -> [BadgeItem] {
        var badges: [BadgeItem] = []
        badges.append(contentsOf: viewModel.earnedBadges.map { .earned($0) })
        badges.append(contentsOf: viewModel.inProgressBadges.map { .inProgress($0) })

        guard let tier = tier else { return badges }
        return badges.filter { getBadgeTier($0) == tier }
    }

    /// Get badges for a specific rarity, applying tier filter
    private func badgesForRarity(_ rarity: BadgeRarity) -> [BadgeItem] {
        allFilteredBadges.filter { getBadgeRarity($0) == rarity }
    }

    private func getBadgeTier(_ badge: BadgeItem) -> BadgeTier {
        switch badge {
        case .earned(let b): return b.badgeTier
        case .inProgress(let b): return b.badge.badgeTier
        }
    }

    private func getBadgeRarity(_ badge: BadgeItem) -> BadgeRarity {
        switch badge {
        case .earned(let b): return b.badgeRarity
        case .inProgress(let b): return b.badge.badgeRarity
        }
    }

    private func isEarned(_ badge: BadgeItem) -> Bool {
        if case .earned = badge { return true }
        return false
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
                // 3D Badge icon
                Badge3DView(
                    iconName: iconName,
                    color: backgroundColor,
                    isEarned: isEarned,
                    level: level,
                    size: 60,
                    showProgress: !isEarned,
                    progress: progressPercentage
                )

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
        .opacity(isEarned ? 1 : 0.85)
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

    private var progressPercentage: Double {
        if case .inProgress(let b) = badge {
            return b.progress.percentage
        }
        return 0
    }

    private func categoryColor(_ category: BadgeCategory) -> Color {
        category.color
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
                VStack(spacing: 20) {
                    // EARNED label (for earned badges)
                    if isEarned {
                        EarnedBadgeLabel()
                            .padding(.top, 8)
                    }

                    // Large 3D badge
                    largeBadgeView

                    // Badge name and description
                    badgeHeaderSection

                    // Three info tags (Start Date / Category / Tier)
                    infoTagsSection

                    // Requirements section
                    requirementsSection

                    // LORE section (if available)
                    if let lore = badgeLore, !lore.isEmpty {
                        LoreSection(lore: lore)
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

    // MARK: - Large 3D badge view with interaction
    private var largeBadgeView: some View {
        VStack(spacing: 8) {
            Interactive3DBadgeView(
                iconName: iconName,
                color: categoryColor,
                isEarned: isEarned,
                level: level,
                badgeName: name,
                badgeDescription: badgeDescription,
                earnedDate: earnedDateValue
            )

            // Interaction hint
            Text(L10n.Badges.interactionHint)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }

    private var earnedDateValue: Date? {
        if case .earned(let b) = badge {
            return b.earnedDate
        }
        return nil
    }

    // MARK: - Badge Header Section
    private var badgeHeaderSection: some View {
        VStack(spacing: 8) {
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
    }

    // MARK: - Info Tags Section (NEW)
    private var infoTagsSection: some View {
        HStack(spacing: 12) {
            // Start Date
            BadgeInfoTag(
                title: "Start Date",
                value: startDateText
            )

            // Category (Rarity)
            BadgeInfoTag(
                title: "Category",
                value: badgeRarity.displayName,
                color: badgeRarity.color
            )

            // Tier
            BadgeInfoTag(
                title: "Tier",
                value: badgeTier.displayName,
                color: badgeTier.borderColor
            )
        }
    }

    // MARK: - Requirements Section (NEW)
    private var requirementsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text("Requirements")
                    .font(.headline)
                    .fontWeight(.bold)

                Spacer()

                // Completion status
                if isEarned {
                    Text("Completed")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.green)
                } else {
                    let completed = badgeRequirements.filter { $0.isCompleted }.count
                    Text("\(completed)/\(badgeRequirements.count)")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.orange)
                }
            }

            // Requirements list
            VStack(spacing: 0) {
                ForEach(Array(badgeRequirements.enumerated()), id: \.element.id) { index, requirement in
                    RequirementRow(requirement: requirement, index: index)

                    if index < badgeRequirements.count - 1 {
                        Divider()
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    // MARK: - Community Section
    private var communitySection: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "person.3.fill")
                    .foregroundColor(.blue)
                Text(L10n.Badges.community)
                    .font(.headline)
                Spacer()
            }

            HStack(spacing: 20) {
                VStack {
                    Text("\(earnedCount)")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(L10n.Badges.readersEarned)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Divider()
                    .frame(height: 40)

                VStack {
                    Text(badgeRarity.displayName)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(badgeRarity.color)
                    Text(L10n.Badges.rarity)
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

    // MARK: - Share Button
    private var shareButton: some View {
        Button {
            showShareSheet = true
        } label: {
            HStack {
                Image(systemName: "sparkles")
                Text("Show off Badge")
            }
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(
                    colors: badgeTier.gradientColors,
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(12)
        }
    }

    // MARK: - Helper Properties

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

    private var badgeLore: String? {
        switch badge {
        case .earned(let b): return b.lore
        case .inProgress(let b): return b.badge.lore
        }
    }

    private var badgeRequirements: [BadgeRequirement] {
        switch badge {
        case .earned(let b): return b.badgeRequirements
        case .inProgress(let b):
            // For in-progress badges, update requirements with current progress
            let reqs = b.badge.badgeRequirements
            if reqs.isEmpty {
                // Fallback: create from progress
                return [BadgeRequirement(
                    id: 0,
                    description: b.badge.requirement ?? "Complete the challenge",
                    current: b.progress.current,
                    target: b.progress.target
                )]
            }
            return reqs
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
        return category.color
    }

    private var badgeTier: BadgeTier {
        switch badge {
        case .earned(let b): return b.badgeTier
        case .inProgress(let b): return b.badge.badgeTier
        }
    }

    private var badgeRarity: BadgeRarity {
        switch badge {
        case .earned(let b): return b.badgeRarity
        case .inProgress(let b): return b.badge.badgeRarity
        }
    }

    private var startDateText: String {
        // Try to get start date from badge
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMM d"

        switch badge {
        case .earned(let b):
            if let startDate = b.badgeStartDate {
                return dateFormatter.string(from: startDate)
            }
            // Fallback to earned date
            if let earnedDate = b.earnedDate {
                return dateFormatter.string(from: earnedDate)
            }
        case .inProgress(let b):
            if let startDateStr = b.badge.startDate,
               let date = ISO8601DateFormatter().date(from: startDateStr) {
                return dateFormatter.string(from: date)
            }
        }
        return "N/A"
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
                        Text(L10n.Badges.saveToPhotos)
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
            .navigationTitle(L10n.Badges.shareBadge)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(L10n.Common.cancel) { dismiss() }
                }
            }
            .overlay {
                if showSaveSuccess {
                    VStack {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.green)
                        Text(L10n.Badges.saved)
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
                Text(L10n.Badges.achievementUnlocked)
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
        return category.color
    }
}

#Preview {
    NavigationStack {
        BadgesView()
    }
}
