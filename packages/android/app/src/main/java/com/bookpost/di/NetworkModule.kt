package com.bookpost.di

import com.bookpost.BuildConfig
import com.bookpost.data.local.datastore.UserPreferences
import com.bookpost.data.remote.api.AuthApi
import com.bookpost.data.remote.api.EbooksApi
import com.bookpost.data.remote.api.MagazinesApi
import com.bookpost.data.remote.api.ReadingHistoryApi
import com.bookpost.data.remote.api.BadgesApi
import com.bookpost.data.remote.api.BooksApi
import com.bookpost.data.remote.api.ReadingSessionApi
import com.bookpost.data.remote.api.ReadingStatsApi
import com.bookpost.data.remote.api.BookListsApi
import com.bookpost.data.remote.api.BookmarksApi
import com.bookpost.data.remote.api.NotesApi
import com.bookpost.data.remote.api.AIApi
import com.bookpost.data.remote.api.AudioApi
import com.bookpost.data.remote.api.SocialApi
import com.bookpost.data.remote.interceptor.AuthInterceptor
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    @Provides
    @Singleton
    fun provideAuthInterceptor(userPreferences: UserPreferences): AuthInterceptor {
        return AuthInterceptor(userPreferences)
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: AuthInterceptor): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, json: Json): Retrofit {
        val contentType = "application/json".toMediaType()
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi {
        return retrofit.create(AuthApi::class.java)
    }

    @Provides
    @Singleton
    fun provideEbooksApi(retrofit: Retrofit): EbooksApi {
        return retrofit.create(EbooksApi::class.java)
    }

    @Provides
    @Singleton
    fun provideMagazinesApi(retrofit: Retrofit): MagazinesApi {
        return retrofit.create(MagazinesApi::class.java)
    }

    @Provides
    @Singleton
    fun provideReadingHistoryApi(retrofit: Retrofit): ReadingHistoryApi {
        return retrofit.create(ReadingHistoryApi::class.java)
    }

    @Provides
    @Singleton
    fun provideBooksApi(retrofit: Retrofit): BooksApi {
        return retrofit.create(BooksApi::class.java)
    }

    @Provides
    @Singleton
    fun provideReadingSessionApi(retrofit: Retrofit): ReadingSessionApi {
        return retrofit.create(ReadingSessionApi::class.java)
    }

    @Provides
    @Singleton
    fun provideBadgesApi(retrofit: Retrofit): BadgesApi {
        return retrofit.create(BadgesApi::class.java)
    }

    @Provides
    @Singleton
    fun provideReadingStatsApi(retrofit: Retrofit): ReadingStatsApi {
        return retrofit.create(ReadingStatsApi::class.java)
    }

    @Provides
    @Singleton
    fun provideBookListsApi(retrofit: Retrofit): BookListsApi {
        return retrofit.create(BookListsApi::class.java)
    }

    @Provides
    @Singleton
    fun provideBookmarksApi(retrofit: Retrofit): BookmarksApi {
        return retrofit.create(BookmarksApi::class.java)
    }

    @Provides
    @Singleton
    fun provideNotesApi(retrofit: Retrofit): NotesApi {
        return retrofit.create(NotesApi::class.java)
    }

    @Provides
    @Singleton
    fun provideAIApi(retrofit: Retrofit): AIApi {
        return retrofit.create(AIApi::class.java)
    }

    @Provides
    @Singleton
    fun provideSocialApi(retrofit: Retrofit): SocialApi {
        return retrofit.create(SocialApi::class.java)
    }

    @Provides
    @Singleton
    fun provideAudioApi(retrofit: Retrofit): AudioApi {
        return retrofit.create(AudioApi::class.java)
    }
}
