package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.NotesResponse
import retrofit2.Response
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface NotesApi {

    @GET("/api/user/notes")
    suspend fun getUserNotes(
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<NotesResponse>

    @DELETE("/api/ebooks/{ebookId}/underlines/{underlineId}")
    suspend fun deleteEbookNote(
        @Path("ebookId") ebookId: Int,
        @Path("underlineId") underlineId: Int
    ): Response<Unit>

    @DELETE("/api/magazines/{magazineId}/underlines/{underlineId}")
    suspend fun deleteMagazineNote(
        @Path("magazineId") magazineId: Int,
        @Path("underlineId") underlineId: Int
    ): Response<Unit>
}
