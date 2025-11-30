import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, Magazine, Publisher } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'MagazineReader'>

export default function MagazinesScreen({ navigation }: any) {
  const [magazines, setMagazines] = useState<Magazine[]>([])
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [selectedPublisherId, setSelectedPublisherId] = useState<number | undefined>()
  const [selectedYear, setSelectedYear] = useState<number | undefined>()
  const [years, setYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchPublishers = useCallback(async () => {
    try {
      const data = await api.getPublishers()
      setPublishers(data)
    } catch (error) {
      console.error('Failed to fetch publishers:', error)
    }
  }, [])

  const fetchMagazines = useCallback(async () => {
    try {
      const data = await api.getMagazines(selectedPublisherId, selectedYear, searchQuery || undefined)
      setMagazines(data)

      // Extract unique years
      const uniqueYears = [...new Set(data.map((m: Magazine) => m.year).filter((y): y is number => y !== undefined && y !== null && y > 1900))]
      setYears(uniqueYears.sort((a, b) => b - a))
    } catch (error) {
      console.error('Failed to fetch magazines:', error)
      Alert.alert('Error', 'Failed to load magazines')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedPublisherId, selectedYear, searchQuery])

  useEffect(() => {
    fetchPublishers()
  }, [fetchPublishers])

  useEffect(() => {
    fetchMagazines()
  }, [fetchMagazines])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchMagazines()
  }, [fetchMagazines])

  const handlePublisherSelect = (publisherId: number | undefined) => {
    setSelectedPublisherId(publisherId)
  }

  const handleYearSelect = (year: number | undefined) => {
    setSelectedYear(year)
  }

  const renderPublisherChip = (publisher: Publisher | null) => {
    const isSelected = publisher === null
      ? selectedPublisherId === undefined
      : selectedPublisherId === publisher?.id

    return (
      <TouchableOpacity
        key={publisher?.id ?? 'all'}
        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
        onPress={() => handlePublisherSelect(publisher?.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
          {publisher === null ? 'All' : publisher.name}
        </Text>
      </TouchableOpacity>
    )
  }

  const renderYearChip = (year: number | null) => {
    const isSelected = year === null
      ? selectedYear === undefined
      : selectedYear === year

    return (
      <TouchableOpacity
        key={year ?? 'all'}
        style={[styles.filterChip, isSelected && styles.filterChipSelectedGreen]}
        onPress={() => handleYearSelect(year ?? undefined)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
          {year === null ? 'All Years' : year.toString()}
        </Text>
      </TouchableOpacity>
    )
  }

  const renderMagazine = ({ item }: { item: Magazine }) => {
    const publisher = publishers.find(p => p.id === item.publisher_id)
    const coverUrl = api.resolveUrl(item.cover_url)
    return (
      <TouchableOpacity
        style={styles.magazineCard}
        onPress={() => navigation.navigate('MagazineReader', { magazineId: item.id })}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.magazineCover} />
        ) : (
          <View style={[styles.magazineCover, styles.placeholderCover]}>
            <Text style={styles.placeholderText}>PDF</Text>
          </View>
        )}
        <Text style={styles.magazineTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.metaRow}>
          {publisher && <Text style={styles.publisherText} numberOfLines={1}>{publisher.name}</Text>}
          {item.year && <Text style={styles.yearText}>{item.year}</Text>}
        </View>
        {item.page_count && (
          <Text style={styles.pageCount}>{item.page_count} pages</Text>
        )}
      </TouchableOpacity>
    )
  }

  if (loading && magazines.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Magazines</Text>
        <Text style={styles.itemCount}>{magazines.length} items</Text>
      </View>

      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search magazines..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchMagazines}
          returnKeyType="search"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.filterLabel}>Publisher</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
          style={styles.filtersScroll}
        >
          {renderPublisherChip(null)}
          {publishers.map((publisher) => renderPublisherChip(publisher))}
        </ScrollView>

        <Text style={styles.filterLabel}>Year</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
          style={styles.filtersScroll}
        >
          {renderYearChip(null)}
          {years.map((year) => renderYearChip(year))}
        </ScrollView>
      </View>

      {magazines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No magazines found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Pull to refresh'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={magazines}
          renderItem={renderMagazine}
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
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 16,
    marginBottom: 6,
    marginTop: 4,
  },
  filtersScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  filtersScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  filterChipSelected: {
    backgroundColor: '#6366f1',
  },
  filterChipSelectedGreen: {
    backgroundColor: '#059669',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  list: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  magazineCard: {
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
  magazineCover: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  placeholderCover: {
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '600',
  },
  magazineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  publisherText: {
    fontSize: 11,
    color: '#6366f1',
    flex: 1,
    marginRight: 4,
  },
  yearText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  pageCount: {
    fontSize: 10,
    color: '#64748b',
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
