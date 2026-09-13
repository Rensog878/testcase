// A farmer's crops.
//
//   crop   the primary crop, exactly as before multi-crop support
//   crops  every crop the farmer grows, primary first, so crops[0] === crop
//
// Accounts saved before the migration (server/migrations/crops-array.js) have
// only `crop`; everything here reads them as a one-crop list, so the site
// works the same before, during and after the migration.
//
// Plain ES module: used by the server, the migration and the React app.

import { ALL_CROPS_ID, CROPS, matchCrops, resolveCrop, resolveCropList } from './cropRegistry.js';

export const MAX_FARMER_CROPS = 10;
const MAX_LABEL_LENGTH = 60;

const labelsFrom = value => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []);
const cleanLabel = value => (typeof value === 'string' ? value.trim().slice(0, MAX_LABEL_LENGTH) : '');

/**
 * { crop, crops } from a primary crop and any others.
 * Blank and "N/A" entries are dropped, the same crop under two spellings is
 * kept once (first spelling wins), and "All Crops" is dropped when specific
 * crops are listed. The labels themselves are stored as given.
 */
export function normalizeFarmerCrops(primary, others = []) {
  const chosen = [];
  const seen = new Set();
  for (const label of [primary, ...labelsFrom(others)].map(cleanLabel)) {
    if (!label) continue;
    const { id } = resolveCrop(label);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    chosen.push({ id, label });
  }
  const specific = chosen.filter(entry => entry.id !== ALL_CROPS_ID);
  const kept = (specific.length ? specific : chosen).slice(0, MAX_FARMER_CROPS);
  return { crop: kept[0]?.label ?? '', crops: kept.map(entry => entry.label) };
}

/** Every crop on a stored account, primary first; a pre-migration account gives [crop]. */
export function farmerCropLabels(user) {
  return normalizeFarmerCrops(user?.crop ?? user?.primaryCrop ?? '', labelsFrom(user?.crops)).crops;
}

export function farmerCropIds(user) {
  return resolveCropList(farmerCropLabels(user));
}

/** matchCrops() result for an account against a product's crops list. */
export function farmerCropMatch(user, productCrops) {
  return matchCrops(farmerCropIds(user), resolveCropList(productCrops));
}

/**
 * New { crop, crops } for an update, or null when it touches neither.
 * - crops sent: that list, with crop (if also sent) moved to the front
 * - only crop sent (older forms): it becomes the primary; other crops are kept
 */
export function applyCropUpdate(existing, updates) {
  const sendsCrop = updates?.crop !== undefined;
  const sendsCrops = updates?.crops !== undefined;
  if (!sendsCrop && !sendsCrops) return null;

  if (sendsCrops) {
    const list = labelsFrom(updates.crops);
    return normalizeFarmerCrops(sendsCrop ? updates.crop : list[0] ?? '', list);
  }

  const previousPrimary = resolveCrop(existing?.crop).id;
  const others = farmerCropLabels(existing).filter(label => resolveCrop(label).id !== previousPrimary);
  return normalizeFarmerCrops(updates.crop, others);
}

/** Choices for crop pickers: the English name is what gets stored. */
export function farmerCropChoices() {
  return CROPS.map(crop => ({ id: crop.id, label: crop.names.en, names: { ...crop.names } }));
}
