/**
 * In-app release notes shown from Dashboard → Settings → What’s new.
 * Keep in sync with CHANGELOG.md for listed versions (copy user-facing bullets).
 */

export type ChangelogRelease = {
  version: string;
  date: string;
  androidVersionCode?: number;
  added?: string[];
  fixed?: string[];
  changed?: string[];
};

export const CHANGELOG_IN_APP: ChangelogRelease[] = [
  {
    version: "1.0.10",
    date: "2026-05-19",
    androidVersionCode: 10,
    added: [
      "Location → Opening hours: Apply to all days copies one day’s open/close times to Mon–Sun and enables every day.",
      "Settings → Data: Last export and Last import timestamps under the export/import buttons.",
      "Settings → Export format: JSON (default) or Tubz CSV; import accepts both.",
      "Location → Restock session: Change product on New stock in swapped slots rows to redo the replacement SKU.",
    ],
    changed: [
      "Dashboard → Test menu (🧪): notification diagnostics moved here from main Settings.",
      "Products: name, category, and optional image only — emoji removed from the catalog and exports.",
      "Settings → Export / import: status text below the buttons; modal stays open after a successful import.",
      "Tab screens: consistent header layout and spacing aligned with the dashboard.",
    ],
    fixed: [
      "Dashboard → Settings → What’s new no longer crashes when a release section is empty.",
      "Import: stronger on-device validation; invalid files rejected instead of corrupting data.",
      "Web import no longer stuck on Importing…; CSV location rows import correctly again.",
    ],
  },
  {
    version: "1.0.9",
    date: "2026-05-11",
    androidVersionCode: 9,
    added: [
      "Settings → Stock levels: set max units per column for sweet (default 9) and toy (default 12). Used for restock caps, location restock sessions, and history — not the nine columns in the slot grid.",
    ],
    changed: [
      "Location → Restock session → Change product: original columns and planogram stay until you tap Done; track missing stock on the old SKU during the session, then slots update when you finish.",
    ],
    fixed: [
      "Add location: optional Google Maps link saves reliably when creating a location.",
      "Safer handling when restock history data is missing or unusual; avoids crashes on location/stock/history screens.",
    ],
  },
  {
    version: "1.0.8",
    date: "2026-05-02",
    androidVersionCode: 8,
    fixed: [
      "Stock → Overview → Top selling: when a location restock changes product in a slot, only the missing quantity at swap counts toward the old product. The new product’s replacement line no longer inflates top sellers.",
    ],
  },
  {
    version: "1.0.7",
    date: "2026-05-01",
    androidVersionCode: 7,
    added: [
      "Location → Restock every: the 1-week option is “Remind me · in 1 week” and anchors the next due date to one week from when you tap; when selected it shows “1 week · due”. Tapping again refreshes that countdown. Restock now clears the anchor so the next cycle uses last restocked + period.",
      "Dashboard → Upcoming restocks: 1-week anchored reminders appear with a due date even if the location has never been restocked.",
    ],
    fixed: [
      "Web / static export: test menu no longer loads expo-notifications in the browser (Expo push lab is native-only), avoiding localStorage errors during static rendering.",
      "Android release builds: more reliable local scheduling without @react-native-firebase/app; google-services pipeline for push; ProGuard keeps expo.modules classes for notifications.",
    ],
    changed: [
      "Export / import: optional restockPeriodAnchorAt on locations is validated when present.",
    ],
  },
  {
    version: "1.0.6",
    date: "2026-04-30",
    androidVersionCode: 6,
    added: [
      "Stock → Overview: Top selling Sweets / Top selling Toys — ranks products by total units restocked across all locations (from restock history); shows top 5 per category with Show all to expand; podium styling for the top three; headers labelled distinctly from the inventory sections below.",
      "Location → Restock session: Done checkbox per line (same idea as the Restock tab) and double-tap the product image + name to jump between full slot capacity and zero when the line is not done; short tip shown at the top of the modal.",
      "Location → machine slot picker: Search products (same pattern as the Restock tab) and pick a product from an A–Z sorted list.",
      "Location → opening hours: Mobile time picker (hour/minute controls) for open/close times; web still uses time-friendly entry.",
    ],
    fixed: [
      "Stock → Overview scroll: Top Sellers and inventory now share one SectionList header so you can scroll through the whole overview.",
      "Opening hours on mobile: time chosen in the picker now saves correctly (avoided reading stale state immediately after update).",
      "Location restock session: quantities and caps respect multiple slots of the same product (one row per product; max = slot count × 9 sweets / × 12 toys).",
    ],
    changed: [
      "Location: removed the standalone Edit date control for “last restocked”; the date still updates when you complete a restock or edit history.",
      "Settings modals (app ⚙️ and location gear menu): slightly faster fade open/close.",
    ],
  },
  {
    version: "1.0.5",
    date: "2026-04-24",
    androidVersionCode: 5,
    added: [
      "SCHEDULE_EXACT_ALARM Android permission so restock reminders can fire at exact times on Android 12+.",
      "Crash log surfaced from the dashboard test menu for easier in-field debugging.",
      "Shared full-screen modal navbar component; dashboard menus, Add Location and the product editor are now full-screen with a consistent Cancel/Title/Save layout.",
      "Overnight opening hours (e.g. 22:00–02:00) now report the correct open/closed status.",
      "Extra validation on imported export files — malformed location/product entries are rejected instead of silently corrupting state.",
    ],
    fixed: [
      "Restock notifications not firing on production APK/AAB builds (the reschedule now awaits permissions + channel setup before scheduling; this also improves reliability of normal per-location reminders).",
      "App crash after creating a new location and immediately opening it.",
      "Export failing with “cannot read property 'UTF 8' of undefined” on some devices (moved off the deprecated expo-file-system legacy API).",
      "Brief white flash when navigating between a location and the Locations tab in dark mode.",
      "Date picker wheels showing the previous value when re-opening with a different date.",
      "Splash icon updated so it no longer appears cropped.",
      "Web data import occasionally rejecting with “Cancelled” before the file finished loading.",
      "Notification small/large icon rendering (small icon stays monochrome, large icon uses the app icon).",
    ],
    changed: [
      "Full-screen menus (Settings, Edit Address, Opening Hours, Restock History, Delete confirmation, Add Location, dashboard test/crash menus, Product editor) now use a fade open/close animation instead of sliding.",
      "Privacy policy updated to cover the new exact-alarm permission and notification/camera usage.",
      "Internal cleanup pass: split large screens into smaller components; split AppContext; hoisted lookups; removed dead code. No user-facing change beyond smoother renders.",
      "Content inside machine cards no longer feels cramped when restocking a location.",
      "Test notification IDs renamed so they are always swept by the next reschedule.",
    ],
  },
  {
    version: "1.0.4",
    date: "2026-04-23",
    androidVersionCode: 4,
    added: [
      "Dashboard test menu (🧪) next to settings, to fire sample Restock Due local notifications for QA (temporary; remove when no longer needed).",
    ],
    fixed: [
      "Restock local notifications for short restock periods (e.g. 1 week): when a “7 days before due” reminder is not possible, the notification is scheduled for the due date instead of a few seconds ahead.",
    ],
    changed: ["README updated for notification behaviour and the test menu."],
  },
];
