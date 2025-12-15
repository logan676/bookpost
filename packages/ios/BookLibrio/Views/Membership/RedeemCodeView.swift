import SwiftUI

/// Membership redemption code entry view
/// Allows users to redeem gift cards, promo codes, and membership cards
struct RedeemCodeView: View {
    @Environment(\.dismiss) var dismiss
    @State private var redeemCode = ""
    @State private var isProcessing = false
    @State private var showResult = false
    @State private var redeemResult: RedeemResult?
    @State private var codeHistory: [RedeemHistory] = RedeemHistory.sampleData
    @FocusState private var isCodeFieldFocused: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header illustration
                    headerSection

                    // Code input section
                    codeInputSection

                    // Redeem button
                    redeemButton

                    // Instructions
                    instructionsSection

                    // History section
                    if !codeHistory.isEmpty {
                        historySection
                    }
                }
                .padding()
            }
            .navigationTitle("兑换会员")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink {
                        RedeemHelpView()
                    } label: {
                        Image(systemName: "questionmark.circle")
                    }
                }
            }
            .sheet(isPresented: $showResult) {
                if let result = redeemResult {
                    RedeemResultView(result: result) {
                        showResult = false
                        if result.success {
                            dismiss()
                        }
                    }
                    .presentationDetents([.medium])
                }
            }
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 16) {
            // Gift card illustration
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        LinearGradient(
                            colors: [.purple, .blue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 200, height: 120)
                    .shadow(color: .purple.opacity(0.3), radius: 20, x: 0, y: 10)

                VStack(spacing: 8) {
                    Image(systemName: "giftcard.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.white)

                    Text("会员礼品卡")
                        .font(.headline)
                        .foregroundColor(.white)
                }
            }

            Text("输入兑换码开通会员特权")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.top, 20)
    }

    // MARK: - Code Input Section

    private var codeInputSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("兑换码")
                .font(.headline)

            HStack(spacing: 12) {
                // Code input field
                TextField("请输入兑换码", text: $redeemCode)
                    .font(.system(.body, design: .monospaced))
                    .textCase(.uppercase)
                    .autocapitalization(.allCharacters)
                    .disableAutocorrection(true)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .focused($isCodeFieldFocused)
                    .onChange(of: redeemCode) { _, newValue in
                        // Format code with dashes (XXXX-XXXX-XXXX)
                        let cleaned = newValue.uppercased().filter { $0.isLetter || $0.isNumber }
                        if cleaned.count <= 12 {
                            redeemCode = formatCode(cleaned)
                        } else {
                            redeemCode = formatCode(String(cleaned.prefix(12)))
                        }
                    }

                // Paste button
                Button {
                    if let clipboard = UIPasteboard.general.string {
                        let cleaned = clipboard.uppercased().filter { $0.isLetter || $0.isNumber }
                        redeemCode = formatCode(String(cleaned.prefix(12)))
                    }
                } label: {
                    Image(systemName: "doc.on.clipboard")
                        .font(.title2)
                        .foregroundColor(.blue)
                        .frame(width: 50, height: 50)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                }
            }

            // Code format hint
            HStack(spacing: 4) {
                Image(systemName: "info.circle")
                    .font(.caption)
                Text("兑换码格式: XXXX-XXXX-XXXX")
                    .font(.caption)
            }
            .foregroundColor(.secondary)
        }
    }

    private func formatCode(_ code: String) -> String {
        var result = ""
        for (index, char) in code.enumerated() {
            if index > 0 && index % 4 == 0 {
                result += "-"
            }
            result.append(char)
        }
        return result
    }

    // MARK: - Redeem Button

    private var redeemButton: some View {
        Button {
            performRedemption()
        } label: {
            HStack {
                if isProcessing {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.9)
                } else {
                    Image(systemName: "gift")
                    Text("立即兑换")
                }
            }
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                isValidCode ? Color.blue : Color.gray
            )
            .cornerRadius(12)
        }
        .disabled(!isValidCode || isProcessing)
    }

    private var isValidCode: Bool {
        let cleaned = redeemCode.filter { $0.isLetter || $0.isNumber }
        return cleaned.count == 12
    }

    private func performRedemption() {
        isCodeFieldFocused = false
        isProcessing = true

        // Simulate API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isProcessing = false

            // Simulate result (success/failure)
            let success = Bool.random()

            if success {
                redeemResult = RedeemResult(
                    success: true,
                    title: "兑换成功！",
                    message: "恭喜您获得 30 天会员特权",
                    membershipDays: 30,
                    expiryDate: Calendar.current.date(byAdding: .day, value: 30, to: Date()),
                    bonusPoints: 100
                )

                // Add to history
                codeHistory.insert(
                    RedeemHistory(
                        id: UUID().uuidString,
                        code: redeemCode,
                        membershipDays: 30,
                        redeemedAt: Date(),
                        status: .success
                    ),
                    at: 0
                )
            } else {
                redeemResult = RedeemResult(
                    success: false,
                    title: "兑换失败",
                    message: "兑换码无效或已被使用",
                    membershipDays: nil,
                    expiryDate: nil,
                    bonusPoints: nil
                )
            }

            redeemCode = ""
            showResult = true
        }
    }

    // MARK: - Instructions Section

    private var instructionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("如何获取兑换码？")
                .font(.headline)

            VStack(spacing: 12) {
                instructionRow(
                    icon: "bag",
                    title: "购买礼品卡",
                    description: "在官方商店或合作渠道购买会员礼品卡"
                )

                instructionRow(
                    icon: "star",
                    title: "活动奖励",
                    description: "参与官方活动获得专属兑换码"
                )

                instructionRow(
                    icon: "person.2",
                    title: "好友赠送",
                    description: "通过好友分享获得的礼品码"
                )

                instructionRow(
                    icon: "building.2",
                    title: "企业福利",
                    description: "企业合作提供的员工福利码"
                )
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func instructionRow(icon: String, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(.blue)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - History Section

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("兑换记录")
                    .font(.headline)

                Spacer()

                Button("查看全部") {
                    // Navigate to full history
                }
                .font(.subheadline)
                .foregroundColor(.blue)
            }

            VStack(spacing: 8) {
                ForEach(codeHistory.prefix(3)) { history in
                    historyRow(history)
                }
            }
        }
    }

    private func historyRow(_ history: RedeemHistory) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(history.code)
                    .font(.system(.subheadline, design: .monospaced))
                    .fontWeight(.medium)

                Text(history.redeemedAt, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text("+\(history.membershipDays)天")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.green)

                Text(history.status.displayName)
                    .font(.caption2)
                    .foregroundColor(history.status.color)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(history.status.color.opacity(0.1))
                    .cornerRadius(4)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

// MARK: - Redeem Result View

struct RedeemResultView: View {
    let result: RedeemResult
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            // Result icon
            ZStack {
                Circle()
                    .fill(result.success ? Color.green.opacity(0.1) : Color.red.opacity(0.1))
                    .frame(width: 100, height: 100)

                Image(systemName: result.success ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(result.success ? .green : .red)
            }

            // Result text
            VStack(spacing: 8) {
                Text(result.title)
                    .font(.title2)
                    .fontWeight(.bold)

                Text(result.message)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Success details
            if result.success {
                VStack(spacing: 12) {
                    if let days = result.membershipDays {
                        detailRow(icon: "crown.fill", label: "会员时长", value: "\(days) 天")
                    }

                    if let expiry = result.expiryDate {
                        detailRow(icon: "calendar", label: "到期时间", value: formatDate(expiry))
                    }

                    if let points = result.bonusPoints {
                        detailRow(icon: "star.fill", label: "赠送积分", value: "+\(points)")
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }

            // Action button
            Button {
                onDismiss()
            } label: {
                Text(result.success ? "开始体验" : "重新输入")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(result.success ? Color.green : Color.blue)
                    .cornerRadius(12)
            }
        }
        .padding(24)
    }

    private func detailRow(icon: String, label: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.orange)

            Text(label)
                .foregroundColor(.secondary)

            Spacer()

            Text(value)
                .fontWeight(.medium)
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy年MM月dd日"
        return formatter.string(from: date)
    }
}

// MARK: - Redeem Help View

struct RedeemHelpView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // FAQ Section
                VStack(alignment: .leading, spacing: 16) {
                    Text("常见问题")
                        .font(.headline)

                    faqItem(
                        question: "兑换码有效期是多久？",
                        answer: "兑换码自发放之日起12个月内有效，请在有效期内使用。"
                    )

                    faqItem(
                        question: "兑换码可以转让吗？",
                        answer: "兑换码可以转赠给其他用户，但每个兑换码只能使用一次。"
                    )

                    faqItem(
                        question: "兑换后会员何时生效？",
                        answer: "会员特权在成功兑换后立即生效，会员时长将累加到您的账户。"
                    )

                    faqItem(
                        question: "兑换失败怎么办？",
                        answer: "请检查兑换码是否正确输入，如仍有问题请联系客服处理。"
                    )
                }

                Divider()

                // Contact support
                VStack(alignment: .leading, spacing: 12) {
                    Text("需要帮助？")
                        .font(.headline)

                    Button {
                        // Open support chat
                    } label: {
                        HStack {
                            Image(systemName: "message")
                            Text("联系客服")
                            Spacer()
                            Image(systemName: "chevron.right")
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    .foregroundColor(.primary)
                }
            }
            .padding()
        }
        .navigationTitle("兑换帮助")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func faqItem(question: String, answer: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 8) {
                Text("Q:")
                    .fontWeight(.bold)
                    .foregroundColor(.blue)
                Text(question)
                    .fontWeight(.medium)
            }

            HStack(alignment: .top, spacing: 8) {
                Text("A:")
                    .fontWeight(.bold)
                    .foregroundColor(.green)
                Text(answer)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

// MARK: - Supporting Types

struct RedeemResult {
    let success: Bool
    let title: String
    let message: String
    let membershipDays: Int?
    let expiryDate: Date?
    let bonusPoints: Int?
}

struct RedeemHistory: Identifiable {
    let id: String
    let code: String
    let membershipDays: Int
    let redeemedAt: Date
    let status: RedeemStatus
}

enum RedeemStatus: String {
    case success
    case pending
    case expired

    var displayName: String {
        switch self {
        case .success: return "成功"
        case .pending: return "处理中"
        case .expired: return "已过期"
        }
    }

    var color: Color {
        switch self {
        case .success: return .green
        case .pending: return .orange
        case .expired: return .gray
        }
    }
}

extension RedeemHistory {
    static let sampleData: [RedeemHistory] = [
        RedeemHistory(
            id: "1",
            code: "ABCD-EFGH-1234",
            membershipDays: 30,
            redeemedAt: Date().addingTimeInterval(-86400 * 7),
            status: .success
        ),
        RedeemHistory(
            id: "2",
            code: "WXYZ-5678-MNOP",
            membershipDays: 7,
            redeemedAt: Date().addingTimeInterval(-86400 * 30),
            status: .success
        )
    ]
}

#Preview {
    RedeemCodeView()
}
