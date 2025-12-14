package com.bookpost.data.remote.dto

import com.bookpost.domain.model.BookUnderline
import kotlinx.serialization.Serializable

@Serializable
data class NotesResponse(
    val data: List<NoteDto>,
    val total: Int
)

@Serializable
data class NoteDto(
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
    val ideaCount: Int? = null,
    val createdAt: String? = null
) {
    fun toDomain(): BookUnderline = BookUnderline(
        id = id,
        userId = userId,
        ebookId = ebookId,
        magazineId = magazineId,
        text = text,
        bookTitle = bookTitle,
        bookCoverUrl = bookCoverUrl,
        page = page,
        chapterIndex = chapterIndex,
        paragraphIndex = paragraphIndex,
        startOffset = startOffset,
        endOffset = endOffset,
        cfiRange = cfiRange,
        ideaCount = ideaCount ?: 0,
        createdAt = createdAt
    )
}
