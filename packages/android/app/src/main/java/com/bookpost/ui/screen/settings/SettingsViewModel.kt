package com.bookpost.ui.screen.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.local.datastore.AppLanguage
import com.bookpost.data.local.datastore.LanguagePreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val selectedLanguage: AppLanguage = AppLanguage.SYSTEM,
    val darkModeEnabled: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val cacheSize: String = "0 MB"
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val languagePreferences: LanguagePreferences
) : ViewModel() {

    private val _darkModeEnabled = MutableStateFlow(false)
    private val _notificationsEnabled = MutableStateFlow(true)
    private val _cacheSize = MutableStateFlow("45.2 MB")

    val selectedLanguage: StateFlow<AppLanguage> = languagePreferences.selectedLanguage
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5000),
            AppLanguage.SYSTEM
        )

    val darkModeEnabled: StateFlow<Boolean> = _darkModeEnabled
    val notificationsEnabled: StateFlow<Boolean> = _notificationsEnabled
    val cacheSize: StateFlow<String> = _cacheSize

    fun setLanguage(language: AppLanguage) {
        viewModelScope.launch {
            languagePreferences.setLanguage(language)
        }
    }

    fun setDarkMode(enabled: Boolean) {
        _darkModeEnabled.value = enabled
    }

    fun setNotifications(enabled: Boolean) {
        _notificationsEnabled.value = enabled
    }

    fun clearCache() {
        viewModelScope.launch {
            _cacheSize.value = "0 MB"
        }
    }
}
