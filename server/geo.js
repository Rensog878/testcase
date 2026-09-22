/**
 * The GPS point a customer may attach to a delivery address ("Use my current
 * location" at checkout). Optional: an address without one is as valid as
 * before. Only a real point inside India's bounding box is kept, rounded to
 * about 10 cm, with the phone's accuracy in metres.
 */

const INDIA = { minLat: 6, maxLat: 37.5, minLng: 68, maxLng: 97.5 };

export function cleanGeo(value) {
  if (!value || typeof value !== 'object') return null;
  const lat = Number(value.lat);
  const lng = Number(value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < INDIA.minLat || lat > INDIA.maxLat || lng < INDIA.minLng || lng > INDIA.maxLng) return null;
  const accuracy = Number(value.accuracy);
  return {
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? Math.min(Math.round(accuracy), 100000) : null,
    capturedAt: new Date().toISOString(),
  };
}

// A link that opens the point in Google Maps (app on phones), for staff.
export function mapsUrl(geo) {
  return geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)
    ? `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`
    : '';
}
