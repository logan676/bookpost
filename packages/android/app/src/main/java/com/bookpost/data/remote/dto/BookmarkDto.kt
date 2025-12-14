package com.bookpost.data.remote.dto

import com.bookpost.domain.model.Bookmark
import kotlinx.serialization.Serializable

@Serializable
data class BookmarksResponse(
    val data: List<BookmarkDto>,
    val total: Int
)

@Serializable
data class BookmarkResponse(
    val data: BookmarkDto
)

@Serializable
data class BookmarkDto(
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
    fun toDomain(): Bookmark = Bookmark(
        id = id,
        userId = userId,
        ebookId = ebookId,
        magazineId = magazineId,
        title = title,
        page = page,
        cfi = cfi,
        note = note,
        createdAt = createdAt
    )
}

@Serializable
data class CreateBookmarkRequest(
    val title: String,
    val page: Int? = null,
    val cfi: String? = null,
    val note: String? = null
)
