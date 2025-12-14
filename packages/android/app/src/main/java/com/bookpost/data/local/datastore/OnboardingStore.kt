package com.bookpost.data.local.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.onboardingDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "onboarding_prefs"
)

/**
 * DataStore for managing onboarding state
 */
@Singleton
class OnboardingStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.onboardingDataStore

    companion object {
        private val KEY_ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")
        private val KEY_LAST_SEEN_VERSION = intPreferencesKey("last_seen_app_version")
    }

    /**
     * Flow indicating whether onboarding has been completed
     */
    val onboardingCompleted: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[KEY_ONBOARDING_COMPLETED] ?: false
    }

    /**
     * Flow of the last app version user has seen (for "What's New" screens)
     */
    val lastSeenVersion: Flow<Int> = dataStore.data.map { preferences ->
        preferences[KEY_LAST_SEEN_VERSION] ?: 0
    }

    /**
     * Mark onboarding as completed
     */
    suspend fun completeOnboarding() {
        dataStore.edit { preferences ->
            preferences[KEY_ONBOARDING_COMPLETED] = true
        }
    }

    /**
     * Reset onboarding (for testing or re-showing)
     */
    suspend fun resetOnboarding() {
        dataStore.edit { preferences ->
            preferences[KEY_ONBOARDING_COMPLETED] = false
        }
    }

    /**
     * Update the last seen app version
     */
    suspend fun updateLastSeenVersion(version: Int) {
        dataStore.edit { preferences ->
            preferences[KEY_LAST_SEEN_VERSION] = version
        }
    }
}
