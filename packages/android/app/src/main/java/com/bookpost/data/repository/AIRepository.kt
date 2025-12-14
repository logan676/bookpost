package com.bookpost.data.repository

import com.bookpost.data.remote.api.AIApi
import com.bookpost.data.remote.dto.AIQuestionRequest
import com.bookpost.data.remote.dto.LookupRequest
import com.bookpost.domain.model.AIGuide
import com.bookpost.domain.model.BookOutline
import com.bookpost.domain.model.DictionaryResult
import com.bookpost.util.NetworkResult
import javax.inject.Inject

class AIRepository @Inject constructor(
    private val aiApi: AIApi
) {
    /**
     * Get AI reading guide for an ebook
     */
    suspend fun getAIGuide(ebookId: Int): NetworkResult<AIGuide> {
        return try {
            val response = aiApi.getAIGuide(ebookId)
            if (response.isSuccessful) {
                response.body()?.let { guideResponse ->
                    NetworkResult.Success(guideResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else if (response.code() == 404) {
                // Guide not generated yet, try to generate
                generateAIGuide(ebookId)
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Generate AI reading guide for an ebook
     */
    suspend fun generateAIGuide(ebookId: Int): NetworkResult<AIGuide> {
        return try {
            val response = aiApi.generateAIGuide(ebookId)
            if (response.isSuccessful) {
                response.body()?.let { guideResponse ->
                    NetworkResult.Success(guideResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Get AI-generated outline for an ebook
     */
    suspend fun getBookOutline(ebookId: Int): NetworkResult<BookOutline> {
        return try {
            val response = aiApi.getBookOutline(ebookId)
            if (response.isSuccessful) {
                response.body()?.let { outlineResponse ->
                    NetworkResult.Success(outlineResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else if (response.code() == 404) {
                // Outline not generated yet, try to generate
                generateBookOutline(ebookId)
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Generate AI outline for an ebook
     */
    suspend fun generateBookOutline(ebookId: Int): NetworkResult<BookOutline> {
        return try {
            val response = aiApi.generateBookOutline(ebookId)
            if (response.isSuccessful) {
                response.body()?.let { outlineResponse ->
                    NetworkResult.Success(outlineResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Look up a word with AI-enhanced definitions
     */
    suspend fun lookupWord(word: String, context: String? = null): NetworkResult<DictionaryResult> {
        return try {
            val request = LookupRequest(word = word, context = context)
            val response = aiApi.lookupWord(request)
            if (response.isSuccessful) {
                response.body()?.let { dictResponse ->
                    NetworkResult.Success(dictResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Ask a question about the book content
     */
    suspend fun askQuestion(
        ebookId: Int,
        question: String,
        context: String? = null
    ): NetworkResult<String> {
        return try {
            val request = AIQuestionRequest(question = question, context = context)
            val response = aiApi.askQuestion(ebookId, request)
            if (response.isSuccessful) {
                response.body()?.let { answerResponse ->
                    NetworkResult.Success(answerResponse.data.answer)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
