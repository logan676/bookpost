package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.AIGuideResponse
import com.bookpost.data.remote.dto.AIQuestionRequest
import com.bookpost.data.remote.dto.AIQuestionResponse
import com.bookpost.data.remote.dto.BookOutlineResponse
import com.bookpost.data.remote.dto.DictionaryResponse
import com.bookpost.data.remote.dto.LookupRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface AIApi {

    /**
     * Get AI-generated reading guide for an ebook
     */
    @GET("/api/ebooks/{id}/ai/guide")
    suspend fun getAIGuide(@Path("id") ebookId: Int): Response<AIGuideResponse>

    /**
     * Generate AI guide if not exists
     */
    @POST("/api/ebooks/{id}/ai/guide")
    suspend fun generateAIGuide(@Path("id") ebookId: Int): Response<AIGuideResponse>

    /**
     * Get AI-generated outline for an ebook
     */
    @GET("/api/ebooks/{id}/ai/outline")
    suspend fun getBookOutline(@Path("id") ebookId: Int): Response<BookOutlineResponse>

    /**
     * Generate AI outline if not exists
     */
    @POST("/api/ebooks/{id}/ai/outline")
    suspend fun generateBookOutline(@Path("id") ebookId: Int): Response<BookOutlineResponse>

    /**
     * Look up a word with AI-enhanced definitions
     */
    @POST("/api/ai/lookup")
    suspend fun lookupWord(@Body request: LookupRequest): Response<DictionaryResponse>

    /**
     * Ask a question about the book content
     */
    @POST("/api/ebooks/{id}/ai/ask")
    suspend fun askQuestion(
        @Path("id") ebookId: Int,
        @Body request: AIQuestionRequest
    ): Response<AIQuestionResponse>
}
