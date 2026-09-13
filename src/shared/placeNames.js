// Place names compared the way people type them: "Thanjavur District",
// "thanjavur" and " THANJAVUR " are the same place. Used by the server's place
// lookup (server/weather/geocode.js) and the dashboard's locality ranking.

export function normalizePlace(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\bdistrict\b/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
