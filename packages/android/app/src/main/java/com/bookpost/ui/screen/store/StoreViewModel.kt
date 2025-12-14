package com.bookpost.ui.screen.store

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.EbookRepository
import com.bookpost.data.repository.MagazineRepository
import com.bookpost.domain.model.EbookCategory
import com.bookpost.domain.model.Ebook
import com.bookpost.domain.model.Magazine
import com.bookpost.domain.model.Publisher
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StoreDisplayItem(
    val id: Int,
    val title: String,
    val coverUrl: String?,
    val subtitle: String?
)

data class StoreUiState(
    val isLoading: Boolean = false,
    val selectedTab: StoreTab = StoreTab.EBOOKS,
    val searchQuery: String = "",
    val categories: List<EbookCategory> = emptyList(),
    val publishers: List<Publisher> = emptyList(),
    val selectedCategoryId: Int? = null,
    val selectedPublisherId: Int? = null,
    val displayItems: List<StoreDisplayItem> = emptyList(),
    val totalEbooks: Int = 0,
    val totalMagazines: Int = 0,
    val error: String? = null
)

@HiltViewModel
class StoreViewModel @Inject constructor(
    private val ebookRepository: EbookRepository,
    private val magazineRepository: MagazineRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(StoreUiState())
    val uiState: StateFlow<StoreUiState> = _uiState.asStateFlow()

    private var allEbooks: List<Ebook> = emptyList()
    private var allMagazines: List<Magazine> = emptyList()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // Load ebooks
            when (val result = ebookRepository.getEbooks()) {
                is NetworkResult.Success -> {
                    allEbooks = result.data.first
                    _uiState.value = _uiState.value.copy(
                        totalEbooks = result.data.second
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(error = result.message)
                }
                is NetworkResult.Loading -> {}
            }

            // Load categories
            when (val result = ebookRepository.getCategories()) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(categories = result.data)
                }
                is NetworkResult.Error -> {}
                is NetworkResult.Loading -> {}
            }

            // Load magazines
            when (val result = magazineRepository.getMagazines()) {
                is NetworkResult.Success -> {
                    allMagazines = result.data.first
                    _uiState.value = _uiState.value.copy(
                        totalMagazines = result.data.second
                    )
                }
                is NetworkResult.Error -> {
                    if (_uiState.value.error == null) {
                        _uiState.value = _uiState.value.copy(error = result.message)
                    }
                }
                is NetworkResult.Loading -> {}
            }

            // Load publishers
            when (val result = magazineRepository.getPublishers()) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(publishers = result.data)
                }
                is NetworkResult.Error -> {}
                is NetworkResult.Loading -> {}
            }

            updateDisplayItems()
            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun selectTab(tab: StoreTab) {
        _uiState.value = _uiState.value.copy(
            selectedTab = tab,
            searchQuery = "",
            selectedCategoryId = null,
            selectedPublisherId = null
        )
        updateDisplayItems()
    }

    fun search(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        updateDisplayItems()
    }

    fun selectCategory(categoryId: Int?) {
        _uiState.value = _uiState.value.copy(selectedCategoryId = categoryId)
        updateDisplayItems()
    }

    fun selectPublisher(publisherId: Int?) {
        _uiState.value = _uiState.value.copy(selectedPublisherId = publisherId)
        updateDisplayItems()
    }

    fun refresh() {
        loadData()
    }

    private fun updateDisplayItems() {
        val state = _uiState.value
        val query = state.searchQuery.lowercase()

        val items = when (state.selectedTab) {
            StoreTab.EBOOKS -> {
                var filtered = allEbooks

                // Apply category filter
                if (state.selectedCategoryId != null) {
                    filtered = filtered.filter { it.categoryId == state.selectedCategoryId }
                }

                // Apply search filter
                if (query.isNotEmpty()) {
                    filtered = filtered.filter {
                        it.title.lowercase().contains(query)
                    }
                }

                filtered.map { ebook ->
                    StoreDisplayItem(
                        id = ebook.id,
                        title = ebook.title,
                        coverUrl = ebook.coverUrl,
                        subtitle = ebook.fileType?.uppercase()
                    )
                }
            }
            StoreTab.MAGAZINES -> {
                var filtered = allMagazines

                // Apply publisher filter
                if (state.selectedPublisherId != null) {
                    filtered = filtered.filter { it.publisherId == state.selectedPublisherId }
                }

                // Apply search filter
                if (query.isNotEmpty()) {
                    filtered = filtered.filter {
                        it.title.lowercase().contains(query)
                    }
                }

                filtered.map { magazine ->
                    StoreDisplayItem(
                        id = magazine.id,
                        title = magazine.title,
                        coverUrl = magazine.coverUrl,
                        subtitle = magazine.year?.toString()
                    )
                }
            }
        }

        _uiState.value = _uiState.value.copy(displayItems = items)
    }
}
