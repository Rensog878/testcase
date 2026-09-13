// Ranking factors and weights proposed by the contracts in src/farmer/contracts/.
// Not used by the dashboard yet: switch the engine to PROPOSED_FACTORS and
// PROPOSED_PRIORITY_CONFIG when the first of these sources is wired in.
//
// The new factors add up to 80 more points, so the severity weight rises to
// keep tiers apart. With every positive factor at full value (205 points) and
// staleness at -20:
//   worst critical 1000 - 20 = 980  >  best warning 600 + 205 = 805
//   worst warning   600 - 20 = 580  >  best info    300 + 205 = 505
//   worst info      300 - 20 = 280  >  best ok        0 + 205 = 205
// integrationContracts.test.js checks this.

import { normalizePlace } from '../../shared/placeNames.js';
import { PRIORITY_CONFIG } from './priorityConfig.js';
import { PRIORITY_FACTORS } from './priorityEngine.js';

const HOUR_MS = 60 * 60 * 1000;
const clamp01 = value => Math.min(1, Math.max(0, value));

export const INTEGRATION_FACTORS = [
  {
    // Pest & disease risk: the rule's own score (pest-disease-risk.md).
    name: 'pestRisk',
    compute: item => (item.source === 'pest_risk'
      ? { value: clamp01(Number(item.payload.score) || 0), reason: item.payload.level }
      : { value: 0, reason: 'not_pest_risk' }),
  },
  {
    // Market prices: bigger moves matter more; a move of marketMoveFullPct or more scores 1 (market-prices.md).
    name: 'marketMove',
    compute: (item, context, config) => (item.source === 'market'
      ? { value: clamp01(Math.abs(Number(item.payload.changePct) || 0) / config.marketMoveFullPct) }
      : { value: 0, reason: 'not_market' }),
  },
  {
    // Advisories: the farmer's own district beats statewide advice (advisory-feed.md).
    name: 'locality',
    compute: (item, context) => {
      if (item.source !== 'advisory') return { value: 0, reason: 'not_advisory' };
      const districts = item.payload.districts || [];
      if (!districts.length) return { value: 0.5, reason: 'statewide' };
      const farmerDistrict = normalizePlace(context.location?.district);
      return farmerDistrict && districts.some(district => normalizePlace(district) === farmerDistrict)
        ? { value: 1, reason: 'district' }
        : { value: 0, reason: 'other_district' };
    },
  },
  {
    // Notifications: unread messages rank above ones the farmer has seen (notifications.md).
    name: 'unread',
    compute: item => (item.source === 'notification'
      ? { value: item.payload.readAt ? 0 : 1 }
      : { value: 0, reason: 'not_notification' }),
  },
  {
    // Farm analytics: products the farmer has bought before (farm-analytics.md).
    name: 'purchaseHistory',
    compute: (item, context) => {
      const productId = item.payload?.productId;
      return productId && Array.isArray(context.purchasedProductIds) && context.purchasedProductIds.includes(productId)
        ? { value: 1, reason: 'bought_before' }
        : { value: 0 };
    },
  },
];

export const PROPOSED_FACTORS = [...PRIORITY_FACTORS, ...INTEGRATION_FACTORS];

export const PROPOSED_PRIORITY_CONFIG = {
  ...PRIORITY_CONFIG,
  weights: {
    ...PRIORITY_CONFIG.weights,
    severity: 1000,
    pestRisk: 35,
    locality: 15,
    marketMove: 10,
    unread: 10,
    purchaseHistory: 10,
  },
  severityLevels: { critical: 1, warning: 0.6, info: 0.3, ok: 0 },
  marketMoveFullPct: 20,
  staleAfterMs: {
    ...PRIORITY_CONFIG.staleAfterMs,
    market: 36 * HOUR_MS,
    pest_risk: 6 * HOUR_MS,
    notification: 30 * 60 * 1000,
    advisory: 24 * HOUR_MS,
    analytics: 24 * HOUR_MS,
  },
};
