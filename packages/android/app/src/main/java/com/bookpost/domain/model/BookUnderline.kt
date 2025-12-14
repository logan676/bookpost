package com.bookpost.domain.model

/**
 * Represents a user's underline/highlight from a book.
 * This combines underline data with book information for display in notes list.
 */
data class BookUnderline(
    val id: Int,
    val userId: Int,
    val ebookId: Int? = null,
    val magazineId: Int? = null,
    val text: String,
    val bookTitle: String? = null,
    val bookCoverUrl: String? = null,
    val page: Int? = null,
    val chapterIndex: Int? = null,
    val paragraphIndex: Int? = null,
    val startOffset: Int? = null,
    val endOffset: Int? = null,
    val cfiRange: String? = null,
    val ideaCount: Int = 0,
    val createdAt: String? = null
) {
    val itemType: ItemType
        get() = when {
            ebookId != null -> ItemType.EBOOK
            magazineId != null -> ItemType.MAGAZINE
            else -> ItemType.EBOOK
        }

    val itemId: Int
        get() = ebookId ?: magazineId ?: 0
}
