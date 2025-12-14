package com.bookpost.ui.screen.reader.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.bookpost.R
import com.bookpost.domain.model.Bookmark

@Composable
fun BookmarksSheet(
    bookmarks: List<Bookmark>,
    isLoading: Boolean,
    currentPage: Int?,
    currentCfi: String?,
    onAddBookmark: (title: String, note: String?) -> Unit,
    onDeleteBookmark: (Bookmark) -> Unit,
    onBookmarkClick: (Bookmark) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showAddDialog by remember { mutableStateOf(false) }
    var bookmarkToDelete by remember { mutableStateOf<Bookmark?>(null) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.bookmarks),
                style = MaterialTheme.typography.titleLarge
            )
            OutlinedButton(
                onClick = { showAddDialog = true }
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(4.dp))
                Text("添加书签")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (bookmarks.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.BookmarkBorder,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "暂无书签",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(bookmarks) { bookmark ->
                    BookmarkItem(
                        bookmark = bookmark,
                        onClick = { onBookmarkClick(bookmark) },
                        onDelete = { bookmarkToDelete = bookmark }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Close button
        Button(
            onClick = onDismiss,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(stringResource(R.string.confirm))
        }
    }

    // Add Bookmark Dialog
    if (showAddDialog) {
        AddBookmarkDialog(
            currentPage = currentPage,
            onConfirm = { title, note ->
                onAddBookmark(title, note)
                showAddDialog = false
            },
            onDismiss = { showAddDialog = false }
        )
    }

    // Delete Confirmation Dialog
    bookmarkToDelete?.let { bookmark ->
        AlertDialog(
            onDismissRequest = { bookmarkToDelete = null },
            title = { Text("删除书签") },
            text = { Text("确定要删除书签 \"${bookmark.title}\" 吗？") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDeleteBookmark(bookmark)
                        bookmarkToDelete = null
                    }
                ) {
                    Text("删除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { bookmarkToDelete = null }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }
}

@Composable
private fun BookmarkItem(
    bookmark: Bookmark,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = bookmark.title,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                bookmark.page?.let { page ->
                    Text(
                        text = "第 $page 页",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                bookmark.note?.let { note ->
                    if (note.isNotBlank()) {
                        Text(
                            text = note,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "删除",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun AddBookmarkDialog(
    currentPage: Int?,
    onConfirm: (title: String, note: String?) -> Unit,
    onDismiss: () -> Unit
) {
    var title by remember { mutableStateOf(currentPage?.let { "第 $it 页" } ?: "书签") }
    var note by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("添加书签") },
        text = {
            Column {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("书签名称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("备注（可选）") },
                    maxLines = 3,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(title, note.ifBlank { null }) },
                enabled = title.isNotBlank()
            ) {
                Text("添加")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}
