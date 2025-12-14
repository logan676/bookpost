package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.AudioProgressRequest
import com.bookpost.data.remote.dto.AudioProgressResponse
import com.bookpost.data.remote.dto.AudiobookResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface AudioApi {

    /**
     * Get audiobook details for an ebook
     */
    @GET("/api/ebooks/{id}/audiobook")
    suspend fun getAudiobook(@Path("id") ebookId: Int): Response<AudiobookResponse>

    /**
     * Get last playback position for an audiobook
     */
    @GET("/api/ebooks/{id}/audiobook/progress")
    suspend fun getAudioProgress(@Path("id") ebookId: Int): Response<AudioProgressResponse>

    /**
     * Save playback position for an audiobook
     */
    @POST("/api/ebooks/{id}/audiobook/progress")
    suspend fun saveAudioProgress(
        @Path("id") ebookId: Int,
        @Body request: AudioProgressRequest
    ): Response<AudioProgressResponse>
}
