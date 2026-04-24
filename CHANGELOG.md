# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Versioning (keep in sync):**

---

## [Unreleased]

---

## [1.0.5] - 2026-04-24

**Android `versionCode`:** 5

### Added

- `SCHEDULE_EXACT_ALARM` Android permission so restock reminders can fire at exact times on Android 12+.
- **Crash log** surfaced from the dashboard test menu for easier in-field debugging.
- Shared **full-screen modal navbar** component; dashboard menus, Add Location and the product editor are now full-screen with a consistent Cancel/Title/Save layout.
- Overnight opening hours (e.g. 22:00–02:00) now report the correct open/closed status.
- Extra validation on imported export files — malformed location/product entries are rejected instead of silently corrupting state.

### Fixed

- **Restock notifications** not firing on production APK/AAB builds (the reschedule now awaits permissions + channel setup before scheduling; this also improves reliability of normal per-location reminders).
- App crash after creating a new location and immediately opening it.
- Export failing with "cannot read property 'UTF 8' of undefined" on some devices (moved off the deprecated `expo-file-system` legacy API).
- Brief white flash when navigating between a location and the Locations tab in dark mode.
- Date picker wheels showing the previous value when re-opening with a different date.
- Splash icon updated so it no longer appears cropped.
- Web data import occasionally rejecting with "Cancelled" before the file finished loading.
- Notification small/large icon rendering (small icon stays monochrome, large icon uses the app icon).

### Changed

- Full-screen menus (Settings, Edit Address, Opening Hours, Restock History, Delete confirmation, Add Location, dashboard test/crash menus, Product editor) now use a **fade** open/close animation instead of sliding.
- **Privacy policy** updated to cover the new exact-alarm permission and notification/camera usage.
- Internal cleanup pass: split `app/location/[id].tsx`, the dashboard and the restock tab into smaller focused components; split `AppContext` into separate state + actions contexts; hoisted per-render product lookups; removed dead exports, unused props and duplicated constants. No user-facing change beyond smoother renders.
- Content inside machine cards no longer feels cramped when restocking a location.
- Test notification IDs renamed to `test-now` / `test-today` so they are always swept by the next reschedule.

---

## [1.0.4] - 2026-04-23

**Android `versionCode`:** 4

### Added

- Dashboard **test menu** (🧪) next to settings, to fire sample “Restock Due” local notifications for QA (temporary; remove when no longer needed).

### Fixed

- **Restock local notifications** for short restock periods (e.g. 1 week): when a “7 days before due” reminder is not possible, the notification is now scheduled for the **due date** instead of a few seconds ahead, so it is not cancelled by the next automatic reschedule when app state updates.

### Changed

- **README** updated for notification behaviour and the test menu.

---

## [1.0.3] - 2026-04-20

**Android `versionCode`:** 3

### Changed

- Version bump (`app.json` / `package.json`) aligned for builds and store uploads.

---

## [1.0.1] - 2026-04-18

**Android `versionCode`:** 2

### Added

- **`versionCode`** on Android for Play Store–style build increments.

### Changed

- App display name set to **Tubz app** style naming in config (see `app.json`).

---

## [1.0.0] - 2026-04-12

**Android `versionCode`:** 1 (implicit / first EAS/Expo build baseline)

### Added

- Initial Expo app: tabs, locations, products, restock and stock flows, theming, and local persistence (see [README](README.md) for current feature set).
