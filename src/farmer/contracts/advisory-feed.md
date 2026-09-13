# Advisory feed (CMS)

**Answers:** "What is the Sathya Bio agronomy team advising for my crop and area right now?"

**Status:** INTEGRATION POINT.

## What exists today

- `GET/PUT /api/cms` stores **site settings** (hero text, banner, the advisory
  signup title and description, contact details, popup). There is no advisory
  content model.
- `POST /api/advisory/subscribe` stores `{ phone, crop, season, acreage }`
  subscribers; `GET /api/advisory/subscribers` lists them for admins.
- `src/pages/admin/Subscribers.jsx` shows three **hard-coded demo rows** when
  the request fails, and its "WhatsApp Broadcast" button has no action.
  Worth fixing independently of this contract.

## Content model: new `Advisory` collection

| Field | Type | Notes |
|---|---|---|
| `id` | string | `adv_<year>_<seq>` |
| `status` | `"draft"` \| `"published"` \| `"archived"` | Farmers see `published` only |
| `title`, `summary`, `body` | `{ en, ta }` | `body` plain text with line breaks (no HTML) |
| `cropIds` | string[] | Registry ids, or `["all"]` |
| `districts` | string[] | Empty = whole state |
| `seasons` | string[] | e.g. `samba`; empty = any |
| `severity` | `"info"` \| `"warning"` | `warning` for time-critical advice (outbreaks, weather events) |
| `validFrom`, `validUntil` | ISO | Shown only inside this window |
| `productIds` | string[] | Linked products |
| `author` | `{ name, role }` | e.g. the agronomy team |
| `sourceUrl` | string \| null | e.g. a TNAU bulletin |
| `publishedAt`, `updatedAt` | ISO | |
| `version` | number | Bumped on every save |

## Endpoints

### Farmer: `GET /api/farmer/advisories?limit=10` ([example](examples/advisories.json))

Returns published advisories valid now whose `cropIds` include one of the
farmer's crops (or `all`) and whose `districts` are empty or include the
farmer's district. Newest `publishedAt` first.

| Field | Type | Notes |
|---|---|---|
| `items[]` | array | Content model above minus `status` and `version` |
| `items[].translated` | boolean | False when Tamil was missing and English is repeated in `ta` |
| `fetchedAt`, `stale` | | `fetchedAt` = when the list was read from the collection |

### Admin: `/api/admin/advisories`

| Method | Path | Body / result |
|---|---|---|
| GET | `/api/admin/advisories?status=…` | List |
| POST | `/api/admin/advisories` | Create draft |
| PUT | `/api/admin/advisories/:id` | Update (any status) |
| POST | `/api/admin/advisories/:id/publish` | Publish; optionally queue notifications (see notifications.md) |
| DELETE | `/api/admin/advisories/:id` | Archive (kept for history) |

Validation: at least `title.en`, `summary.en`, `cropIds`, `validFrom`,
`validUntil > validFrom`; crop ids must resolve in the registry.

## Caching

| Layer | Key | TTL |
|---|---|---|
| Server | `adv:v<listVersion>:<sorted cropIds>:<district>` | 15 min; `adv:listVersion` in the kv store is bumped on create/update/publish/archive, so edits show immediately |
| Dashboard | `RESOURCE_POLICY.advisory` | reuse 15 min; stale after 24 h |

## Normalizer: `lib/normalizers/advisoryItem.js`

`normalizeAdvisories(data, { now })`

- Skips anything outside `validFrom`–`validUntil` (a cached list can outlive an advisory).
- `id` `advisory:<id>`, `source` `advisory`, `kind` `advisory.post`,
  severity as published.
- `cropIds` as published, `dueAt` `validUntil` (expiring advice gains
  urgency), `occurredAt` `publishedAt`, `fetchedAt` from the response.

## Ranking factor

`locality`: 1 when the advisory names the farmer's district, 0.5 when it is
statewide, 0 otherwise; proposed weight **15**. The existing `cropMatch`,
`recency` and `urgency` also apply.

## Open questions

- Who writes and approves advisories, and who translates to Tamil?
- Send warning advisories to existing advisory subscribers who have no account?
- Keep the old `advisoryTitle` / `advisoryDesc` CMS settings for the signup banner?
