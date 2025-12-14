package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.BookmarkResponse
import com.bookpost.data.remote.dto.BookmarksResponse
import com.bookpost.data.remote.dto.CreateBookmarkRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface BookmarksApi {

    @GET("/api/ebooks/{id}/bookmarks")
    suspend fun getEbookBookmarks(@Path("id") ebookId: Int): Response<BookmarksResponse>

    @POST("/api/ebooks/{id}/bookmarks")
    suspend fun createEbookBookmark(
        @Path("id") ebookId: Int,
        @Body request: CreateBookmarkRequest
    ): Response<BookmarkResponse>

    @DELETE("/api/ebooks/{id}/bookmarks/{bookmarkId}")
    suspend fun deleteEbookBookmark(
        @Path("id") ebookId: Int,
        @Path("bookmarkId") bookmarkId: Int
    ): Response<Unit>

    @GET("/api/magazines/{id}/bookmarks")
    suspend fun getMagazineBookmarks(@Path("id") magazineId: Int): Response<BookmarksResponse>

    @POST("/api/magazines/{id}/bookmarks")
    suspend fun createMagazineBookmark(
        @Path("id") magazineId: Int,
        @Body request: CreateBookmarkRequest
    ): Response<BookmarkResponse>

    @DELETE("/api/magazines/{id}/bookmarks/{bookmarkId}")
    suspend fun deleteMagazineBookmark(
        @Path("id") magazineId: Int,
        @Path("bookmarkId") bookmarkId: Int
    ): Response<Unit>

    @GET("/api/bookmarks")
    suspend fun getAllBookmarks(
        @Query("type") type: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<BookmarksResponse>
}
