# Notifications

**Answers:** "Tell me when something needs me, even when I'm not looking at the dashboard."

**Status:** INTEGRATION POINT. Today WhatsApp is used for OTPs and order
updates only (`server/whatsapp.js`, `server/orderNotifications.js`).

## What gets sent

Notifications are **not a new kind of content**. They deliver items the
priority engine already ranks, when a farmer would want to know right away:

| Kind | From | Default |
|---|---|---|
| `order.out_for_delivery` | orders | on (already sent today as a delivery update) |
| `weather.spray_avoid` | weather | off until the farmer opts in |
| `pest.disease_risk` / `pest.pest_risk` (level `high`) | pest risk | off until opt-in |
| `advisory.published` (severity `warning`) | advisory feed | off until opt-in |
| `market.price_rise` / `market.price_fall` | market prices | off until opt-in |
| `announcement` | admin | in-app only |

Only `critical` and `warning` items go to WhatsApp. Everything is also kept in
an in-app inbox.

## Channel options

| Option | Fit | Risk |
|---|---|---|
| **Reuse WaSender** (`server/whatsapp.js`: number pool, pacing, sticky numbers, circuit breaker) | Works today, no new vendor | WaSender connects through an unofficial WhatsApp session. Proactive alerts to many farmers raise report/ban risk, and the **same numbers carry OTPs and order updates**: a ban on alerts would break sign-in. If used, alerts need their own sender pool (e.g. `WASENDER_ALERT_API_KEY…`), strict opt-in and a daily cap. |
| **WhatsApp Business Platform** (Meta Cloud API or a Business Solution Provider) | Recommended for alerts | Pre-approved message templates, explicit opt-in required, per-message charges (pricing not checked here). New integration. |
| SMS | Not evaluated | India requires DLT template registration. |
| In-app inbox only | No delivery risk | Only reaches farmers who open the dashboard. |

**Recommendation:** in-app inbox first; WhatsApp alerts through the Business
Platform, keeping WaSender for OTPs and orders. The contract below is the same
whichever channel sends.

## Rules (server)

- **Consent:** WhatsApp alerts only after an explicit opt-in, per kind, stored
  with time and source. Replying STOP opts out; that needs an inbound webhook
  (INTEGRATION POINT: WaSender or Cloud API webhook).
- **Quiet hours:** no WhatsApp sends 21:00–07:00 IST. Held messages go at 07:00
  unless already out of date.
- **Frequency cap:** at most 2 alert messages per farmer per India day
  (orders excluded). Extra items go to the inbox only.
- **No repeats:** dedupe key `ntf:<userId>:<kind>:<sourceItemId>:<IST date>` in
  the kv store for 48 h.
- **Language:** the farmer's language from the profile (INTEGRATION POINT:
  store `language` on the account; today it lives only in the browser), with
  en + ta templates.
- **Scheduling:** alerts are evaluated by a job. Vercel Cron on the Hobby plan
  runs at most once a day (UTC, within the hour); weather and pest alerts need
  several runs a day, so either the Pro plan (per-minute) or an external
  scheduler calling `POST /api/internal/notifications/run` with a secret header
  (INTEGRATION POINT, `vercel.json` change).
- **Records:** delivery outcome per channel, as `recordOrderNotification` does for orders.

## Endpoints

### `GET /api/farmer/notifications?limit=20&cursor=…` ([example](examples/notifications.json))

| Field | Type | Notes |
|---|---|---|
| `items[]` | array | Newest first |
| `items[].id` | string | |
| `items[].kind` | string | Table above |
| `items[].severity` | `"critical"` \| `"warning"` \| `"info"` | |
| `items[].params` | object | Codes and values the dashboard words; `announcement` carries `title: { en, ta }` |
| `items[].sourceItemId` | string \| null | The DashboardItem id it came from, e.g. `weather:spray` |
| `items[].createdAt`, `readAt` | ISO, ISO \| null | |
| `items[].channels` | string[] | `in_app`, `whatsapp` |
| `items[].delivery` | object | `{ whatsapp: { status: "sent" \| "failed" \| "held" \| "suppressed", sentAt?, reason? } }` |
| `unreadCount` | number | |
| `nextCursor` | string \| null | |
| `fetchedAt`, `stale` | | |

### `POST /api/farmer/notifications/read`

Body `{ "ids": ["…"] }` or `{ "all": true }` → `{ "success": true, "data": { "unreadCount": 0 } }`.

### `GET` / `PUT /api/farmer/notification-preferences` ([example](examples/notification-preferences.json))

| Field | Type | Notes |
|---|---|---|
| `whatsapp.optedIn` | boolean | |
| `whatsapp.optedInAt` | ISO \| null | |
| `whatsapp.source` | `"dashboard"` \| `"registration"` \| `"whatsapp_reply"` \| null | |
| `kinds` | `{ [kind]: boolean }` | |
| `quietHours` | `{ start: "21:00", end: "07:00", timeZone: "Asia/Kolkata" }` | Read-only in v1 |
| `maxAlertsPerDay` | number | Read-only in v1 |
| `language` | `"en"` \| `"ta"` | |

`PUT` accepts `whatsapp.optedIn`, `kinds` and `language`; the rest is ignored.

## Storage and caching

- `Notification` collection, TTL index 90 days; preferences on the user record (`notificationPreferences`).
- Inbox: not cached on the server (small, per farmer). Dashboard `RESOURCE_POLICY.notification`: reuse 2 min, stale after 30 min.

## Normalizer: `lib/normalizers/notificationItem.js`

`normalizeNotifications(data, { knownItemIds })`

- Skips notifications whose `sourceItemId` is already on the dashboard, so an
  "avoid spraying" alert does not appear twice.
- `id` `notification:<id>`, `source` `notification`,
  `kind` `notification.<kind>`, severity as sent.
- `occurredAt` `createdAt`, `fetchedAt` from the response,
  payload carries `readAt`, `params`, `delivery`.

## Ranking factor

`unread`: value 1 when `readAt` is null, proposed weight **10**, so read items sink.

## Open questions

- WhatsApp Business Platform: approve the vendor and budget?
- Which kinds should be on by default after opt-in?
- Ask for opt-in at registration, on the dashboard, or both?

## Sources

- [WaSender compliance guidance](https://wasenderapi.com/help/messaging/key-compliance-points-avoid-account-flagging-blocking)
- [Unofficial WhatsApp API ban risk](https://wapisimo.dev/blog/en/whatsapp-unofficial-api-ban-risk)
- [WhatsApp API account restrictions](https://chakrahq.com/article/whatsapp-api-account-restricted-or-blocked-find-out-why-and-how-to-resolve/)
- [Vercel cron jobs: plan limits](https://vercel.com/docs/limits)
