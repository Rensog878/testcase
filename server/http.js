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
  if (err?.code === 'WEAK_PASSWORD' || err?.code === 'INVALID_ROLE' || err?.code === 'INVALID_ADDRESS' || err?.code === 'INVALID_PROFILE') {
    return new HttpError(400, err.message);
  }
  return err;
}

export function toSafeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

export function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
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
    // The fingerprint no longer matches once the password has changed.
    if (active && safeEqual(passwordFingerprint(record.password), claims.pv)) {
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
