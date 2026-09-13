# Farmer dashboard: integration contracts

Contracts for the five data sources the dashboard does not have yet. Nothing
here is wired into the UI or the server. Each contract defines:

- the API the dashboard will call, with a full example response in [`examples/`](examples/)
- where the data can come from, with licensing and what was checked
- how long answers are cached
- the normalizer that turns the response into `DashboardItem`s
- the ranking factors it adds to the priority engine

The normalizers and factors already exist as tested code
(`src/farmer/lib/normalizers/*`, `src/farmer/lib/integrationFactors.js`,
`src/farmer/__tests__/integrationContracts.test.js`), run against the example
responses. A backend built to these contracts plugs in without changing them.

| Contract | Endpoint | Server status | Normalizer | New factors |
|---|---|---|---|---|
| [Market prices](market-prices.md) | `GET /api/farmer/market-prices` | INTEGRATION POINT | `marketPriceItem.js` | `marketMove` |
| [Pest & disease risk](pest-disease-risk.md) | `GET /api/farmer/pest-risk` | INTEGRATION POINT | `pestRiskItem.js` | `pestRisk` |
| [Notifications](notifications.md) | `GET /api/farmer/notifications`, preferences | INTEGRATION POINT | `notificationItem.js` | `unread` |
| [Advisory feed](advisory-feed.md) | `GET /api/farmer/advisories`, admin CRUD | INTEGRATION POINT | `advisoryItem.js` | `locality` |
| [Farm analytics](farm-analytics.md) | `GET /api/farmer/analytics` | INTEGRATION POINT | `analyticsItem.js` | `purchaseHistory` |

## Conventions (same as the live weather endpoint)

**Routes.** Farmer data lives under `/api/farmer/*`, which `server/server.js`
already mounts behind `requireAuth('farmer')`. The farmer is always the one in
the token; no endpoint takes a user id. Admin endpoints live under
`/api/admin/*` (`requireAuth('admin')`).

**Envelope.** `{ "success": true, "data": … }`. Expected "nothing to show"
situations are answers, not errors: `data.status` is `"ok"` or a documented
value such as `"no_crop"` or `"location_missing"`, returned with HTTP 200 so the
card can show its empty state with a next action. Errors are for failures only:
401 (not signed in), 429 (`retryAfter`), 503 with a `code` when a data source is
down and nothing cached exists.

**Freshness.** Every data response carries `fetchedAt` (when the underlying
source produced or supplied the data, not when the response was sent) and
`stale` (true when the server is serving an older copy because the source
failed). The dashboard turns these into "Updated 2 hours ago" and the stale
notice; see `lib/freshness.js`.

**Time.** Instants are ISO 8601 UTC strings. Calendar days are `YYYY-MM-DD` in
India Standard Time.

**Language.** Computed content returns codes and numbers (`reasonCode`,
`drivers[].code`); the dashboard words them in `i18n/strings.js`. Editorial
content (advisories, announcements) returns `{ "en": …, "ta": … }`; when no
Tamil text exists the server repeats the English and sets `"translated": false`.

**Crops.** Crop ids come from `src/shared/cropRegistry.js`; a farmer's crops
from `src/shared/farmerCrops.js` (primary first). Source names such as mandi
commodities are mapped through `resolveCrop` (`"Paddy(Common)"` → `paddy`).

**Caching.** Server caches use the Mongo kv store (`db.kvGet` / `db.kvSet`
with a TTL), never process memory. When admins can change the data (advisories,
notifications), cache keys include a version number stored in the kv store and
bumped on every change, because the kv store has no prefix delete. Per-farmer
responses send `Cache-Control: private, no-store`.

**Rate limits.** 60 requests per farmer per hour per endpoint via
`rateLimit()` in `server/http.js`, as for weather.

## Wiring a contract into the dashboard (when its backend exists)

1. Add a hook: `useResource` + a `RESOURCE_POLICY` entry in `lib/priorityConfig.js`.
2. Feed its normalized items into `selectAttentionItems` (actionable items) or a card.
3. Switch the engine to `PROPOSED_FACTORS` / `PROPOSED_PRIORITY_CONFIG` from
   `lib/integrationFactors.js` (the severity weight must rise with the new
   factors; the test there proves tiers still never overlap).
4. Add words for the new `kind`s in `components/AttentionList.jsx` and `i18n/strings.js`.
5. Loading / empty / error / stale states come from `SourceCard`.

## New DashboardItem sources

`lib/dashboardItem.js` accepts `market`, `pest_risk`, `notification`,
`advisory` and `analytics` in addition to `order`, `product`, `weather` and `alert`.
