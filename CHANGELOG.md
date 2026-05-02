# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Versioning (keep in sync):**

---

## [Unreleased]

---

## [1.0.8] - 2026-05-02

**Android `versionCode`:** 8

### Fixed

- **Stock → Overview → Top selling:** when a **location restock** **changes product** in a slot (old SKU → new SKU), rankings now count only the **missing quantity recorded at swap** toward the **old** product. The **new** product’s restock line on that session (often a full tube after auto-fill) no longer adds to top sellers, because that reflects **replacing** the slot, not incremental sales volume.

---

## [1.0.7] - 2026-05-01

**Android `versionCode`:** 7

### Added

- **Location → Restock every:** the **1 week** option is labelled **“Remind me” / “in 1 week”** before selection and **“1 week” / “due”** when active. Choosing it stores an on-device **reminder anchor** so the due date is **one week from when you tap**, not only from the last restock or creation date. Tapping again while selected refreshes that one-week countdown. **Restock now** clears the anchor so the next cycle follows **last restocked + period** like other intervals; **Clear** or choosing **2–12 weeks** clears the anchor. **Upcoming restocks** on the dashboard **include** these reminders even when the location has never been restocked.

### Fixed

- **Web / static export:** the dashboard test menu no longer imports **`expo-notifications`** on web (Expo push lab is **native-only**), avoiding **`localStorage.getItem`** errors during `expo export` and static rendering.
- **Android release builds:** local restock scheduling is more reliable without `@react-native-firebase/app`; Firebase for device push uses the bundled **`google-services.json`** pipeline, and **ProGuard** keep rules preserve Expo notification-related classes under `expo.modules`.

### Changed

- **Export / import:** optional field **`restockPeriodAnchorAt`** on locations is validated on import when present.

---

## [1.0.6] - 2026-04-30

**Android `versionCode`:** 6

### Added

- **Stock → Overview:** **Top selling Sweets** / **Top selling Toys** — ranks products by total units restocked across all locations (from restock history); shows top 5 per category with **Show all** to expand; podium styling for the top three; headers labelled distinctly from the inventory sections below.
- **Location → Restock session:** **Done** checkbox per line (same idea as the Restock tab) and **double-tap** the product image + name to jump between **full slot capacity** and **zero** when the line is not done; short tip shown at the top of the modal.
- **Location → machine slot picker:** **Search** products (same pattern as the Restock tab) and pick a product from an **A–Z** sorted list.
- **Location → opening hours:** **Mobile time picker** (hour/minute controls) for open/close times; web still uses time-friendly entry.

### Fixed

- **Stock → Overview** scroll: Top Sellers and inventory now share one **`SectionList`** header so you can scroll through the whole overview.
- **Opening hours** on mobile: time chosen in the picker now **saves correctly** (avoided reading stale state immediately after update).
- **Location restock session:** quantities and caps respect **multiple slots of the same product** (one row per product; max = slot count × 9 sweets / × 12 toys).

### Changed

- **Location:** removed the standalone **Edit date** control for “last restocked”; the date still updates when you complete a restock or edit history.
- **Settings** modals (app ⚙️ and location gear menu): slightly **faster fade** open/close.

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
