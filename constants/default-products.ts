import type { Product } from "@/types";

function p(
  id: string,
  name: string,
  emoji: string,
  category: Product["category"],
): Product {
  return { id, name, emoji, category };
}

/**
 * Default product catalog sourced from
 * https://www.tubzbrands.co.uk/product-category/tubz-machines/tubz-tower/tubz-pots/
 *
 * IDs are stable slugs so they survive app resets without duplicate insertion.
 * Images are stored locally in assets/products/ — see constants/product-images.ts.
 */
export const DEFAULT_PRODUCTS: Product[] = [
  // ─── Sweets ────────────────────────────────────────────────────────────────
  p("tubz-skittles",           "Skittles",                   "🌈", "sweet"),
  p("tubz-chupa-chups",        "Chupa Chups",                "🍭", "sweet"),
  p("tubz-maoam-mix",          "Maoam Mix",                  "🍬", "sweet"),
  p("tubz-millions-mix",       "Millions Mix",               "✨", "sweet"),
  p("tubz-mini-sweet-mix",     "Mini Sweet Mix",             "🎀", "sweet"),
  p("tubz-gourmet-jelly-beans","Gourmet Jelly Beans",        "💎", "sweet"),
  p("tubz-hb-jelly-beans",     "HB Jelly Beans",             "🫘", "sweet"),
  p("tubz-hb-minimallows",     "HB Minimallows",             "☁️", "sweet"),
  p("tubz-jelly-sharks",       "Jelly Sharks",               "🦈", "sweet"),
  p("tubz-fizzy-watermelon",   "Fizzy Watermelon",           "🍉", "sweet"),
  p("tubz-fizzy-strawberry",   "Fizzy Strawberry Pencils",   "🍓", "sweet"),
  p("tubz-blue-raspberry",     "Blue Raspberry Bon Bons",    "🫐", "sweet"),
  p("tubz-mini-fizzy-cola",    "Mini Fizzy Cola Bottles",    "🥤", "sweet"),
  p("tubz-little-fizzy-mix",   "Little Fizzy Mix",           "💫", "sweet"),
  p("tubz-rainbow-belts",      "Rainbow Belts",              "🌈", "sweet"),
  p("tubz-rainbow-pencils",    "Rainbow Assorted Pencils",   "🖊️", "sweet"),
  p("tubz-mini-tutti-frutti",  "Mini Tutti Frutti Bottles",  "🍹", "sweet"),
  p("tubz-candy-crush-tutti",  "Candy Crush Tutti Frutti",   "🫙", "sweet"),
  p("tubz-candy-necklaces",    "Candy Necklaces",            "📿", "sweet"),
  p("tubz-candy-canes",        "Candy Canes",                "🍬", "sweet"),
  p("tubz-mini-eggs",          "Mini Eggs",                  "🥚", "sweet"),
  p("tubz-nice-kreem",         "Nice Kreem",                 "🍦", "sweet"),
  p("zoo-pops",                "Zoo Pops",                   "🦁", "sweet"),
  p("juicy-drop-blasts",       "Juicy Drop Blasts",          "💥", "sweet"),
  p("gummy-burger-fries",      "Gummy Burger and Fries",     "🍔", "sweet"),
  p("tango-popping-candy",     "Tango Popping Candy",        "🍊", "sweet"),
  p("chocolate-jazzies",       "Chocolate Jazzies",          "🍫", "sweet"),
  p("white-choc-snowies",      "White Chocolate Snowies",    "❄️", "sweet"),
  p("slush-puppie-chewbies",   "Slush Puppie Chewbies",      "🧊", "sweet"),
  p("minions-stickers-candy",  "Minions Stickers & Candy",   "💛", "sweet"),

  // ─── Toys ──────────────────────────────────────────────────────────────────
  p("wakee-erasers-unicorns",   "Wakee Erasers Unicorns",         "🦄", "toy"),
  p("wakee-erasers-dinosaurs",  "Wakee Erasers Dinosaurs",        "🦕", "toy"),
  p("wakee-erasers-fun-fruits", "Wakee Erasers Fun Fruits",       "🍎", "toy"),
  p("wakee-fast-food-erasers",  "Wakee Fast Food Erasers",        "🍕", "toy"),
  p("wakee-puzzler-erasers",    "Wakee Puzzler Erasers",          "🧩", "toy"),
  p("squishy-bead-pets-2",      "Squishy Bead Pets 2",            "🐾", "toy"),
  p("fidget-spinners",          "Fidget Spinners",                "🌀", "toy"),
  p("fidget-squishers",         "Fidget Squishers",               "💢", "toy"),
  p("tubz-giant-globbers",      "Giant Globbers",                 "🫧", "toy"),
  p("tubz-mini-globbers",       "Mini Globbers",                  "🫧", "toy"),
  p("tubz-squeeze-me-mix",      "Squeeze Me Mix",                 "🤜", "toy"),
  p("tubz-splat-attack-mix",    "Splat Attack Mix",               "💥", "toy"),
  p("tubz-squishlets",          "Squishlets",                     "🐛", "toy"),
  p("tubz-mooneez",             "Mooneez",                        "🌙", "toy"),
  p("tubz-galaxy-bead-planet",  "Galaxy Bead Planet",             "🪐", "toy"),
  p("tubz-electric-string",     "Electric String",                "⚡", "toy"),
  p("tubz-flashing-monsters",   "Flashing Monsters",              "👾", "toy"),
  p("roar-bots",                "Roar-Bots",                      "🤖", "toy"),
  p("gonkers",                  "Gonkers",                        "🤡", "toy"),
  p("i-love-puppies",           "I Love Puppies + Sticker Set",   "🐶", "toy"),
  p("i-love-hedgehogs",         "I Love Hedgehogs + Sticker Set", "🦔", "toy"),
  p("frightnite-4d-tattoos",    "FrightNite 4D Tattoos",          "👻", "toy"),
  p("wild-kingdom-4d-tattoos",  "Wild Kingdom 4D Tattoos",        "🐘", "toy"),
  p("rough-rider-4d-tattoos",   "Rough Rider 4D Tattoos",         "🏍️", "toy"),
  p("pet-shoppe-4d-tattoos",    "Pet Shoppe 4D Tattoos",          "🐱", "toy"),
  p("fantasy-4d-tattoos",       "Fantasy 4D Tattoos",             "🐉", "toy"),
  p("dinosaurs-4d-tattoos",     "Dinosaurs 4D Tattoos",           "🦖", "toy"),
  p("superthings-rescue-force", "SuperThings Rescue Force",       "🦸", "toy"),
  p("star-monsters",            "Star Monsters x 2",              "⭐", "toy"),
  p("wwe-slam-attax",           "WWE Slam Attax Trading Cards",   "🤼", "toy"),
  p("topps-slam-attax",         "Topps Slam Attax Trading Cards", "🃏", "toy"),
  p("dreamworks-ar-discs",      "DreamWorks AR Discs",            "🎬", "toy"),
  p("fairys-and-friends",       "Fairys & Friends",               "🧚", "toy"),
  p("lucky-dip-girls",          "Lucky Dip Girls Toys Mix",       "👧", "toy"),
  p("lucky-dip-boys",           "Lucky Dip Boys Toys Mix",        "👦", "toy"),
  p("sqwishland-farm",          "Sqwishland Farm",                "🐄", "toy"),
  p("sqwishland-polar",         "Sqwishland Polar",               "🐧", "toy"),
  p("sqwishland-city",          "Sqwishland City",                "🏙️", "toy"),
];
