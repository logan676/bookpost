import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList, ReadingHistoryEntry } from '../types'
import api from '../services/api'
import { CachedImage } from '../components'
import { useAuth } from '../contexts/AuthContext'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function ShelfScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { isAuthenticated } = useAuth()
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await api.getReadingHistory(20)
      setHistory(data)
    } catch (err) {
      console.error('Failed to fetch reading history:', err)
      setError('Failed to load reading history')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchHistory()
  }, [fetchHistory])

  const handleItemPress = (item: ReadingHistoryEntry) => {
    switch (item.item_type) {
      case 'ebook':
        navigation.navigate('EbookDetail', { ebookId: item.item_id })
        break
      case 'magazine':
        navigation.navigate('MagazineDetail', { magazineId: item.item_id })
        break
      case 'book':
        navigation.navigate('BookDetail', { bookId: item.item_id })
        break
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ebook': return '📖'
      case 'magazine': return '📰'
      case 'book': return '📚'
      default: return '📄'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ebook': return 'Ebook'
      case 'magazine': return 'Magazine'
      case 'book': return 'Book'
      default: return type
    }
  }

  const renderItem = ({ item }: { item: ReadingHistoryEntry }) => {
    const coverUrl = api.resolveUrl(item.cover_url)

    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.coverContainer}>
          <CachedImage
            uri={coverUrl}
            style={styles.cover}
            resizeMode="cover"
            placeholder={
              <View style={styles.placeholderCover}>
                <Text style={styles.placeholderIcon}>{getTypeIcon(item.item_type)}</Text>
              </View>
            }
          />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title || 'Untitled'}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{getTypeLabel(item.item_type)}</Text>
            </View>
            {item.last_page && (
              <Text style={styles.pageText}>Page {item.last_page}</Text>
            )}
          </View>
          <Text style={styles.dateText}>{formatDate(item.last_read_at)}</Text>
        </View>
        <View style={styles.continueButton}>
          <Text style={styles.continueIcon}>▶</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Shelf</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyText}>Sign in to see your reading history</Text>
          <Text style={styles.emptySubtext}>
            Your reading progress will be synced across devices
          </Text>
        </View>
      </View>
    )
  }

  if (loading && history.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Shelf</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </View>
    )
  }

  if (error && history.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Shelf</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Shelf</Text>
        <Text style={styles.itemCount}>{history.length} items</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>Your reading history will appear here</Text>
          <Text style={styles.emptySubtext}>
            Start reading ebooks and magazines to build your shelf
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.item_type}-${item.item_id}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  itemCount: {
    fontSize: 14,
    color: '#64748b',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  coverContainer: {
    width: 70,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  pageText: {
    fontSize: 12,
    color: '#64748b',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  continueButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    alignSelf: 'center',
    marginLeft: 8,
  },
  continueIcon: {
    fontSize: 12,
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
