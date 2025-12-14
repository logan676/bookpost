package com.bookpost.data.local.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

private val Context.languageDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "language_prefs"
)

/**
 * Supported languages for the app
 */
enum class AppLanguage(
    val code: String,
    val displayName: String,
    val nativeName: String
) {
    SYSTEM("system", "System Default", "跟随系统"),
    CHINESE("zh", "Chinese", "中文"),
    ENGLISH("en", "English", "English");

    companion object {
        fun fromCode(code: String): AppLanguage {
            return entries.find { it.code == code } ?: SYSTEM
        }
    }
}

/**
 * DataStore for managing language preferences
 */
@Singleton
class LanguagePreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.languageDataStore

    companion object {
        private val KEY_LANGUAGE = stringPreferencesKey("selected_language")
    }

    /**
     * Flow of the currently selected language
     */
    val selectedLanguage: Flow<AppLanguage> = dataStore.data.map { preferences ->
        val code = preferences[KEY_LANGUAGE] ?: AppLanguage.SYSTEM.code
        AppLanguage.fromCode(code)
    }

    /**
     * Get the current language synchronously (for initial app setup)
     */
    fun getCurrentLanguageBlocking(): AppLanguage {
        return runBlocking {
            selectedLanguage.first()
        }
    }

    /**
     * Update the selected language
     * Note: The app should be recreated after changing the language
     */
    suspend fun setLanguage(language: AppLanguage) {
        dataStore.edit { preferences ->
            preferences[KEY_LANGUAGE] = language.code
        }
    }

    /**
     * Get the locale for the selected language
     */
    fun getLocale(language: AppLanguage): Locale {
        return when (language) {
            AppLanguage.SYSTEM -> Locale.getDefault()
            AppLanguage.CHINESE -> Locale.SIMPLIFIED_CHINESE
            AppLanguage.ENGLISH -> Locale.ENGLISH
        }
    }
}
