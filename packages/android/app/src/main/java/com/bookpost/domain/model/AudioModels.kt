package com.bookpost.domain.model

/**
 * Represents an audiobook or audio content
 */
data class Audiobook(
    val id: Int,
    val ebookId: Int?,
    val title: String,
    val author: String? = null,
    val coverUrl: String? = null,
    val duration: Long = 0L, // Total duration in milliseconds
    val chapters: List<AudioChapter> = emptyList()
) {
    val formattedDuration: String
        get() = formatDuration(duration)
}

/**
 * Represents a chapter in an audiobook
 */
data class AudioChapter(
    val id: Int,
    val title: String,
    val audioUrl: String,
    val duration: Long = 0L, // Duration in milliseconds
    val startTime: Long = 0L, // Start time in the full audiobook
    val index: Int = 0
) {
    val formattedDuration: String
        get() = formatDuration(duration)
}

/**
 * Playback state for the audio player
 */
data class PlaybackState(
    val isPlaying: Boolean = false,
    val currentChapterIndex: Int = 0,
    val currentPosition: Long = 0L,
    val totalDuration: Long = 0L,
    val playbackSpeed: Float = 1.0f,
    val isBuffering: Boolean = false,
    val sleepTimerMinutes: Int? = null
) {
    val progress: Float
        get() = if (totalDuration > 0) currentPosition.toFloat() / totalDuration else 0f

    val formattedPosition: String
        get() = formatDuration(currentPosition)

    val formattedDuration: String
        get() = formatDuration(totalDuration)
}

/**
 * Audio playback speed options
 */
enum class PlaybackSpeed(val speed: Float, val displayName: String) {
    SPEED_0_5X(0.5f, "0.5x"),
    SPEED_0_75X(0.75f, "0.75x"),
    SPEED_1X(1.0f, "1x"),
    SPEED_1_25X(1.25f, "1.25x"),
    SPEED_1_5X(1.5f, "1.5x"),
    SPEED_1_75X(1.75f, "1.75x"),
    SPEED_2X(2.0f, "2x")
}

/**
 * Sleep timer options
 */
enum class SleepTimerOption(val minutes: Int, val displayName: String) {
    TIMER_5(5, "5 分钟"),
    TIMER_10(10, "10 分钟"),
    TIMER_15(15, "15 分钟"),
    TIMER_30(30, "30 分钟"),
    TIMER_45(45, "45 分钟"),
    TIMER_60(60, "1 小时"),
    END_OF_CHAPTER(0, "本章结束")
}

/**
 * Audio player UI state
 */
data class AudioPlayerUiState(
    val audiobook: Audiobook? = null,
    val playbackState: PlaybackState = PlaybackState(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val showMiniPlayer: Boolean = false
)

/**
 * Format duration in milliseconds to HH:MM:SS or MM:SS string
 */
private fun formatDuration(millis: Long): String {
    val totalSeconds = millis / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60

    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%d:%02d", minutes, seconds)
    }
}
