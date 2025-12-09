import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, Post, Book } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId, bookId } = route.params
  const [post, setPost] = useState<Post | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postData, bookData] = await Promise.all([
          api.getPost(bookId, postId),
          api.getBook(bookId),
        ])
        setPost(postData)
        setBook(bookData)
      } catch (err) {
        console.error('Failed to fetch post:', err)
        setError('Failed to load reading note')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [bookId, postId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading note...</Text>
      </View>
    )
  }

  if (error || !post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>📝</Text>
        <Text style={styles.errorText}>{error || 'Note not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Book Header */}
      {book && (
        <TouchableOpacity
          style={styles.bookHeader}
          onPress={() => navigation.navigate('BookDetail', { bookId: book.id })}
        >
          {book.cover_url ? (
            <Image source={{ uri: book.cover_url }} style={styles.bookCover} />
          ) : (
            <View style={[styles.bookCover, styles.placeholderCover]}>
              <Text style={styles.placeholderText}>📚</Text>
            </View>
          )}
          <View style={styles.bookInfo}>
            <Text style={styles.fromBook}>From book</Text>
            <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
            {book.author && (
              <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Post Content */}
      <View style={styles.postContent}>
        {post.page_number && (
          <View style={styles.pageTag}>
            <Text style={styles.pageTagText}>Page {post.page_number}</Text>
          </View>
        )}

        <Text style={styles.dateText}>{formatDate(post.created_at)}</Text>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {post.content.split('\n\n').map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>

        {/* Post Images */}
        {post.images && post.images.length > 0 && (
          <View style={styles.imagesContainer}>
            <Text style={styles.imagesTitle}>Attached Images</Text>
            {post.images.map((image, index) => (
              <Image
                key={image.id || index}
                source={{ uri: image.image_url }}
                style={styles.postImage}
                resizeMode="contain"
              />
            ))}
          </View>
        )}

        {/* Metadata */}
        {post.updated_at !== post.created_at && (
          <Text style={styles.updatedText}>
            Last updated: {formatDate(post.updated_at)}
          </Text>
        )}
      </View>
    </ScrollView>
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
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
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
  bookHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: 6,
  },
  placeholderCover: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  fromBook: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 13,
    color: '#64748b',
  },
  postContent: {
    padding: 20,
  },
  pageTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  pageTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  contentContainer: {
    marginBottom: 24,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#334155',
    marginBottom: 16,
  },
  imagesContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  imagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  updatedText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
})
