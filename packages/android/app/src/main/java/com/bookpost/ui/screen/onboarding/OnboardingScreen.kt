package com.bookpost.ui.screen.onboarding

import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CollectionsBookmark
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bookpost.R
import kotlinx.coroutines.launch

/**
 * Data class representing an onboarding page with string resource IDs
 */
data class OnboardingPage(
    val icon: ImageVector,
    @StringRes val titleRes: Int,
    @StringRes val descriptionRes: Int
)

/**
 * Default onboarding pages for BookPost using string resources
 */
val onboardingPages = listOf(
    OnboardingPage(
        icon = Icons.AutoMirrored.Filled.MenuBook,
        titleRes = R.string.onboarding_page1_title,
        descriptionRes = R.string.onboarding_page1_desc
    ),
    OnboardingPage(
        icon = Icons.Default.CollectionsBookmark,
        titleRes = R.string.onboarding_page2_title,
        descriptionRes = R.string.onboarding_page2_desc
    ),
    OnboardingPage(
        icon = Icons.Default.Insights,
        titleRes = R.string.onboarding_page3_title,
        descriptionRes = R.string.onboarding_page3_desc
    ),
    OnboardingPage(
        icon = Icons.Default.AutoAwesome,
        titleRes = R.string.onboarding_page4_title,
        descriptionRes = R.string.onboarding_page4_desc
    )
)

/**
 * Onboarding screen with horizontal pager
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    pages: List<OnboardingPage> = onboardingPages,
    onComplete: () -> Unit,
    onSkip: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            // Skip button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                AnimatedVisibility(
                    visible = pagerState.currentPage < pages.size - 1,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    TextButton(onClick = onSkip) {
                        Text(stringResource(R.string.onboarding_skip))
                    }
                }
            }

            // Pager content
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) { page ->
                OnboardingPageContent(page = pages[page])
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Page indicators
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                repeat(pages.size) { index ->
                    PageIndicator(
                        isSelected = pagerState.currentPage == index
                    )
                    if (index < pages.size - 1) {
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Navigation buttons
            if (pagerState.currentPage == pages.size - 1) {
                // Last page - show "Get Started" button
                Button(
                    onClick = onComplete,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(stringResource(R.string.onboarding_start))
                }
            } else {
                // Other pages - show Next and indicator
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Previous button (only show if not on first page)
                    if (pagerState.currentPage > 0) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage - 1)
                                }
                            }
                        ) {
                            Text(stringResource(R.string.onboarding_previous))
                        }
                    } else {
                        Spacer(modifier = Modifier.width(1.dp))
                    }

                    Button(
                        onClick = {
                            scope.launch {
                                pagerState.animateScrollToPage(pagerState.currentPage + 1)
                            }
                        }
                    ) {
                        Text(stringResource(R.string.onboarding_next))
                    }
                }
            }
        }
    }
}

@Composable
private fun OnboardingPageContent(page: OnboardingPage) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Icon with background circle
        Box(
            modifier = Modifier
                .size(160.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = page.icon,
                contentDescription = null,
                modifier = Modifier.size(80.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        }

        Spacer(modifier = Modifier.height(48.dp))

        // Title
        Text(
            text = stringResource(page.titleRes),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Description
        Text(
            text = stringResource(page.descriptionRes),
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 24.dp)
        )
    }
}

@Composable
private fun PageIndicator(isSelected: Boolean) {
    Box(
        modifier = Modifier
            .size(if (isSelected) 12.dp else 8.dp)
            .clip(CircleShape)
            .background(
                if (isSelected)
                    MaterialTheme.colorScheme.primary
                else
                    MaterialTheme.colorScheme.surfaceVariant
            )
    )
}

/**
 * Minimal welcome screen for returning users after app update
 */
@Composable
fun WelcomeBackScreen(
    newFeatures: List<String>,
    onContinue: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.AutoAwesome,
                contentDescription = null,
                modifier = Modifier.size(80.dp),
                tint = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = stringResource(R.string.welcome_back),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = stringResource(R.string.welcome_back_subtitle),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(32.dp))

            // New features list
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                newFeatures.forEach { feature ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = feature,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(48.dp))

            Button(
                onClick = onContinue,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.continue_btn))
            }
        }
    }
}
