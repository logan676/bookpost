import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import type { User, AuthResponse } from '../types'
import api from '../services/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const saveTokens = async (token: string, refreshToken: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
    api.setAuthToken(token)
  }

  const clearTokens = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    api.setAuthToken(null)
  }

  const loadUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY)
      if (token) {
        api.setAuthToken(token)
        const userData = await api.getCurrentUser()
        if (userData) {
          setUser(userData)
        } else {
          // Token invalid, try refresh
          const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
          if (refreshToken) {
            try {
              const response = await api.refreshToken(refreshToken)
              await saveTokens(response.accessToken, response.refreshToken)
              setUser(response.user)
            } catch {
              await clearTokens()
              setUser(null)
            }
          } else {
            await clearTokens()
            setUser(null)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      await clearTokens()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password)
    if (typeof response.accessToken !== 'string' || typeof response.refreshToken !== 'string') {
      throw new Error(`Invalid token type: accessToken=${typeof response.accessToken}, refreshToken=${typeof response.refreshToken}`)
    }
    await saveTokens(response.accessToken, response.refreshToken)
    setUser(response.user)
  }

  const register = async (email: string, password: string) => {
    const response = await api.register(email, password)
    await saveTokens(response.accessToken, response.refreshToken)
    setUser(response.user)
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      await clearTokens()
      setUser(null)
    }
  }

  const refreshAuth = async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    if (refreshToken) {
      const response = await api.refreshToken(refreshToken)
      await saveTokens(response.accessToken, response.refreshToken)
      setUser(response.user)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
