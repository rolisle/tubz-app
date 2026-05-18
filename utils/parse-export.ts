import type { AppState, Location, Machine, Product, RestockEntry } from "../types";

export interface TubzExport {
  version: 1;
  exportedAt: string;
  locations: AppState["locations"];
  products: AppState["products"];
}

// ── Import limits ────────────────────────────────────────────────────────────
/** Max raw file size accepted before parsing (10 MB). */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_LOCATIONS = 500;
const MAX_PRODUCTS = 2_000;
const MAX_MACHINES_PER_LOCATION = 20;
const MAX_HISTORY_ENTRIES = 500;
const MAX_SLOTS = 50;

// ── String length caps ───────────────────────────────────────────────────────
const MAX_ID_LEN = 128;
const MAX_NAME_LEN = 200;
const MAX_SHORT_STR = 200;
const MAX_NOTES_LEN = 5_000;
const MAX_URL_LEN = 2_000;

// ── Helpers ──────────────────────────────────────────────────────────────────
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function requireString(
  v: unknown,
  label: string,
  opts: { notEmpty?: boolean; max?: number } = {},
): string {
  if (typeof v !== "string") throw new Error(`${label} must be a string.`);
  if (opts.notEmpty && !v.trim()) throw new Error(`${label} must not be empty.`);
  if (opts.max !== undefined && v.length > opts.max) {
    throw new Error(`${label} exceeds max length (${opts.max}).`);
  }
  return v;
}

function isIsoDate(s: string): boolean {
  if (!s) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

/**
 * Allow only https:// Google Maps URLs on import.
 * The caller has already checked the field is a non-empty string.
 */
function sanitizeMapsUrl(raw: string, label: string): string {
  const t = raw.trim();
  if (!t) return t;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    throw new Error(`${label} is not a valid URL.`);
  }
  if (u.protocol !== "https:") {
    throw new Error(`${label} must use https.`);
  }
  const h = u.hostname.toLowerCase();
  const ok =
    h === "maps.app.goo.gl" ||
    h === "goo.gl" ||
    h.endsWith(".goo.gl") ||
    h === "maps.google.com" ||
    (h.includes("google.") &&
      (u.pathname.includes("/maps") || h.startsWith("maps.")));
  if (!ok) {
    throw new Error(`${label} must be a Google Maps link.`);
  }
  return t;
}

// ── Per-entity validators ────────────────────────────────────────────────────

function validateMachine(m: unknown, label: string): Machine {
  if (!isObject(m)) throw new Error(`${label} is not an object.`);
  requireString(m.id, `${label}.id`, { notEmpty: true, max: MAX_ID_LEN });
  if (m.type !== "sweet" && m.type !== "toy") {
    throw new Error(`${label}.type must be "sweet" or "toy".`);
  }
  if (!Array.isArray(m.slots)) {
    throw new Error(`${label}.slots must be an array.`);
  }
  if (m.slots.length > MAX_SLOTS) {
    throw new Error(`${label}.slots exceeds max length (${MAX_SLOTS}).`);
  }
  for (let k = 0; k < m.slots.length; k++) {
    const s = m.slots[k];
    if (s !== null && s !== undefined && typeof s !== "string") {
      throw new Error(`${label}.slots[${k}] must be a string or null.`);
    }
  }
  if (!isObject(m.stockCounts)) {
    throw new Error(`${label}.stockCounts must be an object.`);
  }
  for (const [pid, qty] of Object.entries(m.stockCounts)) {
    if (typeof qty !== "number" || !Number.isFinite(qty) || qty < 0) {
      throw new Error(`${label}.stockCounts["${pid}"] must be a non-negative number.`);
    }
  }
  return m as unknown as Machine;
}

function validateRestockEntry(entry: unknown, label: string): RestockEntry {
  if (!isObject(entry)) throw new Error(`${label} must be an object.`);
  const ts = entry.timestamp;
  if (typeof ts !== "string" || !isIsoDate(ts)) {
    throw new Error(`${label}.timestamp must be a valid ISO date string.`);
  }
  if (!Array.isArray(entry.machines)) {
    throw new Error(`${label}.machines must be an array.`);
  }
  entry.machines.forEach((me: unknown, mi: number) => {
    if (!isObject(me)) throw new Error(`${label}.machines[${mi}] must be an object.`);
    requireString(me.machineId, `${label}.machines[${mi}].machineId`, { notEmpty: true, max: MAX_ID_LEN });
    if (me.machineType !== "sweet" && me.machineType !== "toy") {
      throw new Error(`${label}.machines[${mi}].machineType must be "sweet" or "toy".`);
    }
    if (!Array.isArray(me.products)) {
      throw new Error(`${label}.machines[${mi}].products must be an array.`);
    }
    me.products.forEach((rp: unknown, pi: number) => {
      if (!isObject(rp)) throw new Error(`${label}.machines[${mi}].products[${pi}] must be an object.`);
      requireString(rp.productId, `${label}.machines[${mi}].products[${pi}].productId`, { notEmpty: true, max: MAX_ID_LEN });
      if (typeof rp.qty !== "number" || !Number.isFinite(rp.qty) || rp.qty < 0) {
        throw new Error(`${label}.machines[${mi}].products[${pi}].qty must be a non-negative number.`);
      }
    });
  });
  const rep = entry.productReplacements;
  if (rep !== undefined) {
    if (!Array.isArray(rep)) {
      throw new Error(`${label}.productReplacements must be an array.`);
    }
    rep.forEach((r: unknown, k: number) => {
      if (!isObject(r)) throw new Error(`${label}.productReplacements[${k}] invalid.`);
      requireString(r.machineId, `${label}.productReplacements[${k}].machineId`, { notEmpty: true, max: MAX_ID_LEN });
      requireString(r.replacedProductId, `${label}.productReplacements[${k}].replacedProductId`, { notEmpty: true, max: MAX_ID_LEN });
      requireString(r.replacedWithProductId, `${label}.productReplacements[${k}].replacedWithProductId`, { notEmpty: true, max: MAX_ID_LEN });
      if (typeof r.missingQtyRecorded !== "number" || !Number.isFinite(r.missingQtyRecorded)) {
        throw new Error(`${label}.productReplacements[${k}].missingQtyRecorded invalid.`);
      }
    });
  }
  return entry as unknown as RestockEntry;
}

function validateProduct(p: unknown, i: number): Product {
  if (!isObject(p)) throw new Error(`products[${i}] is not an object.`);
  requireString(p.id, `products[${i}].id`, { notEmpty: true, max: MAX_ID_LEN });
  requireString(p.name, `products[${i}].name`, { notEmpty: true, max: MAX_NAME_LEN });
  if (p.category !== undefined) {
    if (p.category !== "sweet" && p.category !== "toy" && p.category !== "other") {
      throw new Error(`products[${i}].category must be "sweet", "toy", or "other".`);
    }
  }
  // localImageUri is a device-specific path — strip it on import so stale URIs
  // from another device don't silently produce broken images.
  return {
    id: p.id,
    name: p.name,
    ...(p.category ? { category: p.category } : {}),
  } as Product;
}

function validateLocation(l: unknown, i: number): Location {
  if (!isObject(l)) throw new Error(`locations[${i}] is not an object.`);
  requireString(l.id, `locations[${i}].id`, { notEmpty: true, max: MAX_ID_LEN });
  requireString(l.name, `locations[${i}].name`, { notEmpty: true, max: MAX_NAME_LEN });
  requireString(l.createdAt, `locations[${i}].createdAt`);

  if (l.address !== undefined) requireString(l.address, `locations[${i}].address`, { max: MAX_SHORT_STR });
  if (l.city !== undefined) requireString(l.city, `locations[${i}].city`, { max: MAX_SHORT_STR });
  if (l.postcode !== undefined) requireString(l.postcode, `locations[${i}].postcode`, { max: MAX_SHORT_STR });
  if (l.notes !== undefined) requireString(l.notes, `locations[${i}].notes`, { max: MAX_NOTES_LEN });

  if (l.mapsUrl !== undefined && l.mapsUrl !== null && l.mapsUrl !== "") {
    requireString(l.mapsUrl, `locations[${i}].mapsUrl`, { max: MAX_URL_LEN });
    sanitizeMapsUrl(l.mapsUrl as string, `locations[${i}].mapsUrl`);
  }

  if (l.lastRestockedAt !== null && typeof l.lastRestockedAt !== "string") {
    throw new Error(`locations[${i}].lastRestockedAt must be string or null.`);
  }
  if (
    l.restockPeriodAnchorAt !== undefined &&
    typeof l.restockPeriodAnchorAt !== "string"
  ) {
    throw new Error(
      `locations[${i}].restockPeriodAnchorAt must be a string when present.`,
    );
  }
  if (l.restockPeriodWeeks !== undefined) {
    const w = l.restockPeriodWeeks;
    if (typeof w !== "number" || !Number.isFinite(w) || w < 1 || w !== Math.floor(w)) {
      throw new Error(`locations[${i}].restockPeriodWeeks must be a positive integer.`);
    }
  }

  if (!Array.isArray(l.machines)) {
    throw new Error(`locations[${i}].machines must be an array.`);
  }
  if (l.machines.length > MAX_MACHINES_PER_LOCATION) {
    throw new Error(`locations[${i}].machines exceeds max (${MAX_MACHINES_PER_LOCATION}).`);
  }
  l.machines.forEach((m: unknown, j: number) =>
    validateMachine(m, `locations[${i}].machines[${j}]`),
  );

  if (l.restockHistory !== undefined) {
    if (!Array.isArray(l.restockHistory)) {
      throw new Error(`locations[${i}].restockHistory must be an array when present.`);
    }
    if (l.restockHistory.length > MAX_HISTORY_ENTRIES) {
      throw new Error(`locations[${i}].restockHistory exceeds max (${MAX_HISTORY_ENTRIES}).`);
    }
    l.restockHistory.forEach((entry: unknown, j: number) =>
      validateRestockEntry(entry, `locations[${i}].restockHistory[${j}]`),
    );
  }

  return l as unknown as Location;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Validate an already-parsed JSON export object (shared by JSON and CSV import). */
export function validateTubzPayload(parsed: unknown): TubzExport {
  if (!isObject(parsed)) {
    throw new Error("The file does not look like a Tubz export.");
  }
  if (parsed.version !== 1) {
    throw new Error(
      `Unsupported export version ${String(parsed.version)}. Expected version 1.`,
    );
  }
  if (!Array.isArray(parsed.locations) || !Array.isArray(parsed.products)) {
    throw new Error("The file is missing locations or products.");
  }
  if (parsed.products.length > MAX_PRODUCTS) {
    throw new Error(`Too many products (max ${MAX_PRODUCTS}).`);
  }
  if (parsed.locations.length > MAX_LOCATIONS) {
    throw new Error(`Too many locations (max ${MAX_LOCATIONS}).`);
  }
  const products = parsed.products.map(validateProduct);
  const locations = parsed.locations.map(validateLocation);
  return {
    version: 1,
    exportedAt:
      typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    locations,
    products,
  };
}

export function parseExport(raw: string): TubzExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  return validateTubzPayload(parsed);
}
