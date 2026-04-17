import { Linking } from 'react-native';
import type { Location } from '../types';

/** Open Google Maps for a location using its address and postcode. */
export function openLocationInMaps(location: Pick<Location, 'address' | 'postcode'>): void {
  const query = [location.address, location.postcode].filter(Boolean).join(' ');
  if (!query) return;
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
}
