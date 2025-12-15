/**
 * Daily Goals View
 * Displays and manages daily reading goals with progress tracking
 */

import SwiftUI

struct DailyGoalsView: View {
    @StateObject private var sessionManager = ReadingSessionManager.shared
    @State private var goalResponse: DailyGoalResponse?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showGoalPicker = false
    @State private var selectedPreset: GoalPreset?
    @State private var isSaving = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Progress Section
                goalProgressCard

                // Streak Section
                streakCard

                // Goal Setting Section
                goalSettingSection
            }
            .padding()
        }
        .navigationTitle(L10n.Goals.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadGoal()
        }
        .refreshable {
            await loadGoal()
        }
        .alert(L10n.Goals.setGoal, isPresented: $showGoalPicker) {
            ForEach(GoalPreset.allCases) { preset in
                Button(preset.label) {
                    Task {
                        await setGoal(minutes: preset.rawValue)
                    }
                }
            }
            Button(L10n.Common.cancel, role: .cancel) {}
        } message: {
            Text(L10n.Goals.selectGoal)
        }
    }

    // MARK: - Progress Card

    private var goalProgressCard: some View {
        VStack(spacing: 16) {
            if isLoading {
                ProgressView()
                    .frame(height: 200)
            } else if let goal = goalResponse?.goal {
                // Circular progress indicator
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 12)

                    Circle()
                        .trim(from: 0, to: goal.progressPercentage)
                        .stroke(
                            goal.isCompleted ? Color.green : Color.orange,
                            style: StrokeStyle(lineWidth: 12, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .animation(.easeInOut(duration: 0.5), value: goal.progressPercentage)

                    VStack(spacing: 4) {
                        if goal.isCompleted {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.green)
                            Text(L10n.Goals.completed)
                                .font(.headline)
                                .foregroundColor(.green)
                        } else {
                            Text("\(goal.progress)%")
                                .font(.system(size: 36, weight: .bold, design: .rounded))
                            Text(goal.formattedCurrent)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .frame(width: 180, height: 180)

                // Goal info
                HStack(spacing: 24) {
                    VStack(spacing: 4) {
                        Text(L10n.Goals.target)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(goal.formattedTarget)
                            .font(.headline)
                    }

                    Divider()
                        .frame(height: 40)

                    VStack(spacing: 4) {
                        Text(L10n.Goals.read)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(goal.formattedCurrent)
                            .font(.headline)
                    }

                    Divider()
                        .frame(height: 40)

                    VStack(spacing: 4) {
                        Text(L10n.Goals.remaining)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(goal.remainingMinutes)m")
                            .font(.headline)
                            .foregroundColor(goal.isCompleted ? .green : .orange)
                    }
                }
            } else {
                // No goal set
                VStack(spacing: 16) {
                    Image(systemName: "target")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)

                    Text(L10n.Goals.noGoalSet)
                        .font(.headline)
                        .foregroundColor(.secondary)

                    Button {
                        showGoalPicker = true
                    } label: {
                        Text(L10n.Goals.setGoal)
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal, 40)
                }
                .frame(height: 200)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Streak Card

    private var streakCard: some View {
        HStack(spacing: 20) {
            // Current streak
            VStack(spacing: 8) {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                    Text("\(goalResponse?.streak.current ?? 0)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                }
                Text(L10n.Goals.currentStreak)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)

            Divider()
                .frame(height: 50)

            // Max streak
            VStack(spacing: 8) {
                HStack(spacing: 4) {
                    Image(systemName: "trophy.fill")
                        .foregroundColor(.yellow)
                    Text("\(goalResponse?.streak.max ?? 0)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                }
                Text(L10n.Goals.maxStreak)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Goal Setting Section

    private var goalSettingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L10n.Goals.adjustGoal)
                .font(.headline)
                .padding(.leading, 4)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(GoalPreset.allCases) { preset in
                    GoalPresetCard(
                        preset: preset,
                        isSelected: goalResponse?.goal?.targetMinutes == preset.rawValue,
                        isSaving: isSaving
                    ) {
                        Task {
                            await setGoal(minutes: preset.rawValue)
                        }
                    }
                }
            }
        }
    }

    // MARK: - API Methods

    private func loadGoal() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: APIResponse<DailyGoalResponse> = try await APIClient.shared.get(
                "/user/goals/daily"
            )

            if let data = response.data {
                goalResponse = data
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func setGoal(minutes: Int) async {
        isSaving = true

        do {
            let request = SetGoalRequest(targetMinutes: minutes)
            let _: APIResponse<SetGoalResponse> = try await APIClient.shared.post(
                "/user/goals/daily",
                body: request
            )

            // Reload to get updated goal
            await loadGoal()
        } catch {
            errorMessage = error.localizedDescription
        }

        isSaving = false
    }
}

// MARK: - Goal Preset Card

struct GoalPresetCard: View {
    let preset: GoalPreset
    let isSelected: Bool
    let isSaving: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                Text(preset.label)
                    .font(.headline)
                    .foregroundColor(isSelected ? .white : .primary)

                Text(preset.description)
                    .font(.caption)
                    .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isSelected ? Color.orange : Color(.systemGray6))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.orange : Color.clear, lineWidth: 2)
            )
        }
        .disabled(isSaving)
        .opacity(isSaving ? 0.6 : 1)
    }
}

#Preview {
    NavigationStack {
        DailyGoalsView()
    }
}
