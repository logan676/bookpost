# BookPost Mobile

Cross-platform mobile app for BookPost digital library, built with React Native and Expo.

## Features

- Browse and read ebooks (EPUB/PDF)
- Browse and read magazines (PDF)
- Manage physical book collection
- Reading progress sync across devices
- Offline support (coming soon)
- Native iOS and Android design

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.81 |
| Platform | Expo SDK 54 |
| Language | TypeScript |
| Navigation | React Navigation 7 |
| State | React Context + Hooks |
| Storage | expo-secure-store |
| Networking | Fetch API |
| Images | CachedImage component |

## Project Structure

```
src/
├── components/           # Reusable UI components
│   └── CachedImage.tsx
├── contexts/
│   └── AuthContext.tsx   # Authentication state
├── screens/
│   ├── ShelfScreen.tsx       # Reading history
│   ├── HomeScreen.tsx        # Physical books
│   ├── BookDetailScreen.tsx
│   ├── PostDetailScreen.tsx  # Book reading notes
│   ├── EbooksScreen.tsx      # Ebook library
│   ├── EbookDetailScreen.tsx
│   ├── EbookReaderScreen.tsx # WebView reader
│   ├── MagazinesScreen.tsx   # Magazine library
│   ├── MagazineDetailScreen.tsx
│   ├── MagazineReaderScreen.tsx # Page viewer with zoom
│   ├── ThinkingScreen.tsx    # Notes list
│   ├── NoteDetailScreen.tsx
│   ├── LoginScreen.tsx
│   └── MeScreen.tsx          # User settings
├── services/
│   └── api.ts            # API client
├── types/
│   └── index.ts          # TypeScript types
└── App.tsx               # Root navigation
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator

### 1. Install Dependencies

```bash
cd packages/mobile
npm install
```

### 2. Start Development Server

```bash
# Start Expo dev server
npm start

# Or for specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
```

### 3. Configure API Endpoint

The app defaults to the production API. For local development, edit `src/services/api.ts`:

```typescript
// Uncomment for local development
// return `http://${debuggerHost}:3001/api`
```

## Features

### Authentication

- Email/password login
- Secure token storage
- Auto-refresh on startup
- Persistent sessions

### Shelf (Reading History)

- View recently read items
- Shows ebooks, magazines, and books
- Last read date and page number
- Quick navigation to continue reading

### Ebooks

- Grid view with cover images
- Category filtering
- Search by title
- Detail view with metadata
- WebView-based reader with HTML rendering
- Chapter navigation
- Reading progress sync

### Magazines

- Grid view with covers
- Publisher and year filtering
- Search by title
- Page-by-page viewer
- Tap-to-zoom functionality
- Page thumbnail navigation
- Reading progress sync

### Physical Books

- Grid view with covers
- Search by title, author, or ISBN
- Book detail with posts/notes
- Reading notes viewer

### Notes/Thinking

- List view with year filtering
- Search functionality
- Note content with highlights
- Comments display

### Profile

- User info display
- Server configuration
- Logout functionality

## API Endpoints Used

| Feature | Endpoint |
|---------|----------|
| Login | `POST /api/auth/login` |
| Register | `POST /api/auth/register` |
| Get User | `GET /api/auth/me` |
| Reading History | `GET /api/reading-history` |
| Update Progress | `POST /api/reading-history` |
| List Ebooks | `GET /api/ebooks` |
| Get Ebook | `GET /api/ebooks/:id` |
| Ebook Content | `GET /api/ebooks/:id/text` |
| List Magazines | `GET /api/magazines` |
| Magazine Info | `GET /api/magazines/:id/info` |
| Magazine Page | `GET /api/magazines/:id/page/:num` |
| List Books | `GET /api/books` |
| Get Book | `GET /api/books/:id` |
| Book Posts | `GET /api/books/:id/posts` |
| Get Post | `GET /api/books/:id/posts/:postId` |
| List Notes | `GET /api/notes` |
| Note Content | `GET /api/notes/:id/content` |

## Building for Production

### iOS

```bash
# Build for iOS
npx expo build:ios

# Or use EAS Build
npx eas build --platform ios
```

### Android

```bash
# Build for Android
npx expo build:android

# Or use EAS Build
npx eas build --platform android
```

## Development Tips

### Debugging

- Use Expo DevTools in browser
- React Native Debugger for state inspection
- Reactotron for network inspection (configured)

### Hot Reload

- Shake device to open developer menu
- Press 'r' in terminal to reload
- Press 'm' to toggle menu

### Testing on Device

- Install Expo Go on your device
- Scan QR code from terminal
- App reloads automatically on save

## Dependencies

```json
{
  "expo": "~54.0.25",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "@react-navigation/native": "^7.1.22",
  "@react-navigation/bottom-tabs": "^7.8.8",
  "@react-navigation/native-stack": "^7.8.2",
  "expo-secure-store": "~15.0.7",
  "react-native-webview": "^13.12.5",
  "react-native-gesture-handler": "~2.24.0",
  "react-native-reanimated": "~3.18.0"
}
```

## Contributing

1. Follow React Native best practices
2. Use TypeScript for type safety
3. Write clear commit messages
4. Test on both iOS and Android

## License

MIT
