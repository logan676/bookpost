package com.bookpost.ui.screen.profile

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.Notes
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CollectionsBookmark
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.R
import com.bookpost.ui.screen.auth.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    onNavigateToGoals: () -> Unit = {},
    onNavigateToBadges: () -> Unit = {},
    onNavigateToStats: () -> Unit = {},
    onNavigateToBookLists: () -> Unit = {},
    onNavigateToNotes: () -> Unit = {},
    onNavigateToStreak: () -> Unit = {},
    onNavigateToLeaderboard: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val currentUser by authViewModel.currentUser.collectAsState()
    var showLogoutDialog by remember { mutableStateOf(false) }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text(stringResource(R.string.logout)) },
            text = { Text(stringResource(R.string.logout_confirm)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        authViewModel.logout()
                        onLogout()
                    }
                ) {
                    Text(stringResource(R.string.confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.nav_profile)) }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // User avatar
            Surface(
                modifier = Modifier.size(80.dp),
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // User info
            Text(
                text = currentUser?.username ?: "用户",
                style = MaterialTheme.typography.titleLarge
            )

            Text(
                text = currentUser?.email ?: "",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Reading section
            ProfileSection(title = "阅读") {
                ProfileMenuItem(
                    icon = { Icon(Icons.Default.Flag, contentDescription = null) },
                    title = stringResource(R.string.reading_goals),
                    onClick = onNavigateToGoals
                )
                ProfileMenuItem(
                    icon = { Icon(Icons.Default.LocalFireDepartment, contentDescription = null) },
                    title = stringResource(R.string.streak),
                    onClick = onNavigateToStreak
                )
                ProfileMenuItem(
                    icon = { Icon(Icons.Default.BarChart, contentDescription = null) },
                    title = stringResource(R.string.reading_stats),
                    onClick = onNavigateToStats
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Collection section
            ProfileSection(title = "收藏") {
                ProfileMenuItem(
                    icon = { Icon(Icons.Default.CollectionsBookmark, contentDescription = null) },
                    title = stringResource(R.string.my_booklists),
                    onClick = onNavigateToBookLists
                )
                ProfileMenuItem(
                    icon = { Icon(Icons.AutoMirrored.Filled.Notes, contentDescription = null) },
                    title = stringResource(R.string.my_notes),
                    onClick = onNavigateToNotes
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Achievement section
            ProfileSection(title = "成就") {
                ProfileMenuItem(
                    icon = { Icon(Icons.Default.EmojiEvents, contentDescription = null) },
                    title = stringResource(R.string.my_badges),
                    onClick = onNavigateToBadges
                )
                ProfileMenuItem(
                    icon = { Icon(Icons.Default.Leaderboard, contentDescription = null) },
                    title = stringResource(R.string.leaderboard),
                    onClick = onNavigateToLeaderboard
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Settings section
            ProfileSection(title = "其他") {
                ProfileMenuItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    title = stringResource(R.string.settings),
                    onClick = onNavigateToSettings
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Logout button
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                onClick = { showLogoutDialog = true }
            ) {
                ListItem(
                    headlineContent = {
                        Text(
                            stringResource(R.string.logout),
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    },
                    leadingContent = {
                        Icon(
                            Icons.AutoMirrored.Filled.ExitToApp,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                )
            }
        }
    }
}

@Composable
private fun ProfileSection(
    title: String,
    content: @Composable () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column {
                content()
            }
        }
    }
}

@Composable
private fun ProfileMenuItem(
    icon: @Composable () -> Unit,
    title: String,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        ListItem(
            headlineContent = { Text(title) },
            leadingContent = icon
        )
    }
}
