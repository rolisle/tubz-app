# Tubz App

A stock and restock management app for Tubz vending machines, built with [Expo](https://expo.dev) and React Native. Runs on iOS, Android, and web.

## Features

### Locations

- Add and manage vending machine locations with a full address (street, city, postcode)
- Search locations across all address fields
- View locations grouped by city or as a flat list on the dashboard
- Tap the 🔎 icon on any location card to open the address in Google Maps
- Track when each location was last restocked (editable date)

### Machines

- Add unlimited sweet 🍬 or toy 🪀 machines per location
- Each sweet machine holds up to 9 slots; each toy machine holds up to 12
- Grid view and list view toggle per machine
- Slot counter shows filled/total (e.g. `6/9`, turns red when full)
- Products in the slot picker are filtered by machine type (sweets only / toys only)
- Adding a product fills the next available empty slot; removing compacts the grid

### Products

- Built-in catalog of 100+ Tubz products sourced from [tubzbrands.co.uk](https://www.tubzbrands.co.uk), with local images
- Add custom products with a name, emoji, category, and optional uploaded image
- Toggle between grid view (full-bleed image cards) and list view (with tap-to-zoom images)
- Products sorted alphabetically; sectioned by category (Sweets / Toys)

### Restock

- Standalone restock planner — not tied to any location
- Add sweet and toy machines to a restock list (defaults to one of each on first launch)
- Pick products per machine (filtered by type, searchable)
- Set quantities per product (max 9 for sweet, max 12 for toy); new items start at 0
- Decrement to 0 removes the item; the minus button is disabled at 0
- Add the same product multiple times (each is a separate independent slot)
- Mark items as done (greyed out with strikethrough, controls hidden) and unmark them
- Restock list persists between sessions

### Stock

- General inventory tracker — separate from machine slots
- Sections for Sweets and Toys; add any product from the catalog (searchable picker)
- Three stock levels per product: **Full**, **½ Box**, **Empty**
- Full and ½ Box each have their own counter (track multiple boxes)
- Counters and status colours are always visible
- Status auto-updates to **Empty** when both counters reach 0
- Counters and status persist between sessions

## Tech Stack

- **React Native / Expo** — cross-platform framework
- **Expo Router** — file-based navigation
- **TypeScript** — throughout
- **React Context + useReducer** — global state (locations, machines, products)
- **AsyncStorage** — local persistence for all data
- **expo-image-picker** — custom product image uploads
- **Linking** — deep-links into Google Maps from location cards
- **SF Symbols / Material Icons** — native icons via `IconSymbol`

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
    index.tsx        # Dashboard — all locations + grouped by city
    locations.tsx    # Location list + add modal
    products.tsx     # Product catalog (grid/list toggle)
    restock.tsx      # Restock planner
    stock.tsx        # General stock inventory
  location/
    [id].tsx         # Location detail (machines, slots)

components/
  location-card.tsx  # Location card with map link
  ui/
    machine-grid.tsx # Machine slot grid + list view

constants/
  default-products.ts  # Built-in product catalog (~100 products, alphabetical by ID)
  product-images.ts    # Local asset map (product ID → require())
  theme.ts             # Light/dark colour tokens

context/
  app-context.tsx      # Global state, reducer, AsyncStorage persistence

assets/
  products/            # Downloaded product images from tubzbrands.co.uk
```

## Data Persistence

| Data                          | AsyncStorage key   |
| ----------------------------- | ------------------ |
| Locations, machines, products | `@tubz:appState`   |
| Restock planner               | `@tubz_restock_v1` |
| Stock inventory               | `@tubz_stock_v2`   |

No external database or login is required. All data is stored locally on the device.
