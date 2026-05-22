# NomadTrack

Privacy-first React Native app for automatic travel history, India fiscal-year day counts, country totals, calendar/map views, CSV export, and Google Drive AppData backup. It is local-first: SQLite is the source of truth and there is no custom backend.

## Security workflow

Packages were resolved with lifecycle scripts disabled before install:

```sh
npm install --package-lock-only --ignore-scripts
npm audit --audit-level=moderate
npm install --ignore-scripts
```

The current lockfile audit reports `0 vulnerabilities`. Keep using `npm run security:lock` before adding or upgrading packages.

## Setup

Required Node: `>=20.19.4`. The local machine used to scaffold this app had Node `20.19.2`, which triggers engine warnings with the latest React Native/Expo packages.

```sh
npm install --ignore-scripts
npm run typecheck
npm start
```

`npm start` targets the installed development build. Use `npm run start:go` only when you specifically want Expo Go.

## iOS

1. Install Xcode and CocoaPods.
2. Set `ios.bundleIdentifier` in `app.json`.
3. Add iOS OAuth client id under `expo.extra.googleIosClientId`.
4. Configure Maps provider credentials if using Google Maps on iOS.
5. Run:

```sh
npm run ios
```

For later simulator launches after the native app is installed, run `npm start` or `npm run start:dev-client`.

The app declares background location usage strings for continuous travel history and country-day calculations.

## Android

1. Install Android Studio and SDK tooling.
2. Set `android.package` in `app.json`.
3. Add Android OAuth client id under `expo.extra.googleAndroidClientId`.
4. Add Google Maps key through the native config/plugin path you choose for production.
5. Run:

```sh
npm run android
```

Android permissions include foreground/background location, foreground location service, notifications, and image metadata access.

## Google Sign-In and Drive backup

Create OAuth clients in Google Cloud Console and enable the Google Drive API. The app requests only:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/drive.file`

Backups are calendar-year JSON snapshots uploaded to `My Drive/NomadTrack/<year>/travel-nri-tracker-backup.json`, for example `NomadTrack/2026/travel-nri-tracker-backup.json`. Drive is not treated as a real-time database.

## Reverse geocoding

The app uses `expo-location`'s native `reverseGeocodeAsync` on iOS and Android to resolve saved GPS points into country, region, city, and timezone data. If the device is offline, raw GPS points are saved immediately with `reverseGeocodeStatus = pending` and queued for exponential retry.

Expo's reverse geocoder is not available on web, so web builds need a separate geocoding provider before queued locations can be validated there.

## Implemented MVP surface

- SQLite database and migrations
- Background/manual location capture
- Offline geocode queue with retry windows
- Multi-country day segment calculation
- India fiscal year calculation helpers
- Dashboard, calendar, map, trips, settings screens
- React Native Reusables-style UI primitives with NativeWind
- Google Drive AppData backup plumbing
- CSV export

## Not yet production-complete

- Native store release configuration
- Manual day override editor
- Photo EXIF import UI
- PDF reports
- Widgets
- Conflict-aware restore merge UI
