// Ranks normalized DashboardItems for one farmer.
//
// A factor is { name, compute(item, context, config) -> { value: 0..1, reason? } }.
// Its weight comes from config.weights[name]. Adding a factor means adding an
// entry to PRIORITY_FACTORS and a weight to priorityConfig.js; nothing in the UI
// changes, because components only read the ranked order and the breakdown.

import { matchCrops } from '../../shared/cropRegistry.js';
import { PRIORITY_CONFIG } from './priorityConfig.js';

const HOUR_MS = 60 * 60 * 1000;

const clamp01 = value => Math.min(1, Math.max(0, value));
const round2 = value => Math.round(value * 100) / 100;

export const PRIORITY_FACTORS = [
  {
    name: 'severity',
    compute: (item, context, config) => ({ value: config.severityLevels[item.severity] ?? 0 }),
  },
  {
    name: 'urgency',
    compute: (item, context, config) => {
      if (item.dueAt === null || item.dueAt === undefined) return { value: 0, reason: 'no_due_date' };
      const hoursLeft = (item.dueAt - context.now) / HOUR_MS;
      if (hoursLeft <= 0) return { value: 1, reason: 'due' };
      return { value: round2(clamp01(1 - hoursLeft / config.urgencyHorizonHours)), reason: 'upcoming' };
    },
  },
  {
    name: 'cropMatch',
    compute: (item, context, config) => {
      const match = matchCrops(context.cropIds, item.cropIds);
      return { value: config.cropMatchLevels[match] ?? 0, reason: match };
    },
  },
  {
    name: 'weatherRelevance',
    compute: (item, context) => {
      if (!item.weatherSensitive) return { value: 0, reason: 'not_weather_sensitive' };
      const risk = context.weather?.risk;
      if (typeof risk !== 'number' || !Number.isFinite(risk)) return { value: 0, reason: 'no_weather' };
      return { value: clamp01(risk), reason: 'weather_risk' };
    },
  },
  {
    name: 'targeted',
    compute: (item, context) => ({
      value: context.userId && item.targetUserId === context.userId ? 1 : 0,
    }),
  },
  {
    name: 'recency',
    compute: (item, context, config) => {
      if (item.occurredAt === null || item.occurredAt === undefined) return { value: 0, reason: 'no_event_time' };
      const ageHours = Math.max(0, (context.now - item.occurredAt) / HOUR_MS);
      return { value: round2(0.5 ** (ageHours / config.recencyHalfLifeHours)) };
    },
  },
  {
    name: 'staleness',
    compute: (item, context, config) => {
      if (item.fetchedAt === null || item.fetchedAt === undefined) return { value: 0, reason: 'no_fetch_time' };
      const limit = config.staleAfterMs[item.source] ?? config.defaultStaleAfterMs;
      return context.now - item.fetchedAt > limit ? { value: 1, reason: 'stale' } : { value: 0, reason: 'fresh' };
    },
  },
];

/** Scores one item. Returns { item, score, stale, breakdown: { [factor]: { value, weight, points, reason? } } }. */
export function scoreItem(item, context, config = PRIORITY_CONFIG, factors = PRIORITY_FACTORS) {
  const breakdown = {};
  let score = 0;
  for (const factor of factors) {
    const weight = config.weights[factor.name] ?? 0;
    const { value, reason } = factor.compute(item, context, config);
    const points = round2(value * weight);
    breakdown[factor.name] = reason === undefined ? { value, weight, points } : { value, weight, points, reason };
    score += points;
  }
  return { item, score: round2(score), stale: breakdown.staleness?.value === 1, breakdown };
}

function compareNullableAsc(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return a - b;
}

// Equal scores: sooner due date first, then the more recent event, then id,
// so the same inputs always give the same order.
function compareRanked(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  const due = compareNullableAsc(a.item.dueAt, b.item.dueAt);
  if (due !== 0) return due;
  const occurred = compareNullableAsc(b.item.occurredAt, a.item.occurredAt);
  if (occurred !== 0) return occurred;
  return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
}

/**
 * context: { userId, cropIds, now?, weather?: { risk: 0..1 } }
 * Returns ranked results, highest priority first.
 */
export function rankItems(items, context = {}, config = PRIORITY_CONFIG, factors = PRIORITY_FACTORS) {
  const ctx = {
    ...context,
    now: typeof context.now === 'number' ? context.now : Date.now(),
    cropIds: Array.isArray(context.cropIds) ? context.cropIds : [],
  };
  return (items || []).map(item => scoreItem(item, ctx, config, factors)).sort(compareRanked);
}
