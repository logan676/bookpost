package com.bookpost.ui.screen.reader.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.FormatQuote
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.bookpost.R
import com.bookpost.domain.model.Highlight
import com.bookpost.domain.model.PopularUnderline
import com.bookpost.domain.model.QuoteCardStyle

/**
 * Social Features Bottom Sheet with tabs for popular highlights and share
 */
@Composable
fun SocialFeaturesSheet(
    popularUnderlines: List<PopularUnderline>,
    myHighlights: List<Highlight>,
    isLoading: Boolean,
    shareImageUrl: String?,
    isGeneratingShare: Boolean,
    onLoadPopular: () -> Unit,
    onLikeUnderline: (Int) -> Unit,
    onUnlikeUnderline: (Int) -> Unit,
    onShareHighlight: (Int, QuoteCardStyle) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTabIndex by remember { mutableIntStateOf(0) }

    val tabs = listOf(
        SocialTab("热门划线", Icons.Default.People),
        SocialTab("分享金句", Icons.Default.Share)
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
    ) {
        // Tab Row
        TabRow(selectedTabIndex = selectedTabIndex) {
            tabs.forEachIndexed { index, tab ->
                Tab(
                    selected = selectedTabIndex == index,
                    onClick = {
                        selectedTabIndex = index
                        if (index == 0 && popularUnderlines.isEmpty()) {
                            onLoadPopular()
                        }
                    },
                    text = { Text(tab.title) },
                    icon = { Icon(tab.icon, contentDescription = tab.title) }
                )
            }
        }

        // Tab Content
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f, fill = false)
                .padding(16.dp)
        ) {
            when (selectedTabIndex) {
                0 -> PopularUnderlinesTab(
                    underlines = popularUnderlines,
                    isLoading = isLoading,
                    onLoad = onLoadPopular,
                    onLike = onLikeUnderline,
                    onUnlike = onUnlikeUnderline
                )
                1 -> ShareQuoteTab(
                    highlights = myHighlights,
                    shareImageUrl = shareImageUrl,
                    isGenerating = isGeneratingShare,
                    onShare = onShareHighlight
                )
            }
        }

        // Close button
        Button(
            onClick = onDismiss,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Text(stringResource(R.string.confirm))
        }
    }
}

private data class SocialTab(val title: String, val icon: ImageVector)

@Composable
private fun PopularUnderlinesTab(
    underlines: List<PopularUnderline>,
    isLoading: Boolean,
    onLoad: () -> Unit,
    onLike: (Int) -> Unit,
    onUnlike: (Int) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        when {
            isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("正在加载热门划线...")
                    }
                }
            }
            underlines.isEmpty() -> {
                EmptySocialState(
                    icon = Icons.Default.People,
                    message = "查看热门划线",
                    description = "看看其他读者划下的精彩段落",
                    buttonText = "加载热门划线",
                    onAction = onLoad
                )
            }
            else -> {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(underlines) { underline ->
                        PopularUnderlineCard(
                            underline = underline,
                            onLike = { onLike(underline.id) },
                            onUnlike = { onUnlike(underline.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PopularUnderlineCard(
    underline: PopularUnderline,
    onLike: () -> Unit,
    onUnlike: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Quote icon and text
            Row(verticalAlignment = Alignment.Top) {
                Icon(
                    Icons.Default.FormatQuote,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = underline.text,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(8.dp))

            // User info and like button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // User info
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (underline.userAvatarUrl != null) {
                        AsyncImage(
                            model = underline.userAvatarUrl,
                            contentDescription = null,
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = underline.userName?.firstOrNull()?.toString() ?: "?",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = underline.userName ?: "匿名用户",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Like button
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable {
                        if (underline.isLiked) onUnlike() else onLike()
                    }
                ) {
                    Icon(
                        if (underline.isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = if (underline.isLiked) "取消喜欢" else "喜欢",
                        tint = if (underline.isLiked) Color.Red else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${underline.likeCount}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Chapter title if available
            underline.chapterTitle?.let { chapter ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "— $chapter",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun ShareQuoteTab(
    highlights: List<Highlight>,
    shareImageUrl: String?,
    isGenerating: Boolean,
    onShare: (Int, QuoteCardStyle) -> Unit
) {
    var selectedHighlightId by remember { mutableIntStateOf(-1) }
    var selectedStyle by remember { mutableIntStateOf(0) }

    val styles = QuoteCardStyle.entries.toList()

    Column(modifier = Modifier.fillMaxWidth()) {
        if (highlights.isEmpty()) {
            EmptySocialState(
                icon = Icons.Default.FormatQuote,
                message = "暂无划线",
                description = "在阅读时划线标记精彩段落，即可分享金句",
                buttonText = "",
                onAction = {}
            )
        } else {
            Text(
                text = "选择要分享的划线",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Highlight selection
            LazyColumn(
                modifier = Modifier.height(150.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(highlights) { highlight ->
                    HighlightSelectionCard(
                        highlight = highlight,
                        isSelected = selectedHighlightId == highlight.id,
                        onSelect = { selectedHighlightId = highlight.id }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "选择卡片样式",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Style selection
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                styles.forEachIndexed { index, style ->
                    StyleChip(
                        style = style,
                        isSelected = selectedStyle == index,
                        onSelect = { selectedStyle = index }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Share button
            Button(
                onClick = {
                    if (selectedHighlightId > 0) {
                        onShare(selectedHighlightId, styles[selectedStyle])
                    }
                },
                enabled = selectedHighlightId > 0 && !isGenerating,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (isGenerating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("生成中...")
                } else {
                    Icon(Icons.Default.Share, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("生成分享图片")
                }
            }

            // Generated image preview
            shareImageUrl?.let { url ->
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "分享图片已生成",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        AsyncImage(
                            model = url,
                            contentDescription = "分享图片预览",
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp)
                                .clip(RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Fit
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HighlightSelectionCard(
    highlight: Highlight,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSelect() },
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                MaterialTheme.colorScheme.primaryContainer
            else
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Text(
            text = highlight.text,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(12.dp)
        )
    }
}

@Composable
private fun StyleChip(
    style: QuoteCardStyle,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (isSelected)
            MaterialTheme.colorScheme.primaryContainer
        else
            MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.clickable { onSelect() }
    ) {
        Text(
            text = style.displayName,
            style = MaterialTheme.typography.labelMedium,
            color = if (isSelected)
                MaterialTheme.colorScheme.onPrimaryContainer
            else
                MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        )
    }
}

@Composable
private fun EmptySocialState(
    icon: ImageVector,
    message: String,
    description: String,
    buttonText: String,
    onAction: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            icon,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        if (buttonText.isNotEmpty()) {
            Spacer(modifier = Modifier.height(24.dp))
            Button(onClick = onAction) {
                Text(buttonText)
            }
        }
    }
}
