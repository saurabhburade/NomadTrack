import React
import SwiftUI
import UIKit

private let dashboardToolbarBlurReplaceAnimation = Animation.easeInOut(duration: 0.22)
private let dashboardToolbarIconButtonFrame: CGFloat = 38
private let dashboardToolbarIconButtonHitFrame: CGFloat = 44

private struct DashboardToolbarAction: Identifiable {
  let id: Int
  let title: String
  let systemImage: String?
}

final class NativeGlassButtonHostingView: UIView {
  @objc var title: NSString = "" {
    didSet { updateContent() }
  }

  @objc var systemImage: NSString = "" {
    didSet { updateContent() }
  }

  @objc var tintColorValue: NSString = "#111111" {
    didSet { updateContent() }
  }

  @objc var shape: NSString = "capsule" {
    didSet { updateContent() }
  }

  @objc var fontSize: NSNumber = 17 {
    didSet { updateContent() }
  }

  @objc var fontWeight: NSString = "semibold" {
    didSet { updateContent() }
  }

  @objc var disabled: Bool = false {
    didSet { updateContent() }
  }

  @objc var onPress: RCTBubblingEventBlock?

  private var hostingController: UIHostingController<AnyView>?
  private var renderedTitle = ""

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    updateContent()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    backgroundColor = .clear
    updateContent()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }

  private func updateContent() {
    let nextTitle = String(title)
    let tint = UIColor(hexString: String(tintColorValue)) ?? .label
    let content = NativeGlassButtonRootView(
      title: nextTitle,
      systemImage: String(systemImage),
      tintColor: tint,
      shape: String(shape),
      fontSize: CGFloat(truncating: fontSize),
      fontWeight: String(fontWeight),
      disabled: disabled,
      onPress: { [weak self] in self?.onPress?([:]) }
    )

    if let hostingController {
      if renderedTitle != nextTitle {
        withAnimation(dashboardToolbarBlurReplaceAnimation) {
          hostingController.rootView = AnyView(content)
        }
      } else {
        hostingController.rootView = AnyView(content)
      }
      renderedTitle = nextTitle
      return
    }

    let controller = UIHostingController(rootView: AnyView(content))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    renderedTitle = nextTitle
    addSubview(controller.view)
  }
}

@objc(NativeGlassButtonViewManager)
final class NativeGlassButtonViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    NativeGlassButtonHostingView()
  }
}

final class DashboardToolbarHostingView: UIView {
  @objc var fiscalYearLabel: NSString = "" {
    didSet { updateContent() }
  }

  @objc var tintColorValue: NSString = "#111111" {
    didSet { updateContent() }
  }

  @objc var menuActionTitles: NSArray = [] {
    didSet { updateContent() }
  }

  @objc var menuActionSystemImages: NSArray = [] {
    didSet { updateContent() }
  }

  @objc var trailingActionSystemImage: NSString? {
    didSet { updateContent() }
  }

  @objc var trailingActionAccessibilityLabel: NSString = "Settings" {
    didSet { updateContent() }
  }

  @objc var onYearPress: RCTBubblingEventBlock?
  @objc var onMenuAction: RCTBubblingEventBlock?
  @objc var onTrailingActionPress: RCTBubblingEventBlock?

  private var hostingController: UIHostingController<AnyView>?
  private var renderedFiscalYearLabel = ""

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    updateContent()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    backgroundColor = .clear
    updateContent()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }

  private func updateContent() {
    let label = String(fiscalYearLabel)
    let tint = UIColor(hexString: String(tintColorValue)) ?? .label
    let actions = makeActions()

    let content = DashboardToolbarRootView(
      fiscalYearLabel: label,
      tintColor: tint,
      actions: actions,
      trailingActionSystemImage: makeTrailingActionSystemImage(),
      trailingActionAccessibilityLabel: String(trailingActionAccessibilityLabel),
      onYearPress: { [weak self] in self?.onYearPress?([:]) },
      onMenuAction: { [weak self] index in self?.onMenuAction?(["index": index]) },
      onTrailingActionPress: { [weak self] in self?.onTrailingActionPress?([:]) }
    )

    if let hostingController {
      if renderedFiscalYearLabel != label {
        withAnimation(dashboardToolbarBlurReplaceAnimation) {
          hostingController.rootView = AnyView(content)
        }
      } else {
        hostingController.rootView = AnyView(content)
      }
      renderedFiscalYearLabel = label
      return
    }

    let controller = UIHostingController(rootView: AnyView(content))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    renderedFiscalYearLabel = label
    addSubview(controller.view)
  }

  private func makeActions() -> [DashboardToolbarAction] {
    let titles = menuActionTitles.compactMap { $0 as? String }
    let images = menuActionSystemImages.map { $0 as? String }

    return titles.enumerated().map { index, title in
      let image = index < images.count ? images[index] : nil
      return DashboardToolbarAction(id: index, title: title, systemImage: image)
    }
  }

  private func makeTrailingActionSystemImage() -> String? {
    guard let value = trailingActionSystemImage else {
      return nil
    }

    let trimmed = String(value).trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }
}

@objc(DashboardToolbarViewManager)
final class DashboardToolbarViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    DashboardToolbarHostingView()
  }
}

private struct NativeGlassButtonRootView: View {
  let title: String
  let systemImage: String
  let tintColor: UIColor
  let shape: String
  let fontSize: CGFloat
  let fontWeight: String
  let disabled: Bool
  let onPress: () -> Void

  private var tint: Color { Color(uiColor: tintColor) }

  var body: some View {
    Button(action: onPress) {
      label
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .contentShape(Rectangle())
    }
    .nativeGlassButtonStyle(shape: shape, tint: tint)
    .tint(tint)
    .disabled(disabled)
  }

  @ViewBuilder
  private var label: some View {
    if !systemImage.isEmpty {
      Image(systemName: systemImage)
        .font(.system(size: fontSize, weight: resolvedWeight))
        .foregroundStyle(tint)
    } else {
      Text(title)
        .font(.system(size: fontSize, weight: resolvedWeight))
        .foregroundStyle(tint)
        .lineLimit(1)
        .minimumScaleFactor(0.78)
        .dashboardToolbarBlurReplace(id: title)
        .padding(.horizontal, 2)
        .fixedSize(horizontal: true, vertical: false)
    }
  }

  private var resolvedWeight: Font.Weight {
    switch fontWeight {
    case "bold":
      return .bold
    case "heavy":
      return .heavy
    case "medium":
      return .medium
    case "regular":
      return .regular
    default:
      return .semibold
    }
  }
}

private struct DashboardToolbarRootView: View {
  let fiscalYearLabel: String
  let tintColor: UIColor
  let actions: [DashboardToolbarAction]
  let trailingActionSystemImage: String?
  let trailingActionAccessibilityLabel: String
  let onYearPress: () -> Void
  let onMenuAction: (Int) -> Void
  let onTrailingActionPress: () -> Void

  var body: some View {
    if #available(iOS 26.0, *) {
      DashboardToolbarNativeContent(
        fiscalYearLabel: fiscalYearLabel,
        tintColor: tintColor,
        actions: actions,
        trailingActionSystemImage: trailingActionSystemImage,
        trailingActionAccessibilityLabel: trailingActionAccessibilityLabel,
        onYearPress: onYearPress,
        onMenuAction: onMenuAction,
        onTrailingActionPress: onTrailingActionPress
      )
    } else {
      DashboardToolbarFallbackContent(
        fiscalYearLabel: fiscalYearLabel,
        tintColor: tintColor,
        actions: actions,
        trailingActionSystemImage: trailingActionSystemImage,
        trailingActionAccessibilityLabel: trailingActionAccessibilityLabel,
        onYearPress: onYearPress,
        onMenuAction: onMenuAction,
        onTrailingActionPress: onTrailingActionPress
      )
    }
  }
}

@available(iOS 26.0, *)
private struct DashboardToolbarNativeContent: View {
  let fiscalYearLabel: String
  let tintColor: UIColor
  let actions: [DashboardToolbarAction]
  let trailingActionSystemImage: String?
  let trailingActionAccessibilityLabel: String
  let onYearPress: () -> Void
  let onMenuAction: (Int) -> Void
  let onTrailingActionPress: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      Button(action: onYearPress) {
        DashboardToolbarYearLabel(fiscalYearLabel: fiscalYearLabel)
      }
      .buttonStyle(.glass)
      .buttonBorderShape(.capsule)
      .controlSize(.regular)
      .accessibilityLabel("Change residency year, \(fiscalYearLabel)")

      trailingAction
    }
    .frame(maxWidth: .infinity, alignment: .trailing)
    .tint(Color(uiColor: tintColor))
  }

  @ViewBuilder
  private var trailingAction: some View {
    if let trailingActionSystemImage {
      Button(action: onTrailingActionPress) {
        Image(systemName: trailingActionSystemImage)
          .font(.system(size: 15, weight: .semibold))
          .frame(width: dashboardToolbarIconButtonFrame, height: dashboardToolbarIconButtonFrame)
      }
      .buttonStyle(.glass)
      .buttonBorderShape(.circle)
      .controlSize(.small)
      .frame(width: dashboardToolbarIconButtonHitFrame, height: dashboardToolbarIconButtonHitFrame)
      .contentShape(Rectangle())
      .accessibilityLabel(trailingActionAccessibilityLabel)
    } else {
      DashboardToolbarLiquidGlassMenu(
        actions: actions,
        onMenuAction: onMenuAction
      )
    }
  }
}

@available(iOS 26.0, *)
private struct DashboardToolbarYearLabel: View {
  let fiscalYearLabel: String

  var body: some View {
    Text(fiscalYearLabel)
      .font(.system(size: 15, weight: .semibold))
      .lineLimit(1)
      .minimumScaleFactor(0.78)
      .dashboardToolbarBlurReplace(id: fiscalYearLabel)
      .frame(minWidth: 96, minHeight: 36)
      .padding(.horizontal, 2)
      .fixedSize(horizontal: true, vertical: false)
  }
}

@available(iOS 26.0, *)
private struct DashboardToolbarLiquidGlassMenu: View {
  let actions: [DashboardToolbarAction]
  let onMenuAction: (Int) -> Void

  var body: some View {
    Menu {
      DashboardToolbarMenuItems(actions: actions, onMenuAction: onMenuAction)
    } label: {
      Image(systemName: "ellipsis")
        .font(.system(size: 15, weight: .semibold))
        .frame(width: dashboardToolbarIconButtonFrame, height: dashboardToolbarIconButtonFrame)
    }
    .buttonStyle(.glass)
    .buttonBorderShape(.circle)
    .controlSize(.small)
    .frame(width: dashboardToolbarIconButtonHitFrame, height: dashboardToolbarIconButtonHitFrame)
    .contentShape(Rectangle())
    .accessibilityLabel("Settings")
  }
}

private struct DashboardToolbarFallbackContent: View {
  let fiscalYearLabel: String
  let tintColor: UIColor
  let actions: [DashboardToolbarAction]
  let trailingActionSystemImage: String?
  let trailingActionAccessibilityLabel: String
  let onYearPress: () -> Void
  let onMenuAction: (Int) -> Void
  let onTrailingActionPress: () -> Void

  var body: some View {
    HStack(spacing: 8) {
      Button(action: onYearPress) {
        Text(fiscalYearLabel)
          .font(.system(size: 17, weight: .semibold))
          .lineLimit(1)
          .dashboardToolbarBlurReplace(id: fiscalYearLabel)
      }
      .buttonStyle(.bordered)
      .controlSize(.large)

      trailingAction
    }
    .tint(Color(uiColor: tintColor))
  }

  @ViewBuilder
  private var trailingAction: some View {
    if let trailingActionSystemImage {
      if #available(iOS 17.0, *) {
        Button(action: onTrailingActionPress) {
          Image(systemName: trailingActionSystemImage)
            .frame(width: dashboardToolbarIconButtonFrame, height: dashboardToolbarIconButtonFrame)
        }
        .buttonStyle(.bordered)
        .buttonBorderShape(.circle)
        .controlSize(.large)
        .accessibilityLabel(trailingActionAccessibilityLabel)
      } else {
        Button(action: onTrailingActionPress) {
          Image(systemName: trailingActionSystemImage)
            .frame(width: dashboardToolbarIconButtonFrame, height: dashboardToolbarIconButtonFrame)
        }
        .buttonStyle(.bordered)
        .controlSize(.large)
        .accessibilityLabel(trailingActionAccessibilityLabel)
      }
    } else {
      fallbackMenu
    }
  }

  @ViewBuilder
  private var fallbackMenu: some View {
    if #available(iOS 17.0, *) {
      DashboardToolbarFallbackMenu(actions: actions, onMenuAction: onMenuAction)
        .menuStyle(.button)
        .buttonStyle(.bordered)
        .buttonBorderShape(.circle)
        .controlSize(.large)
        .accessibilityLabel("Settings")
    } else if #available(iOS 16.0, *) {
      DashboardToolbarFallbackMenu(actions: actions, onMenuAction: onMenuAction)
        .menuStyle(.button)
        .buttonStyle(.bordered)
        .controlSize(.large)
        .accessibilityLabel("Settings")
    } else {
      DashboardToolbarFallbackMenu(actions: actions, onMenuAction: onMenuAction)
        .buttonStyle(.bordered)
        .controlSize(.large)
        .accessibilityLabel("Settings")
    }
  }
}

private struct DashboardToolbarFallbackMenu: View {
  let actions: [DashboardToolbarAction]
  let onMenuAction: (Int) -> Void

  var body: some View {
    Menu {
      DashboardToolbarMenuItems(actions: actions, onMenuAction: onMenuAction)
    } label: {
      Label("Settings", systemImage: "ellipsis")
        .labelStyle(.iconOnly)
        .frame(width: dashboardToolbarIconButtonFrame, height: dashboardToolbarIconButtonFrame)
    }
  }
}

private extension View {
  @ViewBuilder
  func nativeGlassButtonStyle(shape: String, tint: Color) -> some View {
    if #available(iOS 26.0, *) {
      switch shape {
      case "circle":
        self
          .buttonStyle(.glass)
          .buttonBorderShape(.circle)
          .controlSize(.regular)
      case "roundedRectangle":
        self
          .buttonStyle(.glass)
          .buttonBorderShape(.roundedRectangle(radius: 18))
          .controlSize(.regular)
      default:
        self
          .buttonStyle(.glass)
          .buttonBorderShape(.capsule)
          .controlSize(.regular)
      }
    } else {
      self
        .buttonStyle(.bordered)
        .controlSize(.regular)
        .foregroundStyle(tint)
    }
  }

  @ViewBuilder
  func dashboardToolbarBlurReplace<ID: Hashable>(id: ID) -> some View {
    if #available(iOS 17.0, *) {
      self
        .id(id)
        .transition(.blurReplace)
        .animation(dashboardToolbarBlurReplaceAnimation, value: id)
    } else {
      self
        .id(id)
        .transition(.opacity.combined(with: .scale(scale: 0.98)))
        .animation(dashboardToolbarBlurReplaceAnimation, value: id)
    }
  }
}

private struct DashboardToolbarMenuItems: View {
  let actions: [DashboardToolbarAction]
  let onMenuAction: (Int) -> Void

  var body: some View {
    ForEach(actions) { action in
      Button {
        onMenuAction(action.id)
      } label: {
        if let systemImage = action.systemImage {
          Label(action.title, systemImage: systemImage)
        } else {
          Text(action.title)
        }
      }
    }
  }
}

private extension UIColor {
  convenience init?(hexString: String) {
    var raw = hexString.trimmingCharacters(in: .whitespacesAndNewlines)
    if raw.hasPrefix("#") {
      raw.removeFirst()
    }

    guard raw.count == 6, let value = Int(raw, radix: 16) else {
      return nil
    }

    self.init(
      red: CGFloat((value >> 16) & 0xff) / 255,
      green: CGFloat((value >> 8) & 0xff) / 255,
      blue: CGFloat(value & 0xff) / 255,
      alpha: 1
    )
  }
}
