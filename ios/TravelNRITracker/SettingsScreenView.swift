import React
import SwiftUI
import UIKit

private let settingsBlurReplaceAnimation = Animation.easeInOut(duration: 0.22)
private let settingsDashboardHeaderTopSpacing: CGFloat = 20
private let settingsAppearanceOptions: [(value: String, label: String, systemImage: String)] = [
  ("system", "System", "desktopcomputer"),
  ("light", "Light", "sun.max"),
  ("dark", "Dark", "moon")
]

private final class SettingsScreenModel: ObservableObject {
  @Published var accountTitle = "Login Account"
  @Published var accountDetail = "Not connected"
  @Published var trackingPaused = false
  @Published var cloudBackupEnabled = true
  @Published var autoBackup = true
  @Published var googleDriveDetail = "Not connected"
  @Published var googleDriveUnavailable = false
  @Published var googleConnected = false
  @Published var backupStatusTone = ""
  @Published var backupStatusMessage = ""
  @Published var backupBusy = false
  @Published var resetBusy = false
  @Published var residencyYear = Calendar.current.component(.year, from: Date())
  @Published var calendarYearMode = false
  @Published var appearance = "system"
  @Published var bottomPadding: CGFloat = 126
  @Published var topPadding: CGFloat = settingsDashboardHeaderTopSpacing

  @Published var screen = "#000000"
  @Published var group = "#1c1c1e"
  @Published var groupBorder = "rgba(255,255,255,0.07)"
  @Published var control = "#2c2c2e"
  @Published var controlBorder = "rgba(255,255,255,0.1)"
  @Published var divider = "rgba(84,84,88,0.56)"
  @Published var foreground = "#ffffff"
  @Published var muted = "#a1a1aa"
  @Published var section = "#a1a1aa"
  @Published var icon = "#ffffff"
  @Published var chevron = "#71717a"
  @Published var disabled = "#5f5f63"
  @Published var switchOn = "#30d158"
  @Published var tint = "#ffffff"
  @Published var tintForeground = "#000000"
  @Published var danger = "#ff453a"
  @Published var success = "#30d158"
  @Published var info = "#a1a1aa"
  @Published var errorBack = "rgba(255,69,58,0.14)"
  @Published var successBack = "rgba(48,209,88,0.14)"
  @Published var infoBack = "rgba(255,255,255,0.08)"
  @Published var drawer = "#1c1c1e"

  var onTrackingPausedChange: RCTBubblingEventBlock?
  var onCloudBackupEnabledChange: RCTBubblingEventBlock?
  var onAutoBackupChange: RCTBubblingEventBlock?
  var onAction: RCTBubblingEventBlock?
  var onAppearanceChange: RCTBubblingEventBlock?
  var onResidencyConfirm: RCTBubblingEventBlock?
}

final class SettingsScreenHostingView: UIView {
  @objc var accountTitle: NSString = "Login Account" { didSet { updateModel() } }
  @objc var accountDetail: NSString = "Not connected" { didSet { updateModel() } }
  @objc var trackingPaused: Bool = false { didSet { updateModel() } }
  @objc var cloudBackupEnabled: Bool = true { didSet { updateModel() } }
  @objc var autoBackup: Bool = true { didSet { updateModel() } }
  @objc var googleDriveDetail: NSString = "Not connected" { didSet { updateModel() } }
  @objc var googleDriveUnavailable: Bool = false { didSet { updateModel() } }
  @objc var googleConnected: Bool = false { didSet { updateModel() } }
  @objc var backupStatusTone: NSString = "" { didSet { updateModel() } }
  @objc var backupStatusMessage: NSString = "" { didSet { updateModel() } }
  @objc var backupBusy: Bool = false { didSet { updateModel() } }
  @objc var resetBusy: Bool = false { didSet { updateModel() } }
  @objc var residencyYear: NSNumber = 0 { didSet { updateModel() } }
  @objc var calendarYearMode: Bool = false { didSet { updateModel() } }
  @objc var appearance: NSString = "system" { didSet { updateModel() } }
  @objc var bottomPadding: NSNumber = 126 { didSet { updateModel() } }
  @objc var topPadding: NSNumber = NSNumber(value: Double(settingsDashboardHeaderTopSpacing)) { didSet { updateModel() } }

  @objc var screenColorValue: NSString = "#000000" { didSet { updateModel() } }
  @objc var groupColorValue: NSString = "#1c1c1e" { didSet { updateModel() } }
  @objc var groupBorderColorValue: NSString = "rgba(255,255,255,0.07)" { didSet { updateModel() } }
  @objc var controlColorValue: NSString = "#2c2c2e" { didSet { updateModel() } }
  @objc var controlBorderColorValue: NSString = "rgba(255,255,255,0.1)" { didSet { updateModel() } }
  @objc var dividerColorValue: NSString = "rgba(84,84,88,0.56)" { didSet { updateModel() } }
  @objc var foregroundColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var mutedColorValue: NSString = "#a1a1aa" { didSet { updateModel() } }
  @objc var sectionColorValue: NSString = "#a1a1aa" { didSet { updateModel() } }
  @objc var iconColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var chevronColorValue: NSString = "#71717a" { didSet { updateModel() } }
  @objc var disabledColorValue: NSString = "#5f5f63" { didSet { updateModel() } }
  @objc var switchOnColorValue: NSString = "#30d158" { didSet { updateModel() } }
  @objc var tintColorValue: NSString = "#ffffff" { didSet { updateModel() } }
  @objc var tintForegroundColorValue: NSString = "#000000" { didSet { updateModel() } }
  @objc var dangerColorValue: NSString = "#ff453a" { didSet { updateModel() } }
  @objc var successColorValue: NSString = "#30d158" { didSet { updateModel() } }
  @objc var infoColorValue: NSString = "#a1a1aa" { didSet { updateModel() } }
  @objc var errorBackColorValue: NSString = "rgba(255,69,58,0.14)" { didSet { updateModel() } }
  @objc var successBackColorValue: NSString = "rgba(48,209,88,0.14)" { didSet { updateModel() } }
  @objc var infoBackColorValue: NSString = "rgba(255,255,255,0.08)" { didSet { updateModel() } }
  @objc var drawerColorValue: NSString = "#1c1c1e" { didSet { updateModel() } }

  @objc var onTrackingPausedChange: RCTBubblingEventBlock? { didSet { model.onTrackingPausedChange = onTrackingPausedChange } }
  @objc var onCloudBackupEnabledChange: RCTBubblingEventBlock? { didSet { model.onCloudBackupEnabledChange = onCloudBackupEnabledChange } }
  @objc var onAutoBackupChange: RCTBubblingEventBlock? { didSet { model.onAutoBackupChange = onAutoBackupChange } }
  @objc var onAction: RCTBubblingEventBlock? { didSet { model.onAction = onAction } }
  @objc var onAppearanceChange: RCTBubblingEventBlock? { didSet { model.onAppearanceChange = onAppearanceChange } }
  @objc var onResidencyConfirm: RCTBubblingEventBlock? { didSet { model.onResidencyConfirm = onResidencyConfirm } }

  private let model = SettingsScreenModel()
  private var hostingController: UIHostingController<AnyView>?
  private var effectiveTopPadding: CGFloat {
    max(CGFloat(truncating: topPadding), safeAreaInsets.top + settingsDashboardHeaderTopSpacing, settingsDashboardHeaderTopSpacing)
  }

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

  override func didMoveToWindow() {
    super.didMoveToWindow()
    updateModel()
  }

  override func safeAreaInsetsDidChange() {
    super.safeAreaInsetsDidChange()
    updateModel()
  }

  private func mountContent() {
    guard hostingController == nil else { return }

    let controller = UIHostingController(rootView: AnyView(SettingsScreenRootView(model: model)))
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    hostingController = controller
    addSubview(controller.view)
  }

  private func updateModel() {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.model.accountTitle = String(self.accountTitle)
      self.model.accountDetail = String(self.accountDetail)
      self.model.trackingPaused = self.trackingPaused
      self.model.cloudBackupEnabled = self.cloudBackupEnabled
      self.model.autoBackup = self.autoBackup
      self.model.googleDriveDetail = String(self.googleDriveDetail)
      self.model.googleDriveUnavailable = self.googleDriveUnavailable
      self.model.googleConnected = self.googleConnected
      self.model.backupStatusTone = String(self.backupStatusTone)
      self.model.backupStatusMessage = String(self.backupStatusMessage)
      self.model.backupBusy = self.backupBusy
      self.model.resetBusy = self.resetBusy
      self.model.residencyYear = self.residencyYear.intValue == 0 ? Calendar.current.component(.year, from: Date()) : self.residencyYear.intValue
      self.model.calendarYearMode = self.calendarYearMode
      self.model.appearance = String(self.appearance)
      self.model.bottomPadding = CGFloat(truncating: self.bottomPadding)
      self.model.topPadding = self.effectiveTopPadding

      self.model.screen = String(self.screenColorValue)
      self.model.group = String(self.groupColorValue)
      self.model.groupBorder = String(self.groupBorderColorValue)
      self.model.control = String(self.controlColorValue)
      self.model.controlBorder = String(self.controlBorderColorValue)
      self.model.divider = String(self.dividerColorValue)
      self.model.foreground = String(self.foregroundColorValue)
      self.model.muted = String(self.mutedColorValue)
      self.model.section = String(self.sectionColorValue)
      self.model.icon = String(self.iconColorValue)
      self.model.chevron = String(self.chevronColorValue)
      self.model.disabled = String(self.disabledColorValue)
      self.model.switchOn = String(self.switchOnColorValue)
      self.model.tint = String(self.tintColorValue)
      self.model.tintForeground = String(self.tintForegroundColorValue)
      self.model.danger = String(self.dangerColorValue)
      self.model.success = String(self.successColorValue)
      self.model.info = String(self.infoColorValue)
      self.model.errorBack = String(self.errorBackColorValue)
      self.model.successBack = String(self.successBackColorValue)
      self.model.infoBack = String(self.infoBackColorValue)
      self.model.drawer = String(self.drawerColorValue)
    }
  }
}

@objc(SettingsScreenViewManager)
final class SettingsScreenViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    SettingsScreenHostingView()
  }
}

private enum SettingsNativeSheet: Identifiable {
  case residency
  case appearance

  var id: String {
    switch self {
    case .residency: return "residency"
    case .appearance: return "appearance"
    }
  }
}

private struct SettingsScreenRootView: View {
  @ObservedObject var model: SettingsScreenModel
  @State private var activeSheet: SettingsNativeSheet?
  @State private var draftYear = Calendar.current.component(.year, from: Date())
  @State private var draftCalendarYearMode = false
  @State private var draftAppearance = "system"

  private var colors: SettingsNativeColors { SettingsNativeColors(model: model) }

  var body: some View {
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 22) {
        Text("Settings")
          .font(.system(size: 30, weight: .heavy))
          .foregroundStyle(colors.foreground)
          .lineLimit(1)
          .padding(.top, max(model.topPadding, settingsDashboardHeaderTopSpacing))

        accountSection
        backupSection
        exportPrivacySection
        fiscalYearSection
        appearanceSection
      }
      .padding(.horizontal, 20)
      .padding(.bottom, max(model.bottomPadding, 24))
    }
    .background(colors.screen.ignoresSafeArea())
    .tint(colors.tint)
    .sheet(item: $activeSheet) { sheet in
      switch sheet {
      case .residency:
        SettingsResidencySheet(
          colors: colors,
          draftYear: $draftYear,
          draftCalendarYearMode: $draftCalendarYearMode,
          onCancel: { activeSheet = nil },
          onConfirm: {
            model.onResidencyConfirm?([
              "year": draftYear,
              "calendarYearMode": draftCalendarYearMode
            ])
            activeSheet = nil
          }
        )
        .settingsPresentation(height: 330, background: colors.drawer)
      case .appearance:
        SettingsAppearanceSheet(
          colors: colors,
          selectedAppearance: $draftAppearance,
          onSelect: { value in
            model.onAppearanceChange?(["appearance": value])
            activeSheet = nil
          }
        )
        .settingsPresentation(height: 270, background: colors.drawer)
      }
    }
  }

  private var accountSection: some View {
    SettingsNativeSection(title: "Account", colors: colors) {
      SettingsNativeGroup(colors: colors) {
        if model.googleConnected {
          SettingsInfoRow(
            title: model.accountTitle,
            detail: model.accountDetail,
            systemImage: "person.crop.circle",
            colors: colors
          )
        } else {
          SettingsButtonRow(
            title: model.accountTitle,
            detail: model.accountDetail,
            systemImage: "person.crop.circle",
            disabled: model.googleDriveUnavailable,
            colors: colors,
            action: { model.onAction?(["action": "googleDrive"]) }
          )
        }
      }
    }
  }

  private var backupSection: some View {
    SettingsNativeSection(title: "Backup", colors: colors) {
      SettingsNativeGroup(colors: colors) {
        SettingsSwitchRow(
          title: "Cloud Backup",
          detail: model.cloudBackupEnabled ? "Enabled" : "Disabled",
          systemImage: "shield",
          value: Binding(
            get: { model.cloudBackupEnabled },
            set: { model.onCloudBackupEnabledChange?(["value": $0]) }
          ),
          colors: colors
        )

        SettingsNativeDivider(colors: colors)

        SettingsSwitchRow(
          title: "Auto Backup",
          detail: model.autoBackup ? "Enabled" : "Disabled",
          systemImage: "clock",
          disabled: !model.cloudBackupEnabled,
          value: Binding(
            get: { model.autoBackup },
            set: { model.onAutoBackupChange?(["value": $0]) }
          ),
          colors: colors
        )

        SettingsNativeDivider(colors: colors)

        SettingsButtonRow(
          title: "Google Drive",
          detail: model.googleDriveDetail,
          systemImage: "icloud.and.arrow.up",
          disabled: model.googleDriveUnavailable,
          colors: colors,
          action: { model.onAction?(["action": "googleDrive"]) }
        )

        if !model.backupStatusMessage.isEmpty {
          SettingsNativeDivider(colors: colors)
          SettingsBackupStatus(colors: colors, tone: model.backupStatusTone, message: model.backupStatusMessage)
        }

        SettingsNativeDivider(colors: colors)

        SettingsButtonRow(
          title: model.backupBusy ? "Working..." : "Backup Now",
          detail: model.googleDriveUnavailable ? "Needs Google Drive" : "Upload latest data",
          systemImage: "square.and.arrow.up",
          disabled: model.backupBusy || model.googleDriveUnavailable,
          busy: model.backupBusy,
          colors: colors,
          action: { model.onAction?(["action": "backupNow"]) }
        )

        SettingsNativeDivider(colors: colors)

        SettingsButtonRow(
          title: model.backupBusy ? "Working..." : "Restore Backup",
          detail: model.googleDriveUnavailable ? "Needs Google Drive" : "Download latest backup",
          systemImage: "square.and.arrow.down",
          disabled: model.backupBusy || model.googleDriveUnavailable,
          busy: model.backupBusy,
          colors: colors,
          action: { model.onAction?(["action": "restoreBackup"]) }
        )
      }
    }
  }

  private var exportPrivacySection: some View {
    SettingsNativeSection(title: "Export & Privacy", colors: colors) {
      SettingsNativeGroup(colors: colors) {
        SettingsButtonRow(title: "Export CSV", detail: "Location history CSV", systemImage: "square.and.arrow.down", colors: colors) {
          model.onAction?(["action": "exportCsv"])
        }
        SettingsNativeDivider(colors: colors)
        SettingsButtonRow(title: "Save Local Backup", detail: "Local JSON file", systemImage: "externaldrive.badge.plus", colors: colors) {
          model.onAction?(["action": "saveLocalBackup"])
        }
        SettingsNativeDivider(colors: colors)
        SettingsButtonRow(
          title: "Disconnect Google",
          detail: model.googleConnected ? "Remove saved token" : "No account connected",
          systemImage: "rectangle.portrait.and.arrow.right",
          destructive: true,
          colors: colors
        ) {
          model.onAction?(["action": "disconnectGoogle"])
        }
        SettingsNativeDivider(colors: colors)
        SettingsButtonRow(
          title: model.resetBusy ? "Working..." : "Backup & Logout",
          detail: model.googleDriveUnavailable ? "Needs Google Drive" : "Backup, clear, and return to onboarding",
          systemImage: "icloud.and.arrow.up",
          destructive: true,
          disabled: model.resetBusy || model.backupBusy || model.googleDriveUnavailable,
          busy: model.resetBusy,
          colors: colors
        ) {
          model.onAction?(["action": "backupLogout"])
        }
        SettingsNativeDivider(colors: colors)
        SettingsButtonRow(
          title: model.resetBusy ? "Clearing..." : "Clear & Logout",
          detail: "Clear device and return to onboarding",
          systemImage: "xmark.circle",
          destructive: true,
          disabled: model.resetBusy,
          busy: model.resetBusy,
          colors: colors
        ) {
          model.onAction?(["action": "clearLogout"])
        }
      }
    }
  }

  private var fiscalYearSection: some View {
    SettingsNativeSection(title: "Fiscal Year", colors: colors) {
      SettingsNativeGroup(colors: colors) {
        SettingsButtonRow(title: "Residency Year", detail: settingsResidencyYearDetail(year: model.residencyYear, calendarYearMode: model.calendarYearMode), systemImage: "calendar", colors: colors) {
          model.onAction?(["action": "residencyYear"])
        }
      }
    }
  }

  private var appearanceSection: some View {
    SettingsNativeSection(title: "Appearance", colors: colors) {
      SettingsNativeGroup(colors: colors) {
        SettingsButtonRow(title: "Theme", detail: settingsAppearanceLabel(model.appearance), systemImage: "desktopcomputer", colors: colors) {
          draftAppearance = model.appearance
          activeSheet = .appearance
        }
      }
    }
  }

  private func openResidencySheet() {
    draftYear = min(2100, max(2000, model.residencyYear))
    draftCalendarYearMode = model.calendarYearMode
    activeSheet = .residency
  }
}

private struct SettingsNativeColors {
  let screen: Color
  let group: Color
  let groupBorder: Color
  let control: Color
  let controlBorder: Color
  let divider: Color
  let foreground: Color
  let muted: Color
  let section: Color
  let icon: Color
  let chevron: Color
  let disabled: Color
  let switchOn: Color
  let tint: Color
  let tintForeground: Color
  let danger: Color
  let success: Color
  let info: Color
  let errorBack: Color
  let successBack: Color
  let infoBack: Color
  let drawer: Color

  init(model: SettingsScreenModel) {
    screen = SettingsNativeColors.color(model.screen, fallback: .systemBackground)
    group = SettingsNativeColors.color(model.group, fallback: .secondarySystemBackground)
    groupBorder = SettingsNativeColors.color(model.groupBorder, fallback: .separator)
    control = SettingsNativeColors.color(model.control, fallback: .tertiarySystemBackground)
    controlBorder = SettingsNativeColors.color(model.controlBorder, fallback: .separator)
    divider = SettingsNativeColors.color(model.divider, fallback: .separator)
    foreground = SettingsNativeColors.color(model.foreground, fallback: .label)
    muted = SettingsNativeColors.color(model.muted, fallback: .secondaryLabel)
    section = SettingsNativeColors.color(model.section, fallback: .secondaryLabel)
    icon = SettingsNativeColors.color(model.icon, fallback: .label)
    chevron = SettingsNativeColors.color(model.chevron, fallback: .tertiaryLabel)
    disabled = SettingsNativeColors.color(model.disabled, fallback: .tertiaryLabel)
    switchOn = SettingsNativeColors.color(model.switchOn, fallback: .systemGreen)
    tint = SettingsNativeColors.color(model.tint, fallback: .label)
    tintForeground = SettingsNativeColors.color(model.tintForeground, fallback: .systemBackground)
    danger = SettingsNativeColors.color(model.danger, fallback: .systemRed)
    success = SettingsNativeColors.color(model.success, fallback: .systemGreen)
    info = SettingsNativeColors.color(model.info, fallback: .secondaryLabel)
    errorBack = SettingsNativeColors.color(model.errorBack, fallback: .secondarySystemBackground)
    successBack = SettingsNativeColors.color(model.successBack, fallback: .secondarySystemBackground)
    infoBack = SettingsNativeColors.color(model.infoBack, fallback: .secondarySystemBackground)
    drawer = SettingsNativeColors.color(model.drawer, fallback: .systemBackground)
  }

  private static func color(_ value: String, fallback: UIColor) -> Color {
    Color(uiColor: UIColor(settingsScreenColorString: value) ?? fallback)
  }
}

private struct SettingsNativeSection<Content: View>: View {
  let title: String
  let colors: SettingsNativeColors
  @ViewBuilder let content: Content

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(title)
        .font(.system(size: 18, weight: .bold))
        .foregroundStyle(colors.section)
        .lineLimit(1)
        .padding(.horizontal, 18)
      content
    }
  }
}

private struct SettingsNativeGroup<Content: View>: View {
  let colors: SettingsNativeColors
  @ViewBuilder let content: Content

  var body: some View {
    VStack(spacing: 0) {
      content
    }
    .background(colors.group, in: RoundedRectangle(cornerRadius: 32, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 32, style: .continuous)
        .stroke(colors.groupBorder, lineWidth: 1)
    }
    .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
  }
}

private struct SettingsSwitchRow: View {
  let title: String
  let detail: String
  let systemImage: String
  var disabled = false
  @Binding var value: Bool
  let colors: SettingsNativeColors

  var body: some View {
    SettingsRowChrome(title: title, detail: detail, systemImage: systemImage, disabled: disabled, colors: colors) {
      Toggle("", isOn: $value)
        .labelsHidden()
        .tint(colors.switchOn)
        .disabled(disabled)
    }
  }
}

private struct SettingsButtonRow: View {
  let title: String
  let detail: String
  let systemImage: String
  var destructive = false
  var disabled = false
  var busy = false
  let colors: SettingsNativeColors
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      SettingsRowChrome(title: title, detail: detail, systemImage: systemImage, destructive: destructive, disabled: disabled, colors: colors) {
        if busy {
          ProgressView()
            .controlSize(.regular)
            .tint(colors.tint)
            .frame(width: 28, height: 28)
        } else {
          Image(systemName: "chevron.right")
            .font(.system(size: 22, weight: .semibold))
            .foregroundStyle(disabled ? colors.disabled : colors.chevron)
            .frame(width: 28, height: 28)
        }
      }
    }
    .buttonStyle(.plain)
    .disabled(disabled)
  }
}

private struct SettingsInfoRow: View {
  let title: String
  let detail: String
  let systemImage: String
  let colors: SettingsNativeColors

  var body: some View {
    SettingsRowChrome(title: title, detail: detail, systemImage: systemImage, colors: colors) {
      EmptyView()
    }
  }
}

private struct SettingsRowChrome<Accessory: View>: View {
  let title: String
  let detail: String
  let systemImage: String
  var destructive = false
  var disabled = false
  let colors: SettingsNativeColors
  @ViewBuilder let accessory: Accessory

  private var primaryColor: Color {
    if destructive { return colors.danger }
    return disabled ? colors.disabled : colors.foreground
  }

  private var secondaryColor: Color {
    disabled ? colors.disabled : colors.muted
  }

  private var rowIconColor: Color {
    if destructive { return colors.danger }
    return disabled ? colors.disabled : colors.icon
  }

  var body: some View {
    HStack(spacing: 14) {
      Image(systemName: systemImage)
        .font(.system(size: 24, weight: .semibold))
        .foregroundStyle(rowIconColor)
        .frame(width: 30)

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.system(size: 16, weight: .semibold))
          .foregroundStyle(primaryColor)
          .lineLimit(1)
          .minimumScaleFactor(0.74)
        Text(detail)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(secondaryColor)
          .lineLimit(1)
          .settingsBlurReplace(id: detail)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      accessory
    }
    .padding(.horizontal, 20)
    .padding(.vertical, 12)
    .frame(minHeight: 68)
    .contentShape(Rectangle())
    .opacity(disabled ? 0.62 : 1)
  }
}

private struct SettingsNativeDivider: View {
  let colors: SettingsNativeColors

  var body: some View {
    colors.divider
      .frame(height: 0.5)
      .padding(.leading, 64)
  }
}

private struct SettingsBackupStatus: View {
  let colors: SettingsNativeColors
  let tone: String
  let message: String

  private var isError: Bool { tone == "error" }
  private var isSuccess: Bool { tone == "success" }
  private var iconColor: Color {
    if isError { return colors.danger }
    if isSuccess { return colors.success }
    return colors.info
  }
  private var background: Color {
    if isError { return colors.errorBack }
    if isSuccess { return colors.successBack }
    return colors.infoBack
  }

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      Image(systemName: isError ? "xmark.circle" : "checkmark.circle")
        .font(.system(size: 20, weight: .semibold))
        .foregroundStyle(iconColor)
      Text(message)
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(colors.foreground)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .background(background, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .stroke(iconColor, lineWidth: 1)
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 12)
  }
}

private struct SettingsResidencySheet: View {
  let colors: SettingsNativeColors
  @Binding var draftYear: Int
  @Binding var draftCalendarYearMode: Bool
  let onCancel: () -> Void
  let onConfirm: () -> Void

  var body: some View {
    ZStack(alignment: .bottom) {
      VStack(spacing: 0) {
        Capsule()
          .fill(colors.divider.opacity(0.82))
          .frame(width: 42, height: 4)
          .padding(.top, 10)
          .padding(.bottom, 12)

        SettingsSheetHeader(title: "Residency Year", detail: draftCalendarYearMode ? "Calendar year, Jan-Dec" : "India fiscal year, Apr-Mar", systemImage: "calendar", colors: colors)

        HStack(spacing: 14) {
          Button {
            withAnimation(settingsBlurReplaceAnimation) {
              draftYear = max(2000, draftYear - 1)
            }
          } label: {
            Image(systemName: "chevron.left")
              .font(.system(size: 19, weight: .semibold))
              .frame(width: 46, height: 46)
          }
          .settingsSheetButton(colors: colors, prominent: false)

          VStack(spacing: 3) {
            Text(settingsResidencyYearLabel(year: draftYear, calendarYearMode: draftCalendarYearMode))
              .font(.system(size: 22, weight: .heavy))
              .minimumScaleFactor(0.72)
              .lineLimit(1)
              .foregroundStyle(colors.foreground)
              .settingsBlurReplace(id: settingsResidencyYearLabel(year: draftYear, calendarYearMode: draftCalendarYearMode))
            Text(draftCalendarYearMode ? "Calendar year" : "India FY")
              .font(.system(size: 13, weight: .medium))
              .foregroundStyle(colors.muted)
              .lineLimit(1)
              .settingsBlurReplace(id: draftCalendarYearMode)
          }
          .frame(maxWidth: .infinity)

          Button {
            withAnimation(settingsBlurReplaceAnimation) {
              draftYear = min(2100, draftYear + 1)
            }
          } label: {
            Image(systemName: "chevron.right")
              .font(.system(size: 19, weight: .semibold))
              .frame(width: 46, height: 46)
          }
          .settingsSheetButton(colors: colors, prominent: false)
        }
        .padding(10)
        .background(colors.control, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay {
          RoundedRectangle(cornerRadius: 24, style: .continuous)
            .stroke(colors.controlBorder, lineWidth: 1)
        }
        .padding(.horizontal, 22)
        .padding(.top, 22)

        Picker("Year mode", selection: Binding(
          get: { draftCalendarYearMode },
          set: { value in
            withAnimation(settingsBlurReplaceAnimation) {
              draftCalendarYearMode = value
            }
          }
        )) {
          Text("India FY").tag(false)
          Text("Calendar").tag(true)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 22)
        .padding(.top, 16)

        Spacer(minLength: 0)
      }
      .padding(.bottom, 88)

      actionFooter
    }
    .background(colors.drawer.ignoresSafeArea())
  }

  private var actionFooter: some View {
    VStack(spacing: 0) {
      LinearGradient(
        stops: [
          .init(color: colors.drawer.opacity(0), location: 0),
          .init(color: colors.drawer.opacity(0.74), location: 1)
        ],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(height: 46)
      .allowsHitTesting(false)

      HStack(spacing: 12) {
        Button("Cancel", action: onCancel)
          .font(.system(size: 16, weight: .semibold))
          .frame(maxWidth: .infinity, minHeight: 34)
          .settingsSheetButton(colors: colors, prominent: false, controlSize: .small)

        Button(action: onConfirm) {
          Label("Confirm", systemImage: "checkmark")
            .font(.system(size: 16, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: 34)
        }
        .settingsSheetButton(colors: colors, prominent: true, controlSize: .small)
      }
      .padding(.horizontal, 28)
      .padding(.top, 0)
      .padding(.bottom, 14)
      .background(colors.drawer.opacity(0.74))
    }
  }
}

private struct SettingsAppearanceSheet: View {
  let colors: SettingsNativeColors
  @Binding var selectedAppearance: String
  let onSelect: (String) -> Void

  var body: some View {
    VStack(spacing: 18) {
      Capsule()
        .fill(colors.divider.opacity(0.82))
        .frame(width: 42, height: 4)
        .padding(.top, 10)

      SettingsSheetHeader(title: "Theme", detail: "Set the app appearance preference.", systemImage: "desktopcomputer", colors: colors)

      SettingsAppearanceTabs(colors: colors, selectedAppearance: selectedAppearance) { value in
        selectedAppearance = value
        onSelect(value)
      }
      .padding(.horizontal, 22)

      Spacer(minLength: 0)
    }
    .background(colors.drawer.ignoresSafeArea())
  }
}

private struct SettingsAppearanceTabs: View {
  let colors: SettingsNativeColors
  let selectedAppearance: String
  let onSelect: (String) -> Void

  var body: some View {
    HStack(spacing: 6) {
      ForEach(settingsAppearanceOptions, id: \.value) { option in
        SettingsAppearanceTab(
          colors: colors,
          isSelected: selectedAppearance == option.value,
          label: option.label,
          systemImage: option.systemImage
        ) {
          onSelect(option.value)
        }
      }
    }
    .padding(5)
    .background(colors.control.opacity(0.92), in: Capsule())
    .overlay {
      Capsule()
        .stroke(colors.controlBorder.opacity(0.7), lineWidth: 1)
    }
  }
}

private struct SettingsAppearanceTab: View {
  let colors: SettingsNativeColors
  let isSelected: Bool
  let label: String
  let systemImage: String
  let onSelect: () -> Void

  var body: some View {
    Button(action: onSelect) {
      VStack(spacing: 5) {
        Image(systemName: systemImage)
          .font(.system(size: 21, weight: .semibold))
          .frame(height: 23)
        Text(label)
          .font(.system(size: 13, weight: .semibold))
          .lineLimit(1)
          .minimumScaleFactor(0.82)
      }
      .foregroundStyle(isSelected ? colors.foreground : colors.muted)
      .frame(maxWidth: .infinity, minHeight: 58)
      .background {
        if isSelected {
          Capsule()
            .fill(colors.foreground.opacity(0.14))
            .overlay {
              Capsule()
                .stroke(colors.foreground.opacity(0.16), lineWidth: 1)
            }
        }
      }
      .contentShape(Capsule())
    }
    .buttonStyle(.plain)
    .accessibilityLabel(label)
    .accessibilityAddTraits(isSelected ? .isSelected : [])
  }
}

private struct SettingsSheetHeader: View {
  let title: String
  let detail: String
  let systemImage: String
  let colors: SettingsNativeColors

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: systemImage)
        .font(.system(size: 20, weight: .semibold))
        .foregroundStyle(colors.tint)
        .frame(width: 42, height: 42)
        .background(colors.control, in: Circle())

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.system(size: 18, weight: .bold))
          .foregroundStyle(colors.foreground)
          .lineLimit(1)
        Text(detail)
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(colors.muted)
          .lineLimit(1)
      }

      Spacer(minLength: 0)
    }
    .padding(.horizontal, 22)
  }
}

private extension View {
  @ViewBuilder
  func settingsBlurReplace<ID: Hashable>(id: ID) -> some View {
    if #available(iOS 17.0, *) {
      self
        .id(id)
        .transition(.blurReplace)
        .animation(settingsBlurReplaceAnimation, value: id)
    } else {
      self
        .id(id)
        .transition(.opacity.combined(with: .scale(scale: 0.98)))
        .animation(settingsBlurReplaceAnimation, value: id)
    }
  }

  @ViewBuilder
  func settingsPresentation(height: CGFloat, background: Color) -> some View {
    if #available(iOS 16.4, *) {
      self
        .presentationDetents([.height(height)])
        .presentationDragIndicator(.hidden)
        .presentationCornerRadius(34)
        .presentationBackground(background)
    } else if #available(iOS 16.0, *) {
      self
        .presentationDetents([.height(height)])
        .presentationDragIndicator(.hidden)
    } else {
      self
    }
  }

  @ViewBuilder
  func settingsSheetButton(colors: SettingsNativeColors, prominent: Bool, controlSize: ControlSize = .large) -> some View {
    if prominent {
      self
        .buttonStyle(.borderedProminent)
        .foregroundStyle(colors.tintForeground)
        .tint(colors.tint)
        .controlSize(controlSize)
    } else {
      self
        .buttonStyle(.bordered)
        .foregroundStyle(colors.foreground)
        .tint(colors.foreground)
        .controlSize(controlSize)
    }
  }
}

private func settingsResidencyYearLabel(year: Int, calendarYearMode: Bool) -> String {
  if calendarYearMode {
    return String(year)
  }

  return "FY \(String(format: "%02d", (year - 1) % 100))-\(String(format: "%02d", year % 100))"
}

private func settingsResidencyYearDetail(year: Int, calendarYearMode: Bool) -> String {
  let modeLabel = calendarYearMode ? "Calendar year, Jan-Dec" : "India fiscal year, Apr-Mar"
  return "\(settingsResidencyYearLabel(year: year, calendarYearMode: calendarYearMode)), \(modeLabel)"
}

private func settingsAppearanceLabel(_ value: String) -> String {
  switch value {
  case "light": return "Light"
  case "dark": return "Dark"
  default: return "System"
  }
}

private extension UIColor {
  convenience init?(settingsScreenColorString string: String) {
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
