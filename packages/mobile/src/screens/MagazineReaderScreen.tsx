import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, Magazine } from '../types'
import api from '../services/api'
import { CachedImage } from '../components'
import { useAuth } from '../contexts/AuthContext'

type Props = NativeStackScreenProps<RootStackParamList, 'MagazineReader'>

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export default function MagazineReaderScreen({ route, navigation }: Props) {
  const { magazineId } = route.params
  const { isAuthenticated } = useAuth()
  const [magazine, setMagazine] = useState<Magazine | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const lastSyncRef = useRef<number>(0)

  // Update reading history
  const syncReadingHistory = useCallback(async (page: number) => {
    if (!isAuthenticated || !magazine) return

    // Debounce: only sync every 5 seconds
    const now = Date.now()
    if (now - lastSyncRef.current < 5000) return
    lastSyncRef.current = now

    try {
      await api.updateReadingHistory({
        itemType: 'magazine',
        itemId: magazineId,
        title: magazine.title,
        coverUrl: magazine.cover_url,
        lastPage: page,
      })
    } catch (err) {
      console.error('Failed to sync reading history:', err)
    }
  }, [isAuthenticated, magazine, magazineId])

  useEffect(() => {
    const fetchMagazine = async () => {
      try {
        const data = await api.getMagazineInfo(magazineId)
        setMagazine(data)

        // Initial sync when opening the reader
        if (isAuthenticated) {
          await api.updateReadingHistory({
            itemType: 'magazine',
            itemId: magazineId,
            title: data.title,
            coverUrl: data.cover_url,
            lastPage: 1,
          })
        }
      } catch (err) {
        console.error('Failed to fetch magazine:', err)
        setError('Failed to load magazine')
      } finally {
        setLoading(false)
      }
    }
    fetchMagazine()
  }, [magazineId, isAuthenticated])

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage)
    syncReadingHistory(newPage)
    // Reset zoom when changing pages
    setIsZoomed(false)
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false })
  }, [syncReadingHistory])

  const toggleZoom = useCallback(() => {
    if (isZoomed) {
      // Reset scroll position when unzooming
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true })
    }
    setIsZoomed(!isZoomed)
  }, [isZoomed])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading magazine...</Text>
      </View>
    )
  }

  if (error || !magazine) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Magazine not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const totalPages = magazine.page_count || 1
  const pageImageUrl = api.getMagazinePageImageUrl(magazineId, currentPage)

  // Calculate image dimensions based on zoom state
  const imageWidth = isZoomed ? screenWidth * 2 : screenWidth
  const imageHeight = isZoomed ? screenHeight * 2 : screenHeight - 140

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{magazine.title}</Text>
        <View style={styles.headerRow}>
          <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
          <TouchableOpacity
            style={[styles.zoomButton, isZoomed && styles.zoomButtonActive]}
            onPress={toggleZoom}
          >
            <Text style={[styles.zoomIcon, isZoomed && styles.zoomIconActive]}>
              {isZoomed ? '🔍−' : '🔍+'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.pageContainer}
        contentContainerStyle={styles.pageContent}
        horizontal={isZoomed}
        showsHorizontalScrollIndicator={isZoomed}
        showsVerticalScrollIndicator={isZoomed}
        maximumZoomScale={3}
        minimumZoomScale={1}
        bounces={false}
      >
        <ScrollView
          contentContainerStyle={[
            styles.imageWrapper,
            isZoomed && styles.imageWrapperZoomed,
          ]}
          showsVerticalScrollIndicator={isZoomed}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={toggleZoom}
            style={styles.imageTouchable}
          >
            <CachedImage
              uri={pageImageUrl}
              style={[
                styles.pageImage,
                { width: imageWidth, height: imageHeight },
              ]}
              resizeMode={isZoomed ? 'contain' : 'contain'}
            />
          </TouchableOpacity>
        </ScrollView>
      </ScrollView>

      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentPage === 1 && styles.navButtonDisabled]}
          onPress={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <Text style={styles.navButtonText}>◀ Prev</Text>
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>{currentPage} / {totalPages}</Text>
        </View>

        <TouchableOpacity
          style={[styles.navButton, currentPage === totalPages && styles.navButtonDisabled]}
          onPress={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.navButtonText}>Next ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Page Thumbnails Bar */}
      {totalPages > 1 && (
        <View style={styles.thumbnailBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailContent}
          >
            {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1).map((page) => (
              <TouchableOpacity
                key={page}
                style={[
                  styles.thumbnailButton,
                  currentPage === page && styles.thumbnailButtonActive,
                ]}
                onPress={() => handlePageChange(page)}
              >
                <Text
                  style={[
                    styles.thumbnailText,
                    currentPage === page && styles.thumbnailTextActive,
                  ]}
                >
                  {page}
                </Text>
              </TouchableOpacity>
            ))}
            {totalPages > 20 && (
              <View style={styles.morePages}>
                <Text style={styles.morePagesText}>+{totalPages - 20}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 32,
  },
  header: {
    padding: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
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
    color: '#f1f5f9',
  },
  pageInfo: {
    fontSize: 12,
    color: '#94a3b8',
  },
  zoomButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  zoomButtonActive: {
    backgroundColor: '#6366f1',
  },
  zoomIcon: {
    fontSize: 14,
  },
  zoomIconActive: {
    color: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94a3b8',
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
  pageContainer: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  imageWrapperZoomed: {
    flex: 0,
  },
  imageTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImage: {
    backgroundColor: '#0f172a',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
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
    backgroundColor: '#475569',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pageIndicator: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pageIndicatorText: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '500',
  },
  thumbnailBar: {
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  thumbnailContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  thumbnailButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  thumbnailButtonActive: {
    backgroundColor: '#6366f1',
  },
  thumbnailText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailTextActive: {
    color: '#fff',
  },
  morePages: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePagesText: {
    color: '#64748b',
    fontSize: 12,
  },
})
