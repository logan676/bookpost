package com.bookpost.data.repository

import com.bookpost.data.remote.api.SocialApi
import com.bookpost.data.remote.dto.ShareQuoteRequest
import com.bookpost.domain.model.ItemType
import com.bookpost.domain.model.PopularUnderline
import com.bookpost.domain.model.QuoteCardStyle
import com.bookpost.domain.model.ShareImageResult
import com.bookpost.util.NetworkResult
import javax.inject.Inject

class SocialRepository @Inject constructor(
    private val socialApi: SocialApi
) {
    /**
     * Get popular underlines for a book/magazine
     */
    suspend fun getPopularUnderlines(
        itemType: ItemType,
        itemId: Int,
        limit: Int? = null,
        offset: Int? = null
    ): NetworkResult<Pair<List<PopularUnderline>, Int>> {
        return try {
            val response = when (itemType) {
                ItemType.EBOOK -> socialApi.getPopularUnderlines(itemId, limit, offset)
                ItemType.MAGAZINE -> socialApi.getMagazinePopularUnderlines(itemId, limit, offset)
                ItemType.BOOK -> socialApi.getPopularUnderlines(itemId, limit, offset)
            }
            if (response.isSuccessful) {
                response.body()?.let { underlinesResponse ->
                    val underlines = underlinesResponse.data.map { it.toDomain() }
                    NetworkResult.Success(Pair(underlines, underlinesResponse.total))
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Like an underline
     */
    suspend fun likeUnderline(underlineId: Int): NetworkResult<Int> {
        return try {
            val response = socialApi.likeUnderline(underlineId)
            if (response.isSuccessful) {
                response.body()?.let { likeResponse ->
                    NetworkResult.Success(likeResponse.likeCount)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Unlike an underline
     */
    suspend fun unlikeUnderline(underlineId: Int): NetworkResult<Int> {
        return try {
            val response = socialApi.unlikeUnderline(underlineId)
            if (response.isSuccessful) {
                response.body()?.let { likeResponse ->
                    NetworkResult.Success(likeResponse.likeCount)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Generate a shareable image for a quote
     */
    suspend fun generateShareImage(
        underlineId: Int,
        style: QuoteCardStyle = QuoteCardStyle.CLASSIC,
        backgroundColor: String? = null,
        textColor: String? = null
    ): NetworkResult<ShareImageResult> {
        return try {
            val request = ShareQuoteRequest(
                underlineId = underlineId,
                style = style.name,
                backgroundColor = backgroundColor,
                textColor = textColor
            )
            val response = socialApi.generateShareImage(underlineId, request)
            if (response.isSuccessful) {
                response.body()?.let { shareResponse ->
                    NetworkResult.Success(shareResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
