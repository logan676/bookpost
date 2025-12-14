package com.bookpost.data.repository

import com.bookpost.data.remote.api.NotesApi
import com.bookpost.domain.model.BookUnderline
import com.bookpost.domain.model.ItemType
import com.bookpost.util.NetworkResult
import javax.inject.Inject

class NoteRepository @Inject constructor(
    private val notesApi: NotesApi
) {
    suspend fun getUserNotes(
        limit: Int? = null,
        offset: Int? = null
    ): NetworkResult<Pair<List<BookUnderline>, Int>> {
        return try {
            val response = notesApi.getUserNotes(limit, offset)
            if (response.isSuccessful) {
                response.body()?.let { notesResponse ->
                    val notes = notesResponse.data.map { it.toDomain() }
                    NetworkResult.Success(Pair(notes, notesResponse.total))
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteNote(note: BookUnderline): NetworkResult<Unit> {
        return try {
            val response = when (note.itemType) {
                ItemType.EBOOK -> notesApi.deleteEbookNote(note.ebookId!!, note.id)
                ItemType.MAGAZINE -> notesApi.deleteMagazineNote(note.magazineId!!, note.id)
                ItemType.BOOK -> notesApi.deleteEbookNote(note.ebookId!!, note.id) // BOOK treated as EBOOK
            }
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
