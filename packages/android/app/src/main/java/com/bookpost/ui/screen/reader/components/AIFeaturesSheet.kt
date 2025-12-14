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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.QuestionAnswer
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.bookpost.R
import com.bookpost.domain.model.AIGuide
import com.bookpost.domain.model.AIChatMessage
import com.bookpost.domain.model.BookOutline
import com.bookpost.domain.model.ChatRole
import com.bookpost.domain.model.DictionaryResult
import com.bookpost.domain.model.OutlineSection

/**
 * AI Features Bottom Sheet with tabs for different AI capabilities
 */
@Composable
fun AIFeaturesSheet(
    aiGuide: AIGuide?,
    bookOutline: BookOutline?,
    dictionaryResult: DictionaryResult?,
    chatMessages: List<AIChatMessage>,
    isLoading: Boolean,
    selectedWord: String?,
    onLoadGuide: () -> Unit,
    onLoadOutline: () -> Unit,
    onLookupWord: (String) -> Unit,
    onAskQuestion: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTabIndex by remember { mutableIntStateOf(0) }

    val tabs = listOf(
        AITab("AI 指南", Icons.Default.Lightbulb),
        AITab("查词", Icons.Default.Book),
        AITab("大纲", Icons.AutoMirrored.Filled.List),
        AITab("问答", Icons.Default.QuestionAnswer)
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
                    onClick = { selectedTabIndex = index },
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
                0 -> AIGuideTab(
                    aiGuide = aiGuide,
                    isLoading = isLoading,
                    onLoad = onLoadGuide
                )
                1 -> DictionaryTab(
                    dictionaryResult = dictionaryResult,
                    selectedWord = selectedWord,
                    isLoading = isLoading,
                    onLookup = onLookupWord
                )
                2 -> OutlineTab(
                    bookOutline = bookOutline,
                    isLoading = isLoading,
                    onLoad = onLoadOutline
                )
                3 -> QATab(
                    messages = chatMessages,
                    isLoading = isLoading,
                    onAsk = onAskQuestion
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

private data class AITab(val title: String, val icon: ImageVector)

@Composable
private fun AIGuideTab(
    aiGuide: AIGuide?,
    isLoading: Boolean,
    onLoad: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
    ) {
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
                        Text("正在生成 AI 指南...")
                    }
                }
            }
            aiGuide != null -> {
                Text(
                    text = aiGuide.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))

                // Summary
                SectionCard(title = "📖 概要") {
                    Text(aiGuide.summary, style = MaterialTheme.typography.bodyMedium)
                }

                // Reading info
                if (aiGuide.estimatedReadingTime != null || aiGuide.difficulty != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        aiGuide.estimatedReadingTime?.let { time ->
                            InfoChip(icon = Icons.Default.AutoAwesome, text = "预计 $time")
                        }
                        aiGuide.difficulty?.let { diff ->
                            InfoChip(icon = Icons.Default.AutoAwesome, text = diff)
                        }
                    }
                }

                // Key points
                if (aiGuide.keyPoints.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    SectionCard(title = "💡 核心观点") {
                        aiGuide.keyPoints.forEachIndexed { index, point ->
                            Row(modifier = Modifier.padding(vertical = 4.dp)) {
                                Text(
                                    "${index + 1}. ",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(point, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }

                // Reading tips
                if (aiGuide.readingTips.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    SectionCard(title = "📝 阅读建议") {
                        aiGuide.readingTips.forEach { tip ->
                            Row(modifier = Modifier.padding(vertical = 2.dp)) {
                                Text("• ", color = MaterialTheme.colorScheme.primary)
                                Text(tip, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
            else -> {
                EmptyAIState(
                    icon = Icons.Default.Lightbulb,
                    message = "获取 AI 阅读指南",
                    description = "AI 将为您分析这本书的核心内容和阅读建议",
                    buttonText = "生成指南",
                    onAction = onLoad
                )
            }
        }
    }
}

@Composable
private fun DictionaryTab(
    dictionaryResult: DictionaryResult?,
    selectedWord: String?,
    isLoading: Boolean,
    onLookup: (String) -> Unit
) {
    var searchWord by remember { mutableStateOf(selectedWord ?: "") }

    Column(modifier = Modifier.fillMaxWidth()) {
        // Search field
        OutlinedTextField(
            value = searchWord,
            onValueChange = { searchWord = it },
            label = { Text("输入要查询的词") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            trailingIcon = {
                IconButton(
                    onClick = { if (searchWord.isNotBlank()) onLookup(searchWord) },
                    enabled = searchWord.isNotBlank() && !isLoading
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "查询")
                }
            }
        )

        Spacer(modifier = Modifier.height(16.dp))

        when {
            isLoading -> {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            dictionaryResult != null -> {
                Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                    Text(
                        text = dictionaryResult.word,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )

                    dictionaryResult.phonetic?.let { phonetic ->
                        Text(
                            text = phonetic,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    dictionaryResult.partOfSpeech?.let { pos ->
                        Text(
                            text = pos,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = dictionaryResult.definition,
                        style = MaterialTheme.typography.bodyLarge
                    )

                    if (dictionaryResult.examples.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "例句",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold
                        )
                        dictionaryResult.examples.forEach { example ->
                            Text(
                                text = "• $example",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(vertical = 2.dp)
                            )
                        }
                    }

                    if (dictionaryResult.synonyms.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "近义词: ${dictionaryResult.synonyms.joinToString(", ")}",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
            else -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "输入词语并点击查询",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun OutlineTab(
    bookOutline: BookOutline?,
    isLoading: Boolean,
    onLoad: () -> Unit
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
                        Text("正在生成大纲...")
                    }
                }
            }
            bookOutline != null -> {
                LazyColumn {
                    items(bookOutline.sections) { section ->
                        OutlineSectionItem(section = section, level = 0)
                    }
                }
            }
            else -> {
                EmptyAIState(
                    icon = Icons.AutoMirrored.Filled.List,
                    message = "生成 AI 大纲",
                    description = "AI 将为您分析并生成这本书的结构大纲",
                    buttonText = "生成大纲",
                    onAction = onLoad
                )
            }
        }
    }
}

@Composable
private fun OutlineSectionItem(section: OutlineSection, level: Int) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = (level * 16).dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.Top
        ) {
            Text(
                text = "•",
                modifier = Modifier.padding(end = 8.dp),
                color = MaterialTheme.colorScheme.primary
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = section.title,
                    style = if (level == 0) MaterialTheme.typography.titleSmall
                    else MaterialTheme.typography.bodyMedium,
                    fontWeight = if (level == 0) FontWeight.Bold else FontWeight.Normal
                )
                section.summary?.let { summary ->
                    Text(
                        text = summary,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            section.pageStart?.let { page ->
                Text(
                    text = "P.$page",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        section.children.forEach { child ->
            OutlineSectionItem(section = child, level = level + 1)
        }
    }
}

@Composable
private fun QATab(
    messages: List<AIChatMessage>,
    isLoading: Boolean,
    onAsk: (String) -> Unit
) {
    var question by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxWidth()) {
        // Messages list
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (messages.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(150.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.QuestionAnswer,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "有什么关于这本书的问题吗？",
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            items(messages) { message ->
                ChatBubble(message = message)
            }

            if (isLoading) {
                item {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("AI 正在思考...", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Input field
        OutlinedTextField(
            value = question,
            onValueChange = { question = it },
            placeholder = { Text("输入你的问题...") },
            modifier = Modifier.fillMaxWidth(),
            maxLines = 3,
            trailingIcon = {
                IconButton(
                    onClick = {
                        if (question.isNotBlank()) {
                            onAsk(question)
                            question = ""
                        }
                    },
                    enabled = question.isNotBlank() && !isLoading
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "发送")
                }
            }
        )
    }
}

@Composable
private fun ChatBubble(message: AIChatMessage) {
    val isUser = message.role == ChatRole.USER

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isUser) 16.dp else 4.dp,
                bottomEnd = if (isUser) 4.dp else 16.dp
            ),
            color = if (isUser)
                MaterialTheme.colorScheme.primaryContainer
            else
                MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.padding(horizontal = 8.dp)
        ) {
            Text(
                text = message.content,
                modifier = Modifier.padding(12.dp),
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun InfoChip(icon: ImageVector, text: String) {
    Surface(
        shape = CircleShape,
        color = MaterialTheme.colorScheme.secondaryContainer
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onSecondaryContainer
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSecondaryContainer
            )
        }
    }
}

@Composable
private fun EmptyAIState(
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
        Spacer(modifier = Modifier.height(24.dp))
        OutlinedButton(onClick = onAction) {
            Icon(Icons.Default.AutoAwesome, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(buttonText)
        }
    }
}
