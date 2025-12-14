package com.bookpost.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.bookpost.R
import com.bookpost.ui.screen.auth.LoginScreen
import com.bookpost.ui.screen.auth.RegisterScreen
import com.bookpost.ui.screen.bookshelf.MyBookshelfScreen
import com.bookpost.ui.screen.store.StoreScreen
import com.bookpost.ui.screen.ebooks.EbookDetailScreen
import com.bookpost.ui.screen.magazines.MagazineDetailScreen
import com.bookpost.ui.screen.profile.ProfileScreen
import com.bookpost.ui.screen.reader.EpubReaderScreen
import com.bookpost.ui.screen.reader.PdfReaderScreen
import com.bookpost.ui.screen.goals.DailyGoalsScreen
import com.bookpost.ui.screen.badges.BadgesScreen
import com.bookpost.ui.screen.badges.BadgeDetailScreen
import com.bookpost.ui.screen.stats.ReadingStatsScreen
import com.bookpost.ui.screen.booklists.BookListsScreen
import com.bookpost.ui.screen.booklists.BookListDetailScreen
import com.bookpost.ui.screen.booklists.CreateBookListScreen
import com.bookpost.ui.screen.profile.NotesListScreen
import com.bookpost.ui.screen.streak.StreakScreen
import com.bookpost.ui.screen.leaderboard.LeaderboardScreen
import com.bookpost.ui.screen.settings.SettingsScreen

/**
 * Navigation structure matching iOS:
 * - 3 Bottom Tabs: 书架 (Bookshelf) | 书城 (Store) | 我 (Profile)
 * - Store has internal tabs for Ebooks and Magazines
 */
sealed class Screen(val route: String) {
    // Auth
    data object Login : Screen("login")
    data object Register : Screen("register")

    // Main Tabs (3 tabs like iOS)
    data object Bookshelf : Screen("bookshelf")
    data object Store : Screen("store")
    data object Profile : Screen("profile")

    // Detail screens
    data object EbookDetail : Screen("ebook/{id}") {
        fun createRoute(id: Int) = "ebook/$id"
    }
    data object MagazineDetail : Screen("magazine/{id}") {
        fun createRoute(id: Int) = "magazine/$id"
    }

    // Reader screens
    data object PdfReader : Screen("pdf_reader/{type}/{id}") {
        fun createRoute(type: String, id: Int) = "pdf_reader/$type/$id"
    }
    data object EpubReader : Screen("epub_reader/{id}") {
        fun createRoute(id: Int) = "epub_reader/$id"
    }

    // Profile sub-screens
    data object DailyGoals : Screen("daily_goals")
    data object Badges : Screen("badges")
    data object BadgeDetail : Screen("badge/{id}") {
        fun createRoute(id: Int) = "badge/$id"
    }
    data object ReadingStats : Screen("reading_stats")
    data object BookLists : Screen("book_lists")
    data object BookListDetail : Screen("book_list/{id}") {
        fun createRoute(id: Int) = "book_list/$id"
    }
    data object CreateBookList : Screen("create_book_list")
    data object NotesList : Screen("notes_list")
    data object Streak : Screen("streak")
    data object Leaderboard : Screen("leaderboard")
    data object Settings : Screen("settings")
}

sealed class BottomNavItem(
    val route: String,
    val titleResId: Int
) {
    data object Bookshelf : BottomNavItem(
        route = Screen.Bookshelf.route,
        titleResId = R.string.nav_bookshelf
    )
    data object Store : BottomNavItem(
        route = Screen.Store.route,
        titleResId = R.string.nav_store
    )
    data object Profile : BottomNavItem(
        route = Screen.Profile.route,
        titleResId = R.string.nav_profile
    )
}

val bottomNavItems = listOf(
    BottomNavItem.Bookshelf,
    BottomNavItem.Store,
    BottomNavItem.Profile
)

@Composable
fun BookPostNavigation(
    isLoggedIn: Boolean,
    navController: NavHostController = rememberNavController()
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    val showBottomBar = bottomNavItems.any { it.route == currentDestination?.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any { it.route == item.route } == true
                        NavigationBarItem(
                            icon = {
                                when (item) {
                                    is BottomNavItem.Bookshelf -> Icon(
                                        painter = painterResource(
                                            if (selected) R.drawable.ic_bookshelf_filled
                                            else R.drawable.ic_bookshelf_outlined
                                        ),
                                        contentDescription = stringResource(item.titleResId)
                                    )
                                    is BottomNavItem.Store -> Icon(
                                        painter = painterResource(
                                            if (selected) R.drawable.ic_store_filled
                                            else R.drawable.ic_store_outlined
                                        ),
                                        contentDescription = stringResource(item.titleResId)
                                    )
                                    is BottomNavItem.Profile -> Icon(
                                        imageVector = if (selected) Icons.Filled.Person else Icons.Outlined.Person,
                                        contentDescription = stringResource(item.titleResId)
                                    )
                                }
                            },
                            label = { Text(stringResource(item.titleResId)) },
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = if (isLoggedIn) Screen.Bookshelf.route else Screen.Login.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            // Auth screens
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Bookshelf.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateToRegister = {
                        navController.navigate(Screen.Register.route)
                    }
                )
            }

            composable(Screen.Register.route) {
                RegisterScreen(
                    onRegisterSuccess = {
                        navController.navigate(Screen.Bookshelf.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }

            // Tab 1: Bookshelf (书架)
            composable(Screen.Bookshelf.route) {
                MyBookshelfScreen(
                    onBookClick = { id, type ->
                        when (type) {
                            "ebook" -> navController.navigate(Screen.EbookDetail.createRoute(id))
                            "magazine" -> navController.navigate(Screen.MagazineDetail.createRoute(id))
                        }
                    },
                    onNavigateToStore = {
                        navController.navigate(Screen.Store.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }

            // Tab 2: Store (书城)
            composable(Screen.Store.route) {
                StoreScreen(
                    onEbookClick = { id ->
                        navController.navigate(Screen.EbookDetail.createRoute(id))
                    },
                    onMagazineClick = { id ->
                        navController.navigate(Screen.MagazineDetail.createRoute(id))
                    }
                )
            }

            // Tab 3: Profile (我)
            composable(Screen.Profile.route) {
                ProfileScreen(
                    onLogout = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateToGoals = {
                        navController.navigate(Screen.DailyGoals.route)
                    },
                    onNavigateToBadges = {
                        navController.navigate(Screen.Badges.route)
                    },
                    onNavigateToStats = {
                        navController.navigate(Screen.ReadingStats.route)
                    },
                    onNavigateToBookLists = {
                        navController.navigate(Screen.BookLists.route)
                    },
                    onNavigateToNotes = {
                        navController.navigate(Screen.NotesList.route)
                    },
                    onNavigateToStreak = {
                        navController.navigate(Screen.Streak.route)
                    },
                    onNavigateToLeaderboard = {
                        navController.navigate(Screen.Leaderboard.route)
                    },
                    onNavigateToSettings = {
                        navController.navigate(Screen.Settings.route)
                    }
                )
            }

            // Detail screens
            composable(
                route = Screen.EbookDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { backStackEntry ->
                val ebookId = backStackEntry.arguments?.getInt("id") ?: return@composable
                EbookDetailScreen(
                    ebookId = ebookId,
                    onNavigateBack = { navController.popBackStack() },
                    onReadClick = { id, isPdf ->
                        if (isPdf) {
                            navController.navigate(Screen.PdfReader.createRoute("ebook", id))
                        } else {
                            navController.navigate(Screen.EpubReader.createRoute(id))
                        }
                    }
                )
            }

            composable(
                route = Screen.MagazineDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { backStackEntry ->
                val magazineId = backStackEntry.arguments?.getInt("id") ?: return@composable
                MagazineDetailScreen(
                    magazineId = magazineId,
                    onNavigateBack = { navController.popBackStack() },
                    onReadClick = { id ->
                        navController.navigate(Screen.PdfReader.createRoute("magazine", id))
                    }
                )
            }

            // Reader screens
            composable(
                route = Screen.PdfReader.route,
                arguments = listOf(
                    navArgument("type") { type = NavType.StringType },
                    navArgument("id") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val type = backStackEntry.arguments?.getString("type") ?: return@composable
                val id = backStackEntry.arguments?.getInt("id") ?: return@composable
                PdfReaderScreen(
                    type = type,
                    id = id,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.EpubReader.route,
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { backStackEntry ->
                val ebookId = backStackEntry.arguments?.getInt("id") ?: return@composable
                EpubReaderScreen(
                    ebookId = ebookId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Profile sub-screens
            composable(Screen.DailyGoals.route) {
                DailyGoalsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Badges.route) {
                BadgesScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onBadgeClick = { badge ->
                        // Store the badge in saved state for the detail screen
                        navController.currentBackStackEntry?.savedStateHandle?.set("badge", badge)
                        navController.navigate(Screen.BadgeDetail.createRoute(badge.id))
                    }
                )
            }

            composable(
                route = Screen.BadgeDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { backStackEntry ->
                // Retrieve the badge from the previous screen's saved state
                val badge = navController.previousBackStackEntry?.savedStateHandle?.get<com.bookpost.domain.model.BadgeItem>("badge")
                if (badge != null) {
                    BadgeDetailScreen(
                        badge = badge,
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
            }

            composable(Screen.ReadingStats.route) {
                ReadingStatsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.BookLists.route) {
                BookListsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onListClick = { id ->
                        navController.navigate(Screen.BookListDetail.createRoute(id))
                    },
                    onCreateClick = {
                        navController.navigate(Screen.CreateBookList.route)
                    }
                )
            }

            composable(
                route = Screen.BookListDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { backStackEntry ->
                val listId = backStackEntry.arguments?.getInt("id") ?: return@composable
                BookListDetailScreen(
                    listId = listId,
                    onNavigateBack = { navController.popBackStack() },
                    onBookClick = { bookId, bookType ->
                        if (bookType == "ebook") {
                            navController.navigate(Screen.EbookDetail.createRoute(bookId))
                        } else {
                            navController.navigate(Screen.MagazineDetail.createRoute(bookId))
                        }
                    }
                )
            }

            composable(Screen.CreateBookList.route) {
                CreateBookListScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onCreated = { newListId ->
                        navController.navigate(Screen.BookListDetail.createRoute(newListId)) {
                            popUpTo(Screen.BookLists.route)
                        }
                    }
                )
            }

            composable(Screen.NotesList.route) {
                NotesListScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Streak.route) {
                StreakScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Leaderboard.route) {
                LeaderboardScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}
