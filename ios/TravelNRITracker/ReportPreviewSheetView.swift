import React
import SwiftUI
import UIKit

private final class ReportPreviewSheetModel: ObservableObject {
  @Published var visible = false
  @Published var isSharing = false
  @Published var reportJson = ""
  @Published var report: ReportPreview?
  @Published var foreground = "#111111"
  @Published var muted = "#737373"
  @Published var card = "#ffffff"
  @Published var pill = "#f5f5f5"
  @Published var accent = "#111111"
  @Published var accentForeground = "#ffffff"
  @Published var border = "rgba(0,0,0,0.08)"
  @Published var menuGlassFill = "#ffffff"

  var onClose: RCTBubblingEventBlock?
  var onShare: RCTBubblingEventBlock?
}

final class ReportPreviewSheetHostingView: UIView {
  @objc var visible: Bool = false {
    didSet { updateModel() }
  }

  @objc var isSharing: Bool = false {
    didSet { updateModel() }
  }

  @objc var reportJson: NSString = "" {
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

  @objc var onShare: RCTBubblingEventBlock? {
    didSet { model.onShare = onShare }
  }

  private let model = ReportPreviewSheetModel()
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

    let controller = UIHostingController(rootView: AnyView(ReportPreviewSheetRootView(model: model)))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    addSubview(controller.view)
  }

  private func updateModel() {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      let json = String(self.reportJson)
      self.model.visible = self.visible
      self.model.isSharing = self.isSharing
      if self.model.reportJson != json {
        self.model.reportJson = json
        self.model.report = ReportPreview.decode(json)
      }
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

@objc(ReportPreviewSheetViewManager)
final class ReportPreviewSheetViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    ReportPreviewSheetHostingView()
  }
}

private struct ReportPreviewSheetRootView: View {
  @ObservedObject var model: ReportPreviewSheetModel

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
        ReportPreviewSheetContent(model: model)
          .reportPreviewSheetPresentation()
      }
  }
}

private struct ReportPreviewSheetContent: View {
  @ObservedObject var model: ReportPreviewSheetModel

  private var foreground: Color { Color(uiColor: UIColor(reportPreviewColorString: model.foreground) ?? .label) }
  private var muted: Color { Color(uiColor: UIColor(reportPreviewColorString: model.muted) ?? .secondaryLabel) }
  private var card: Color { Color(uiColor: UIColor(reportPreviewColorString: model.card) ?? .secondarySystemBackground) }
  private var pill: Color { Color(uiColor: UIColor(reportPreviewColorString: model.pill) ?? .tertiarySystemBackground) }
  private var accent: Color { Color(uiColor: UIColor(reportPreviewColorString: model.accent) ?? .label) }
  private var accentForeground: Color { Color(uiColor: UIColor(reportPreviewColorString: model.accentForeground) ?? .systemBackground) }
  private var border: Color { Color(uiColor: UIColor(reportPreviewColorString: model.border) ?? .separator) }
  private var background: Color { Color(uiColor: UIColor(reportPreviewColorString: model.menuGlassFill) ?? .systemBackground) }

  var body: some View {
    ZStack(alignment: .bottom) {
      if let report = model.report {
        ScrollView(showsIndicators: false) {
          VStack(spacing: 16) {
            ReportPreviewHeader(report: report, foreground: foreground, muted: muted, pill: pill, accent: accent, border: border)
            ReportMetricGrid(report: report, foreground: foreground, muted: muted, pill: pill, border: border)
            ReportCalendarPanel(report: report, foreground: foreground, muted: muted, pill: pill, border: border)
            ReportCountryPanel(report: report, foreground: foreground, muted: muted, pill: pill, accent: accent, border: border)
            ReportBreakdownPanel(report: report, foreground: foreground, muted: muted, pill: pill, border: border)
            ReportDetailPanel(report: report, foreground: foreground, muted: muted, pill: pill, border: border)
          }
          .padding(.horizontal, 22)
          .padding(.top, 24)
          .padding(.bottom, 124)
        }
      } else {
        VStack(spacing: 12) {
          Image(systemName: "doc.text")
            .font(.system(size: 28, weight: .semibold))
            .foregroundStyle(accent)
          Text("Report unavailable")
            .font(.system(size: 18, weight: .bold))
            .foregroundStyle(foreground)
          Text("Close this sheet and try creating the report again.")
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(muted)
            .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 32)
        .padding(.bottom, 104)
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

      HStack(spacing: 12) {
        Button {
          model.visible = false
          model.onClose?([:])
        } label: {
          Text("Close")
            .font(.system(size: 17, weight: .bold))
            .frame(maxWidth: .infinity, minHeight: 46)
        }
        .reportPreviewButtonStyle(tint: foreground, prominent: false)

        Button {
          model.onShare?([:])
        } label: {
          Label(model.isSharing ? "Creating PDF" : "Share PDF", systemImage: "square.and.arrow.up")
            .font(.system(size: 17, weight: .bold))
            .lineLimit(1)
            .minimumScaleFactor(0.72)
            .frame(maxWidth: .infinity, minHeight: 46)
        }
        .reportPreviewButtonStyle(tint: accentForeground, prominent: true)
        .disabled(model.isSharing || model.report == nil)
      }
      .padding(.horizontal, 22)
      .padding(.top, 0)
      .padding(.bottom, 6)
      .background(background.opacity(0.74))
    }
  }
}

private struct ReportPreviewHeader: View {
  let report: ReportPreview
  let foreground: Color
  let muted: Color
  let pill: Color
  let accent: Color
  let border: Color

  var body: some View {
    HStack(spacing: 13) {
      Image(systemName: report.period.iconName)
        .font(.system(size: 21, weight: .semibold))
        .foregroundStyle(accent)
        .frame(width: 42, height: 42)
        .reportPreviewGlassBackground(fill: pill, border: border, shape: Circle())

      VStack(alignment: .leading, spacing: 3) {
        Text(report.period.title)
          .font(.system(size: 18, weight: .bold))
          .foregroundStyle(foreground)
          .lineLimit(1)
          .minimumScaleFactor(0.78)
        Text("\(report.period.label) - \(report.rangeLabel)")
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(muted)
          .lineLimit(1)
          .minimumScaleFactor(0.72)
      }

      Spacer(minLength: 0)
    }
  }
}

private struct ReportMetricGrid: View {
  let report: ReportPreview
  let foreground: Color
  let muted: Color
  let pill: Color
  let border: Color

  private let columns = [
    GridItem(.flexible(), spacing: 10),
    GridItem(.flexible(), spacing: 10)
  ]

  var body: some View {
    LazyVGrid(columns: columns, spacing: 10) {
      ReportMetricTile(label: "India", value: report.stats.indiaDays, foreground: foreground, muted: muted, pill: pill, border: border)
      ReportMetricTile(label: "Abroad", value: report.stats.outsideIndiaDays, foreground: foreground, muted: muted, pill: pill, border: border)
      ReportMetricTile(label: "Tracked", value: report.stats.trackedDays, foreground: foreground, muted: muted, pill: pill, border: border)
      ReportMetricTile(label: "Missing", value: report.stats.untrackedDays, foreground: foreground, muted: muted, pill: pill, border: border)
    }
  }
}

private struct ReportMetricTile: View {
  let label: String
  let value: Int
  let foreground: Color
  let muted: Color
  let pill: Color
  let border: Color

  var body: some View {
    VStack(alignment: .leading, spacing: 5) {
      Text(label)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(muted)
        .lineLimit(1)
      Text(compactReportNumber(value))
        .font(.system(size: 24, weight: .heavy))
        .foregroundStyle(foreground)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 14)
    .padding(.vertical, 13)
    .reportPreviewGlassBackground(fill: pill, border: border, shape: RoundedRectangle(cornerRadius: 20, style: .continuous))
  }
}

private struct ReportCalendarPanel: View {
  let report: ReportPreview
  let foreground: Color
  let muted: Color
  let pill: Color
  let border: Color

  private var monthColumns: [GridItem] {
    let columnCount = min(4, max(1, report.calendarMonths.count))
    return Array(repeating: GridItem(.flexible(minimum: 54), spacing: 8), count: columnCount)
  }

  var body: some View {
    ReportPanel(title: "Travel calendar", foreground: foreground, pill: pill, border: border) {
      LazyVGrid(columns: monthColumns, spacing: 14) {
        ForEach(report.calendarMonths) { month in
          ReportMonthDots(month: month, report: report, foreground: foreground, muted: muted)
        }
      }
      .padding(.top, 4)
    }
  }
}

private struct ReportMonthDots: View {
  let month: ReportCalendarMonth
  let report: ReportPreview
  let foreground: Color
  let muted: Color

  private var dotSize: CGFloat {
    report.calendarMonths.count > 1 ? 5 : 8
  }

  private var dotSpacing: CGFloat {
    report.calendarMonths.count > 1 ? 3 : 5
  }

  private var dotColumns: [GridItem] {
    Array(repeating: GridItem(.fixed(dotSize), spacing: dotSpacing), count: 7)
  }

  var body: some View {
    VStack(spacing: 7) {
      Text(month.label)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(foreground)
        .lineLimit(1)

      LazyVGrid(columns: dotColumns, spacing: dotSpacing) {
        ForEach(month.slots) { slot in
          Circle()
            .fill(dotColor(slot))
            .frame(width: dotSize, height: dotSize)
        }
      }
      .frame(width: dotSize * 7 + dotSpacing * 6)
    }
    .frame(maxWidth: .infinity)
  }

  private func dotColor(_ slot: ReportCalendarSlot) -> Color {
    guard slot.date != nil else {
      return muted.opacity(0.14)
    }
    guard let code = slot.countryCode, !code.isEmpty else {
      return muted.opacity(0.26)
    }
    return report.color(for: code)
  }
}

private struct ReportCountryPanel: View {
  let report: ReportPreview
  let foreground: Color
  let muted: Color
  let pill: Color
  let accent: Color
  let border: Color

  private var rows: [CountryTotal] {
    Array(report.stats.countryTotals.prefix(5))
  }

  private var maxDays: Int {
    max(1, rows.map(\.days).max() ?? 1)
  }

  var body: some View {
    ReportPanel(title: "Country breakdown", foreground: foreground, pill: pill, border: border) {
      if rows.isEmpty {
        Text("No tracked country days in this period.")
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(muted)
          .frame(maxWidth: .infinity, alignment: .leading)
      } else {
        VStack(spacing: 12) {
          ForEach(Array(rows.enumerated()), id: \.element.countryCode) { index, row in
            VStack(spacing: 7) {
              HStack(spacing: 10) {
                Text(row.countryName)
                  .font(.system(size: 12, weight: .bold))
                  .foregroundStyle(foreground)
                  .lineLimit(1)
                Spacer(minLength: 0)
                Text(compactReportNumber(row.days))
                  .font(.system(size: 12, weight: .bold))
                  .foregroundStyle(muted)
              }

              GeometryReader { geometry in
                ZStack(alignment: .leading) {
                  Capsule()
                    .fill(muted.opacity(0.18))
                  Capsule()
                    .fill(reportDistributionColor(index))
                    .frame(width: max(16, geometry.size.width * CGFloat(row.days) / CGFloat(maxDays)))
                }
              }
              .frame(height: 8)
            }
          }
        }
      }
    }
  }
}

private struct ReportBreakdownPanel: View {
  let report: ReportPreview
  let foreground: Color
  let muted: Color
  let pill: Color
  let border: Color

  var body: some View {
    ReportPanel(title: report.period.kind == "monthly" ? "Week breakdown" : "Monthly breakdown", foreground: foreground, pill: pill, border: border) {
      VStack(spacing: 10) {
        ForEach(report.stats.monthRows) { row in
          HStack(spacing: 10) {
            Text(row.label)
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(foreground)
              .frame(width: 58, alignment: .leading)
              .lineLimit(1)
            Text("India \(row.india) / Abroad \(row.abroad)")
              .font(.system(size: 12, weight: .medium))
              .foregroundStyle(muted)
              .lineLimit(1)
              .minimumScaleFactor(0.76)
            Spacer(minLength: 0)
            Text(compactReportNumber(row.tracked))
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(foreground)
          }
        }
      }
    }
  }
}

private struct ReportDetailPanel: View {
  let report: ReportPreview
  let foreground: Color
  let muted: Color
  let pill: Color
  let border: Color

  private var rows: [ReportDetailRow] {
    Array(report.detailRows.prefix(report.period.kind == "monthly" ? 31 : 10))
  }

  var body: some View {
    ReportPanel(title: report.detailTitle, foreground: foreground, pill: pill, border: border) {
      VStack(spacing: 10) {
        ForEach(rows) { row in
          HStack(spacing: 10) {
            Text(row.date)
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(foreground)
              .frame(width: 88, alignment: .leading)
              .lineLimit(1)
            Text(row.countryName)
              .font(.system(size: 12, weight: .medium))
              .foregroundStyle(muted)
              .lineLimit(1)
            Spacer(minLength: 0)
            Text(row.status)
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(foreground)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
          }
        }
      }
    }
  }
}

private struct ReportPanel<Content: View>: View {
  let title: String
  let foreground: Color
  let pill: Color
  let border: Color
  let content: Content

  init(title: String, foreground: Color, pill: Color, border: Color, @ViewBuilder content: () -> Content) {
    self.title = title
    self.foreground = foreground
    self.pill = pill
    self.border = border
    self.content = content()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(title)
        .font(.system(size: 14, weight: .bold))
        .foregroundStyle(foreground)
        .lineLimit(1)
      content
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 16)
    .padding(.vertical, 16)
    .reportPreviewGlassBackground(fill: pill, border: border, shape: RoundedRectangle(cornerRadius: 22, style: .continuous))
  }
}

private struct ReportPreview: Codable {
  let calendarMonths: [ReportCalendarMonth]
  let detailRows: [ReportDetailRow]
  let detailTitle: String
  let generatedLabel: String
  let period: ReportPeriod
  let rangeLabel: String
  let stats: ReportStats

  static func decode(_ json: String) -> ReportPreview? {
    guard let data = json.data(using: .utf8), !data.isEmpty else {
      return nil
    }
    return try? JSONDecoder().decode(ReportPreview.self, from: data)
  }

  func color(for countryCode: String) -> Color {
    guard let index = stats.countryTotals.firstIndex(where: { $0.countryCode == countryCode }) else {
      return Color(uiColor: .systemGray3)
    }
    return reportDistributionColor(index)
  }
}

private struct ReportPeriod: Codable {
  let kind: String
  let title: String
  let label: String
  let startDate: String
  let endDate: String

  var iconName: String {
    switch kind {
    case "monthly":
      return "doc.text"
    case "calendar":
      return "calendar"
    default:
      return "banknote"
    }
  }
}

private struct CountryTotal: Codable {
  let countryCode: String
  let countryName: String
  let days: Int
}

private struct ReportBreakdownRow: Codable, Identifiable {
  let label: String
  let tracked: Int
  let india: Int
  let abroad: Int
  let untracked: Int

  var id: String { label }
}

private struct ReportDetailRow: Codable, Identifiable {
  let date: String
  let countryCode: String
  let countryName: String
  let status: String

  var id: String { "\(date)-\(countryCode)-\(status)" }
}

private struct ReportCalendarSlot: Codable, Identifiable {
  let key: String
  let date: String?
  let countryCode: String?
  let countryName: String?

  var id: String { key }
}

private struct ReportCalendarMonth: Codable, Identifiable {
  let key: String
  let label: String
  let slots: [ReportCalendarSlot]

  var id: String { key }
}

private struct ReportStats: Codable {
  let countryTotals: [CountryTotal]
  let coveragePercent: Double
  let indiaDays: Int
  let monthRows: [ReportBreakdownRow]
  let outsideIndiaDays: Int
  let pendingDays: Int
  let totalDays: Int
  let trackedDays: Int
  let travelDays: Int
  let untrackedDays: Int
}

private extension View {
  @ViewBuilder
  func reportPreviewSheetPresentation() -> some View {
    if #available(iOS 16.4, *) {
      self
        .presentationDetents([.height(690), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(34)
        .presentationBackground(.ultraThinMaterial)
    } else if #available(iOS 16.0, *) {
      self
        .presentationDetents([.height(690), .large])
        .presentationDragIndicator(.visible)
    } else {
      self
    }
  }

  @ViewBuilder
  func reportPreviewButtonStyle(tint: Color, prominent: Bool) -> some View {
    if #available(iOS 26.0, *) {
      if prominent {
        self
          .buttonStyle(.glassProminent)
          .foregroundStyle(tint)
          .controlSize(.regular)
      } else {
        self
          .buttonStyle(.glass)
          .foregroundStyle(tint)
          .controlSize(.regular)
      }
    } else {
      if prominent {
        self
          .buttonStyle(.borderedProminent)
          .foregroundStyle(tint)
          .controlSize(.regular)
      } else {
        self
          .buttonStyle(.bordered)
          .foregroundStyle(tint)
          .controlSize(.regular)
      }
    }
  }

  @ViewBuilder
  func reportPreviewGlassBackground<S: InsettableShape>(fill: Color, border: Color, shape: S) -> some View {
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

private func reportDistributionColor(_ index: Int) -> Color {
  let colors = ["#6ee7b7", "#93c5fd", "#fbbf24", "#fda4af", "#c4b5fd", "#67e8f9", "#fdba74"]
  return Color(uiColor: UIColor(reportPreviewColorString: colors[index % colors.count]) ?? .systemBlue)
}

private func compactReportNumber(_ value: Int) -> String {
  if value >= 1_000_000 {
    return String(format: "%.1fM", Double(value) / 1_000_000)
  }
  if value >= 1_000 {
    return String(format: "%.1fk", Double(value) / 1_000)
  }
  return "\(value)"
}

private extension UIColor {
  convenience init?(reportPreviewColorString string: String) {
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

    guard hex.count == 6 || hex.count == 8, let number = UInt64(hex, radix: 16) else {
      return nil
    }

    if hex.count == 8 {
      self.init(
        red: CGFloat((number >> 24) & 0xff) / 255,
        green: CGFloat((number >> 16) & 0xff) / 255,
        blue: CGFloat((number >> 8) & 0xff) / 255,
        alpha: CGFloat(number & 0xff) / 255
      )
      return
    }

    self.init(
      red: CGFloat((number >> 16) & 0xff) / 255,
      green: CGFloat((number >> 8) & 0xff) / 255,
      blue: CGFloat(number & 0xff) / 255,
      alpha: 1
    )
  }
}
