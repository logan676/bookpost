if (__DEV__) {
  require('./src/ReactotronConfig').default
}

import React from 'react'
import { StatusBar, View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import {
  HomeScreen,
  BookDetailScreen,
  PostDetailScreen,
  EbooksScreen,
  EbookDetailScreen,
  EbookReaderScreen,
  MagazinesScreen,
  MagazineDetailScreen,
  MagazineReaderScreen,
  ShelfScreen,
  MeScreen,
  LoginScreen,
  ThinkingScreen,
  NoteDetailScreen,
} from './src/screens'
import type { RootStackParamList } from './src/types'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator()

// Tab icons using emoji
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Shelf: '📚',
    Ebook: '📖',
    Magazine: '📰',
    Thinking: '💭',
    Me: '👤',
  }
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {icons[name] || '📄'}
      </Text>
    </View>
  )
}

function MainTabs() {
  const insets = useSafeAreaInsets()
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          paddingTop: 6,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Shelf"
        component={ShelfScreen}
        options={{ tabBarLabel: 'Shelf' }}
      />
      <Tab.Screen
        name="Ebook"
        component={EbooksScreen}
        options={{ tabBarLabel: 'Ebook' }}
      />
      <Tab.Screen
        name="Magazine"
        component={MagazinesScreen}
        options={{ tabBarLabel: 'Magazine' }}
      />
      <Tab.Screen
        name="Thinking"
        component={ThinkingScreen}
        options={{ tabBarLabel: 'Thinking' }}
      />
      <Tab.Screen
        name="Me"
        component={MeScreen}
        options={{ tabBarLabel: 'Me' }}
      />
    </Tab.Navigator>
  )
}

function AppNavigator() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#6366f1',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BookDetail"
            component={BookDetailScreen}
            options={{ title: 'Book Details' }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ title: 'Reading Note' }}
          />
          <Stack.Screen
            name="EbookDetail"
            component={EbookDetailScreen}
            options={{ title: 'Book Details' }}
          />
          <Stack.Screen
            name="EbookReader"
            component={EbookReaderScreen}
            options={{ title: 'Reading' }}
          />
          <Stack.Screen
            name="MagazineDetail"
            component={MagazineDetailScreen}
            options={{ title: 'Magazine Details' }}
          />
          <Stack.Screen
            name="MagazineReader"
            component={MagazineReaderScreen}
            options={{ title: 'Magazine' }}
          />
          <Stack.Screen
            name="NoteDetail"
            component={NoteDetailScreen}
            options={{ title: 'Note' }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
})
