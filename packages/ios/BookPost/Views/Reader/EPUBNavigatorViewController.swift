import UIKit
import SwiftUI
import Combine

#if canImport(ReadiumShared) && canImport(ReadiumNavigator)
import ReadiumShared
import ReadiumNavigator
import ReadiumAdapterGCDWebServer

/// UIKit-based EPUB Navigator controller
/// Wraps Readium's EPUBNavigatorViewController for use in SwiftUI
class EPUBNavigatorContainerViewController: UIViewController {

    // MARK: - Properties

    private let publication: Publication
    private let initialLocator: Locator?
    private let readingProgression: ReadiumNavigator.ReadingProgression
    private let httpServer: GCDHTTPServer

    private var navigator: EPUBNavigatorViewController?
    private var cancellables = Set<AnyCancellable>()

    // Callbacks
    var onTap: (() -> Void)?
    var onLocationChanged: ((Locator) -> Void)?
    var onError: ((Error) -> Void)?

    // Reading settings (observed for changes)
    var settings: ReadingSettings {
        didSet {
            applySettings()
        }
    }

    // MARK: - Initialization

    init(
        publication: Publication,
        initialLocator: Locator? = nil,
        settings: ReadingSettings,
        httpServer: GCDHTTPServer
    ) {
        self.publication = publication
        self.initialLocator = initialLocator
        self.settings = settings
        self.httpServer = httpServer
        // Convert ReadiumShared.ReadingProgression to ReadiumNavigator.ReadingProgression
        let sharedProgression = publication.metadata.readingProgression
        self.readingProgression = sharedProgression == .rtl ? .rtl : .ltr
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = settings.colorMode.uiBackgroundColor
        setupNavigator()
    }

    // MARK: - Navigator Setup

    // Base font size in points for calculating Readium's font size multiplier
    // Readium expects fontSize as a multiplier (1.0 = 100% = default)
    private static let baseFontSize: CGFloat = 16.0

    private func setupNavigator() {
        Task { @MainActor in
            do {
                // Convert point-based fontSize to Readium multiplier
                // e.g., 18pt / 16pt base = 1.125 (112.5%)
                let fontSizeMultiplier = settings.fontSize / Self.baseFontSize

                // Create EPUB preferences based on current settings
                let preferences = EPUBPreferences(
                    backgroundColor: settings.colorMode.readiumBackgroundColor,
                    columnCount: .auto,
                    fontFamily: settings.fontFamily.readiumFontFamily,
                    fontSize: fontSizeMultiplier,
                    lineHeight: settings.lineSpacing.multiplier,
                    pageMargins: settings.marginSize.marginValue,
                    publisherStyles: true,
                    readingProgression: readingProgression,
                    scroll: settings.pageFlipStyle == .vertical,
                    textColor: settings.colorMode.readiumTextColor
                )

                // Create navigator configuration
                let config = EPUBNavigatorViewController.Configuration(
                    defaults: EPUBDefaults(),
                    editingActions: [.copy]
                )

                // Create the navigator
                let epubNavigator = try await EPUBNavigatorViewController(
                    publication: publication,
                    initialLocation: initialLocator,
                    config: config,
                    httpServer: httpServer
                )

                self.navigator = epubNavigator
                epubNavigator.delegate = self

                // Add as child view controller
                addChild(epubNavigator)
                epubNavigator.view.frame = view.bounds
                epubNavigator.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
                view.addSubview(epubNavigator.view)
                epubNavigator.didMove(toParent: self)

                // Apply initial preferences
                epubNavigator.submitPreferences(preferences)

                // Location changes are observed through NavigatorDelegate

            } catch {
                onError?(error)
            }
        }
    }

    // MARK: - Settings Application

    private func applySettings() {
        guard let navigator = navigator else { return }

        // Convert point-based fontSize to Readium multiplier
        let fontSizeMultiplier = settings.fontSize / Self.baseFontSize

        let preferences = EPUBPreferences(
            backgroundColor: settings.colorMode.readiumBackgroundColor,
            columnCount: .auto,
            fontFamily: settings.fontFamily.readiumFontFamily,
            fontSize: fontSizeMultiplier,
            lineHeight: settings.lineSpacing.multiplier,
            pageMargins: settings.marginSize.marginValue,
            publisherStyles: true,
            readingProgression: readingProgression,
            scroll: settings.pageFlipStyle == .vertical,
            textColor: settings.colorMode.readiumTextColor
        )

        navigator.submitPreferences(preferences)
        view.backgroundColor = settings.colorMode.uiBackgroundColor
    }

    // MARK: - Navigation

    func goToLocator(_ locator: Locator) {
        Task {
            _ = await navigator?.go(to: locator)
        }
    }

    func goToLink(_ link: ReadiumShared.Link) {
        Task {
            _ = await navigator?.go(to: link)
        }
    }

    func goForward() {
        Task {
            _ = await navigator?.goForward()
        }
    }

    func goBackward() {
        Task {
            _ = await navigator?.goBackward()
        }
    }

    func goToProgression(_ progression: Double) {
        Task {
            // Find the locator at this progression
            if let locator = await publication.locate(progression: progression) {
                _ = await navigator?.go(to: locator)
            }
        }
    }
}

// MARK: - EPUBNavigatorDelegate

extension EPUBNavigatorContainerViewController: EPUBNavigatorDelegate {

    func navigator(_ navigator: any Navigator, presentError error: NavigatorError) {
        print("Navigator error: \(error)")
        onError?(error)
    }

    func navigator(_ navigator: any Navigator, presentExternalURL url: URL) {
        // Open external URLs in Safari
        UIApplication.shared.open(url)
    }

    func navigator(_ navigator: any Navigator, locationDidChange locator: Locator) {
        onLocationChanged?(locator)
    }
}

// MARK: - VisualNavigatorDelegate

extension EPUBNavigatorContainerViewController: VisualNavigatorDelegate {

    func navigator(_ navigator: any VisualNavigator, didTapAt point: CGPoint) {
        onTap?()
    }

    func navigator(_ navigator: any VisualNavigator, didPressKey event: KeyEvent) {
        // Handle keyboard navigation
        switch event.key {
        case .arrowLeft:
            goBackward()
        case .arrowRight:
            goForward()
        default:
            break
        }
    }
}

// MARK: - SelectableNavigatorDelegate (for text selection)

extension EPUBNavigatorContainerViewController: SelectableNavigatorDelegate {

    func navigator(_ navigator: any SelectableNavigator, canPerformAction action: EditingAction, for selection: Selection) -> Bool {
        return action == .copy
    }

    func navigator(_ navigator: any SelectableNavigator, shouldShowMenuForSelection selection: Selection) -> Bool {
        return true
    }
}

#endif

// MARK: - SwiftUI Bridge

/// SwiftUI wrapper for EPUB Navigator
struct EPUBNavigatorView: UIViewControllerRepresentable {

    #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
    let publication: Publication
    let initialLocator: Locator?
    let settings: ReadingSettings
    let targetLocator: Locator?  // For navigation from search results
    let httpServer: GCDHTTPServer
    let onTap: () -> Void
    let onLocationChanged: (Locator) -> Void

    func makeUIViewController(context: Context) -> EPUBNavigatorContainerViewController {
        let controller = EPUBNavigatorContainerViewController(
            publication: publication,
            initialLocator: initialLocator,
            settings: settings,
            httpServer: httpServer
        )
        controller.onTap = onTap
        controller.onLocationChanged = onLocationChanged
        context.coordinator.controller = controller
        return controller
    }

    func updateUIViewController(_ uiViewController: EPUBNavigatorContainerViewController, context: Context) {
        uiViewController.settings = settings

        // Handle navigation to target locator (e.g., from search)
        if let locator = targetLocator {
            uiViewController.goToLocator(locator)
        }
    }

    // Coordinator for navigation commands
    class Coordinator {
        var controller: EPUBNavigatorContainerViewController?

        func goForward() {
            controller?.goForward()
        }

        func goBackward() {
            controller?.goBackward()
        }

        func goToProgression(_ progression: Double) {
            controller?.goToProgression(progression)
        }

        func goToLocator(_ locator: Locator) {
            controller?.goToLocator(locator)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    #else
    // Fallback when Readium is not available
    func makeUIViewController(context: Context) -> UIViewController {
        let vc = UIViewController()
        vc.view.backgroundColor = .systemBackground
        let label = UILabel()
        label.text = "EPUB Reader requires Readium framework"
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        vc.view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: vc.view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: vc.view.centerYAnchor)
        ])
        return vc
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
    #endif
}

// MARK: - Reading Settings Extensions

extension ColorMode {
    var uiBackgroundColor: UIColor {
        switch self {
        case .light: return .systemBackground
        case .sepia: return UIColor(red: 0.98, green: 0.96, blue: 0.90, alpha: 1.0)
        case .green: return UIColor(red: 0.90, green: 0.96, blue: 0.90, alpha: 1.0)
        case .dark: return UIColor(red: 0.12, green: 0.12, blue: 0.12, alpha: 1.0)
        }
    }

    var uiTextColor: UIColor {
        switch self {
        case .light: return .label
        case .sepia: return UIColor(red: 0.3, green: 0.2, blue: 0.1, alpha: 1.0)
        case .green: return UIColor(red: 0.1, green: 0.3, blue: 0.1, alpha: 1.0)
        case .dark: return UIColor(red: 0.85, green: 0.85, blue: 0.85, alpha: 1.0)
        }
    }

    #if canImport(ReadiumNavigator)
    var readiumBackgroundColor: ReadiumNavigator.Color? {
        ReadiumNavigator.Color(uiColor: uiBackgroundColor)
    }

    var readiumTextColor: ReadiumNavigator.Color? {
        ReadiumNavigator.Color(uiColor: uiTextColor)
    }
    #endif
}

extension FontFamily {
    #if canImport(ReadiumNavigator)
    var readiumFontFamily: ReadiumNavigator.FontFamily? {
        switch self {
        case .system: return nil
        case .songti: return .serif
        case .kaiti: return .serif
        case .heiti: return .sansSerif
        }
    }
    #endif
}

extension MarginSize {
    var marginValue: Double {
        switch self {
        case .small: return 0.5
        case .medium: return 1.0
        case .large: return 1.5
        }
    }
}
