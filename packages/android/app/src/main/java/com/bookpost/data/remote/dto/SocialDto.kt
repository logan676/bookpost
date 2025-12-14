package com.bookpost.data.remote.dto

import com.bookpost.domain.model.PopularUnderline
import com.bookpost.domain.model.QuoteCardStyle
import com.bookpost.domain.model.ShareImageResult
import com.bookpost.domain.model.ShareableQuote
import kotlinx.serialization.Serializable

@Serializable
data class PopularUnderlinesResponse(
    val data: List<PopularUnderlineDto>,
    val total: Int = 0
)

@Serializable
data class PopularUnderlineDto(
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
    fun toDomain(): PopularUnderline = PopularUnderline(
        id = id,
        text = text,
        userId = userId,
        userName = userName,
        userAvatarUrl = userAvatarUrl,
        ebookId = ebookId,
        magazineId = magazineId,
        chapterTitle = chapterTitle,
        likeCount = likeCount,
        isLiked = isLiked,
        createdAt = createdAt
    )
}

@Serializable
data class ShareQuoteRequest(
    val underlineId: Int,
    val style: String = "CLASSIC",
    val backgroundColor: String? = null,
    val textColor: String? = null
)

@Serializable
data class ShareImageResponse(
    val data: ShareImageDto
)

@Serializable
data class ShareImageDto(
    val imageUrl: String,
    val expiresAt: String? = null
) {
    fun toDomain(): ShareImageResult = ShareImageResult(
        imageUrl = imageUrl,
        expiresAt = expiresAt
    )
}

@Serializable
data class LikeUnderlineResponse(
    val success: Boolean,
    val likeCount: Int = 0
)
