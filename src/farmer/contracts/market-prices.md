# Market prices (mandi rates)

**Answers:** "What is my crop selling for at nearby mandis today, and is the price moving?"

**Status:** INTEGRATION POINT. No server code, no stored prices.

## Data sources

| Option | Access | Notes |
|---|---|---|
| **data.gov.in**: "Current Daily Price of Various Commodities from Various Markets (Mandi)", resource `9ef84268-d588-465a-a308-a864a43d0070` (Ministry of Agriculture & Farmers Welfare) | Free API key after registering on data.gov.in | **Checked on 13 Sep 2026:** `GET https://api.data.gov.in/resource/<id>?api-key=…&format=json&limit=…&offset=…&filters[state]=Tamil Nadu` returns `records[]` with `state, district, market, commodity, variety, grade, arrival_date, min_price, max_price, modal_price` plus `total/count/limit/offset` and `updated`. `arrival_date` is `DD/MM/YYYY`; prices are numbers. Commodity names look like `Paddy(Common)`, `Jowar(Sorghum)`. **The dataset holds the current day only** and fills during the day: at 06:40 IST it had 4 rows, none for Tamil Nadu. Price unit (rupees per quintal) and licence (Government Open Data License – India) are from the dataset description: confirm on the dataset page. |
| **Agmarknet 2.0** (agmarknet.gov.in, upgraded Nov 2025; 4,367 mandis linked per PIB) | Unconfirmed | A developer API is described only by third parties. Ask the Directorate of Marketing & Inspection before relying on it. |
| **e-NAM** price dashboards | No public API found | Dashboards only. |
| Commercial aggregators | Not evaluated | |

**Recommendation:** data.gov.in, snapshotted daily by our server. The dataset
keeps no history, so our own snapshots are what make "price moving" possible.

## Server work (INTEGRATION POINT)

- **Daily snapshot job** at 19:30 IST (14:00 UTC), after the day's arrivals
  are loaded. Vercel Cron allows once a day on the Hobby plan, which is enough
  for this. `vercel.json` is outside the folders this project edits; adding the
  cron entry is a deployment change.
- Pages through `filters[state]` for Tamil Nadu (and any neighbouring states
  the business chooses) with `limit`/`offset`.
- Upserts into a new `MarketPrice` collection, `_id` =
  `arrivalDate|state|district|market|commodity|variety|grade`, with a 120-day
  TTL index. `arrival_date` is stored as `YYYY-MM-DD`; `cropId` =
  `resolveCrop(commodity).id` at write time.
- **Market locations** for "nearest mandi" need coordinates: geocode
  `market, district, state` once through `server/weather/geocode.js` (cached
  90 days). Until then, markets are matched by the farmer's district, then state.

## Endpoint

`GET /api/farmer/market-prices`

| Query | Default | Meaning |
|---|---|---|
| `crop` (repeatable) | the farmer's crops | Crop ids from the registry |
| `limit` | 5 | Prices per crop |

Order: markets in the farmer's district first, then the rest of the state,
newest `arrivalDate` first.

### Response `data` ([full example](examples/market-prices.json))

| Field | Type | Notes |
|---|---|---|
| `status` | `"ok"` \| `"no_crop"` \| `"no_markets"` | `no_markets`: none of the farmer's crops traded in their district or state in the last 7 days |
| `asOf` | `YYYY-MM-DD` | Latest arrival date in the answer; Sundays and holidays make this older than today, which is normal |
| `unit` | `"INR_PER_QUINTAL"` | |
| `district` | string \| null | The district the answer is centred on |
| `prices[]` | array | One row per crop, market, variety and grade |
| `prices[].cropId` | string | Registry id |
| `prices[].commodity`, `variety`, `grade` | string | As published |
| `prices[].market`, `marketId`, `district`, `state` | string | `marketId` = `state\|district\|market` lower-cased |
| `prices[].arrivalDate` | `YYYY-MM-DD` | |
| `prices[].minPrice`, `maxPrice`, `modalPrice` | number | |
| `prices[].change7d` | object \| null | `{ previousModalPrice, previousDate, pct }` against the nearest snapshot 6–8 days earlier; null when there is none |
| `source` | object | `{ provider, dataset, credits[] }` |
| `fetchedAt` | ISO | When the snapshot job fetched the rows |
| `stale` | boolean | True when the newest snapshot is older than 48 hours |

## Caching

| Layer | Key / setting | TTL |
|---|---|---|
| Snapshot | `MarketPrice` collection | 120 days |
| Per-farmer answer | `mkt:v1:<userId>:<cropIds>` | 3 hours (data changes once a day) |
| Dashboard | `RESOURCE_POLICY.market` | reuse 30 min; stale after 36 h |

## Normalizer: `lib/normalizers/marketPriceItem.js`

`normalizeMarketPrices(data, { now, minChangePct = 10 })`

- Only rows whose `change7d.pct` moved by at least `minChangePct` become items;
  ordinary prices are shown by the market card, not ranked.
- `id` `market:<marketId>:<cropId>:<arrivalDate>`, `source` `market`,
  `kind` `market.price_rise` / `market.price_fall`, `severity` `info`
  (prices inform; they never demand action).
- `cropIds` `[cropId]`, `occurredAt` midday IST on `arrivalDate`,
  `fetchedAt` from the response, `dueAt` null.

## Ranking factor

`marketMove`, value `min(1, |pct| / 20)`, proposed weight **10**. A 20% move
earns full points. Crop match comes from the existing `cropMatch` factor.

## Open questions

- Which states besides Tamil Nadu, and should neighbouring-district markets count as "nearby"?
- Show the modal price only, or min–max too? Group varieties?
- Is market-price data a reason to message farmers (see notifications), or dashboard only?

## Sources

- [data.gov.in API page for the dataset](https://www.data.gov.in/apis/9ef84268-d588-465a-a308-a864a43d0070)
- [data.gov.in catalogue entry](https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi)
- [PIB: Agmarknet and e-NAM real-time mandi price information](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2204750&reg=3&lang=1)
- [Vercel cron limits](https://vercel.com/docs/limits)
