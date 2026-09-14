/**
 * WhatsApp messages through WaSenderAPI: text, or an image with a caption.
 * Used for OTPs and order updates.
 *
 * Messages are spread over a pool of WaSender sessions (one API key per
 * WhatsApp number), so no single number carries all the traffic:
 *
 *   - Spreading: a new customer is given a random available number.
 *   - Sticky numbers: after that, the customer keeps hearing from the same
 *     number (OTP, order confirmation, delivery updates). A different unknown
 *     number every time draws far more "Report spam" taps, the fastest way to
 *     get a number banned.
 *   - Pacing: each number sends at most one message per WASENDER_MIN_GAP_MS
 *     plus random jitter, coordinated in MongoDB so parallel serverless
 *     instances cannot burst. The default matches WaSender's Account
 *     Protection limit (1 message / 5 seconds).
 *   - Circuit breaker: a number that is rate limited, logged out or refused is
 *     rested, and the message moves to another number. Only when the API
 *     refused it, so a customer never gets the same message twice.
 *   - Optional daily cap per number, for warming up new numbers.
 *   - Numbers that are not on WhatsApp are detected (and remembered) instead of
 *     messaged. Sending to them is wasted traffic and a spam signal.
 *
 * Keys (at least one required):
 *   WASENDER_API_KEY              Number 1
 *   WASENDER_API_KEY_2 … _10      More numbers. Blank slots are skipped.
 *
 * Optional:
 *   WASENDER_API_URL              Defaults to https://wasenderapi.com/api/send-message
 *   WHATSAPP_SEND_TIMEOUT_MS      Give up on a single send after this long (default 5000)
 *   WASENDER_MIN_GAP_MS           Minimum gap between two messages from one number (default 5000)
 *   WASENDER_GAP_JITTER_MS        Extra random gap on top, 0..this (default 2000)
 *   WASENDER_MAX_QUEUE_WAIT_MS    Longest a message waits for a free number (default 8000)
 *   WASENDER_DAILY_LIMIT_PER_KEY  Messages per number per day, IST (default 0 = no cap)
 *   WASENDER_STICKY_DAYS          Keep a customer on one number this long (default 30, 0 = always random)
 *   WASENDER_CHECK_NUMBERS=off    Skip the "is this number on WhatsApp" check
 */

import crypto from 'node:crypto';
import { db } from './db.js';

const DEFAULT_API_URL = 'https://wasenderapi.com/api/send-message';
const MAX_KEY_SLOTS = 10;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
// How long a message will wait for the customer's usual number before taking another.
const STICKY_WAIT_MS = 2500;

// WaSender reports a disconnected or logged-out session in the message text.
const SESSION_DOWN = /not connected|disconnected|logged.?out|need.?scan|session.{0,20}(inactive|expired|not found)|no active session/i;

export class WhatsAppSendError extends Error {
  constructor(message, { code = 'SEND_FAILED', status = 0 } = {}) {
    super(message);
    this.name = 'WhatsAppSendError';
    // NOT_CONFIGURED | NOT_ON_WHATSAPP | BUSY | NO_SENDER | TIMEOUT | NETWORK
    // | RATE_LIMITED | KEY_REJECTED | SESSION_DOWN | PROVIDER_ERROR | REJECTED
    this.code = code;
    this.status = status;
  }
}

function numberSetting(name, fallback) {
  const raw = process.env[name];
  const value = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

// Read on every call, so a key added to the environment joins the pool on the next deploy.
function senders() {
  const seen = new Set();
  const pool = [];
  for (let slot = 1; slot <= MAX_KEY_SLOTS; slot++) {
    const key = String(process.env[slot === 1 ? 'WASENDER_API_KEY' : `WASENDER_API_KEY_${slot}`] || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    pool.push({
      key,
      label: `sender ${slot}`,
      // State is stored under a hash of the key, never the key itself.
      id: crypto.createHash('sha256').update(key).digest('hex').slice(0, 12),
    });
  }
  return pool;
}

export function whatsAppConfigured() {
  return senders().length > 0;
}

const istDate = () => new Date(Date.now() + 5.5 * HOUR_MS).toISOString().slice(0, 10);
const slotKey = (sender) => `wa-slot:${sender.id}`;
const pauseKey = (sender) => `wa-pause:${sender.id}`;
const dailyKey = (sender) => `wa-daily:${sender.id}:${istDate()}`;
const routeKey = (phone) => `wa-route:${phone}`;
const onWhatsAppKey = (phone) => `wa-exists:${phone}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Coordination lives in MongoDB. If it is unreachable, messages still go out,
// just without cross-instance pacing, rather than failing a sign-up or checkout.
async function coordinated(task, fallback) {
  try {
    return await task();
  } catch (err) {
    console.warn('⚠️ WhatsApp sender coordination unavailable:', err.message);
    return fallback;
  }
}

async function callApi(sender, { path, body, timeoutMs }) {
  const base = process.env.WASENDER_API_URL || DEFAULT_API_URL;
  try {
    const response = await fetch(path ? new URL(path, base) : base, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${sender.key}`,
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
      // A slow provider must never hold up a checkout or sign-up response.
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } catch (err) {
    // A timed-out send may still have been delivered, so it is never retried on another number.
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw new WhatsAppSendError(
      timedOut
        ? `WaSenderAPI did not answer within ${timeoutMs}ms (${sender.label})`
        : `WaSenderAPI unreachable (${sender.label}): ${err?.cause?.code || err?.message}`,
      { code: timedOut ? 'TIMEOUT' : 'NETWORK' }
    );
  }
}

// Decides what a refusal means for the number that sent it. `retryable` is only
// set when the API refused before sending, so another number may safely try.
function classifyFailure(response, data) {
  const status = response.status;
  const message = String(data?.message || data?.error || 'WaSenderAPI rejected the request').slice(0, 200);
  const retryAfterSec = Number(data?.retry_after)
    || Number(response.headers.get('retry-after'))
    || Number(response.headers.get('x-ratelimit-reset'))
    || 0;

  if (status === 429) {
    return { code: 'RATE_LIMITED', message, pauseMs: Math.max(retryAfterSec * 1000, 10 * 1000), retryable: true };
  }
  if (status === 401 || status === 403) {
    // Wrong key, or no active subscription on that session.
    return { code: 'KEY_REJECTED', message, pauseMs: 15 * MINUTE_MS, retryable: true };
  }
  if (SESSION_DOWN.test(message)) {
    return { code: 'SESSION_DOWN', message, pauseMs: 5 * MINUTE_MS, retryable: true };
  }
  if (status >= 500) {
    // Provider-wide trouble: another number would hit it too, and delivery is uncertain.
    return { code: 'PROVIDER_ERROR', message, pauseMs: 0, retryable: false };
  }
  // e.g. 422: the message itself was refused, which no other number would change.
  return { code: 'REJECTED', message, pauseMs: 0, retryable: false };
}

async function pauseSender(sender, ms, reason) {
  console.warn(`⏸️ WhatsApp ${sender.label} rested for ${Math.round(ms / 1000)}s: ${reason}`);
  await coordinated(() => db.kvSet(pauseKey(sender), { until: Date.now() + ms, reason }, ms), null);
}

// The senders allowed to send right now, best first: the customer's usual
// number, then the rest in random order.
function rankSenders(pool, state, phone, exclude) {
  const dailyLimit = numberSetting('WASENDER_DAILY_LIMIT_PER_KEY', 0);
  const usable = pool.filter((sender) => !exclude.has(sender.id)
    && !state.get(pauseKey(sender))
    && !(dailyLimit && Number(state.get(dailyKey(sender))?.count) >= dailyLimit));

  const stickyId = numberSetting('WASENDER_STICKY_DAYS', 30) ? state.get(routeKey(phone))?.senderId : null;
  const sticky = usable.find((sender) => sender.id === stickyId) || null;
  return { ranked: sticky ? [sticky, ...shuffle(usable.filter((s) => s !== sticky))] : shuffle(usable), sticky };
}

async function claimSlot(sender) {
  const gapMs = numberSetting('WASENDER_MIN_GAP_MS', 5000);
  const jitterMs = numberSetting('WASENDER_GAP_JITTER_MS', 2000);
  if (!gapMs && !jitterMs) return 0;
  const gap = gapMs + (jitterMs ? crypto.randomInt(0, jitterMs + 1) : 0);
  return coordinated(() => db.kvClaimSlot(slotKey(sender), gap), 0);
}

// Takes the next turn on the best free number, waiting for one to free up
// until `deadline`. Returns null if none frees up in time.
async function claimSender(ranked, sticky, deadline) {
  for (let round = 0; ; round++) {
    let soonest = Infinity;
    for (const sender of ranked) {
      let waitMs = await claimSlot(sender);
      if (!waitMs) return sender;

      // A short wait is worth it to keep the customer on the number they know.
      if (sender === sticky && round === 0 && waitMs <= STICKY_WAIT_MS && Date.now() + waitMs <= deadline) {
        await sleep(waitMs + crypto.randomInt(50, 300));
        waitMs = await claimSlot(sender);
        if (!waitMs) return sender;
      }
      soonest = Math.min(soonest, waitMs);
    }
    if (Date.now() + soonest > deadline) return null;
    // A random offset, so instances that are waiting don't all retry on the same tick.
    await sleep(soonest + crypto.randomInt(50, 400));
  }
}

// true / false, or null when it could not be checked (the message then goes ahead).
async function isOnWhatsApp(sender, phone) {
  if (String(process.env.WASENDER_CHECK_NUMBERS || '').toLowerCase() === 'off') return null;

  const cached = await coordinated(() => db.kvGet(onWhatsAppKey(phone)), null);
  if (cached) return cached.exists;

  try {
    const { response, data } = await callApi(sender, { path: `/api/on-whatsapp/%2B91${phone}`, timeoutMs: 2500 });
    const exists = data?.data?.exists;
    if (!response.ok || typeof exists !== 'boolean') return null;
    // A "no" is remembered only briefly: the customer may install WhatsApp and try again.
    await coordinated(() => db.kvSet(onWhatsAppKey(phone), { exists }, exists ? 30 * DAY_MS : 6 * HOUR_MS), null);
    return exists;
  } catch {
    return null;
  }
}

async function recordSuccess(sender, phone, ranked) {
  await coordinated(async () => {
    const stickyDays = numberSetting('WASENDER_STICKY_DAYS', 30);
    const current = stickyDays ? (await db.kvGet(routeKey(phone)))?.senderId : null;
    // If the usual number was only busy, the customer stays with it; if it is
    // resting, gone or failed just now, this number becomes their usual one.
    const keepCurrent = current && current !== sender.id && ranked.some((s) => s.id === current);

    await Promise.all([
      db.kvIncrement(dailyKey(sender), 'count', 2 * DAY_MS),
      stickyDays && !keepCurrent ? db.kvSet(routeKey(phone), { senderId: sender.id }, stickyDays * DAY_MS) : null,
    ]);
  }, null);
}

// `phone` is a 10-digit Indian mobile number. Resolves with WaSender's response
// plus `sender` (e.g. "sender 2"); throws WhatsAppSendError.
export async function sendWhatsAppText(phone, text) {
  return sendMessage(phone, { text });
}

// An image with `caption` under it. `imageUrl` must be a public HTTPS JPEG or
// PNG. With no `imageUrl`, or when WaSender refuses the image before sending
// it (a 4xx such as a bad URL), the caption goes out as a text message instead.
// Never after a timeout or a server error: the image may already have been
// delivered, and the customer would get the message twice.
// Resolves like sendWhatsAppText, plus `image`: whether the image was sent.
export async function sendWhatsAppImage(phone, { imageUrl, caption }) {
  if (imageUrl) {
    try {
      return { ...(await sendMessage(phone, { text: caption, imageUrl })), image: true };
    } catch (err) {
      const refusedBeforeSending = err.code === 'REJECTED' && err.status >= 400 && err.status < 500;
      if (!refusedBeforeSending) throw err;
      console.warn(`🖼️ WhatsApp image refused, sending the text alone: ${err.message}`);
    }
  }
  return { ...(await sendMessage(phone, { text: caption })), image: false };
}

// `content` is { text } or { text, imageUrl }.
async function sendMessage(phone, content) {
  const pool = senders();
  if (!pool.length) {
    throw new WhatsAppSendError('WaSenderAPI key is missing. Add WASENDER_API_KEY to .env', { code: 'NOT_CONFIGURED' });
  }

  const timeoutMs = numberSetting('WHATSAPP_SEND_TIMEOUT_MS', 5000) || 5000;
  const deadline = Date.now() + numberSetting('WASENDER_MAX_QUEUE_WAIT_MS', 8000);
  const tried = new Set();
  let numberChecked = false;
  let lastError = null;

  while (tried.size < pool.length) {
    const stateKeys = [routeKey(phone), ...pool.flatMap((s) => [pauseKey(s), dailyKey(s)])];
    const state = await coordinated(() => db.kvGetMany(stateKeys), new Map());
    const { ranked, sticky } = rankSenders(pool, state, phone, tried);
    if (!ranked.length) break;

    if (!numberChecked) {
      numberChecked = true;
      if ((await isOnWhatsApp(ranked[0], phone)) === false) {
        throw new WhatsAppSendError(`+91 ${phone} is not registered on WhatsApp`, { code: 'NOT_ON_WHATSAPP' });
      }
    }

    const sender = await claimSender(ranked, sticky, deadline);
    if (!sender) {
      lastError = new WhatsAppSendError('Every WhatsApp number is busy right now. Please try again shortly.', { code: 'BUSY' });
      break;
    }
    tried.add(sender.id);

    const { response, data } = await callApi(sender, { body: { to: `91${phone}`, ...content }, timeoutMs });

    if (response.ok && data?.success !== false) {
      await recordSuccess(sender, phone, ranked);
      return { ...data, sender: sender.label };
    }

    const failure = classifyFailure(response, data);
    if (failure.pauseMs) await pauseSender(sender, failure.pauseMs, `${failure.code}: ${failure.message}`);
    lastError = new WhatsAppSendError(
      `WaSenderAPI request failed via ${sender.label} (${response.status}): ${failure.message}`,
      { code: failure.code, status: response.status }
    );
    if (!failure.retryable) break;
    console.warn(`↪️ ${lastError.message}. Trying another number.`);
  }

  throw lastError || new WhatsAppSendError(
    'No WhatsApp number is available right now (all resting or at their daily limit).',
    { code: 'NO_SENDER' }
  );
}

// Health of every number in the pool, for the admin dashboard. Keys are masked.
export async function getWhatsAppSenderStatus() {
  const pool = senders();
  const dailyLimit = numberSetting('WASENDER_DAILY_LIMIT_PER_KEY', 0);
  const state = await coordinated(() => db.kvGetMany(pool.flatMap((s) => [pauseKey(s), dailyKey(s)])), new Map());

  return Promise.all(pool.map(async (sender) => {
    let session;
    try {
      const { response, data } = await callApi(sender, { path: '/api/status', timeoutMs: 4000 });
      session = response.ok ? String(data?.status || data?.data?.status || 'unknown') : `error ${response.status}`;
    } catch (err) {
      session = err.code === 'TIMEOUT' ? 'no response' : 'unreachable';
    }

    const pause = state.get(pauseKey(sender));
    return {
      sender: sender.label,
      keyHint: `…${sender.key.slice(-4)}`,
      session,
      resting: pause ? { until: new Date(pause.until).toISOString(), reason: pause.reason } : null,
      sentToday: Number(state.get(dailyKey(sender))?.count) || 0,
      dailyLimit: dailyLimit || null,
    };
  }));
}
