import SwiftUI

/// AsyncImage with persistent disk caching for offline support
/// Loads from cache first, then fetches from network if needed
/// Detects and rejects placeholder images (e.g., Open Library's "image not available")
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

    /// Minimum valid image size in pixels (width or height)
    /// Images smaller than this are considered placeholders
    /// Open Library returns 1x1 transparent images for missing covers
    /// Real book covers are typically at least 100+ pixels
    private let minimumImageSize: CGFloat = 50

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
                // Validate cached image is not a placeholder
                if cached.size.width >= minimumImageSize && cached.size.height >= minimumImageSize {
                    Log.d("CachedAsyncImage: found valid image in cache \(url.absoluteString)")
                    await MainActor.run {
                        loadedImage = cached
                        isLoading = false
                    }
                    return
                } else {
                    Log.w("CachedAsyncImage: cached image too small, will try network \(url.absoluteString)")
                }
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
                    // Check if image is too small (likely a placeholder like Open Library's "image not available")
                    if image.size.width < minimumImageSize || image.size.height < minimumImageSize {
                        Log.w("CachedAsyncImage: image too small (\(Int(image.size.width))x\(Int(image.size.height))), treating as placeholder: \(url.absoluteString)")
                        // Don't load or cache placeholder images
                    } else {
                        Log.d("CachedAsyncImage: successfully created UIImage (\(Int(image.size.width))x\(Int(image.size.height))) from \(url.absoluteString)")
                        // Cache for offline use
                        await ImageCache.shared.cache(image: image, for: url)
                        await MainActor.run {
                            loadedImage = image
                        }
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
