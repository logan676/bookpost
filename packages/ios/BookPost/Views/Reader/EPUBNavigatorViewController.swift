import UIKit
import SwiftUI
import Combine

#if canImport(ReadiumShared) && canImport(ReadiumNavigator)
import ReadiumShared
import ReadiumNavigator

/// UIKit-based EPUB Navigator controller
/// Wraps Readium's EPUBNavigatorViewController for use in SwiftUI
class EPUBNavigatorContainerViewController: UIViewController {

    // MARK: - Properties

    private let publication: Publication
    private let initialLocator: Locator?
    private let readingProgression: ReadingProgression

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
        settings: ReadingSettings
    ) {
        self.publication = publication
        self.initialLocator = initialLocator
        self.settings = settings
        self.readingProgression = publication.metadata.readingProgression ?? .ltr
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

    private func setupNavigator() {
        Task { @MainActor in
            do {
                // Create EPUB preferences based on current settings
                let preferences = EPUBPreferences(
                    backgroundColor: settings.colorMode.uiBackgroundColor.cgColor,
                    columnCount: .auto,
                    fontFamily: settings.fontFamily.readiumFontFamily,
                    fontSize: settings.fontSize,
                    lineHeight: settings.lineSpacing.multiplier,
                    pageMargins: settings.marginSize.marginValue,
                    publisherStyles: true,
                    readingProgression: readingProgression,
                    scroll: settings.pageFlipStyle == .vertical,
                    textColor: settings.colorMode.uiTextColor.cgColor
                )

                // Create navigator configuration
                let config = EPUBNavigatorViewController.Configuration(
                    defaults: EPUBDefaults(),
                    editingActions: [.copy],
                    decorationTemplates: decorationTemplates
                )

                // Create the navigator
                let epubNavigator = try await EPUBNavigatorViewController(
                    publication: publication,
                    initialLocation: initialLocator,
                    config: config
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

                // Observe location changes
                epubNavigator.currentLocator
                    .sink { [weak self] locator in
                        self?.onLocationChanged?(locator)
                    }
                    .store(in: &cancellables)

            } catch {
                onError?(error)
            }
        }
    }

    // MARK: - Decoration Templates (for highlights)

    private var decorationTemplates: [Decoration.Style.Id: HTMLDecorationTemplate] {
        [
            .highlight: HTMLDecorationTemplate(
                layout: .boxes,
                width: .wrap,
                element: { decoration in
                    let color = (decoration.extras["color"] as? String) ?? "#FFFF00"
                    return """
                    <div style="background-color: \(color); opacity: 0.4; border-radius: 3px;"></div>
                    """
                }
            ),
            .underline: HTMLDecorationTemplate(
                layout: .bounds,
                width: .page,
                element: { _ in
                    """
                    <div style="border-bottom: 2px solid currentColor;"></div>
                    """
                }
            )
        ]
    }

    // MARK: - Settings Application

    private func applySettings() {
        guard let navigator = navigator else { return }

        let preferences = EPUBPreferences(
            backgroundColor: settings.colorMode.uiBackgroundColor.cgColor,
            columnCount: .auto,
            fontFamily: settings.fontFamily.readiumFontFamily,
            fontSize: settings.fontSize,
            lineHeight: settings.lineSpacing.multiplier,
            pageMargins: settings.marginSize.marginValue,
            publisherStyles: true,
            readingProgression: readingProgression,
            scroll: settings.pageFlipStyle == .vertical,
            textColor: settings.colorMode.uiTextColor.cgColor
        )

        navigator.submitPreferences(preferences)
        view.backgroundColor = settings.colorMode.uiBackgroundColor
    }

    // MARK: - Navigation

    func goToLocator(_ locator: Locator) {
        Task {
            _ = await navigator?.go(to: locator, animated: true)
        }
    }

    func goToLink(_ link: Link) {
        Task {
            _ = await navigator?.go(to: link, animated: true)
        }
    }

    func goForward() {
        Task {
            _ = await navigator?.goForward(animated: true)
        }
    }

    func goBackward() {
        Task {
            _ = await navigator?.goBackward(animated: true)
        }
    }

    func goToProgression(_ progression: Double) {
        Task {
            // Find the locator at this progression
            if let locator = publication.locate(progression: progression) {
                _ = await navigator?.go(to: locator, animated: true)
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

    func navigator(_ navigator: any Navigator, shouldNavigateTo link: Link) -> Bool {
        return true
    }

    func navigator(_ navigator: any Navigator, didTapAt point: CGPoint) {
        onTap?()
    }

    func navigator(_ navigator: any Navigator, didPressKey event: KeyEvent) {
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
    let onTap: () -> Void
    let onLocationChanged: (Locator) -> Void

    func makeUIViewController(context: Context) -> EPUBNavigatorContainerViewController {
        let controller = EPUBNavigatorContainerViewController(
            publication: publication,
            initialLocator: initialLocator,
            settings: settings
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
}

extension FontFamily {
    #if canImport(ReadiumNavigator)
    var readiumFontFamily: ReadiumNavigator.FontFamily? {
        switch self {
        case .system: return nil
        case .songti: return ReadiumNavigator.FontFamily(name: "STSong")
        case .kaiti: return ReadiumNavigator.FontFamily(name: "STKaiti")
        case .heiti: return ReadiumNavigator.FontFamily(name: "STHeiti")
        }
    }
    #endif
}

extension LineSpacing {
    var multiplier: Double {
        switch self {
        case .compact: return 1.2
        case .normal: return 1.5
        case .relaxed: return 1.8
        case .loose: return 2.0
        }
    }
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
