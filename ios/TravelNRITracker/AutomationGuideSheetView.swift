import React
import SwiftUI
import UIKit

private final class AutomationGuideSheetModel: ObservableObject {
  @Published var visible = false
  @Published var foreground = "#111111"
  @Published var muted = "#737373"
  @Published var card = "#ffffff"
  @Published var pill = "#f5f5f5"
  @Published var accent = "#111111"
  @Published var accentForeground = "#ffffff"
  @Published var border = "rgba(0,0,0,0.08)"
  @Published var menuGlassFill = "#ffffff"

  var onClose: RCTBubblingEventBlock?
  var onConfirmSetup: RCTBubblingEventBlock?
  var onOpenShortcuts: RCTBubblingEventBlock?
}

final class AutomationGuideSheetHostingView: UIView {
  @objc var visible: Bool = false {
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

  @objc var onConfirmSetup: RCTBubblingEventBlock? {
    didSet { model.onConfirmSetup = onConfirmSetup }
  }

  @objc var onOpenShortcuts: RCTBubblingEventBlock? {
    didSet { model.onOpenShortcuts = onOpenShortcuts }
  }

  private let model = AutomationGuideSheetModel()
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

    let controller = UIHostingController(rootView: AnyView(AutomationGuideSheetRootView(model: model)))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    addSubview(controller.view)
  }

  private func updateModel() {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.model.visible = self.visible
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

@objc(AutomationGuideSheetViewManager)
final class AutomationGuideSheetViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    AutomationGuideSheetHostingView()
  }
}

private struct AutomationGuideSheetRootView: View {
  @ObservedObject var model: AutomationGuideSheetModel

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
        AutomationGuideSheetContent(model: model)
          .automationGuideSheetPresentation()
      }
  }
}

private struct AutomationGuideSheetContent: View {
  @ObservedObject var model: AutomationGuideSheetModel

  private var foreground: Color { Color(uiColor: UIColor(automationGuideColorString: model.foreground) ?? .label) }
  private var muted: Color { Color(uiColor: UIColor(automationGuideColorString: model.muted) ?? .secondaryLabel) }
  private var card: Color { Color(uiColor: UIColor(automationGuideColorString: model.card) ?? .secondarySystemBackground) }
  private var pill: Color { Color(uiColor: UIColor(automationGuideColorString: model.pill) ?? .tertiarySystemBackground) }
  private var accent: Color { Color(uiColor: UIColor(automationGuideColorString: model.accent) ?? .label) }
  private var accentForeground: Color { Color(uiColor: UIColor(automationGuideColorString: model.accentForeground) ?? .systemBackground) }
  private var border: Color { Color(uiColor: UIColor(automationGuideColorString: model.border) ?? .separator) }
  private var background: Color { Color(uiColor: UIColor(automationGuideColorString: model.menuGlassFill) ?? .systemBackground) }

  var body: some View {
    ZStack(alignment: .bottom) {
      ScrollView(showsIndicators: false) {
        VStack(spacing: 18) {
          header

          VStack(spacing: 12) {
            AutomationGuideStepCard(index: 1, time: "1:00 AM", foreground: foreground, muted: muted, card: card, pill: pill, accent: accent, border: border)
            AutomationGuideStepCard(index: 2, time: "1:00 PM", foreground: foreground, muted: muted, card: card, pill: pill, accent: accent, border: border)
          }

          instructions
        }
        .padding(.horizontal, 22)
        .padding(.top, 24)
        .padding(.bottom, 174)
      }

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

      VStack(spacing: 16) {
        Button {
          model.visible = false
          model.onConfirmSetup?([:])
        } label: {
          Label("I created both automations", systemImage: "checkmark")
            .font(.system(size: 16, weight: .semibold))
            .lineLimit(1)
            .minimumScaleFactor(0.72)
            .frame(maxWidth: .infinity, minHeight: 40)
        }
        .automationGuideButtonStyle(tint: accentForeground, prominent: true)

        HStack(spacing: 12) {
          Button {
            model.visible = false
            model.onClose?([:])
          } label: {
            Text("Close")
              .font(.system(size: 16, weight: .semibold))
              .frame(maxWidth: .infinity, minHeight: 40)
          }
          .automationGuideButtonStyle(tint: foreground, prominent: false)

          Button {
            model.visible = false
            model.onOpenShortcuts?([:])
          } label: {
            Label("Open Shortcuts", systemImage: "arrow.up.forward.app")
              .font(.system(size: 16, weight: .semibold))
              .lineLimit(1)
              .minimumScaleFactor(0.74)
              .frame(maxWidth: .infinity, minHeight: 40)
          }
          .automationGuideButtonStyle(tint: accentForeground, prominent: true)
        }
      }
      .padding(.horizontal, 28)
      .padding(.top, 0)
      .padding(.bottom, 14)
      .background(background.opacity(0.74))
    }
  }

  private var header: some View {
    HStack(spacing: 13) {
      Image(systemName: "clock")
        .font(.system(size: 21, weight: .semibold))
        .foregroundStyle(accent)
        .frame(width: 42, height: 42)
        .automationGuideGlassBackground(fill: pill, border: border, shape: Circle())

      VStack(alignment: .leading, spacing: 3) {
        Text("Log Country automations")
          .font(.system(size: 18, weight: .bold))
          .foregroundStyle(foreground)
          .lineLimit(1)
          .minimumScaleFactor(0.82)
        Text("Create both daily schedules in Shortcuts")
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(muted)
          .lineLimit(1)
          .minimumScaleFactor(0.78)
      }

      Spacer(minLength: 0)
    }
  }

  private var instructions: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("For each automation")
        .font(.system(size: 16, weight: .bold))
        .foregroundStyle(foreground)

      AutomationGuideInstructionLine("Choose Time of Day, set Daily, then tap Next.", muted: muted, accent: accent)
      AutomationGuideInstructionLine("Add action: NomadTrack -> Log Country.", muted: muted, accent: accent)
      AutomationGuideInstructionLine("Set Run Immediately, then tap Done.", muted: muted, accent: accent)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 16)
    .padding(.vertical, 16)
    .automationGuideGlassBackground(fill: pill, border: border, shape: RoundedRectangle(cornerRadius: 22, style: .continuous))
  }
}

private struct AutomationGuideStepCard: View {
  let index: Int
  let time: String
  let foreground: Color
  let muted: Color
  let card: Color
  let pill: Color
  let accent: Color
  let border: Color

  var body: some View {
    HStack(spacing: 14) {
      Text("\(index)")
        .font(.system(size: 15, weight: .heavy))
        .foregroundStyle(foreground)
        .frame(width: 34, height: 34)
        .automationGuideGlassBackground(fill: card, border: border, shape: Circle())

      VStack(alignment: .leading, spacing: 3) {
        Text("Time of Day")
          .font(.system(size: 16, weight: .bold))
          .foregroundStyle(foreground)
          .lineLimit(1)
        Text("Daily at \(time)")
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(muted)
          .lineLimit(1)
      }

      Spacer(minLength: 8)

      Text("Log Country")
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(accent)
        .lineLimit(1)
        .minimumScaleFactor(0.72)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
    .automationGuideGlassBackground(fill: pill, border: border, shape: RoundedRectangle(cornerRadius: 22, style: .continuous))
  }
}

private struct AutomationGuideInstructionLine: View {
  let value: String
  let muted: Color
  let accent: Color

  init(_ value: String, muted: Color, accent: Color) {
    self.value = value
    self.muted = muted
    self.accent = accent
  }

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      Text("-")
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(accent)
      Text(value)
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(muted)
        .fixedSize(horizontal: false, vertical: true)
    }
  }
}

private extension View {
  @ViewBuilder
  func automationGuideSheetPresentation() -> some View {
    if #available(iOS 16.4, *) {
      self
        .presentationDetents([.height(570), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(34)
        .presentationBackground(.ultraThinMaterial)
    } else if #available(iOS 16.0, *) {
      self
        .presentationDetents([.height(570), .large])
        .presentationDragIndicator(.visible)
    } else {
      self
    }
  }

  @ViewBuilder
  func automationGuideButtonStyle(tint: Color, prominent: Bool) -> some View {
    if #available(iOS 26.0, *) {
      if prominent {
        self
          .buttonStyle(.glassProminent)
          .foregroundStyle(tint)
          .controlSize(.small)
      } else {
        self
          .buttonStyle(.glass)
          .foregroundStyle(tint)
          .controlSize(.small)
      }
    } else {
      if prominent {
        self
          .buttonStyle(.borderedProminent)
          .foregroundStyle(tint)
          .controlSize(.small)
      } else {
        self
          .buttonStyle(.bordered)
          .foregroundStyle(tint)
          .controlSize(.small)
      }
    }
  }

  @ViewBuilder
  func automationGuideGlassBackground<S: InsettableShape>(fill: Color, border: Color, shape: S) -> some View {
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

private extension UIColor {
  convenience init?(automationGuideColorString string: String) {
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
