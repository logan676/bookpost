package com.bookpost.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.bookpost.R
import com.bookpost.domain.model.SearchResult
import com.bookpost.domain.model.SearchState

/**
 * Search bar component for the EPUB reader
 */
@Composable
fun ReaderSearchBar(
    searchState: SearchState,
    onQueryChange: (String) -> Unit,
    onSearch: (String) -> Unit,
    onNavigateNext: () -> Unit,
    onNavigatePrevious: () -> Unit,
    onClose: () -> Unit,
    onResultClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    LaunchedEffect(searchState.isActive) {
        if (searchState.isActive) {
            focusRequester.requestFocus()
        }
    }

    AnimatedVisibility(
        visible = searchState.isActive,
        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut()
    ) {
        Column(
            modifier = modifier.background(MaterialTheme.colorScheme.surface)
        ) {
            // Search input row
            Surface(
                modifier = Modifier.fillMaxWidth(),
                tonalElevation = 3.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Search input field
                    TextField(
                        value = searchState.query,
                        onValueChange = onQueryChange,
                        placeholder = {
                            Text(stringResource(R.string.search_placeholder))
                        },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        },
                        trailingIcon = {
                            if (searchState.query.isNotEmpty()) {
                                IconButton(
                                    onClick = { onQueryChange("") }
                                ) {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "Clear",
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        },
                        singleLine = true,
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        ),
                        shape = RoundedCornerShape(24.dp),
                        keyboardOptions = KeyboardOptions(
                            imeAction = ImeAction.Search
                        ),
                        keyboardActions = KeyboardActions(
                            onSearch = {
                                onSearch(searchState.query)
                                keyboardController?.hide()
                            }
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .focusRequester(focusRequester)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    // Result counter and navigation
                    if (searchState.hasResults || searchState.isSearching) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (searchState.isSearching) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text(
                                    text = searchState.resultCountText,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            IconButton(
                                onClick = onNavigatePrevious,
                                enabled = searchState.hasResults
                            ) {
                                Icon(
                                    Icons.Default.KeyboardArrowUp,
                                    contentDescription = stringResource(R.string.previous_result)
                                )
                            }

                            IconButton(
                                onClick = onNavigateNext,
                                enabled = searchState.hasResults
                            ) {
                                Icon(
                                    Icons.Default.KeyboardArrowDown,
                                    contentDescription = stringResource(R.string.next_result)
                                )
                            }
                        }
                    }

                    IconButton(onClick = onClose) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = stringResource(R.string.close_search)
                        )
                    }
                }
            }

            // Search results list (optional, can be shown/hidden)
            if (searchState.hasResults) {
                HorizontalDivider()
                SearchResultsList(
                    results = searchState.results,
                    currentIndex = searchState.currentIndex,
                    query = searchState.query,
                    onResultClick = onResultClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp)
                )
            } else if (!searchState.isSearching && searchState.query.isNotEmpty()) {
                // No results message
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = stringResource(R.string.search_no_results),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/**
 * List of search results
 */
@Composable
private fun SearchResultsList(
    results: List<SearchResult>,
    currentIndex: Int,
    query: String,
    onResultClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(modifier = modifier) {
        itemsIndexed(results) { index, result ->
            SearchResultItem(
                result = result,
                query = query,
                isSelected = index == currentIndex,
                onClick = { onResultClick(index) }
            )
            if (index < results.size - 1) {
                HorizontalDivider(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    color = MaterialTheme.colorScheme.outlineVariant
                )
            }
        }
    }
}

/**
 * Single search result item
 */
@Composable
private fun SearchResultItem(
    result: SearchResult,
    query: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            } else {
                Color.Transparent
            }
        ),
        shape = RoundedCornerShape(0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Chapter info
            result.chapterTitle?.let { title ->
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            // Highlighted text with query match
            val highlightedText = buildAnnotatedString {
                val lowerQuery = query.lowercase()
                val lowerText = result.surroundingText.lowercase()
                var lastIndex = 0

                var index = lowerText.indexOf(lowerQuery)
                while (index >= 0) {
                    // Add text before match
                    append(result.surroundingText.substring(lastIndex, index))
                    // Add highlighted match
                    withStyle(
                        SpanStyle(
                            fontWeight = FontWeight.Bold,
                            background = MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        append(result.surroundingText.substring(index, index + query.length))
                    }
                    lastIndex = index + query.length
                    index = lowerText.indexOf(lowerQuery, lastIndex)
                }
                // Add remaining text
                if (lastIndex < result.surroundingText.length) {
                    append(result.surroundingText.substring(lastIndex))
                }
            }

            Text(
                text = highlightedText,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Mini search bar for compact display in the reader toolbar
 */
@Composable
fun MiniSearchIndicator(
    searchState: SearchState,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (searchState.isActive && searchState.hasResults) {
        Surface(
            modifier = modifier.clickable(onClick = onClick),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.Search,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = "\"${searchState.query}\" (${searchState.resultCountText})",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
