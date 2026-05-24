import React
import SwiftUI
import UIKit

private let calendarMonthButtonBlurReplaceAnimation = Animation.easeInOut(duration: 0.22)

final class CalendarMonthButtonHostingView: UIView {
  @objc var label: NSString = "" {
    didSet { updateContent() }
  }

  @objc var tintColorValue: NSString = "#111111" {
    didSet { updateContent() }
  }

  @objc var onPress: RCTBubblingEventBlock?

  private var hostingController: UIHostingController<AnyView>?
  private var renderedLabel = ""

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
    let content = CalendarMonthButtonRootView(
      label: String(label),
      tintColor: UIColor(hexString: String(tintColorValue)) ?? .label,
      onPress: { [weak self] in self?.onPress?([:]) }
    )

    let nextLabel = String(label)

    if let hostingController {
      if renderedLabel != nextLabel {
        withAnimation(calendarMonthButtonBlurReplaceAnimation) {
          hostingController.rootView = AnyView(content)
        }
      } else {
        hostingController.rootView = AnyView(content)
      }
      renderedLabel = nextLabel
      return
    }

    let controller = UIHostingController(rootView: AnyView(content))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    renderedLabel = nextLabel
    addSubview(controller.view)
  }
}

@objc(CalendarMonthButtonViewManager)
final class CalendarMonthButtonViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    CalendarMonthButtonHostingView()
  }
}

private struct CalendarMonthButtonRootView: View {
  let label: String
  let tintColor: UIColor
  let onPress: () -> Void

  var body: some View {
    if #available(iOS 26.0, *) {
      nativeButton
    } else {
      fallbackButton
    }
  }

  @available(iOS 26.0, *)
  private var nativeButton: some View {
    Button(action: onPress) {
      buttonLabel
    }
    .buttonStyle(.glass)
    .buttonBorderShape(.capsule)
    .controlSize(.regular)
    .tint(Color(uiColor: tintColor))
    .accessibilityLabel("Change month and year, \(label)")
  }

  private var fallbackButton: some View {
    Button(action: onPress) {
      buttonLabel
    }
    .buttonStyle(.bordered)
    .controlSize(.regular)
    .tint(Color(uiColor: tintColor))
    .accessibilityLabel("Change month and year, \(label)")
  }

  private var buttonLabel: some View {
    HStack(spacing: 7) {
      Text(label)
        .font(.system(size: 17, weight: .semibold))
        .lineLimit(1)
        .minimumScaleFactor(0.78)
        .calendarMonthButtonBlurReplace(id: label)
      Image(systemName: "chevron.right")
        .font(.system(size: 17, weight: .semibold))
    }
    .frame(maxWidth: .infinity, minHeight: 38)
    .padding(.horizontal, 14)
    .contentShape(Capsule())
  }
}

private extension View {
  @ViewBuilder
  func calendarMonthButtonBlurReplace<ID: Hashable>(id: ID) -> some View {
    if #available(iOS 17.0, *) {
      self
        .id(id)
        .transition(.blurReplace)
        .animation(calendarMonthButtonBlurReplaceAnimation, value: id)
    } else {
      self
        .id(id)
        .transition(.opacity.combined(with: .scale(scale: 0.98)))
        .animation(calendarMonthButtonBlurReplaceAnimation, value: id)
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
