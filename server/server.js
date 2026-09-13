/**
 * Sathya Bio - Express API Server with Persistent MongoDB-backed DB
 * Integrated E-Commerce, User Management, Admin Products Master,
 * ERP & Multi-Role Engine
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { db, connectDB, newId } from './db.js';
import adminRoutes from './adminRoutes.js';
import { buildOtpMessage, buildResetOtpMessage, buildPasswordChangedMessage, forgetOtpLayout } from './otpTemplates.js';
import { sendWhatsAppText } from './whatsapp.js';
import { sendOrderConfirmation, sendDeliveryStatusUpdate } from './orderNotifications.js';
import { estimatedDeliveryDate } from './orderMessages.js';
import { hashPassword, verifyPassword, signToken, safeEqual, passwordProblems, weakPasswordMessage } from './security.js';
import {
  HttpError,
  sendError,
  userInputError,
  toSafeUser,
  clientIp,
  rateLimit,
  peekRateLimit,
  clearRateLimit,
  tooManyRequests,
  getAuthenticatedUser,
  requireAuth,
} from './http.js';

const app = express();
const PORT = process.env.PORT || 5000;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

app.disable('x-powered-by');
app.use(cors());
// The raw bytes are kept for the Razorpay webhook, whose signature covers the
// exact body sent. 4mb leaves room for product photos uploaded as data URLs.
app.use(express.json({ limit: '4mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

app.use('/api/admin', requireAuth('admin'), adminRoutes);

// Older alias of /api/admin/users, with the same admin-only rules.
app.use('/api/users', requireAuth('admin'), (req, res, next) => {
  req.url = `/users${req.url === '/' || req.url.startsWith('/?') ? req.url.slice(1) : req.url}`;
  adminRoutes(req, res, next);
});

// ============================================================
// INPUT HELPERS
// ============================================================

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

// ============================================================
// WHATSAPP OTP SYSTEM
// ============================================================

const OTP_EXPIRY_MS = 5 * 60 * 1000;
// The resend wait is randomised per request rather than a fixed 30s. A constant
// interval is a mechanical, bot-like pattern; varying it per user also spreads
// out retry traffic instead of bunching it on the same beat.
const OTP_RESEND_MIN_MS = 30 * 1000;
const OTP_RESEND_MAX_MS = 90 * 1000;

function nextResendCooldownMs() {
  return crypto.randomInt(OTP_RESEND_MIN_MS, OTP_RESEND_MAX_MS + 1);
}

// ============================================================
// TEST NUMBERS
// ============================================================
// Numbers listed in TEST_PHONE_NUMBERS may re-register as often as needed, so
// the sign-up flow can be exercised end to end. Re-registering REPLACES the
// previous account rather than adding a duplicate, which is what caused
// unreachable logins before.
//
// Leave TEST_PHONE_NUMBERS empty in production.

function getTestPhones() {
  return String(process.env.TEST_PHONE_NUMBERS || '')
    .split(',')
    .map((p) => normalizePhone(p.trim()))
    .filter(Boolean);
}

function isTestPhone(phone) {
  return getTestPhones().includes(phone);
}
const OTP_MAX_ATTEMPTS = 5;
const VERIFIED_PHONE_TTL_MS = 10 * 60 * 1000;

// ============================================================
// OTP STORAGE
// ============================================================
// Pending codes and verified numbers live in MongoDB (see db.kv*), not process
// memory: on Vercel the send and verify requests can land on different
// instances. MongoDB expires the records on its own.

const OTP_RECORD_TTL_MS = OTP_EXPIRY_MS + OTP_RESEND_MAX_MS;
const otpKey = (phone) => `otp:${phone}`;
const verifiedKey = (phone) => `otp-verified:${phone}`;

// ============================================================
// NORMALIZE INDIAN PHONE NUMBER
// ============================================================

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');

  // 10 digit number, e.g. 9876543210
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  // 12 digit number, e.g. 919876543210
  if (digits.length === 12 && digits.startsWith('91') && /^91[6-9]\d{9}$/.test(digits)) {
    return digits.slice(2);
  }

  return null;
}

// ============================================================
// GENERATE OTP
// ============================================================

function generateOtp() {
  // Cryptographically secure six-digit OTP.
  return crypto.randomInt(100000, 1000000).toString();
}

// ============================================================
// HASH OTP
// ============================================================

function hashOtp(otp) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) {
    throw new Error('OTP_HASH_SECRET is missing in .env');
  }
  return crypto.createHash('sha256').update(`${otp}:${secret}`).digest('hex');
}

// ============================================================
// SEND OTP THROUGH WASENDER API
// ============================================================

// OTP message text lives in ./otpTemplates.js — it assembles each message
// from interchangeable parts so no two sends look alike.

async function sendWhatsAppOtp(phone, otp, userName = 'Farmer') {
  return sendWhatsAppText(phone, buildOtpMessage(otp, userName, phone, OTP_EXPIRY_MS));
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({ status: 'ok', time: new Date().toISOString() });
  } catch (err) {
    console.error('❌ Health check error:', err.message);
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// ============================================================
// AUTH
// ============================================================

const LOGIN_WINDOW_MS = 15 * MINUTE_MS;
const LOGIN_FAILURE_LIMIT = 5; // wrong passwords per account per window
const LOGIN_ATTEMPT_LIMIT = 30; // sign-in attempts per client IP per window

async function issueToken(userId) {
  const record = await db.getUserById(userId, { includePassword: true });
  return signToken(userId, record?.password);
}

// Checking a password takes a noticeable moment; doing the same work for
// unknown accounts stops response times revealing which numbers are registered.
let dummyPasswordHash;
async function spendPasswordCheck(password) {
  dummyPasswordHash ||= await hashPassword(crypto.randomUUID());
  await verifyPassword(password, dummyPasswordHash);
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};

    // Both must be plain strings. A JSON object here (e.g. {"$ne":null}) is an
    // injection attempt, and would otherwise throw on identifier.trim().
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
      return res.status(401).json({ success: false, message: 'Invalid mobile number/email or password.' });
    }

    const accountKey = identifier.trim().toLowerCase();

    const ipWait = await rateLimit(`login-ip:${clientIp(req)}`, LOGIN_ATTEMPT_LIMIT, LOGIN_WINDOW_MS);
    if (ipWait) {
      return tooManyRequests(res, ipWait, 'Too many sign-in attempts. Please try again later.');
    }

    const lockWait = await peekRateLimit(`login-fail:${accountKey}`, LOGIN_FAILURE_LIMIT, LOGIN_WINDOW_MS);
    if (lockWait) {
      const minutes = Math.ceil(lockWait / 60);
      return tooManyRequests(res, lockWait, `Too many failed sign-in attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
    }

    const user = await db.getUserByIdentifier(identifier, { includePassword: true });
    let check = { ok: false, needsRehash: false };
    if (user) check = await verifyPassword(password, user.password);
    else await spendPasswordCheck(password);

    if (!check.ok) {
      await rateLimit(`login-fail:${accountKey}`, LOGIN_FAILURE_LIMIT, LOGIN_WINDOW_MS);
      return res.status(401).json({ success: false, message: 'Invalid mobile number/email or password.' });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'This account has been disabled. Please contact support.' });
    }

    await clearRateLimit(`login-fail:${accountKey}`, LOGIN_WINDOW_MS);

    const updates = { lastLogin: new Date().toISOString() };
    // Accounts from before password hashing are upgraded on their first sign-in.
    // The hash is stored directly so an older password that predates today's
    // rules still upgrades instead of being rejected.
    if (check.needsRehash) updates.password = await hashPassword(password);
    const updated = await db.updateUser(user.id, updates);
    const token = await issueToken(user.id);

    res.json({ success: true, user: toSafeUser(updated || user), token });
  } catch (err) {
    sendError(res, err, 'Login');
  }
});

// ============================================================
// SEND OTP - POST /api/auth/send-otp
// ============================================================

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Every OTP is a paid WhatsApp message: cap sends per client and per number.
    const ipWait = await rateLimit(`otp-ip:${clientIp(req)}`, 10, HOUR_MS);
    if (ipWait) {
      return tooManyRequests(res, ipWait, 'Too many OTP requests. Please try again later.');
    }
    if (!isTestPhone(phone)) {
      const phoneWait = await rateLimit(`otp-phone:${phone}`, 5, HOUR_MS);
      if (phoneWait) {
        return tooManyRequests(res, phoneWait, 'Too many OTP requests for this number. Please try again later.');
      }
    }

    // This endpoint exists to verify a number during sign-up, so refuse before
    // spending an OTP if the number already has an account. (Pass
    // purpose: 'login' if this is ever reused for signing in.)
    if (req.body?.purpose !== 'login' && !isTestPhone(phone)) {
      const alreadyRegistered = await db.getUserByIdentifier(phone);
      if (alreadyRegistered) {
        return res.status(409).json({
          success: false,
          message: 'This mobile number is already registered. Please sign in instead.',
          alreadyRegistered: true,
        });
      }
    }

    const now = Date.now();
    const existing = await db.kvGet(otpKey(phone));

    // Resend protection. The wait was decided when the previous code was sent,
    // so each user is held for a different length of time.
    const activeCooldownMs = existing?.resendAfterMs ?? OTP_RESEND_MIN_MS;

    if (existing && existing.lastSentAt && now - existing.lastSentAt < activeCooldownMs) {
      const waitSeconds = Math.ceil((activeCooldownMs - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
        retryAfter: waitSeconds,
      });
    }

    const otp = generateOtp();
    console.log(`📱 Sending OTP to +91 ${phone}`);

    await sendWhatsAppOtp(phone, otp, cleanText(req.body?.name, 60) || 'Farmer');

    // Pick this send's cooldown and tell the client, so its countdown matches
    // exactly what the server will enforce.
    const resendAfterMs = nextResendCooldownMs();

    await db.kvSet(otpKey(phone), {
      otpHash: hashOtp(otp),
      expiresAt: now + OTP_EXPIRY_MS,
      lastSentAt: now,
      resendAfterMs,
      attempts: 0,
    }, OTP_RECORD_TTL_MS);

    // New OTP invalidates previous phone verification.
    await db.kvDelete(verifiedKey(phone));

    console.log(`✅ OTP sent to +91 ${phone} (resend allowed in ${Math.round(resendAfterMs / 1000)}s)`);

    return res.json({
      success: true,
      message: 'OTP sent successfully to your WhatsApp number.',
      expiresIn: OTP_EXPIRY_MS / 1000,
      resendAfter: Math.ceil(resendAfterMs / 1000),
    });
  } catch (err) {
    console.error('❌ Send OTP error:', err.message);
    if (err.code === 'NOT_ON_WHATSAPP') {
      return res.status(400).json({
        success: false,
        notOnWhatsApp: true,
        message: 'This number is not on WhatsApp. Please enter the mobile number you use for WhatsApp.',
      });
    }
    if (err.code === 'BUSY' || err.code === 'NO_SENDER') {
      return tooManyRequests(res, 30, 'We are sending a lot of codes right now. Please try again in 30 seconds.');
    }
    return res.status(500).json({ success: false, message: 'Could not send the OTP right now. Please try again shortly.' });
  }
});

// ============================================================
// VERIFY OTP - POST /api/auth/verify-otp
// ============================================================

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const otp = String(req.body?.otp || '').replace(/\D/g, '');

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number.' });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Please enter the 6-digit OTP.' });
    }

    const record = await db.kvGet(otpKey(phone));

    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP expired or not requested. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      await db.kvDelete(otpKey(phone));
      forgetOtpLayout(phone);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    // Counted atomically, so parallel guesses cannot slip past the limit.
    const attempts = await db.kvIncrement(otpKey(phone), 'attempts', OTP_RECORD_TTL_MS, { upsert: false });

    if (attempts === 0) {
      return res.status(400).json({ success: false, message: 'OTP expired or not requested. Please request a new OTP.' });
    }

    if (attempts > OTP_MAX_ATTEMPTS) {
      await db.kvDelete(otpKey(phone));
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    if (!safeEqual(hashOtp(otp), record.otpHash)) {
      const remaining = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
      if (remaining === 0) {
        await db.kvDelete(otpKey(phone));
      }
      return res.status(400).json({
        success: false,
        message:
          remaining > 0
            ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Invalid OTP. Please request a new OTP.',
      });
    }

    // OTP is single-use.
    await db.kvDelete(otpKey(phone));
    forgetOtpLayout(phone);

    // Mark phone as verified. Registration must happen within VERIFIED_PHONE_TTL_MS.
    await db.kvSet(verifiedKey(phone), { verifiedUntil: Date.now() + VERIFIED_PHONE_TTL_MS }, VERIFIED_PHONE_TTL_MS);

    console.log(`✅ OTP verified for +91 ${phone}`);

    return res.json({ success: true, message: 'Mobile number verified successfully.', verified: true });
  } catch (err) {
    console.error('❌ Verify OTP error:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to verify OTP.' });
  }
});

// ============================================================
// FORGOT PASSWORD - WhatsApp code to the registered number
// ============================================================
// Reset codes live under their own key, so a sign-up code can never reset a
// password and a reset code can never verify a sign-up. Requesting a code
// answers the same way - same message, same resend wait - whether or not the
// number is registered, so the form cannot be used to find out which numbers
// have accounts. (Nothing is sent to an unregistered number.)

const resetOtpKey = (phone) => `reset-otp:${phone}`;
const RESET_REQUEST_MESSAGE = 'If this number is registered with Sathya Bio, a 6-digit reset code has been sent to its WhatsApp.';

app.post('/api/auth/forgot-password/send-otp', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const ipWait = await rateLimit(`reset-otp-ip:${clientIp(req)}`, 10, HOUR_MS);
    if (ipWait) {
      return tooManyRequests(res, ipWait, 'Too many reset requests. Please try again later.');
    }
    const phoneWait = await rateLimit(`reset-otp-phone:${phone}`, 5, HOUR_MS);
    if (phoneWait) {
      return tooManyRequests(res, phoneWait, 'Too many reset requests for this number. Please try again later.');
    }

    const now = Date.now();
    const existing = await db.kvGet(resetOtpKey(phone));
    const activeCooldownMs = existing?.resendAfterMs ?? OTP_RESEND_MIN_MS;
    if (existing && existing.lastSentAt && now - existing.lastSentAt < activeCooldownMs) {
      const waitSeconds = Math.ceil((activeCooldownMs - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another code.`,
        retryAfter: waitSeconds,
      });
    }

    const resendAfterMs = nextResendCooldownMs();
    const user = await db.getUserByIdentifier(phone);
    const canReset = Boolean(user) && (!user.status || user.status === 'active');

    let otpHash = null;
    if (canReset) {
      const otp = generateOtp();
      try {
        await sendWhatsAppText(phone, buildResetOtpMessage(otp, user.name, phone, OTP_EXPIRY_MS));
        otpHash = hashOtp(otp);
        console.log(`🔑 Password reset code sent to +91 ${phone}`);
      } catch (sendErr) {
        // Answered like an unknown number, so the form still reveals nothing.
        if (sendErr.code !== 'NOT_ON_WHATSAPP') throw sendErr;
        console.warn(`⚠️ Password reset for +91 ${phone} skipped: number is not on WhatsApp`);
      }
    }

    // An unknown number still gets a record (with no code), so the resend wait
    // and every later answer look exactly like a real account's.
    await db.kvSet(resetOtpKey(phone), {
      otpHash,
      expiresAt: now + OTP_EXPIRY_MS,
      lastSentAt: now,
      resendAfterMs,
      attempts: 0,
    }, OTP_RECORD_TTL_MS);

    return res.json({
      success: true,
      message: RESET_REQUEST_MESSAGE,
      expiresIn: OTP_EXPIRY_MS / 1000,
      resendAfter: Math.ceil(resendAfterMs / 1000),
    });
  } catch (err) {
    console.error('❌ Forgot password send error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not send the reset code right now. Please try again shortly.' });
  }
});

app.post('/api/auth/forgot-password/reset', async (req, res) => {
  try {
    const ipWait = await rateLimit(`reset-ip:${clientIp(req)}`, 30, HOUR_MS);
    if (ipWait) {
      return tooManyRequests(res, ipWait, 'Too many attempts. Please try again later.');
    }

    const phone = normalizePhone(req.body?.phone);
    const otp = String(req.body?.otp || '').replace(/\D/g, '');
    const password = req.body?.password;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Please enter the 6-digit code.' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, message: 'Please enter a new password.' });
    }

    const expired = { success: false, message: 'Code expired or not requested. Please request a new code.' };
    const record = await db.kvGet(resetOtpKey(phone));
    if (!record) {
      return res.status(400).json(expired);
    }
    if (Date.now() > record.expiresAt) {
      await db.kvDelete(resetOtpKey(phone));
      forgetOtpLayout(`reset:${phone}`);
      return res.status(400).json(expired);
    }

    // Counted atomically, so parallel guesses cannot slip past the limit.
    const attempts = await db.kvIncrement(resetOtpKey(phone), 'attempts', OTP_RECORD_TTL_MS, { upsert: false });
    if (attempts === 0) {
      return res.status(400).json(expired);
    }
    if (attempts > OTP_MAX_ATTEMPTS) {
      await db.kvDelete(resetOtpKey(phone));
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new code.' });
    }

    if (!record.otpHash || !safeEqual(hashOtp(otp), record.otpHash)) {
      const remaining = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
      if (remaining === 0) await db.kvDelete(resetOtpKey(phone));
      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Invalid code. Please request a new code.',
      });
    }

    const user = await db.getUserByIdentifier(phone, { includePassword: true });
    if (!user || (user.status && user.status !== 'active')) {
      await db.kvDelete(resetOtpKey(phone));
      return res.status(403).json({ success: false, message: 'This account cannot be reset online. Please contact support.' });
    }

    // Rules are checked only after a correct code (they differ for staff), and a
    // weak password leaves the code usable for another try within its attempts.
    const passwordIssues = passwordProblems(password, { role: user.role || 'farmer', phone });
    if (passwordIssues.length) {
      return res.status(400).json({ success: false, message: weakPasswordMessage(passwordIssues), passwordIssues });
    }
    if ((await verifyPassword(password, user.password)).ok) {
      return res.status(400).json({ success: false, message: 'Please choose a password different from your current one.' });
    }

    // Hashes the password. The new hash changes the token fingerprint, which
    // signs out every session issued before the reset.
    const updated = await db.updateUser(user.id, { password });
    await db.kvDelete(resetOtpKey(phone));
    forgetOtpLayout(`reset:${phone}`);

    // A successful reset lifts any wrong-password lockout.
    await clearRateLimit(`login-fail:${phone}`, LOGIN_WINDOW_MS);
    if (user.email) await clearRateLimit(`login-fail:${String(user.email).toLowerCase()}`, LOGIN_WINDOW_MS);

    try {
      await sendWhatsAppText(phone, buildPasswordChangedMessage(user.name, phone));
    } catch (notifyErr) {
      console.warn('⚠️ Password-changed notice not sent:', notifyErr.message);
    }

    console.log(`🔑 Password reset completed for +91 ${phone}`);
    const token = await issueToken(user.id);
    return res.json({ success: true, message: 'Your password has been reset. You are now signed in.', user: toSafeUser(updated || user), token });
  } catch (err) {
    sendError(res, userInputError(err), 'Password reset');
  }
});

// ============================================================
// REGISTER - OTP REQUIRED
// ============================================================

// Self-registration always creates a farmer account. Staff accounts can only
// be created by an admin, so no request body can choose its own role.
app.post('/api/auth/register', async (req, res) => {
  try {
    const ipWait = await rateLimit(`register-ip:${clientIp(req)}`, 20, HOUR_MS);
    if (ipWait) {
      return tooManyRequests(res, ipWait, 'Too many registration attempts. Please try again later.');
    }

    const phone = normalizePhone(req.body?.phone);
    const password = req.body?.password;
    const name = cleanText(req.body?.name, 80);
    const email = cleanText(req.body?.email, 120).toLowerCase();

    const passwordIssues = passwordProblems(password, { role: 'farmer', phone });
    if (passwordIssues.length) {
      return res.status(400).json({
        success: false,
        message: weakPasswordMessage(passwordIssues),
        passwordIssues,
      });
    }

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please enter your name.' });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (!phone) {
      return res.status(400).json({ success: false, message: 'A valid mobile number is required.' });
    }

    const verified = await db.kvGet(verifiedKey(phone));

    if (!verified || verified.verifiedUntil <= Date.now()) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your mobile number with OTP before creating your account.',
        requiresOtp: true,
      });
    }

    const existing = await db.getUserByIdentifier(phone);

    if (isTestPhone(phone)) {
      // Test number: clear every account on it (there may be historical
      // duplicates) so the sign-up flow can be re-run from a clean slate.
      const removed = await db.deleteUsersByPhone(phone);
      if (removed) console.log(`🧪 Test number +91 ${phone}: cleared ${removed} previous account(s)`);
    } else if (existing) {
      // One account per mobile number — otherwise login cannot tell duplicates apart.
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered. Please sign in instead.',
        alreadyRegistered: true,
      });
    }

    // Consume verification. Cannot be reused.
    await db.kvDelete(verifiedKey(phone));

    const user = await db.createUser({
      name,
      phone,
      email,
      password,
      crop: cleanText(req.body?.crop, 60),
      acreage: req.body?.acreage,
      village: cleanText(req.body?.village, 80),
      district: cleanText(req.body?.district, 80),
      state: cleanText(req.body?.state, 80),
      role: 'farmer',
      createdBy: 'self-registered',
    });
    const token = await issueToken(user.id);

    res.json({ success: true, user: toSafeUser(user), token });
  } catch (err) {
    sendError(res, userInputError(err), 'Registration');
  }
});

// ============================================================
// ME
// ============================================================

app.get('/api/auth/me', requireAuth(), (req, res) => {
  res.json({ success: true, data: req.user });
});

// ============================================================
// PROFILE FIELDS
// ============================================================

app.get('/api/profile-fields', async (req, res) => {
  try {
    const data = await db.getProfileFields();
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Profile fields');
  }
});

app.put('/api/profile-fields', requireAuth('admin'), async (req, res) => {
  try {
    const fields = await db.saveProfileFields((req.body && req.body.fields) || []);
    res.json({ success: true, data: fields });
  } catch (err) {
    sendError(res, err, 'Save profile fields');
  }
});

// ============================================================
// PROFILE
// ============================================================

app.get('/api/profile', requireAuth(), async (req, res) => {
  try {
    const fields = await db.getProfileFields();
    res.json({ success: true, data: { ...req.user, fields } });
  } catch (err) {
    sendError(res, err, 'Profile');
  }
});

app.put('/api/profile', requireAuth(), async (req, res) => {
  try {
    const updated = await db.updateUserProfile(req.user.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: toSafeUser(updated) });
  } catch (err) {
    sendError(res, err, 'Update profile');
  }
});

// ============================================================
// PRODUCTS CRUD
// ============================================================

function productInputError(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object') return 'Product details are required.';
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return 'Product name is required.';
  }
  for (const [field, label] of [['price', 'Price'], ['stock', 'Stock']]) {
    if (!partial || body[field] !== undefined) {
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value < 0) return `${label} must be a number of 0 or more.`;
    }
  }
  return null;
}

app.get('/api/products', async (req, res) => {
  try {
    const { userId, category, crop, disease, search, sortBy } = req.query;
    const data = await db.getProducts({ userId, category, crop, disease, search, sortBy });
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Products');
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    sendError(res, err, 'Product');
  }
});

app.post('/api/products', requireAuth('admin'), async (req, res) => {
  try {
    const problem = productInputError(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const { id, _id, ...details } = req.body;
    const product = await db.createProduct(details);
    res.json({ success: true, data: product });
  } catch (err) {
    sendError(res, err, 'Create product');
  }
});

app.put('/api/products/:id', requireAuth('admin'), async (req, res) => {
  try {
    const problem = productInputError(req.body, { partial: true });
    if (problem) return res.status(400).json({ success: false, message: problem });

    const { id, _id, ...updates } = req.body;
    const product = await db.updateProduct(req.params.id, updates);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    sendError(res, err, 'Update product');
  }
});

app.delete('/api/products/:id', requireAuth('admin'), async (req, res) => {
  try {
    const ok = await db.deleteProduct(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    sendError(res, err, 'Delete product');
  }
});

app.get('/api/catalog-options', async (req, res) => {
  try {
    const data = await db.getCatalogOptions();
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Catalog options');
  }
});

app.get('/api/user-product-summary', requireAuth('admin'), async (req, res) => {
  try {
    const data = await db.getUserProductSummary();
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'User product summary');
  }
});

// ============================================================
// CART (per authenticated user)
// ============================================================

// The cart always belongs to the caller's own account — the user id is taken
// from the token, never from the request body.
app.get('/api/cart', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please sign in to view your cart.' });
    }
    const items = await db.getCart(user.id);
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('❌ Get cart error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load your cart.' });
  }
});

app.put('/api/cart', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please sign in to update your cart.' });
    }
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 100) : [];
    const saved = await db.saveCart(user.id, items);
    return res.json({ success: true, data: saved });
  } catch (err) {
    console.error('❌ Save cart error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not save your cart.' });
  }
});

// ============================================================
// CHECKOUT PRICING
// ============================================================
// Orders are always priced here from the product records. The browser only
// says which products, which pack size and how many; any price, total or
// discount it sends is ignored.

const GST_RATE = 0.18;
const MAX_CART_LINES = 50;
const MAX_LINE_QTY = 999;

function packUnits(pack) {
  const match = String(pack || '').toLowerCase().match(/([\d.]+)\s*(kg|g|litre|liter|l|ml)/);
  if (!match) return 1;
  const value = Number(match[1]);
  return ['kg', 'litre', 'liter', 'l'].includes(match[2]) ? value * 1000 : value;
}

// Mirrors packagePrice() in src/pages/ProductDetail.jsx, so the server charges
// exactly the price the product page showed.
function unitPriceFor(product, pack) {
  const explicit = product.packagePrices?.[pack] || product.packPrices?.[pack];
  if (explicit !== undefined) return Number(explicit);
  const basePack = product.selectedPack || product.packSizes?.[0];
  if (!basePack || !pack) return Number(product.price || 0);
  return Math.round(Number(product.price || 0) * (packUnits(pack) / packUnits(basePack)));
}

async function priceCart(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, 'Your cart is empty.');
  }
  if (rawItems.length > MAX_CART_LINES) {
    throw new HttpError(400, 'Too many different items in one order.');
  }

  const requested = rawItems.map((raw) => ({
    id: String(raw?.id || raw?._id || ''),
    qty: Number(raw?.qty ?? 1),
    pack: typeof raw?.selectedPack === 'string' ? raw.selectedPack : '',
  }));

  if (requested.some((r) => !r.id || !Number.isInteger(r.qty) || r.qty < 1 || r.qty > MAX_LINE_QTY)) {
    throw new HttpError(400, 'Your cart has an invalid item. Please refresh the page and try again.');
  }

  const products = new Map((await db.getProductsByIds(requested.map((r) => r.id))).map((p) => [p.id, p]));
  const lines = [];
  const unitsByProduct = new Map();

  for (const r of requested) {
    const product = products.get(r.id);
    if (!product) {
      throw new HttpError(409, 'A product in your cart is no longer available. Please remove it and try again.');
    }
    const packSizes = Array.isArray(product.packSizes) ? product.packSizes : [];
    const pack = packSizes.includes(r.pack) ? r.pack : (product.selectedPack || packSizes[0] || '');
    const price = unitPriceFor(product, pack);
    if (!(price > 0)) {
      throw new HttpError(409, `${product.name} cannot be ordered right now.`);
    }

    lines.push({ id: product.id, name: product.name, image: product.image || '', packSize: pack, selectedPack: pack, qty: r.qty, price });
    unitsByProduct.set(product.id, (unitsByProduct.get(product.id) || 0) + r.qty);
  }

  for (const [id, qty] of unitsByProduct) {
    const product = products.get(id);
    const available = Math.max(0, Number(product.stock) || 0);
    if (available < qty) {
      throw new HttpError(409, available
        ? `Only ${available} left of ${product.name}. Please reduce the quantity.`
        : `${product.name} is out of stock. Please remove it from your cart.`);
    }
  }

  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.price * line.qty, 0) * 100) / 100;
  const gst = Math.round(subtotal * GST_RATE);

  return {
    lines,
    stockLines: [...unitsByProduct].map(([id, qty]) => ({ id, qty })),
    subtotal,
    gst,
    total: subtotal + gst,
  };
}

function readCustomerDetails(source) {
  const customerName = cleanText(source?.customerName, 80);
  const customerPhone = normalizePhone(source?.customerPhone);
  const address = cleanText(source?.address, 300);
  if (!customerName || !customerPhone || !address) {
    throw new HttpError(400, 'Please enter your name, a valid 10-digit mobile number and your delivery address.');
  }
  return { customerName, customerPhone, address };
}

// ============================================================
// RAZORPAY PAYMENTS
// ============================================================

const CHECKOUT_TTL_MS = 3 * 24 * HOUR_MS;
const checkoutKey = (razorpayOrderId) => `checkout:${razorpayOrderId}`;

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env');
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// CREATE RAZORPAY ORDER - POST /api/payments/create-order
// The server prices the cart and remembers exactly what is being paid for, so
// the order recorded after payment cannot differ from what was charged.
// Checkout requires a signed-in customer; the order is linked to the token's user.
app.post('/api/payments/create-order', requireAuth(), async (req, res) => {
  try {
    const wait = await rateLimit(`checkout-ip:${clientIp(req)}`, 30, HOUR_MS);
    if (wait) return tooManyRequests(res, wait, 'Too many checkout attempts. Please try again later.');

    const user = req.user;
    const customer = readCustomerDetails(req.body?.customer);
    const priced = await priceCart(req.body?.items);
    const amountPaise = Math.round(priced.total * 100);

    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: newId('rcpt'),
    });

    await db.kvSet(checkoutKey(razorpayOrder.id), {
      status: 'pending',
      userId: user?.id || null,
      ...customer,
      ...priced,
      amountPaise,
    }, CHECKOUT_TTL_MS);

    return res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        subtotal: priced.subtotal,
        gst: priced.gst,
        total: priced.total,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    sendError(res, err, 'Create Razorpay order');
  }
});

// Turns a paid Razorpay order into exactly one store order. The browser
// callback and the webhook both call this; whichever arrives second, or any
// replay, gets the existing order back instead of creating a duplicate.
async function finalizePaidOrder(razorpayOrderId, paymentId) {
  const existing = await db.getOrderByRazorpayId(razorpayOrderId);
  if (existing) return existing;

  const key = checkoutKey(razorpayOrderId);
  const session = await db.kvTransition(key, 'pending', 'processing');
  if (!session) {
    const finished = await db.getOrderByRazorpayId(razorpayOrderId);
    if (finished) return finished;
    throw new HttpError(409, 'This payment is already being processed or its checkout has expired. Please check Order Status.');
  }

  let reserved = null;
  try {
    reserved = await db.reserveStock(session.stockLines);
    const order = await db.createOrder({
      userId: session.userId || undefined,
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      address: session.address,
      items: session.lines,
      subtotal: session.subtotal,
      gst: session.gst,
      total: session.total,
      expectedDeliveryDate: estimatedDeliveryDate(),
      paymentMethod: 'Razorpay (UPI)',
      paymentStatus: 'Paid',
      paymentId,
      razorpayOrderId,
      // The customer has already paid, so the order stands even if stock ran
      // out meanwhile; the flag lets an admin follow up.
      stockShortfall: !reserved.ok,
    });

    if (session.userId) await db.saveCart(session.userId, []);
    await db.kvTransition(key, 'processing', 'paid', { orderId: order.id });

    console.log(`✅ Payment ${paymentId} recorded as order ${order.id}`);
    return order;
  } catch (err) {
    if (reserved?.ok) await db.releaseStock(session.stockLines).catch(() => {});
    await db.kvTransition(key, 'processing', 'pending').catch(() => {});

    // Lost a race with a concurrent request for the same payment.
    if (err?.code === 11000) {
      const winner = await db.getOrderByRazorpayId(razorpayOrderId);
      if (winner) return winner;
    }
    throw err;
  }
}

// VERIFY RAZORPAY PAYMENT - POST /api/payments/verify
// Verifies the HMAC signature Razorpay returns after checkout, then records the order.
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === 'string' && v)) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields.' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error('Razorpay key secret is missing. Add RAZORPAY_KEY_SECRET to .env');
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (!safeEqual(expectedSignature, razorpay_signature)) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Signature mismatch.' });
    }

    const order = await finalizePaidOrder(razorpay_order_id, razorpay_payment_id);
    // Sent at most once per order, whether this callback or the webhook gets there first.
    const whatsapp = await sendOrderConfirmation(order);
    return res.json({ success: true, data: order, whatsapp });
  } catch (err) {
    sendError(res, err, 'Verify payment');
  }
});

// RAZORPAY WEBHOOK - POST /api/payments/webhook
// Records paid orders even when the customer closes the browser before the
// checkout callback runs. Configure in the Razorpay dashboard for the
// payment.captured and order.paid events, using RAZORPAY_WEBHOOK_SECRET.
app.post('/api/payments/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ success: false, message: 'Webhook is not configured.' });
  }

  const signature = String(req.headers['x-razorpay-signature'] || '');
  const body = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (!signature || !safeEqual(expected, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
  }

  const event = req.body?.event;
  const payment = req.body?.payload?.payment?.entity;

  try {
    if ((event === 'payment.captured' || event === 'order.paid') && payment?.order_id && payment?.id) {
      const order = await finalizePaidOrder(payment.order_id, payment.id);
      // Covers customers who closed the tab before the checkout callback ran,
      // and retries a confirmation that failed to send from that callback.
      await sendOrderConfirmation(order);
    }
    return res.json({ success: true });
  } catch (err) {
    if (err instanceof HttpError) {
      // Not a checkout this server started (or already expired): acknowledge so
      // Razorpay stops retrying, but leave a trail.
      console.warn(`⚠️ Webhook for ${payment?.order_id}: ${err.message}`);
      return res.json({ success: true });
    }
    // Anything else is worth a retry from Razorpay.
    return sendError(res, err, 'Razorpay webhook');
  }
});

// ============================================================
// ORDERS
// ============================================================

const ORDER_STAFF_ROLES = ['admin', 'billing'];

// The delivery OTP proves the customer received the parcel, so only the
// customer who placed the order may see it.
function withoutDeliveryOtp(order) {
  const { otp, ...rest } = order;
  return rest;
}

function isAssignedTo(order, user) {
  return user.role === 'admin' || order.assignedDeliveryBoy === user.name || order.assignedDeliveryBoy === 'Unassigned';
}

app.get('/api/orders', requireAuth(), async (req, res) => {
  try {
    const user = req.user;

    if (ORDER_STAFF_ROLES.includes(user.role)) {
      const { phone, userId } = req.query;
      const all = await db.getOrders();
      const data = all
        .filter((order) => (!phone && !userId) || (phone && order.customerPhone === phone) || (userId && order.userId === userId))
        .map(withoutDeliveryOtp);
      return res.json({ success: true, count: data.length, data });
    }

    // Everyone else sees only their own orders, whatever the query string says.
    const data = await db.getOrdersForCustomer(user);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    sendError(res, err, 'Orders');
  }
});

// Cash on delivery. Only signed-in customers may order; the order is linked to
// the account from the token, never from the request body.
app.post('/api/orders', requireAuth(), async (req, res) => {
  try {
    const wait = await rateLimit(`order-ip:${clientIp(req)}`, 20, HOUR_MS);
    if (wait) return tooManyRequests(res, wait, 'Too many orders from this connection. Please try again later.');

    const user = req.user;
    const customer = readCustomerDetails(req.body);
    const priced = await priceCart(req.body?.items);

    const reserved = await db.reserveStock(priced.stockLines);
    if (!reserved.ok) {
      throw new HttpError(409, 'Some items in your cart just went out of stock. Please review your cart.');
    }

    let order;
    try {
      order = await db.createOrder({
        userId: user?.id,
        ...customer,
        items: priced.lines,
        subtotal: priced.subtotal,
        gst: priced.gst,
        total: priced.total,
        expectedDeliveryDate: estimatedDeliveryDate(),
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'Pending',
      });
    } catch (err) {
      await db.releaseStock(priced.stockLines).catch(() => {});
      throw err;
    }

    if (user) await db.saveCart(user.id, []);
    const whatsapp = await sendOrderConfirmation(order);
    res.json({ success: true, data: order, whatsapp });
  } catch (err) {
    sendError(res, err, 'Create order');
  }
});

app.put('/api/orders/:id', requireAuth('admin'), async (req, res) => {
  try {
    const { id, _id, otp, ...updates } = req.body || {};
    const order = await db.updateOrder(req.params.id, updates);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: withoutDeliveryOtp(order) });
  } catch (err) {
    sendError(res, err, 'Update order');
  }
});

// ============================================================
// WISHLIST
// ============================================================

// Signed-in customers own their wishlist through their account. Guests use the
// random visitor id their browser generated; it is never a guessable phone or user id.
function wishlistOwner(user, visitorId) {
  if (user) return user.id;
  const id = String(visitorId || '');
  return /^visitor-[A-Za-z0-9-]{16,80}$/.test(id) ? id : '';
}

app.get('/api/wishlist', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const owner = wishlistOwner(user, req.query.visitorId);
    if (!owner) {
      return res.status(400).json({ success: false, message: 'Sign in to see your wishlist.' });
    }
    const data = await db.getWishlistForOwner(owner);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    sendError(res, err, 'Wishlist');
  }
});

app.post('/api/wishlist', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const owner = wishlistOwner(user, req.body?.visitorId);
    if (!owner) {
      return res.status(400).json({ success: false, message: 'Sign in to save products.' });
    }

    const product = await db.getProductById(String(req.body?.productId || ''));
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const saved = req.body?.saved !== false;
    await db.setWishlistItem({ productId: product.id, productName: product.name, userId: owner, phone: user?.phone || '', saved });
    const data = await db.getWishlistForOwner(owner);
    res.json({ success: true, saved, count: data.length, data });
  } catch (err) {
    sendError(res, err, 'Save wishlist');
  }
});

// ============================================================
// DELIVERY
// ============================================================

app.get('/api/delivery/assigned', requireAuth('delivery', 'admin'), async (req, res) => {
  try {
    // A delivery agent only ever sees their own run; admins may pick an agent.
    const boyName = req.user.role === 'delivery' ? req.user.name : req.query.boyName;
    const orders = await db.getOrders();
    const assigned = orders
      .filter((o) => !boyName || o.assignedDeliveryBoy === boyName || o.assignedDeliveryBoy === 'Unassigned')
      .map(withoutDeliveryOtp);
    res.json({ success: true, data: assigned });
  } catch (err) {
    sendError(res, err, 'Assigned deliveries');
  }
});

app.post('/api/delivery/verify-otp', requireAuth('delivery', 'admin'), async (req, res) => {
  try {
    const { orderId, otp } = req.body || {};
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, message: 'Order id is required' });
    }

    const order = await db.getOrderById(orderId);
    if (!order || !isAssignedTo(order, req.user)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.deliveryStatus === 'Delivered') {
      return res.json({ success: true, alreadyDelivered: true, order: withoutDeliveryOtp(order) });
    }

    // A 4-digit code would fall to guessing without a cap on attempts.
    const wait = await rateLimit(`delivery-otp:${orderId}`, 5, 15 * MINUTE_MS);
    if (wait) {
      return tooManyRequests(res, wait, 'Too many wrong OTP attempts for this order. Please try again later.');
    }

    const entered = String(otp || '').trim();
    if (!entered || !safeEqual(entered, String(order.otp || '').trim())) {
      return res.status(400).json({ success: false, message: 'Wrong OTP. Please try again.' });
    }

    const updated = await db.updateOrder(orderId, {
      status: 'Delivered',
      deliveryStatus: 'Delivered',
      deliveredAt: new Date().toISOString()
    });
    await sendDeliveryStatusUpdate(updated, 'Delivered').catch(() => {});
    res.json({ success: true, order: withoutDeliveryOtp(updated) });
  } catch (err) {
    sendError(res, err, 'Verify delivery OTP');
  }
});

app.put('/api/orders/:id/status', requireAuth('admin', 'delivery'), async (req, res) => {
  try {
    const ALLOWED = ['Pending', 'Assigned', 'Confirmed', 'Dispatched', 'Out for Delivery', 'Delivered', 'Cancelled'];
    const { status, deliveryStatus, expectedDeliveryDate } = req.body || {};
    const nextStatus = deliveryStatus || status;

    if (nextStatus && !ALLOWED.includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Unknown delivery status.' });
    }

    const existing = await db.getOrderById(req.params.id);
    if (!existing || !isAssignedTo(existing, req.user)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only the customer's OTP (via /api/delivery/verify-otp) can mark a delivery
    // agent's order Delivered; admins may still close orders directly.
    if (nextStatus === 'Delivered' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Verify the customer OTP to complete this delivery.' });
    }

    const updates = {};
    if (nextStatus) {
      updates.status = nextStatus;
      updates.deliveryStatus = nextStatus;
      if (nextStatus === 'Delivered') updates.deliveredAt = new Date().toISOString();
    }
    if (expectedDeliveryDate !== undefined) updates.expectedDeliveryDate = cleanText(String(expectedDeliveryDate), 40);
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }
    updates.updatedAt = new Date().toISOString();

    const order = await db.updateOrder(req.params.id, updates);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (nextStatus && ['Dispatched', 'Out for Delivery', 'Delivered'].includes(nextStatus)) {
      await sendDeliveryStatusUpdate(order, nextStatus).catch(() => {});
    }
    res.json({ success: true, data: withoutDeliveryOtp(order) });
  } catch (err) {
    sendError(res, err, 'Update order status');
  }
});

// ============================================================
// CMS
// ============================================================

// Content the storefront may read. Payment settings stay admin-only.
const PRIVATE_CMS_FIELDS = ['razorpaySecret', 'razorpayKeySecret', 'razorpayWebhookSecret'];

app.get('/api/cms', async (req, res) => {
  try {
    const data = { ...(await db.getCMS()) };
    const user = await getAuthenticatedUser(req);
    if (user?.role !== 'admin') {
      for (const field of PRIVATE_CMS_FIELDS) delete data[field];
    }
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'CMS');
  }
});

app.put('/api/cms', requireAuth('admin'), async (req, res) => {
  try {
    const updated = await db.updateCMS(req.body);
    res.json({ success: true, message: 'Website content updated successfully by Admin CMS', data: updated });
  } catch (err) {
    sendError(res, err, 'Update CMS');
  }
});

// ============================================================
// ADVISORY
// ============================================================

app.post('/api/advisory/subscribe', async (req, res) => {
  try {
    const wait = await rateLimit(`advisory-ip:${clientIp(req)}`, 10, HOUR_MS);
    if (wait) return tooManyRequests(res, wait, 'Too many requests. Please try again later.');

    const { name, season, acreage } = req.body || {};
    const phone = normalizePhone(req.body?.phone);
    const crop = cleanText(req.body?.crop, 60);

    if (!phone || !crop) {
      return res.status(400).json({ success: false, message: 'A valid mobile number and crop are required.' });
    }

    const subscriber = {
      id: newId('adv'),
      name: cleanText(name, 80) || 'Farmer Partner',
      phone,
      crop,
      season: cleanText(season, 30) || 'Kharif',
      acreage: Number(acreage) || 1,
      subscribedAt: new Date().toISOString(),
      status: 'Active',
      lastAdvisorySent: null,
    };

    const created = await db.addAdvisorySubscriber(subscriber);
    res.json({ success: true, message: 'Subscribed to weekly crop advisory successfully', data: created });
  } catch (err) {
    sendError(res, err, 'Advisory subscribe');
  }
});

app.get('/api/advisory/subscribers', requireAuth('admin'), async (req, res) => {
  try {
    const data = await db.getAdvisorySubscribers();
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Advisory subscribers');
  }
});

// ============================================================
// INVENTORY / STAFF TASKS
// ============================================================

app.get('/api/inventory', requireAuth('admin', 'employee'), async (req, res) => {
  try {
    const data = await db.getInventory();
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Inventory');
  }
});

app.get('/api/staff-tasks', requireAuth('admin', 'employee'), async (req, res) => {
  try {
    const data = await db.getStaffTasks();
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Staff tasks');
  }
});

// ============================================================
// BILLING / POS
// ============================================================

app.post('/api/billing/invoice', requireAuth('billing', 'admin'), async (req, res) => {
  try {
    const { customerName, customerPhone, discountAmount = 0, paymentMode } = req.body || {};
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 200) : [];

    const subtotal = items.reduce((sum, item) => sum + Math.max(0, Number(item.price) || 0) * Math.max(0, Number(item.qty) || 0), 0);
    const taxableAmount = Math.max(0, subtotal - Math.max(0, Number(discountAmount) || 0));
    const cgst = +(taxableAmount * 0.09).toFixed(2);
    const sgst = +(taxableAmount * 0.09).toFixed(2);
    const totalGst = +(cgst + sgst).toFixed(2);
    const grandTotal = +(taxableAmount + totalGst).toFixed(2);

    const invoice = {
      id: newId('INV'),
      date: new Date().toISOString(),
      customerName: cleanText(customerName, 80) || 'Walk-in Customer',
      customerPhone: cleanText(customerPhone, 15),
      items,
      subtotal,
      discountAmount: Math.max(0, Number(discountAmount) || 0),
      taxableAmount,
      totalGst,
      grandTotal,
      paymentMode: cleanText(paymentMode, 30) || 'Cash',
      cashier: req.user.name,
      status: 'PAID',
    };

    res.json({ success: true, message: 'POS GST Tax Invoice Generated', invoice });
  } catch (err) {
    sendError(res, err, 'Create invoice');
  }
});

// ============================================================
// SUPPORT TICKETS
// ============================================================

app.get('/api/tickets', requireAuth('admin', 'employee'), async (req, res) => {
  try {
    const data = await db.getTickets();
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Tickets');
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const wait = await rateLimit(`ticket-ip:${clientIp(req)}`, 10, HOUR_MS);
    if (wait) return tooManyRequests(res, wait, 'Too many tickets from this connection. Please try again later.');

    const { farmerName, phone, crop, subject, category, priority, description } = req.body || {};
    const cleanSubject = cleanText(subject, 150);
    const cleanDescription = cleanText(description, 2000);

    if (!cleanSubject && !cleanDescription) {
      return res.status(400).json({ success: false, message: 'Please describe your question.' });
    }

    const newTicket = {
      id: newId('TCK'),
      farmerName: cleanText(farmerName, 80) || 'Farmer',
      phone: normalizePhone(phone) || '',
      crop: cleanText(crop, 60),
      subject: cleanSubject || 'General Query',
      category: cleanText(category, 40) || 'Field Advisory',
      priority: ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium',
      status: 'Open',
      assignedTo: 'Support Desk Agronomist',
      createdAt: new Date().toISOString(),
      replies: [{ from: 'Farmer', text: cleanDescription || cleanSubject, time: 'Just now' }],
    };

    const created = await db.addTicket(newTicket);
    res.json({ success: true, message: 'Support ticket submitted successfully', ticket: created });
  } catch (err) {
    sendError(res, err, 'Create ticket');
  }
});

// ============================================================
// CHAT
// ============================================================

app.get('/api/chat/records', requireAuth('admin', 'employee'), async (req, res) => {
  try {
    const data = await db.getChatRecords();
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Chat records');
  }
});

// ============================================================
// FALLBACKS
// ============================================================

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Malformed JSON and anything thrown outside a route's own try/catch still get
// a clean JSON response with no stack trace.
app.use((err, req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request is too large.' });
  }
  sendError(res, err, 'Unhandled');
});

// ============================================================
// START SERVER
// ============================================================

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Sathya Bio Engine running with persistent DB on port ${PORT}`);
    console.log(`📱 WhatsApp OTP system enabled`);
  });
}

// ============================================================
// EXPORT APP
// ============================================================

export default app;
