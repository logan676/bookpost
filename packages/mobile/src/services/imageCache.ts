import * as FileSystem from 'expo-file-system'
import { Image } from 'react-native'

const CACHE_DIR = `${FileSystem.cacheDirectory}images/`

// In-memory cache for quick lookups
const memoryCache = new Map<string, string>()

// Ensure cache directory exists
async function ensureCacheDir() {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true })
  }
}

// Generate a cache key from URL
function getCacheKey(url: string): string {
  // Simple hash function for URL
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
  return `${Math.abs(hash)}.${ext}`
}

// Get cached image path or download and cache
export async function getCachedImage(url: string): Promise<string> {
  if (!url) return ''

  // Check memory cache first
  const memoryCached = memoryCache.get(url)
  if (memoryCached) {
    return memoryCached
  }

  try {
    await ensureCacheDir()
    const cacheKey = getCacheKey(url)
    const cachePath = `${CACHE_DIR}${cacheKey}`

    // Check if file exists in disk cache
    const fileInfo = await FileSystem.getInfoAsync(cachePath)
    if (fileInfo.exists) {
      memoryCache.set(url, cachePath)
      return cachePath
    }

    // Download and cache
    const downloadResult = await FileSystem.downloadAsync(url, cachePath)
    if (downloadResult.status === 200) {
      memoryCache.set(url, cachePath)
      return cachePath
    }

    // If download failed, return original URL
    return url
  } catch (error) {
    console.warn('Image cache error:', error)
    return url
  }
}

// Prefetch multiple images (for list views)
export async function prefetchImages(urls: string[]): Promise<void> {
  const validUrls = urls.filter(url => url && !memoryCache.has(url))
  await Promise.all(validUrls.map(url => getCachedImage(url)))
}

// Clear old cache files (call periodically)
export async function clearOldCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    await ensureCacheDir()
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR)
    const now = Date.now()

    for (const file of files) {
      const filePath = `${CACHE_DIR}${file}`
      const fileInfo = await FileSystem.getInfoAsync(filePath)
      if (fileInfo.exists && fileInfo.modificationTime) {
        const age = now - fileInfo.modificationTime * 1000
        if (age > maxAgeMs) {
          await FileSystem.deleteAsync(filePath, { idempotent: true })
        }
      }
    }
  } catch (error) {
    console.warn('Clear cache error:', error)
  }
}

// Get cache size in bytes
export async function getCacheSize(): Promise<number> {
  try {
    await ensureCacheDir()
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR)
    let totalSize = 0

    for (const file of files) {
      const filePath = `${CACHE_DIR}${file}`
      const fileInfo = await FileSystem.getInfoAsync(filePath)
      if (fileInfo.exists && fileInfo.size) {
        totalSize += fileInfo.size
      }
    }

    return totalSize
  } catch (error) {
    return 0
  }
}

// Clear all cache
export async function clearAllCache(): Promise<void> {
  try {
    memoryCache.clear()
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true })
    await ensureCacheDir()
  } catch (error) {
    console.warn('Clear all cache error:', error)
  }
}

export default {
  getCachedImage,
  prefetchImages,
  clearOldCache,
  getCacheSize,
  clearAllCache,
}
