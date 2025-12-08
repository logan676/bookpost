import React, { useState, useEffect } from 'react'
import { Image, ImageStyle, StyleProp, View, ActivityIndicator } from 'react-native'
import { getCachedImage } from '../services/imageCache'

interface CachedImageProps {
  uri: string | null | undefined
  style?: StyleProp<ImageStyle>
  placeholder?: React.ReactNode
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center'
}

export default function CachedImage({
  uri,
  style,
  placeholder,
  resizeMode = 'cover'
}: CachedImageProps) {
  const [cachedUri, setCachedUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadImage() {
      if (!uri) {
        setLoading(false)
        setError(true)
        return
      }

      try {
        setLoading(true)
        setError(false)
        const cached = await getCachedImage(uri)
        if (mounted) {
          setCachedUri(cached)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(true)
          setLoading(false)
          // Fallback to original URI
          setCachedUri(uri)
        }
      }
    }

    loadImage()

    return () => {
      mounted = false
    }
  }, [uri])

  if (!uri || error) {
    if (placeholder) {
      return <>{placeholder}</>
    }
    return null
  }

  if (loading) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }]}>
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    )
  }

  return (
    <Image
      source={{ uri: cachedUri || uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        // If cached version fails, try original
        if (cachedUri !== uri) {
          setCachedUri(uri)
        } else {
          setError(true)
        }
      }}
    />
  )
}
