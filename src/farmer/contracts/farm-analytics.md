# Farm analytics

**Answers:** "What have I spent on inputs, on what, and is it time to buy again?"

**Status:** INTEGRATION POINT.

## What the data can honestly support

Built only from data Sathya Bio already holds: the farmer's **orders**,
**products** (category, crops) and **profile acreage**.

It cannot show yields, profit, field records or inputs bought elsewhere, and
does not pretend to. Those need new data (INTEGRATION POINT: a field log).

## Endpoint

`GET /api/farmer/analytics?period=12m`

| Query | Values | Default |
|---|---|---|
| `period` | `12m`, `season`, `all` | `12m` |

`season` uses the farmer's stored season when that exists (see pest-disease-risk.md); until then it returns `400`.

### Response `data` ([full example](examples/analytics.json))

| Field | Type | How it is computed |
|---|---|---|
| `period` | `{ id, from, to }` | India dates |
| `currency` | `"INR"` | |
| `totals.orders` | number | Orders placed in the period, excluding cancelled |
| `totals.cancelled` | number | |
| `totals.spend` | number | Sum of `total` for orders that are `Paid`, or cash on delivery and `Delivered` |
| `totals.spendPerAcre` | number \| null | `spend / acreage`, null when acreage is unknown |
| `spendByMonth[]` | `{ month: "YYYY-MM", amount }` | By India month of `createdAt`; months with no spend omitted |
| `spendByCategory[]` | `{ category, amount, share }` | Order lines joined to the product's current category; deleted products count as `"Other"`; `share` 0–1, two decimals |
| `topProducts[]` | `{ productId, name, orders, quantity, amount, lastOrderedAt }` | Top 5 by amount |
| `reorder[]` | `{ productId, name, cropIds, lastOrderedAt, intervalDays, intervalSource, nextDueAt }` | See below |
| `generatedAt` | ISO | |
| `fetchedAt`, `stale` | | `fetchedAt` = `generatedAt` |

**Reorder reminders.** For each product the farmer ordered at least twice,
`intervalDays` = the median gap between those orders (`intervalSource:
"order_history"`) and `nextDueAt` = last order + interval. Products do not
record how often they may be re-applied (INTEGRATION POINT: product field
`reapplyAfterDays` from the label, which would give `intervalSource: "label"`
and cover first-time buyers). Products out of stock or deleted are left out.

## Caching

| Layer | Key | TTL |
|---|---|---|
| Server | `ana:v1:<userId>:<period>:<ordersVersion>` | 1 hour; `ordersVersion:<userId>` bumped whenever one of the farmer's orders is created or changes status |
| Dashboard | `RESOURCE_POLICY.analytics` | reuse 30 min; stale after 24 h |

## Normalizer: `lib/normalizers/analyticsItem.js`

`normalizeFarmAnalytics(data, { now, dueWithinDays = 14 })`

- Turns `reorder[]` entries due within `dueWithinDays` (or overdue) into items.
- `id` `analytics:reorder:<productId>`, `source` `analytics`,
  `kind` `analytics.reorder_due`, `severity` `info`.
- `cropIds` from the entry, `dueAt` `nextDueAt`, `occurredAt` `lastOrderedAt`.

`purchasedProductIds(data)` gives the ids in `topProducts` for the ranking context.

## Ranking factor

`purchaseHistory`: 1 for a product item the farmer has bought before (from
`context.purchasedProductIds`), proposed weight **10**. Familiar products rank a
little higher among recommendations.

## Open questions

- Should spend include GST (order `total`) or not (`subtotal`)?
- Add `reapplyAfterDays` to products, and who fills it from labels?
- Is a reorder reminder ever worth a notification, or dashboard only?
