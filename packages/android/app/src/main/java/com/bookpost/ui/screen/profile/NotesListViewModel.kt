package com.bookpost.ui.screen.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.NoteRepository
import com.bookpost.domain.model.BookUnderline
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotesListUiState(
    val isLoading: Boolean = false,
    val notes: List<BookUnderline> = emptyList(),
    val total: Int = 0,
    val hasMore: Boolean = false,
    val error: String? = null,
    val isRefreshing: Boolean = false
)

@HiltViewModel
class NotesListViewModel @Inject constructor(
    private val noteRepository: NoteRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotesListUiState())
    val uiState: StateFlow<NotesListUiState> = _uiState.asStateFlow()

    private val pageSize = 20
    private var currentPage = 0

    init {
        loadNotes()
    }

    fun loadNotes(refresh: Boolean = false) {
        viewModelScope.launch {
            if (refresh) {
                currentPage = 0
                _uiState.update { it.copy(isRefreshing = true) }
            } else {
                _uiState.update { it.copy(isLoading = true, error = null) }
            }

            val result = noteRepository.getUserNotes(
                limit = pageSize,
                offset = if (refresh) 0 else currentPage * pageSize
            )

            when (result) {
                is NetworkResult.Success -> {
                    val (notes, total) = result.data
                    _uiState.update { state ->
                        val newNotes = if (refresh) notes else state.notes + notes
                        state.copy(
                            isLoading = false,
                            isRefreshing = false,
                            notes = newNotes,
                            total = total,
                            hasMore = newNotes.size < total
                        )
                    }
                    if (!refresh) currentPage++
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun loadMore() {
        if (!_uiState.value.hasMore || _uiState.value.isLoading) return
        loadNotes()
    }

    fun refresh() {
        loadNotes(refresh = true)
    }

    fun deleteNote(note: BookUnderline) {
        viewModelScope.launch {
            when (noteRepository.deleteNote(note)) {
                is NetworkResult.Success -> {
                    _uiState.update { state ->
                        state.copy(
                            notes = state.notes.filter { it.id != note.id },
                            total = state.total - 1
                        )
                    }
                }
                else -> {}
            }
        }
    }
}
