# Tubz App

A stock and restock management app for Tubz vending machines, built with [Expo](https://expo.dev) and React Native. Runs on iOS, Android, and web.

## Features

### Dashboard

- Stats overview: total locations, machines, and products
- **Upcoming Restocks** — locations with a restock period set, sorted by soonest due date; never-restocked locations shown at the bottom
- **Recent Restocks** — up to 8 locations sorted by most recently restocked
- Settings icon (⚙️) opens the theme settings modal
- Tap any restock card to navigate directly to that location

### Locations

- Add and manage vending machine locations with full UK address (street, city, postcode)
- UK postcode format validation on both add and edit
- Search locations across all address fields
- View locations as a flat alphabetical list or grouped by city
- Tap the 🔎 icon on any location card to open the address in Google Maps
- Tap the address line inside a location to open it in Google Maps
- **Open/Closed status badge** on each location card and inside the location detail, powered by configurable opening hours
- Track when each location was last restocked (editable date) with full restock history
- Set a **restock period** (1–12 weeks) per location; new locations default to 4 weeks
- Location detail uses a ⚙️ menu (top right) with options: Edit address, Edit opening hours, Restock history, Delete

### Opening Hours

- Set opening and closing times (24h `HH:MM`) per day, Mon–Sun, per location
- Toggle each day on (open) or off (closed)
- Status is calculated in real time: **Open · Closes 5PM**, **Closed · Opens Mon 9AM**, etc.
- Displayed as a colour-coded pill on the location card and at the top of the location detail

### Machines

- Add unlimited sweet 🍬 or toy 🪀 machines per location
- Each sweet machine holds up to 9 slots; each toy machine holds up to 12
- Grid view and list view toggle per machine
- Slot counter shows filled/total (e.g. `6/9`, turns red when full)
- Products in the slot picker are filtered by machine type (sweets only / toys only)
- Adding a product fills the next available empty slot; removing compacts the grid
- Machines grouped by type (Sweet Machines / Toy Machines) in the location detail

### Products

- Built-in catalog of 100+ Tubz products sourced from [tubzbrands.co.uk](https://www.tubzbrands.co.uk), with local images
- Add or edit products: name, category, and optional uploaded image
- Tap a product in the list to edit it; tap its image to zoom full-screen
- No image defaults to a category icon (🍬 sweets, 🪀 toys)
- Toggle between grid view and list view; products sorted alphabetically by category

### Restock

- Standalone restock planner — not tied to any location
- Add sweet and toy machines to a restock list (defaults to one of each on first launch)
- Pick products per machine (filtered by type, searchable)
- Set quantities per product (max 9 for sweet, max 12 for toy); new items start at 0
- Decrement to 0 removes the item; the minus button is disabled at 0
- Add the same product multiple times (each is a separate independent slot)
- Mark items as done (greyed out with strikethrough, controls hidden) and unmark them
- Machine card headers coloured by machine type (matches theme settings)
- Restock list persists between sessions

### Stock

- General inventory tracker — separate from machine slots
- Sections for Sweets and Toys; add any product from the catalog (searchable picker)
- Three stock levels per product: **Full**, **½ Box**, **Empty**
- Full and ½ Box each have their own counter (track multiple boxes)
- Counters and status colours are always visible
- Status auto-updates to **Empty** when both counters reach 0
- Simple view (compact chips) and Detailed view (full counters) via tab toggle
- Sort by: A–Z, Z–A, Lowest stock first, Highest stock first
- Counters and status persist between sessions

### Theme Settings

- Accent / Tab colour (affects buttons, active tab, highlights)
- Sweet Machine colour
- Toy Machine colour
- Supports solid colours and 3-stop gradients, with preset swatches
- Live preview of machine chip colours in the settings modal

### Notifications

- Local push notifications for locations with a restock period set
- Fires 7 days before the restock is due date
- Permissions requested on first launch (iOS/Android only; no-op on web)
- Notifications are automatically rescheduled when restock periods or last-restocked dates change

## Tech Stack

- **React Native / Expo** — cross-platform framework
- **Expo Router** — file-based navigation
- **TypeScript** — throughout
- **React Context + useReducer** — global state (locations, machines, products)
- **AsyncStorage** — local persistence for all data
- **expo-image-picker** — custom product image uploads
- **expo-notifications** — local push notifications for restock reminders
- **expo-linear-gradient** — gradient support for theme colours
- **Linking** — deep-links into Google Maps from location cards
- **SF Symbols / Material Icons** — native icons via `IconSymbol`

## Building an APK

```bash
npm run build:apk
```

Requires [EAS CLI](https://docs.expo.dev/build/introduction/) and an Expo account. The `preview` profile produces a standalone `.apk` for Android.

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   Then open in:
   - [Expo Go](https://expo.dev/go) (quickest)
   - iOS Simulator
   - Android Emulator
   - Web browser (press `w`)

## Project Structure

```
app/
  (tabs)/
    index.tsx        # Dashboard — upcoming/recent restocks, stats
    locations.tsx    # Location list (All / By City) + add modal
    products.tsx     # Product catalog (grid/list toggle, add/edit)
    restock.tsx      # Restock planner
    stock.tsx        # General stock inventory (simple + detailed views)
  location/
    [id].tsx         # Location detail (machines, slots, restock, opening hours)

components/
  location-card.tsx  # Location card with map link and open/closed status
  ui/
    machine-grid.tsx      # Machine slot grid + list view
    date-picker-modal.tsx # Cross-platform date picker
    grad-view.tsx         # Conditional LinearGradient / View wrapper

constants/
  default-products.ts  # Built-in product catalog (~100 products, alphabetical by ID)
  product-images.ts    # Local asset map (product ID → require())
  theme.ts             # Light/dark colour tokens

context/
  app-context.tsx      # Global state, reducer, AsyncStorage persistence
  settings-context.tsx # Theme settings (accent, sweet, toy colours)

utils/
  notifications.ts         # Web stub — no-op for SSR/web
  notifications.native.ts  # expo-notifications scheduling logic
  opening-hours.ts         # Opening hours status calculation + time parsing

assets/
  products/            # Downloaded product images from tubzbrands.co.uk
```

## Data Persistence

| Data                          | AsyncStorage key   |
| ----------------------------- | ------------------ |
| Locations, machines, products | `@tubz:appState`   |
| Restock planner               | `@tubz_restock_v1` |
| Stock inventory               | `@tubz_stock_v2`   |
| Theme settings                | `@tubz:settings`   |

No external database or login is required. All data is stored locally on the device.
