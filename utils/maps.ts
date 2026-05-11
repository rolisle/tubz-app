import { Linking } from "react-native";
import type { Location } from "../types";

function withProtocol(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;
}

/** Validation when saving a pasted maps link (empty = OK). */
export function mapsUrlFieldError(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  let u: URL;
  try {
    u = new URL(withProtocol(t));
  } catch {
    return "Invalid link.";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    return "Use an http(s) link.";
  const h = u.hostname.toLowerCase();
  const okGoogleMaps =
    h === "maps.app.goo.gl" ||
    h === "goo.gl" ||
    h.endsWith(".goo.gl") ||
    h === "maps.google.com" ||
    (h.includes("google.") &&
      (u.pathname.includes("/maps") || h.startsWith("maps.")));
  if (!okGoogleMaps) return "Use a Google Maps link.";
  return undefined;
}

export function normalizeMapsUrlForStorage(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  return withProtocol(t);
}

/**
 * Open Google Maps: prefer share link when set, otherwise search by address fields.
 */
export function openLocationInMaps(
  location: Pick<Location, "address" | "city" | "postcode" | "mapsUrl">,
): void {
  const maps = location.mapsUrl?.trim();
  if (maps) {
    Linking.openURL(withProtocol(maps));
    return;
  }
  const query = [location.address, location.city, location.postcode]
    .filter(Boolean)
    .join(" ");
  if (!query) return;
  Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
  );
}

export function locationHasMapsOrAddress(
  location: Pick<Location, "address" | "city" | "postcode" | "mapsUrl">,
): boolean {
  return !!(
    location.mapsUrl?.trim() ||
    location.address?.trim() ||
    location.city?.trim() ||
    location.postcode?.trim()
  );
}
