package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.LikeUnderlineResponse
import com.bookpost.data.remote.dto.PopularUnderlinesResponse
import com.bookpost.data.remote.dto.ShareImageResponse
import com.bookpost.data.remote.dto.ShareQuoteRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface SocialApi {

    /**
     * Get popular underlines/highlights for an ebook
     */
    @GET("/api/ebooks/{id}/popular-underlines")
    suspend fun getPopularUnderlines(
        @Path("id") ebookId: Int,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<PopularUnderlinesResponse>

    /**
     * Get popular underlines/highlights for a magazine
     */
    @GET("/api/magazines/{id}/popular-underlines")
    suspend fun getMagazinePopularUnderlines(
        @Path("id") magazineId: Int,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<PopularUnderlinesResponse>

    /**
     * Like an underline/highlight
     */
    @POST("/api/underlines/{id}/like")
    suspend fun likeUnderline(@Path("id") underlineId: Int): Response<LikeUnderlineResponse>

    /**
     * Unlike an underline/highlight
     */
    @DELETE("/api/underlines/{id}/like")
    suspend fun unlikeUnderline(@Path("id") underlineId: Int): Response<LikeUnderlineResponse>

    /**
     * Generate a shareable image for a quote
     */
    @POST("/api/underlines/{id}/share")
    suspend fun generateShareImage(
        @Path("id") underlineId: Int,
        @Body request: ShareQuoteRequest
    ): Response<ShareImageResponse>
}
