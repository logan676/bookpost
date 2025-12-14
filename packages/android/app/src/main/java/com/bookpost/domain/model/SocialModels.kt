package com.bookpost.domain.model

/**
 * Represents a popular underline/highlight from other readers.
 * Used for social features like "热门划线" (popular highlights).
 */
data class PopularUnderline(
    val id: Int,
    val text: String,
    val userId: Int,
    val userName: String? = null,
    val userAvatarUrl: String? = null,
    val ebookId: Int? = null,
    val magazineId: Int? = null,
    val chapterTitle: String? = null,
    val likeCount: Int = 0,
    val isLiked: Boolean = false,
    val createdAt: String? = null
) {
    val itemType: ItemType
        get() = when {
            ebookId != null -> ItemType.EBOOK
            magazineId != null -> ItemType.MAGAZINE
            else -> ItemType.EBOOK
        }
}

/**
 * Represents a shareable quote card configuration.
 * Used for "分享金句" (share golden quotes) feature.
 */
data class ShareableQuote(
    val id: Int,
    val text: String,
    val bookTitle: String,
    val author: String? = null,
    val coverUrl: String? = null,
    val backgroundColor: String = "#FFFFFF",
    val textColor: String = "#000000",
    val style: QuoteCardStyle = QuoteCardStyle.CLASSIC
)

/**
 * Available styles for quote cards.
 */
enum class QuoteCardStyle(val displayName: String) {
    CLASSIC("经典"),
    MINIMAL("简约"),
    DARK("深色"),
    GRADIENT("渐变"),
    PAPER("纸张")
}

/**
 * Response containing a generated shareable image URL.
 */
data class ShareImageResult(
    val imageUrl: String,
    val expiresAt: String? = null
)
