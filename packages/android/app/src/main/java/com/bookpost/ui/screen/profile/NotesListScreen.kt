package com.bookpost.ui.screen.profile

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Notes
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.bookpost.R
import com.bookpost.domain.model.BookUnderline
import com.bookpost.ui.components.ErrorState
import com.bookpost.ui.components.LoadingState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesListScreen(
    onNavigateBack: () -> Unit,
    onNoteClick: (BookUnderline) -> Unit = {},
    viewModel: NotesListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    var noteToDelete by remember { mutableStateOf<BookUnderline?>(null) }

    // Pagination trigger
    val shouldLoadMore by remember {
        derivedStateOf {
            val lastVisibleItem = listState.layoutInfo.visibleItemsInfo.lastOrNull()
            lastVisibleItem != null && lastVisibleItem.index >= uiState.notes.size - 3
        }
    }

    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore && uiState.hasMore && !uiState.isLoading) {
            viewModel.loadMore()
        }
    }

    // Delete confirmation dialog
    noteToDelete?.let { note ->
        AlertDialog(
            onDismissRequest = { noteToDelete = null },
            title = { Text("删除笔记") },
            text = { Text("确定要删除这条笔记吗？") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteNote(note)
                        noteToDelete = null
                    }
                ) {
                    Text("删除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { noteToDelete = null }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.my_notes)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading && uiState.notes.isEmpty() -> {
                    LoadingState()
                }
                uiState.error != null && uiState.notes.isEmpty() -> {
                    ErrorState(
                        message = uiState.error ?: "加载失败",
                        onRetry = { viewModel.refresh() }
                    )
                }
                uiState.notes.isEmpty() -> {
                    EmptyNotesState()
                }
                else -> {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)
                    ) {
                        items(
                            items = uiState.notes,
                            key = { it.id }
                        ) { note ->
                            NoteItem(
                                note = note,
                                onClick = { onNoteClick(note) },
                                onDelete = { noteToDelete = note }
                            )
                        }

                        if (uiState.isLoading) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
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
private fun NoteItem(
    note: BookUnderline,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // Header with book info
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Book cover
                if (note.bookCoverUrl != null) {
                    AsyncImage(
                        model = note.bookCoverUrl,
                        contentDescription = null,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Surface(
                        modifier = Modifier.size(40.dp),
                        shape = RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.Notes,
                            contentDescription = null,
                            modifier = Modifier.padding(8.dp),
                            tint = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Book title and info
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = note.bookTitle ?: "未知书籍",
                        style = MaterialTheme.typography.labelLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    note.page?.let { page ->
                        Text(
                            text = "第 $page 页",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Delete button
                IconButton(onClick = onDelete) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "删除",
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Note text with quote style
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ) {
                Text(
                    text = "\"${note.text}\"",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(12.dp),
                    maxLines = 5,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Footer with idea count and date
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (note.ideaCount > 0) {
                    Text(
                        text = "${note.ideaCount} 条想法",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                note.createdAt?.let { date ->
                    Text(
                        text = formatDate(date),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyNotesState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.AutoMirrored.Filled.Notes,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "暂无笔记",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "在阅读时划线或添加笔记",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
            )
        }
    }
}

private fun formatDate(dateString: String): String {
    return try {
        // Parse ISO date and format to display
        val parts = dateString.split("T")
        if (parts.isNotEmpty()) {
            parts[0]
        } else {
            dateString
        }
    } catch (e: Exception) {
        dateString
    }
}
