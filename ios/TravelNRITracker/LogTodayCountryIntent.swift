import AppIntents
import Foundation

@available(iOS 16.0, *)
struct LogTodayCountryIntent: AppIntent {
  static var title: LocalizedStringResource = "Log Country"
  static var description = IntentDescription("Records the current location and country in NomadTrack.")
  static var isDiscoverable = true
  static var openAppWhenRun = false

  @MainActor
  func perform() async throws -> some IntentResult {
    ForceQuitLocationService.shared.postStatusNotification(
      title: "Taking location",
      body: "T7 shortcuts Updating today's travel location."
    )
    ForceQuitLocationService.shared.requestOneShot(source: "shortcuts")
    return .result()
  }
}

@available(iOS 16.0, *)
struct NomadTrackShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: LogTodayCountryIntent(),
      phrases: [
        "Log country in \(.applicationName)",
        "Log my country in \(.applicationName)",
        "Log location in \(.applicationName)"
      ],
      shortTitle: "Log Country",
      systemImageName: "globe"
    )
  }
}
