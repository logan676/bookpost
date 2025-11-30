import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, Ebook, EbookContent, EbookChapter } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'EbookReader'>

export default function EbookReaderScreen({ route }: Props) {
  const { ebookId } = route.params
  const [ebook, setEbook] = useState<Ebook | null>(null)
  const [content, setContent] = useState<EbookContent | null>(null)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ebookData, contentData] = await Promise.all([
          api.getEbook(ebookId),
          api.getEbookText(ebookId),
        ])
        setEbook(ebookData)
        setContent(contentData)
      } catch (err) {
        console.error('Failed to fetch ebook:', err)
        setError('Failed to load ebook')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ebookId])

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
      </View>
    )
  }

  const chapters = content?.chapters || []
  const chapter = chapters[currentChapter]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{ebook.title}</Text>
        {chapters.length > 0 && (
          <Text style={styles.chapterInfo}>
            Chapter {currentChapter + 1} of {chapters.length}
          </Text>
        )}
      </View>

      {chapters.length > 0 ? (
        <>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.chapterTitle}>{chapter?.title || `Chapter ${currentChapter + 1}`}</Text>
            <Text style={styles.chapterContent}>{chapter?.content || 'No content available'}</Text>
          </ScrollView>

          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, currentChapter === 0 && styles.navButtonDisabled]}
              onPress={() => setCurrentChapter(c => Math.max(0, c - 1))}
              disabled={currentChapter === 0}
            >
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, currentChapter === chapters.length - 1 && styles.navButtonDisabled]}
              onPress={() => setCurrentChapter(c => Math.min(chapters.length - 1, c + 1))}
              disabled={currentChapter === chapters.length - 1}
            >
              <Text style={styles.navButtonText}>Next</Text>
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
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  chapterInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
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
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  navButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
