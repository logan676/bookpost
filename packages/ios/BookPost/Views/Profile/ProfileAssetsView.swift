import SwiftUI

/// Displays user's account assets in a 2-column grid
/// Shows balance, credits, membership status, coupons, and gift cards
struct ProfileAssetsView: View {
    let assets: UserAssets?

    var body: some View {
        VStack(spacing: 0) {
            // Top row: Balance & Membership
            HStack(spacing: 0) {
                assetCard(
                    icon: "yensign.circle.fill",
                    iconColor: .orange,
                    title: L10n.ProfileAssets.balance,
                    value: assets?.formattedBalance ?? "0.00",
                    unit: L10n.ProfileAssets.yuan
                )

                Divider()
                    .frame(height: 60)

                assetCard(
                    icon: "crown.fill",
                    iconColor: .purple,
                    title: L10n.ProfileAssets.membership,
                    value: assets?.membershipStatus ?? L10n.ProfileAssets.notMember,
                    unit: nil
                )
            }

            Divider()

            // Bottom row: Credits & Coupons
            HStack(spacing: 0) {
                assetCard(
                    icon: "bitcoinsign.circle.fill",
                    iconColor: .blue,
                    title: L10n.ProfileAssets.credits,
                    value: "\(assets?.credits ?? 0)",
                    unit: L10n.ProfileAssets.creditsUnit
                )

                Divider()
                    .frame(height: 60)

                assetCard(
                    icon: "ticket.fill",
                    iconColor: .red,
                    title: L10n.ProfileAssets.coupons,
                    value: "\(assets?.coupons ?? 0)",
                    unit: L10n.ProfileAssets.sheets
                )
            }
        }
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    @ViewBuilder
    private func assetCard(
        icon: String,
        iconColor: Color,
        title: String,
        value: String,
        unit: String?
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(iconColor)
                .frame(width: 32, height: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)

                HStack(alignment: .lastTextBaseline, spacing: 2) {
                    Text(value)
                        .font(.headline)
                        .fontWeight(.semibold)

                    if let unit = unit {
                        Text(unit)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Compact Asset Row

/// A single-row compact view for displaying assets inline
struct ProfileAssetsCompactRow: View {
    let assets: UserAssets?

    var body: some View {
        HStack(spacing: 16) {
            compactItem(
                icon: "yensign.circle.fill",
                color: .orange,
                value: assets?.formattedBalance ?? "0",
                label: L10n.ProfileAssets.balance
            )

            Divider()
                .frame(height: 24)

            compactItem(
                icon: "bitcoinsign.circle.fill",
                color: .blue,
                value: "\(assets?.credits ?? 0)",
                label: L10n.ProfileAssets.credits
            )

            Divider()
                .frame(height: 24)

            compactItem(
                icon: "ticket.fill",
                color: .red,
                value: "\(assets?.coupons ?? 0)",
                label: L10n.ProfileAssets.coupons
            )

            Divider()
                .frame(height: 24)

            compactItem(
                icon: "giftcard.fill",
                color: .green,
                value: "\(assets?.giftCards ?? 0)",
                label: L10n.ProfileAssets.giftCards
            )
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 8)
    }

    @ViewBuilder
    private func compactItem(
        icon: String,
        color: Color,
        value: String,
        label: String
    ) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)

            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)

            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Membership Banner

/// Banner displaying membership status and benefits
struct MembershipBannerView: View {
    let assets: UserAssets?
    var onTapUpgrade: (() -> Void)?

    private var isMember: Bool {
        guard let days = assets?.membershipDaysRemaining else { return false }
        return days > 0
    }

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: "crown.fill")
                        .foregroundColor(isMember ? .yellow : .gray)

                    Text(assets?.membershipType ?? L10n.ProfileAssets.notMember)
                        .font(.headline)
                        .foregroundColor(isMember ? .primary : .secondary)
                }

                if isMember, let days = assets?.membershipDaysRemaining {
                    Text(L10n.ProfileAssets.memberDays(days))
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else {
                    Text(L10n.ProfileAssets.upgradeBenefits)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            if !isMember {
                Button(action: { onTapUpgrade?() }) {
                    Text(L10n.ProfileAssets.upgrade)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            LinearGradient(
                                colors: [.purple, .blue],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(20)
                }
            } else {
                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isMember
                    ? LinearGradient(
                        colors: [Color.purple.opacity(0.1), Color.blue.opacity(0.1)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    : LinearGradient(
                        colors: [Color(.secondarySystemGroupedBackground)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        )
    }
}

#Preview("Assets Grid") {
    ProfileAssetsView(assets: UserAssets(
        balance: 50.00,
        credits: 120,
        membershipDaysRemaining: 30,
        membershipType: "年度会员",
        coupons: 3,
        giftCards: 0
    ))
    .padding()
}

#Preview("Compact Row") {
    ProfileAssetsCompactRow(assets: UserAssets(
        balance: 50.00,
        credits: 120,
        membershipDaysRemaining: 30,
        membershipType: "年度会员",
        coupons: 3,
        giftCards: 0
    ))
}

#Preview("Member Banner") {
    VStack(spacing: 16) {
        MembershipBannerView(assets: UserAssets(
            balance: 50.00,
            credits: 120,
            membershipDaysRemaining: 30,
            membershipType: "年度会员",
            coupons: 3,
            giftCards: 0
        ))

        MembershipBannerView(assets: UserAssets(
            balance: 10.00,
            credits: 20,
            membershipDaysRemaining: nil,
            membershipType: nil,
            coupons: 0,
            giftCards: 0
        ))
    }
    .padding()
}
