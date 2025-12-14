package com.bookpost.ui.screen.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.BuildConfig
import com.bookpost.R
import com.bookpost.data.local.datastore.AppLanguage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val selectedLanguage by viewModel.selectedLanguage.collectAsState()
    val darkModeEnabled by viewModel.darkModeEnabled.collectAsState()
    val notificationsEnabled by viewModel.notificationsEnabled.collectAsState()
    val cacheSize by viewModel.cacheSize.collectAsState()

    var showLanguageDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings)) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Appearance section
            Text(
                text = stringResource(R.string.settings_appearance),
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
                    ListItem(
                        headlineContent = { Text(stringResource(R.string.settings_dark_mode)) },
                        leadingContent = {
                            Icon(Icons.Default.DarkMode, contentDescription = null)
                        },
                        trailingContent = {
                            Switch(
                                checked = darkModeEnabled,
                                onCheckedChange = { viewModel.setDarkMode(it) }
                            )
                        }
                    )

                    ListItem(
                        headlineContent = { Text(stringResource(R.string.settings_language)) },
                        supportingContent = {
                            Text(getLanguageDisplayName(selectedLanguage))
                        },
                        leadingContent = {
                            Icon(Icons.Default.Language, contentDescription = null)
                        },
                        modifier = Modifier.clickable { showLanguageDialog = true }
                    )
                }
            }

            // Notifications section
            Text(
                text = stringResource(R.string.settings_notifications),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(top = 24.dp, bottom = 8.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                ListItem(
                    headlineContent = { Text(stringResource(R.string.settings_push_notifications)) },
                    supportingContent = { Text(stringResource(R.string.settings_push_notifications_desc)) },
                    leadingContent = {
                        Icon(Icons.Default.Notifications, contentDescription = null)
                    },
                    trailingContent = {
                        Switch(
                            checked = notificationsEnabled,
                            onCheckedChange = { viewModel.setNotifications(it) }
                        )
                    }
                )
            }

            // Storage section
            Text(
                text = stringResource(R.string.settings_storage),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(top = 24.dp, bottom = 8.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                ListItem(
                    headlineContent = { Text(stringResource(R.string.settings_clear_cache)) },
                    supportingContent = { Text(stringResource(R.string.settings_cache_used, cacheSize)) },
                    leadingContent = {
                        Icon(Icons.Default.Storage, contentDescription = null)
                    },
                    modifier = Modifier.clickable { viewModel.clearCache() }
                )
            }

            // About section
            Text(
                text = stringResource(R.string.settings_about),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(top = 24.dp, bottom = 8.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column {
                    ListItem(
                        headlineContent = { Text(stringResource(R.string.settings_version)) },
                        supportingContent = { Text(BuildConfig.VERSION_NAME) },
                        leadingContent = {
                            Icon(Icons.Default.Info, contentDescription = null)
                        }
                    )

                    ListItem(
                        headlineContent = { Text(stringResource(R.string.settings_help)) },
                        leadingContent = {
                            Icon(Icons.AutoMirrored.Filled.HelpOutline, contentDescription = null)
                        }
                    )
                }
            }
        }
    }

    // Language selection dialog
    if (showLanguageDialog) {
        LanguageSelectionDialog(
            currentLanguage = selectedLanguage,
            onLanguageSelected = { language ->
                viewModel.setLanguage(language)
                showLanguageDialog = false
            },
            onDismiss = { showLanguageDialog = false }
        )
    }
}

@Composable
private fun LanguageSelectionDialog(
    currentLanguage: AppLanguage,
    onLanguageSelected: (AppLanguage) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.settings_select_language)) },
        text = {
            Column {
                AppLanguage.entries.forEach { language ->
                    ListItem(
                        headlineContent = {
                            Text(getLanguageDisplayName(language))
                        },
                        trailingContent = {
                            if (language == currentLanguage) {
                                Icon(
                                    Icons.Default.Check,
                                    contentDescription = "Selected",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        },
                        modifier = Modifier.clickable { onLanguageSelected(language) }
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}

@Composable
private fun getLanguageDisplayName(language: AppLanguage): String {
    return when (language) {
        AppLanguage.SYSTEM -> stringResource(R.string.language_system)
        AppLanguage.CHINESE -> stringResource(R.string.language_chinese)
        AppLanguage.ENGLISH -> stringResource(R.string.language_english)
    }
}
