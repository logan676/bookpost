# Internationalization (i18n) Guide

> Complete guide for localization in BookLibrio

---

## Overview

BookLibrio uses platform-native localization approaches:

| Platform | Method | Files |
|----------|--------|-------|
| iOS | `NSLocalizedString` + L10n wrapper | `.strings` files |
| Web | React Context + translation objects | `i18n/index.tsx` |

### Supported Languages

| Language | Code | iOS | Web | Status |
|----------|------|-----|-----|--------|
| English | `en` | ✅ | ✅ | Complete |
| Simplified Chinese | `zh-Hans` | ✅ | ✅ | Complete |
| Traditional Chinese | `zh-Hant` | ❌ | ❌ | Planned |

---

## iOS Localization

### Architecture

```
packages/ios/BookLibrio/
├── Utilities/
│   └── L10n.swift              # Type-safe localization wrapper
└── Resources/
    ├── en.lproj/
    │   └── Localizable.strings  # English strings (1,150+ keys)
    └── zh-Hans.lproj/
        └── Localizable.strings  # Chinese strings
```

### L10n.swift Structure

The `L10n.swift` file provides type-safe access to localized strings:

```swift
enum L10n {
    enum Common {
        static var appName: String {
            NSLocalizedString("app.name", comment: "")
        }
        static var loading: String {
            NSLocalizedString("common.loading", comment: "")
        }
    }

    enum Reader {
        static var tableOfContents: String {
            NSLocalizedString("reader.tableOfContents", comment: "")
        }

        // Parameterized strings
        static func page(_ number: Int) -> String {
            String(format: NSLocalizedString("reader.page", comment: ""), number)
        }
    }
}
```

### Usage in SwiftUI

```swift
// Simple string
Text(L10n.Common.loading)

// Parameterized string
Text(L10n.Reader.page(currentPage))

// In buttons
Button(L10n.Common.cancel) { ... }
```

### Adding a New String

1. **Add to both `.strings` files:**

```properties
// en.lproj/Localizable.strings
"feature.newKey" = "New Feature";

// zh-Hans.lproj/Localizable.strings
"feature.newKey" = "新功能";
```

2. **Add to L10n.swift:**

```swift
enum Feature {
    static var newKey: String {
        NSLocalizedString("feature.newKey", comment: "")
    }
}
```

3. **Use in code:**

```swift
Text(L10n.Feature.newKey)
```

### String Key Naming Convention

```
<domain>.<subDomain>.<element>

Examples:
- common.loading
- reader.tableOfContents
- reader.settings.fontSize
- store.category.fiction
- profile.stats.booksRead
```

### Domains

| Domain | Description |
|--------|-------------|
| `common` | Shared UI elements (loading, cancel, confirm) |
| `tab` | Tab bar items |
| `auth` | Login, register, logout |
| `home` | Home screen |
| `ebooks` | Ebook features |
| `magazines` | Magazine features |
| `reader` | Reader controls |
| `store` | Store/discovery |
| `profile` | User profile |
| `settings` | Settings |
| `ai` | AI features |
| `social` | Social features |

---

## Web Localization

### Architecture

```
packages/web/src/
└── i18n/
    └── index.tsx    # Translations + React Context
```

### Implementation

```typescript
// Translation type
type Translations = {
    appTitle: string;
    loading: string;
    // ... more keys
}

// English translations
const en: Translations = {
    appTitle: 'BookLibrio',
    loading: 'Loading...',
}

// Chinese translations
const zh: Translations = {
    appTitle: 'BookLibrio',
    loading: '加载中...',
}

// React Context
export function I18nProvider({ children }) {
    const [locale, setLocale] = useState(() => {
        return localStorage.getItem('locale') ||
               navigator.language.startsWith('zh') ? 'zh' : 'en'
    })
    // ...
}

// Hook for accessing translations
export function useI18n() {
    const context = useContext(I18nContext)
    return context // { t, locale, setLocale }
}
```

### Usage in React

```tsx
function MyComponent() {
    const { t, locale, setLocale } = useI18n()

    return (
        <div>
            <h1>{t.appTitle}</h1>
            <p>{t.loading}</p>

            {/* Language switcher */}
            <button onClick={() => setLocale('en')}>English</button>
            <button onClick={() => setLocale('zh')}>中文</button>
        </div>
    )
}
```

### Adding a New String

1. **Add to Translations type:**

```typescript
type Translations = {
    // ... existing
    newFeature: string;
}
```

2. **Add to both language objects:**

```typescript
const en: Translations = {
    // ... existing
    newFeature: 'New Feature',
}

const zh: Translations = {
    // ... existing
    newFeature: '新功能',
}
```

---

## Adding a New Language

### iOS

1. **Create new `.lproj` folder:**

```bash
mkdir packages/ios/BookLibrio/Resources/ja.lproj
```

2. **Copy and translate strings:**

```bash
cp packages/ios/BookLibrio/Resources/en.lproj/Localizable.strings \
   packages/ios/BookLibrio/Resources/ja.lproj/Localizable.strings
```

3. **Add to Xcode project:**
   - Open `BookLibrio.xcodeproj`
   - Select project → Info → Localizations
   - Click `+` and add the new language
   - Select `Localizable.strings` to localize

4. **Translate all strings** in the new file

### Web

1. **Add new language object:**

```typescript
const ja: Translations = {
    appTitle: 'BookLibrio',
    loading: '読み込み中...',
    // ... translate all keys
}
```

2. **Update translations map:**

```typescript
const translations: Record<string, Translations> = {
    en,
    zh,
    ja, // Add new language
}
```

3. **Update language detection:**

```typescript
const getDefaultLocale = () => {
    const lang = navigator.language
    if (lang.startsWith('zh')) return 'zh'
    if (lang.startsWith('ja')) return 'ja'
    return 'en'
}
```

---

## Best Practices

### Do's

- ✅ Use type-safe wrappers (L10n enum on iOS)
- ✅ Keep keys organized by feature domain
- ✅ Use parameterized strings for dynamic content
- ✅ Test with different languages during development
- ✅ Keep translations in sync across platforms

### Don'ts

- ❌ Hardcode user-facing strings
- ❌ Concatenate translated strings
- ❌ Use different keys for same concept across platforms
- ❌ Forget to add new strings to all language files

### Parameterized Strings

**iOS:**
```swift
// Localizable.strings
"reader.pageOf" = "Page %d of %d";

// L10n.swift
static func pageOf(_ current: Int, _ total: Int) -> String {
    String(format: NSLocalizedString("reader.pageOf", comment: ""), current, total)
}
```

**Web:**
```typescript
// Use template function
function formatCount(template: string, count: number): string {
    return template.replace('{count}', count.toString())
}

// Usage
formatCount(t.booksCount, 42) // "42 books"
```

---

## Testing Localization

### iOS

1. **Change device language:**
   - Settings → General → Language & Region → iPhone Language

2. **Use scheme settings:**
   - Edit Scheme → Run → Options → App Language

3. **Preview in SwiftUI:**
   ```swift
   #Preview {
       MyView()
           .environment(\.locale, Locale(identifier: "zh-Hans"))
   }
   ```

### Web

1. **Change browser language** in settings

2. **Use language switcher** in the app

3. **Override in code:**
   ```typescript
   <I18nProvider defaultLocale="zh">
       <App />
   </I18nProvider>
   ```

---

## Localization Checklist

When adding a new feature:

- [ ] Add all user-facing strings to `.strings` files
- [ ] Add corresponding L10n.swift entries
- [ ] Translate to all supported languages
- [ ] Test with each language
- [ ] Update web translations if applicable
- [ ] Check string lengths (some languages are longer)

---

## File Reference

| File | Purpose |
|------|---------|
| `packages/ios/BookLibrio/Utilities/L10n.swift` | iOS type-safe wrapper |
| `packages/ios/BookLibrio/Resources/en.lproj/Localizable.strings` | iOS English |
| `packages/ios/BookLibrio/Resources/zh-Hans.lproj/Localizable.strings` | iOS Chinese |
| `packages/web/src/i18n/index.tsx` | Web translations |

---

*Last updated: December 2024*
