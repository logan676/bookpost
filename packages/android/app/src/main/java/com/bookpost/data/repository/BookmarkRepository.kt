package com.bookpost.data.repository

import com.bookpost.data.remote.api.BookmarksApi
import com.bookpost.data.remote.dto.CreateBookmarkRequest
import com.bookpost.domain.model.Bookmark
import com.bookpost.util.NetworkResult
import javax.inject.Inject

class BookmarkRepository @Inject constructor(
    private val bookmarksApi: BookmarksApi
) {
    suspend fun getEbookBookmarks(ebookId: Int): NetworkResult<List<Bookmark>> {
        return try {
            val response = bookmarksApi.getEbookBookmarks(ebookId)
            if (response.isSuccessful) {
                response.body()?.let { bookmarksResponse ->
                    NetworkResult.Success(bookmarksResponse.data.map { it.toDomain() })
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun createEbookBookmark(
        ebookId: Int,
        title: String,
        page: Int? = null,
        cfi: String? = null,
        note: String? = null
    ): NetworkResult<Bookmark> {
        return try {
            val response = bookmarksApi.createEbookBookmark(
                ebookId,
                CreateBookmarkRequest(title, page, cfi, note)
            )
            if (response.isSuccessful) {
                response.body()?.let { bookmarkResponse ->
                    NetworkResult.Success(bookmarkResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteEbookBookmark(ebookId: Int, bookmarkId: Int): NetworkResult<Unit> {
        return try {
            val response = bookmarksApi.deleteEbookBookmark(ebookId, bookmarkId)
            if (response.isSuccessful) {
                NetworkResult.Success(Unit)
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getMagazineBookmarks(magazineId: Int): NetworkResult<List<Bookmark>> {
        return try {
            val response = bookmarksApi.getMagazineBookmarks(magazineId)
            if (response.isSuccessful) {
                response.body()?.let { bookmarksResponse ->
                    NetworkResult.Success(bookmarksResponse.data.map { it.toDomain() })
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun createMagazineBookmark(
        magazineId: Int,
        title: String,
        page: Int? = null,
        note: String? = null
    ): NetworkResult<Bookmark> {
        return try {
            val response = bookmarksApi.createMagazineBookmark(
                magazineId,
                CreateBookmarkRequest(title, page, null, note)
            )
            if (response.isSuccessful) {
                response.body()?.let { bookmarkResponse ->
                    NetworkResult.Success(bookmarkResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteMagazineBookmark(magazineId: Int, bookmarkId: Int): NetworkResult<Unit> {
        return try {
            val response = bookmarksApi.deleteMagazineBookmark(magazineId, bookmarkId)
            if (response.isSuccessful) {
                NetworkResult.Success(Unit)
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getAllBookmarks(
        type: String? = null,
        limit: Int? = null,
        offset: Int? = null
    ): NetworkResult<List<Bookmark>> {
        return try {
            val response = bookmarksApi.getAllBookmarks(type, limit, offset)
            if (response.isSuccessful) {
                response.body()?.let { bookmarksResponse ->
                    NetworkResult.Success(bookmarksResponse.data.map { it.toDomain() })
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
