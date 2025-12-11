import { useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '../i18n'
import { useAuth } from '../auth'
import type { AudioSeries, Audio } from '../types'

export default function AudioDashboard() {
  const { t, formatCount } = useI18n()
  const { token } = useAuth()
  const [series, setSeries] = useState<AudioSeries[]>([])
  const [selectedSeries, setSelectedSeries] = useState<AudioSeries | null>(null)
  const [audioFiles, setAudioFiles] = useState<Audio[]>([])
  const [selectedAudio, setSelectedAudio] = useState<Audio | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Player state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  // Reading session tracking
  const [sessionId, setSessionId] = useState<number | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchSeries()
  }, [])

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      if (sessionId) {
        endSession()
      }
    }
  }, [sessionId])

  const fetchSeries = async () => {
    try {
      const response = await fetch('/api/audio-series/series')
      if (response.ok) {
        const data = await response.json()
        setSeries(data)
      }
    } catch (error) {
      console.error('Failed to fetch audio series:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAudioFiles = async (seriesId: number, search?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('series_id', seriesId.toString())
      if (search) params.set('search', search)

      const response = await fetch(`/api/audio?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAudioFiles(data)
      }
    } catch (error) {
      console.error('Failed to fetch audio files:', error)
    }
  }

  // Reading session management
  const startSession = async (audioId: number) => {
    if (!token) return

    try {
      const response = await fetch('/api/reading/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookId: audioId,
          bookType: 'audiobook',
          position: '0',
          deviceType: 'web',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSessionId(data.data.sessionId)

        // Start heartbeat every 30 seconds
        heartbeatIntervalRef.current = setInterval(() => {
          sendHeartbeat(data.data.sessionId)
        }, 30000)
      }
    } catch (error) {
      console.error('Failed to start reading session:', error)
    }
  }

  const sendHeartbeat = async (sid: number) => {
    if (!token) return

    const audio = audioRef.current
    const position = audio ? Math.floor(audio.currentTime).toString() : '0'

    try {
      await fetch(`/api/reading/sessions/${sid}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPosition: position,
        }),
      })
    } catch (error) {
      console.error('Failed to send heartbeat:', error)
    }
  }

  const endSession = useCallback(async () => {
    if (!sessionId || !token) return

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    const audio = audioRef.current
    const position = audio ? Math.floor(audio.currentTime).toString() : '0'

    try {
      await fetch(`/api/reading/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endPosition: position,
        }),
      })
    } catch (error) {
      console.error('Failed to end reading session:', error)
    } finally {
      setSessionId(null)
    }
  }, [sessionId, token])

  const handleSeriesClick = (s: AudioSeries) => {
    setSelectedSeries(s)
    setSearchTerm('')
    fetchAudioFiles(s.id)
  }

  const handleBackToSeries = async () => {
    if (sessionId) {
      await endSession()
    }
    setSelectedSeries(null)
    setAudioFiles([])
    setSearchTerm('')
    setSelectedAudio(null)
    setIsPlaying(false)
  }

  const handleAudioClick = async (audio: Audio) => {
    // End previous session if any
    if (sessionId) {
      await endSession()
    }
    setSelectedAudio(audio)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (selectedSeries) {
      fetchAudioFiles(selectedSeries.id, term)
    }
  }

  // Audio player controls
  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
      if (selectedAudio && !sessionId) {
        startSession(selectedAudio.id)
      }
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
  }

  const handlePrevTrack = () => {
    const currentIndex = audioFiles.findIndex((a) => a.id === selectedAudio?.id)
    if (currentIndex > 0) {
      handleAudioClick(audioFiles[currentIndex - 1])
    }
  }

  const handleNextTrack = () => {
    const currentIndex = audioFiles.findIndex((a) => a.id === selectedAudio?.id)
    if (currentIndex < audioFiles.length - 1) {
      handleAudioClick(audioFiles[currentIndex + 1])
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    // Auto-play next track
    const currentIndex = audioFiles.findIndex((a) => a.id === selectedAudio?.id)
    if (currentIndex < audioFiles.length - 1) {
      handleAudioClick(audioFiles[currentIndex + 1])
    } else {
      endSession()
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Show audio player when an audio is selected
  if (selectedAudio) {
    const currentIndex = audioFiles.findIndex((a) => a.id === selectedAudio.id)
    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < audioFiles.length - 1

    return (
      <div className="audio-player-view">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{t.nowPlaying}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={() => setSelectedAudio(null)}>
              {t.back}
            </button>
          </div>
        </div>

        <div className="audio-player-container">
          <div className="audio-now-playing">
            <div className="audio-icon-large">
              <span>🎵</span>
            </div>
            <h2 className="audio-title-large">{selectedAudio.title}</h2>
            {selectedSeries && (
              <p className="audio-series-name">{selectedSeries.name}</p>
            )}
          </div>

          <audio
            ref={audioRef}
            src={`/api/audio/${selectedAudio.id}/stream`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Custom Audio Controls */}
          <div className="audio-controls">
            {/* Progress bar */}
            <div className="audio-progress">
              <span className="time-display">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="progress-slider"
              />
              <span className="time-display">{formatTime(duration)}</span>
            </div>

            {/* Playback controls */}
            <div className="playback-controls">
              <button
                className="control-btn"
                onClick={handlePrevTrack}
                disabled={!hasPrev}
                title="Previous track"
              >
                ⏮
              </button>
              <button
                className="control-btn play-btn"
                onClick={isPlaying ? handlePause : handlePlay}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                className="control-btn"
                onClick={handleNextTrack}
                disabled={!hasNext}
                title="Next track"
              >
                ⏭
              </button>
            </div>

            {/* Volume control */}
            <div className="volume-control">
              <span className="volume-icon">{volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>
          </div>

          <div className="audio-playlist">
            <h3>Playlist</h3>
            <div className="playlist-items">
              {audioFiles.map((audio) => (
                <div
                  key={audio.id}
                  className={`playlist-item ${audio.id === selectedAudio.id ? 'active' : ''}`}
                  onClick={() => handleAudioClick(audio)}
                >
                  <span className="playlist-icon">
                    {audio.id === selectedAudio.id && isPlaying ? '▶' : '♪'}
                  </span>
                  <span className="playlist-title">{audio.title}</span>
                  {audio.duration && (
                    <span className="playlist-duration">{formatDuration(audio.duration)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show audio files for selected series
  if (selectedSeries) {
    return (
      <div className="magazines-dashboard">
        <div className="sub-view-header">
          <h1 className="sub-view-title">{selectedSeries.name}</h1>
          <div className="sub-view-nav">
            <button className="back-btn" onClick={handleBackToSeries}>
              {t.back}
            </button>
            <span className="item-count">{formatCount(t.audioCount, audioFiles.length)}</span>
          </div>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder={t.searchAudio}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="audio-list">
          {audioFiles.map((audio) => (
            <div
              key={audio.id}
              className="audio-item"
              onClick={() => handleAudioClick(audio)}
            >
              <div className="audio-icon">
                <span>🎵</span>
              </div>
              <div className="audio-info">
                <h3 className="audio-title">{audio.title}</h3>
                <div className="audio-meta">
                  {audio.duration && (
                    <span className="duration">{formatDuration(audio.duration)}</span>
                  )}
                  {audio.file_size && (
                    <span className="size">{formatFileSize(audio.file_size)}</span>
                  )}
                </div>
              </div>
              <div className="audio-play-btn">▶</div>
            </div>
          ))}
        </div>

        {audioFiles.length === 0 && (
          <div className="empty-state">
            <p>{t.noAudioFound}</p>
          </div>
        )}
      </div>
    )
  }

  // Show series list
  return (
    <div className="magazines-dashboard no-header">
      {loading ? (
        <div className="loading">{t.loadingAudioSeries}</div>
      ) : series.length === 0 ? (
        <div className="empty-state">
          <h2>{t.noAudioFound}</h2>
        </div>
      ) : (
        <div className="publisher-grid">
          {series.map((s) => (
            <div
              key={s.id}
              className="publisher-card"
              onClick={() => handleSeriesClick(s)}
            >
              <div className="publisher-icon audio-series-icon">
                <span>🎧</span>
              </div>
              <div className="publisher-info">
                <h3 className="publisher-name">{s.name}</h3>
                <span className="publisher-count">{formatCount(t.audioCount, s.audio_count)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
