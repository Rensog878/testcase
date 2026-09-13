// GET /api/farmer/market-prices (src/farmer/contracts/market-prices.md) -> DashboardItems.
// Only notable price moves are ranked; everyday prices belong to a market card.

import { createDashboardItem, toTimestamp } from '../dashboardItem.js';

// Midday in India on a 'YYYY-MM-DD' market day.
const marketDay = date => toTimestamp(`${date}T12:00:00+05:30`);

export function normalizeMarketPrices(data, { minChangePct = 10 } = {}) {
  if (data?.status !== 'ok' || !Array.isArray(data.prices)) return [];

  return data.prices
    .filter(price => price?.cropId && price.marketId && typeof price.change7d?.pct === 'number' && Math.abs(price.change7d.pct) >= minChangePct)
    .map(price => createDashboardItem({
      id: `market:${price.marketId}:${price.cropId}:${price.arrivalDate}`,
      source: 'market',
      kind: price.change7d.pct > 0 ? 'market.price_rise' : 'market.price_fall',
      severity: 'info',
      cropIds: [price.cropId],
      occurredAt: marketDay(price.arrivalDate),
      fetchedAt: toTimestamp(data.fetchedAt),
      payload: {
        cropId: price.cropId,
        commodity: price.commodity,
        market: price.market,
        district: price.district,
        arrivalDate: price.arrivalDate,
        modalPrice: price.modalPrice,
        previousModalPrice: price.change7d.previousModalPrice,
        changePct: price.change7d.pct,
        unit: data.unit,
      },
    }));
}
