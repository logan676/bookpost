package com.bookpost.ui.screen.store

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.R
import com.bookpost.ui.components.BookCoverCard
import com.bookpost.ui.components.EmptyState
import com.bookpost.ui.components.ErrorState
import com.bookpost.ui.components.LoadingState
import com.bookpost.ui.components.SearchBar

enum class StoreTab {
    EBOOKS, MAGAZINES
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoreScreen(
    onEbookClick: (Int) -> Unit,
    onMagazineClick: (Int) -> Unit,
    viewModel: StoreViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.nav_store)) }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Tab selector for Ebooks/Magazines (like iOS internal picker)
            SingleChoiceSegmentedButtonRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                SegmentedButton(
                    selected = uiState.selectedTab == StoreTab.EBOOKS,
                    onClick = { viewModel.selectTab(StoreTab.EBOOKS) },
                    shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2)
                ) {
                    Text(stringResource(R.string.store_ebooks))
                }
                SegmentedButton(
                    selected = uiState.selectedTab == StoreTab.MAGAZINES,
                    onClick = { viewModel.selectTab(StoreTab.MAGAZINES) },
                    shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2)
                ) {
                    Text(stringResource(R.string.store_magazines))
                }
            }

            // Search bar
            SearchBar(
                query = uiState.searchQuery,
                onQueryChange = { viewModel.search(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Category chips for ebooks
            if (uiState.selectedTab == StoreTab.EBOOKS && uiState.categories.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = uiState.selectedCategoryId == null,
                        onClick = { viewModel.selectCategory(null) },
                        label = { Text(stringResource(R.string.all_categories)) }
                    )
                    uiState.categories.forEach { category ->
                        FilterChip(
                            selected = uiState.selectedCategoryId == category.id,
                            onClick = { viewModel.selectCategory(category.id) },
                            label = { Text("${category.name} (${category.count})") }
                        )
                    }
                }
            }

            // Publisher chips for magazines
            if (uiState.selectedTab == StoreTab.MAGAZINES && uiState.publishers.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = uiState.selectedPublisherId == null,
                        onClick = { viewModel.selectPublisher(null) },
                        label = { Text(stringResource(R.string.all_publishers)) }
                    )
                    uiState.publishers.forEach { publisher ->
                        FilterChip(
                            selected = uiState.selectedPublisherId == publisher.id,
                            onClick = { viewModel.selectPublisher(publisher.id) },
                            label = { Text("${publisher.name} (${publisher.count})") }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Count display
            Text(
                text = if (uiState.selectedTab == StoreTab.EBOOKS)
                    String.format(stringResource(R.string.ebook_count), uiState.totalEbooks)
                else
                    String.format(stringResource(R.string.magazine_count), uiState.totalMagazines),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Content grid
            PullToRefreshBox(
                isRefreshing = uiState.isLoading,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize()
            ) {
                when {
                    uiState.isLoading && uiState.displayItems.isEmpty() -> {
                        LoadingState()
                    }
                    uiState.error != null && uiState.displayItems.isEmpty() -> {
                        ErrorState(
                            message = uiState.error ?: stringResource(R.string.error),
                            onRetry = { viewModel.refresh() }
                        )
                    }
                    uiState.displayItems.isEmpty() -> {
                        EmptyState()
                    }
                    else -> {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 150.dp),
                            contentPadding = PaddingValues(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(uiState.displayItems) { item ->
                                BookCoverCard(
                                    title = item.title,
                                    coverUrl = item.coverUrl,
                                    subtitle = item.subtitle,
                                    onClick = {
                                        if (uiState.selectedTab == StoreTab.EBOOKS) {
                                            onEbookClick(item.id)
                                        } else {
                                            onMagazineClick(item.id)
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
