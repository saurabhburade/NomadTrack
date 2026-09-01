import CoreLocation
import Foundation
import React
import UIKit
import UserNotifications

private let forceQuitLocationEventName = "ForceQuitLocationEvent"
private let pendingEventsKey = "ForceQuitLocationPendingEvents"
private let monitoringEnabledKey = "ForceQuitLocationMonitoringEnabled"
private let chargerConnectedMinimumInterval: TimeInterval = 5 * 60

private struct ForceQuitLocationEvent: Codable {
  let id: String
  let source: String
  let timestamp: String
  let latitude: Double
  let longitude: Double
  let accuracy: Double
}

final class ForceQuitLocationService: NSObject, CLLocationManagerDelegate {
  static let shared = ForceQuitLocationService()

  private let locationManager = CLLocationManager()
  private let isoFormatter = ISO8601DateFormatter()
  private weak var eventEmitter: ForceQuitLocationModule?
  private var isConfigured = false
  private var batteryStateObserver: NSObjectProtocol?
  private var lastChargerConnectedEventAt: Date?
  private var pendingLocationSource: String?

  private override init() {
    super.init()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  }

  func configure(launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) {
    guard !isConfigured else {
      if launchOptions?[.location] != nil && isMonitoringEnabled {
        startMonitoringIfAuthorized()
      }
      return
    }

    isConfigured = true
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
    locationManager.distanceFilter = 500
    locationManager.pausesLocationUpdatesAutomatically = false
    startBatteryStateMonitoring()

    let backgroundModes = Bundle.main.object(forInfoDictionaryKey: "UIBackgroundModes") as? [String] ?? []
    if backgroundModes.contains("location") {
      locationManager.allowsBackgroundLocationUpdates = true
    }

    if isMonitoringEnabled {
      startMonitoringIfAuthorized()
    }

    if launchOptions?[.location] != nil && isMonitoringEnabled {
      locationManager.startMonitoringSignificantLocationChanges()
    }
  }

  func attachEmitter(_ emitter: ForceQuitLocationModule) {
    eventEmitter = emitter
  }

  func startMonitoringIfAuthorized() {
    configure()
    guard CLLocationManager.locationServicesEnabled() else { return }
    guard locationManager.authorizationStatus == .authorizedAlways else { return }

    locationManager.startMonitoringVisits()
    locationManager.startMonitoringSignificantLocationChanges()

    if let location = locationManager.location {
      anchorRegion(around: location.coordinate)
    }

    handleBatteryStateChange()
  }

  func enableMonitoring() {
    UserDefaults.standard.set(true, forKey: monitoringEnabledKey)
    startMonitoringIfAuthorized()
  }

  func stopMonitoring() {
    UserDefaults.standard.set(false, forKey: monitoringEnabledKey)
    locationManager.stopMonitoringVisits()
    locationManager.stopMonitoringSignificantLocationChanges()
    stopAnchorRegions()
  }

  func requestOneShot(source: String) {
    configure()
    guard CLLocationManager.locationServicesEnabled() else { return }
    guard locationManager.authorizationStatus == .authorizedAlways || locationManager.authorizationStatus == .authorizedWhenInUse else {
      return
    }

    if let location = locationManager.location {
      enqueue(
        source: source,
        coordinate: location.coordinate,
        accuracy: max(location.horizontalAccuracy, 0),
        timestamp: location.timestamp
      )
      anchorRegion(around: location.coordinate)
      return
    }

    pendingLocationSource = source
    locationManager.requestLocation()
  }

  func postStatusNotification(title: String, body: String) {
    let center = UNUserNotificationCenter.current()
    center.getNotificationSettings { settings in
      let allowedStatuses: [UNAuthorizationStatus] = [.authorized, .provisional, .ephemeral]
      guard allowedStatuses.contains(settings.authorizationStatus) else { return }

      let content = UNMutableNotificationContent()
      content.title = title
      content.body = body

      let request = UNNotificationRequest(
        identifier: "nomadtrack-status-location",
        content: content,
        trigger: nil
      )
      center.add(request)
    }
  }

  func pendingEvents() -> [[String: Any]] {
    readPendingEvents().map(dictionary(from:))
  }

  func markProcessed(ids: [String]) {
    guard !ids.isEmpty else { return }
    let processed = Set(ids)
    let remaining = readPendingEvents().filter { !processed.contains($0.id) }
    writePendingEvents(remaining)
  }

  func clearPendingEvents() {
    pendingLocationSource = nil
    UserDefaults.standard.removeObject(forKey: pendingEventsKey)
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if isMonitoringEnabled {
      startMonitoringIfAuthorized()
    }
  }

  func locationManager(_ manager: CLLocationManager, didVisit visit: CLVisit) {
    guard isMonitoringEnabled else { return }
    enqueue(
      source: "visit",
      coordinate: visit.coordinate,
      accuracy: max(visit.horizontalAccuracy, 0)
    )
    anchorRegion(around: visit.coordinate)
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }
    let requestedSource = pendingLocationSource
    pendingLocationSource = nil
    guard isMonitoringEnabled || requestedSource != nil else { return }

    enqueue(
      source: requestedSource ?? "slc",
      coordinate: location.coordinate,
      accuracy: max(location.horizontalAccuracy, 0),
      timestamp: location.timestamp
    )
    anchorRegion(around: location.coordinate)
  }

  func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
    guard isMonitoringEnabled else { return }
    guard region.identifier.hasPrefix("nomadtrack-anchor-") else { return }
    pendingLocationSource = "region-exit"
    locationManager.requestLocation()
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    pendingLocationSource = nil
  }

  private func startBatteryStateMonitoring() {
    UIDevice.current.isBatteryMonitoringEnabled = true
    guard batteryStateObserver == nil else { return }

    batteryStateObserver = NotificationCenter.default.addObserver(
      forName: UIDevice.batteryStateDidChangeNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.handleBatteryStateChange()
    }
  }

  private func handleBatteryStateChange() {
    guard isMonitoringEnabled else { return }
    let state = UIDevice.current.batteryState
    guard state == .charging || state == .full else { return }

    let now = Date()
    if let lastEventAt = lastChargerConnectedEventAt,
       now.timeIntervalSince(lastEventAt) < chargerConnectedMinimumInterval {
      return
    }

    lastChargerConnectedEventAt = now
    requestOneShot(source: "charger-connected")
  }

  private func enqueue(
    source: String,
    coordinate: CLLocationCoordinate2D,
    accuracy: Double,
    timestamp: Date = Date()
  ) {
    let event = ForceQuitLocationEvent(
      id: UUID().uuidString,
      source: source,
      timestamp: isoFormatter.string(from: timestamp),
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      accuracy: accuracy
    )

    var pending = readPendingEvents()
    pending.append(event)
    writePendingEvents(pending)
    eventEmitter?.sendLocationEvent(dictionary(from: event))
  }

  private func anchorRegion(around coordinate: CLLocationCoordinate2D) {
    guard CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) else { return }
    stopAnchorRegions()

    let region = CLCircularRegion(
      center: coordinate,
      radius: 1000,
      identifier: "nomadtrack-anchor-\(UUID().uuidString)"
    )
    region.notifyOnEntry = false
    region.notifyOnExit = true
    locationManager.startMonitoring(for: region)
  }

  private func stopAnchorRegions() {
    locationManager.monitoredRegions
      .filter { $0.identifier.hasPrefix("nomadtrack-anchor-") }
      .forEach { locationManager.stopMonitoring(for: $0) }
  }

  private func readPendingEvents() -> [ForceQuitLocationEvent] {
    guard let data = UserDefaults.standard.data(forKey: pendingEventsKey) else { return [] }
    return (try? JSONDecoder().decode([ForceQuitLocationEvent].self, from: data)) ?? []
  }

  private func writePendingEvents(_ events: [ForceQuitLocationEvent]) {
    guard let data = try? JSONEncoder().encode(events) else { return }
    UserDefaults.standard.set(data, forKey: pendingEventsKey)
  }

  private func dictionary(from event: ForceQuitLocationEvent) -> [String: Any] {
    [
      "id": event.id,
      "source": event.source,
      "timestamp": event.timestamp,
      "coords": [
        "latitude": event.latitude,
        "longitude": event.longitude,
        "accuracy": event.accuracy
      ]
    ]
  }

  private var isMonitoringEnabled: Bool {
    UserDefaults.standard.bool(forKey: monitoringEnabledKey)
  }
}

@objc(ForceQuitLocationModule)
final class ForceQuitLocationModule: RCTEventEmitter {
  override init() {
    super.init()
    ForceQuitLocationService.shared.attachEmitter(self)
  }

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    [forceQuitLocationEventName]
  }

  @objc(startMonitoring:rejecter:)
  func startMonitoring(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      ForceQuitLocationService.shared.enableMonitoring()
      resolve(true)
    }
  }

  @objc(stopMonitoring:rejecter:)
  func stopMonitoring(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      ForceQuitLocationService.shared.stopMonitoring()
      resolve(true)
    }
  }

  @objc(getPendingLocationEvents:rejecter:)
  func getPendingLocationEvents(
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(ForceQuitLocationService.shared.pendingEvents())
  }

  @objc(markLocationEventsProcessed:resolver:rejecter:)
  func markLocationEventsProcessed(
    _ ids: [String],
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    ForceQuitLocationService.shared.markProcessed(ids: ids)
    resolve(true)
  }

  @objc(clearPendingLocationEvents:rejecter:)
  func clearPendingLocationEvents(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      ForceQuitLocationService.shared.clearPendingEvents()
      resolve(true)
    }
  }

  func sendLocationEvent(_ event: [String: Any]) {
    sendEvent(withName: forceQuitLocationEventName, body: event)
  }
}
