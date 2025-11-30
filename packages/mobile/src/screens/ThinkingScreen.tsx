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
import type { RootStackParamList, Note, NoteYear } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'NoteDetail'>

export default function ThinkingScreen({ navigation }: any) {
  const [notes, setNotes] = useState<Note[]>([])
  const [years, setYears] = useState<NoteYear[]>([])
  const [selectedYear, setSelectedYear] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchYears = useCallback(async () => {
    try {
      const data = await api.getNoteYears()
      setYears(data)
    } catch (error) {
      console.error('Failed to fetch years:', error)
    }
  }, [])

  const fetchNotes = useCallback(async () => {
    try {
      const data = await api.getNotes(selectedYear, searchQuery || undefined)
      setNotes(data)
    } catch (error) {
      console.error('Failed to fetch notes:', error)
      Alert.alert('Error', 'Failed to load notes')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedYear, searchQuery])

  useEffect(() => {
    fetchYears()
  }, [fetchYears])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchNotes()
  }, [fetchNotes])

  const handleYearSelect = (year: number | undefined) => {
    setSelectedYear(year)
  }

  const renderYearChip = (yearData: NoteYear | null) => {
    const isSelected = yearData === null
      ? selectedYear === undefined
      : selectedYear === yearData?.year

    return (
      <TouchableOpacity
        key={yearData?.year ?? 'all'}
        style={[styles.yearChip, isSelected && styles.yearChipSelected]}
        onPress={() => handleYearSelect(yearData?.year)}
        activeOpacity={0.7}
      >
        <Text style={[styles.yearChipText, isSelected && styles.yearChipTextSelected]}>
          {yearData === null ? 'All' : yearData.year.toString()}
        </Text>
        {yearData !== null && (
          <View style={[styles.countBadge, isSelected && styles.countBadgeSelected]}>
            <Text style={[styles.countText, isSelected && styles.countTextSelected]}>
              {yearData.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderNote = ({ item }: { item: Note }) => {
    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
      >
        <Text style={styles.noteTitle} numberOfLines={2}>{item.title}</Text>
        {item.content_preview && (
          <Text style={styles.notePreview} numberOfLines={3}>
            {item.content_preview}
          </Text>
        )}
        <View style={styles.noteMeta}>
          {item.author && (
            <Text style={styles.noteAuthor} numberOfLines={1}>{item.author}</Text>
          )}
          <Text style={styles.noteDate}>{formatDate(item.created_at)}</Text>
        </View>
        {item.tags && (
          <View style={styles.tagsContainer}>
            {item.tags.split(',').slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag.trim()}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    )
  }

  if (loading && notes.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thinking</Text>
        <Text style={styles.itemCount}>{notes.length} notes</Text>
      </View>

      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchNotes}
          returnKeyType="search"
          placeholderTextColor="#94a3b8"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearsScrollContent}
          style={styles.yearsScroll}
        >
          {renderYearChip(null)}
          {years.map((yearData) => renderYearChip(yearData))}
        </ScrollView>
      </View>

      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No notes found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Pull to refresh'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id.toString()}
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
  yearsScroll: {
    flexGrow: 0,
  },
  yearsScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  yearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  yearChipSelected: {
    backgroundColor: '#6366f1',
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  yearChipTextSelected: {
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
    padding: 16,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  notePreview: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteAuthor: {
    fontSize: 12,
    color: '#6366f1',
    flex: 1,
    marginRight: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
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
