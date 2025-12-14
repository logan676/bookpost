package com.bookpost.data.remote.dto

import com.bookpost.domain.model.BlogPost
import com.bookpost.domain.model.Book
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class BookDto(
    val id: Int,
    val title: String,
    val author: String,
    @SerialName("cover_url")
    val coverUrl: String? = null,
    @SerialName("cover_photo_url")
    val coverPhotoUrl: String? = null,
    val isbn: String? = null,
    val publisher: String? = null,
    @SerialName("publish_year")
    val publishYear: Int? = null,
    val description: String? = null,
    @SerialName("page_count")
    val pageCount: Int? = null,
    val categories: String? = null,
    val language: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null,
    val posts: List<BlogPostDto>? = null
) {
    fun toDomain(): Book = Book(
        id = id,
        title = title,
        author = author,
        coverUrl = coverUrl,
        coverPhotoUrl = coverPhotoUrl,
        isbn = isbn,
        publisher = publisher,
        publishYear = publishYear,
        description = description,
        pageCount = pageCount,
        categories = categories,
        language = language,
        createdAt = createdAt,
        posts = posts?.map { it.toDomain() } ?: emptyList()
    )
}

@Serializable
data class BlogPostDto(
    val id: Int,
    @SerialName("book_id")
    val bookId: Int,
    val title: String,
    val content: String,
    @SerialName("page_photo_url")
    val pagePhotoUrl: String? = null,
    @SerialName("page_number")
    val pageNumber: Int? = null,
    @SerialName("extracted_text")
    val extractedText: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null,
    @SerialName("book_title")
    val bookTitle: String? = null,
    @SerialName("book_author")
    val bookAuthor: String? = null
) {
    fun toDomain(): BlogPost = BlogPost(
        id = id,
        bookId = bookId,
        title = title,
        content = content,
        pagePhotoUrl = pagePhotoUrl,
        pageNumber = pageNumber,
        extractedText = extractedText,
        createdAt = createdAt,
        bookTitle = bookTitle,
        bookAuthor = bookAuthor
    )
}

@Serializable
data class BooksResponse(
    val data: List<BookDto>? = null,
    val books: List<BookDto>? = null
) {
    fun toBooks(): List<Book> = (data ?: books ?: emptyList()).map { it.toDomain() }
}

@Serializable
data class BookResponse(
    val data: BookDto? = null,
    val book: BookDto? = null
) {
    fun getBook(): Book? = (data ?: book)?.toDomain()
}
