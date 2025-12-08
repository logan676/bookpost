import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, MagazineDetail } from '../types'
import api from '../services/api'
import { CachedImage } from '../components'

type Props = NativeStackScreenProps<RootStackParamList, 'MagazineDetail'>

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MagazineDetailScreen({ route, navigation }: Props) {
  const { magazineId } = route.params
  const [detail, setDetail] = useState<MagazineDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)

  useEffect(() => {
    fetchDetail()
  }, [magazineId])

  const fetchDetail = async () => {
    try {
      const data = await api.getMagazineDetail(magazineId)
      setDetail(data)
    } catch (error) {
      console.error('Failed to fetch magazine detail:', error)
      Alert.alert('Error', 'Failed to load magazine details')
    } finally {
      setLoading(false)
    }
  }

  const handleStartReading = () => {
    navigation.navigate('MagazineReader', { magazineId })
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  if (!detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Magazine not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const coverUrl = api.resolveUrl(detail.coverUrl)
  const description = detail.description || 'No description available.'
  const shouldTruncate = description.length > 300

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.coverImageContainer}>
            <CachedImage
              uri={coverUrl}
              style={styles.coverImage}
              resizeMode="contain"
              placeholder={
                <View style={styles.placeholderCover}>
                  <Text style={styles.placeholderText}>PDF</Text>
                </View>
              }
            />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.title}>{detail.title}</Text>
            {detail.publisherName && (
              <Text style={styles.publisher}>{detail.publisherName}</Text>
            )}
            {detail.year && (
              <View style={styles.yearBadge}>
                <Text style={styles.yearText}>{detail.year}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Format</Text>
              <Text style={styles.metaValue}>PDF</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Size</Text>
              <Text style={styles.metaValue}>{formatFileSize(detail.fileSize)}</Text>
            </View>
            {detail.pageCount && detail.pageCount > 0 && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Pages</Text>
                <Text style={styles.metaValue}>{detail.pageCount}</Text>
              </View>
            )}
            {detail.language && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Language</Text>
                <Text style={styles.metaValue}>{detail.language}</Text>
              </View>
            )}
          </View>
        </View>

        {detail.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this magazine</Text>
            <Text style={styles.description}>
              {shouldTruncate && !showFullDescription
                ? `${description.slice(0, 300)}...`
                : description}
            </Text>
            {shouldTruncate && (
              <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                <Text style={styles.showMoreText}>
                  {showFullDescription ? 'Show less' : 'Show more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {detail.author && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Author</Text>
            <Text style={styles.infoValue}>{detail.author}</Text>
          </View>
        )}

        {detail.pdfPublisher && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PDF Creator</Text>
            <Text style={styles.infoValue}>{detail.pdfPublisher}</Text>
          </View>
        )}

        {detail.publishDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Published</Text>
            <Text style={styles.infoValue}>{detail.publishDate}</Text>
          </View>
        )}

        {detail.createdAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Added</Text>
            <Text style={styles.infoValue}>
              {new Date(detail.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.readButton} onPress={handleStartReading}>
          <Text style={styles.readButtonText}>Start Reading</Text>
        </TouchableOpacity>
      </View>
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
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  headerSection: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  coverImageContainer: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  publisher: {
    fontSize: 16,
    color: '#6366f1',
    marginBottom: 12,
  },
  yearBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  yearText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  metaSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    width: '50%',
    paddingVertical: 8,
  },
  metaLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  showMoreText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  bottomPadding: {
    height: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  readButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  readButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})
