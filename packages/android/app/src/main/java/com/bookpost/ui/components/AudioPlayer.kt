package com.bookpost.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.bookpost.domain.model.AudioChapter
import com.bookpost.domain.model.Audiobook
import com.bookpost.domain.model.PlaybackSpeed
import com.bookpost.domain.model.PlaybackState
import com.bookpost.domain.model.SleepTimerOption

/**
 * Mini audio player shown at the bottom of screens
 */
@Composable
fun MiniAudioPlayer(
    audiobook: Audiobook,
    playbackState: PlaybackState,
    onPlayPause: () -> Unit,
    onExpand: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onExpand() },
        color = MaterialTheme.colorScheme.surfaceVariant,
        shadowElevation = 8.dp
    ) {
        Column {
            // Progress bar at top
            LinearProgressIndicator(
                progress = { playbackState.progress },
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Cover image
                AsyncImage(
                    model = audiobook.coverUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    contentScale = ContentScale.Crop
                )

                Spacer(modifier = Modifier.width(12.dp))

                // Title and chapter
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = audiobook.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (playbackState.currentChapterIndex < audiobook.chapters.size) {
                        Text(
                            text = audiobook.chapters[playbackState.currentChapterIndex].title,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Play/Pause button
                IconButton(onClick = onPlayPause) {
                    if (playbackState.isBuffering) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            if (playbackState.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (playbackState.isPlaying) "暂停" else "播放",
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }

                // Expand button
                IconButton(onClick = onExpand) {
                    Icon(
                        Icons.Default.KeyboardArrowUp,
                        contentDescription = "展开播放器"
                    )
                }
            }
        }
    }
}

/**
 * Full-screen audio player
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FullAudioPlayer(
    audiobook: Audiobook,
    playbackState: PlaybackState,
    onPlayPause: () -> Unit,
    onSeek: (Float) -> Unit,
    onSkipPrevious: () -> Unit,
    onSkipNext: () -> Unit,
    onRewind: () -> Unit,
    onForward: () -> Unit,
    onSpeedChange: (PlaybackSpeed) -> Unit,
    onSleepTimerSet: (SleepTimerOption?) -> Unit,
    onChapterSelect: (Int) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showSpeedSheet by remember { mutableStateOf(false) }
    var showSleepTimerSheet by remember { mutableStateOf(false) }
    var showChapterList by remember { mutableStateOf(false) }

    val speedSheetState = rememberModalBottomSheetState()
    val sleepTimerSheetState = rememberModalBottomSheetState()
    val chapterListSheetState = rememberModalBottomSheetState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("正在播放") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // Cover image
            Card(
                modifier = Modifier.size(280.dp),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                AsyncImage(
                    model = audiobook.coverUrl,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Title and author
            Text(
                text = audiobook.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            audiobook.author?.let { author ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = author,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Current chapter (clickable to show chapter list)
            if (playbackState.currentChapterIndex < audiobook.chapters.size) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = audiobook.chapters[playbackState.currentChapterIndex].title,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clickable { showChapterList = true }
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            // Progress slider
            Column(modifier = Modifier.fillMaxWidth()) {
                Slider(
                    value = playbackState.progress,
                    onValueChange = onSeek,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = playbackState.formattedPosition,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = playbackState.formattedDuration,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Playback controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onSkipPrevious) {
                    Icon(
                        Icons.Default.SkipPrevious,
                        contentDescription = "上一章",
                        modifier = Modifier.size(32.dp)
                    )
                }
                IconButton(onClick = onRewind) {
                    Icon(
                        Icons.Default.Replay10,
                        contentDescription = "快退10秒",
                        modifier = Modifier.size(32.dp)
                    )
                }
                // Large play/pause button
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .size(72.dp)
                        .clickable { onPlayPause() }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (playbackState.isBuffering) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(36.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Icon(
                                if (playbackState.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (playbackState.isPlaying) "暂停" else "播放",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(40.dp)
                            )
                        }
                    }
                }
                IconButton(onClick = onForward) {
                    Icon(
                        Icons.Default.Forward10,
                        contentDescription = "快进10秒",
                        modifier = Modifier.size(32.dp)
                    )
                }
                IconButton(onClick = onSkipNext) {
                    Icon(
                        Icons.Default.SkipNext,
                        contentDescription = "下一章",
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Speed and sleep timer buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.clickable { showSpeedSheet = true }
                ) {
                    Icon(
                        Icons.Default.Speed,
                        contentDescription = "倍速",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${playbackState.playbackSpeed}x",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.clickable { showSleepTimerSheet = true }
                ) {
                    Icon(
                        Icons.Default.Bedtime,
                        contentDescription = "睡眠定时",
                        tint = if (playbackState.sleepTimerMinutes != null)
                            MaterialTheme.colorScheme.primary
                        else
                            MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = playbackState.sleepTimerMinutes?.let { "${it}分钟" } ?: "定时",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (playbackState.sleepTimerMinutes != null)
                            MaterialTheme.colorScheme.primary
                        else
                            MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // Speed selection bottom sheet
    if (showSpeedSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSpeedSheet = false },
            sheetState = speedSheetState
        ) {
            SpeedSelectionSheet(
                currentSpeed = playbackState.playbackSpeed,
                onSpeedSelect = { speed ->
                    onSpeedChange(speed)
                    showSpeedSheet = false
                }
            )
        }
    }

    // Sleep timer bottom sheet
    if (showSleepTimerSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSleepTimerSheet = false },
            sheetState = sleepTimerSheetState
        ) {
            SleepTimerSheet(
                currentTimer = playbackState.sleepTimerMinutes,
                onTimerSelect = { timer ->
                    onSleepTimerSet(timer)
                    showSleepTimerSheet = false
                }
            )
        }
    }

    // Chapter list bottom sheet
    if (showChapterList) {
        ModalBottomSheet(
            onDismissRequest = { showChapterList = false },
            sheetState = chapterListSheetState
        ) {
            ChapterListSheet(
                chapters = audiobook.chapters,
                currentChapterIndex = playbackState.currentChapterIndex,
                onChapterSelect = { index ->
                    onChapterSelect(index)
                    showChapterList = false
                }
            )
        }
    }
}

@Composable
private fun SpeedSelectionSheet(
    currentSpeed: Float,
    onSpeedSelect: (PlaybackSpeed) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "播放速度",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(16.dp))

        PlaybackSpeed.entries.forEach { speed ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSpeedSelect(speed) }
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = speed.displayName,
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (currentSpeed == speed.speed)
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.onSurface
                )
                if (currentSpeed == speed.speed) {
                    Text(
                        text = "✓",
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun SleepTimerSheet(
    currentTimer: Int?,
    onTimerSelect: (SleepTimerOption?) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "睡眠定时",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(16.dp))

        // Cancel option if timer is set
        if (currentTimer != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onTimerSelect(null) }
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "取消定时",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }

        SleepTimerOption.entries.forEach { option ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onTimerSelect(option) }
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = option.displayName,
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (currentTimer == option.minutes)
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.onSurface
                )
                if (currentTimer == option.minutes) {
                    Text(
                        text = "✓",
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun ChapterListSheet(
    chapters: List<AudioChapter>,
    currentChapterIndex: Int,
    onChapterSelect: (Int) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "章节列表",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(
            modifier = Modifier.height(400.dp)
        ) {
            itemsIndexed(chapters) { index, chapter ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onChapterSelect(index) }
                        .background(
                            if (index == currentChapterIndex)
                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                            else
                                Color.Transparent
                        )
                        .padding(vertical = 12.dp, horizontal = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = chapter.title,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (index == currentChapterIndex)
                            MaterialTheme.colorScheme.primary
                        else
                            MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = chapter.formattedDuration,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
