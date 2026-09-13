# Pest & disease risk

**Answers:** "Is the weather this week likely to bring a pest or disease to my crop, and what should I do?"

**Status:** INTEGRATION POINT. The weather it needs is live (`GET /api/farmer/weather`);
the rules and the endpoint are not built.

## How risk is worked out

Rule-based, like the spraying advice: **weather + crop + season → risk level**.
Rules live in one config module on the server (proposed
`src/shared/pestRisk/rules.js`), each with an id, version, the crops it applies
to, the season window, weather conditions over recent and forecast hours, and
the source it came from.

**No rule goes live without an agronomist's sign-off**, recorded as
`rule.validatedBy`. The two starting points below are published models, not
recommendations for Tamil Nadu fields:

| Threat | Crops | Starting point | Source quality |
|---|---|---|---|
| Late blight | Potato, tomato | **Hutton criteria:** two consecutive days, each with minimum temperature ≥ 10 °C and at least 6 hours with relative humidity ≥ 90% | Checked: AHDB's national warning system for Great Britain (2017), refining the Smith Period. UK climate; relevant mainly to Tamil Nadu's hill districts. |
| Blast | Paddy | Humid nights (RH ≥ 90%) with temperatures around 24–26 °C favour infection | General literature only; needs local validation. |
| Others (brown planthopper, stem borer, whitefly, bollworm…) | — | To be supplied by the agronomy team | Not invented here. |

**Seasons.** Tamil Nadu paddy seasons per TNAU: Kuruvai sown June–July
(about 120 days), Samba sown August (about 145 days), Thaladi sown
September–October (about 135 days). A farmer's season and sowing date are
**not stored today** (INTEGRATION POINT: profile fields `seasons[]` /
`sowingDate` per crop). Until then, rules may use the calendar window for the
district, and the response says so (`season.source: "calendar"`).

## Data sources

| Need | Source | Notes |
|---|---|---|
| Forecast (next 72 h) | Existing weather service (MET Norway, or OpenWeather with a key) | Hourly humidity, temperature, rain; MET Norway has no rain probability for India |
| Recent weather (last 48 h) | **Gap.** MET Norway gives forecasts only | INTEGRATION POINT. Options: keep each forecast cell's hourly values in the kv store for 72 h and use the hours that have passed (free, approximate), or a paid history API (OpenWeather has one; cost not checked). |
| Crop | `farmerCropIds(user)` | All the farmer's crops |
| National Pest Surveillance System (Aug 2024) | Farmer app + web portal for photo-based expert advice (rice, cotton, maize, mango, chilli) | No public data feed found; not a source. |

## Endpoint

`GET /api/farmer/pest-risk`

### Response `data` ([full example](examples/pest-risk.json))

| Field | Type | Notes |
|---|---|---|
| `status` | `"ok"` \| `"no_crop"` \| `"location_missing"` \| `"location_not_found"` | Location answers match the weather endpoint |
| `location` | object | Same shape as weather |
| `season` | object \| null | `{ id, cropId, source: "profile" \| "calendar" }` |
| `risks[]` | array | Only for the farmer's crops |
| `risks[].riskId` | string | `<cropId>.<threatId>` |
| `risks[].threat` | object | `{ id, type: "disease" \| "pest", names: { en, ta } }` |
| `risks[].level` | `"high"` \| `"moderate"` \| `"low"` | |
| `risks[].score` | number 0–1 | Rule output before banding |
| `risks[].window` | object | `{ start, end }`: when conditions are favourable |
| `risks[].drivers[]` | array | `{ code, value, threshold?, range?, unit }`: why, as codes |
| `risks[].advice` | object | `{ code, productIds[] }`: e.g. `scout_and_protect`; products are suggestions the farmer can open |
| `risks[].rule` | object | `{ id, version, source, validatedBy }` |
| `evaluatedAt` | ISO | |
| `weatherFetchedAt` | ISO | Forecast time the risk was computed from |
| `stale` | boolean | True when computed from a stale forecast |

503 `PEST_RISK_UNAVAILABLE` only when no forecast exists at all.

## Caching

| Layer | Key | TTL |
|---|---|---|
| Server | `pest:v1:<rulesVersion>:<lat>:<lon>:<cropIds>` | 30 min, the same as the forecast it is built on |
| Dashboard | `RESOURCE_POLICY.pest_risk` | reuse 10 min; stale after 6 h |

## Normalizer: `lib/normalizers/pestRiskItem.js`

`normalizePestRisks(data)`

- `high` → `warning`, `moderate` → `info`; `low` is not ranked.
- `id` `pest:<riskId>:<window.start>`, `source` `pest_risk`,
  `kind` `pest.disease_risk` / `pest.pest_risk`.
- `cropIds` `[cropId]`, `dueAt` `window.start`, `occurredAt` `evaluatedAt`,
  `fetchedAt` `weatherFetchedAt`, `weatherSensitive` true.

## Ranking factors

- `pestRisk`: value `score`, proposed weight **35**.
- The existing `weatherRelevance` also counts, because items are weather-sensitive.
- The existing `urgency` counts through `dueAt`.

## Open questions

- Which threats first, with which thresholds? Who signs rules off?
- Store sowing date and season per crop on the profile?
- Accept approximate "recent weather" from stored forecasts, or pay for history?
- Advice wording: "scout the field" vs naming products; how strongly to recommend products?

## Sources

- [AHDB: Hutton Criteria national warning system](https://potatoes.ahdb.org.uk/development-and-implementation-of-a-new-national-warning-system-for-potato-late-blight-in-great-britain-hutton-criteria)
- [IPM Decisions: Hutton Criteria factsheet](https://www.ipmdecisions.net/documents/factsheet-hutton-criteria-late-blight-model/)
- [Rice blast fact sheet (conditions)](https://www.texasinvasives.org/action/participation%20files/rice_blast.pdf)
- [TNAU Agritech: rice seasons and varieties](http://www.agritech.tnau.ac.in/agriculture/agri_seasonandvarieties_rice.html)
- [National Pest Surveillance System overview](https://www.newsonair.gov.in/agriculture-minister-shivraj-singh-chouhan-inaugurates-national-pest-surveillance-system/)
