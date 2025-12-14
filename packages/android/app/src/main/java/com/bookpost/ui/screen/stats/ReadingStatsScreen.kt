package com.bookpost.ui.screen.stats

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Create
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.FormatUnderlined
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.domain.model.CalendarDay
import com.bookpost.domain.model.CalendarStatsResponse
import com.bookpost.domain.model.DayDuration
import com.bookpost.domain.model.MonthDuration
import com.bookpost.domain.model.ReadingMilestone
import com.bookpost.domain.model.ReadingRecords
import com.bookpost.domain.model.StatsDimension
import com.bookpost.domain.model.TotalStatsResponse
import com.bookpost.domain.model.WeekStatsResponse
import com.bookpost.domain.model.YearStatsResponse

private val OrangeAccent = Color(0xFFFF9800)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReadingStatsScreen(
    onNavigateBack: () -> Unit,
    viewModel: ReadingStatsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("阅读统计") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = uiState.isLoading,
            onRefresh = { viewModel.loadStats() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { Spacer(modifier = Modifier.height(8.dp)) }

                // Dimension picker
                item {
                    DimensionPicker(
                        selectedDimension = uiState.selectedDimension,
                        onDimensionSelected = { viewModel.setDimension(it) }
                    )
                }

                // Date navigator (except for total)
                if (uiState.selectedDimension != StatsDimension.TOTAL) {
                    item {
                        DateNavigator(
                            dateText = uiState.dateRangeText,
                            onPrevious = { viewModel.goToPreviousPeriod() },
                            onNext = { viewModel.goToNextPeriod() }
                        )
                    }
                }

                // Content based on dimension
                item {
                    when (uiState.selectedDimension) {
                        StatsDimension.WEEK -> WeekStatsContent(uiState.weekStats, uiState.isLoading)
                        StatsDimension.MONTH -> MonthStatsContent(uiState.monthStats, uiState.isLoading)
                        StatsDimension.YEAR -> YearStatsContent(uiState.yearStats, uiState.isLoading)
                        StatsDimension.TOTAL -> TotalStatsContent(uiState.totalStats, uiState.isLoading)
                        StatsDimension.CALENDAR -> CalendarStatsContent(uiState.calendarStats, uiState.isLoading)
                    }
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
private fun DimensionPicker(
    selectedDimension: StatsDimension,
    onDimensionSelected: (StatsDimension) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        StatsDimension.entries.forEach { dimension ->
            FilterChip(
                selected = selectedDimension == dimension,
                onClick = { onDimensionSelected(dimension) },
                label = { Text(dimension.displayName, fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = OrangeAccent,
                    selectedLabelColor = Color.White
                ),
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun DateNavigator(
    dateText: String,
    onPrevious: () -> Unit,
    onNext: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onPrevious) {
            Icon(Icons.Default.ChevronLeft, contentDescription = "上一个")
        }

        Text(
            text = dateText,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        IconButton(onClick = onNext) {
            Icon(Icons.Default.ChevronRight, contentDescription = "下一个")
        }
    }
}

// MARK: - Week Stats Content
@Composable
private fun WeekStatsContent(stats: WeekStatsResponse?, isLoading: Boolean) {
    if (stats != null) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            // Summary card
            SummaryCard(
                title = "本周",
                duration = stats.summary.formattedTotalDuration,
                average = "日均 ${stats.summary.formattedDailyAverage}",
                change = stats.summary.comparisonChangeText,
                isPositiveChange = stats.summary.isPositiveChange,
                ranking = stats.summary.friendRanking?.let { "好友排名 #$it" }
            )

            // Duration chart
            DurationChart(data = stats.durationByDay)

            // Reading records
            RecordsCard(records = stats.readingRecords)
        }
    } else if (isLoading) {
        LoadingIndicator()
    } else {
        NoDataText()
    }
}

// MARK: - Month Stats Content
@Composable
private fun MonthStatsContent(stats: WeekStatsResponse?, isLoading: Boolean) {
    if (stats != null) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            SummaryCard(
                title = "本月",
                duration = stats.summary.formattedTotalDuration,
                average = "日均 ${stats.summary.formattedDailyAverage}",
                change = stats.summary.comparisonChangeText,
                isPositiveChange = stats.summary.isPositiveChange,
                ranking = null
            )

            RecordsCard(records = stats.readingRecords)
        }
    } else if (isLoading) {
        LoadingIndicator()
    } else {
        NoDataText()
    }
}

// MARK: - Year Stats Content
@Composable
private fun YearStatsContent(stats: YearStatsResponse?, isLoading: Boolean) {
    if (stats != null) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            // Year summary card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "阅读了 ${stats.summary.totalHours} 小时",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "共 ${stats.summary.totalReadingDays} 天有阅读",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Monthly chart
            MonthlyChart(data = stats.durationByMonth)
        }
    } else if (isLoading) {
        LoadingIndicator()
    } else {
        NoDataText()
    }
}

// MARK: - Total Stats Content
@Composable
private fun TotalStatsContent(stats: TotalStatsResponse?, isLoading: Boolean) {
    if (stats != null) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            // Total duration
            StatCard(
                title = "总阅读时长",
                value = "${stats.summary.totalHours}",
                unit = "小时",
                icon = Icons.Default.Schedule
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    title = "阅读天数",
                    value = "${stats.summary.totalDays}",
                    unit = "天",
                    icon = Icons.Default.CalendarMonth,
                    modifier = Modifier.weight(1f)
                )

                StatCard(
                    title = "当前连续",
                    value = "${stats.summary.currentStreak}",
                    unit = "天",
                    icon = Icons.Default.LocalFireDepartment,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    title = "最长连续",
                    value = "${stats.summary.longestStreak}",
                    unit = "天",
                    icon = Icons.Default.EmojiEvents,
                    modifier = Modifier.weight(1f)
                )

                StatCard(
                    title = "读完本数",
                    value = "${stats.summary.booksFinished}",
                    unit = "本",
                    icon = Icons.Default.Book,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    } else if (isLoading) {
        LoadingIndicator()
    } else {
        NoDataText()
    }
}

// MARK: - Calendar Stats Content
@Composable
private fun CalendarStatsContent(stats: CalendarStatsResponse?, isLoading: Boolean) {
    if (stats != null) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            // Calendar grid
            CalendarGrid(days = stats.calendarDays)

            // Milestones
            if (stats.milestones.isNotEmpty()) {
                MilestonesSection(milestones = stats.milestones)
            }
        }
    } else if (isLoading) {
        LoadingIndicator()
    } else {
        NoDataText()
    }
}

// MARK: - Reusable Components

@Composable
private fun SummaryCard(
    title: String,
    duration: String,
    average: String,
    change: String,
    isPositiveChange: Boolean,
    ranking: String?
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = duration,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = change,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isPositiveChange) Color(0xFF4CAF50) else Color(0xFFF44336)
                    )
                    ranking?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = average,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun DurationChart(data: List<DayDuration>) {
    val maxDuration = data.maxOfOrNull { it.duration } ?: 1

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "阅读时长分布",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.Bottom
            ) {
                data.forEach { day ->
                    val heightRatio = if (maxDuration > 0) {
                        day.duration.toFloat() / maxDuration
                    } else 0f
                    val barHeight = (heightRatio * 100).coerceAtLeast(4f)

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .width(36.dp)
                                .height(barHeight.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(
                                    if (day.duration > 0) OrangeAccent
                                    else Color.Gray.copy(alpha = 0.3f)
                                )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = day.dayOfWeek.take(1),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RecordsCard(records: ReadingRecords) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            RecordItem(
                value = "${records.booksRead}",
                label = "阅读书籍",
                icon = Icons.AutoMirrored.Filled.MenuBook
            )
            VerticalDivider()
            RecordItem(
                value = "${records.readingDays}",
                label = "阅读天数",
                icon = Icons.Default.CalendarMonth
            )
            VerticalDivider()
            RecordItem(
                value = "${records.highlightsCount}",
                label = "划线",
                icon = Icons.Filled.FormatUnderlined
            )
            VerticalDivider()
            RecordItem(
                value = "${records.notesCount}",
                label = "想法",
                icon = Icons.Default.Create
            )
        }
    }
}

@Composable
private fun RecordItem(
    value: String,
    label: String,
    icon: ImageVector
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = OrangeAccent,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun VerticalDivider() {
    Divider(
        modifier = Modifier
            .height(40.dp)
            .width(1.dp)
    )
}

@Composable
private fun StatCard(
    title: String,
    value: String,
    unit: String,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = OrangeAccent,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    text = value,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = unit,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 2.dp, start = 2.dp)
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun MonthlyChart(data: List<MonthDuration>) {
    val maxDuration = data.maxOfOrNull { it.duration } ?: 1

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "月度趋势",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.Bottom
            ) {
                data.forEach { month ->
                    val heightRatio = if (maxDuration > 0) {
                        month.duration.toFloat() / maxDuration
                    } else 0f
                    val barHeight = (heightRatio * 80).coerceAtLeast(4f)

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .width(20.dp)
                                .height(barHeight.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(
                                    if (month.duration > 0) OrangeAccent
                                    else Color.Gray.copy(alpha = 0.3f)
                                )
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "${month.month}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CalendarGrid(days: List<CalendarDay>) {
    val weekdays = listOf("一", "二", "三", "四", "五", "六", "日")

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Week day headers
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                weekdays.forEach { day ->
                    Text(
                        text = day,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Calendar grid - using chunked to create rows of 7
            val rows = days.chunked(7)
            rows.forEach { week ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    week.forEach { day ->
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .padding(2.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (day.hasReading) OrangeAccent
                                        else Color.Gray.copy(alpha = 0.2f)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "${day.dayNumber}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (day.hasReading) Color.White
                                    else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                    // Fill remaining slots if week is incomplete
                    repeat(7 - week.size) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun MilestonesSection(milestones: List<ReadingMilestone>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "本月里程碑",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(12.dp))

            milestones.forEach { milestone ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(OrangeAccent)
                    )

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = milestone.title,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        milestone.date?.let { date ->
                            Text(
                                text = date,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LoadingIndicator() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(color = OrangeAccent)
    }
}

@Composable
private fun NoDataText() {
    Text(
        text = "暂无数据",
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        textAlign = TextAlign.Center
    )
}
