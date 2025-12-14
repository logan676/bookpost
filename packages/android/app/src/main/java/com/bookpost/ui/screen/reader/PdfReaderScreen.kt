package com.bookpost.ui.screen.reader

import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.ui.components.ErrorState
import com.bookpost.ui.components.LoadingState
import com.bookpost.ui.screen.reader.components.BookmarksSheet
import com.github.barteksc.pdfviewer.PDFView
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PdfReaderScreen(
    type: String,
    id: Int,
    onNavigateBack: () -> Unit,
    viewModel: ReaderViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val bookmarks by viewModel.bookmarks.collectAsState()
    val isLoadingBookmarks by viewModel.isLoadingBookmarks.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var currentPage by remember { mutableIntStateOf(0) }
    var totalPages by remember { mutableIntStateOf(0) }
    var showBookmarks by remember { mutableStateOf(false) }
    val bookmarksSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(type, id) {
        viewModel.loadPdf(type, id, context)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(uiState.title ?: "阅读")
                        if (totalPages > 0) {
                            Text(
                                text = "第 ${currentPage + 1} / $totalPages 页",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        // Save reading progress before navigating back
                        if (totalPages > 0) {
                            viewModel.saveReadingProgress(type, id, currentPage + 1)
                        }
                        onNavigateBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        viewModel.loadBookmarks(type, id)
                        showBookmarks = true
                    }) {
                        Icon(Icons.Filled.Bookmark, contentDescription = "书签")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        LoadingState()
                        if (uiState.downloadProgress > 0f) {
                            LinearProgressIndicator(
                                progress = { uiState.downloadProgress },
                                modifier = Modifier.fillMaxWidth()
                            )
                            Text(
                                text = "${(uiState.downloadProgress * 100).toInt()}%",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
                uiState.error != null -> {
                    ErrorState(
                        message = uiState.error ?: "加载失败",
                        onRetry = { viewModel.loadPdf(type, id, context) }
                    )
                }
                uiState.pdfFile != null -> {
                    PdfViewer(
                        pdfFile = uiState.pdfFile!!,
                        initialPage = uiState.lastPage,
                        onPageChanged = { page, pageCount ->
                            currentPage = page
                            totalPages = pageCount
                        }
                    )
                }
            }
        }
    }

    // Bookmarks Bottom Sheet
    if (showBookmarks) {
        ModalBottomSheet(
            onDismissRequest = { showBookmarks = false },
            sheetState = bookmarksSheetState
        ) {
            BookmarksSheet(
                bookmarks = bookmarks,
                isLoading = isLoadingBookmarks,
                currentPage = currentPage + 1,
                currentCfi = null,
                onAddBookmark = { title, note ->
                    viewModel.addBookmark(type, id, title, currentPage + 1, note)
                },
                onDeleteBookmark = { bookmark ->
                    viewModel.deleteBookmark(type, id, bookmark)
                },
                onBookmarkClick = { bookmark ->
                    // TODO: Navigate to bookmark page
                    scope.launch {
                        bookmarksSheetState.hide()
                        showBookmarks = false
                    }
                },
                onDismiss = {
                    scope.launch {
                        bookmarksSheetState.hide()
                        showBookmarks = false
                    }
                }
            )
        }
    }
}

@Composable
private fun PdfViewer(
    pdfFile: File,
    initialPage: Int,
    onPageChanged: (Int, Int) -> Unit
) {
    AndroidView(
        factory = { context ->
            PDFView(context, null).apply {
                fromFile(pdfFile)
                    .defaultPage(initialPage)
                    .enableSwipe(true)
                    .swipeHorizontal(false)
                    .enableDoubletap(true)
                    .enableAntialiasing(true)
                    .spacing(0)
                    .onPageChange { page, pageCount ->
                        onPageChanged(page, pageCount)
                    }
                    .load()
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}
