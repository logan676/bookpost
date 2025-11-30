import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>

export default function PostDetailScreen({ route }: Props) {
  const { postId, bookId } = route.params

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reading Note</Text>
        <Text style={styles.text}>Post ID: {postId}</Text>
        <Text style={styles.text}>Book ID: {bookId}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  text: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
})
