import SwiftUI

/// In-app message inbox showing notifications, social interactions, and system messages
/// Supports multiple message categories with read/unread states
struct MessageInboxView: View {
    @State private var selectedCategory: MessageCategory = .all
    @State private var messages: [InboxMessage] = InboxMessage.sampleMessages
    @State private var selectedMessage: InboxMessage?
    @State private var showMessageDetail = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Category tabs
                categoryTabs

                // Message list
                if filteredMessages.isEmpty {
                    emptyState
                } else {
                    messageList
                }
            }
            .navigationTitle("消息")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("全部标为已读") {
                            markAllAsRead()
                        }

                        Button("清除已读消息") {
                            clearReadMessages()
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(item: $selectedMessage) { message in
                MessageDetailSheet(message: message)
            }
        }
    }

    // MARK: - Category Tabs

    private var categoryTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(MessageCategory.allCases, id: \.self) { category in
                    categoryTab(category)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .background(Color(.systemBackground))
    }

    private func categoryTab(_ category: MessageCategory) -> some View {
        let isSelected = selectedCategory == category
        let unreadCount = messages.filter { !$0.isRead && (category == .all || $0.category == category) }.count

        return Button {
            withAnimation {
                selectedCategory = category
            }
        } label: {
            HStack(spacing: 4) {
                Text(category.displayName)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)

                if unreadCount > 0 && !isSelected {
                    Text("\(unreadCount)")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.red)
                        .clipShape(Capsule())
                }
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .cornerRadius(20)
        }
    }

    // MARK: - Message List

    private var filteredMessages: [InboxMessage] {
        if selectedCategory == .all {
            return messages
        }
        return messages.filter { $0.category == selectedCategory }
    }

    private var messageList: some View {
        List {
            ForEach(filteredMessages) { message in
                MessageRow(message: message) {
                    // Mark as read
                    if let index = messages.firstIndex(where: { $0.id == message.id }) {
                        messages[index].isRead = true
                    }
                    selectedMessage = message
                }
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) {
                        deleteMessage(message)
                    } label: {
                        Label("删除", systemImage: "trash")
                    }

                    Button {
                        toggleRead(message)
                    } label: {
                        Label(
                            message.isRead ? "标为未读" : "标为已读",
                            systemImage: message.isRead ? "envelope.badge" : "envelope.open"
                        )
                    }
                    .tint(.blue)
                }
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "tray")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("暂无消息")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("互动消息和系统通知将显示在这里")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Spacer()
        }
    }

    // MARK: - Actions

    private func markAllAsRead() {
        withAnimation {
            for index in messages.indices {
                messages[index].isRead = true
            }
        }
    }

    private func clearReadMessages() {
        withAnimation {
            messages.removeAll { $0.isRead }
        }
    }

    private func deleteMessage(_ message: InboxMessage) {
        withAnimation {
            messages.removeAll { $0.id == message.id }
        }
    }

    private func toggleRead(_ message: InboxMessage) {
        if let index = messages.firstIndex(where: { $0.id == message.id }) {
            withAnimation {
                messages[index].isRead.toggle()
            }
        }
    }
}

// MARK: - Message Row

struct MessageRow: View {
    let message: InboxMessage
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 12) {
                // Icon or avatar
                messageIcon

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(message.title)
                            .font(.subheadline)
                            .fontWeight(message.isRead ? .regular : .semibold)
                            .foregroundColor(.primary)
                            .lineLimit(1)

                        Spacer()

                        Text(message.timeAgo)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Text(message.content)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)

                    // Associated content preview
                    if let bookTitle = message.relatedBookTitle {
                        HStack(spacing: 4) {
                            Image(systemName: "book.fill")
                                .font(.caption2)
                            Text(bookTitle)
                                .font(.caption)
                        }
                        .foregroundColor(.blue)
                        .padding(.top, 2)
                    }
                }
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
        .opacity(message.isRead ? 0.7 : 1.0)
    }

    private var messageIcon: some View {
        ZStack {
            Circle()
                .fill(message.category.color.opacity(0.15))
                .frame(width: 44, height: 44)

            if let avatarUrl = message.senderAvatarUrl {
                AsyncImage(url: URL(string: avatarUrl)) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Image(systemName: "person.fill")
                        .foregroundColor(.secondary)
                }
                .frame(width: 44, height: 44)
                .clipShape(Circle())
            } else {
                Image(systemName: message.category.iconName)
                    .font(.body)
                    .foregroundColor(message.category.color)
            }

            // Unread indicator
            if !message.isRead {
                VStack {
                    HStack {
                        Spacer()
                        Circle()
                            .fill(Color.red)
                            .frame(width: 10, height: 10)
                    }
                    Spacer()
                }
                .frame(width: 44, height: 44)
            }
        }
    }
}

// MARK: - Message Detail Sheet

struct MessageDetailSheet: View {
    let message: InboxMessage
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Header
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(message.category.color.opacity(0.15))
                                .frame(width: 56, height: 56)

                            Image(systemName: message.category.iconName)
                                .font(.title2)
                                .foregroundColor(message.category.color)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(message.title)
                                .font(.headline)

                            Text(message.formattedDate)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    Divider()

                    // Content
                    Text(message.fullContent ?? message.content)
                        .font(.body)
                        .lineSpacing(6)

                    // Related book
                    if let bookTitle = message.relatedBookTitle {
                        relatedBookCard(title: bookTitle)
                    }

                    // Action button
                    if let actionTitle = message.actionTitle {
                        actionButton(title: actionTitle)
                    }
                }
                .padding()
            }
            .navigationTitle("消息详情")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func relatedBookCard(title: String) -> some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(.systemGray5))
                .frame(width: 50, height: 68)
                .overlay(
                    Image(systemName: "book.fill")
                        .foregroundColor(.secondary)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("点击查看详情")
                    .font(.caption)
                    .foregroundColor(.blue)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func actionButton(title: String) -> some View {
        Button {
            // Handle action
            dismiss()
        } label: {
            Text(title)
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.blue)
                .cornerRadius(12)
        }
        .padding(.top, 8)
    }
}

// MARK: - Message Models

enum MessageCategory: String, CaseIterable {
    case all = "all"
    case social = "social"
    case activity = "activity"
    case system = "system"
    case promotion = "promotion"

    var displayName: String {
        switch self {
        case .all: return "全部"
        case .social: return "互动"
        case .activity: return "活动"
        case .system: return "系统"
        case .promotion: return "推广"
        }
    }

    var iconName: String {
        switch self {
        case .all: return "tray.full.fill"
        case .social: return "heart.fill"
        case .activity: return "star.fill"
        case .system: return "bell.fill"
        case .promotion: return "gift.fill"
        }
    }

    var color: Color {
        switch self {
        case .all: return .blue
        case .social: return .pink
        case .activity: return .orange
        case .system: return .gray
        case .promotion: return .purple
        }
    }
}

struct InboxMessage: Identifiable {
    let id: String
    let category: MessageCategory
    let title: String
    let content: String
    let fullContent: String?
    let timestamp: Date
    var isRead: Bool
    let senderAvatarUrl: String?
    let relatedBookTitle: String?
    let actionTitle: String?
    let actionDestination: String?

    var timeAgo: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        formatter.locale = Locale(identifier: "zh_CN")
        return formatter.localizedString(for: timestamp, relativeTo: Date())
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .short
        formatter.locale = Locale(identifier: "zh_CN")
        return formatter.string(from: timestamp)
    }
}

// MARK: - Sample Data

extension InboxMessage {
    static let sampleMessages: [InboxMessage] = [
        InboxMessage(
            id: "1",
            category: .social,
            title: "小明 赞了你的书评",
            content: "你对《人类简史》的书评获得了一个赞",
            fullContent: "你发表的书评「这本书彻底改变了我对历史的看法...」获得了小明的赞，继续分享你的阅读感悟吧！",
            timestamp: Date().addingTimeInterval(-300),
            isRead: false,
            senderAvatarUrl: nil,
            relatedBookTitle: "人类简史",
            actionTitle: "查看书评",
            actionDestination: nil
        ),
        InboxMessage(
            id: "2",
            category: .social,
            title: "书友回复了你的评论",
            content: "阅读达人回复：说得太对了，我也有同感...",
            fullContent: "阅读达人 回复了你在《三体》下的评论:\n\n\"说得太对了，我也有同感。刘慈欣的想象力真的太惊人了，每次重读都有新的发现。\"",
            timestamp: Date().addingTimeInterval(-3600),
            isRead: false,
            senderAvatarUrl: nil,
            relatedBookTitle: "三体",
            actionTitle: "回复",
            actionDestination: nil
        ),
        InboxMessage(
            id: "3",
            category: .activity,
            title: "🎉 恭喜获得新徽章",
            content: "你已解锁「连续阅读7天」成就徽章",
            fullContent: "恭喜你！你已经连续阅读7天，成功解锁「坚持不懈」成就徽章！\n\n继续保持，下一个目标是连续阅读30天，加油！",
            timestamp: Date().addingTimeInterval(-7200),
            isRead: true,
            senderAvatarUrl: nil,
            relatedBookTitle: nil,
            actionTitle: "查看徽章",
            actionDestination: nil
        ),
        InboxMessage(
            id: "4",
            category: .system,
            title: "您关注的书籍已更新",
            content: "《技术的本质》已上架有声书版本",
            fullContent: "您收藏的《技术的本质》现已推出有声书版本，由专业主播朗读，让您随时随地享受阅读。\n\n会员用户可免费收听完整版本。",
            timestamp: Date().addingTimeInterval(-86400),
            isRead: true,
            senderAvatarUrl: nil,
            relatedBookTitle: "技术的本质",
            actionTitle: "立即收听",
            actionDestination: nil
        ),
        InboxMessage(
            id: "5",
            category: .promotion,
            title: "限时特惠：年度会员5折",
            content: "新年特惠，年度会员限时5折优惠",
            fullContent: "🎊 新年特惠活动\n\n年度会员原价 ¥198，现仅需 ¥99！\n\n会员权益：\n• 全站电子书免费阅读\n• 有声书免费收听\n• 杂志免费订阅\n• 专属徽章和特权\n\n活动时间：即日起至1月31日",
            timestamp: Date().addingTimeInterval(-172800),
            isRead: false,
            senderAvatarUrl: nil,
            relatedBookTitle: nil,
            actionTitle: "立即开通",
            actionDestination: nil
        ),
        InboxMessage(
            id: "6",
            category: .social,
            title: "有新书友关注了你",
            content: "阅读爱好者 开始关注你",
            fullContent: "阅读爱好者 开始关注你了！\n\nTA也喜欢历史、传记类书籍，你们有共同的阅读爱好。",
            timestamp: Date().addingTimeInterval(-259200),
            isRead: true,
            senderAvatarUrl: nil,
            relatedBookTitle: nil,
            actionTitle: "查看主页",
            actionDestination: nil
        )
    ]
}

// MARK: - Badge Count Provider

class MessageBadgeProvider: ObservableObject {
    @Published var unreadCount: Int = 3

    static let shared = MessageBadgeProvider()

    func refresh() {
        // Fetch unread count from server
    }
}

#Preview {
    MessageInboxView()
}
