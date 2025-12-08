import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, Ebook, EbookCategory } from '../types'
import api from '../services/api'
import { CachedImage } from '../components'

type Props = NativeStackScreenProps<RootStackParamList, 'EbookReader'>

export default function EbooksScreen({ navigation }: any) {
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [categories, setCategories] = useState<EbookCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.getEbookCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  const fetchEbooks = useCallback(async () => {
    try {
      const data = await api.getEbooks(selectedCategoryId, searchQuery || undefined)
      setEbooks(data)
    } catch (error) {
      console.error('Failed to fetch ebooks:', error)
      Alert.alert('Error', 'Failed to load ebooks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedCategoryId, searchQuery])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchEbooks()
  }, [fetchEbooks])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchEbooks()
  }, [fetchEbooks])

  const handleCategorySelect = (categoryId: number | undefined) => {
    setSelectedCategoryId(categoryId)
  }

  const renderCategoryChip = (category: EbookCategory | null) => {
    const isSelected = category === null
      ? selectedCategoryId === undefined
      : selectedCategoryId === category?.id

    return (
      <TouchableOpacity
        key={category?.id ?? 'all'}
        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
        onPress={() => handleCategorySelect(category?.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
          {category === null ? 'All' : category.name}
        </Text>
        {category !== null && category.ebook_count !== undefined && (
          <View style={[styles.countBadge, isSelected && styles.countBadgeSelected]}>
            <Text style={[styles.countText, isSelected && styles.countTextSelected]}>
              {category.ebook_count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const renderEbook = ({ item }: { item: Ebook }) => {
    const category = categories.find(c => c.id === item.category_id)
    const coverUrl = api.resolveUrl(item.cover_url)
    return (
      <TouchableOpacity
        style={styles.ebookCard}
        onPress={() => navigation.navigate('EbookDetail', { ebookId: item.id })}
      >
        <View style={styles.ebookCoverContainer}>
          <CachedImage
            uri={coverUrl}
            style={styles.ebookCover}
            resizeMode="contain"
            placeholder={
              <View style={styles.placeholderCover}>
                <Text style={styles.placeholderText}>{item.file_type?.toUpperCase() || 'BOOK'}</Text>
              </View>
            }
          />
        </View>
        <Text style={styles.ebookTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.metaRow}>
          {category && <Text style={styles.categoryText} numberOfLines={1}>{category.name}</Text>}
          <Text style={styles.ebookType}>{item.file_type?.toUpperCase()}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading && ebooks.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ebooks</Text>
        <Text style={styles.itemCount}>{ebooks.length} items</Text>
      </View>

      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search ebooks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchEbooks}
          returnKeyType="search"
          placeholderTextColor="#94a3b8"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
          style={styles.categoriesScroll}
        >
          {renderCategoryChip(null)}
          {categories.map((category) => renderCategoryChip(category))}
        </ScrollView>
      </View>

      {ebooks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No ebooks found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Pull to refresh'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={ebooks}
          renderItem={renderEbook}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  filtersContainer: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    color: '#1e293b',
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  categoryChipSelected: {
    backgroundColor: '#6366f1',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  countTextSelected: {
    color: '#fff',
  },
  list: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  ebookCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ebookCoverContainer: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ebookCover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  ebookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 11,
    color: '#6366f1',
    flex: 1,
    marginRight: 4,
  },
  ebookType: {
    fontSize: 10,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
})
