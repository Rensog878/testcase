/**
 * Shared request helpers: who is calling, what they may do, how often they may
 * do it, and error responses that never leak internal details to the client.
 */

import { db } from './db.js';
import { verifyToken, passwordFingerprint, safeEqual } from './security.js';

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// Expected failures carry a message that is safe to show; anything else is
// logged on the server and replaced with a generic message.
export function sendError(res, err, label = 'Request') {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, message: err.message, ...err.extra });
  }
  console.error(`❌ ${label} error:`, err?.message || err);
  if (err?.message === 'MONGODB_URI environment variable is not set. Configure it (e.g. a MongoDB Atlas connection string) before the API can serve requests.') {
    return res.status(503).json({
      success: false,
      message: 'Database is not configured. Set MONGODB_URI in server/.env and restart the API.'
    });
  }
  if (err?.name === 'MongoServerSelectionError' || err?.code === 'ECONNREFUSED' || /ECONNREFUSED|MongoServerSelectionError/.test(err?.message || '')) {
    return res.status(503).json({
      success: false,
      message: 'Database is unavailable. Start MongoDB or check MONGODB_URI in server/.env.'
    });
  }
  return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
}

// Turns the database layer's user validation errors into client-facing ones.
export function userInputError(err) {
  if (err?.code === 'PHONE_TAKEN' || err?.code === 11000) {
    return new HttpError(409, 'This mobile number is already registered. Please sign in instead.', { alreadyRegistered: true });
  }
  // field: which box the message belongs under, so a form can show it there.
  if (err?.code === 'WEAK_PASSWORD') return new HttpError(400, err.message, { field: 'password' });
  if (err?.code === 'INVALID_ROLE' || err?.code === 'INVALID_ADDRESS' || err?.code === 'INVALID_PROFILE' || err?.code === 'INVALID_STAFF_PROFILE') {
    return new HttpError(400, err.message);
  }
  return err;
}

export function toSafeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// The client writes the start of X-Forwarded-For itself, so only the entries
// our own proxies append can be trusted. Each proxy in front of Node adds one
// entry at the end; TRUSTED_PROXY_HOPS says how many there are (Hostinger's
// LiteSpeed = 1). The entry that many places from the end is the address the
// outermost proxy saw, which a client cannot fake.
export function clientIp(req) {
  const hops = Math.max(0, Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '1', 10) || 0);
  const chain = String(req.headers['x-forwarded-for'] || '')
    .split(',').map((part) => part.trim()).filter(Boolean);
  // Fewer entries than hops only happens when the proxies wrote all of them.
  const forwarded = hops > 0 ? chain[Math.max(0, chain.length - hops)] : '';
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

// ================= RATE LIMITING =================
// Fixed-window counters stored in MongoDB, so a limit holds across every
// serverless instance instead of per process.

function windowKey(name, windowMs) {
  return `rl:${name}:${Math.floor(Date.now() / windowMs)}`;
}

function secondsLeftInWindow(windowMs) {
  return Math.max(1, Math.ceil((windowMs - (Date.now() % windowMs)) / 1000));
}

// Counts one attempt. Returns 0 while within the limit, otherwise seconds to wait.
export async function rateLimit(name, limit, windowMs) {
  const count = await db.kvIncrement(windowKey(name, windowMs), 'count', windowMs);
  return count > limit ? secondsLeftInWindow(windowMs) : 0;
}

// Gives back a count taken by rateLimit for something that then did not happen
// — an OTP whose WhatsApp message never went out, say. Without this a provider
// outage spends every caller's allowance on messages nobody received, and they
// stay locked out for the rest of the window after the provider recovers.
// Never taken below zero, so a stray refund cannot buy extra attempts.
export async function refundRateLimit(name, windowMs) {
  const key = windowKey(name, windowMs);
  const record = await db.kvGet(key);
  if (!(Number(record?.count) > 0)) return;
  await db.kvIncrement(key, 'count', windowMs, { upsert: false, by: -1 });
}

// Like rateLimit, but only checks; nothing is counted.
export async function peekRateLimit(name, limit, windowMs) {
  const record = await db.kvGet(windowKey(name, windowMs));
  return Number(record?.count) >= limit ? secondsLeftInWindow(windowMs) : 0;
}

export async function clearRateLimit(name, windowMs) {
  await db.kvDelete(windowKey(name, windowMs));
}

export function tooManyRequests(res, retryAfter, message) {
  res.set('Retry-After', String(retryAfter));
  return res.status(429).json({ success: false, message, retryAfter });
}

// ================= AUTHENTICATION =================

function bearerToken(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

// Resolves the signed-in user (without password) or null. The result is cached
// on the request so a route and its middleware share one database lookup.
export async function getAuthenticatedUser(req) {
  if (req.authUser !== undefined) return req.authUser;

  let user = null;
  const claims = verifyToken(bearerToken(req));
  if (claims) {
    const record = await db.getUserById(claims.sub, { includePassword: true });
    const active = record && (!record.status || record.status === 'active');
    // The fingerprint no longer matches once the password has changed, and the
    // session id no longer matches once a later login (any device) replaced
    // it - one signed-in session per account.
    if (active && safeEqual(passwordFingerprint(record.password), claims.pv) && safeEqual(record.sessionId, claims.sid)) {
      user = toSafeUser(record);
    }
  }

  req.authUser = user;
  return user;
}

// Rejects the request unless it comes from a signed-in user holding one of
// `roles` (any signed-in user when no roles are given). Sets req.user.
export function requireAuth(...roles) {
  return async (req, res, next) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
      }
      if (roles.length) {
        const isAllowed = roles.includes(user.role) || user.role === 'superadmin';
        if (!isAllowed) {
          return res.status(403).json({ success: false, message: 'You do not have permission for this action.' });
        }
      }
      req.user = user;
      next();
    } catch (err) {
      sendError(res, err, 'Authentication');
    }
  };
}

// Module permissions a super admin sets per staff account
// (src/pages/superadmin/Permissions.jsx). No list, an empty list or '*' means
// every module, exactly as the admin and billing menus read it; super admins
// always pass.
export function hasModule(user, ...keys) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  const granted = user.permissions;
  if (!Array.isArray(granted) || granted.length === 0 || granted.includes('*')) return true;
  return keys.some((key) => granted.includes(key));
}

// After requireAuth: a user whose role is in `roles` must also hold one of
// `keys`. Other roles pass here; their access is decided by requireAuth.
// Without this the menus hid a module but its API stayed open.
export function requireModule(keys, { roles = ['admin'] } = {}) {
  const list = Array.isArray(keys) ? keys : [keys];
  return (req, res, next) => {
    const user = req.user;
    if (user && roles.includes(user.role) && !hasModule(user, ...list)) {
      return res.status(403).json({ success: false, message: 'This module has not been enabled for your account. Ask the super admin.' });
    }
    next();
  };
}
