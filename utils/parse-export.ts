import type { AppState, Location, Product } from "../types";

export interface TubzExport {
  version: 1;
  exportedAt: string;
  locations: AppState["locations"];
  products: AppState["products"];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function validateProduct(p: unknown, i: number): Product {
  if (!isObject(p)) throw new Error(`products[${i}] is not an object.`);
  if (typeof p.id !== "string" || !p.id) {
    throw new Error(`products[${i}] is missing a valid id.`);
  }
  if (typeof p.name !== "string") {
    throw new Error(`products[${i}] is missing a valid name.`);
  }
  return p as unknown as Product;
}

function validateLocation(l: unknown, i: number): Location {
  if (!isObject(l)) throw new Error(`locations[${i}] is not an object.`);
  if (typeof l.id !== "string" || !l.id) {
    throw new Error(`locations[${i}] is missing a valid id.`);
  }
  if (typeof l.name !== "string") {
    throw new Error(`locations[${i}] is missing a valid name.`);
  }
  if (typeof l.createdAt !== "string") {
    throw new Error(`locations[${i}] is missing createdAt.`);
  }
  if (!Array.isArray(l.machines)) {
    throw new Error(`locations[${i}].machines must be an array.`);
  }
  if (l.lastRestockedAt !== null && typeof l.lastRestockedAt !== "string") {
    throw new Error(`locations[${i}].lastRestockedAt must be string or null.`);
  }
  return l as unknown as Location;
}

export function parseExport(raw: string): TubzExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
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
