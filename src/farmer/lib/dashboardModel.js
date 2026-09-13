// Turns normalized items into what each dashboard section shows.

import { isActionable } from './dashboardItem.js';
import { dosageForFarm } from './dosage.js';
import { normalizeProducts } from './normalizers/productItem.js';
import { PRIORITY_CONFIG } from './priorityConfig.js';
import { rankItems } from './priorityEngine.js';

/**
 * Items for "Needs your attention", most urgent first: every critical and
 * warning item, plus any item alwaysInclude accepts (the spraying advice is
 * always listed, whatever it says).
 */
export function selectAttentionItems(items, context, { config = PRIORITY_CONFIG, limit = Infinity, alwaysInclude = () => false } = {}) {
  return rankItems(items, context, config)
    .filter(ranked => isActionable(ranked.item) || alwaysInclude(ranked.item))
    .slice(0, limit);
}

/** Order items, newest order first. */
export function selectRecentOrders(orderItems, { limit = 5 } = {}) {
  return [...(orderItems || [])]
    .sort((a, b) => (b.payload.createdAt ?? 0) - (a.payload.createdAt ?? 0) || (a.id < b.id ? -1 : 1))
    .slice(0, limit);
}

/**
 * Products for the farmer's crop.
 * status: 'no_crop'       the farmer has no crop on their profile
 *         'none_for_crop' nothing in stock matches their crop
 *         'ok'            items holds up to `limit` ranked results
 * Specific matches rank above products sold for all crops; products an admin
 * assigned to this farmer are always included. Each result carries `dose`:
 * the total for the farmer's acreage when the dosage text is a plain per-area
 * rate, otherwise null (the text is then shown as written).
 */
export function selectCropRecommendations(products, context, { now, fetchedAt = null, limit = 3, config = PRIORITY_CONFIG } = {}) {
  if (!context?.cropIds?.length) return { status: 'no_crop', items: [] };

  const candidates = normalizeProducts(products, { fetchedAt }).filter(item => item.payload.inStock);
  const relevant = rankItems(candidates, { ...context, now }, config).filter(ranked => {
    const match = ranked.breakdown.cropMatch.reason;
    return match === 'exact' || match === 'general' || ranked.breakdown.targeted.value === 1;
  });

  if (!relevant.length) return { status: 'none_for_crop', items: [] };
  return {
    status: 'ok',
    items: relevant.slice(0, limit).map(ranked => ({ ...ranked, dose: dosageForFarm(ranked.item.payload.dosageText, context.acreage) })),
  };
}
