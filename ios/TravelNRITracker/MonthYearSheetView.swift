import React
import SwiftUI
import UIKit

private let monthYearBlurReplaceAnimation = Animation.easeInOut(duration: 0.22)
private let monthYearNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

private final class MonthYearSheetModel: ObservableObject {
  @Published var visible = false
  @Published var monthIndex = Calendar.current.component(.month, from: Date()) - 1
  @Published var year = Calendar.current.component(.year, from: Date())
  @Published var foreground = "#ffffff"
  @Published var muted = "#a1a1a8"
  @Published var pill = "#2c2c2e"
  @Published var accent = "#ffffff"
  @Published var accentForeground = "#000000"
  @Published var border = "rgba(255,255,255,0.16)"
  @Published var menuGlassFill = "#1c1c1e"

  var onClose: RCTBubblingEventBlock?
  var onConfirm: RCTBubblingEventBlock?
}

final class MonthYearSheetHostingView: UIView {
  @objc var visible: Bool = false { didSet { updateModel() } }
  @objc var monthIndex: NSNumber = 0 { didSet { updateModel() } }
  @objc var year: NSNumber = 0 { didSet { updateModel() } }
  @objc var foregroundColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var mutedColorValue: NSString = "#a1a1a8" { didSet { updateModel() } }
  @objc var pillColorValue: NSString = "#2c2c2e" { didSet { updateModel() } }
  @objc var accentColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var accentForegroundColorValue: NSString = "#000000" { didSet { updateModel() } }
  @objc var borderColorValue: NSString = "rgba(255,255,255,0.16)" { didSet { updateModel() } }
  @objc var menuGlassFillColorValue: NSString = "#1c1c1e" { didSet { updateModel() } }

  @objc var onClose: RCTBubblingEventBlock? { didSet { model.onClose = onClose } }
  @objc var onConfirm: RCTBubblingEventBlock? { didSet { model.onConfirm = onConfirm } }

  private let model = MonthYearSheetModel()
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

    let controller = UIHostingController(rootView: AnyView(MonthYearSheetRootView(model: model)))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    addSubview(controller.view)
  }

  private func updateModel() {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.model.visible = self.visible
      self.model.monthIndex = min(11, max(0, self.monthIndex.intValue))
      self.model.year = self.year.intValue == 0 ? Calendar.current.component(.year, from: Date()) : min(2100, max(1900, self.year.intValue))
      self.model.foreground = String(self.foregroundColorValue)
      self.model.muted = String(self.mutedColorValue)
      self.model.pill = String(self.pillColorValue)
      self.model.accent = String(self.accentColorValue)
      self.model.accentForeground = String(self.accentForegroundColorValue)
      self.model.border = String(self.borderColorValue)
      self.model.menuGlassFill = String(self.menuGlassFillColorValue)
    }
  }
}

@objc(MonthYearSheetViewManager)
final class MonthYearSheetViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    MonthYearSheetHostingView()
  }
}

private struct MonthYearSheetRootView: View {
  @ObservedObject var model: MonthYearSheetModel
  @State private var draftMonthIndex = Calendar.current.component(.month, from: Date()) - 1
  @State private var draftYear = Calendar.current.component(.year, from: Date())

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
        MonthYearSheetContent(
          model: model,
          draftMonthIndex: $draftMonthIndex,
          draftYear: $draftYear
        )
        .monthYearSheetPresentation()
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
    draftMonthIndex = min(11, max(0, model.monthIndex))
    draftYear = min(2100, max(1900, model.year))
  }
}

private struct MonthYearSheetContent: View {
  @ObservedObject var model: MonthYearSheetModel
  @Binding var draftMonthIndex: Int
  @Binding var draftYear: Int

  private var foreground: Color { Color(uiColor: UIColor(monthYearColorString: model.foreground) ?? .label) }
  private var muted: Color { Color(uiColor: UIColor(monthYearColorString: model.muted) ?? .secondaryLabel) }
  private var pill: Color { Color(uiColor: UIColor(monthYearColorString: model.pill) ?? .tertiarySystemBackground) }
  private var accent: Color { Color(uiColor: UIColor(monthYearColorString: model.accent) ?? .label) }
  private var accentForeground: Color { Color(uiColor: UIColor(monthYearColorString: model.accentForeground) ?? .systemBackground) }
  private var border: Color { Color(uiColor: UIColor(monthYearColorString: model.border) ?? .separator) }
  private var background: Color { Color(uiColor: UIColor(monthYearColorString: model.menuGlassFill) ?? .systemBackground) }

  var body: some View {
    ZStack(alignment: .bottom) {
      VStack(spacing: 0) {
        Capsule()
          .fill(border.opacity(0.82))
          .frame(width: 42, height: 4)
          .padding(.top, 10)
          .padding(.bottom, 18)

        HStack(spacing: 12) {
          Image(systemName: "calendar")
            .font(.system(size: 20, weight: .semibold))
            .foregroundStyle(accent)
            .frame(width: 42, height: 42)
            .monthYearGlassBackground(fill: pill, border: border, shape: Circle())

          VStack(alignment: .leading, spacing: 2) {
            Text("Choose Month")
              .font(.system(size: 18, weight: .bold))
              .foregroundStyle(foreground)
              .lineLimit(1)
            Text("\(monthYearNames[draftMonthIndex]) \(String(draftYear))")
              .font(.system(size: 13, weight: .medium))
              .foregroundStyle(muted)
              .lineLimit(1)
              .monthYearBlurReplace(id: "\(draftMonthIndex)-\(draftYear)")
          }

          Spacer(minLength: 0)
        }
        .padding(.horizontal, 22)

        HStack(spacing: 14) {
          Button {
            withAnimation(monthYearBlurReplaceAnimation) {
              draftYear = max(1900, draftYear - 1)
            }
          } label: {
            Image(systemName: "chevron.left")
              .font(.system(size: 19, weight: .semibold))
              .frame(width: 46, height: 46)
          }
          .monthYearGlassButtonStyle(tint: foreground, prominent: false)

          Text(String(draftYear))
            .font(.system(size: 22, weight: .heavy))
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity)
            .monthYearBlurReplace(id: draftYear)

          Button {
            withAnimation(monthYearBlurReplaceAnimation) {
              draftYear = min(2100, draftYear + 1)
            }
          } label: {
            Image(systemName: "chevron.right")
              .font(.system(size: 19, weight: .semibold))
              .frame(width: 46, height: 46)
          }
          .monthYearGlassButtonStyle(tint: foreground, prominent: false)
        }
        .padding(10)
        .monthYearGlassBackground(fill: pill, border: border, shape: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(.horizontal, 22)
        .padding(.top, 22)

        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3), spacing: 12) {
          ForEach(monthYearNames.indices, id: \.self) { index in
            let isSelected = draftMonthIndex == index
            Button {
              withAnimation(monthYearBlurReplaceAnimation) {
                draftMonthIndex = index
              }
            } label: {
              Text(monthYearNames[index])
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(foreground)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background {
                  if isSelected {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                      .fill(foreground.opacity(0.18))
                  }
                }
                .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)
            .monthYearGlassBackground(fill: pill, border: isSelected ? foreground.opacity(0.42) : border, shape: RoundedRectangle(cornerRadius: 18, style: .continuous))
          }
        }
        .padding(.horizontal, 22)
        .padding(.top, 22)

        Spacer(minLength: 0)
      }
      .padding(.bottom, 94)

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
        .monthYearGlassButtonStyle(tint: foreground, prominent: false, controlSize: .small)

        Button {
          model.visible = false
          model.onConfirm?([
            "monthIndex": draftMonthIndex,
            "year": draftYear
          ])
        } label: {
          Label("Confirm", systemImage: "checkmark")
            .font(.system(size: 16, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: 34)
        }
        .monthYearGlassButtonStyle(tint: accentForeground, prominent: true, controlSize: .small)
      }
      .padding(.horizontal, 28)
      .padding(.top, 0)
      .padding(.bottom, 14)
      .background(background.opacity(0.74))
    }
  }
}

private extension View {
  @ViewBuilder
  func monthYearSheetPresentation() -> some View {
    if #available(iOS 16.4, *) {
      self
        .presentationDetents([.height(560)])
        .presentationDragIndicator(.hidden)
        .presentationCornerRadius(34)
        .presentationBackground(.ultraThinMaterial)
    } else if #available(iOS 16.0, *) {
      self
        .presentationDetents([.height(560)])
        .presentationDragIndicator(.hidden)
    } else {
      self
    }
  }

  @ViewBuilder
  func monthYearBlurReplace<ID: Hashable>(id: ID) -> some View {
    if #available(iOS 17.0, *) {
      self
        .id(id)
        .transition(.blurReplace)
        .animation(monthYearBlurReplaceAnimation, value: id)
    } else {
      self
        .id(id)
        .transition(.opacity.combined(with: .scale(scale: 0.98)))
        .animation(monthYearBlurReplaceAnimation, value: id)
    }
  }

  @ViewBuilder
  func monthYearGlassButtonStyle(tint: Color, prominent: Bool, controlSize: ControlSize = .large) -> some View {
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
  func monthYearGlassBackground<S: InsettableShape>(fill: Color, border: Color, shape: S) -> some View {
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
  convenience init?(monthYearColorString string: String) {
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
