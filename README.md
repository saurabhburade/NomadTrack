# NomadTrack

Local-first React Native app for automatic travel history, India fiscal-year day counts, country totals, calendar/map views, CSV export, and Google Drive backup. SQLite is the source of truth and there is no custom backend.

## Security workflow

NomadTrack uses the pnpm version pinned in `package.json`. Enable Corepack, then use a frozen lockfile and disable lifecycle scripts for reproducible dependency checks:

```sh
corepack enable
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm audit --audit-level=moderate
corepack pnpm check
corepack pnpm typecheck
```

Run the audit after dependency changes and address findings according to their severity and reachability. Do not treat a point-in-time audit result as a lasting security guarantee.

## Code quality and commits

Biome provides source linting and formatting, while commitlint enforces Conventional Commit messages.

```sh
corepack pnpm lint
corepack pnpm format:check
corepack pnpm check:fix
printf 'feat: add a travel view\n' | corepack pnpm commitlint
```

The committed `commit-msg` hook runs commitlint locally. Because the security-oriented install command above disables lifecycle scripts, enable the reviewed hook explicitly after installation with `corepack pnpm run prepare`. CI independently checks source and every commit introduced by a push or pull request.

## Setup

Required Node: `>=20.19.4`. Earlier Node 20.19.x releases may trigger engine warnings with the React Native/Expo packages in this lockfile.

```sh
corepack pnpm install --ignore-scripts
corepack pnpm typecheck
corepack pnpm start
```

`pnpm start` targets the installed development build. Use `pnpm start:go` only when you specifically want Expo Go.

## iOS

1. Install Xcode and CocoaPods.
2. Set `ios.bundleIdentifier` in `app.json`.
3. Add iOS OAuth client id under `expo.extra.googleIosClientId`.
4. Configure Maps provider credentials if using Google Maps on iOS.
5. Run:

```sh
corepack pnpm ios
```

For later simulator launches after the native app is installed, run `pnpm start` or `pnpm start:dev-client`.

The app declares background location usage strings for continuous travel history and country-day calculations.

## Android

1. Install Android Studio and SDK tooling.
2. Set `android.package` in `app.json`.
3. Add Android OAuth client id under `expo.extra.googleAndroidClientId`.
4. Add Google Maps key through the native config/plugin path you choose for production.
5. Run:

```sh
corepack pnpm android
```

Android permissions include foreground/background location, foreground location service, notifications, and image metadata access.

## Google Sign-In and Drive backup

Create OAuth clients in Google Cloud Console and enable the Google Drive API. The app requests only:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/drive.file`

Backups are full, plaintext travel-history JSON snapshots uploaded to the signed-in account's visible `My Drive/NomadTrack/all-data/travel-nri-tracker-backup.json` path. They are not stored in Google AppData and are not end-to-end encrypted by NomadTrack. Anyone with access to that Google account or file may be able to read the backup. Drive is not treated as a real-time database.

Travel-history data and backups can reveal sensitive location information. NomadTrack does not add application-level encryption to its local SQLite data or web `localStorage`; those stores rely on the device, OS account, and browser profile for access control. Use a device lock, protect the connected Google account, review Drive sharing, and delete backups you no longer need. See [SECURITY.md](SECURITY.md) for reporting security issues.

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
- Google Drive backup plumbing
- CSV export

## Not yet production-complete

- Native store release configuration
- Manual day override editor
- Photo EXIF import UI
- PDF reports
- Widgets
- Conflict-aware restore merge UI
