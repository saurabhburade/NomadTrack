import React
import SwiftUI
import UIKit

private struct EditDayCountry: Identifiable, Equatable {
  let code: String
  let name: String

  var id: String { code }
}

private final class EditDaySheetModel: ObservableObject {
  @Published var visible = false
  @Published var canDelete = false
  @Published var initialDate = ""
  @Published var initialCountryInput = ""
  @Published var countries: [EditDayCountry] = []

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
  @Published var actionPrimaryFill = "#ffffff"
  @Published var actionPrimaryForeground = "#000000"
  @Published var actionSecondaryFill = "rgba(255,255,255,0.1)"
  @Published var actionSecondaryBorder = "rgba(255,255,255,0.24)"
  @Published var errorFill = "rgba(127,29,29,0.18)"
  @Published var errorBorder = "rgba(248,113,113,0.3)"
  @Published var errorText = "#fca5a5"
  @Published var placeholder = "#6d6d72"

  var onClose: RCTBubblingEventBlock?
  var onConfirm: RCTBubblingEventBlock?
  var onDelete: RCTBubblingEventBlock?
}

final class EditDaySheetHostingView: UIView {
  @objc var visible: Bool = false { didSet { updateModel() } }
  @objc var canDelete: Bool = false { didSet { updateModel() } }
  @objc var initialDate: NSString = "" { didSet { updateModel() } }
  @objc var initialCountryInput: NSString = "" { didSet { updateModel() } }
  @objc var countryOptions: NSArray = [] {
    didSet {
      parsedCountries = parseCountries()
      updateModel(includeCountries: true)
    }
  }

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
  @objc var actionPrimaryFillColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var actionPrimaryForegroundColorValue: NSString = "#000000" { didSet { updateModel() } }
  @objc var actionSecondaryFillColorValue: NSString = "rgba(255,255,255,0.1)" { didSet { updateModel() } }
  @objc var actionSecondaryBorderColorValue: NSString = "rgba(255,255,255,0.24)" { didSet { updateModel() } }
  @objc var errorFillColorValue: NSString = "rgba(127,29,29,0.18)" { didSet { updateModel() } }
  @objc var errorBorderColorValue: NSString = "rgba(248,113,113,0.3)" { didSet { updateModel() } }
  @objc var errorTextColorValue: NSString = "#fca5a5" { didSet { updateModel() } }
  @objc var placeholderColorValue: NSString = "#6d6d72" { didSet { updateModel() } }

  @objc var onClose: RCTBubblingEventBlock? { didSet { model.onClose = onClose } }
  @objc var onConfirm: RCTBubblingEventBlock? { didSet { model.onConfirm = onConfirm } }
  @objc var onDelete: RCTBubblingEventBlock? { didSet { model.onDelete = onDelete } }

  private let model = EditDaySheetModel()
  private var parsedCountries: [EditDayCountry] = []
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

    let controller = UIHostingController(rootView: AnyView(EditDaySheetRootView(model: model)))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    addSubview(controller.view)
  }

  private func updateModel(includeCountries: Bool = false) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.model.visible = self.visible
      self.model.canDelete = self.canDelete
      self.model.initialDate = String(self.initialDate)
      self.model.initialCountryInput = String(self.initialCountryInput)
      if includeCountries {
        self.model.countries = self.parsedCountries
      }

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
      self.model.actionPrimaryFill = String(self.actionPrimaryFillColorValue)
      self.model.actionPrimaryForeground = String(self.actionPrimaryForegroundColorValue)
      self.model.actionSecondaryFill = String(self.actionSecondaryFillColorValue)
      self.model.actionSecondaryBorder = String(self.actionSecondaryBorderColorValue)
      self.model.errorFill = String(self.errorFillColorValue)
      self.model.errorBorder = String(self.errorBorderColorValue)
      self.model.errorText = String(self.errorTextColorValue)
      self.model.placeholder = String(self.placeholderColorValue)
    }
  }

  private func parseCountries() -> [EditDayCountry] {
    countryOptions.compactMap { option in
      guard let dictionary = option as? NSDictionary,
            let code = dictionary["code"] as? String,
            let name = dictionary["name"] as? String
      else { return nil }

      return EditDayCountry(code: code, name: name)
    }
  }
}

@objc(EditDaySheetViewManager)
final class EditDaySheetViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    EditDaySheetHostingView()
  }
}

private struct EditDaySheetRootView: View {
  @ObservedObject var model: EditDaySheetModel
  @State private var draftDate = ""
  @State private var countryInput = ""
  @State private var errorMessage: String?
  @State private var showDeleteConfirmation = false

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
        EditDaySheetContent(
          model: model,
          draftDate: $draftDate,
          countryInput: $countryInput,
          errorMessage: $errorMessage,
          showDeleteConfirmation: $showDeleteConfirmation
        )
        .editDaySheetPresentation(height: model.canDelete ? 390 : 430)
      }
      .alert("Delete history entry?", isPresented: $showDeleteConfirmation) {
        Button("Cancel", role: .cancel) {}
        Button("Delete", role: .destructive) {
          model.onDelete?(["date": model.initialDate])
        }
      } message: {
        Text("This removes \(model.initialDate) from History.")
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
    draftDate = model.initialDate
    countryInput = model.initialCountryInput
    errorMessage = nil
    showDeleteConfirmation = false
  }
}

private struct EditDaySheetContent: View {
  @ObservedObject var model: EditDaySheetModel
  @Binding var draftDate: String
  @Binding var countryInput: String
  @Binding var errorMessage: String?
  @Binding var showDeleteConfirmation: Bool
  @FocusState private var focusedField: EditDayField?

  private var colors: EditDayColors { EditDayColors(model: model) }

  private var matchingCountries: [EditDayCountry] {
    let input = normalizeEditDaySearchText(countryInput)
    let matches: [EditDayCountry]

    if input.isEmpty {
      matches = model.countries
    } else {
      matches = model.countries.filter { country in
        normalizeEditDaySearchText(country.name).contains(input) || country.code.lowercased().hasPrefix(input)
      }
    }

    return Array(matches.prefix(4))
  }

  private var selectedCountry: EditDayCountry? {
    resolveEditDayCountry(countryInput, countries: model.countries)
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
            .editDayGlassBackground(fill: colors.card, border: colors.inputBorder, shape: Circle())

          VStack(alignment: .leading, spacing: 2) {
            Text("Edit Day")
              .font(.system(size: 18, weight: .bold))
              .foregroundStyle(colors.foreground)
              .lineLimit(1)
            Text("Final location")
              .font(.system(size: 13, weight: .medium))
              .foregroundStyle(colors.muted)
              .lineLimit(1)
          }

          Spacer(minLength: 12)

          if model.canDelete {
            Button(role: .destructive) {
              focusedField = nil
              showDeleteConfirmation = true
            } label: {
              Image(systemName: "trash")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 42, height: 42)
                .editDayGlassBackground(fill: Color(uiColor: .systemRed), border: Color(uiColor: .systemRed).opacity(0.34), shape: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Delete")
          }
        }

        VStack(alignment: .leading, spacing: 14) {
          EditDayFieldView(
            title: "Date",
            text: $draftDate,
            placeholder: "YYYY-MM-DD",
            systemImage: nil,
            colors: colors
          )
          .focused($focusedField, equals: .date)
          .keyboardType(.numbersAndPunctuation)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()

          EditDayFieldView(
            title: "Country",
            text: $countryInput,
            placeholder: "Country name or code",
            systemImage: "globe.europe.africa",
            colors: colors
          )
          .focused($focusedField, equals: .country)
          .textInputAutocapitalization(.words)
          .autocorrectionDisabled()
        }
        .padding(.top, 26)

        VStack(alignment: .leading, spacing: 8) {
          ForEach(Array(stride(from: 0, to: matchingCountries.count, by: 2)), id: \.self) { rowStart in
            HStack(spacing: 8) {
              ForEach(matchingCountries[rowStart..<min(rowStart + 2, matchingCountries.count)]) { country in
                EditDayCountryChip(
                  country: country,
                  isSelected: selectedCountry?.code == country.code,
                  colors: colors
                ) {
                  countryInput = country.name
                  errorMessage = nil
                  focusedField = nil
                }
              }
            }
          }
        }
        .padding(.top, 18)

        if let errorMessage {
          Text(errorMessage)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(colors.errorText)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .editDayGlassBackground(fill: colors.errorFill, border: colors.errorBorder, shape: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .padding(.top, 14)
        }

        }
        .padding(.horizontal, 22)
        .padding(.bottom, 110)
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
    .onChange(of: draftDate) { _ in errorMessage = nil }
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

      EditDayActions(
        colors: colors,
        onCancel: {
          focusedField = nil
          model.visible = false
          model.onClose?([:])
        },
        onUpdate: submit
      )
      .padding(.horizontal, 28)
      .padding(.top, 0)
      .padding(.bottom, 14)
      .background(colors.background.opacity(0.74))
    }
  }

  private func submit() {
    focusedField = nil

    guard isValidEditDayISODate(draftDate) else {
      errorMessage = "Choose a valid date."
      return
    }

    guard let country = selectedCountry else {
      errorMessage = "Enter a recognized country name or 2-letter code."
      return
    }

    model.onConfirm?([
      "originalDate": model.initialDate,
      "date": draftDate,
      "countryCode": country.code,
      "countryName": country.name
    ])
  }
}

private enum EditDayField: Hashable {
  case date
  case country
}

private struct EditDayFieldView: View {
  let title: String
  @Binding var text: String
  let placeholder: String
  let systemImage: String?
  let colors: EditDayColors

  var body: some View {
    VStack(alignment: .leading, spacing: 7) {
      Text(title)
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(colors.muted)

      HStack(spacing: 10) {
        if let systemImage {
          Image(systemName: systemImage)
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(colors.muted)
        }

        TextField(placeholder, text: $text)
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(colors.foreground)
      }
      .padding(.horizontal, 14)
      .frame(minHeight: 48)
      .editDayGlassBackground(fill: colors.inputFill, border: colors.inputBorder, shape: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
  }
}

private struct EditDayCountryChip: View {
  let country: EditDayCountry
  let isSelected: Bool
  let colors: EditDayColors
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Text("\(country.name) (\(country.code))")
        .font(.system(size: 13, weight: .bold))
        .lineLimit(1)
        .foregroundStyle(isSelected ? colors.selectedForeground : colors.foreground)
        .padding(.horizontal, 12)
        .frame(height: 32)
        .editDayGlassBackground(
          fill: isSelected ? colors.selectedFill : colors.chipFill,
          border: isSelected ? colors.selectedBorder : colors.inputBorder,
          shape: Capsule()
        )
    }
    .buttonStyle(.plain)
  }
}

private struct EditDayActions: View {
  let colors: EditDayColors
  let onCancel: () -> Void
  let onUpdate: () -> Void

  var body: some View {
    HStack(spacing: 8) {
      Button(role: .cancel, action: onCancel) {
        Text("Cancel")
          .editDayActionLabel(color: colors.foreground)
      }
      .editDayGlassButtonStyle(tint: colors.foreground, prominent: false, controlSize: .small)

      Button(action: onUpdate) {
        Label("Update", systemImage: "checkmark")
          .editDayActionLabel(color: colors.actionPrimaryForeground)
      }
      .editDayGlassButtonStyle(tint: colors.actionPrimaryForeground, prominent: true, controlSize: .small)
    }
  }
}

private struct EditDayColors {
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

  init(model: EditDaySheetModel) {
    foreground = Color(uiColor: UIColor(editDayColorString: model.foreground) ?? .label)
    muted = Color(uiColor: UIColor(editDayColorString: model.muted) ?? .secondaryLabel)
    card = Color(uiColor: UIColor(editDayColorString: model.card) ?? .secondarySystemBackground)
    chipFill = Color(uiColor: UIColor(editDayColorString: model.chipFill) ?? .tertiarySystemBackground)
    inputFill = Color(uiColor: UIColor(editDayColorString: model.inputFill) ?? .secondarySystemBackground)
    inputBorder = Color(uiColor: UIColor(editDayColorString: model.inputBorder) ?? .separator)
    background = Color(uiColor: UIColor(editDayColorString: model.menuGlassFill) ?? .systemBackground)
    selectedFill = Color(uiColor: UIColor(editDayColorString: model.selectedFill) ?? .label)
    selectedBorder = Color(uiColor: UIColor(editDayColorString: model.selectedBorder) ?? .separator)
    selectedForeground = Color(uiColor: UIColor(editDayColorString: model.selectedForeground) ?? .systemBackground)
    actionPrimaryForeground = Color(uiColor: UIColor(editDayColorString: model.actionPrimaryForeground) ?? .systemBackground)
    errorFill = Color(uiColor: UIColor(editDayColorString: model.errorFill) ?? .systemRed.withAlphaComponent(0.14))
    errorBorder = Color(uiColor: UIColor(editDayColorString: model.errorBorder) ?? .systemRed.withAlphaComponent(0.24))
    errorText = Color(uiColor: UIColor(editDayColorString: model.errorText) ?? .systemRed)
  }
}

private extension View {
  @ViewBuilder
  func editDaySheetPresentation(height: CGFloat) -> some View {
    if #available(iOS 16.4, *) {
      self
        .presentationDetents([.height(height), .large])
        .presentationDragIndicator(.hidden)
        .presentationCornerRadius(34)
        .presentationBackground(.ultraThinMaterial)
    } else if #available(iOS 16.0, *) {
      self
        .presentationDetents([.height(height), .large])
        .presentationDragIndicator(.hidden)
    } else {
      self
    }
  }

  @ViewBuilder
  func editDayGlassBackground<S: InsettableShape>(fill: Color, border: Color, shape: S) -> some View {
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
  func editDayGlassButtonStyle(tint: Color, prominent: Bool, controlSize: ControlSize) -> some View {
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

  func editDayActionLabel(color: Color) -> some View {
    self
      .font(.system(size: 16, weight: .semibold))
      .foregroundStyle(color)
      .lineLimit(1)
      .minimumScaleFactor(0.72)
      .frame(maxWidth: .infinity, minHeight: 34)
  }
}

private func isValidEditDayISODate(_ value: String) -> Bool {
  let formatter = DateFormatter()
  formatter.calendar = Calendar(identifier: .gregorian)
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = TimeZone(secondsFromGMT: 0)
  formatter.dateFormat = "yyyy-MM-dd"

  guard let date = formatter.date(from: value) else { return false }
  return formatter.string(from: date) == value
}

private func resolveEditDayCountry(_ input: String, countries: [EditDayCountry]) -> EditDayCountry? {
  let value = input.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !value.isEmpty else { return nil }

  let code = value.uppercased()
  if code.range(of: #"^[A-Z]{2}$"#, options: .regularExpression) != nil {
    return countries.first { $0.code == code }
  }

  let normalized = normalizeEditDaySearchText(value)
  if let exact = countries.first(where: { normalizeEditDaySearchText($0.name) == normalized }) {
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

private func normalizeEditDaySearchText(_ value: String) -> String {
  let lowered = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
  let pattern = #"[^a-z0-9]+"#
  let normalized = lowered.replacingOccurrences(of: pattern, with: " ", options: .regularExpression)
  return normalized.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
    .trimmingCharacters(in: .whitespacesAndNewlines)
}

private extension UIColor {
  convenience init?(editDayColorString string: String) {
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
