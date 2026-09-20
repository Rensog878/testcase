/**
 * Sathyam Agro Mart - password hashing and signed session tokens.
 * Uses only node:crypto, so there is no extra dependency to install or audit.
 */

import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

const SCRYPT_KEYLEN = 64;
const SCRYPT_PREFIX = 'scrypt';
const TOKEN_PREFIX = 'sb1';
export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ================= PASSWORDS =================

export function isPasswordHash(value) {
  return typeof value === 'string' && value.startsWith(`${SCRYPT_PREFIX}$`);
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(String(password), salt, SCRYPT_KEYLEN);
  return `${SCRYPT_PREFIX}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

// Returns { ok, needsRehash }. Accounts created before hashing was introduced
// still hold a plaintext password; it is accepted and the caller upgrades it.
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string' || !stored) {
    return { ok: false, needsRehash: false };
  }

  if (!isPasswordHash(stored)) {
    const ok = safeEqual(password, stored);
    return { ok, needsRehash: ok };
  }

  const [, saltB64, hashB64] = stored.split('$');
  const expected = Buffer.from(hashB64 || '', 'base64');
  if (!saltB64 || expected.length !== SCRYPT_KEYLEN) return { ok: false, needsRehash: false };

  const derived = await scrypt(password, Buffer.from(saltB64, 'base64'), SCRYPT_KEYLEN);
  return { ok: crypto.timingSafeEqual(derived, expected), needsRehash: false };
}

// Constant-time comparison for strings of any length.
export function safeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

// ================= PASSWORD RULES =================
// Mirrored in src/utils/passwordRules.js and public/js/app.js, which show the
// same checklist while people type. Keep all three in step.

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd', 'admin123', 'admin1234', 'welcome1',
  'welcome123', 'qwerty123', 'qwertyuiop', 'asdfghjkl', 'iloveyou', 'abc12345', 'abcd1234', 'india123',
  'farmer123', 'sathyabio', 'sathya123', '12345678', '123456789', '1234567890', '11111111', '00000000',
  '87654321', 'test1234', 'letmein1',
]);

// Farmers get rules they can manage on a phone keyboard; staff accounts can
// reach customer data, so they need longer passwords with a symbol.
export function passwordRules(role = 'farmer') {
  const staff = role !== 'farmer';
  const minLength = staff ? 10 : 8;
  return [
    { label: `At least ${minLength} characters`, test: (pw) => pw.length >= minLength },
    { label: 'At least one letter (a-z)', test: (pw) => /[A-Za-z]/.test(pw) },
    { label: 'At least one number (0-9)', test: (pw) => /\d/.test(pw) },
    ...(staff ? [{ label: 'At least one symbol, like @ # $ !', test: (pw) => /[^A-Za-z0-9\s]/.test(pw) }] : []),
    {
      label: 'Not a common password or your mobile number',
      test: (pw, phone) => !COMMON_PASSWORDS.has(pw.toLowerCase()) && !(phone && pw.includes(phone)),
    },
  ];
}

// The rules a password fails, as labels; empty when it is acceptable.
export function passwordProblems(password, { role = 'farmer', phone = '' } = {}) {
  const pw = typeof password === 'string' ? password : '';
  if (pw.length > 128) return ['At most 128 characters'];
  return passwordRules(role)
    .filter((rule) => !rule.test(pw, String(phone || '')))
    .map((rule) => rule.label);
}

export function weakPasswordMessage(problems) {
  return `Password needs: ${problems.join('; ')}.`;
}

// ================= SESSION TOKENS =================
// Format: sb1.<base64url JSON claims>.<base64url HMAC-SHA256>
// The role is deliberately NOT in the token: it is read from the database on
// every request, so a demoted or disabled account loses access immediately.

function tokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET || process.env.OTP_HASH_SECRET;
  if (!secret) {
    throw new Error('AUTH_TOKEN_SECRET is missing in .env');
  }
  return secret;
}

function sign(data) {
  return crypto.createHmac('sha256', tokenSecret()).update(data).digest('base64url');
}

// A short fingerprint of the stored password hash. Tokens carry it, so changing
// a password signs out every session issued before the change.
export function passwordFingerprint(storedPassword) {
  return sign(`pw:${storedPassword || ''}`).slice(0, 16);
}

export function signToken(userId, storedPassword) {
  const now = Date.now();
  const claims = { sub: userId, pv: passwordFingerprint(storedPassword), iat: now, exp: now + TOKEN_TTL_MS };
  const body = `${TOKEN_PREFIX}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
  return `${body}.${sign(body)}`;
}

// Returns the claims of a valid, unexpired token, otherwise null.
export function verifyToken(token) {
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;

  const body = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(sign(body), parts[2])) return null;

  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (typeof claims.sub !== 'string' || !(claims.exp > Date.now())) return null;
    return claims;
  } catch {
    return null;
  }
}
