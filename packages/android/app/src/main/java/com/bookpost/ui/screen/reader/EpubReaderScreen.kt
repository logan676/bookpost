package com.bookpost.ui.screen.reader

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.domain.model.ReadingSettings
import com.bookpost.domain.model.SearchResult
import com.bookpost.domain.model.TOCItem
import com.bookpost.ui.components.ErrorState
import com.bookpost.ui.components.LoadingState
import com.bookpost.ui.components.ReaderSearchBar
import com.bookpost.ui.screen.reader.components.AIFeaturesSheet
import com.bookpost.ui.screen.reader.components.BookmarksSheet
import com.bookpost.ui.screen.reader.components.ReaderSettingsSheet
import com.bookpost.ui.screen.reader.components.SocialFeaturesSheet
import com.bookpost.ui.screen.reader.components.TableOfContentsSheet
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EpubReaderScreen(
    ebookId: Int,
    onNavigateBack: () -> Unit,
    viewModel: EpubReaderViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val uiState by viewModel.uiState.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val sessionState by viewModel.sessionState.collectAsState()
    val bookmarks by viewModel.bookmarks.collectAsState()
    val isLoadingBookmarks by viewModel.isLoadingBookmarks.collectAsState()
    val scope = rememberCoroutineScope()

    // AI states
    val aiGuide by viewModel.aiGuide.collectAsState()
    val bookOutline by viewModel.bookOutline.collectAsState()
    val dictionaryResult by viewModel.dictionaryResult.collectAsState()
    val chatMessages by viewModel.chatMessages.collectAsState()
    val isLoadingAI by viewModel.isLoadingAI.collectAsState()
    val selectedWord by viewModel.selectedWord.collectAsState()

    // Social states
    val popularUnderlines by viewModel.popularUnderlines.collectAsState()
    val isLoadingSocial by viewModel.isLoadingSocial.collectAsState()
    val shareImageUrl by viewModel.shareImageUrl.collectAsState()
    val isGeneratingShare by viewModel.isGeneratingShare.collectAsState()

    var showSettings by remember { mutableStateOf(false) }
    var showTableOfContents by remember { mutableStateOf(false) }
    var showBookmarks by remember { mutableStateOf(false) }
    var showAIFeatures by remember { mutableStateOf(false) }
    var showSocialFeatures by remember { mutableStateOf(false) }
    var showToolbar by remember { mutableStateOf(true) }

    val settingsSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val tocSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val bookmarksSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val aiFeaturesSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val socialFeaturesSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(ebookId) {
        viewModel.loadEpub(ebookId, context)
    }

    // Handle lifecycle events for session pause/resume
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> viewModel.pauseSession()
                Lifecycle.Event.ON_RESUME -> viewModel.resumeSession()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val backgroundColor = settings.colorMode.getBackgroundColor()
    val searchState = uiState.searchState

    // WebView reference for search operations
    var webViewRef by remember { mutableStateOf<WebView?>(null) }

    Scaffold(
        topBar = {
            if (showToolbar) {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = uiState.title ?: "阅读",
                                maxLines = 1
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                uiState.currentPosition?.let { pos ->
                                    Text(
                                        text = pos.formattedProgress,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                                if (sessionState.isActive) {
                                    Text(
                                        text = "⏱ ${viewModel.getFormattedDuration()}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = {
                            uiState.currentPosition?.let { pos ->
                                viewModel.updateReadingProgress(
                                    ebookId,
                                    pos.currentPage ?: 0,
                                    pos.progress,
                                    pos.cfi
                                )
                            }
                            viewModel.endSession()
                            onNavigateBack()
                        }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                        }
                    },
                    actions = {
                        IconButton(onClick = { viewModel.activateSearch() }) {
                            Icon(Icons.Filled.Search, contentDescription = "搜索")
                        }
                        IconButton(onClick = { showTableOfContents = true }) {
                            Icon(Icons.AutoMirrored.Filled.List, contentDescription = "目录")
                        }
                        IconButton(onClick = {
                            viewModel.loadBookmarks(ebookId)
                            showBookmarks = true
                        }) {
                            Icon(Icons.Filled.Bookmark, contentDescription = "书签")
                        }
                        IconButton(onClick = { showAIFeatures = true }) {
                            Icon(Icons.Filled.AutoAwesome, contentDescription = "AI 功能")
                        }
                        IconButton(onClick = { showSocialFeatures = true }) {
                            Icon(Icons.Filled.People, contentDescription = "社交")
                        }
                        IconButton(onClick = { showSettings = true }) {
                            Icon(Icons.Filled.Settings, contentDescription = "设置")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = backgroundColor
                    )
                )
            }
        },
        containerColor = backgroundColor
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(backgroundColor)
        ) {
            // Search bar
            ReaderSearchBar(
                searchState = searchState,
                onQueryChange = { viewModel.updateSearchQuery(it) },
                onSearch = { query ->
                    viewModel.performSearch(query)
                    webViewRef?.evaluateJavascript(
                        "searchInBook('${query.replace("'", "\\'")}');",
                        null
                    )
                },
                onNavigateNext = {
                    viewModel.navigateToNextResult()
                    searchState.currentResult?.cfi?.let { cfi ->
                        webViewRef?.evaluateJavascript("goToCfi('$cfi');", null)
                    }
                },
                onNavigatePrevious = {
                    viewModel.navigateToPreviousResult()
                    searchState.currentResult?.cfi?.let { cfi ->
                        webViewRef?.evaluateJavascript("goToCfi('$cfi');", null)
                    }
                },
                onClose = { viewModel.deactivateSearch() },
                onResultClick = { index ->
                    viewModel.navigateToResult(index)
                    uiState.searchState.results.getOrNull(index)?.cfi?.let { cfi ->
                        webViewRef?.evaluateJavascript("goToCfi('$cfi');", null)
                    }
                }
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
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
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
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
                        onRetry = { viewModel.loadEpub(ebookId, context) }
                    )
                }
                uiState.epubFilePath != null -> {
                    EpubWebView(
                        epubFilePath = uiState.epubFilePath!!,
                        settings = settings,
                        onProgressChanged = { page, total, progress, cfi ->
                            viewModel.updateReadingProgress(ebookId, page, progress, cfi)
                        },
                        onTocLoaded = { toc ->
                            viewModel.updateTableOfContents(toc)
                        },
                        onSearchResults = { results ->
                            viewModel.onSearchResultsReceived(results)
                        },
                        onWebViewReady = { webView ->
                            webViewRef = webView
                        },
                        onTap = {
                            showToolbar = !showToolbar
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
        }
    }

    // Settings Bottom Sheet
    if (showSettings) {
        ModalBottomSheet(
            onDismissRequest = { showSettings = false },
            sheetState = settingsSheetState
        ) {
            ReaderSettingsSheet(
                settings = settings,
                onSettingsChange = { newSettings ->
                    viewModel.updateSettings(newSettings)
                },
                onDismiss = {
                    scope.launch {
                        settingsSheetState.hide()
                        showSettings = false
                    }
                }
            )
        }
    }

    // Table of Contents Bottom Sheet
    if (showTableOfContents) {
        ModalBottomSheet(
            onDismissRequest = { showTableOfContents = false },
            sheetState = tocSheetState
        ) {
            TableOfContentsSheet(
                items = uiState.tableOfContents,
                onItemClick = { item ->
                    // Navigate to chapter
                    scope.launch {
                        tocSheetState.hide()
                        showTableOfContents = false
                    }
                },
                onDismiss = {
                    scope.launch {
                        tocSheetState.hide()
                        showTableOfContents = false
                    }
                }
            )
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
                currentPage = uiState.currentPosition?.currentPage,
                currentCfi = uiState.currentPosition?.cfi,
                onAddBookmark = { title, note ->
                    viewModel.addBookmark(
                        ebookId = ebookId,
                        title = title,
                        page = uiState.currentPosition?.currentPage,
                        cfi = uiState.currentPosition?.cfi,
                        note = note
                    )
                },
                onDeleteBookmark = { bookmark ->
                    viewModel.deleteBookmark(ebookId, bookmark)
                },
                onBookmarkClick = { bookmark ->
                    // Navigate to bookmark position
                    // TODO: Implement navigation to CFI
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

    // AI Features Bottom Sheet
    if (showAIFeatures) {
        ModalBottomSheet(
            onDismissRequest = { showAIFeatures = false },
            sheetState = aiFeaturesSheetState
        ) {
            AIFeaturesSheet(
                aiGuide = aiGuide,
                bookOutline = bookOutline,
                dictionaryResult = dictionaryResult,
                chatMessages = chatMessages,
                isLoading = isLoadingAI,
                selectedWord = selectedWord,
                onLoadGuide = { viewModel.loadAIGuide(ebookId) },
                onLoadOutline = { viewModel.loadBookOutline(ebookId) },
                onLookupWord = { word -> viewModel.lookupWord(word) },
                onAskQuestion = { question -> viewModel.askQuestion(ebookId, question) },
                onDismiss = {
                    scope.launch {
                        aiFeaturesSheetState.hide()
                        showAIFeatures = false
                    }
                }
            )
        }
    }

    // Social Features Bottom Sheet
    if (showSocialFeatures) {
        ModalBottomSheet(
            onDismissRequest = { showSocialFeatures = false },
            sheetState = socialFeaturesSheetState
        ) {
            SocialFeaturesSheet(
                popularUnderlines = popularUnderlines,
                myHighlights = uiState.highlights,
                isLoading = isLoadingSocial,
                shareImageUrl = shareImageUrl,
                isGeneratingShare = isGeneratingShare,
                onLoadPopular = { viewModel.loadPopularUnderlines(ebookId) },
                onLikeUnderline = { id -> viewModel.likeUnderline(id) },
                onUnlikeUnderline = { id -> viewModel.unlikeUnderline(id) },
                onShareHighlight = { id, style -> viewModel.generateShareImage(id, style) },
                onDismiss = {
                    scope.launch {
                        socialFeaturesSheetState.hide()
                        showSocialFeatures = false
                    }
                }
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun EpubWebView(
    epubFilePath: String,
    settings: ReadingSettings,
    onProgressChanged: (page: Int, total: Int, progress: Double, cfi: String?) -> Unit,
    onTocLoaded: (List<TOCItem>) -> Unit,
    onSearchResults: (List<SearchResult>) -> Unit,
    onWebViewReady: (WebView) -> Unit,
    onTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    var webView by remember { mutableStateOf<WebView?>(null) }

    // Update settings when they change
    LaunchedEffect(settings) {
        webView?.let { wv ->
            val bgColor = String.format("#%06X", 0xFFFFFF and settings.colorMode.getBackgroundColor().toArgb())
            val textColor = String.format("#%06X", 0xFFFFFF and settings.colorMode.getTextColor().toArgb())

            wv.evaluateJavascript(
                """
                if (typeof updateReaderSettings === 'function') {
                    updateReaderSettings({
                        fontSize: ${settings.fontSize},
                        lineHeight: ${settings.lineSpacing.multiplier},
                        backgroundColor: '$bgColor',
                        textColor: '$textColor',
                        marginHorizontal: ${settings.marginSize.horizontalPadding},
                        marginVertical: ${settings.marginSize.verticalPadding}
                    });
                }
                """.trimIndent(),
                null
            )
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            webView?.destroy()
        }
    }

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )

                this.settings.javaScriptEnabled = true
                this.settings.domStorageEnabled = true
                this.settings.allowFileAccess = true
                this.settings.allowContentAccess = true
                this.settings.loadWithOverviewMode = true
                this.settings.useWideViewPort = true

                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        // Page loaded
                    }
                }

                addJavascriptInterface(
                    EpubJsInterface(
                        onProgressChanged = onProgressChanged,
                        onTocLoaded = onTocLoaded,
                        onSearchResults = onSearchResults,
                        onTap = onTap
                    ),
                    "Android"
                )

                // Load EPUB reader HTML
                val epubReaderHtml = createEpubReaderHtml(epubFilePath)
                loadDataWithBaseURL(
                    "file://${File(epubFilePath).parent}/",
                    epubReaderHtml,
                    "text/html",
                    "UTF-8",
                    null
                )

                webView = this
                onWebViewReady(this)
            }
        },
        modifier = modifier
    )
}

private class EpubJsInterface(
    private val onProgressChanged: (page: Int, total: Int, progress: Double, cfi: String?) -> Unit,
    private val onTocLoaded: (List<TOCItem>) -> Unit,
    private val onSearchResults: (List<SearchResult>) -> Unit,
    private val onTap: () -> Unit
) {
    @JavascriptInterface
    fun onProgress(page: Int, total: Int, progress: Double, cfi: String?) {
        onProgressChanged(page, total, progress, cfi)
    }

    @JavascriptInterface
    fun onTableOfContents(tocJson: String) {
        // Parse TOC JSON and call callback
        // For now, empty implementation
        onTocLoaded(emptyList())
    }

    @JavascriptInterface
    fun onSearchResultsFound(resultsJson: String) {
        try {
            // Parse JSON results from JavaScript
            val results = parseSearchResults(resultsJson)
            onSearchResults(results)
        } catch (e: Exception) {
            onSearchResults(emptyList())
        }
    }

    @JavascriptInterface
    fun onCenterTap() {
        onTap()
    }

    private fun parseSearchResults(json: String): List<SearchResult> {
        // Simple JSON parsing for search results
        // Format: [{"text":"...","surroundingText":"...","chapterIndex":0,"chapterTitle":"...","cfi":"..."}]
        if (json.isBlank() || json == "[]") return emptyList()

        val results = mutableListOf<SearchResult>()
        try {
            // Basic JSON array parsing
            val trimmed = json.trim()
            if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                val content = trimmed.substring(1, trimmed.length - 1)
                if (content.isBlank()) return emptyList()

                // Split by },{ to get individual objects
                val items = content.split("},")
                for ((index, item) in items.withIndex()) {
                    val cleanItem = if (index < items.size - 1) "$item}" else item
                    val result = parseSearchResultObject(cleanItem.trim())
                    if (result != null) results.add(result)
                }
            }
        } catch (e: Exception) {
            // Parsing failed, return empty list
        }
        return results
    }

    private fun parseSearchResultObject(json: String): SearchResult? {
        return try {
            val text = extractJsonString(json, "text") ?: return null
            val surroundingText = extractJsonString(json, "surroundingText") ?: text
            val chapterIndex = extractJsonInt(json, "chapterIndex") ?: 0
            val chapterTitle = extractJsonString(json, "chapterTitle")
            val cfi = extractJsonString(json, "cfi")
            SearchResult(
                text = text,
                surroundingText = surroundingText,
                chapterIndex = chapterIndex,
                chapterTitle = chapterTitle,
                cfi = cfi
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun extractJsonString(json: String, key: String): String? {
        val pattern = "\"$key\"\\s*:\\s*\"([^\"]*)\""
        val regex = Regex(pattern)
        return regex.find(json)?.groupValues?.get(1)
    }

    private fun extractJsonInt(json: String, key: String): Int? {
        val pattern = "\"$key\"\\s*:\\s*(\\d+)"
        val regex = Regex(pattern)
        return regex.find(json)?.groupValues?.get(1)?.toIntOrNull()
    }
}

private fun createEpubReaderHtml(epubFilePath: String): String {
    return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { height: 100%; overflow: hidden; }
                #viewer { width: 100%; height: 100%; }
                .epub-container { height: 100% !important; }
            </style>
        </head>
        <body>
            <div id="viewer"></div>
            <script>
                var book = ePub("file://$epubFilePath");
                var rendition = book.renderTo("viewer", {
                    width: "100%",
                    height: "100%",
                    spread: "none"
                });

                rendition.display();

                // Handle navigation
                rendition.on("relocated", function(location) {
                    var progress = book.locations.percentageFromCfi(location.start.cfi);
                    var page = location.start.displayed.page || 0;
                    var total = location.start.displayed.total || 0;
                    Android.onProgress(page, total, progress || 0, location.start.cfi);
                });

                // Handle tap for toolbar toggle
                rendition.on("click", function(e) {
                    var width = window.innerWidth;
                    var x = e.clientX;
                    if (x > width * 0.3 && x < width * 0.7) {
                        Android.onCenterTap();
                    }
                });

                // Load TOC
                book.loaded.navigation.then(function(nav) {
                    var toc = JSON.stringify(nav.toc);
                    Android.onTableOfContents(toc);
                });

                // Settings update function
                function updateReaderSettings(settings) {
                    rendition.themes.default({
                        body: {
                            "font-size": settings.fontSize + "px",
                            "line-height": settings.lineHeight,
                            "background-color": settings.backgroundColor,
                            "color": settings.textColor,
                            "padding-left": settings.marginHorizontal + "px",
                            "padding-right": settings.marginHorizontal + "px",
                            "padding-top": settings.marginVertical + "px",
                            "padding-bottom": settings.marginVertical + "px"
                        }
                    });
                    rendition.themes.select("default");
                }

                // Navigation functions
                function nextPage() { rendition.next(); }
                function prevPage() { rendition.prev(); }
                function goToChapter(href) { rendition.display(href); }
                function goToCfi(cfi) { rendition.display(cfi); }

                // Search function using epub.js search API
                var currentSearchResults = [];
                async function searchInBook(query) {
                    if (!query || query.trim() === '') {
                        Android.onSearchResultsFound('[]');
                        return;
                    }

                    try {
                        // Use epub.js search functionality
                        var results = await Promise.all(
                            book.spine.spineItems.map(function(item, index) {
                                return item.load(book.load.bind(book)).then(function(doc) {
                                    var found = [];
                                    var textContent = doc.body ? doc.body.textContent : '';
                                    var lowerQuery = query.toLowerCase();
                                    var lowerText = textContent.toLowerCase();
                                    var position = 0;

                                    while (true) {
                                        var foundIndex = lowerText.indexOf(lowerQuery, position);
                                        if (foundIndex === -1) break;

                                        // Get surrounding context
                                        var start = Math.max(0, foundIndex - 40);
                                        var end = Math.min(textContent.length, foundIndex + query.length + 40);
                                        var surroundingText = textContent.substring(start, end);
                                        if (start > 0) surroundingText = '...' + surroundingText;
                                        if (end < textContent.length) surroundingText = surroundingText + '...';

                                        found.push({
                                            text: textContent.substring(foundIndex, foundIndex + query.length),
                                            surroundingText: surroundingText,
                                            chapterIndex: index,
                                            chapterTitle: item.label || ('Chapter ' + (index + 1)),
                                            cfi: item.cfiFromElement(doc.body) || null
                                        });

                                        position = foundIndex + 1;
                                    }

                                    item.unload();
                                    return found;
                                }).catch(function() {
                                    return [];
                                });
                            })
                        );

                        // Flatten results
                        currentSearchResults = results.flat();
                        Android.onSearchResultsFound(JSON.stringify(currentSearchResults));
                    } catch (e) {
                        console.error('Search error:', e);
                        Android.onSearchResultsFound('[]');
                    }
                }

                // Highlight search result in view
                function highlightSearchResult(index) {
                    if (currentSearchResults[index] && currentSearchResults[index].cfi) {
                        rendition.display(currentSearchResults[index].cfi);
                    }
                }
            </script>
        </body>
        </html>
    """.trimIndent()
}
