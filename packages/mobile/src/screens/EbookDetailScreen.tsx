import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, EbookDetail } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'EbookDetail'>

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function EbookDetailScreen({ route, navigation }: Props) {
  const { ebookId } = route.params
  const [detail, setDetail] = useState<EbookDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)

  useEffect(() => {
    fetchDetail()
  }, [ebookId])

  const fetchDetail = async () => {
    try {
      const data = await api.getEbookDetail(ebookId)
      setDetail(data)
    } catch (error) {
      console.error('Failed to fetch ebook detail:', error)
      Alert.alert('Error', 'Failed to load book details')
    } finally {
      setLoading(false)
    }
  }

  const handleStartReading = () => {
    navigation.navigate('EbookReader', { ebookId })
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
        <Text style={styles.errorText}>Book not found</Text>
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
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverImage, styles.placeholderCover]}>
              <Text style={styles.placeholderText}>{detail.fileType?.toUpperCase() || 'BOOK'}</Text>
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={styles.title}>{detail.title}</Text>
            {detail.author && (
              <Text style={styles.author}>by {detail.author}</Text>
            )}
            {detail.categoryName && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{detail.categoryName}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Format</Text>
              <Text style={styles.metaValue}>{detail.fileType?.toUpperCase() || 'Unknown'}</Text>
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
            {detail.chapterCount && detail.chapterCount > 0 && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Chapters</Text>
                <Text style={styles.metaValue}>{detail.chapterCount}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this book</Text>
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

        {detail.publisher && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Publisher</Text>
            <Text style={styles.infoValue}>{detail.publisher}</Text>
          </View>
        )}

        {detail.language && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Language</Text>
            <Text style={styles.infoValue}>{detail.language}</Text>
          </View>
        )}

        {detail.isbn && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ISBN</Text>
            <Text style={styles.infoValue}>{detail.isbn}</Text>
          </View>
        )}

        {detail.publishDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Published</Text>
            <Text style={styles.infoValue}>{detail.publishDate}</Text>
          </View>
        )}

        {detail.toc && detail.toc.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Table of Contents</Text>
            {detail.toc.slice(0, 10).map((item, index) => (
              <View
                key={index}
                style={[styles.tocItem, { paddingLeft: 16 + (item.level || 0) * 16 }]}
              >
                <Text style={styles.tocText} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            ))}
            {detail.toc.length > 10 && (
              <Text style={styles.tocMore}>
                + {detail.toc.length - 10} more chapters
              </Text>
            )}
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
  coverImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#94a3b8',
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
  author: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
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
  tocItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tocText: {
    fontSize: 14,
    color: '#475569',
  },
  tocMore: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 12,
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
