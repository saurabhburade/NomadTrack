import React
import SwiftUI
import UIKit

private let residencyBlurReplaceAnimation = Animation.easeInOut(duration: 0.22)

private final class ResidencyYearSheetModel: ObservableObject {
  @Published var visible = false
  @Published var year = Calendar.current.component(.year, from: Date())
  @Published var calendarYearMode = false
  @Published var foreground = "#111111"
  @Published var muted = "#737373"
  @Published var card = "#ffffff"
  @Published var pill = "#f5f5f5"
  @Published var accent = "#111111"
  @Published var accentForeground = "#ffffff"
  @Published var border = "rgba(0,0,0,0.08)"
  @Published var menuGlassFill = "#ffffff"

  var onClose: RCTBubblingEventBlock?
  var onConfirm: RCTBubblingEventBlock?
}

final class ResidencyYearSheetHostingView: UIView {
  @objc var visible: Bool = false {
    didSet { updateModel() }
  }

  @objc var year: NSNumber = 0 {
    didSet { updateModel() }
  }

  @objc var calendarYearMode: Bool = false {
    didSet { updateModel() }
  }

  @objc var foregroundColorValue: NSString = "#111111" {
    didSet { updateModel() }
  }

  @objc var mutedColorValue: NSString = "#737373" {
    didSet { updateModel() }
  }

  @objc var cardColorValue: NSString = "#ffffff" {
    didSet { updateModel() }
  }

  @objc var pillColorValue: NSString = "#f5f5f5" {
    didSet { updateModel() }
  }

  @objc var accentColorValue: NSString = "#111111" {
    didSet { updateModel() }
  }

  @objc var accentForegroundColorValue: NSString = "#ffffff" {
    didSet { updateModel() }
  }

  @objc var borderColorValue: NSString = "rgba(0,0,0,0.08)" {
    didSet { updateModel() }
  }

  @objc var menuGlassFillColorValue: NSString = "#ffffff" {
    didSet { updateModel() }
  }

  @objc var onClose: RCTBubblingEventBlock? {
    didSet { model.onClose = onClose }
  }

  @objc var onConfirm: RCTBubblingEventBlock? {
    didSet { model.onConfirm = onConfirm }
  }

  private let model = ResidencyYearSheetModel()
  private var hostingController: UIHostingController<AnyView>?

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    updateModel()
    mountContent()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    backgroundColor = .clear
    updateModel()
    mountContent()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }

  private func mountContent() {
    guard hostingController == nil else { return }

    let controller = UIHostingController(rootView: AnyView(ResidencyYearSheetRootView(model: model)))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    addSubview(controller.view)
  }

  private func updateModel() {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.model.visible = self.visible
      self.model.year = self.year.intValue == 0 ? Calendar.current.component(.year, from: Date()) : self.year.intValue
      self.model.calendarYearMode = self.calendarYearMode
      self.model.foreground = String(self.foregroundColorValue)
      self.model.muted = String(self.mutedColorValue)
      self.model.card = String(self.cardColorValue)
      self.model.pill = String(self.pillColorValue)
      self.model.accent = String(self.accentColorValue)
      self.model.accentForeground = String(self.accentForegroundColorValue)
      self.model.border = String(self.borderColorValue)
      self.model.menuGlassFill = String(self.menuGlassFillColorValue)
    }
  }
}

@objc(ResidencyYearSheetViewManager)
final class ResidencyYearSheetViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    ResidencyYearSheetHostingView()
  }
}

private struct ResidencyYearSheetRootView: View {
  @ObservedObject var model: ResidencyYearSheetModel
  @State private var draftYear = Calendar.current.component(.year, from: Date())
  @State private var draftCalendarYearMode = false

  var body: some View {
    Color.clear
      .sheet(isPresented: Binding(
        get: { model.visible },
        set: { isPresented in
          if !isPresented && model.visible {
            model.visible = false
            model.onClose?([:])
          } else {
            model.visible = isPresented
          }
        }
      )) {
        ResidencyYearSheetContent(
          model: model,
          draftYear: $draftYear,
          draftCalendarYearMode: $draftCalendarYearMode
        )
        .residencyYearSheetPresentation()
      }
      .onAppear {
        if model.visible {
          resetDraft()
        }
      }
      .onChange(of: model.visible) { isVisible in
        if isVisible {
          resetDraft()
        }
      }
  }

  private func resetDraft() {
    draftYear = min(2100, max(2000, model.year))
    draftCalendarYearMode = model.calendarYearMode
  }
}

private struct ResidencyYearSheetContent: View {
  @ObservedObject var model: ResidencyYearSheetModel
  @Binding var draftYear: Int
  @Binding var draftCalendarYearMode: Bool

  private var foreground: Color { Color(uiColor: UIColor(residencyColorString: model.foreground) ?? .label) }
  private var muted: Color { Color(uiColor: UIColor(residencyColorString: model.muted) ?? .secondaryLabel) }
  private var card: Color { Color(uiColor: UIColor(residencyColorString: model.card) ?? .secondarySystemBackground) }
  private var pill: Color { Color(uiColor: UIColor(residencyColorString: model.pill) ?? .tertiarySystemBackground) }
  private var accent: Color { Color(uiColor: UIColor(residencyColorString: model.accent) ?? .label) }
  private var accentForeground: Color { Color(uiColor: UIColor(residencyColorString: model.accentForeground) ?? .systemBackground) }
  private var border: Color { Color(uiColor: UIColor(residencyColorString: model.border) ?? .separator) }
  private var background: Color { Color(uiColor: UIColor(residencyColorString: model.menuGlassFill) ?? .systemBackground) }

  var body: some View {
    ZStack(alignment: .bottom) {
      VStack(spacing: 0) {
        Capsule()
          .fill(border.opacity(0.82))
          .frame(width: 42, height: 4)
          .padding(.top, 10)
          .padding(.bottom, 12)

        HStack(spacing: 12) {
          Image(systemName: "calendar")
            .font(.system(size: 20, weight: .semibold))
            .foregroundStyle(accent)
            .frame(width: 42, height: 42)
            .residencyGlassBackground(fill: pill, border: border, shape: Circle())

          VStack(alignment: .leading, spacing: 2) {
            Text("Residency Year")
              .font(.system(size: 18, weight: .bold))
              .foregroundStyle(foreground)
              .lineLimit(1)
            Text(draftCalendarYearMode ? "Calendar year, Jan-Dec" : "India fiscal year, Apr-Mar")
              .font(.system(size: 13, weight: .medium))
              .foregroundStyle(muted)
              .lineLimit(1)
          }

          Spacer(minLength: 0)
        }
        .padding(.horizontal, 22)

        HStack(spacing: 14) {
          Button {
            withAnimation(residencyBlurReplaceAnimation) {
              draftYear = max(2000, draftYear - 1)
            }
          } label: {
            Image(systemName: "chevron.left")
              .font(.system(size: 19, weight: .semibold))
              .frame(width: 46, height: 46)
          }
          .residencyGlassButtonStyle(tint: foreground, prominent: false)

          VStack(spacing: 3) {
            Text(residencyYearLabel(year: draftYear, calendarYearMode: draftCalendarYearMode))
              .font(.system(size: 22, weight: .heavy))
              .minimumScaleFactor(0.72)
              .lineLimit(1)
              .foregroundStyle(foreground)
              .residencyBlurReplace(id: residencyYearLabel(year: draftYear, calendarYearMode: draftCalendarYearMode))
            Text(draftCalendarYearMode ? "Calendar year" : "India FY")
              .font(.system(size: 13, weight: .medium))
              .foregroundStyle(muted)
              .lineLimit(1)
              .residencyBlurReplace(id: draftCalendarYearMode)
          }
          .frame(maxWidth: .infinity)

          Button {
            withAnimation(residencyBlurReplaceAnimation) {
              draftYear = min(2100, draftYear + 1)
            }
          } label: {
            Image(systemName: "chevron.right")
              .font(.system(size: 19, weight: .semibold))
              .frame(width: 46, height: 46)
          }
          .residencyGlassButtonStyle(tint: foreground, prominent: false)
        }
        .padding(10)
        .residencyGlassBackground(fill: pill, border: border, shape: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(.horizontal, 22)
        .padding(.top, 22)

        ResidencyYearModeSegment(
          calendarYearMode: $draftCalendarYearMode,
          foreground: foreground,
          pill: pill,
          border: border
        )
        .padding(.horizontal, 22)
        .padding(.top, 16)

        Spacer(minLength: 0)
      }
      .padding(.bottom, 88)

      actionFooter
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background {
      if #available(iOS 16.0, *) {
        background
          .opacity(0.58)
          .background(.ultraThinMaterial)
          .ignoresSafeArea()
      } else {
        background.ignoresSafeArea()
      }
    }
    .tint(accent)
  }

  private var actionFooter: some View {
    VStack(spacing: 0) {
      LinearGradient(
        stops: [
          .init(color: background.opacity(0), location: 0),
          .init(color: background.opacity(0.74), location: 1)
        ],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(height: 46)
      .allowsHitTesting(false)

      HStack(spacing: 12) {
        Button {
          model.visible = false
          model.onClose?([:])
        } label: {
          Text("Cancel")
            .font(.system(size: 16, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: 34)
        }
        .residencyGlassButtonStyle(tint: foreground, prominent: false, controlSize: .small)

        Button {
          model.visible = false
          model.onConfirm?([
            "year": draftYear,
            "calendarYearMode": draftCalendarYearMode
          ])
        } label: {
          Label("Confirm", systemImage: "checkmark")
            .font(.system(size: 16, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: 34)
        }
        .residencyGlassButtonStyle(tint: accentForeground, prominent: true, controlSize: .small)
      }
      .padding(.horizontal, 28)
      .padding(.top, 0)
      .padding(.bottom, 14)
      .background(background.opacity(0.74))
    }
  }
}

private struct ResidencyYearModeSegment: View {
  @Binding var calendarYearMode: Bool
  let foreground: Color
  let pill: Color
  let border: Color

  var body: some View {
    HStack(spacing: 0) {
      segment(title: "FY", isSelected: !calendarYearMode) {
        withAnimation(residencyBlurReplaceAnimation) {
          calendarYearMode = false
        }
      }

      segment(title: "Cal", isSelected: calendarYearMode) {
        withAnimation(residencyBlurReplaceAnimation) {
          calendarYearMode = true
        }
      }
    }
    .padding(5)
    .frame(height: 52)
    .residencyGlassBackground(fill: pill, border: border, shape: RoundedRectangle(cornerRadius: 22, style: .continuous))
  }

  private func segment(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Text(title)
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(foreground)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background {
          if isSelected {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
              .fill(foreground.opacity(0.22))
          }
        }
        .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
    .buttonStyle(.plain)
  }
}

private extension View {
  @ViewBuilder
  func residencyYearSheetPresentation() -> some View {
    if #available(iOS 16.4, *) {
      self
        .presentationDetents([.height(330)])
        .presentationDragIndicator(.hidden)
        .interactiveDismissDisabled(true)
        .presentationCornerRadius(34)
        .presentationBackground(.ultraThinMaterial)
    } else if #available(iOS 16.0, *) {
      self
        .presentationDetents([.height(330)])
        .presentationDragIndicator(.hidden)
        .interactiveDismissDisabled(true)
    } else {
      self
        .interactiveDismissDisabled(true)
    }
  }

  @ViewBuilder
  func residencyBlurReplace<ID: Hashable>(id: ID) -> some View {
    if #available(iOS 17.0, *) {
      self
        .id(id)
        .transition(.blurReplace)
        .animation(residencyBlurReplaceAnimation, value: id)
    } else {
      self
        .id(id)
        .transition(.opacity.combined(with: .scale(scale: 0.98)))
        .animation(residencyBlurReplaceAnimation, value: id)
    }
  }

  @ViewBuilder
  func residencyGlassButtonStyle(tint: Color, prominent: Bool, controlSize: ControlSize = .large) -> some View {
    if #available(iOS 26.0, *) {
      if prominent {
        self
          .buttonStyle(.glassProminent)
          .foregroundStyle(tint)
          .controlSize(controlSize)
      } else {
        self
          .buttonStyle(.glass)
          .foregroundStyle(tint)
          .controlSize(controlSize)
      }
    } else {
      if prominent {
        self
          .buttonStyle(.borderedProminent)
          .foregroundStyle(tint)
          .controlSize(controlSize)
      } else {
        self
          .buttonStyle(.bordered)
          .foregroundStyle(tint)
          .controlSize(controlSize)
      }
    }
  }

  @ViewBuilder
  func residencyGlassBackground<S: InsettableShape>(fill: Color, border: Color, shape: S) -> some View {
    if #available(iOS 26.0, *) {
      self
        .background(fill.opacity(0.38), in: shape)
        .glassEffect(.regular.interactive(), in: shape)
    } else {
      self
        .background(.thinMaterial, in: shape)
        .background(fill.opacity(0.72), in: shape)
        .overlay {
          shape.stroke(border, lineWidth: 1)
        }
    }
  }
}

private func residencyYearLabel(year: Int, calendarYearMode: Bool) -> String {
  if calendarYearMode {
    return String(year)
  }

  return "FY \(String(format: "%02d", (year - 1) % 100))-\(String(format: "%02d", year % 100))"
}

private extension UIColor {
  convenience init?(residencyColorString string: String) {
    let raw = string.trimmingCharacters(in: .whitespacesAndNewlines)
    if raw == "transparent" {
      self.init(white: 0, alpha: 0)
      return
    }

    if raw.hasPrefix("rgba("), raw.hasSuffix(")") {
      let body = raw.dropFirst(5).dropLast()
      let parts = body.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      guard parts.count == 4,
        let red = Double(parts[0]),
        let green = Double(parts[1]),
        let blue = Double(parts[2]),
        let alpha = Double(parts[3])
      else {
        return nil
      }
      self.init(red: red / 255, green: green / 255, blue: blue / 255, alpha: alpha)
      return
    }

    if raw.hasPrefix("rgb("), raw.hasSuffix(")") {
      let body = raw.dropFirst(4).dropLast()
      let parts = body.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      guard parts.count == 3,
        let red = Double(parts[0]),
        let green = Double(parts[1]),
        let blue = Double(parts[2])
      else {
        return nil
      }
      self.init(red: red / 255, green: green / 255, blue: blue / 255, alpha: 1)
      return
    }

    var hex = raw
    if hex.hasPrefix("#") {
      hex.removeFirst()
    }

    guard hex.count == 6 || hex.count == 8, let value = UInt64(hex, radix: 16) else {
      return nil
    }

    let hasAlpha = hex.count == 8
    let red = CGFloat((value >> (hasAlpha ? 24 : 16)) & 0xff) / 255
    let green = CGFloat((value >> (hasAlpha ? 16 : 8)) & 0xff) / 255
    let blue = CGFloat((value >> (hasAlpha ? 8 : 0)) & 0xff) / 255
    let alpha = hasAlpha ? CGFloat(value & 0xff) / 255 : 1

    self.init(red: red, green: green, blue: blue, alpha: alpha)
  }
}
