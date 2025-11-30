import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, NoteContent, NoteUnderline } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'NoteDetail'>

export default function NoteDetailScreen({ route, navigation }: Props) {
  const { noteId } = route.params
  const [note, setNote] = useState<NoteContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchNote = useCallback(async () => {
    try {
      const data = await api.getNoteContent(noteId)
      setNote(data)
      navigation.setOptions({ title: data.title })
    } catch (error) {
      console.error('Failed to fetch note:', error)
      Alert.alert('Error', 'Failed to load note')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [noteId, navigation])

  useEffect(() => {
    fetchNote()
  }, [fetchNote])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchNote()
  }, [fetchNote])

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const renderContent = () => {
    if (!note?.content) return null

    const paragraphs = note.content.split('\n\n')

    return paragraphs.map((paragraph, index) => {
      // Check if this paragraph has underlines
      const underlines = note.underlines.filter(u => u.paragraph_index === index)

      if (underlines.length === 0) {
        return (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        )
      }

      // Render paragraph with underlines highlighted
      return (
        <Text key={index} style={styles.paragraph}>
          {renderParagraphWithUnderlines(paragraph, underlines)}
        </Text>
      )
    })
  }

  const renderParagraphWithUnderlines = (text: string, underlines: NoteUnderline[]) => {
    // Sort underlines by start offset
    const sorted = [...underlines].sort((a, b) => a.start_offset - b.start_offset)

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    sorted.forEach((underline, i) => {
      // Add text before underline
      if (underline.start_offset > lastIndex) {
        parts.push(text.slice(lastIndex, underline.start_offset))
      }

      // Add underlined text
      parts.push(
        <Text key={`underline-${underline.id}`} style={styles.underlinedText}>
          {text.slice(underline.start_offset, underline.end_offset)}
        </Text>
      )

      lastIndex = underline.end_offset
    })

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  if (!note) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Note not found</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>{note.title}</Text>
        <View style={styles.metaRow}>
          {note.author && (
            <Text style={styles.author}>{note.author}</Text>
          )}
          {note.publish_date && (
            <Text style={styles.date}>{formatDate(note.publish_date)}</Text>
          )}
        </View>
        {note.tags && (
          <View style={styles.tagsContainer}>
            {note.tags.split(',').map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag.trim()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.contentSection}>
        {renderContent()}
      </View>

      {note.underlines.length > 0 && (
        <View style={styles.underlinesSection}>
          <Text style={styles.sectionTitle}>Highlights ({note.underlines.length})</Text>
          {note.underlines.map((underline) => (
            <View key={underline.id} style={styles.underlineCard}>
              <Text style={styles.underlineText}>"{underline.text}"</Text>
            </View>
          ))}
        </View>
      )}

      {note.comments.length > 0 && (
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments ({note.comments.length})</Text>
          {note.comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentNick}>{comment.nick}</Text>
                {comment.original_date && (
                  <Text style={styles.commentDate}>{formatDate(comment.original_date)}</Text>
                )}
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  author: {
    fontSize: 14,
    color: '#6366f1',
    marginRight: 12,
  },
  date: {
    fontSize: 14,
    color: '#94a3b8',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#64748b',
  },
  contentSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#334155',
    marginBottom: 16,
  },
  underlinedText: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  underlinesSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  underlineCard: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  underlineText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#92400e',
    lineHeight: 22,
  },
  commentsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  commentCard: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentNick: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  commentDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  commentContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
})
