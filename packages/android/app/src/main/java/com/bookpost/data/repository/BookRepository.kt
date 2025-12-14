package com.bookpost.data.repository

import com.bookpost.data.remote.api.BooksApi
import com.bookpost.domain.model.Book
import com.bookpost.util.NetworkResult
import javax.inject.Inject

class BookRepository @Inject constructor(
    private val booksApi: BooksApi
) {
    suspend fun getBooks(
        search: String? = null,
        author: String? = null,
        limit: Int? = null,
        offset: Int? = null
    ): NetworkResult<List<Book>> {
        return try {
            val response = booksApi.getBooks(search, author, limit, offset)
            if (response.isSuccessful) {
                response.body()?.let { booksResponse ->
                    NetworkResult.Success(booksResponse.toBooks())
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getBook(id: Int): NetworkResult<Book> {
        return try {
            val response = booksApi.getBook(id)
            if (response.isSuccessful) {
                response.body()?.let { bookResponse ->
                    bookResponse.getBook()?.let { book ->
                        NetworkResult.Success(book)
                    } ?: NetworkResult.Error("Book not found")
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
