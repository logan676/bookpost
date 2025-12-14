package com.bookpost.data.remote.dto

import com.bookpost.domain.model.AIGuide
import com.bookpost.domain.model.BookOutline
import com.bookpost.domain.model.DictionaryResult
import com.bookpost.domain.model.OutlineSection
import kotlinx.serialization.Serializable

@Serializable
data class AIGuideResponse(
    val data: AIGuideDto
)

@Serializable
data class AIGuideDto(
    val id: Int,
    val ebookId: Int,
    val title: String,
    val summary: String,
    val keyPoints: List<String> = emptyList(),
    val readingTips: List<String> = emptyList(),
    val estimatedReadingTime: String? = null,
    val difficulty: String? = null,
    val createdAt: String? = null
) {
    fun toDomain(): AIGuide = AIGuide(
        id = id,
        ebookId = ebookId,
        title = title,
        summary = summary,
        keyPoints = keyPoints,
        readingTips = readingTips,
        estimatedReadingTime = estimatedReadingTime,
        difficulty = difficulty,
        createdAt = createdAt
    )
}

@Serializable
data class DictionaryResponse(
    val data: DictionaryDto
)

@Serializable
data class DictionaryDto(
    val word: String,
    val phonetic: String? = null,
    val partOfSpeech: String? = null,
    val definition: String,
    val examples: List<String> = emptyList(),
    val synonyms: List<String> = emptyList(),
    val antonyms: List<String> = emptyList(),
    val etymology: String? = null
) {
    fun toDomain(): DictionaryResult = DictionaryResult(
        word = word,
        phonetic = phonetic,
        partOfSpeech = partOfSpeech,
        definition = definition,
        examples = examples,
        synonyms = synonyms,
        antonyms = antonyms,
        etymology = etymology
    )
}

@Serializable
data class BookOutlineResponse(
    val data: BookOutlineDto
)

@Serializable
data class BookOutlineDto(
    val id: Int,
    val ebookId: Int,
    val title: String,
    val sections: List<OutlineSectionDto> = emptyList(),
    val createdAt: String? = null
) {
    fun toDomain(): BookOutline = BookOutline(
        id = id,
        ebookId = ebookId,
        title = title,
        sections = sections.map { it.toDomain() },
        createdAt = createdAt
    )
}

@Serializable
data class OutlineSectionDto(
    val id: Int,
    val title: String,
    val summary: String? = null,
    val level: Int = 0,
    val pageStart: Int? = null,
    val pageEnd: Int? = null,
    val children: List<OutlineSectionDto> = emptyList()
) {
    fun toDomain(): OutlineSection = OutlineSection(
        id = id,
        title = title,
        summary = summary,
        level = level,
        pageStart = pageStart,
        pageEnd = pageEnd,
        children = children.map { it.toDomain() }
    )
}

@Serializable
data class AIQuestionRequest(
    val question: String,
    val context: String? = null
)

@Serializable
data class AIQuestionResponse(
    val data: AIAnswerDto
)

@Serializable
data class AIAnswerDto(
    val id: Int,
    val ebookId: Int,
    val question: String,
    val answer: String,
    val context: String? = null,
    val createdAt: String? = null
)

@Serializable
data class LookupRequest(
    val word: String,
    val context: String? = null
)
