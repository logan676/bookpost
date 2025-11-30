import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, Magazine } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'MagazineReader'>

const { width: screenWidth } = Dimensions.get('window')

export default function MagazineReaderScreen({ route }: Props) {
  const { magazineId } = route.params
  const [magazine, setMagazine] = useState<Magazine | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMagazine = async () => {
      try {
        const data = await api.getMagazineInfo(magazineId)
        setMagazine(data)
      } catch (err) {
        console.error('Failed to fetch magazine:', err)
        setError('Failed to load magazine')
      } finally {
        setLoading(false)
      }
    }
    fetchMagazine()
  }, [magazineId])

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
      </View>
    )
  }

  const totalPages = magazine.page_count || 1
  const pageImageUrl = api.getMagazinePageImageUrl(magazineId, currentPage)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{magazine.title}</Text>
        <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
      </View>

      <View style={styles.pageContainer}>
        <Image
          source={{ uri: pageImageUrl }}
          style={styles.pageImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentPage === 1 && styles.navButtonDisabled]}
          onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>
        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>{currentPage} / {totalPages}</Text>
        </View>
        <TouchableOpacity
          style={[styles.navButton, currentPage === totalPages && styles.navButtonDisabled]}
          onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.navButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  pageInfo: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
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
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImage: {
    width: screenWidth,
    height: '100%',
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
})
