import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList, Book, Post } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>

export default function BookDetailScreen({ route, navigation }: Props) {
  const { bookId } = route.params
  const [book, setBook] = useState<Book | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookData, postsData] = await Promise.all([
          api.getBook(bookId),
          api.getPosts(bookId),
        ])
        setBook(bookData)
        setPosts(postsData)
      } catch (error) {
        console.error('Failed to fetch book details:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [bookId])

  if (loading || !book) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.bookHeader}>
        {book.cover_url ? (
          <Image source={{ uri: book.cover_url }} style={styles.bookCover} />
        ) : (
          <View style={[styles.bookCover, styles.placeholderCover]}>
            <Text style={styles.placeholderText}>No Cover</Text>
          </View>
        )}
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          {book.author && <Text style={styles.bookAuthor}>{book.author}</Text>}
          {book.isbn && <Text style={styles.bookIsbn}>ISBN: {book.isbn}</Text>}
        </View>
      </View>

      <View style={styles.postsSection}>
        <Text style={styles.sectionTitle}>Reading Notes ({posts.length})</Text>
        {posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notes yet</Text>
          </View>
        ) : (
          posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postCard}
              onPress={() => navigation.navigate('PostDetail', { postId: post.id, bookId })}
            >
              <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>
              {post.page_number && (
                <Text style={styles.postPage}>Page {post.page_number}</Text>
              )}
            </TouchableOpacity>
          ))
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
  },
  bookHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  bookCover: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  placeholderCover: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  bookIsbn: {
    fontSize: 12,
    color: '#94a3b8',
  },
  postsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  postCard: {
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
  postContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  postPage: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
})
