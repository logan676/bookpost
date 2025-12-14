package com.bookpost.data.remote.dto

import com.bookpost.domain.model.AudioChapter
import com.bookpost.domain.model.Audiobook
import kotlinx.serialization.Serializable

@Serializable
data class AudiobookResponse(
    val data: AudiobookDto
)

@Serializable
data class AudiobookDto(
    val id: Int,
    val ebookId: Int? = null,
    val title: String,
    val author: String? = null,
    val coverUrl: String? = null,
    val duration: Long = 0L,
    val chapters: List<AudioChapterDto> = emptyList()
) {
    fun toDomain(): Audiobook = Audiobook(
        id = id,
        ebookId = ebookId,
        title = title,
        author = author,
        coverUrl = coverUrl,
        duration = duration,
        chapters = chapters.mapIndexed { index, chapter -> chapter.toDomain(index) }
    )
}

@Serializable
data class AudioChapterDto(
    val id: Int,
    val title: String,
    val audioUrl: String,
    val duration: Long = 0L,
    val startTime: Long = 0L
) {
    fun toDomain(index: Int = 0): AudioChapter = AudioChapter(
        id = id,
        title = title,
        audioUrl = audioUrl,
        duration = duration,
        startTime = startTime,
        index = index
    )
}

@Serializable
data class AudioProgressRequest(
    val chapterIndex: Int,
    val position: Long
)

@Serializable
data class AudioProgressResponse(
    val data: AudioProgressDto
)

@Serializable
data class AudioProgressDto(
    val chapterIndex: Int,
    val position: Long,
    val updatedAt: String? = null
)
