package com.bookpost.domain.model

/**
 * AI Feature types available in the reader
 */
enum class AIFeatureType(val displayName: String, val icon: String) {
    GUIDE("AI 指南", "lightbulb"),
    DICTIONARY("查词", "book"),
    OUTLINE("大纲", "list"),
    QA("问答", "chat")
}

/**
 * AI Guide response containing reading guidance
 */
data class AIGuide(
    val id: Int,
    val ebookId: Int,
    val title: String,
    val summary: String,
    val keyPoints: List<String> = emptyList(),
    val readingTips: List<String> = emptyList(),
    val estimatedReadingTime: String? = null,
    val difficulty: String? = null,
    val createdAt: String? = null
)

/**
 * Dictionary lookup result
 */
data class DictionaryResult(
    val word: String,
    val phonetic: String? = null,
    val partOfSpeech: String? = null,
    val definition: String,
    val examples: List<String> = emptyList(),
    val synonyms: List<String> = emptyList(),
    val antonyms: List<String> = emptyList(),
    val etymology: String? = null
)

/**
 * AI-generated book outline
 */
data class BookOutline(
    val id: Int,
    val ebookId: Int,
    val title: String,
    val sections: List<OutlineSection> = emptyList(),
    val createdAt: String? = null
)

data class OutlineSection(
    val id: Int,
    val title: String,
    val summary: String? = null,
    val level: Int = 0,
    val pageStart: Int? = null,
    val pageEnd: Int? = null,
    val children: List<OutlineSection> = emptyList()
)

/**
 * AI Q&A conversation
 */
data class AIQuestion(
    val id: Int,
    val ebookId: Int,
    val question: String,
    val answer: String? = null,
    val context: String? = null,
    val isLoading: Boolean = false,
    val createdAt: String? = null
)

/**
 * AI Chat message for Q&A
 */
data class AIChatMessage(
    val id: Int,
    val role: ChatRole,
    val content: String,
    val timestamp: String? = null
)

enum class ChatRole {
    USER,
    ASSISTANT
}
