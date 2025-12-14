package com.bookpost.ui.screen.leaderboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bookpost.R

data class LeaderboardEntry(
    val rank: Int,
    val username: String,
    val readingMinutes: Int,
    val isCurrentUser: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardScreen(
    onNavigateBack: () -> Unit
) {
    // Sample data
    val entries = listOf(
        LeaderboardEntry(1, "BookLover123", 1250),
        LeaderboardEntry(2, "Reader42", 980),
        LeaderboardEntry(3, "NovelFan", 875),
        LeaderboardEntry(4, "You", 650, isCurrentUser = true),
        LeaderboardEntry(5, "PageTurner", 520),
        LeaderboardEntry(6, "StoryHunter", 480),
        LeaderboardEntry(7, "BookWorm88", 420),
        LeaderboardEntry(8, "LitFan", 380),
        LeaderboardEntry(9, "ReadMore", 350),
        LeaderboardEntry(10, "ChapterChaser", 320)
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.leaderboard)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
            }

            itemsIndexed(entries) { _, entry ->
                LeaderboardRow(entry = entry)
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun LeaderboardRow(
    entry: LeaderboardEntry
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (entry.isCurrentUser)
                MaterialTheme.colorScheme.primaryContainer
            else
                MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Rank
            Text(
                text = when (entry.rank) {
                    1 -> "🥇"
                    2 -> "🥈"
                    3 -> "🥉"
                    else -> "#${entry.rank}"
                },
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(40.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            // Avatar
            Surface(
                modifier = Modifier.size(40.dp),
                shape = CircleShape,
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.padding(8.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Username
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = entry.username,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (entry.isCurrentUser) FontWeight.Bold else FontWeight.Normal
                )
            }

            // Reading time
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${entry.readingMinutes}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "分钟",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
