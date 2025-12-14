package com.bookpost.data.repository

import com.bookpost.data.remote.api.AudioApi
import com.bookpost.data.remote.dto.AudioProgressRequest
import com.bookpost.domain.model.Audiobook
import com.bookpost.util.NetworkResult
import javax.inject.Inject

class AudioRepository @Inject constructor(
    private val audioApi: AudioApi
) {
    /**
     * Get audiobook details for an ebook
     */
    suspend fun getAudiobook(ebookId: Int): NetworkResult<Audiobook> {
        return try {
            val response = audioApi.getAudiobook(ebookId)
            if (response.isSuccessful) {
                response.body()?.let { audioResponse ->
                    NetworkResult.Success(audioResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else if (response.code() == 404) {
                NetworkResult.Error("此书籍暂无音频版本", 404)
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Get last playback position
     */
    suspend fun getAudioProgress(ebookId: Int): NetworkResult<Pair<Int, Long>> {
        return try {
            val response = audioApi.getAudioProgress(ebookId)
            if (response.isSuccessful) {
                response.body()?.let { progressResponse ->
                    NetworkResult.Success(
                        Pair(progressResponse.data.chapterIndex, progressResponse.data.position)
                    )
                } ?: NetworkResult.Success(Pair(0, 0L))
            } else {
                NetworkResult.Success(Pair(0, 0L))
            }
        } catch (e: Exception) {
            NetworkResult.Success(Pair(0, 0L))
        }
    }

    /**
     * Save playback position
     */
    suspend fun saveAudioProgress(
        ebookId: Int,
        chapterIndex: Int,
        position: Long
    ): NetworkResult<Unit> {
        return try {
            val request = AudioProgressRequest(
                chapterIndex = chapterIndex,
                position = position
            )
            val response = audioApi.saveAudioProgress(ebookId, request)
            if (response.isSuccessful) {
                NetworkResult.Success(Unit)
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
