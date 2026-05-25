import React
import SwiftUI
import UIKit

private let calendarToolbarBlurReplaceAnimation = Animation.easeInOut(duration: 0.28)
private let calendarToolbarIconButtonFrame: CGFloat = 38

final class CalendarToolbarHostingView: UIView {
  @objc var monthLabel: NSString = "" {
    didSet { updateContent() }
  }

  @objc var foregroundColorValue: NSString = "#ffffff" {
    didSet { updateContent() }
  }

  @objc var onManualEntry: RCTBubblingEventBlock?
  @objc var onMonthPress: RCTBubblingEventBlock?
  @objc var onPreviousMonth: RCTBubblingEventBlock?
  @objc var onNextMonth: RCTBubblingEventBlock?

  private var hostingController: UIHostingController<AnyView>?
  private var renderedMonthLabel = ""

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
    let label = String(monthLabel)
    let foreground = UIColor(calendarToolbarColorString: String(foregroundColorValue)) ?? .label
    let content = CalendarToolbarRootView(
      monthLabel: label,
      foregroundColor: foreground,
      onManualEntry: { [weak self] in self?.onManualEntry?([:]) },
      onMonthPress: { [weak self] in self?.onMonthPress?([:]) },
      onPreviousMonth: { [weak self] in self?.onPreviousMonth?([:]) },
      onNextMonth: { [weak self] in self?.onNextMonth?([:]) }
    )

    if let hostingController {
      if renderedMonthLabel != label {
        withAnimation(calendarToolbarBlurReplaceAnimation) {
          hostingController.rootView = AnyView(content)
        }
      } else {
        hostingController.rootView = AnyView(content)
      }
      renderedMonthLabel = label
      return
    }

    let controller = UIHostingController(rootView: AnyView(content))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    renderedMonthLabel = label
    addSubview(controller.view)
  }
}

@objc(CalendarToolbarViewManager)
final class CalendarToolbarViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    CalendarToolbarHostingView()
  }
}

private struct CalendarToolbarRootView: View {
  let monthLabel: String
  let foregroundColor: UIColor
  let onManualEntry: () -> Void
  let onMonthPress: () -> Void
  let onPreviousMonth: () -> Void
  let onNextMonth: () -> Void

  private var foreground: Color { Color(uiColor: foregroundColor) }

  var body: some View {
    VStack(spacing: 20) {
      HStack(alignment: .center) {
        Text("History")
          .font(.system(size: 30, weight: .heavy))
          .foregroundStyle(foreground)
          .lineLimit(1)

        Spacer(minLength: 12)

        Menu {
          Button(action: onManualEntry) {
            Label("Manual Entry", systemImage: "pencil.line")
          }
        } label: {
          Image(systemName: "plus")
            .font(.system(size: 21, weight: .semibold))
            .frame(width: calendarToolbarIconButtonFrame, height: calendarToolbarIconButtonFrame)
        }
        .calendarToolbarCircleButtonStyle(foreground: foreground)
        .accessibilityLabel("Add travel entry")
      }

      HStack(alignment: .center, spacing: 12) {
        Button(action: onPreviousMonth) {
          Image(systemName: "chevron.left")
            .font(.system(size: 20, weight: .semibold))
            .frame(width: calendarToolbarIconButtonFrame, height: calendarToolbarIconButtonFrame)
        }
        .calendarToolbarCircleButtonStyle(foreground: foreground)
        .accessibilityLabel("Previous month")

        Spacer(minLength: 0)

        Button(action: onMonthPress) {
          HStack(spacing: 0) {
            Text(monthLabel)
              .font(.system(size: 17, weight: .bold))
              .lineLimit(1)
              .minimumScaleFactor(0.74)
              .calendarToolbarBlurReplace(id: monthLabel)
          }
          .padding(.horizontal, 20)
          .frame(height: calendarToolbarIconButtonFrame, alignment: .center)
        }
        .calendarToolbarCapsuleButtonStyle(foreground: foreground)
        .accessibilityLabel("Change month and year, \(monthLabel)")

        Spacer(minLength: 0)

        Button(action: onNextMonth) {
          Image(systemName: "chevron.right")
            .font(.system(size: 20, weight: .semibold))
            .frame(width: calendarToolbarIconButtonFrame, height: calendarToolbarIconButtonFrame)
        }
        .calendarToolbarCircleButtonStyle(foreground: foreground)
        .accessibilityLabel("Next month")
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .padding(.top, 4)
    .tint(foreground)
  }
}

private extension View {
  @ViewBuilder
  func calendarToolbarCircleButtonStyle(foreground: Color) -> some View {
    if #available(iOS 26.0, *) {
      self
        .buttonStyle(.glass)
        .buttonBorderShape(.circle)
        .controlSize(.small)
        .foregroundStyle(foreground)
    } else {
      self
        .buttonStyle(.bordered)
        .controlSize(.regular)
        .foregroundStyle(foreground)
    }
  }

  @ViewBuilder
  func calendarToolbarCapsuleButtonStyle(foreground: Color) -> some View {
    if #available(iOS 26.0, *) {
      self
        .buttonStyle(.glass)
        .buttonBorderShape(.capsule)
        .controlSize(.regular)
        .foregroundStyle(foreground)
    } else {
      self
        .buttonStyle(.bordered)
        .controlSize(.regular)
        .foregroundStyle(foreground)
    }
  }

  @ViewBuilder
  func calendarToolbarBlurReplace<ID: Hashable>(id: ID) -> some View {
    self
      .id(id)
      .transition(.calendarToolbarVisibleBlurReplace)
      .animation(calendarToolbarBlurReplaceAnimation, value: id)
  }
}

private struct CalendarToolbarBlurReplaceModifier: ViewModifier {
  let radius: CGFloat
  let opacity: Double
  let scale: CGFloat

  func body(content: Content) -> some View {
    content
      .blur(radius: radius)
      .opacity(opacity)
      .scaleEffect(scale)
  }
}

private extension AnyTransition {
  static var calendarToolbarVisibleBlurReplace: AnyTransition {
    .asymmetric(
      insertion: .modifier(
        active: CalendarToolbarBlurReplaceModifier(radius: 8, opacity: 0, scale: 0.96),
        identity: CalendarToolbarBlurReplaceModifier(radius: 0, opacity: 1, scale: 1)
      ),
      removal: .modifier(
        active: CalendarToolbarBlurReplaceModifier(radius: 8, opacity: 0, scale: 0.96),
        identity: CalendarToolbarBlurReplaceModifier(radius: 0, opacity: 1, scale: 1)
      )
    )
  }
}

private extension UIColor {
  convenience init?(calendarToolbarColorString string: String) {
    let raw = string.trimmingCharacters(in: .whitespacesAndNewlines)
    if raw.hasPrefix("#") {
      let hex = String(raw.dropFirst())
      let scanner = Scanner(string: hex)
      var value: UInt64 = 0
      guard scanner.scanHexInt64(&value) else { return nil }

      switch hex.count {
      case 6:
        self.init(
          red: CGFloat((value & 0xff0000) >> 16) / 255,
          green: CGFloat((value & 0x00ff00) >> 8) / 255,
          blue: CGFloat(value & 0x0000ff) / 255,
          alpha: 1
        )
      case 8:
        self.init(
          red: CGFloat((value & 0xff000000) >> 24) / 255,
          green: CGFloat((value & 0x00ff0000) >> 16) / 255,
          blue: CGFloat((value & 0x0000ff00) >> 8) / 255,
          alpha: CGFloat(value & 0x000000ff) / 255
        )
      default:
        return nil
      }
      return
    }

    return nil
  }
}
