import UIKit
import SwiftUI
import Combine

#if canImport(ReadiumShared) && canImport(ReadiumNavigator)
import ReadiumShared
import ReadiumNavigator
import ReadiumAdapterGCDWebServer

/// Selection data for highlight creation
struct EPUBSelection {
    let locator: Locator
    let text: String
    let frame: CGRect
}

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

    // Selection popup
    private var selectionPopupController: UIHostingController<SelectionPopupView>?
    private var currentSelection: Selection?

    // Highlight edit popup
    private var highlightEditPopupController: UIHostingController<HighlightEditPopupView>?
    private var currentHighlightId: String?
    private var currentHighlightLocator: Locator?

    // Meaning popup
    private var meaningPopupController: UIHostingController<AnyView>?

    // Highlight decorations
    private var highlightDecorations: [Decoration] = []
    private let highlightGroup = "highlights"

    // Callbacks
    var onTap: (() -> Void)?
    var onLocationChanged: ((Locator) -> Void)?
    var onError: ((Error) -> Void)?
    var onHighlightCreated: ((EPUBSelection, HighlightColor) -> Void)?
    var onHighlightTapped: ((String) -> Void)?  // Decoration ID
    var onHighlightDeleted: ((String) -> Void)?  // Decoration ID
    var onHighlightColorChanged: ((String, HighlightColor) -> Void)?  // ID and new color
    var onHighlightNoteAdded: ((String, String) -> Void)?  // ID and note text

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
    // Using 10.0 as base makes default 22pt appear at ~2.2x size (220%)
    private static let baseFontSize: CGFloat = 10.0

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

                // Setup highlight tap interaction observer
                setupHighlightInteractionObserver()

            } catch {
                onError?(error)
            }
        }
    }

    private func setupHighlightInteractionObserver() {
        guard let navigator = navigator else { return }

        // Observe decoration interactions (highlight taps)
        // In Readium 3.x, the callback receives OnDecorationActivatedEvent struct
        navigator.observeDecorationInteractions(inGroup: highlightGroup) { [weak self] event in
            guard let self = self else { return }
            // User tapped on a highlight - show edit popup
            self.showHighlightEditPopup(for: event.decoration, at: event.point)
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

    // MARK: - Selection Popup

    private func showSelectionPopup(for selection: Selection) {
        guard let frame = selection.frame else { return }

        currentSelection = selection
        hideSelectionPopup()

        let popupView = SelectionPopupView(
            onHighlight: { [weak self] color in
                self?.createHighlight(color: color)
            },
            onMeaning: { [weak self] in
                self?.showMeaningPopup()
            },
            onCopy: { [weak self] in
                self?.copySelection()
            },
            onShare: { [weak self] in
                self?.shareSelection()
            },
            onDismiss: { [weak self] in
                self?.hideSelectionPopup()
                self?.navigator?.clearSelection()
            }
        )

        let hostingController = UIHostingController(rootView: popupView)
        hostingController.view.backgroundColor = .clear

        // Calculate popup position (above the selection)
        let popupSize = CGSize(width: 280, height: 50)
        var popupY = frame.minY - popupSize.height - 8

        // If not enough space above, show below
        if popupY < view.safeAreaInsets.top + 60 {
            popupY = frame.maxY + 8
        }

        let popupX = max(16, min(frame.midX - popupSize.width / 2, view.bounds.width - popupSize.width - 16))

        hostingController.view.frame = CGRect(
            x: popupX,
            y: popupY,
            width: popupSize.width,
            height: popupSize.height
        )

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)

        // Animate in
        hostingController.view.alpha = 0
        hostingController.view.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
        UIView.animate(withDuration: 0.2) {
            hostingController.view.alpha = 1
            hostingController.view.transform = .identity
        }

        selectionPopupController = hostingController
    }

    private func hideSelectionPopup() {
        guard let controller = selectionPopupController else { return }

        UIView.animate(withDuration: 0.15, animations: {
            controller.view.alpha = 0
            controller.view.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
        }) { _ in
            controller.willMove(toParent: nil)
            controller.view.removeFromSuperview()
            controller.removeFromParent()
        }

        selectionPopupController = nil
        currentSelection = nil
    }

    // MARK: - Meaning Popup

    private func showMeaningPopup() {
        guard let selection = currentSelection else { return }

        let selectedText = selection.locator.text.highlight ?? ""
        guard !selectedText.isEmpty else { return }

        // Build paragraph context from before + highlight + after
        let before = selection.locator.text.before ?? ""
        let after = selection.locator.text.after ?? ""
        let paragraph = before + selectedText + after

        hideSelectionPopup()
        hideMeaningPopup()

        let meaningView = MeaningPopupView(
            selectedText: selectedText,
            paragraph: paragraph,
            onDismiss: { [weak self] in
                self?.hideMeaningPopup()
            }
        )

        let hostingController = UIHostingController(rootView: AnyView(meaningView))
        hostingController.view.backgroundColor = .clear

        // Center the popup
        let popupSize = CGSize(width: 340, height: 400)
        let popupX = (view.bounds.width - popupSize.width) / 2
        let popupY = (view.bounds.height - popupSize.height) / 2

        hostingController.view.frame = CGRect(
            x: popupX,
            y: popupY,
            width: popupSize.width,
            height: popupSize.height
        )

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)

        // Animate in
        hostingController.view.alpha = 0
        hostingController.view.transform = CGAffineTransform(scaleX: 0.9, y: 0.9)
        UIView.animate(withDuration: 0.25) {
            hostingController.view.alpha = 1
            hostingController.view.transform = .identity
        }

        meaningPopupController = hostingController
        currentSelection = nil
    }

    private func hideMeaningPopup() {
        guard let controller = meaningPopupController else { return }

        UIView.animate(withDuration: 0.2, animations: {
            controller.view.alpha = 0
            controller.view.transform = CGAffineTransform(scaleX: 0.9, y: 0.9)
        }) { _ in
            controller.willMove(toParent: nil)
            controller.view.removeFromSuperview()
            controller.removeFromParent()
        }

        meaningPopupController = nil
    }

    private func showMeaningForHighlight(text: String) {
        guard !text.isEmpty else { return }

        hideHighlightEditPopup()
        hideMeaningPopup()

        let meaningView = MeaningPopupView(
            selectedText: text,
            onDismiss: { [weak self] in
                self?.hideMeaningPopup()
            }
        )

        let hostingController = UIHostingController(rootView: AnyView(meaningView))
        hostingController.view.backgroundColor = .clear

        // Center the popup
        let popupSize = CGSize(width: 340, height: 400)
        let popupX = (view.bounds.width - popupSize.width) / 2
        let popupY = (view.bounds.height - popupSize.height) / 2

        hostingController.view.frame = CGRect(
            x: popupX,
            y: popupY,
            width: popupSize.width,
            height: popupSize.height
        )

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)

        // Animate in
        hostingController.view.alpha = 0
        hostingController.view.transform = CGAffineTransform(scaleX: 0.9, y: 0.9)
        UIView.animate(withDuration: 0.25) {
            hostingController.view.alpha = 1
            hostingController.view.transform = .identity
        }

        meaningPopupController = hostingController
    }

    private func createHighlight(color: HighlightColor) {
        guard let selection = currentSelection else { return }

        let selectedText = selection.locator.text.highlight ?? ""
        let epubSelection = EPUBSelection(
            locator: selection.locator,
            text: selectedText,
            frame: selection.frame ?? .zero
        )

        // Create decoration for visual display
        let decorationId = UUID().uuidString
        let decoration = Decoration(
            id: decorationId,
            locator: selection.locator,
            style: .highlight(tint: color.uiColor, isActive: false)
        )

        highlightDecorations.append(decoration)
        applyHighlightDecorations()

        // Notify parent to save highlight
        onHighlightCreated?(epubSelection, color)

        hideSelectionPopup()
        navigator?.clearSelection()
    }

    private func copySelection() {
        guard let selection = currentSelection,
              let text = selection.locator.text.highlight else { return }

        UIPasteboard.general.string = text
        hideSelectionPopup()
        navigator?.clearSelection()
    }

    private func shareSelection() {
        guard let selection = currentSelection,
              let text = selection.locator.text.highlight else { return }

        let activityController = UIActivityViewController(
            activityItems: [text],
            applicationActivities: nil
        )

        if let popover = activityController.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = selection.frame ?? CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
        }

        present(activityController, animated: true)
        hideSelectionPopup()
    }

    // MARK: - Highlight Edit Popup

    private func showHighlightEditPopup(for decoration: Decoration, at point: CGPoint?) {
        hideHighlightEditPopup()
        hideSelectionPopup()

        currentHighlightId = decoration.id
        currentHighlightLocator = decoration.locator

        let text = decoration.locator.text.highlight ?? ""

        let popupView = HighlightEditPopupView(
            highlightText: text,
            onChangeColor: { [weak self] color in
                self?.changeHighlightColor(color)
            },
            onDelete: { [weak self] in
                self?.deleteCurrentHighlight()
            },
            onAddNote: { [weak self] in
                self?.showNoteInput()
            },
            onMeaning: { [weak self] in
                self?.showMeaningForHighlight(text: text)
            },
            onShare: { [weak self] in
                self?.shareHighlight()
            },
            onDismiss: { [weak self] in
                self?.hideHighlightEditPopup()
            }
        )

        let hostingController = UIHostingController(rootView: popupView)
        hostingController.view.backgroundColor = .clear

        // Calculate popup position
        let popupSize = CGSize(width: 300, height: 120)
        var popupY: CGFloat
        var popupX: CGFloat

        if let point = point {
            popupY = point.y - popupSize.height - 16
            if popupY < view.safeAreaInsets.top + 60 {
                popupY = point.y + 16
            }
            popupX = max(16, min(point.x - popupSize.width / 2, view.bounds.width - popupSize.width - 16))
        } else {
            popupY = view.bounds.midY - popupSize.height / 2
            popupX = view.bounds.midX - popupSize.width / 2
        }

        hostingController.view.frame = CGRect(
            x: popupX,
            y: popupY,
            width: popupSize.width,
            height: popupSize.height
        )

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)

        // Animate in
        hostingController.view.alpha = 0
        hostingController.view.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
        UIView.animate(withDuration: 0.2) {
            hostingController.view.alpha = 1
            hostingController.view.transform = .identity
        }

        highlightEditPopupController = hostingController
    }

    private func hideHighlightEditPopup() {
        guard let controller = highlightEditPopupController else { return }

        UIView.animate(withDuration: 0.15, animations: {
            controller.view.alpha = 0
            controller.view.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
        }) { _ in
            controller.willMove(toParent: nil)
            controller.view.removeFromSuperview()
            controller.removeFromParent()
        }

        highlightEditPopupController = nil
        currentHighlightId = nil
        currentHighlightLocator = nil
    }

    private func changeHighlightColor(_ color: HighlightColor) {
        guard let highlightId = currentHighlightId else { return }

        // Update local decoration
        if let index = highlightDecorations.firstIndex(where: { $0.id == highlightId }),
           let locator = currentHighlightLocator {
            highlightDecorations[index] = Decoration(
                id: highlightId,
                locator: locator,
                style: .highlight(tint: color.uiColor, isActive: false)
            )
            applyHighlightDecorations()
        }

        // Notify parent to update in API
        onHighlightColorChanged?(highlightId, color)
        hideHighlightEditPopup()
    }

    private func deleteCurrentHighlight() {
        guard let highlightId = currentHighlightId else { return }

        // Remove local decoration
        highlightDecorations.removeAll { $0.id == highlightId }
        applyHighlightDecorations()

        // Notify parent to delete from API
        onHighlightDeleted?(highlightId)
        hideHighlightEditPopup()
    }

    private func showNoteInput() {
        guard let highlightId = currentHighlightId else { return }

        let alertController = UIAlertController(
            title: "添加笔记",
            message: nil,
            preferredStyle: .alert
        )

        alertController.addTextField { textField in
            textField.placeholder = "输入笔记内容..."
        }

        alertController.addAction(UIAlertAction(title: "取消", style: .cancel))
        alertController.addAction(UIAlertAction(title: "保存", style: .default) { [weak self] _ in
            if let note = alertController.textFields?.first?.text, !note.isEmpty {
                self?.onHighlightNoteAdded?(highlightId, note)
            }
        })

        present(alertController, animated: true)
        hideHighlightEditPopup()
    }

    private func shareHighlight() {
        guard let locator = currentHighlightLocator,
              let text = locator.text.highlight else { return }

        let activityController = UIActivityViewController(
            activityItems: [text],
            applicationActivities: nil
        )

        if let popover = activityController.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
        }

        present(activityController, animated: true)
        hideHighlightEditPopup()
    }

    // MARK: - Highlight Decorations

    /// Storage for highlight metadata (idea counts, etc.)
    private var highlightMetadata: [String: HighlightMetadata] = [:]

    /// Metadata for a highlight including idea count
    struct HighlightMetadata {
        let id: String
        let ideaCount: Int
        let text: String
        let color: HighlightColor
    }

    func addHighlightDecoration(id: String, locator: Locator, color: HighlightColor) {
        let decoration = Decoration(
            id: id,
            locator: locator,
            style: .highlight(tint: color.uiColor, isActive: false)
        )
        highlightDecorations.append(decoration)
        applyHighlightDecorations()
    }

    func removeHighlightDecoration(id: String) {
        highlightDecorations.removeAll { $0.id == id }
        highlightMetadata.removeValue(forKey: id)
        applyHighlightDecorations()
    }

    func setHighlightDecorations(_ decorations: [Decoration]) {
        highlightDecorations = decorations
        applyHighlightDecorations()
    }

    /// Set highlight decorations with metadata (including idea counts)
    func setHighlightsWithMetadata(_ highlights: [(decoration: Decoration, metadata: HighlightMetadata)]) {
        highlightDecorations = highlights.map { $0.decoration }
        highlightMetadata = Dictionary(uniqueKeysWithValues: highlights.map { ($0.metadata.id, $0.metadata) })
        applyHighlightDecorations()
    }

    /// Get metadata for a highlight by ID
    func getHighlightMetadata(id: String) -> HighlightMetadata? {
        highlightMetadata[id]
    }

    /// Get all highlights with idea counts > 0
    func getHighlightsWithIdeas() -> [HighlightMetadata] {
        highlightMetadata.values.filter { $0.ideaCount > 0 }
    }

    private func applyHighlightDecorations() {
        navigator?.apply(decorations: highlightDecorations, in: highlightGroup)
    }

    func clearSelection() {
        hideSelectionPopup()
        navigator?.clearSelection()
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
        // Dismiss any popups first
        if selectionPopupController != nil {
            hideSelectionPopup()
            self.navigator?.clearSelection()
        }

        if highlightEditPopupController != nil {
            hideHighlightEditPopup()
        }

        if meaningPopupController != nil {
            hideMeaningPopup()
        }

        // Always toggle toolbar on tap
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
        // We use our custom popup, so disable default menu actions
        return false
    }

    func navigator(_ navigator: any SelectableNavigator, shouldShowMenuForSelection selection: Selection) -> Bool {
        // Show our custom popup instead of the default menu
        showSelectionPopup(for: selection)
        return false
    }
}

// MARK: - Selection Popup View

struct SelectionPopupView: View {
    let onHighlight: (HighlightColor) -> Void
    let onMeaning: () -> Void
    let onCopy: () -> Void
    let onShare: () -> Void
    let onDismiss: () -> Void

    @State private var showColorPicker = false

    var body: some View {
        HStack(spacing: 0) {
            if showColorPicker {
                // Color picker row
                HStack(spacing: 12) {
                    ForEach(HighlightColor.allCases, id: \.self) { color in
                        Button {
                            onHighlight(color)
                        } label: {
                            Circle()
                                .fill(color.color)
                                .frame(width: 28, height: 28)
                                .overlay(
                                    Circle()
                                        .stroke(Color.white.opacity(0.5), lineWidth: 2)
                                )
                        }
                    }

                    Divider()
                        .frame(height: 24)

                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            showColorPicker = false
                        }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                    }
                }
                .padding(.horizontal, 12)
            } else {
                // Main actions row
                HStack(spacing: 0) {
                    popupButton(icon: "highlighter", label: L10n.Notes.underlines) {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            showColorPicker = true
                        }
                    }

                    Divider()
                        .frame(height: 24)

                    popupButton(icon: "sparkles", label: L10n.AI.meaning) {
                        onMeaning()
                    }

                    Divider()
                        .frame(height: 24)

                    popupButton(icon: "doc.on.doc", label: L10n.AI.copy) {
                        onCopy()
                    }

                    Divider()
                        .frame(height: 24)

                    popupButton(icon: "square.and.arrow.up", label: L10n.Common.share) {
                        onShare()
                    }
                }
            }
        }
        .frame(height: 44)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.black.opacity(0.85))
        )
        .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
    }

    private func popupButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                Text(label)
                    .font(.system(size: 10))
            }
            .foregroundColor(.white)
            .frame(width: 56, height: 44)
        }
    }
}

// MARK: - Highlight Edit Popup View

struct HighlightEditPopupView: View {
    let highlightText: String
    let onChangeColor: (HighlightColor) -> Void
    let onDelete: () -> Void
    let onAddNote: () -> Void
    let onMeaning: () -> Void
    let onShare: () -> Void
    let onDismiss: () -> Void

    @State private var showColorPicker = false

    var body: some View {
        VStack(spacing: 8) {
            // Preview of highlighted text (truncated)
            if !highlightText.isEmpty {
                Text(highlightText)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.top, 8)
            }

            if showColorPicker {
                // Color picker row
                HStack(spacing: 12) {
                    ForEach(HighlightColor.allCases, id: \.self) { color in
                        Button {
                            onChangeColor(color)
                        } label: {
                            Circle()
                                .fill(color.color)
                                .frame(width: 28, height: 28)
                                .overlay(
                                    Circle()
                                        .stroke(Color.white.opacity(0.5), lineWidth: 2)
                                )
                        }
                    }

                    Spacer()

                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            showColorPicker = false
                        }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
            } else {
                // Main action buttons
                HStack(spacing: 0) {
                    editButton(icon: "paintpalette", label: L10n.Reader.changeColor) {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            showColorPicker = true
                        }
                    }

                    Divider()
                        .frame(height: 24)
                        .background(Color.white.opacity(0.3))

                    editButton(icon: "sparkles", label: L10n.AI.meaning) {
                        onMeaning()
                    }

                    Divider()
                        .frame(height: 24)
                        .background(Color.white.opacity(0.3))

                    editButton(icon: "note.text", label: L10n.Reader.note) {
                        onAddNote()
                    }

                    Divider()
                        .frame(height: 24)
                        .background(Color.white.opacity(0.3))

                    editButton(icon: "trash", label: L10n.Common.delete) {
                        onDelete()
                    }
                }
                .padding(.bottom, 8)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.black.opacity(0.9))
        )
        .shadow(color: .black.opacity(0.4), radius: 12, x: 0, y: 4)
    }

    private func editButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                Text(label)
                    .font(.system(size: 10))
            }
            .foregroundColor(.white)
            .frame(width: 52, height: 44)
        }
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
    let highlightDecorations: [HighlightDecoration]  // Highlights to display
    let onTap: () -> Void
    let onLocationChanged: (Locator) -> Void
    var onHighlightCreated: ((EPUBSelection, HighlightColor) -> Void)?
    var onHighlightTapped: ((String, Int) -> Void)?  // (highlightId, ideaCount)

    func makeUIViewController(context: Context) -> EPUBNavigatorContainerViewController {
        let controller = EPUBNavigatorContainerViewController(
            publication: publication,
            initialLocator: initialLocator,
            settings: settings,
            httpServer: httpServer
        )
        controller.onTap = onTap
        controller.onLocationChanged = onLocationChanged
        controller.onHighlightCreated = onHighlightCreated
        context.coordinator.controller = controller

        // Apply initial highlights
        applyHighlights(to: controller)

        return controller
    }

    func updateUIViewController(_ uiViewController: EPUBNavigatorContainerViewController, context: Context) {
        uiViewController.settings = settings
        uiViewController.onHighlightCreated = onHighlightCreated

        // Handle navigation to target locator (e.g., from search)
        if let locator = targetLocator {
            uiViewController.goToLocator(locator)
        }

        // Update highlights when they change
        applyHighlights(to: uiViewController)
    }

    private func applyHighlights(to controller: EPUBNavigatorContainerViewController) {
        let highlightsWithMetadata = highlightDecorations.map { highlight -> (decoration: Decoration, metadata: EPUBNavigatorContainerViewController.HighlightMetadata) in
            let decoration = highlight.toDecoration()
            let metadata = EPUBNavigatorContainerViewController.HighlightMetadata(
                id: highlight.id,
                ideaCount: highlight.ideaCount,
                text: highlight.text,
                color: highlight.color
            )
            return (decoration, metadata)
        }
        controller.setHighlightsWithMetadata(highlightsWithMetadata)
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

        func addHighlightDecoration(id: String, locator: Locator, color: HighlightColor) {
            controller?.addHighlightDecoration(id: id, locator: locator, color: color)
        }

        func removeHighlightDecoration(id: String) {
            controller?.removeHighlightDecoration(id: id)
        }

        func getHighlightsWithIdeas() -> [EPUBNavigatorContainerViewController.HighlightMetadata] {
            controller?.getHighlightsWithIdeas() ?? []
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
