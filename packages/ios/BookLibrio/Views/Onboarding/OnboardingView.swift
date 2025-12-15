import SwiftUI

/// First-time user onboarding experience
/// Guides new users through app features and preference setup
struct OnboardingView: View {
    @Binding var hasCompletedOnboarding: Bool
    @State private var currentPage = 0
    @State private var selectedGenres: Set<String> = []
    @State private var dailyGoal: Int = 30
    @State private var preferredReadingTime: ReadingTimePreference = .evening

    private var pages: [OnboardingPage] {
        [
            OnboardingPage(
                title: L10n.Onboarding.welcomeTitle,
                subtitle: L10n.Onboarding.welcomeSubtitle,
                description: L10n.Onboarding.welcomeDescription,
                imageName: "books.vertical.fill",
                imageColor: .blue
            ),
            OnboardingPage(
                title: L10n.Onboarding.trackingTitle,
                subtitle: L10n.Onboarding.trackingSubtitle,
                description: L10n.Onboarding.trackingDescription,
                imageName: "chart.line.uptrend.xyaxis",
                imageColor: .green
            ),
            OnboardingPage(
                title: L10n.Onboarding.sharingTitle,
                subtitle: L10n.Onboarding.sharingSubtitle,
                description: L10n.Onboarding.sharingDescription,
                imageName: "bubble.left.and.bubble.right.fill",
                imageColor: .orange
            )
        ]
    }

    var body: some View {
        VStack(spacing: 0) {
            // Skip button
            HStack {
                Spacer()
                if currentPage < pages.count {
                    Button(L10n.Onboarding.skip) {
                        completeOnboarding()
                    }
                    .foregroundColor(.secondary)
                    .padding()
                }
            }

            // Content
            TabView(selection: $currentPage) {
                // Feature pages
                ForEach(0..<pages.count, id: \.self) { index in
                    featurePage(pages[index])
                        .tag(index)
                }

                // Genre selection
                genreSelectionPage
                    .tag(pages.count)

                // Reading goal setup
                readingGoalPage
                    .tag(pages.count + 1)

                // Final welcome
                finalWelcomePage
                    .tag(pages.count + 2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeInOut, value: currentPage)

            // Bottom area
            VStack(spacing: 16) {
                // Page indicator
                pageIndicator

                // Action button
                actionButton
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .background(Color(.systemBackground))
    }

    // MARK: - Feature Page

    private func featurePage(_ page: OnboardingPage) -> some View {
        VStack(spacing: 32) {
            Spacer()

            // Illustration
            ZStack {
                Circle()
                    .fill(page.imageColor.opacity(0.1))
                    .frame(width: 200, height: 200)

                Circle()
                    .fill(page.imageColor.opacity(0.2))
                    .frame(width: 150, height: 150)

                Image(systemName: page.imageName)
                    .font(.system(size: 60))
                    .foregroundColor(page.imageColor)
            }

            // Text
            VStack(spacing: 16) {
                Text(page.title)
                    .font(.title)
                    .fontWeight(.bold)

                Text(page.subtitle)
                    .font(.title3)
                    .foregroundColor(.secondary)

                Text(page.description)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
            .padding(.horizontal, 32)

            Spacer()
            Spacer()
        }
    }

    // MARK: - Genre Selection Page

    private var genreSelectionPage: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(spacing: 8) {
                Text(L10n.Onboarding.genreTitle)
                    .font(.title2)
                    .fontWeight(.bold)

                Text(L10n.Onboarding.genreSubtitle)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Genre grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(Genre.allGenres, id: \.key) { genre in
                    genreButton(genre)
                }
            }
            .padding(.horizontal, 24)

            Text(L10n.Onboarding.selectedGenres(selectedGenres.count))
                .font(.caption)
                .foregroundColor(.secondary)

            Spacer()
            Spacer()
        }
    }

    private func genreButton(_ genre: Genre.GenreItem) -> some View {
        let isSelected = selectedGenres.contains(genre.key)

        return Button {
            withAnimation(.spring(response: 0.3)) {
                if isSelected {
                    selectedGenres.remove(genre.key)
                } else {
                    selectedGenres.insert(genre.key)
                }
            }
        } label: {
            Text(genre.displayName)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : .primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(isSelected ? Color.blue : Color(.systemGray6))
                .cornerRadius(12)
        }
    }

    // MARK: - Reading Goal Page

    private var readingGoalPage: some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 8) {
                Text(L10n.Onboarding.goalTitle)
                    .font(.title2)
                    .fontWeight(.bold)

                Text(L10n.Onboarding.goalSubtitle)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Goal picker
            VStack(spacing: 16) {
                Text("\(dailyGoal)")
                    .font(.system(size: 72, weight: .bold, design: .rounded))
                    .foregroundColor(.blue)

                Text(L10n.Onboarding.minutesPerDay)
                    .font(.title3)
                    .foregroundColor(.secondary)

                // Slider
                HStack {
                    Text("15")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Slider(value: Binding(
                        get: { Double(dailyGoal) },
                        set: { dailyGoal = Int($0) }
                    ), in: 15...120, step: 5)
                    .tint(.blue)

                    Text("120")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 32)
            }

            // Reading time preference
            VStack(spacing: 12) {
                Text(L10n.Onboarding.whenDoYouRead)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                HStack(spacing: 12) {
                    ForEach(ReadingTimePreference.allCases, id: \.self) { time in
                        readingTimeButton(time)
                    }
                }
            }
            .padding(.top, 16)

            Spacer()
            Spacer()
        }
    }

    private func readingTimeButton(_ time: ReadingTimePreference) -> some View {
        let isSelected = preferredReadingTime == time

        return Button {
            withAnimation {
                preferredReadingTime = time
            }
        } label: {
            VStack(spacing: 8) {
                Image(systemName: time.iconName)
                    .font(.title2)

                Text(time.displayName)
                    .font(.caption)
            }
            .foregroundColor(isSelected ? .white : .primary)
            .frame(width: 80, height: 80)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .cornerRadius(16)
        }
    }

    // MARK: - Final Welcome Page

    private var finalWelcomePage: some View {
        VStack(spacing: 32) {
            Spacer()

            // Celebration icon
            ZStack {
                Circle()
                    .fill(Color.yellow.opacity(0.2))
                    .frame(width: 160, height: 160)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.green)
            }

            VStack(spacing: 16) {
                Text(L10n.Onboarding.allSetTitle)
                    .font(.title)
                    .fontWeight(.bold)

                Text(L10n.Onboarding.allSetSubtitle)
                    .font(.title3)
                    .foregroundColor(.secondary)

                // Summary
                VStack(spacing: 12) {
                    if !selectedGenres.isEmpty {
                        summaryRow(
                            icon: "heart.fill",
                            text: L10n.Onboarding.likeGenres(selectedGenres.count)
                        )
                    }

                    summaryRow(
                        icon: "target",
                        text: L10n.Onboarding.dailyReading(dailyGoal)
                    )

                    summaryRow(
                        icon: preferredReadingTime.iconName,
                        text: L10n.Onboarding.readingAt(preferredReadingTime.displayName)
                    )
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(16)
            }
            .padding(.horizontal, 32)

            Spacer()
            Spacer()
        }
    }

    private func summaryRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 24)

            Text(text)
                .font(.subheadline)

            Spacer()
        }
    }

    // MARK: - Bottom Components

    private var pageIndicator: some View {
        HStack(spacing: 8) {
            ForEach(0..<(pages.count + 3), id: \.self) { index in
                Circle()
                    .fill(index == currentPage ? Color.blue : Color(.systemGray4))
                    .frame(width: 8, height: 8)
                    .scaleEffect(index == currentPage ? 1.2 : 1.0)
                    .animation(.spring(response: 0.3), value: currentPage)
            }
        }
    }

    private var actionButton: some View {
        Button {
            if currentPage < pages.count + 2 {
                withAnimation {
                    currentPage += 1
                }
            } else {
                completeOnboarding()
            }
        } label: {
            Text(actionButtonTitle)
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.blue)
                .cornerRadius(14)
        }
    }

    private var actionButtonTitle: String {
        switch currentPage {
        case pages.count + 2:
            return L10n.Onboarding.startReading
        case pages.count:
            return selectedGenres.isEmpty ? L10n.Onboarding.skipForNow : L10n.Onboarding.next
        default:
            return L10n.Onboarding.continue
        }
    }

    private func completeOnboarding() {
        // Save preferences
        UserDefaults.standard.set(Array(selectedGenres), forKey: "preferredGenres")
        UserDefaults.standard.set(dailyGoal, forKey: "dailyReadingGoal")
        UserDefaults.standard.set(preferredReadingTime.rawValue, forKey: "preferredReadingTime")

        withAnimation {
            hasCompletedOnboarding = true
        }
    }
}

// MARK: - Supporting Models

struct OnboardingPage {
    let title: String
    let subtitle: String
    let description: String
    let imageName: String
    let imageColor: Color
}

enum ReadingTimePreference: String, CaseIterable {
    case morning = "morning"
    case afternoon = "afternoon"
    case evening = "evening"
    case night = "night"

    var displayName: String {
        switch self {
        case .morning: return L10n.Onboarding.timeMorning
        case .afternoon: return L10n.Onboarding.timeAfternoon
        case .evening: return L10n.Onboarding.timeEvening
        case .night: return L10n.Onboarding.timeNight
        }
    }

    var iconName: String {
        switch self {
        case .morning: return "sunrise.fill"
        case .afternoon: return "sun.max.fill"
        case .evening: return "sunset.fill"
        case .night: return "moon.stars.fill"
        }
    }
}

enum Genre {
    struct GenreItem: Identifiable {
        let key: String
        let displayName: String
        var id: String { key }
    }

    static var allGenres: [GenreItem] {
        [
            GenreItem(key: "novel", displayName: L10n.Onboarding.genreNovel),
            GenreItem(key: "history", displayName: L10n.Onboarding.genreHistory),
            GenreItem(key: "biography", displayName: L10n.Onboarding.genreBiography),
            GenreItem(key: "scifi", displayName: L10n.Onboarding.genreSciFi),
            GenreItem(key: "mystery", displayName: L10n.Onboarding.genreMystery),
            GenreItem(key: "romance", displayName: L10n.Onboarding.genreRomance),
            GenreItem(key: "popscience", displayName: L10n.Onboarding.genrePopScience),
            GenreItem(key: "psychology", displayName: L10n.Onboarding.genrePsychology),
            GenreItem(key: "philosophy", displayName: L10n.Onboarding.genrePhilosophy),
            GenreItem(key: "business", displayName: L10n.Onboarding.genreBusiness),
            GenreItem(key: "technology", displayName: L10n.Onboarding.genreTechnology),
            GenreItem(key: "art", displayName: L10n.Onboarding.genreArt),
            GenreItem(key: "travel", displayName: L10n.Onboarding.genreTravel),
            GenreItem(key: "food", displayName: L10n.Onboarding.genreFood),
            GenreItem(key: "health", displayName: L10n.Onboarding.genreHealth)
        ]
    }
}

// MARK: - Onboarding Wrapper

/// A view modifier that shows onboarding for first-time users
struct OnboardingWrapper: ViewModifier {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    func body(content: Content) -> some View {
        ZStack {
            content

            if !hasCompletedOnboarding {
                OnboardingView(hasCompletedOnboarding: $hasCompletedOnboarding)
                    .transition(.opacity)
            }
        }
    }
}

extension View {
    func withOnboarding() -> some View {
        modifier(OnboardingWrapper())
    }
}

#Preview {
    OnboardingView(hasCompletedOnboarding: .constant(false))
}
