import React
import SwiftUI
import UIKit

private let calendarMonthGridWeekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
private let calendarMonthGridBlurReplaceAnimation = Animation.easeInOut(duration: 0.28)
private let calendarMonthGridSlideAnimation = Animation.spring(response: 0.34, dampingFraction: 0.88)
private let calendarMonthGridSwipeThreshold: CGFloat = 54
private let calendarMonthGridSwipeProjectedThreshold: CGFloat = 118

private struct CalendarMonthGridRecord: Identifiable, Equatable {
  let date: String
  let countryCode: String

  var id: String { date }
}

private struct CalendarMonthGridCell {
  let iso: String
  let day: Int
}

private final class CalendarMonthGridModel: ObservableObject {
  @Published var monthDate = ""
  @Published var selectedDate = ""
  @Published var dayRecords: [CalendarMonthGridRecord] = []
  @Published var foreground = "#111111"
  @Published var weekday = "#111111"
  @Published var accent = "#111111"
  @Published var monthTransitionDirection = 0
  @Published var showsSummary = false
  @Published var summaryRecordedDays = 0
  @Published var summaryTotalDays = 0
  @Published var summaryIndiaDays = 0
  @Published var summaryAbroadDays = 0
  @Published var summaryTravelDays = 0
  @Published var summaryPendingDays = 0
  @Published var summaryCountryText = "No countries tracked"
  @Published var summaryStatusText = ""
  @Published var summaryCard = "#ffffff"
  @Published var summaryInputFill = "#ffffff"
  @Published var summaryInputBorder = "#d1d5db"
  @Published var summaryMuted = "#6b7280"

  var onDayPress: RCTBubblingEventBlock?
  var onPreviousMonth: RCTBubblingEventBlock?
  var onNextMonth: RCTBubblingEventBlock?
}

final class CalendarMonthGridHostingView: UIView {
  @objc var monthDate: NSString = "" { didSet { updateModel() } }
  @objc var selectedDate: NSString = "" { didSet { updateModel() } }
  @objc var dayRecords: NSArray = [] { didSet { updateModel() } }
  @objc var foregroundColorValue: NSString = "#111111" { didSet { updateModel() } }
  @objc var weekdayColorValue: NSString = "#111111" { didSet { updateModel() } }
  @objc var accentColorValue: NSString = "#111111" { didSet { updateModel() } }
  @objc var showsSummary: Bool = false { didSet { updateModel() } }
  @objc var summaryRecordedDays: NSNumber = 0 { didSet { updateModel() } }
  @objc var summaryTotalDays: NSNumber = 0 { didSet { updateModel() } }
  @objc var summaryIndiaDays: NSNumber = 0 { didSet { updateModel() } }
  @objc var summaryAbroadDays: NSNumber = 0 { didSet { updateModel() } }
  @objc var summaryTravelDays: NSNumber = 0 { didSet { updateModel() } }
  @objc var summaryPendingDays: NSNumber = 0 { didSet { updateModel() } }
  @objc var summaryCountryText: NSString = "No countries tracked" { didSet { updateModel() } }
  @objc var summaryStatusText: NSString = "" { didSet { updateModel() } }
  @objc var summaryCardColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var summaryInputFillColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var summaryInputBorderColorValue: NSString = "#d1d5db" { didSet { updateModel() } }
  @objc var summaryMutedColorValue: NSString = "#6b7280" { didSet { updateModel() } }
  @objc var onDayPress: RCTBubblingEventBlock? { didSet { model.onDayPress = onDayPress } }
  @objc var onPreviousMonth: RCTBubblingEventBlock? { didSet { model.onPreviousMonth = onPreviousMonth } }
  @objc var onNextMonth: RCTBubblingEventBlock? { didSet { model.onNextMonth = onNextMonth } }

  private let model = CalendarMonthGridModel()
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

    let controller = UIHostingController(rootView: AnyView(CalendarMonthGridRootView(model: model)))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    addSubview(controller.view)
  }

  private func updateModel() {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }

      let nextMonthDate = String(self.monthDate)
      let transitionDirection = calendarMonthGridMonthDirection(from: self.model.monthDate, to: nextMonthDate)

      self.model.monthTransitionDirection = transitionDirection
      if transitionDirection == 0 {
        self.model.monthDate = nextMonthDate
      } else {
        withAnimation(calendarMonthGridSlideAnimation) {
          self.model.monthDate = nextMonthDate
        }
      }
      self.model.selectedDate = String(self.selectedDate)
      self.model.dayRecords = self.parseDayRecords()
      self.model.foreground = String(self.foregroundColorValue)
      self.model.weekday = String(self.weekdayColorValue)
      self.model.accent = String(self.accentColorValue)
      self.model.showsSummary = self.showsSummary
      self.model.summaryRecordedDays = self.summaryRecordedDays.intValue
      self.model.summaryTotalDays = self.summaryTotalDays.intValue
      self.model.summaryIndiaDays = self.summaryIndiaDays.intValue
      self.model.summaryAbroadDays = self.summaryAbroadDays.intValue
      self.model.summaryTravelDays = self.summaryTravelDays.intValue
      self.model.summaryPendingDays = self.summaryPendingDays.intValue
      self.model.summaryCountryText = String(self.summaryCountryText)
      self.model.summaryStatusText = String(self.summaryStatusText)
      self.model.summaryCard = String(self.summaryCardColorValue)
      self.model.summaryInputFill = String(self.summaryInputFillColorValue)
      self.model.summaryInputBorder = String(self.summaryInputBorderColorValue)
      self.model.summaryMuted = String(self.summaryMutedColorValue)
    }
  }

  private func parseDayRecords() -> [CalendarMonthGridRecord] {
    dayRecords.compactMap { item in
      guard let dictionary = item as? NSDictionary,
            let date = dictionary["date"] as? String
      else { return nil }

      let countryCode = dictionary["countryCode"] as? String ?? ""
      return CalendarMonthGridRecord(date: date, countryCode: countryCode)
    }
  }
}

@objc(CalendarMonthGridViewManager)
final class CalendarMonthGridViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    CalendarMonthGridHostingView()
  }
}

private struct CalendarMonthGridRootView: View {
  @ObservedObject var model: CalendarMonthGridModel
  @State private var dragTranslation: CGFloat = 0

  private var colors: CalendarMonthGridColors {
    CalendarMonthGridColors(model: model)
  }
  private var visibleMonth: Date {
    calendarMonthGridStartOfMonth(calendarMonthGridDate(from: model.monthDate) ?? Date())
  }
  private var cells: [CalendarMonthGridCell?] {
    buildCalendarMonthGridCells(visibleMonth)
  }
  private var recordByDate: [String: String] {
    Dictionary(uniqueKeysWithValues: model.dayRecords.map { ($0.date, $0.countryCode) })
  }
  private var todayIso: String {
    calendarMonthGridISODate(Date())
  }
  private var monthSwipeGesture: some Gesture {
    DragGesture(minimumDistance: 16, coordinateSpace: .local)
      .onChanged { value in
        guard abs(value.translation.width) > abs(value.translation.height) else { return }
        dragTranslation = value.translation.width * 0.18
      }
      .onEnded { value in
        let horizontalTranslation = value.translation.width
        let projectedTranslation = value.predictedEndTranslation.width
        let isHorizontalSwipe = abs(horizontalTranslation) > abs(value.translation.height)

        withAnimation(calendarMonthGridSlideAnimation) {
          dragTranslation = 0
        }

        guard isHorizontalSwipe else { return }

        if horizontalTranslation <= -calendarMonthGridSwipeThreshold || projectedTranslation <= -calendarMonthGridSwipeProjectedThreshold {
          model.onNextMonth?([:])
        } else if horizontalTranslation >= calendarMonthGridSwipeThreshold || projectedTranslation >= calendarMonthGridSwipeProjectedThreshold {
          model.onPreviousMonth?([:])
        }
      }
  }

  var body: some View {
    VStack(spacing: 0) {
      if model.showsSummary {
        CalendarMonthSummaryPanel(model: model, colors: colors)
          .padding(.bottom, 40)
      }

      HStack(spacing: 0) {
        ForEach(calendarMonthGridWeekdays, id: \.self) { weekday in
          Text(weekday)
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(colors.weekday)
            .lineLimit(1)
            .frame(maxWidth: .infinity)
        }
      }
      .padding(.bottom, 16)

      ZStack(alignment: .top) {
        monthGrid
          .id(model.monthDate)
          .offset(x: dragTranslation)
          .transition(calendarMonthGridSlideTransition(direction: model.monthTransitionDirection))
      }
      .frame(height: 336, alignment: .top)
      .clipped()
      .contentShape(Rectangle())
      .simultaneousGesture(monthSwipeGesture)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
  }

  private var monthGrid: some View {
    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
      ForEach(Array(cells.enumerated()), id: \.offset) { _, cell in
        if let cell {
          CalendarMonthGridDayCell(
            cell: cell,
            countryCode: recordByDate[cell.iso],
            isSelected: cell.iso == model.selectedDate,
            isFuture: cell.iso > todayIso,
            colors: colors
          ) {
            model.onDayPress?(["date": cell.iso])
          }
        } else {
          Color.clear
            .frame(maxWidth: .infinity)
            .frame(height: 56)
        }
      }
    }
  }
}

private struct CalendarMonthSummaryPanel: View {
  @ObservedObject var model: CalendarMonthGridModel
  let colors: CalendarMonthGridColors

  private var trackedSummary: String {
    "\(model.summaryRecordedDays)/\(model.summaryTotalDays) days tracked"
  }

  var body: some View {
    VStack(spacing: 12) {
      HStack(spacing: 12) {
        Text("Month Summary")
          .font(.system(size: 14, weight: .heavy))
          .foregroundStyle(colors.foreground)
          .lineLimit(1)

        Spacer(minLength: 8)

        Text(trackedSummary)
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(colors.summaryMuted)
          .lineLimit(1)
          .minimumScaleFactor(0.78)
          .calendarMonthGridBlurReplace(id: trackedSummary)
      }

      HStack(spacing: 8) {
        CalendarMonthSummaryMetricView(label: "India", value: model.summaryIndiaDays, colors: colors)
        CalendarMonthSummaryMetricView(label: "Abroad", value: model.summaryAbroadDays, colors: colors)
        CalendarMonthSummaryMetricView(label: "Travel", value: model.summaryTravelDays, colors: colors)
        CalendarMonthSummaryMetricView(label: "Pending", value: model.summaryPendingDays, colors: colors)
      }

      Rectangle()
        .fill(colors.summaryInputBorder)
        .frame(height: 1)

      HStack(spacing: 12) {
        Text(model.summaryCountryText)
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(colors.summaryMuted)
          .lineLimit(1)
          .minimumScaleFactor(0.72)
          .frame(maxWidth: .infinity, alignment: .leading)
          .calendarMonthGridBlurReplace(id: model.summaryCountryText)

        if !model.summaryStatusText.isEmpty {
          Text(model.summaryStatusText)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(colors.weekday)
            .lineLimit(1)
            .minimumScaleFactor(0.78)
            .calendarMonthGridBlurReplace(id: model.summaryStatusText)
        }
      }
    }
    .padding(14)
    .background(colors.summaryCard, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 24, style: .continuous)
        .stroke(colors.summaryInputBorder, lineWidth: 1)
    }
  }
}

private struct CalendarMonthSummaryMetricView: View {
  let label: String
  let value: Int
  let colors: CalendarMonthGridColors

  var body: some View {
    VStack(spacing: 2) {
      Text("\(value)")
        .font(.system(size: 18, weight: .heavy))
        .foregroundStyle(colors.foreground)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .calendarMonthGridBlurReplace(id: "\(label)-\(value)")

      Text(label)
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(colors.summaryMuted)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }
    .frame(maxWidth: .infinity, minHeight: 62)
    .padding(.horizontal, 6)
    .padding(.vertical, 8)
    .background(colors.summaryInputFill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(colors.summaryInputBorder, lineWidth: 1)
    }
  }
}

private struct CalendarMonthGridDayCell: View {
  let cell: CalendarMonthGridCell
  let countryCode: String?
  let isSelected: Bool
  let isFuture: Bool
  let colors: CalendarMonthGridColors
  let action: () -> Void

  private var hasCountry: Bool {
    guard let countryCode else { return false }
    return !countryCode.isEmpty
  }
  private var dayOpacity: Double {
    isFuture && !hasCountry ? 0.56 : 1
  }

  var body: some View {
    Button(action: action) {
      VStack(spacing: 0) {
        Text("\(cell.day)")
          .font(.system(size: 16, weight: .regular))
          .foregroundStyle(isSelected ? colors.accent : colors.foreground)
          .lineLimit(1)
          .frame(height: hasCountry ? 20 : 22)

        if hasCountry {
          Text(calendarMonthGridFlag(for: countryCode ?? ""))
            .font(.system(size: 14))
            .lineLimit(1)
            .frame(height: 16)
        }
      }
      .frame(width: 44, height: 44)
      .calendarMonthGridGlassCircle(
        fill: isSelected ? colors.accent.opacity(0.16) : colors.foreground.opacity(0.06),
        border: isSelected ? colors.accent.opacity(0.26) : colors.foreground.opacity(0.12)
      )
      .opacity(dayOpacity)
      .frame(maxWidth: .infinity)
      .frame(height: 56, alignment: .top)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel(calendarMonthGridAccessibilityLabel(cell: cell, countryCode: countryCode))
  }
}

private struct CalendarMonthGridColors {
  let foreground: Color
  let weekday: Color
  let accent: Color
  let summaryCard: Color
  let summaryInputFill: Color
  let summaryInputBorder: Color
  let summaryMuted: Color

  init(model: CalendarMonthGridModel) {
    foreground = Color(uiColor: UIColor(calendarMonthGridColorString: model.foreground) ?? .label)
    weekday = Color(uiColor: UIColor(calendarMonthGridColorString: model.weekday) ?? .label)
    accent = Color(uiColor: UIColor(calendarMonthGridColorString: model.accent) ?? .label)
    summaryCard = Color(uiColor: UIColor(calendarMonthGridColorString: model.summaryCard) ?? .secondarySystemBackground)
    summaryInputFill = Color(uiColor: UIColor(calendarMonthGridColorString: model.summaryInputFill) ?? .tertiarySystemBackground)
    summaryInputBorder = Color(uiColor: UIColor(calendarMonthGridColorString: model.summaryInputBorder) ?? .separator)
    summaryMuted = Color(uiColor: UIColor(calendarMonthGridColorString: model.summaryMuted) ?? .secondaryLabel)
  }
}

private extension View {
  @ViewBuilder
  func calendarMonthGridBlurReplace<ID: Hashable>(id: ID) -> some View {
    self
      .id(id)
      .transition(.calendarMonthGridVisibleBlurReplace)
      .animation(calendarMonthGridBlurReplaceAnimation, value: id)
  }

  @ViewBuilder
  func calendarMonthGridGlassCircle(fill: Color, border: Color) -> some View {
    if #available(iOS 26.0, *) {
      self
        .background(fill, in: Circle())
        .glassEffect(.regular.interactive(), in: Circle())
    } else {
      self
        .background(.ultraThinMaterial, in: Circle())
        .background(fill.opacity(0.72), in: Circle())
        .overlay {
          Circle().stroke(border, lineWidth: 1)
        }
    }
  }
}

private struct CalendarMonthGridBlurReplaceModifier: ViewModifier {
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
  static var calendarMonthGridVisibleBlurReplace: AnyTransition {
    .asymmetric(
      insertion: .modifier(
        active: CalendarMonthGridBlurReplaceModifier(radius: 8, opacity: 0, scale: 0.96),
        identity: CalendarMonthGridBlurReplaceModifier(radius: 0, opacity: 1, scale: 1)
      ),
      removal: .modifier(
        active: CalendarMonthGridBlurReplaceModifier(radius: 8, opacity: 0, scale: 0.96),
        identity: CalendarMonthGridBlurReplaceModifier(radius: 0, opacity: 1, scale: 1)
      )
    )
  }
}

private func buildCalendarMonthGridCells(_ month: Date) -> [CalendarMonthGridCell?] {
  let calendar = calendarMonthGridCalendar()
  let monthStart = calendarMonthGridStartOfMonth(month)
  let range = calendar.range(of: .day, in: .month, for: monthStart) ?? 1..<1
  let leadingDays = calendar.component(.weekday, from: monthStart) - 1
  var cells = Array<CalendarMonthGridCell?>(repeating: nil, count: leadingDays)

  for day in range {
    guard let date = calendar.date(byAdding: .day, value: day - 1, to: monthStart) else { continue }
    cells.append(CalendarMonthGridCell(iso: calendarMonthGridISODate(date), day: day))
  }

  while cells.count < 42 {
    cells.append(nil)
  }

  return cells
}

private func calendarMonthGridDate(from value: String) -> Date? {
  calendarMonthGridISOFormatter().date(from: value)
}

private func calendarMonthGridISODate(_ date: Date) -> String {
  calendarMonthGridISOFormatter().string(from: date)
}

private func calendarMonthGridISOFormatter() -> DateFormatter {
  let formatter = DateFormatter()
  formatter.calendar = calendarMonthGridCalendar()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = TimeZone(secondsFromGMT: 0)
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter
}

private func calendarMonthGridCalendar() -> Calendar {
  var calendar = Calendar(identifier: .gregorian)
  if let utc = TimeZone(secondsFromGMT: 0) {
    calendar.timeZone = utc
  }
  return calendar
}

private func calendarMonthGridStartOfMonth(_ date: Date) -> Date {
  let calendar = calendarMonthGridCalendar()
  let components = calendar.dateComponents([.year, .month], from: date)
  return calendar.date(from: components) ?? date
}

private func calendarMonthGridMonthDirection(from currentValue: String, to nextValue: String) -> Int {
  guard currentValue != nextValue,
        let currentDate = calendarMonthGridDate(from: currentValue),
        let nextDate = calendarMonthGridDate(from: nextValue)
  else { return 0 }

  let calendar = calendarMonthGridCalendar()
  let currentComponents = calendar.dateComponents([.year, .month], from: currentDate)
  let nextComponents = calendar.dateComponents([.year, .month], from: nextDate)
  let currentMonthIndex = (currentComponents.year ?? 0) * 12 + (currentComponents.month ?? 0)
  let nextMonthIndex = (nextComponents.year ?? 0) * 12 + (nextComponents.month ?? 0)

  if nextMonthIndex > currentMonthIndex { return 1 }
  if nextMonthIndex < currentMonthIndex { return -1 }
  return 0
}

private func calendarMonthGridSlideTransition(direction: Int) -> AnyTransition {
  guard direction != 0 else { return .opacity }

  let insertionEdge: Edge = direction > 0 ? .trailing : .leading
  let removalEdge: Edge = direction > 0 ? .leading : .trailing

  return .asymmetric(
    insertion: .move(edge: insertionEdge).combined(with: .opacity),
    removal: .move(edge: removalEdge).combined(with: .opacity)
  )
}

private func calendarMonthGridAccessibilityLabel(cell: CalendarMonthGridCell, countryCode: String?) -> String {
  guard let date = calendarMonthGridDate(from: cell.iso) else {
    return countryCode?.isEmpty == false ? "\(cell.day), \(countryCode ?? "")" : "\(cell.day)"
  }

  let formatter = DateFormatter()
  formatter.calendar = calendarMonthGridCalendar()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = TimeZone(secondsFromGMT: 0)
  formatter.dateFormat = "MMMM d"
  let dateLabel = formatter.string(from: date)
  guard let countryCode, !countryCode.isEmpty else { return dateLabel }
  return "\(dateLabel), \(countryCode)"
}

private func calendarMonthGridFlag(for countryCode: String) -> String {
  let base: UInt32 = 127397
  var scalars = String.UnicodeScalarView()

  for scalar in countryCode.uppercased().unicodeScalars {
    guard let regional = UnicodeScalar(base + scalar.value) else { return "" }
    scalars.append(regional)
  }

  return String(scalars)
}

private extension UIColor {
  convenience init?(calendarMonthGridColorString string: String) {
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
      else { return nil }

      self.init(red: red / 255, green: green / 255, blue: blue / 255, alpha: alpha)
      return
    }

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
