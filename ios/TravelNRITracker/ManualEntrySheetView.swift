import SwiftUI
import UIKit

private let manualEntryMinDate = "1900-01-01"
private let manualEntryMaxDate = "2100-12-31"
private let manualEntryWeekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

typealias ManualEntryEventBlock = (NSDictionary) -> Void

private struct ManualEntryCountry: Identifiable, Equatable {
  let code: String
  let name: String

  var id: String { code }
}

private struct ManualEntryExistingRecord: Identifiable, Equatable {
  let date: String
  let countryCode: String

  var id: String { date }
}

private final class ManualEntrySheetModel: ObservableObject {
  @Published var visible = false
  @Published var isSaving = false
  @Published var initialDate = ""
  @Published var countries: [ManualEntryCountry] = []
  @Published var existingRecords: [ManualEntryExistingRecord] = []

  @Published var foreground = "#ffffff"
  @Published var muted = "#a1a1a8"
  @Published var card = "#1c1c1e"
  @Published var chipFill = "#2c2c2e"
  @Published var inputFill = "#202022"
  @Published var inputBorder = "rgba(255,255,255,0.16)"
  @Published var menuGlassFill = "#1c1c1e"
  @Published var selectedFill = "#333333"
  @Published var selectedBorder = "rgba(255,255,255,0.42)"
  @Published var selectedForeground = "#ffffff"
  @Published var actionPrimaryForeground = "#000000"
  @Published var actionSecondaryBorder = "rgba(255,255,255,0.24)"
  @Published var errorFill = "rgba(127,29,29,0.18)"
  @Published var errorBorder = "rgba(248,113,113,0.3)"
  @Published var errorText = "#fca5a5"
  @Published var placeholder = "#6d6d72"
  @Published var weekday = "#6d6d72"

  var onClose: ManualEntryEventBlock?
  var onClear: ManualEntryEventBlock?
  var onConfirm: ManualEntryEventBlock?
}

@objc(ManualEntrySheetHostingView)
final class ManualEntrySheetHostingView: UIView {
  @objc var visible: Bool = false { didSet { updateModel() } }
  @objc var isSaving: Bool = false { didSet { updateModel() } }
  @objc var initialDate: NSString = "" { didSet { updateModel() } }
  @objc var countryOptions: NSArray = [] { didSet { updateModel() } }
  @objc var existingRecords: NSArray = [] { didSet { updateModel() } }

  @objc var foregroundColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var mutedColorValue: NSString = "#a1a1a8" { didSet { updateModel() } }
  @objc var cardColorValue: NSString = "#1c1c1e" { didSet { updateModel() } }
  @objc var chipFillColorValue: NSString = "#2c2c2e" { didSet { updateModel() } }
  @objc var inputFillColorValue: NSString = "#202022" { didSet { updateModel() } }
  @objc var inputBorderColorValue: NSString = "rgba(255,255,255,0.16)" { didSet { updateModel() } }
  @objc var menuGlassFillColorValue: NSString = "#1c1c1e" { didSet { updateModel() } }
  @objc var selectedFillColorValue: NSString = "#333333" { didSet { updateModel() } }
  @objc var selectedBorderColorValue: NSString = "rgba(255,255,255,0.42)" { didSet { updateModel() } }
  @objc var selectedForegroundColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var actionPrimaryForegroundColorValue: NSString = "#000000" { didSet { updateModel() } }
  @objc var actionSecondaryBorderColorValue: NSString = "rgba(255,255,255,0.24)" { didSet { updateModel() } }
  @objc var errorFillColorValue: NSString = "rgba(127,29,29,0.18)" { didSet { updateModel() } }
  @objc var errorBorderColorValue: NSString = "rgba(248,113,113,0.3)" { didSet { updateModel() } }
  @objc var errorTextColorValue: NSString = "#fca5a5" { didSet { updateModel() } }
  @objc var placeholderColorValue: NSString = "#6d6d72" { didSet { updateModel() } }
  @objc var weekdayColorValue: NSString = "#6d6d72" { didSet { updateModel() } }

  @objc var onClose: ManualEntryEventBlock? { didSet { model.onClose = onClose } }
  @objc var onClear: ManualEntryEventBlock? { didSet { model.onClear = onClear } }
  @objc var onConfirm: ManualEntryEventBlock? { didSet { model.onConfirm = onConfirm } }

  private let model = ManualEntrySheetModel()
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

    let controller = UIHostingController(rootView: AnyView(ManualEntrySheetRootView(model: model)))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    addSubview(controller.view)
  }

  private func updateModel() {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.model.visible = self.visible
      self.model.isSaving = self.isSaving
      self.model.initialDate = String(self.initialDate)
      self.model.countries = self.parseCountries()
      self.model.existingRecords = self.parseExistingRecords()

      self.model.foreground = String(self.foregroundColorValue)
      self.model.muted = String(self.mutedColorValue)
      self.model.card = String(self.cardColorValue)
      self.model.chipFill = String(self.chipFillColorValue)
      self.model.inputFill = String(self.inputFillColorValue)
      self.model.inputBorder = String(self.inputBorderColorValue)
      self.model.menuGlassFill = String(self.menuGlassFillColorValue)
      self.model.selectedFill = String(self.selectedFillColorValue)
      self.model.selectedBorder = String(self.selectedBorderColorValue)
      self.model.selectedForeground = String(self.selectedForegroundColorValue)
      self.model.actionPrimaryForeground = String(self.actionPrimaryForegroundColorValue)
      self.model.actionSecondaryBorder = String(self.actionSecondaryBorderColorValue)
      self.model.errorFill = String(self.errorFillColorValue)
      self.model.errorBorder = String(self.errorBorderColorValue)
      self.model.errorText = String(self.errorTextColorValue)
      self.model.placeholder = String(self.placeholderColorValue)
      self.model.weekday = String(self.weekdayColorValue)
    }
  }

  private func parseCountries() -> [ManualEntryCountry] {
    countryOptions.compactMap { option in
      guard let dictionary = option as? NSDictionary,
            let code = dictionary["code"] as? String,
            let name = dictionary["name"] as? String
      else { return nil }

      return ManualEntryCountry(code: code, name: name)
    }
  }

  private func parseExistingRecords() -> [ManualEntryExistingRecord] {
    existingRecords.compactMap { option in
      guard let dictionary = option as? NSDictionary,
            let date = dictionary["date"] as? String,
            let countryCode = dictionary["countryCode"] as? String
      else { return nil }

      return ManualEntryExistingRecord(date: date, countryCode: countryCode)
    }
  }
}

private struct ManualEntrySheetRootView: View {
  @ObservedObject var model: ManualEntrySheetModel
  @State private var startDate = ""
  @State private var endDate = ""
  @State private var activeDateField: ManualEntryDateField = .start
  @State private var visibleMonth = manualEntryStartOfMonth(Date())
  @State private var countryInput = ""
  @State private var errorMessage: String?
  @FocusState private var focusedField: Bool

  var body: some View {
    Color.clear
      .sheet(isPresented: Binding(
        get: { model.visible },
        set: { isPresented in
          if !isPresented && model.isSaving {
            model.visible = true
            return
          }

          if !isPresented && model.visible {
            model.visible = false
            model.onClose?(NSDictionary())
          } else {
            model.visible = isPresented
          }
        }
      )) {
        ManualEntrySheetContent(
          model: model,
          startDate: $startDate,
          endDate: $endDate,
          activeDateField: $activeDateField,
          visibleMonth: $visibleMonth,
          countryInput: $countryInput,
          errorMessage: $errorMessage,
          focusedField: $focusedField
        )
        .manualEntrySheetPresentation()
        .interactiveDismissDisabled(model.isSaving)
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
    let initial = isValidManualEntryISODate(model.initialDate) ? model.initialDate : manualEntryISODate(Date())
    startDate = initial
    endDate = defaultManualEntryEndDate(initial)
    activeDateField = .start
    visibleMonth = manualEntryStartOfMonth(manualEntryDate(from: initial) ?? Date())
    countryInput = ""
    errorMessage = nil
    focusedField = false
  }
}

private enum ManualEntryDateField: Hashable {
  case start
  case end
}

private struct ManualEntrySheetContent: View {
  @ObservedObject var model: ManualEntrySheetModel
  @Binding var startDate: String
  @Binding var endDate: String
  @Binding var activeDateField: ManualEntryDateField
  @Binding var visibleMonth: Date
  @Binding var countryInput: String
  @Binding var errorMessage: String?
  var focusedField: FocusState<Bool>.Binding

  private var colors: ManualEntryColors { ManualEntryColors(model: model) }
  private var existingRecordByDate: [String: String] {
    Dictionary(uniqueKeysWithValues: model.existingRecords.map { ($0.date, $0.countryCode) })
  }
  private var selectedCountry: ManualEntryCountry? {
    resolveManualEntryCountry(countryInput, countries: model.countries)
  }
  private var matchingCountries: [ManualEntryCountry] {
    let input = normalizeManualEntrySearchText(countryInput)
    let matches: [ManualEntryCountry]

    if input.isEmpty {
      matches = model.countries
    } else {
      matches = model.countries.filter { country in
        normalizeManualEntrySearchText(country.name).contains(input) || country.code.lowercased().hasPrefix(input)
      }
    }

    return Array(matches.prefix(4))
  }

  var body: some View {
    ZStack(alignment: .bottom) {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {
        Capsule()
          .fill(colors.inputBorder.opacity(0.82))
          .frame(width: 42, height: 4)
          .frame(maxWidth: .infinity)
          .padding(.top, 10)
          .padding(.bottom, 24)

        HStack(spacing: 12) {
          Image(systemName: "pencil.line")
            .font(.system(size: 20, weight: .semibold))
            .foregroundStyle(colors.foreground)
            .frame(width: 42, height: 42)
            .manualEntryGlassBackground(fill: colors.card, border: colors.inputBorder, shape: Circle())

          VStack(alignment: .leading, spacing: 2) {
            Text("Manual Entry")
              .font(.system(size: 18, weight: .bold))
              .foregroundStyle(colors.foreground)
              .lineLimit(1)
            Text("History")
              .font(.system(size: 13, weight: .medium))
              .foregroundStyle(colors.muted)
              .lineLimit(1)
          }
        }

        ManualEntryDateRangePicker(
          startDate: $startDate,
          endDate: $endDate,
          activeDateField: $activeDateField,
          visibleMonth: $visibleMonth,
          existingRecordByDate: existingRecordByDate,
          colors: colors,
          onChange: { errorMessage = nil }
        )
        .padding(.top, 26)

        VStack(alignment: .leading, spacing: 7) {
          Text("Country")
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(colors.muted)

          HStack(spacing: 10) {
            Image(systemName: "globe.europe.africa")
              .font(.system(size: 18, weight: .semibold))
              .foregroundStyle(colors.muted)

            TextField("Country name or code", text: $countryInput, prompt: Text("Country name or code").foregroundColor(colors.placeholder))
              .font(.system(size: 17, weight: .semibold))
              .foregroundStyle(colors.foreground)
              .focused(focusedField)
              .textInputAutocapitalization(.words)
              .autocorrectionDisabled()
          }
          .padding(.horizontal, 14)
          .frame(minHeight: 48)
          .manualEntryGlassBackground(fill: colors.inputFill, border: colors.inputBorder, shape: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .padding(.top, 24)

        countryChips
        .padding(.top, 18)

        if let errorMessage {
          Text(errorMessage)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(colors.errorText)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .manualEntryGlassBackground(fill: colors.errorFill, border: colors.errorBorder, shape: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .padding(.top, 14)
        }

        }
        .padding(.horizontal, 22)
        .padding(.bottom, 116)
      }

      actionFooter
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background {
      if #available(iOS 16.0, *) {
        colors.background
          .opacity(0.58)
          .background(.ultraThinMaterial)
          .ignoresSafeArea()
      } else {
        colors.background.ignoresSafeArea()
      }
    }
    .tint(colors.foreground)
    .onChange(of: countryInput) { _ in errorMessage = nil }
  }

  private var actionFooter: some View {
    VStack(spacing: 0) {
      LinearGradient(
        stops: [
          .init(color: colors.background.opacity(0), location: 0),
          .init(color: colors.background.opacity(0.74), location: 1)
        ],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(height: 46)
      .allowsHitTesting(false)

      HStack(alignment: .center, spacing: 8) {
        Button(role: .destructive) {
          requestClear()
        } label: {
          ManualEntryActionLabel(title: "Clear", systemImage: "trash", color: colors.errorText)
        }
        .disabled(model.isSaving)
        .manualEntryGlassButtonStyle(tint: colors.errorText, prominent: false, controlSize: .small)

        Button(role: .cancel) {
          focusedField.wrappedValue = false
          model.visible = false
          model.onClose?(NSDictionary())
        } label: {
          ManualEntryActionLabel(title: "Cancel", color: colors.foreground)
        }
        .disabled(model.isSaving)
        .manualEntryGlassButtonStyle(tint: colors.foreground, prominent: false, controlSize: .small)

        Button {
          submit()
        } label: {
          ManualEntryActionLabel(
            title: model.isSaving ? "Saving" : "Confirm",
            systemImage: model.isSaving ? nil : "checkmark",
            color: colors.actionPrimaryForeground,
            isLoading: model.isSaving
          )
        }
        .disabled(model.isSaving)
        .manualEntryGlassButtonStyle(tint: colors.actionPrimaryForeground, prominent: true, controlSize: .small)
      }
      .padding(.horizontal, 28)
      .padding(.top, 0)
      .padding(.bottom, 14)
      .background(colors.background.opacity(0.74))
    }
  }

  @ViewBuilder
  private var countryChips: some View {
    if #available(iOS 16.0, *) {
      ManualEntryFlowLayout(spacing: 8) {
        countryChipButtons
      }
    } else {
      LazyVGrid(columns: [GridItem(.adaptive(minimum: 118), spacing: 8, alignment: .leading)], alignment: .leading, spacing: 8) {
        countryChipButtons
      }
    }
  }

  @ViewBuilder
  private var countryChipButtons: some View {
    ForEach(matchingCountries) { country in
      ManualEntryCountryChip(
        country: country,
        isSelected: selectedCountry?.code == country.code,
        colors: colors
      ) {
        countryInput = country.name
        errorMessage = nil
        focusedField.wrappedValue = false
      }
    }
  }

  private func requestClear() {
    focusedField.wrappedValue = false

    guard isValidManualEntryISODate(startDate), isValidManualEntryISODate(endDate) else {
      errorMessage = "Enter dates as YYYY-MM-DD."
      return
    }

    guard startDate <= endDate else {
      errorMessage = "End date must be on or after start date."
      return
    }

    model.onClear?([
      "startDate": startDate,
      "endDate": endDate
    ] as NSDictionary)
  }

  private func submit() {
    focusedField.wrappedValue = false

    guard isValidManualEntryISODate(startDate), isValidManualEntryISODate(endDate) else {
      errorMessage = "Enter dates as YYYY-MM-DD."
      return
    }

    guard startDate <= endDate else {
      errorMessage = "End date must be on or after start date."
      return
    }

    guard let country = selectedCountry else {
      errorMessage = "Enter a recognized country name or 2-letter code."
      return
    }

    model.onConfirm?([
      "startDate": startDate,
      "endDate": endDate,
      "countryCode": country.code,
      "countryName": country.name
    ] as NSDictionary)
  }
}

private struct ManualEntryDateRangePicker: View {
  @Binding var startDate: String
  @Binding var endDate: String
  @Binding var activeDateField: ManualEntryDateField
  @Binding var visibleMonth: Date
  let existingRecordByDate: [String: String]
  let colors: ManualEntryColors
  let onChange: () -> Void

  private var activeMinDate: String {
    activeDateField == .end ? startDate : manualEntryMinDate
  }
  private var activeMaxDate: String { manualEntryMaxDate }
  private var monthCells: [ManualEntryMonthCell?] {
    buildManualEntryMonthCells(visibleMonth)
  }
  private var previousMonth: Date {
    manualEntryCalendar().date(byAdding: .month, value: -1, to: visibleMonth) ?? visibleMonth
  }
  private var nextMonth: Date {
    manualEntryCalendar().date(byAdding: .month, value: 1, to: visibleMonth) ?? visibleMonth
  }
  private var canShowPreviousMonth: Bool {
    manualEntryISODate(manualEntryEndOfMonth(previousMonth)) >= activeMinDate
  }
  private var canShowNextMonth: Bool {
    manualEntryISODate(manualEntryStartOfMonth(nextMonth)) <= activeMaxDate
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 10) {
        ManualEntryRangeBoundaryButton(active: activeDateField == .start, iso: startDate, label: "Start", colors: colors) {
          activeDateField = .start
          if let date = manualEntryDate(from: startDate) {
            visibleMonth = manualEntryStartOfMonth(date)
          }
        }

        ManualEntryRangeBoundaryButton(active: activeDateField == .end, iso: endDate, label: "End", colors: colors) {
          activeDateField = .end
          if let date = manualEntryDate(from: endDate) {
            visibleMonth = manualEntryStartOfMonth(date)
          }
        }
      }

      VStack(spacing: 0) {
        HStack {
          Button {
            if canShowPreviousMonth { visibleMonth = previousMonth }
          } label: {
            Image(systemName: "chevron.left")
              .font(.system(size: 20, weight: .bold))
              .foregroundStyle(colors.foreground.opacity(canShowPreviousMonth ? 1 : 0.26))
              .frame(width: 34, height: 34)
              .manualEntryGlassBackground(fill: colors.chipFill, border: .clear, shape: Circle())
          }
          .buttonStyle(.plain)
          .disabled(!canShowPreviousMonth)

          Spacer()

          Text(manualEntryMonthTitle(visibleMonth))
            .font(.system(size: 15, weight: .heavy))
            .foregroundStyle(colors.foreground)

          Spacer()

          Button {
            if canShowNextMonth { visibleMonth = nextMonth }
          } label: {
            Image(systemName: "chevron.right")
              .font(.system(size: 20, weight: .bold))
              .foregroundStyle(colors.foreground.opacity(canShowNextMonth ? 1 : 0.26))
              .frame(width: 34, height: 34)
              .manualEntryGlassBackground(fill: colors.chipFill, border: .clear, shape: Circle())
          }
          .buttonStyle(.plain)
          .disabled(!canShowNextMonth)
        }

        HStack(spacing: 0) {
          ForEach(manualEntryWeekdays, id: \.self) { weekday in
            Text(weekday)
              .font(.system(size: 11, weight: .bold))
              .foregroundStyle(colors.weekday)
              .frame(maxWidth: .infinity)
          }
        }
        .padding(.top, 8)

        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
          ForEach(Array(monthCells.enumerated()), id: \.offset) { _, cell in
            if let cell {
              ManualEntryCalendarDayCell(
                cell: cell,
                activeMinDate: activeMinDate,
                activeMaxDate: activeMaxDate,
                startDate: startDate,
                endDate: endDate,
                existingCountryCode: existingRecordByDate[cell.iso],
                colors: colors
              ) {
                selectDate(cell.iso)
              }
            } else {
              Color.clear.frame(height: 44)
            }
          }
        }
        .padding(.top, 6)
      }
      .padding(10)
      .manualEntryGlassBackground(fill: colors.inputFill, border: colors.inputBorder, shape: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
  }

  private func selectDate(_ iso: String) {
    guard iso >= activeMinDate, iso <= activeMaxDate else { return }

    onChange()

    if activeDateField == .start {
      startDate = iso
      endDate = defaultManualEntryEndDate(iso)
      activeDateField = .end
    } else {
      endDate = iso
      if iso < startDate {
        startDate = iso
      }
    }

    if let date = manualEntryDate(from: iso) {
      visibleMonth = manualEntryStartOfMonth(date)
    }
  }
}

private struct ManualEntryRangeBoundaryButton: View {
  let active: Bool
  let iso: String
  let label: String
  let colors: ManualEntryColors
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(alignment: .leading, spacing: 3) {
        Text(label)
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(active ? colors.selectedForeground.opacity(0.82) : colors.muted)
        Text(manualEntryCompactDate(iso))
          .font(.system(size: 15, weight: .heavy))
          .foregroundStyle(active ? colors.selectedForeground : colors.foreground)
          .lineLimit(1)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.horizontal, 12)
      .padding(.vertical, 6)
      .manualEntryGlassBackground(
        fill: active ? colors.selectedFill : colors.inputFill,
        border: active ? colors.selectedBorder : colors.inputBorder,
        shape: RoundedRectangle(cornerRadius: 16, style: .continuous)
      )
    }
    .buttonStyle(.plain)
  }
}

private struct ManualEntryCalendarDayCell: View {
  let cell: ManualEntryMonthCell
  let activeMinDate: String
  let activeMaxDate: String
  let startDate: String
  let endDate: String
  let existingCountryCode: String?
  let colors: ManualEntryColors
  let action: () -> Void

  private var disabled: Bool { cell.iso < activeMinDate || cell.iso > activeMaxDate }
  private var inRange: Bool { cell.iso >= startDate && cell.iso <= endDate }
  private var isStart: Bool { cell.iso == startDate }
  private var isEnd: Bool { cell.iso == endDate }
  private var isSelected: Bool { isStart || isEnd }
  private var isOnlyDay: Bool { startDate == endDate && isSelected }
  private var dayOpacity: Double {
    if disabled { return 0.34 }
    if cell.iso > manualEntryISODate(Date()) && !inRange { return 0.62 }
    return 1
  }

  var body: some View {
    Button(action: action) {
      ZStack(alignment: .bottom) {
        if inRange && !isOnlyDay {
          HStack(spacing: 0) {
            Rectangle()
              .fill(colors.chipFill.opacity(isStart ? 0 : 0.86))
            Rectangle()
              .fill(colors.chipFill.opacity(isEnd ? 0 : 0.86))
          }
          .frame(height: 30)
          .offset(y: -7)
        }

        VStack(spacing: -2) {
          Text("\(cell.day)")
            .font(.system(size: existingCountryCode == nil ? 14 : 10, weight: .bold))
            .foregroundStyle(isSelected ? colors.selectedForeground : colors.foreground)

          if let existingCountryCode {
            Text(manualEntryFlag(for: existingCountryCode))
              .font(.system(size: 10))
              .lineLimit(1)
          }
        }
          .frame(width: 30, height: 30)
          .manualEntryGlassBackground(
            fill: isSelected ? colors.selectedFill : .clear,
            border: isSelected ? colors.selectedBorder : .clear,
            shape: Circle()
          )
          .opacity(dayOpacity)
          .frame(maxHeight: .infinity, alignment: .center)
      }
      .frame(maxWidth: .infinity)
      .frame(height: 44)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .disabled(disabled)
  }
}

private struct ManualEntryCountryChip: View {
  let country: ManualEntryCountry
  let isSelected: Bool
  let colors: ManualEntryColors
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Text("\(country.name) (\(country.code))")
        .font(.system(size: 13, weight: .bold))
        .lineLimit(1)
        .foregroundStyle(isSelected ? colors.selectedForeground : colors.foreground)
        .padding(.horizontal, 12)
        .frame(height: 32)
        .manualEntryGlassBackground(
          fill: isSelected ? colors.selectedFill : colors.chipFill,
          border: isSelected ? colors.selectedBorder : colors.inputBorder,
          shape: Capsule()
        )
    }
    .buttonStyle(.plain)
  }
}

private struct ManualEntryColors {
  let foreground: Color
  let muted: Color
  let card: Color
  let chipFill: Color
  let inputFill: Color
  let inputBorder: Color
  let background: Color
  let selectedFill: Color
  let selectedBorder: Color
  let selectedForeground: Color
  let actionPrimaryForeground: Color
  let errorFill: Color
  let errorBorder: Color
  let errorText: Color
  let placeholder: Color
  let weekday: Color

  init(model: ManualEntrySheetModel) {
    foreground = Color(uiColor: UIColor(manualEntryColorString: model.foreground) ?? .label)
    muted = Color(uiColor: UIColor(manualEntryColorString: model.muted) ?? .secondaryLabel)
    card = Color(uiColor: UIColor(manualEntryColorString: model.card) ?? .secondarySystemBackground)
    chipFill = Color(uiColor: UIColor(manualEntryColorString: model.chipFill) ?? .tertiarySystemBackground)
    inputFill = Color(uiColor: UIColor(manualEntryColorString: model.inputFill) ?? .secondarySystemBackground)
    inputBorder = Color(uiColor: UIColor(manualEntryColorString: model.inputBorder) ?? .separator)
    background = Color(uiColor: UIColor(manualEntryColorString: model.menuGlassFill) ?? .systemBackground)
    selectedFill = Color(uiColor: UIColor(manualEntryColorString: model.selectedFill) ?? .label)
    selectedBorder = Color(uiColor: UIColor(manualEntryColorString: model.selectedBorder) ?? .separator)
    selectedForeground = Color(uiColor: UIColor(manualEntryColorString: model.selectedForeground) ?? .systemBackground)
    actionPrimaryForeground = Color(uiColor: UIColor(manualEntryColorString: model.actionPrimaryForeground) ?? .systemBackground)
    errorFill = Color(uiColor: UIColor(manualEntryColorString: model.errorFill) ?? .systemRed.withAlphaComponent(0.14))
    errorBorder = Color(uiColor: UIColor(manualEntryColorString: model.errorBorder) ?? .systemRed.withAlphaComponent(0.24))
    errorText = Color(uiColor: UIColor(manualEntryColorString: model.errorText) ?? .systemRed)
    placeholder = Color(uiColor: UIColor(manualEntryColorString: model.placeholder) ?? .placeholderText)
    weekday = Color(uiColor: UIColor(manualEntryColorString: model.weekday) ?? .tertiaryLabel)
  }
}

private struct ManualEntryMonthCell {
  let iso: String
  let day: Int
}

@available(iOS 16.0, *)
private struct ManualEntryFlowLayout: Layout {
  let spacing: CGFloat

  init(spacing: CGFloat) {
    self.spacing = spacing
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let rows = makeRows(proposal: proposal, subviews: subviews)
    let width = proposal.width ?? rows.map(\.width).max() ?? 0
    let height = rows.reduce(0) { $0 + $1.height } + spacing * CGFloat(max(rows.count - 1, 0))
    return CGSize(width: width, height: height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let rows = makeRows(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
    var y = bounds.minY

    for row in rows {
      var x = bounds.minX

      for index in row.itemIndices {
        let size = subviews[index].sizeThatFits(.unspecified)
        subviews[index].place(
          at: CGPoint(x: x, y: y + (row.height - size.height) / 2),
          proposal: ProposedViewSize(width: size.width, height: size.height)
        )
        x += size.width + spacing
      }

      y += row.height + spacing
    }
  }

  private func makeRows(proposal: ProposedViewSize, subviews: Subviews) -> [ManualEntryFlowRow] {
    let maxWidth = proposal.width ?? .infinity
    var rows: [ManualEntryFlowRow] = []
    var currentItemIndices: [Int] = []
    var currentWidth: CGFloat = 0
    var currentHeight: CGFloat = 0

    for index in subviews.indices {
      let subview = subviews[index]
      let size = subview.sizeThatFits(.unspecified)
      let nextWidth = currentItemIndices.isEmpty ? size.width : currentWidth + spacing + size.width

      if nextWidth > maxWidth, !currentItemIndices.isEmpty {
        rows.append(ManualEntryFlowRow(itemIndices: currentItemIndices, width: currentWidth, height: currentHeight))
        currentItemIndices = [index]
        currentWidth = size.width
        currentHeight = size.height
      } else {
        currentItemIndices.append(index)
        currentWidth = nextWidth
        currentHeight = max(currentHeight, size.height)
      }
    }

    if !currentItemIndices.isEmpty {
      rows.append(ManualEntryFlowRow(itemIndices: currentItemIndices, width: currentWidth, height: currentHeight))
    }

    return rows
  }
}

@available(iOS 16.0, *)
private struct ManualEntryFlowRow {
  let itemIndices: [Int]
  let width: CGFloat
  let height: CGFloat
}

private struct ManualEntryActionLabel: View {
  let title: String
  var systemImage: String? = nil
  let color: Color
  var isLoading = false

  var body: some View {
    HStack(alignment: .center, spacing: 7) {
      if isLoading {
        ProgressView()
          .progressViewStyle(.circular)
          .tint(color)
          .controlSize(.small)
          .frame(width: 18, height: 34, alignment: .center)
      } else if let systemImage {
        Image(systemName: systemImage)
          .font(.system(size: 17, weight: .semibold))
          .frame(width: 18, height: 34, alignment: .center)
      }

      Text(title)
        .font(.system(size: 16, weight: .semibold))
        .lineLimit(1)
        .minimumScaleFactor(0.72)
    }
    .foregroundStyle(color)
    .frame(maxWidth: .infinity, minHeight: 34, maxHeight: 34, alignment: .center)
  }
}

private extension View {
  @ViewBuilder
  func manualEntrySheetPresentation() -> some View {
    if #available(iOS 16.4, *) {
      self
        .presentationDetents([.fraction(0.86), .large])
        .presentationDragIndicator(.hidden)
        .presentationCornerRadius(34)
        .presentationBackground(.ultraThinMaterial)
    } else if #available(iOS 16.0, *) {
      self
        .presentationDetents([.fraction(0.86), .large])
        .presentationDragIndicator(.hidden)
    } else {
      self
    }
  }

  @ViewBuilder
  func manualEntryGlassBackground<S: InsettableShape>(fill: Color, border: Color, shape: S) -> some View {
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

  @ViewBuilder
  func manualEntryGlassButtonStyle(tint: Color, prominent: Bool, controlSize: ControlSize) -> some View {
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

}

private func buildManualEntryMonthCells(_ month: Date) -> [ManualEntryMonthCell?] {
  let calendar = manualEntryCalendar()
  let monthStart = manualEntryStartOfMonth(month)
  let range = calendar.range(of: .day, in: .month, for: monthStart) ?? 1..<1
  let leadingDays = calendar.component(.weekday, from: monthStart) - 1
  var cells = Array<ManualEntryMonthCell?>(repeating: nil, count: leadingDays)

  for day in range {
    guard let date = calendar.date(byAdding: .day, value: day - 1, to: monthStart) else { continue }
    cells.append(ManualEntryMonthCell(iso: manualEntryISODate(date), day: day))
  }

  while cells.count % 7 != 0 {
    cells.append(nil)
  }

  return cells
}

private func defaultManualEntryEndDate(_ startDate: String) -> String {
  guard let date = manualEntryDate(from: startDate),
        let nextDate = manualEntryCalendar().date(byAdding: .day, value: 1, to: date)
  else { return startDate }

  let next = manualEntryISODate(nextDate)
  return next <= manualEntryMaxDate ? next : startDate
}

private func isValidManualEntryISODate(_ value: String) -> Bool {
  let formatter = manualEntryISOFormatter()
  guard let date = formatter.date(from: value) else { return false }
  return formatter.string(from: date) == value
}

private func manualEntryDate(from value: String) -> Date? {
  manualEntryISOFormatter().date(from: value)
}

private func manualEntryISODate(_ date: Date) -> String {
  manualEntryISOFormatter().string(from: date)
}

private func manualEntryISOFormatter() -> DateFormatter {
  let formatter = DateFormatter()
  formatter.calendar = manualEntryCalendar()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = TimeZone(secondsFromGMT: 0)
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter
}

private func manualEntryCalendar() -> Calendar {
  var calendar = Calendar(identifier: .gregorian)
  if let utc = TimeZone(secondsFromGMT: 0) {
    calendar.timeZone = utc
  }
  return calendar
}

private func manualEntryStartOfMonth(_ date: Date) -> Date {
  let calendar = manualEntryCalendar()
  let components = calendar.dateComponents([.year, .month], from: date)
  return calendar.date(from: components) ?? date
}

private func manualEntryEndOfMonth(_ date: Date) -> Date {
  let calendar = manualEntryCalendar()
  let start = manualEntryStartOfMonth(date)
  let nextMonth = calendar.date(byAdding: .month, value: 1, to: start) ?? start
  return calendar.date(byAdding: .day, value: -1, to: nextMonth) ?? start
}

private func manualEntryMonthTitle(_ date: Date) -> String {
  let formatter = DateFormatter()
  formatter.calendar = manualEntryCalendar()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = TimeZone(secondsFromGMT: 0)
  formatter.dateFormat = "MMMM yyyy"
  return formatter.string(from: date)
}

private func manualEntryCompactDate(_ iso: String) -> String {
  guard let date = manualEntryDate(from: iso) else { return iso }
  let formatter = DateFormatter()
  formatter.calendar = manualEntryCalendar()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = TimeZone(secondsFromGMT: 0)
  formatter.dateFormat = "MMM d"
  return formatter.string(from: date)
}

private func resolveManualEntryCountry(_ input: String, countries: [ManualEntryCountry]) -> ManualEntryCountry? {
  let value = input.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !value.isEmpty else { return nil }

  let code = value.uppercased()
  if code.range(of: #"^[A-Z]{2}$"#, options: .regularExpression) != nil {
    return countries.first { $0.code == code }
  }

  let normalized = normalizeManualEntrySearchText(value)
  if let exact = countries.first(where: { normalizeManualEntrySearchText($0.name) == normalized }) {
    return exact
  }

  let aliases = [
    "america": "US",
    "britain": "GB",
    "cote d ivoire": "CI",
    "great britain": "GB",
    "ivory coast": "CI",
    "laos": "LA",
    "russia": "RU",
    "south korea": "KR",
    "uae": "AE",
    "uk": "GB",
    "united states of america": "US",
    "usa": "US",
    "vietnam": "VN"
  ]

  guard let aliasCode = aliases[normalized] else { return nil }
  return countries.first { $0.code == aliasCode }
}

private func normalizeManualEntrySearchText(_ value: String) -> String {
  let lowered = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
  let pattern = #"[^a-z0-9]+"#
  let normalized = lowered.replacingOccurrences(of: pattern, with: " ", options: .regularExpression)
  return normalized.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
    .trimmingCharacters(in: .whitespacesAndNewlines)
}

private func manualEntryFlag(for countryCode: String) -> String {
  let base: UInt32 = 127397
  var scalars = String.UnicodeScalarView()

  for scalar in countryCode.uppercased().unicodeScalars {
    guard let regional = UnicodeScalar(base + scalar.value) else { return "" }
    scalars.append(regional)
  }

  return String(scalars)
}

private extension UIColor {
  convenience init?(manualEntryColorString string: String) {
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
