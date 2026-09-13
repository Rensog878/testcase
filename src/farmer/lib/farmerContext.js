// What the dashboard knows about the signed-in farmer, cleaned up once.

import { resolveCrop, resolveCropList } from '../../shared/cropRegistry.js';
import { farmerCropLabels } from '../../shared/farmerCrops.js';

// Filled in by db.createUser when a field was left blank; not a real place.
const PLACEHOLDER_PLACES = new Set(['farm village', 'farm', 'n/a', 'na', '-']);

function cleanPlace(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && !PLACEHOLDER_PLACES.has(text.toLowerCase()) ? text : null;
}

export function buildFarmerContext(user) {
  // Every crop the farmer grows, primary first; accounts from before the
  // multi-crop migration give just their one crop.
  const labels = farmerCropLabels(user);
  const crops = labels.map(resolveCrop);
  const acreage = Number(user?.acreage ?? user?.landAcres);
  const name = typeof user?.name === 'string' ? user.name.trim() : '';

  return {
    userId: user?.id ? String(user.id) : null,
    name: name || null,
    crop: crops[0] || resolveCrop(''),
    crops,
    cropIds: resolveCropList(labels),
    acreage: Number.isFinite(acreage) && acreage > 0 ? acreage : null,
    location: {
      village: cleanPlace(user?.village),
      district: cleanPlace(user?.district),
      state: cleanPlace(user?.state),
    },
  };
}
