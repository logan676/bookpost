package com.bookpost.domain.model

data class Bookmark(
    val id: Int,
    val userId: Int,
    val ebookId: Int? = null,
    val magazineId: Int? = null,
    val title: String,
    val page: Int? = null,
    val cfi: String? = null,
    val note: String? = null,
    val createdAt: String? = null
) {
    val contentType: String
        get() = when {
            ebookId != null -> "ebook"
            magazineId != null -> "magazine"
            else -> "unknown"
        }

    val contentId: Int
        get() = ebookId ?: magazineId ?: 0
}
