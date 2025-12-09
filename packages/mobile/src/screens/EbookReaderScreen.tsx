import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, Ebook, EbookContent, EbookChapter } from '../types'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

type Props = NativeStackScreenProps<RootStackParamList, 'EbookReader'>

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export default function EbookReaderScreen({ route, navigation }: Props) {
  const { ebookId } = route.params
  const { isAuthenticated } = useAuth()
  const [ebook, setEbook] = useState<Ebook | null>(null)
  const [content, setContent] = useState<EbookContent | null>(null)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useWebView, setUseWebView] = useState(true)
  const webViewRef = useRef<WebView>(null)
  const lastSyncRef = useRef<number>(0)

  // Update reading history
  const syncReadingHistory = useCallback(async (page: number) => {
    if (!isAuthenticated || !ebook) return

    // Debounce: only sync every 5 seconds
    const now = Date.now()
    if (now - lastSyncRef.current < 5000) return
    lastSyncRef.current = now

    try {
      await api.updateReadingHistory({
        itemType: 'ebook',
        itemId: ebookId,
        title: ebook.title,
        coverUrl: ebook.cover_url,
        lastPage: page,
      })
    } catch (err) {
      console.error('Failed to sync reading history:', err)
    }
  }, [isAuthenticated, ebook, ebookId])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ebookData, contentData] = await Promise.all([
          api.getEbook(ebookId),
          api.getEbookText(ebookId),
        ])
        setEbook(ebookData)
        setContent(contentData)

        // Initial sync when opening the reader
        if (isAuthenticated) {
          await api.updateReadingHistory({
            itemType: 'ebook',
            itemId: ebookId,
            title: ebookData.title,
            coverUrl: ebookData.cover_url,
            lastPage: 1,
          })
        }
      } catch (err) {
        console.error('Failed to fetch ebook:', err)
        setError('Failed to load ebook')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ebookId, isAuthenticated])

  const handleChapterChange = useCallback((newChapter: number) => {
    setCurrentChapter(newChapter)
    syncReadingHistory(newChapter + 1)
  }, [syncReadingHistory])

  // Generate HTML content for WebView
  const generateHtml = useCallback((chapter: EbookChapter) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * {
              box-sizing: border-box;
              -webkit-tap-highlight-color: transparent;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 18px;
              line-height: 1.8;
              color: #334155;
              background: #faf9f7;
            }
            .container {
              padding: 24px 20px;
              max-width: 100%;
            }
            h1, h2, h3 {
              color: #1e293b;
              margin-top: 0;
              margin-bottom: 16px;
              font-weight: 600;
            }
            h1 { font-size: 24px; text-align: center; }
            h2 { font-size: 20px; }
            h3 { font-size: 18px; }
            p {
              margin: 0 0 16px 0;
              text-align: justify;
            }
            .chapter-title {
              text-align: center;
              margin-bottom: 32px;
              padding-bottom: 16px;
              border-bottom: 1px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="chapter-title">${chapter.title || 'Chapter'}</h1>
            ${chapter.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
          </div>
        </body>
      </html>
    `
  }, [])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading ebook...</Text>
      </View>
    )
  }

  if (error || !ebook) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Ebook not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const chapters = content?.chapters || []
  const chapter = chapters[currentChapter]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{ebook.title}</Text>
        <View style={styles.headerRow}>
          {chapters.length > 0 && (
            <Text style={styles.chapterInfo}>
              Chapter {currentChapter + 1} of {chapters.length}
            </Text>
          )}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setUseWebView(!useWebView)}
          >
            <Text style={styles.toggleText}>
              {useWebView ? 'Simple' : 'Rich'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {chapters.length > 0 ? (
        <>
          {useWebView && chapter ? (
            <WebView
              ref={webViewRef}
              style={styles.webView}
              source={{ html: generateHtml(chapter) }}
              scrollEnabled={true}
              showsVerticalScrollIndicator={true}
              originWhitelist={['*']}
            />
          ) : (
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
              <Text style={styles.chapterTitle}>{chapter?.title || `Chapter ${currentChapter + 1}`}</Text>
              <Text style={styles.chapterContent}>{chapter?.content || 'No content available'}</Text>
            </ScrollView>
          )}

          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, currentChapter === 0 && styles.navButtonDisabled]}
              onPress={() => handleChapterChange(Math.max(0, currentChapter - 1))}
              disabled={currentChapter === 0}
            >
              <Text style={styles.navButtonText}>◀ Prev</Text>
            </TouchableOpacity>

            <View style={styles.chapterIndicator}>
              <Text style={styles.chapterIndicatorText}>
                {currentChapter + 1} / {chapters.length}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.navButton, currentChapter === chapters.length - 1 && styles.navButtonDisabled]}
              onPress={() => handleChapterChange(Math.min(chapters.length - 1, currentChapter + 1))}
              disabled={currentChapter === chapters.length - 1}
            >
              <Text style={styles.navButtonText}>Next ▶</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.errorText}>No chapters available for this ebook</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#faf9f7',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  chapterInfo: {
    fontSize: 12,
    color: '#64748b',
  },
  toggleButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  chapterTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  chapterContent: {
    fontSize: 16,
    lineHeight: 28,
    color: '#334155',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  navButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chapterIndicator: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chapterIndicatorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
})
