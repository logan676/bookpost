package com.bookpost.ui.screen.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.BuildConfig
import com.bookpost.data.local.datastore.OnboardingStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * State representing onboarding/welcome flow
 */
data class OnboardingUiState(
    val showOnboarding: Boolean = false,
    val showWhatsNew: Boolean = false,
    val isLoading: Boolean = true
)

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val onboardingStore: OnboardingStore
) : ViewModel() {

    val uiState: StateFlow<OnboardingUiState> = combine(
        onboardingStore.onboardingCompleted,
        onboardingStore.lastSeenVersion
    ) { completed, lastVersion ->
        val currentVersion = BuildConfig.VERSION_CODE

        OnboardingUiState(
            showOnboarding = !completed,
            showWhatsNew = completed && lastVersion < currentVersion,
            isLoading = false
        )
    }.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        OnboardingUiState(isLoading = true)
    )

    /**
     * Complete the onboarding flow
     */
    fun completeOnboarding() {
        viewModelScope.launch {
            onboardingStore.completeOnboarding()
            onboardingStore.updateLastSeenVersion(BuildConfig.VERSION_CODE)
        }
    }

    /**
     * Dismiss the "What's New" screen
     */
    fun dismissWhatsNew() {
        viewModelScope.launch {
            onboardingStore.updateLastSeenVersion(BuildConfig.VERSION_CODE)
        }
    }

    /**
     * Skip onboarding (same as completing)
     */
    fun skipOnboarding() {
        completeOnboarding()
    }
}
