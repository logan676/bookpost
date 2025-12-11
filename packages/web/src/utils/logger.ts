/**
 * Unified logging utility for BookLibrio Web app
 * Usage: log.d('message'), log.i('message'), log.w('message'), log.e('message')
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'network'

interface LogConfig {
  enabled: boolean
  minLevel: LogLevel
  showTimestamp: boolean
  showCaller: boolean
}

const config: LogConfig = {
  enabled: import.meta.env.DEV, // Only enable in development
  minLevel: 'debug',
  showTimestamp: true,
  showCaller: true,
}

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  network: 1,
}

const levelConfig: Record<LogLevel, { emoji: string; color: string; label: string }> = {
  debug: { emoji: '🔍', color: '#888888', label: 'DEBUG' },
  info: { emoji: 'ℹ️', color: '#3B82F6', label: 'INFO' },
  warn: { emoji: '⚠️', color: '#F59E0B', label: 'WARN' },
  error: { emoji: '❌', color: '#EF4444', label: 'ERROR' },
  network: { emoji: '🌐', color: '#06B6D4', label: 'NET' },
}

function getTimestamp(): string {
  return new Date().toISOString()
}

function getCaller(): string {
  const stack = new Error().stack
  if (!stack) return ''

  const lines = stack.split('\n')
  // Find the first line that's not from this file
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]
    if (!line.includes('logger.ts')) {
      const match = line.match(/at\s+(?:.*?\s+)?\(?(.+?):(\d+):\d+\)?/)
      if (match) {
        const file = match[1].split('/').pop()
        return `${file}:${match[2]}`
      }
    }
  }
  return ''
}

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false
  return levelPriority[level] >= levelPriority[config.minLevel]
}

function formatPrefix(level: LogLevel): string[] {
  const { emoji, color, label } = levelConfig[level]
  const parts = [`%c${emoji} [${label}]`, `color: ${color}; font-weight: bold`]

  if (config.showTimestamp) {
    parts[0] += ` %c${getTimestamp()}`
    parts.push('color: #666')
  }

  if (config.showCaller) {
    const caller = getCaller()
    if (caller) {
      parts[0] += ` %c[${caller}]`
      parts.push('color: #999')
    }
  }

  return parts
}

export const log = {
  /**
   * Configure logging
   */
  configure(options: Partial<LogConfig>) {
    Object.assign(config, options)
  },

  /**
   * Debug log - detailed info for debugging
   */
  d(message: string, data?: unknown) {
    if (shouldLog('debug')) {
      const [format, ...styles] = formatPrefix('debug')
      if (data !== undefined) {
        console.log(format + ' %c' + message, ...styles, 'color: inherit', data)
      } else {
        console.log(format + ' %c' + message, ...styles, 'color: inherit')
      }
    }
  },

  /**
   * Info log - general information
   */
  i(message: string, data?: unknown) {
    if (shouldLog('info')) {
      const [format, ...styles] = formatPrefix('info')
      if (data !== undefined) {
        console.log(format + ' %c' + message, ...styles, 'color: inherit', data)
      } else {
        console.log(format + ' %c' + message, ...styles, 'color: inherit')
      }
    }
  },

  /**
   * Warning log
   */
  w(message: string, data?: unknown) {
    if (shouldLog('warn')) {
      const [format, ...styles] = formatPrefix('warn')
      if (data !== undefined) {
        console.warn(format + ' %c' + message, ...styles, 'color: inherit', data)
      } else {
        console.warn(format + ' %c' + message, ...styles, 'color: inherit')
      }
    }
  },

  /**
   * Error log
   */
  e(message: string, error?: Error | unknown) {
    if (shouldLog('error')) {
      const [format, ...styles] = formatPrefix('error')
      console.error(format + ' %c' + message, ...styles, 'color: inherit')
      if (error instanceof Error) {
        console.error('   Stack:', error.stack)
      } else if (error) {
        console.error('   Details:', error)
      }
    }
  },

  /**
   * Network request log
   */
  request(method: string, url: string, body?: unknown) {
    if (shouldLog('network')) {
      const [format, ...styles] = formatPrefix('network')
      console.log(format + ' %c➡️ ' + method + ' ' + url, ...styles, 'color: #06B6D4; font-weight: bold')
      if (body) {
        console.log('   📤 Body:', body)
      }
    }
  },

  /**
   * Network response log
   */
  response(method: string, url: string, status: number, duration: number, data?: unknown) {
    if (shouldLog('network')) {
      const [format, ...styles] = formatPrefix('network')
      const statusEmoji = status >= 200 && status < 300 ? '✅' : '❌'
      const statusColor = status >= 200 && status < 300 ? '#22C55E' : '#EF4444'
      console.log(
        format + ` %c⬅️ ${method} ${url} %c${statusEmoji} ${status}%c (${duration.toFixed(0)}ms)`,
        ...styles,
        'color: #06B6D4; font-weight: bold',
        `color: ${statusColor}; font-weight: bold`,
        'color: #666'
      )
      if (data && config.minLevel === 'debug') {
        console.log('   📥 Response:', data)
      }
    }
  },

  /**
   * Component lifecycle log
   */
  mount(componentName: string) {
    if (shouldLog('debug')) {
      log.d(`📦 Mounted: ${componentName}`)
    }
  },

  unmount(componentName: string) {
    if (shouldLog('debug')) {
      log.d(`📦 Unmounted: ${componentName}`)
    }
  },

  /**
   * State change log
   */
  state(name: string, value: unknown) {
    if (shouldLog('debug')) {
      log.d(`🔄 State [${name}]:`, value)
    }
  },

  /**
   * Measure execution time
   */
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      log.i(`⏱️ ${label}`, `${duration.toFixed(2)}ms`)
      return result
    } catch (error) {
      const duration = performance.now() - start
      log.e(`⏱️ ${label} failed after ${duration.toFixed(2)}ms`, error)
      throw error
    }
  },

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string) {
    return {
      d: (message: string, data?: unknown) => log.d(`[${prefix}] ${message}`, data),
      i: (message: string, data?: unknown) => log.i(`[${prefix}] ${message}`, data),
      w: (message: string, data?: unknown) => log.w(`[${prefix}] ${message}`, data),
      e: (message: string, error?: Error | unknown) => log.e(`[${prefix}] ${message}`, error),
    }
  },

  /**
   * Group related logs
   */
  group(label: string, fn: () => void) {
    if (shouldLog('debug')) {
      console.group(`📁 ${label}`)
      fn()
      console.groupEnd()
    }
  },

  /**
   * Table display for arrays/objects
   */
  table(label: string, data: unknown[]) {
    if (shouldLog('debug')) {
      log.d(label)
      console.table(data)
    }
  },
}

export default log
