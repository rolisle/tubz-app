# Tubz App

A stock and restock management app for Tubz vending machines, built with [Expo](https://expo.dev) and React Native. Runs on iOS, Android, and web.

## Features

### Locations

- Add and manage vending machine locations with a full address (street, city, postcode)
- Search locations across all address fields
- View locations grouped by city or as a flat list
- Tap the 🔎 icon on any location card to open the address in Google Maps
- Track when each location was last restocked

### Machines

- Add unlimited sweet 🍬 or toy 🪀 machines per location
- Each sweet machine holds up to 9 slots, each toy machine holds up to 12
- Grid view and list view toggle per machine
- Slot counter shows filled/total (turns red when full)
- Products in the slot picker are filtered by machine type

### Products

- Built-in catalog of Tubz products with local images
- Add custom products with a name, emoji, category, and optional uploaded image
- Toggle between grid view (image cards) and list view (with image zoom on tap)
- Filter by category (Sweets, Toys, Other) and search by name
- Products sorted alphabetically

### Restock

- Standalone restock planner — not tied to any location
- Add sweet and toy machines to a restock list (defaults to one of each)
- Pick products per machine (filtered by type, searchable)
- Set quantities per product (max 9 for sweet, max 12 for toy)
- Mark items as done (greyed out with strikethrough) and unmark them
- Add the same product multiple times for duplicate slots
- Restock list persists between sessions

## Tech Stack

- **React Native / Expo** — cross-platform framework
- **Expo Router** — file-based navigation
- **TypeScript** — throughout
- **React Context + useReducer** — global state management
- **AsyncStorage** — local data persistence
- **expo-image-picker** — custom product image uploads
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
    index.tsx        # Dashboard
    locations.tsx    # Location list + add modal
    products.tsx     # Product catalog
    restock.tsx      # Restock planner
  location/
    [id].tsx         # Location detail (machines, slots, notes)

components/
  location-card.tsx  # Location list card with map link
  ui/
    machine-grid.tsx # Machine slot grid + list view

constants/
  default-products.ts  # Built-in product catalog
  product-images.ts    # Local asset map (product ID → require())
  theme.ts             # Light/dark colour tokens

context/
  app-context.tsx      # Global state, reducer, AsyncStorage persistence

assets/
  products/            # Downloaded product images
```

## Data Persistence

All location, machine, slot, and product data is stored locally via AsyncStorage under the key `@tubz:appState`. The restock planner uses a separate key `@tubz_restock_v1`. No external database or login is required.
