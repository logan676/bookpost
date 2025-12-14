package com.bookpost.ui.screen.bookshelf

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.R
import com.bookpost.domain.model.ItemType
import com.bookpost.domain.model.ReadingHistoryEntry
import com.bookpost.ui.components.BookCoverImage
import com.bookpost.ui.components.EmptyState
import com.bookpost.ui.components.ErrorState
import com.bookpost.ui.components.LoadingState
import com.bookpost.ui.components.SearchBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyBookshelfScreen(
    onBookClick: (Int, String) -> Unit,
    onNavigateToStore: () -> Unit,
    viewModel: MyBookshelfViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.nav_bookshelf)) },
                actions = {
                    IconButton(onClick = { viewModel.toggleViewMode() }) {
                        Icon(
                            imageVector = if (uiState.viewMode == ViewMode.GRID)
                                Icons.AutoMirrored.Filled.ViewList else Icons.Filled.GridView,
                            contentDescription = "Toggle view mode"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = uiState.isLoading,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading && uiState.items.isEmpty() && uiState.readingHistory.isEmpty() -> {
                    LoadingState()
                }
                uiState.error != null && uiState.items.isEmpty() -> {
                    ErrorState(
                        message = uiState.error ?: stringResource(R.string.error),
                        onRetry = { viewModel.refresh() }
                    )
                }
                else -> {
                    Column(
                        modifier = Modifier.fillMaxSize()
                    ) {
                        // Recent reading section (horizontal scroll)
                        if (uiState.readingHistory.isNotEmpty()) {
                            RecentReadingSection(
                                items = uiState.readingHistory,
                                onItemClick = { entry ->
                                    when (entry.itemType) {
                                        ItemType.EBOOK -> onBookClick(entry.itemId, "ebook")
                                        ItemType.MAGAZINE -> onBookClick(entry.itemId, "magazine")
                                        ItemType.BOOK -> { /* TODO */ }
                                    }
                                }
                            )
                        }

                        // Search bar
                        SearchBar(
                            query = uiState.searchQuery,
                            onQueryChange = { viewModel.search(it) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Segmented button for type filter (like iOS)
                        SingleChoiceSegmentedButtonRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                        ) {
                            val tabs = listOf(
                                BookshelfTab.ALL to stringResource(R.string.bookshelf_all),
                                BookshelfTab.EBOOKS to stringResource(R.string.bookshelf_ebooks),
                                BookshelfTab.MAGAZINES to stringResource(R.string.bookshelf_magazines),
                                BookshelfTab.BOOKS to stringResource(R.string.bookshelf_books)
                            )
                            tabs.forEachIndexed { index, (tab, label) ->
                                SegmentedButton(
                                    selected = uiState.selectedTab == tab,
                                    onClick = { viewModel.selectTab(tab) },
                                    shape = SegmentedButtonDefaults.itemShape(
                                        index = index,
                                        count = tabs.size
                                    )
                                ) {
                                    Text(label)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Status filter chips
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState())
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            val statuses = listOf(
                                ReadingStatus.READING to stringResource(R.string.bookshelf_reading),
                                ReadingStatus.WANT_TO_READ to stringResource(R.string.bookshelf_want_to_read),
                                ReadingStatus.FINISHED to stringResource(R.string.bookshelf_finished)
                            )
                            statuses.forEach { (status, label) ->
                                FilterChip(
                                    selected = uiState.selectedStatus == status,
                                    onClick = {
                                        viewModel.selectStatus(
                                            if (uiState.selectedStatus == status) ReadingStatus.ALL else status
                                        )
                                    },
                                    label = { Text(label) }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Books grid or empty state
                        if (uiState.items.isEmpty()) {
                            EmptyBookshelfState(onNavigateToStore = onNavigateToStore)
                        } else {
                            LazyVerticalGrid(
                                columns = if (uiState.viewMode == ViewMode.GRID)
                                    GridCells.Adaptive(minSize = 120.dp)
                                else GridCells.Fixed(1),
                                contentPadding = PaddingValues(16.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                items(uiState.items) { item ->
                                    if (uiState.viewMode == ViewMode.GRID) {
                                        BookshelfGridItem(
                                            item = item,
                                            onClick = { onBookClick(item.id, item.type) }
                                        )
                                    } else {
                                        BookshelfListItem(
                                            item = item,
                                            onClick = { onBookClick(item.id, item.type) }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RecentReadingSection(
    items: List<ReadingHistoryEntry>,
    onItemClick: (ReadingHistoryEntry) -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 16.dp)) {
        Text(
            text = stringResource(R.string.recent_reading),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 16.dp)
        ) {
            items(items) { entry ->
                RecentReadingCard(
                    entry = entry,
                    onClick = { onItemClick(entry) }
                )
            }
        }
    }
}

@Composable
private fun RecentReadingCard(
    entry: ReadingHistoryEntry,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(100.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            BookCoverImage(
                coverUrl = entry.coverUrl,
                contentDescription = entry.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(0.7f)
                    .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
            )
            // Progress indicator
            LinearProgressIndicator(
                progress = { (entry.lastPage?.toFloat() ?: 0f) / 100f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp),
            )
        }
    }
}

@Composable
private fun BookshelfGridItem(
    item: BookshelfItem,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            BookCoverImage(
                coverUrl = item.coverUrl,
                contentDescription = item.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(0.7f)
                    .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
            )

            if (item.progress > 0) {
                LinearProgressIndicator(
                    progress = { item.progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp),
                )
            }

            Column(modifier = Modifier.padding(8.dp)) {
                Text(
                    text = item.title,
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun BookshelfListItem(
    item: BookshelfItem,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            BookCoverImage(
                coverUrl = item.coverUrl,
                contentDescription = item.title,
                modifier = Modifier
                    .width(60.dp)
                    .aspectRatio(0.7f)
                    .clip(RoundedCornerShape(4.dp))
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.title,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                // Display item type as subtitle
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.type.uppercase(),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (item.progress > 0) {
                    Spacer(modifier = Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { item.progress },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyBookshelfState(
    onNavigateToStore: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Text(
                text = stringResource(R.string.empty_bookshelf),
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(onClick = onNavigateToStore) {
                Text(stringResource(R.string.go_to_store))
            }
        }
    }
}
