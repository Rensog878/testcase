// Refer & Earn rules: a new farmer who signs up with a friend's code gets a
// discount on their first order, and the friend earns points once that order
// is delivered. Everything here is pure so the tests can check the rules
// without a database; server.js does the atomic claims through db.js.

import crypto from 'node:crypto';

export const REFERRAL_DEFAULTS = Object.freeze({
  enabled: true,
  welcomeDiscount: 50,     // ₹ off the new farmer's first order
  referrerPoints: 50,      // points (1 point = ₹1) for the referrer
  minOrder: 500,           // order total needed for the welcome discount and the reward
  redeemMinOrder: 300,     // order total needed to spend points
  redeemMaxPercent: 10,    // points may pay at most this share of an order
  pointsValidMonths: 12,   // a balance expires this long after the last points earned
  pendingDays: 60,         // a referral whose friend never orders expires
  monthlyCap: 10,          // rewarded referrals per referrer per calendar month
});

const LIMITS = {
  welcomeDiscount: [0, 1000],
  referrerPoints: [0, 1000],
  minOrder: [0, 100000],
  redeemMinOrder: [0, 100000],
  redeemMaxPercent: [0, 50],
  pointsValidMonths: [1, 60],
  pendingDays: [1, 365],
  monthlyCap: [0, 1000],
};

// Merges an admin's changes over the current settings. Every value must be a
// whole number inside its range; anything unknown is ignored.
export function cleanReferralSettings(input, current = REFERRAL_DEFAULTS) {
  const settings = { ...REFERRAL_DEFAULTS, ...current };
  const source = input && typeof input === 'object' ? input : {};
  if (source.enabled !== undefined) {
    if (typeof source.enabled !== 'boolean') return { error: 'enabled must be true or false.' };
    settings.enabled = source.enabled;
  }
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (source[key] === undefined) continue;
    const value = Number(source[key]);
    if (!Number.isInteger(value) || value < min || value > max) {
      return { error: `${key} must be a whole number from ${min} to ${max}.` };
    }
    settings[key] = value;
  }
  return { settings };
}

// No 0/O or 1/I/L, so a code read out over the phone is typed correctly.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^SAM[A-HJKMNP-Z2-9]{6}$/;

export function makeReferralCode(randomInt = crypto.randomInt) {
  let code = 'SAM';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  return code;
}

// Returns the code in canonical form, or '' when it cannot be a valid code.
export function normalizeReferralCode(raw) {
  const code = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return CODE_PATTERN.test(code) ? code : '';
}

// The balance a farmer can use now: points lapse together once
// pointsExpireAt has passed.
export function pointsBalance(user, now = Date.now()) {
  const points = Math.max(0, Math.floor(Number(user?.points) || 0));
  const expiresAt = user?.pointsExpireAt ? Date.parse(user.pointsExpireAt) : NaN;
  return Number.isFinite(expiresAt) && expiresAt <= now ? 0 : points;
}

export function pointsExpiry(settings, now = Date.now()) {
  const date = new Date(now);
  date.setMonth(date.getMonth() + settings.pointsValidMonths);
  return date.toISOString();
}

// What an order's payable total becomes. `total` is the server-priced cart
// (subtotal + GST); `welcome` says whether the farmer still holds an unused
// welcome offer. Points never take the total below ₹1.
export function priceRewards({ total, welcome = false, balance = 0, usePoints = false, settings = REFERRAL_DEFAULTS }) {
  const itemsTotal = Math.max(0, Number(total) || 0);
  const result = { itemsTotal, welcomeDiscount: 0, pointsUsed: 0, discount: 0, payable: itemsTotal, welcomeEligible: false, pointsAllowed: 0 };
  if (!settings.enabled) return result;

  if (welcome && itemsTotal >= settings.minOrder && settings.welcomeDiscount > 0) {
    result.welcomeEligible = true;
    result.welcomeDiscount = Math.min(settings.welcomeDiscount, Math.max(0, Math.floor(itemsTotal) - 1));
  }
  if (itemsTotal >= settings.redeemMinOrder) {
    const cap = Math.floor(itemsTotal * settings.redeemMaxPercent / 100);
    const room = Math.max(0, Math.floor(itemsTotal - result.welcomeDiscount) - 1);
    result.pointsAllowed = Math.max(0, Math.min(Math.floor(balance), cap, room));
    if (usePoints) result.pointsUsed = result.pointsAllowed;
  }
  result.discount = result.welcomeDiscount + result.pointsUsed;
  result.payable = Math.round((itemsTotal - result.discount) * 100) / 100;
  return result;
}

const addressKey = (a) => [a?.doorNo, a?.street, a?.pincode]
  .map((part) => String(part || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
  .join('|');

// Two delivery addresses that are the same house (door, street, pincode),
// ignoring spacing and punctuation. Used to stop a farmer referring themselves
// under a second number.
export function sameAddress(a, b) {
  const left = addressKey(a);
  const right = addressKey(b);
  return !!a?.pincode && !!a?.doorNo && left === right;
}

// "Venkatesh Rao" -> "Venkatesh R." - the referrer sees who joined without
// the full name of someone else's account.
export function maskName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Farmer';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function monthStart(now = Date.now()) {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

// One id per phone number, without the number in it.
export function referralIdFor(phone) {
  return `REF-${crypto.createHash('sha256').update(`referral:${phone}`).digest('hex').slice(0, 16).toUpperCase()}`;
}
