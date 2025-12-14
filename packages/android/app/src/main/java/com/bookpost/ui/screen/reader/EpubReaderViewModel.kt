package com.bookpost.ui.screen.reader

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.local.datastore.ReadingSettingsStore
import com.bookpost.data.local.ReadingSessionManager
import com.bookpost.data.repository.AIRepository
import com.bookpost.data.repository.BookmarkRepository
import com.bookpost.data.repository.EbookRepository
import com.bookpost.data.repository.ReadingHistoryRepository
import com.bookpost.data.repository.SocialRepository
import com.bookpost.domain.model.AIChatMessage
import com.bookpost.domain.model.AIGuide
import com.bookpost.domain.model.Bookmark
import com.bookpost.domain.model.BookOutline
import com.bookpost.domain.model.ChatRole
import com.bookpost.domain.model.DictionaryResult
import com.bookpost.domain.model.EpubReaderState
import com.bookpost.domain.model.Highlight
import com.bookpost.domain.model.HighlightColor
import com.bookpost.domain.model.ItemType
import com.bookpost.domain.model.PopularUnderline
import com.bookpost.domain.model.QuoteCardStyle
import com.bookpost.domain.model.ReadingPosition
import com.bookpost.domain.model.ReadingSettings
import com.bookpost.domain.model.SearchResult
import com.bookpost.domain.model.SearchState
import com.bookpost.domain.model.TOCItem
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

@HiltViewModel
class EpubReaderViewModel @Inject constructor(
    private val ebookRepository: EbookRepository,
    private val readingHistoryRepository: ReadingHistoryRepository,
    private val bookmarkRepository: BookmarkRepository,
    private val aiRepository: AIRepository,
    private val socialRepository: SocialRepository,
    private val readingSettingsStore: ReadingSettingsStore,
    private val sessionManager: ReadingSessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(EpubReaderState())

    private val _bookmarks = MutableStateFlow<List<Bookmark>>(emptyList())
    val bookmarks: StateFlow<List<Bookmark>> = _bookmarks.asStateFlow()

    private val _isLoadingBookmarks = MutableStateFlow(false)
    val isLoadingBookmarks: StateFlow<Boolean> = _isLoadingBookmarks.asStateFlow()
    val uiState: StateFlow<EpubReaderState> = _uiState.asStateFlow()

    // AI Feature states
    private val _aiGuide = MutableStateFlow<AIGuide?>(null)
    val aiGuide: StateFlow<AIGuide?> = _aiGuide.asStateFlow()

    private val _bookOutline = MutableStateFlow<BookOutline?>(null)
    val bookOutline: StateFlow<BookOutline?> = _bookOutline.asStateFlow()

    private val _dictionaryResult = MutableStateFlow<DictionaryResult?>(null)
    val dictionaryResult: StateFlow<DictionaryResult?> = _dictionaryResult.asStateFlow()

    private val _chatMessages = MutableStateFlow<List<AIChatMessage>>(emptyList())
    val chatMessages: StateFlow<List<AIChatMessage>> = _chatMessages.asStateFlow()

    private val _isLoadingAI = MutableStateFlow(false)
    val isLoadingAI: StateFlow<Boolean> = _isLoadingAI.asStateFlow()

    private val _selectedWord = MutableStateFlow<String?>(null)
    val selectedWord: StateFlow<String?> = _selectedWord.asStateFlow()

    // Social Feature states
    private val _popularUnderlines = MutableStateFlow<List<PopularUnderline>>(emptyList())
    val popularUnderlines: StateFlow<List<PopularUnderline>> = _popularUnderlines.asStateFlow()

    private val _isLoadingSocial = MutableStateFlow(false)
    val isLoadingSocial: StateFlow<Boolean> = _isLoadingSocial.asStateFlow()

    private val _shareImageUrl = MutableStateFlow<String?>(null)
    val shareImageUrl: StateFlow<String?> = _shareImageUrl.asStateFlow()

    private val _isGeneratingShare = MutableStateFlow(false)
    val isGeneratingShare: StateFlow<Boolean> = _isGeneratingShare.asStateFlow()

    val settings: StateFlow<ReadingSettings> = readingSettingsStore.settings
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5000),
            ReadingSettings.Default
        )

    // Reading session state
    val sessionState = sessionManager.sessionState
    val milestonesAchieved = sessionManager.milestonesAchieved

    private var epubFile: File? = null
    private var currentBookId: Int = 0

    fun loadEpub(ebookId: Int, context: Context) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // Get ebook metadata
            val ebook = ebookRepository.getCachedEbook(ebookId)
            _uiState.update {
                it.copy(
                    title = ebook?.title,
                    author = null, // Ebook model doesn't have author field yet
                    coverUrl = ebook?.coverUrl
                )
            }

            // Get last reading position
            val lastPosition = readingHistoryRepository.getCachedReadingHistoryEntry(
                ItemType.EBOOK,
                ebookId
            )

            // Check cache
            val cacheDir = File(context.cacheDir, "epubs")
            cacheDir.mkdirs()
            val cachedFile = File(cacheDir, "$ebookId.epub")

            if (cachedFile.exists() && cachedFile.length() > 0) {
                epubFile = cachedFile
                loadEpubContent(ebookId, cachedFile, lastPosition?.lastPage)
                return@launch
            }

            // Download EPUB file
            val result = ebookRepository.getEbookFile(ebookId)
            when (result) {
                is NetworkResult.Success -> {
                    try {
                        withContext(Dispatchers.IO) {
                            val body = result.data
                            val totalBytes = body.contentLength()
                            var downloadedBytes = 0L

                            body.byteStream().use { inputStream ->
                                FileOutputStream(cachedFile).use { outputStream ->
                                    val buffer = ByteArray(8192)
                                    var bytesRead: Int

                                    while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                                        outputStream.write(buffer, 0, bytesRead)
                                        downloadedBytes += bytesRead

                                        if (totalBytes > 0) {
                                            val progress = downloadedBytes.toFloat() / totalBytes
                                            _uiState.update { it.copy(downloadProgress = progress) }
                                        }
                                    }
                                }
                            }
                        }

                        epubFile = cachedFile
                        loadEpubContent(ebookId, cachedFile, lastPosition?.lastPage)
                    } catch (e: Exception) {
                        cachedFile.delete()
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = "文件下载失败: ${e.message}"
                            )
                        }
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    private suspend fun loadEpubContent(ebookId: Int, file: File, lastPage: Int?) {
        try {
            currentBookId = ebookId

            // Load underlines/highlights
            loadHighlights(ebookId)

            // Start reading session
            sessionManager.startSession(
                bookId = ebookId,
                bookType = "ebook",
                chapterIndex = lastPage
            )

            _uiState.update {
                it.copy(
                    isLoading = false,
                    epubFilePath = file.absolutePath,
                    currentPosition = ReadingPosition(
                        bookId = ebookId,
                        bookType = "ebook",
                        currentPage = lastPage,
                        progress = 0.0
                    )
                )
            }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    error = "EPUB解析失败: ${e.message}"
                )
            }
        }
    }

    private suspend fun loadHighlights(ebookId: Int) {
        when (val result = ebookRepository.getUnderlines(ebookId)) {
            is NetworkResult.Success -> {
                val highlights = result.data.map { underline ->
                    Highlight(
                        id = underline.id,
                        bookId = ebookId,
                        bookType = "ebook",
                        userId = 0,
                        text = underline.text ?: "",
                        pageNumber = underline.paragraph,
                        chapterIndex = underline.chapterIndex,
                        paragraphIndex = underline.paragraphIndex,
                        startOffset = underline.startOffset,
                        endOffset = underline.endOffset,
                        cfiRange = underline.cfiRange,
                        color = HighlightColor.YELLOW,
                        ideaCount = underline.ideaCount ?: 0,
                        createdAt = underline.createdAt
                    )
                }
                _uiState.update { it.copy(highlights = highlights) }
            }
            else -> {}
        }
    }

    fun updateReadingProgress(ebookId: Int, page: Int, progress: Double, cfi: String? = null) {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    currentPosition = state.currentPosition?.copy(
                        currentPage = page,
                        progress = progress,
                        cfi = cfi
                    )
                )
            }

            readingHistoryRepository.updateReadingHistory(
                itemType = ItemType.EBOOK,
                itemId = ebookId,
                title = _uiState.value.title,
                lastPage = page
            )
        }
    }

    fun updateTableOfContents(toc: List<TOCItem>) {
        _uiState.update { it.copy(tableOfContents = toc) }
    }

    fun createHighlight(
        ebookId: Int,
        text: String,
        cfiRange: String? = null,
        chapterIndex: Int? = null,
        paragraphIndex: Int? = null,
        startOffset: Int? = null,
        endOffset: Int? = null
    ) {
        viewModelScope.launch {
            ebookRepository.createUnderline(
                ebookId = ebookId,
                text = text,
                cfiRange = cfiRange,
                chapterIndex = chapterIndex,
                paragraphIndex = paragraphIndex,
                startOffset = startOffset,
                endOffset = endOffset
            )
            // Reload highlights
            loadHighlights(ebookId)
        }
    }

    fun deleteHighlight(ebookId: Int, highlightId: Int) {
        viewModelScope.launch {
            ebookRepository.deleteUnderline(ebookId, highlightId)
            _uiState.update { state ->
                state.copy(highlights = state.highlights.filter { it.id != highlightId })
            }
        }
    }

    // Settings updates
    fun updateSettings(settings: ReadingSettings) {
        viewModelScope.launch {
            readingSettingsStore.updateSettings(settings)
        }
    }

    fun updateFontSize(size: Float) {
        viewModelScope.launch {
            readingSettingsStore.updateFontSize(size)
        }
    }

    fun updateColorMode(mode: com.bookpost.domain.model.ColorMode) {
        viewModelScope.launch {
            readingSettingsStore.updateColorMode(mode)
        }
    }

    fun updateLineSpacing(spacing: com.bookpost.domain.model.LineSpacing) {
        viewModelScope.launch {
            readingSettingsStore.updateLineSpacing(spacing)
        }
    }

    fun updateMarginSize(size: com.bookpost.domain.model.MarginSize) {
        viewModelScope.launch {
            readingSettingsStore.updateMarginSize(size)
        }
    }

    fun updateBrightness(brightness: Float) {
        viewModelScope.launch {
            readingSettingsStore.updateBrightness(brightness)
        }
    }

    fun getEpubFile(): File? = epubFile

    // Bookmark functions
    fun loadBookmarks(ebookId: Int) {
        viewModelScope.launch {
            _isLoadingBookmarks.value = true
            when (val result = bookmarkRepository.getEbookBookmarks(ebookId)) {
                is NetworkResult.Success -> {
                    _bookmarks.value = result.data
                }
                else -> {
                    _bookmarks.value = emptyList()
                }
            }
            _isLoadingBookmarks.value = false
        }
    }

    fun addBookmark(ebookId: Int, title: String, page: Int?, cfi: String?, note: String?) {
        viewModelScope.launch {
            when (val result = bookmarkRepository.createEbookBookmark(ebookId, title, page, cfi, note)) {
                is NetworkResult.Success -> {
                    loadBookmarks(ebookId)
                }
                else -> {}
            }
        }
    }

    fun deleteBookmark(ebookId: Int, bookmark: Bookmark) {
        viewModelScope.launch {
            when (bookmarkRepository.deleteEbookBookmark(ebookId, bookmark.id)) {
                is NetworkResult.Success -> {
                    _bookmarks.value = _bookmarks.value.filter { it.id != bookmark.id }
                }
                else -> {}
            }
        }
    }

    /**
     * End the current reading session
     */
    fun endSession() {
        viewModelScope.launch {
            val position = _uiState.value.currentPosition
            sessionManager.endSession(
                position = position?.cfi,
                chapterIndex = position?.currentPage,
                pagesRead = position?.currentPage
            )
        }
    }

    /**
     * Pause the current reading session (e.g., when app goes to background)
     */
    fun pauseSession() {
        viewModelScope.launch {
            sessionManager.pauseSession()
        }
    }

    /**
     * Resume the reading session
     */
    fun resumeSession() {
        viewModelScope.launch {
            sessionManager.resumeSession()
        }
    }

    /**
     * Clear milestones after showing them
     */
    fun clearMilestones() {
        sessionManager.clearMilestones()
    }

    /**
     * Get formatted reading duration
     */
    fun getFormattedDuration(): String = sessionManager.getFormattedDuration()

    // AI Feature functions

    /**
     * Load AI reading guide for the current ebook
     */
    fun loadAIGuide(ebookId: Int) {
        viewModelScope.launch {
            _isLoadingAI.value = true
            when (val result = aiRepository.getAIGuide(ebookId)) {
                is NetworkResult.Success -> {
                    _aiGuide.value = result.data
                }
                else -> {
                    // Handle error silently, user can retry
                }
            }
            _isLoadingAI.value = false
        }
    }

    /**
     * Load AI-generated book outline
     */
    fun loadBookOutline(ebookId: Int) {
        viewModelScope.launch {
            _isLoadingAI.value = true
            when (val result = aiRepository.getBookOutline(ebookId)) {
                is NetworkResult.Success -> {
                    _bookOutline.value = result.data
                }
                else -> {
                    // Handle error silently, user can retry
                }
            }
            _isLoadingAI.value = false
        }
    }

    /**
     * Look up a word using AI-enhanced dictionary
     */
    fun lookupWord(word: String, context: String? = null) {
        viewModelScope.launch {
            _isLoadingAI.value = true
            _selectedWord.value = word
            when (val result = aiRepository.lookupWord(word, context)) {
                is NetworkResult.Success -> {
                    _dictionaryResult.value = result.data
                }
                else -> {
                    // Handle error silently
                }
            }
            _isLoadingAI.value = false
        }
    }

    /**
     * Ask AI a question about the book
     */
    fun askQuestion(ebookId: Int, question: String, context: String? = null) {
        viewModelScope.launch {
            // Add user message immediately
            val userMessage = AIChatMessage(
                id = _chatMessages.value.size,
                role = ChatRole.USER,
                content = question
            )
            _chatMessages.value = _chatMessages.value + userMessage

            _isLoadingAI.value = true
            when (val result = aiRepository.askQuestion(ebookId, question, context)) {
                is NetworkResult.Success -> {
                    val assistantMessage = AIChatMessage(
                        id = _chatMessages.value.size,
                        role = ChatRole.ASSISTANT,
                        content = result.data
                    )
                    _chatMessages.value = _chatMessages.value + assistantMessage
                }
                else -> {
                    // Add error message
                    val errorMessage = AIChatMessage(
                        id = _chatMessages.value.size,
                        role = ChatRole.ASSISTANT,
                        content = "抱歉，无法获取回答。请稍后再试。"
                    )
                    _chatMessages.value = _chatMessages.value + errorMessage
                }
            }
            _isLoadingAI.value = false
        }
    }

    /**
     * Set selected word for dictionary lookup
     */
    fun setSelectedWord(word: String?) {
        _selectedWord.value = word
    }

    /**
     * Clear AI chat messages
     */
    fun clearChatMessages() {
        _chatMessages.value = emptyList()
    }

    // Social Feature functions

    /**
     * Load popular underlines for the current ebook
     */
    fun loadPopularUnderlines(ebookId: Int) {
        viewModelScope.launch {
            _isLoadingSocial.value = true
            when (val result = socialRepository.getPopularUnderlines(ItemType.EBOOK, ebookId)) {
                is NetworkResult.Success -> {
                    _popularUnderlines.value = result.data.first
                }
                else -> {
                    _popularUnderlines.value = emptyList()
                }
            }
            _isLoadingSocial.value = false
        }
    }

    /**
     * Like an underline
     */
    fun likeUnderline(underlineId: Int) {
        viewModelScope.launch {
            when (val result = socialRepository.likeUnderline(underlineId)) {
                is NetworkResult.Success -> {
                    // Update like count in the list
                    _popularUnderlines.value = _popularUnderlines.value.map { underline ->
                        if (underline.id == underlineId) {
                            underline.copy(
                                isLiked = true,
                                likeCount = result.data
                            )
                        } else underline
                    }
                }
                else -> {}
            }
        }
    }

    /**
     * Unlike an underline
     */
    fun unlikeUnderline(underlineId: Int) {
        viewModelScope.launch {
            when (val result = socialRepository.unlikeUnderline(underlineId)) {
                is NetworkResult.Success -> {
                    // Update like count in the list
                    _popularUnderlines.value = _popularUnderlines.value.map { underline ->
                        if (underline.id == underlineId) {
                            underline.copy(
                                isLiked = false,
                                likeCount = result.data
                            )
                        } else underline
                    }
                }
                else -> {}
            }
        }
    }

    /**
     * Generate a shareable image for a highlight
     */
    fun generateShareImage(underlineId: Int, style: QuoteCardStyle) {
        viewModelScope.launch {
            _isGeneratingShare.value = true
            _shareImageUrl.value = null
            when (val result = socialRepository.generateShareImage(underlineId, style)) {
                is NetworkResult.Success -> {
                    _shareImageUrl.value = result.data.imageUrl
                }
                else -> {
                    // Handle error silently
                }
            }
            _isGeneratingShare.value = false
        }
    }

    /**
     * Clear the share image URL
     */
    fun clearShareImage() {
        _shareImageUrl.value = null
    }

    // Search Feature functions

    /**
     * Activate search mode
     */
    fun activateSearch() {
        _uiState.update { state ->
            state.copy(
                searchState = state.searchState.copy(isActive = true)
            )
        }
    }

    /**
     * Deactivate search mode and clear results
     */
    fun deactivateSearch() {
        _uiState.update { state ->
            state.copy(
                searchState = SearchState()
            )
        }
    }

    /**
     * Update search query
     */
    fun updateSearchQuery(query: String) {
        _uiState.update { state ->
            state.copy(
                searchState = state.searchState.copy(query = query)
            )
        }
    }

    /**
     * Perform search within the EPUB content
     * Note: The actual search will be performed by the EPUB renderer (WebView/Readium)
     * This method is called when search results are returned from the renderer
     */
    fun performSearch(query: String) {
        if (query.isBlank()) {
            _uiState.update { state ->
                state.copy(
                    searchState = state.searchState.copy(
                        query = "",
                        results = emptyList(),
                        currentIndex = 0,
                        isSearching = false
                    )
                )
            }
            return
        }

        _uiState.update { state ->
            state.copy(
                searchState = state.searchState.copy(
                    query = query,
                    isSearching = true,
                    results = emptyList(),
                    currentIndex = 0
                )
            )
        }
    }

    /**
     * Called when search results are received from the EPUB renderer
     */
    fun onSearchResultsReceived(results: List<SearchResult>) {
        _uiState.update { state ->
            state.copy(
                searchState = state.searchState.copy(
                    results = results,
                    currentIndex = if (results.isNotEmpty()) 0 else 0,
                    isSearching = false
                )
            )
        }
    }

    /**
     * Navigate to the next search result
     */
    fun navigateToNextResult() {
        _uiState.update { state ->
            val searchState = state.searchState
            if (searchState.results.isEmpty()) return@update state

            val nextIndex = if (searchState.currentIndex < searchState.results.size - 1) {
                searchState.currentIndex + 1
            } else {
                0 // Wrap to beginning
            }
            state.copy(
                searchState = searchState.copy(currentIndex = nextIndex)
            )
        }
    }

    /**
     * Navigate to the previous search result
     */
    fun navigateToPreviousResult() {
        _uiState.update { state ->
            val searchState = state.searchState
            if (searchState.results.isEmpty()) return@update state

            val prevIndex = if (searchState.currentIndex > 0) {
                searchState.currentIndex - 1
            } else {
                searchState.results.size - 1 // Wrap to end
            }
            state.copy(
                searchState = searchState.copy(currentIndex = prevIndex)
            )
        }
    }

    /**
     * Navigate to a specific search result by index
     */
    fun navigateToResult(index: Int) {
        _uiState.update { state ->
            val searchState = state.searchState
            if (index < 0 || index >= searchState.results.size) return@update state
            state.copy(
                searchState = searchState.copy(currentIndex = index)
            )
        }
    }

    /**
     * Clear search results but keep search active
     */
    fun clearSearchResults() {
        _uiState.update { state ->
            state.copy(
                searchState = state.searchState.copy(
                    results = emptyList(),
                    currentIndex = 0
                )
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        // End session when ViewModel is cleared
        viewModelScope.launch {
            val position = _uiState.value.currentPosition
            sessionManager.endSession(
                position = position?.cfi,
                chapterIndex = position?.currentPage,
                pagesRead = position?.currentPage
            )
        }
    }
}
