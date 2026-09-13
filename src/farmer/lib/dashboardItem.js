// The common shape every dashboard source is normalized into, so the priority
// engine can rank orders, weather advisories, product suggestions and future
// alerts against each other.
//
// @typedef {Object} DashboardItem
// @property {string}   id               Unique across sources, e.g. "order:SB-ORD-1"
// @property {'order'|'product'|'weather'|'alert'|'market'|'pest_risk'|'notification'|'advisory'|'analytics'} source
//                                     (the last five follow the contracts in src/farmer/contracts/)
// @property {string}   kind             What happened, e.g. "order.out_for_delivery"; the UI picks words by kind
// @property {'critical'|'warning'|'info'|'ok'} severity
// @property {string[]} cropIds          Crop ids from src/shared/cropRegistry.js; [] when not crop-specific
// @property {number|null} dueAt         When action is needed (ms since epoch)
// @property {number|null} occurredAt    When the underlying event happened (ms)
// @property {number|null} fetchedAt     When the data behind the item was fetched (ms)
// @property {boolean}  weatherSensitive Whether current weather changes how urgent it is
// @property {string|null} targetUserId  Set when an admin assigned the item to one farmer
// @property {Object}   payload          Source-specific values for display

export const SEVERITIES = ['critical', 'warning', 'info', 'ok'];
export const SOURCES = ['order', 'product', 'weather', 'alert', 'market', 'pest_risk', 'notification', 'advisory', 'analytics'];

export function toTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function createDashboardItem(fields) {
  if (!fields || !fields.id) throw new TypeError('A dashboard item needs an id.');
  if (!SOURCES.includes(fields.source)) throw new TypeError(`Unknown dashboard item source: ${fields.source}`);
  if (!SEVERITIES.includes(fields.severity)) throw new TypeError(`Unknown dashboard item severity: ${fields.severity}`);

  return {
    id: String(fields.id),
    source: fields.source,
    kind: fields.kind || fields.source,
    severity: fields.severity,
    cropIds: Array.isArray(fields.cropIds) ? fields.cropIds.filter(Boolean) : [],
    dueAt: toTimestamp(fields.dueAt),
    occurredAt: toTimestamp(fields.occurredAt),
    fetchedAt: toTimestamp(fields.fetchedAt),
    weatherSensitive: fields.weatherSensitive === true,
    targetUserId: fields.targetUserId ? String(fields.targetUserId) : null,
    payload: fields.payload && typeof fields.payload === 'object' ? fields.payload : {},
  };
}

export function isActionable(item) {
  return item.severity === 'critical' || item.severity === 'warning';
}
