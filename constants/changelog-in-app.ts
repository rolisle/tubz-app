/**
 * In-app release notes shown from Dashboard → Settings → What’s new.
 * Keep in sync with CHANGELOG.md for listed versions (copy user-facing bullets).
 */

export type ChangelogRelease = {
  version: string;
  date: string;
  androidVersionCode?: number;
  added: string[];
  fixed?: string[];
  changed?: string[];
};

export const CHANGELOG_IN_APP: ChangelogRelease[] = [
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
      "Location → Restock every: the 1-week option reads “Remind me · in 1 week” and sets due one week from when you tap it; when selected it shows “1 week · due”. Tapping it again refreshes that one-week countdown. A normal restock clears that reminder anchor so the next cycle follows last restocked + period.",
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
