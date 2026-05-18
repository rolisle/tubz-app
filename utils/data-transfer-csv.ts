import type { Location, Product } from "@/types";

import { validateTubzPayload, type TubzExport } from "./parse-export";

const CSV_VERSION = 1;

/** One-line header: format id, schema version, exportedAt (ISO). */
const HEADER_PREFIX = "tubz-csv";

function sanitizeScalar(s: string): string {
  return s.replace(/\r\n|\r|\n/g, " ");
}

function escapeCsvCell(value: string): string {
  const v = sanitizeScalar(value);
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** RFC-style split; export uses compact JSON without raw newlines in cells. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  let cur = "";
  let inQuote = false;
  while (i < line.length) {
    const c = line[i];
    if (inQuote) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuote = true;
      i++;
      continue;
    }
    if (c === ",") {
      out.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  out.push(cur);
  return out;
}

export function tubzExportToCsv(payload: TubzExport): string {
  const lines: string[] = [];
  lines.push(
    `${HEADER_PREFIX},${CSV_VERSION},${payload.exportedAt || new Date().toISOString()}`,
  );
  lines.push("");
  lines.push("PRODUCTS");
  lines.push("id,name,category,localImageUri");
  for (const p of payload.products) {
    lines.push(
      [
        escapeCsvCell(p.id),
        escapeCsvCell(p.name),
        escapeCsvCell(p.category ?? ""),
        escapeCsvCell(p.localImageUri ?? ""),
      ].join(","),
    );
  }
  lines.push("");
  lines.push("LOCATIONS");
  lines.push(
    "id,name,address,city,postcode,mapsUrl,notes,lastRestockedAt,createdAt,restockPeriodWeeks,restockPeriodAnchorAt,openingHoursJson,machinesJson,restockHistoryJson",
  );
  for (const l of payload.locations) {
    const openingHoursJson = l.openingHours
      ? escapeCsvCell(JSON.stringify(l.openingHours))
      : "";
    const machinesJson = escapeCsvCell(JSON.stringify(l.machines));
    const restockHistoryJson = l.restockHistory?.length
      ? escapeCsvCell(JSON.stringify(l.restockHistory))
      : "";
    lines.push(
      [
        escapeCsvCell(l.id),
        escapeCsvCell(l.name),
        escapeCsvCell(l.address ?? ""),
        escapeCsvCell(l.city ?? ""),
        escapeCsvCell(l.postcode ?? ""),
        escapeCsvCell(l.mapsUrl ?? ""),
        escapeCsvCell(l.notes ?? ""),
        escapeCsvCell(l.lastRestockedAt ?? ""),
        escapeCsvCell(l.createdAt),
        escapeCsvCell(
          l.restockPeriodWeeks != null ? String(l.restockPeriodWeeks) : "",
        ),
        escapeCsvCell(l.restockPeriodAnchorAt ?? ""),
        openingHoursJson,
        machinesJson,
        restockHistoryJson,
      ].join(","),
    );
  }
  return lines.join("\n");
}

function parseJsonColumn(cell: string, label: string): unknown {
  const t = cell.trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    throw new Error(`Invalid JSON in ${label}.`);
  }
}

function rowToProduct(cells: string[], rowIndex: number): Product {
  if (cells.length !== 4) {
    throw new Error(
      `products row ${rowIndex}: expected 4 columns, got ${cells.length}.`,
    );
  }
  const [id, name, category, localImageUri] = cells;
  const c = category.trim();
  const cat: Product["category"] | undefined =
    c === "sweet" || c === "toy" || c === "other" ? c : undefined;
  // localImageUri from CSV is stripped — it is a device-specific path.
  void localImageUri;
  return { id: id.trim(), name: name.trim(), ...(cat ? { category: cat } : {}) };
}

function rowToLocation(cells: string[], rowIndex: number): Location {
  if (cells.length !== 14) {
    throw new Error(
      `locations row ${rowIndex}: expected 14 columns, got ${cells.length}.`,
    );
  }
  const [
    id,
    name,
    address,
    city,
    postcode,
    mapsUrl,
    notes,
    lastRestockedAt,
    createdAt,
    restockPeriodWeeksRaw,
    restockPeriodAnchorAt,
    openingHoursJson,
    machinesJson,
    restockHistoryJson,
  ] = cells;

  const machinesParsed = parseJsonColumn(
    machinesJson,
    `locations[${rowIndex}].machines`,
  );
  if (!Array.isArray(machinesParsed)) {
    throw new Error(`locations[${rowIndex}].machines must be a JSON array.`);
  }

  let openingHours: Location["openingHours"];
  const ohRaw = openingHoursJson.trim();
  if (ohRaw) {
    const o = parseJsonColumn(ohRaw, `locations[${rowIndex}].openingHours`);
    openingHours = o as Location["openingHours"];
  }

  let restockHistory: Location["restockHistory"];
  const rhRaw = restockHistoryJson.trim();
  if (rhRaw) {
    const h = parseJsonColumn(rhRaw, `locations[${rowIndex}].restockHistory`);
    restockHistory = h as Location["restockHistory"];
  }

  let restockPeriodWeeks: number | undefined;
  if (restockPeriodWeeksRaw.trim()) {
    const n = Number.parseInt(restockPeriodWeeksRaw, 10);
    if (Number.isFinite(n)) restockPeriodWeeks = n;
  }

  const loc: Location = {
    id: id.trim(),
    name: name.trim(),
    ...(address.trim() ? { address: address.trim() } : {}),
    ...(city.trim() ? { city: city.trim() } : {}),
    ...(postcode.trim() ? { postcode: postcode.trim() } : {}),
    ...(mapsUrl.trim() ? { mapsUrl: mapsUrl.trim() } : {}),
    ...(notes.trim() ? { notes: notes.trim() } : {}),
    lastRestockedAt: lastRestockedAt.trim() || null,
    createdAt: createdAt.trim(),
    ...(restockPeriodWeeks !== undefined ? { restockPeriodWeeks } : {}),
    ...(restockPeriodAnchorAt.trim()
      ? { restockPeriodAnchorAt: restockPeriodAnchorAt.trim() }
      : {}),
    ...(openingHours ? { openingHours } : {}),
    machines: machinesParsed as Location["machines"],
    ...(restockHistory ? { restockHistory } : {}),
  };

  return loc;
}

export function parseTubzCsv(raw: string): TubzExport {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trimEnd();
  const lines = text.split("\n");

  let i = 0;
  const headerParts = parseCsvLine(lines[i] ?? "");
  if (
    headerParts[0] !== HEADER_PREFIX ||
    headerParts[1] !== String(CSV_VERSION)
  ) {
    throw new Error(
      "This CSV is not a Tubz export (expected first line tubz-csv,1,...).",
    );
  }
  const exportedAt = headerParts[2]?.trim() ?? "";
  i++;

  while (i < lines.length && lines[i].trim() === "") i++;

  if (lines[i]?.trim() !== "PRODUCTS") {
    throw new Error("CSV is missing PRODUCTS section.");
  }
  i++;
  const productHeader = lines[i]?.trim();
  if (
    productHeader !== "id,name,category,localImageUri"
  ) {
    throw new Error("Unexpected products table header.");
  }
  i++;

  const products: Product[] = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") break;
    products.push(rowToProduct(parseCsvLine(line), products.length));
    i++;
  }

  while (i < lines.length && lines[i].trim() === "") i++;

  if (lines[i]?.trim() !== "LOCATIONS") {
    throw new Error("CSV is missing LOCATIONS section.");
  }
  i++;
  const locHeader = lines[i]?.trim();
  if (
    locHeader !==
    "id,name,address,city,postcode,mapsUrl,notes,lastRestockedAt,createdAt,restockPeriodWeeks,restockPeriodAnchorAt,openingHoursJson,machinesJson,restockHistoryJson"
  ) {
    throw new Error("Unexpected locations table header.");
  }
  i++;

  const locations: Location[] = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") break;
    locations.push(rowToLocation(parseCsvLine(line), locations.length));
    i++;
  }

  return validateTubzPayload({
    version: 1,
    exportedAt,
    locations,
    products,
  });
}
