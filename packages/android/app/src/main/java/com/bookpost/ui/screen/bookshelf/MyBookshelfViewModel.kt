package com.bookpost.ui.screen.bookshelf

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.EbookRepository
import com.bookpost.data.repository.MagazineRepository
import com.bookpost.data.repository.ReadingHistoryRepository
import com.bookpost.domain.model.Ebook
import com.bookpost.domain.model.Magazine
import com.bookpost.domain.model.ReadingHistoryEntry
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class BookshelfTab {
    ALL, EBOOKS, MAGAZINES, BOOKS
}

enum class ReadingStatus {
    ALL, READING, WANT_TO_READ, FINISHED
}

enum class ViewMode {
    GRID, LIST
}

data class BookshelfItem(
    val id: Int,
    val title: String,
    val coverUrl: String?,
    val type: String,
    val progress: Float = 0f
)

data class MyBookshelfUiState(
    val isLoading: Boolean = false,
    val readingHistory: List<ReadingHistoryEntry> = emptyList(),
    val items: List<BookshelfItem> = emptyList(),
    val selectedTab: BookshelfTab = BookshelfTab.ALL,
    val selectedStatus: ReadingStatus = ReadingStatus.ALL,
    val viewMode: ViewMode = ViewMode.GRID,
    val searchQuery: String = "",
    val error: String? = null
)

@HiltViewModel
class MyBookshelfViewModel @Inject constructor(
    private val readingHistoryRepository: ReadingHistoryRepository,
    private val ebookRepository: EbookRepository,
    private val magazineRepository: MagazineRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MyBookshelfUiState())
    val uiState: StateFlow<MyBookshelfUiState> = _uiState.asStateFlow()

    private var allEbooks: List<Ebook> = emptyList()
    private var allMagazines: List<Magazine> = emptyList()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // Load reading history
            when (val historyResult = readingHistoryRepository.getReadingHistory(limit = 10)) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(readingHistory = historyResult.data)
                }
                is NetworkResult.Error -> {
                    // Non-fatal, continue loading other data
                }
                is NetworkResult.Loading -> {}
            }

            // Load ebooks
            when (val ebooksResult = ebookRepository.getEbooks()) {
                is NetworkResult.Success -> {
                    allEbooks = ebooksResult.data.first
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(error = ebooksResult.message)
                }
                is NetworkResult.Loading -> {}
            }

            // Load magazines
            when (val magazinesResult = magazineRepository.getMagazines()) {
                is NetworkResult.Success -> {
                    allMagazines = magazinesResult.data.first
                }
                is NetworkResult.Error -> {
                    if (_uiState.value.error == null) {
                        _uiState.value = _uiState.value.copy(error = magazinesResult.message)
                    }
                }
                is NetworkResult.Loading -> {}
            }

            updateFilteredItems()
            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun selectTab(tab: BookshelfTab) {
        _uiState.value = _uiState.value.copy(selectedTab = tab)
        updateFilteredItems()
    }

    fun selectStatus(status: ReadingStatus) {
        _uiState.value = _uiState.value.copy(selectedStatus = status)
        updateFilteredItems()
    }

    fun toggleViewMode() {
        _uiState.value = _uiState.value.copy(
            viewMode = if (_uiState.value.viewMode == ViewMode.GRID) ViewMode.LIST else ViewMode.GRID
        )
    }

    fun search(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        updateFilteredItems()
    }

    fun refresh() {
        loadData()
    }

    private fun updateFilteredItems() {
        val state = _uiState.value
        val query = state.searchQuery.lowercase()

        val ebookItems = allEbooks.map { ebook ->
            BookshelfItem(
                id = ebook.id,
                title = ebook.title,
                coverUrl = ebook.coverUrl,
                type = "ebook"
            )
        }

        val magazineItems = allMagazines.map { magazine ->
            BookshelfItem(
                id = magazine.id,
                title = magazine.title,
                coverUrl = magazine.coverUrl,
                type = "magazine"
            )
        }

        var items = when (state.selectedTab) {
            BookshelfTab.ALL -> ebookItems + magazineItems
            BookshelfTab.EBOOKS -> ebookItems
            BookshelfTab.MAGAZINES -> magazineItems
            BookshelfTab.BOOKS -> emptyList() // Physical books not implemented yet
        }

        // Apply search filter
        if (query.isNotEmpty()) {
            items = items.filter { item ->
                item.title.lowercase().contains(query)
            }
        }

        _uiState.value = _uiState.value.copy(items = items)
    }
}
