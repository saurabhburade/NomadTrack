import React
import SwiftUI
import UIKit

private let calendarMonthGridWeekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

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

  var onDayPress: RCTBubblingEventBlock?
}

final class CalendarMonthGridHostingView: UIView {
  @objc var monthDate: NSString = "" { didSet { updateModel() } }
  @objc var selectedDate: NSString = "" { didSet { updateModel() } }
  @objc var dayRecords: NSArray = [] { didSet { updateModel() } }
  @objc var foregroundColorValue: NSString = "#111111" { didSet { updateModel() } }
  @objc var weekdayColorValue: NSString = "#111111" { didSet { updateModel() } }
  @objc var accentColorValue: NSString = "#111111" { didSet { updateModel() } }
  @objc var onDayPress: RCTBubblingEventBlock? { didSet { model.onDayPress = onDayPress } }

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

      self.model.monthDate = String(self.monthDate)
      self.model.selectedDate = String(self.selectedDate)
      self.model.dayRecords = self.parseDayRecords()
      self.model.foreground = String(self.foregroundColorValue)
      self.model.weekday = String(self.weekdayColorValue)
      self.model.accent = String(self.accentColorValue)
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

  var body: some View {
    VStack(spacing: 0) {
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
    .frame(maxWidth: .infinity, alignment: .top)
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
      VStack(spacing: 5) {
        Text("\(cell.day)")
          .font(.system(size: 16, weight: .regular))
          .foregroundStyle(isSelected ? colors.accent : colors.foreground)
          .lineLimit(1)
          .frame(maxWidth: .infinity)
          .opacity(dayOpacity)

        Text(hasCountry ? calendarMonthGridFlag(for: countryCode ?? "") : "")
          .font(.system(size: 17))
          .lineLimit(1)
          .frame(height: 22)
          .frame(maxWidth: .infinity)
      }
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

  init(model: CalendarMonthGridModel) {
    foreground = Color(uiColor: UIColor(calendarMonthGridColorString: model.foreground) ?? .label)
    weekday = Color(uiColor: UIColor(calendarMonthGridColorString: model.weekday) ?? .label)
    accent = Color(uiColor: UIColor(calendarMonthGridColorString: model.accent) ?? .label)
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

  while cells.count % 7 != 0 {
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
