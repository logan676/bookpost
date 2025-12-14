package com.bookpost.domain.model

import androidx.compose.ui.graphics.Color
import kotlinx.serialization.Serializable

/**
 * User preferences for reading experience
 * Matches iOS ReaderModels.swift structure
 */
@Serializable
data class ReadingSettings(
    val fontSize: Float = 22f,
    val fontFamily: FontFamily = FontFamily.SYSTEM,
    val colorMode: ColorMode = ColorMode.LIGHT,
    val lineSpacing: LineSpacing = LineSpacing.NORMAL,
    val marginSize: MarginSize = MarginSize.MEDIUM,
    val pageFlipStyle: PageFlipStyle = PageFlipStyle.HORIZONTAL,
    val brightness: Float = 1.0f,
    val keepScreenOn: Boolean = true
) {
    companion object {
        val Default = ReadingSettings()
    }
}

/**
 * Font family options for reading
 */
@Serializable
enum class FontFamily(val displayName: String, val fontName: String?) {
    SYSTEM("System", null),
    SONGTI("宋体", "NotoSerifSC"),
    KAITI("楷体", "NotoSansSC"),
    HEITI("黑体", "NotoSansSC");

    companion object {
        fun fromString(value: String): FontFamily {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: SYSTEM
        }
    }
}

/**
 * Color mode/theme for reading
 */
@Serializable
enum class ColorMode(
    val displayName: String,
    val backgroundColor: Long,
    val textColor: Long
) {
    LIGHT("白色", 0xFFFFFFFF, 0xFF1A1A1A),
    SEPIA("护眼", 0xFFFAF3E0, 0xFF1A1A1A),
    GREEN("绿色", 0xFFE0F2E0, 0xFF1A1A1A),
    DARK("深色", 0xFF1F1F1F, 0xFFE6E6E6);

    fun getBackgroundColor(): Color = Color(backgroundColor)
    fun getTextColor(): Color = Color(textColor)

    companion object {
        fun fromString(value: String): ColorMode {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: LIGHT
        }
    }
}

/**
 * Line spacing options
 */
@Serializable
enum class LineSpacing(val displayName: String, val multiplier: Float) {
    COMPACT("紧凑", 1.2f),
    NORMAL("标准", 1.5f),
    RELAXED("宽松", 1.8f),
    LOOSE("很宽", 2.0f);

    companion object {
        fun fromString(value: String): LineSpacing {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: NORMAL
        }
    }
}

/**
 * Margin size options
 */
@Serializable
enum class MarginSize(
    val displayName: String,
    val horizontalPadding: Int,
    val verticalPadding: Int
) {
    SMALL("小", 16, 20),
    MEDIUM("中", 24, 32),
    LARGE("大", 40, 48);

    companion object {
        fun fromString(value: String): MarginSize {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: MEDIUM
        }
    }
}

/**
 * Page flip animation style
 */
@Serializable
enum class PageFlipStyle(val displayName: String) {
    HORIZONTAL("横向"),
    VERTICAL("纵向"),
    CURL("翻页"),
    FADE("淡入淡出");

    companion object {
        fun fromString(value: String): PageFlipStyle {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: HORIZONTAL
        }
    }
}

/**
 * Highlight color options
 */
@Serializable
enum class HighlightColor(
    val displayName: String,
    val colorValue: Long
) {
    YELLOW("黄色", 0x80FFEB3B),
    GREEN("绿色", 0x804CAF50),
    BLUE("蓝色", 0x802196F3),
    PINK("粉色", 0x80E91E63),
    PURPLE("紫色", 0x809C27B0),
    ORANGE("橙色", 0x80FF9800);

    fun getColor(): Color = Color(colorValue)

    companion object {
        fun fromString(value: String): HighlightColor {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: YELLOW
        }
    }
}

/**
 * Table of Contents item
 */
data class TOCItem(
    val id: String,
    val title: String,
    val level: Int = 0,
    val pageNumber: Int? = null,
    val href: String? = null,
    val children: List<TOCItem> = emptyList()
)

/**
 * Reading position tracking
 */
@Serializable
data class ReadingPosition(
    val bookId: Int,
    val bookType: String,
    val currentPage: Int? = null,
    val totalPages: Int? = null,
    val cfi: String? = null,
    val chapterIndex: Int? = null,
    val chapterTitle: String? = null,
    val progress: Double = 0.0
) {
    val formattedProgress: String
        get() = "${(progress * 100).toInt()}%"

    val pageDisplay: String?
        get() = if (currentPage != null && totalPages != null) {
            "第 $currentPage / $totalPages 页"
        } else null
}

/**
 * Highlight/Underline model for API
 */
@Serializable
data class Highlight(
    val id: Int,
    val bookId: Int,
    val bookType: String,
    val userId: Int,
    val text: String,
    val pageNumber: Int? = null,
    val chapterIndex: Int? = null,
    val paragraphIndex: Int? = null,
    val startOffset: Int? = null,
    val endOffset: Int? = null,
    val cfiRange: String? = null,
    val color: HighlightColor = HighlightColor.YELLOW,
    val note: String? = null,
    val ideaCount: Int = 0,
    val createdAt: String? = null
)

/**
 * Search result within an EPUB
 */
data class SearchResult(
    val text: String,
    val surroundingText: String,
    val chapterIndex: Int,
    val chapterTitle: String? = null,
    val cfi: String? = null,
    val pageNumber: Int? = null
)

/**
 * Search state for EPUB reader
 */
data class SearchState(
    val query: String = "",
    val results: List<SearchResult> = emptyList(),
    val currentIndex: Int = 0,
    val isSearching: Boolean = false,
    val isActive: Boolean = false
) {
    val currentResult: SearchResult?
        get() = results.getOrNull(currentIndex)

    val hasResults: Boolean
        get() = results.isNotEmpty()

    val resultCountText: String
        get() = if (results.isEmpty()) {
            "0 / 0"
        } else {
            "${currentIndex + 1} / ${results.size}"
        }
}

/**
 * EPUB-specific reading state
 */
data class EpubReaderState(
    val isLoading: Boolean = false,
    val title: String? = null,
    val author: String? = null,
    val coverUrl: String? = null,
    val tableOfContents: List<TOCItem> = emptyList(),
    val currentPosition: ReadingPosition? = null,
    val highlights: List<Highlight> = emptyList(),
    val settings: ReadingSettings = ReadingSettings.Default,
    val error: String? = null,
    val downloadProgress: Float = 0f,
    val epubFilePath: String? = null,
    val searchState: SearchState = SearchState()
)
