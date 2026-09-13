// Canonical crops for farmer-facing features.
//
// Crop names arrive from several places that never agreed on spelling:
// registration ("Paddy / Rice", "Corn / Maize"), the storefront form ("Grapes"),
// product records ("Paddy/Rice", "Corn") and admin free text. Everything new
// that compares crops resolves both sides here first, then compares ids.
//
// Adding a crop means adding one entry to CROPS. Names and aliases are matched
// after normalizeCropText, so "Paddy/Rice", "paddy - rice" and "PADDY RICE"
// are the same key and need not be listed separately.
//
// Plain ES module with no browser or build-tool dependencies: imported by the
// React app, by node:test, and (later) by the server.

export const ALL_CROPS_ID = 'all';
export const CUSTOM_CROP_PREFIX = 'custom:';

export const CROPS = [
  { id: 'paddy', names: { en: 'Paddy / Rice', ta: 'நெல்' }, aliases: ['paddy', 'rice', 'nel', 'அரிசி'] },
  { id: 'wheat', names: { en: 'Wheat', ta: 'கோதுமை' }, aliases: ['gehun'] },
  { id: 'cotton', names: { en: 'Cotton', ta: 'பருத்தி' }, aliases: ['kapas'] },
  { id: 'tomato', names: { en: 'Tomato', ta: 'தக்காளி' }, aliases: ['tomatoes', 'thakkali'] },
  { id: 'corn', names: { en: 'Corn / Maize', ta: 'மக்காச்சோளம்' }, aliases: ['corn', 'maize', 'makka cholam'] },
  { id: 'sugarcane', names: { en: 'Sugarcane', ta: 'கரும்பு' }, aliases: ['sugar cane', 'karumbu'] },
  { id: 'citrus', names: { en: 'Citrus', ta: 'எலுமிச்சை வகைகள்' }, aliases: ['lemon', 'lime', 'orange', 'sweet lime', 'mosambi'] },
  { id: 'grapes', names: { en: 'Grapes', ta: 'திராட்சை' }, aliases: ['grape'] },
  { id: 'potato', names: { en: 'Potato', ta: 'உருளைக்கிழங்கு' }, aliases: ['potatoes'] },
];

// Values that mean "every crop": the registration default and admin wording.
const ALL_CROPS_TEXT = ['all', 'all crops', 'all crop', 'all crops general', 'general', 'general crop', 'அனைத்து பயிர்கள்'];

// Values that mean "not given". Seed data uses "N/A" for staff accounts.
const NO_CROP_TEXT = ['', 'n a', 'na', 'none', 'nil', 'not applicable'];

export const ALL_CROPS_NAMES = { en: 'All crops', ta: 'அனைத்து பயிர்கள்' };

export function normalizeCropText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .trim();
}

const CROP_BY_ID = new Map(CROPS.map(crop => [crop.id, crop]));
const ALL_KEYS = new Set(ALL_CROPS_TEXT.map(normalizeCropText));
const NONE_KEYS = new Set(NO_CROP_TEXT.map(normalizeCropText));
const CROP_BY_KEY = new Map();
for (const crop of CROPS) {
  for (const text of [crop.id, ...Object.values(crop.names), ...crop.aliases]) {
    const key = normalizeCropText(text);
    if (key && !CROP_BY_KEY.has(key)) CROP_BY_KEY.set(key, crop);
  }
}

// Parts of combined labels such as "Grapes / Fruits" or "Tomato, Vegetables".
const PART_SEPARATOR = /[/,;|+()]|\s-\s|\band\b/i;

/**
 * Resolves free text to a crop.
 * status: 'known' (registry crop), 'custom' (unrecognised but named),
 *         'all' (every crop) or 'none' (not given).
 * Custom crops get the id "custom:<normalized text>", so two records that both
 * say "Banana" still match each other.
 */
export function resolveCrop(value) {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  const key = normalizeCropText(raw);

  if (NONE_KEYS.has(key)) return { id: null, status: 'none', raw };
  if (ALL_KEYS.has(key)) return { id: ALL_CROPS_ID, status: 'all', raw };

  const whole = CROP_BY_KEY.get(key);
  if (whole) return { id: whole.id, status: 'known', raw };

  for (const part of raw.split(PART_SEPARATOR)) {
    const match = CROP_BY_KEY.get(normalizeCropText(part));
    if (match) return { id: match.id, status: 'known', raw };
  }

  return { id: `${CUSTOM_CROP_PREFIX}${key}`, status: 'custom', raw };
}

/** Unique crop ids for a list of names (e.g. product.crops). Blank entries are dropped. */
export function resolveCropList(values) {
  const list = Array.isArray(values) ? values : typeof values === 'string' ? values.split(',') : [];
  const ids = [];
  for (const value of list) {
    const { id } = resolveCrop(value);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function isKnownCropId(id) {
  return CROP_BY_ID.has(id);
}

/**
 * Display name for a resolved crop in the given language, falling back to
 * English. Custom crops show the text the farmer or admin typed.
 */
export function cropDisplayName(resolved, lang = 'en') {
  if (!resolved || !resolved.id) return null;
  if (resolved.id === ALL_CROPS_ID) return ALL_CROPS_NAMES[lang] || ALL_CROPS_NAMES.en;
  const crop = CROP_BY_ID.get(resolved.id);
  if (crop) return crop.names[lang] || crop.names.en;
  return resolved.raw || null;
}

/**
 * How well a farmer's crops match an item's crops.
 * 'exact'   - they share a crop id
 * 'general' - the item is for all crops, or the farmer grows "all crops"
 * 'none'    - both are specific and share nothing
 * 'unknown' - the farmer has no crop, or the item names no crops
 */
export function matchCrops(farmerCropIds, itemCropIds) {
  const farmer = (farmerCropIds || []).filter(Boolean);
  const item = (itemCropIds || []).filter(Boolean);
  if (!farmer.length || !item.length) return 'unknown';
  if (farmer.some(id => id !== ALL_CROPS_ID && item.includes(id))) return 'exact';
  if (item.includes(ALL_CROPS_ID) || farmer.includes(ALL_CROPS_ID)) return 'general';
  return 'none';
}
