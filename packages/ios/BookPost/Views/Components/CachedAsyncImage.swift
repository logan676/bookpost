import SwiftUI

/// AsyncImage with persistent disk caching for offline support
/// Loads from cache first, then fetches from network if needed
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

    @State private var loadedImage: UIImage?
    @State private var isLoading = false

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let image = loadedImage {
                content(Image(uiImage: image))
            } else {
                placeholder()
                    .onAppear {
                        loadImage()
                    }
            }
        }
        .onChange(of: url) { _, newUrl in
            loadedImage = nil
            loadImage()
        }
    }

    private func loadImage() {
        guard let url = url, !isLoading else {
            Log.d("CachedAsyncImage: skipping load - url=\(url?.absoluteString ?? "nil"), isLoading=\(isLoading)")
            return
        }

        Log.d("CachedAsyncImage: loading image from \(url.absoluteString)")
        isLoading = true

        Task {
            // Try cache first
            if let cached = await ImageCache.shared.image(for: url) {
                Log.d("CachedAsyncImage: found in cache \(url.absoluteString)")
                await MainActor.run {
                    loadedImage = cached
                    isLoading = false
                }
                return
            }

            Log.d("CachedAsyncImage: not in cache, fetching from network \(url.absoluteString)")

            // Fetch from network
            do {
                let (data, response) = try await URLSession.shared.data(from: url)
                Log.d("CachedAsyncImage: received \(data.count) bytes from \(url.absoluteString)")

                if let httpResponse = response as? HTTPURLResponse {
                    Log.d("CachedAsyncImage: HTTP status \(httpResponse.statusCode) for \(url.absoluteString)")
                }

                if let image = UIImage(data: data) {
                    Log.d("CachedAsyncImage: successfully created UIImage from \(url.absoluteString)")
                    // Cache for offline use
                    await ImageCache.shared.cache(image: image, for: url)
                    await MainActor.run {
                        loadedImage = image
                    }
                } else {
                    Log.e("CachedAsyncImage: failed to create UIImage from data for \(url.absoluteString)")
                }
            } catch {
                Log.e("Failed to load image: \(url)", error: error)
            }

            await MainActor.run {
                isLoading = false
            }
        }
    }
}

// MARK: - Convenience initializer matching AsyncImage API

extension CachedAsyncImage where Content == Image, Placeholder == ProgressView<SwiftUI.EmptyView, SwiftUI.EmptyView> {
    init(url: URL?) {
        self.url = url
        self.content = { $0 }
        self.placeholder = { ProgressView() }
    }
}
