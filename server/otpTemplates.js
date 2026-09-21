/**
 * WhatsApp OTP message builder.
 *
 * WaSenderAPI drives an ordinary WhatsApp session rather than the official
 * Business API, and sending identical text on every request is an obvious bot
 * fingerprint. So a message is assembled from interchangeable parts — a
 * structural layout plus randomly chosen header, greeting, lead-in, code line,
 * validity phrasing, warning and footer. A handful of fixed templates would
 * give a handful of shapes; mixing the parts gives millions.
 *
 * Sized for ~50,000 sends: every slot below multiplies the space, so no single
 * shape should repeat more than a couple of times across the whole user base.
 *
 * Every generated message, whatever the combination, always contains:
 *   - the brand name
 *   - the code, in *bold*, on its own visual line
 *   - how long the code lasts
 *   - a warning not to share it
 *
 * Formatting uses WhatsApp markup: *bold*, _italic_.
 *
 * Deliberately NOT used: zero-width characters, homoglyphs (Cyrillic
 * lookalikes) or other invisible-noise tricks. They break screen readers and
 * copy-paste of the code, and are themselves a spam signal.
 */

import crypto from 'node:crypto';
import { isPublicHttpsUrl, publicAssetUrl } from './publicUrl.js';

const BRAND = 'Sathyam Agro Mart';

// The sign-up code is sent as the caption of this banner: the brand as it
// appears at the top of the sign-in card. Rebuild it with
// server/scripts/build-otp-banner.mjs. OTP_BANNER_URL may point at another
// image. Returns null, meaning text only, when there is no public HTTPS
// address for it (local development).
export const OTP_BANNER_PATH = '/assets/whatsapp-otp-banner.png';
// WhatsApp keeps a copy of an image per URL, so a new banner at the same
// address still arrives as the old picture. The URL carries the first 12 hex
// characters of the file's SHA-256; build-otp-banner.mjs prints the new value
// and tests/otp-banner.test.mjs fails if it is left stale.
export const OTP_BANNER_VERSION = 'c5813e7d131b';

export function otpBannerUrl() {
  const override = String(process.env.OTP_BANNER_URL || '').trim();
  if (!override) return publicAssetUrl(`${OTP_BANNER_PATH}?v=${OTP_BANNER_VERSION}`);
  if (isPublicHttpsUrl(override)) return override;
  console.warn('⚠️ OTP_BANNER_URL is not a public HTTPS URL, so sign-up codes are sent as text.');
  return null;
}

// WhatsApp cuts image captions off after this many characters.
export const WHATSAPP_CAPTION_LIMIT = 1024;

const pick = (arr) => arr[crypto.randomInt(0, arr.length)];
const maybe = (value, chance = 0.5) => (crypto.randomInt(0, 100) < chance * 100 ? value : '');

// Lowercases the opening word so a sentence reads correctly after a greeting
// comma: "Dear Stephan, to continue…" rather than "…, To continue".
const decap = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// ---------------------------------------------------------------
// Interchangeable wording
// ---------------------------------------------------------------

const GREETINGS = [
  (n) => `Namaste ${n},`,
  (n) => `Namaste ${n} 🙏`,
  (n) => `Hello ${n},`,
  (n) => `Hello ${n} 👋`,
  (n) => `Hi ${n},`,
  (n) => `Dear ${n},`,
  (n) => `${n},`,
  (n) => `Hey ${n},`,
  (n) => `Welcome ${n},`,
  (n) => `Greetings ${n},`,
  (n) => `Vanakkam ${n},`,
  (n) => `Vanakkam ${n} 🙏`,
  (n) => `Hello there, ${n},`,
  (n) => `${n} 🌾`,
];

const LEAD_INS = [
  'Use this code to verify your mobile number:',
  'Here is the verification code you requested:',
  'Your one-time password is:',
  'Please use the code below to confirm your number:',
  'To continue, enter this verification code:',
  'This is the code for your mobile verification:',
  'Confirm your mobile number with the code below:',
  'Here is your one-time verification code:',
  'Enter the code below to finish verifying your number:',
  'The verification code for your account is:',
  'Please confirm your mobile number using this code:',
  'Your verification code is ready:',
  'Use the code below to complete your sign-up:',
  'To finish signing up, enter this code:',
];

const CODE_LINES = [
  (otp) => `*${otp}*`,
  (otp) => `Code: *${otp}*`,
  (otp) => `Your code: *${otp}*`,
  (otp) => `➡️ *${otp}*`,
  (otp) => `🔐 *${otp}*`,
  (otp) => `*${otp}* 🔑`,
];

const VALIDITY = [
  (m) => `Valid for ${m} minutes.`,
  (m) => `It expires in ${m} minutes.`,
  (m) => `This code stops working after ${m} minutes.`,
  (m) => `Please enter it within ${m} minutes.`,
  (m) => `The code is active for the next ${m} minutes.`,
  (m) => `You have ${m} minutes to use this code.`,
  (m) => `Use it within ${m} minutes.`,
  (m) => `This code is valid for the next ${m} minutes only.`,
  (m) => `It will expire ${m} minutes from now.`,
  (m) => `Please use it before ${m} minutes are up.`,
  (m) => `Good for ${m} minutes.`,
  (m) => `The code lasts ${m} minutes.`,
];

const WARNINGS = [
  'Never share this code with anyone.',
  `Do not forward this code. ${BRAND} staff will never ask you for it.`,
  'Keep this code private — sharing it puts your account at risk.',
  `Anyone asking you for this code is not from ${BRAND}.`,
  'For your safety, never pass this code on.',
  'Treat this code like a password and keep it to yourself.',
  'Please do not share this code, not even with family.',
  `${BRAND} will never call or message you asking for this code.`,
  'This code is meant only for you — keep it private.',
  'Sharing this code could let someone else access your account.',
  'Never send this code to anyone who asks for it.',
  'Keep this code secret to protect your account.',
];

const FOOTERS = [
  '_If you did not request this, you can safely ignore this message._',
  '_Not you? No action is needed — simply ignore this message._',
  `_This is an automated message from ${BRAND}._`,
  '_Please do not reply to this message._',
  '_Did not request a code? You can ignore this message._',
  `_Sent automatically by ${BRAND}. No reply needed._`,
  '_If this was not you, no further action is required._',
  '_This message was sent because someone entered this number to sign up._',
  `_Need help? Contact ${BRAND} support._`,
  '_You are receiving this because a verification was requested._',
];

const HEADERS = [
  `*${BRAND}* — Mobile Verification`,
  `*${BRAND}* account verification`,
  `🌾 *${BRAND}* — verify your number`,
  `*${BRAND}* security check`,
  `🌱 *${BRAND}*`,
  `*${BRAND}* — one-time password`,
  `*${BRAND}* — confirm your number`,
  `🔐 *${BRAND}* verification`,
  `*${BRAND}* sign-up verification`,
  `*${BRAND}* — verification code`,
  `🌿 *${BRAND}* account security`,
  `*${BRAND}* | Mobile number check`,
];

// ---------------------------------------------------------------
// Structural layouts
// Each returns an array of lines; '' becomes a blank line.
// Every layout draws on several slots above so none is a narrow, easily
// repeated shape.
// ---------------------------------------------------------------

const LAYOUTS = [
  // 1 — header, greeting, lead, code, details, footer
  ({ name, otp, mins }) => [
    pick(HEADERS), '',
    pick(GREETINGS)(name),
    pick(LEAD_INS), '',
    pick(CODE_LINES)(otp), '',
    pick(VALIDITY)(mins),
    pick(WARNINGS),
    maybe('\n' + pick(FOOTERS), 0.5),
  ],

  // 2 — code first, then explanation
  ({ name, otp, mins }) => [
    `*${otp}* is your *${BRAND}* verification code.`, '',
    `${pick(GREETINGS)(name)} ${decap(pick(LEAD_INS).replace(/:$/, '.'))}`,
    pick(VALIDITY)(mins), '',
    `_${pick(WARNINGS)}_`,
    maybe('\n' + pick(FOOTERS), 0.3),
  ],

  // 3 — compact, brand inline
  ({ name, otp, mins }) => [
    pick(GREETINGS)(name),
    `Your *${BRAND}* code is *${otp}*.`,
    `${pick(VALIDITY)(mins)} ${pick(WARNINGS)}`,
    maybe('\n' + pick(FOOTERS), 0.4),
  ],

  // 4 — labelled block
  ({ name, otp, mins }) => [
    pick(HEADERS), '',
    pick(GREETINGS)(name), '',
    `Verification code: *${otp}*`,
    `Valid for: ${mins} minutes`, '',
    pick(WARNINGS),
    maybe('\n' + pick(FOOTERS), 0.4),
  ],

  // 5 — greeting first, brand as sign-off
  ({ name, otp, mins }) => [
    pick(GREETINGS)(name), '',
    pick(LEAD_INS), '',
    pick(CODE_LINES)(otp), '',
    `${pick(WARNINGS)} ${pick(VALIDITY)(mins)}`, '',
    `— *${BRAND}*`,
  ],

  // 6 — short, header-led
  ({ otp, mins }) => [
    pick(HEADERS), '',
    pick(CODE_LINES)(otp), '',
    `${pick(VALIDITY)(mins)} ${pick(WARNINGS)}`,
    maybe('\n' + pick(FOOTERS), 0.5),
  ],

  // 7 — welcoming tone
  ({ name, otp, mins }) => [
    `${pick(GREETINGS)(name)} welcome to *${BRAND}* 🌱`, '',
    pick(LEAD_INS), '',
    pick(CODE_LINES)(otp), '',
    pick(VALIDITY)(mins),
    pick(WARNINGS),
    maybe('\n' + pick(FOOTERS), 0.3),
  ],

  // 8 — header, code, details on separate lines
  ({ otp, mins }) => [
    pick(HEADERS), '',
    pick(CODE_LINES)(otp), '',
    pick(VALIDITY)(mins),
    pick(WARNINGS),
    maybe('\n' + pick(FOOTERS), 0.6),
  ],

  // 9 — sentence style, code inline
  ({ name, otp, mins }) => [
    pick(GREETINGS)(name),
    `Please enter *${otp}* to verify your mobile number with *${BRAND}*.`,
    pick(VALIDITY)(mins), '',
    pick(WARNINGS),
    maybe('\n' + pick(FOOTERS), 0.4),
  ],

  // 10 — bulleted details
  ({ name, otp, mins }) => [
    pick(HEADERS), '',
    pick(GREETINGS)(name), '',
    pick(CODE_LINES)(otp), '',
    `• ${pick(VALIDITY)(mins)}`,
    '• Can be used once',
    `• ${pick(WARNINGS)}`,
  ],

  // 11 — question opener
  ({ name, otp, mins }) => [
    pick(GREETINGS)(name),
    `Signing up with *${BRAND}*?`,
    pick(LEAD_INS), '',
    pick(CODE_LINES)(otp), '',
    `${pick(VALIDITY)(mins)} ${pick(WARNINGS)}`,
    maybe('\n' + pick(FOOTERS), 0.3),
  ],

  // 12 — footer-branded
  ({ name, otp, mins }) => [
    pick(GREETINGS)(name), '',
    pick(LEAD_INS), '',
    pick(CODE_LINES)(otp), '',
    pick(VALIDITY)(mins),
    pick(WARNINGS), '',
    `— *${BRAND}*`,
  ],

  // 13 — warning emphasised first
  ({ name, otp, mins }) => [
    pick(HEADERS), '',
    pick(GREETINGS)(name),
    `${pick(WARNINGS)}`, '',
    pick(CODE_LINES)(otp), '',
    pick(VALIDITY)(mins),
    maybe('\n' + pick(FOOTERS), 0.4),
  ],

  // 14 — two-line body, footer required
  ({ name, otp, mins }) => [
    `${pick(GREETINGS)(name)} ${decap(pick(LEAD_INS))}`, '',
    pick(CODE_LINES)(otp), '',
    `${pick(VALIDITY)(mins)} ${pick(WARNINGS)}`, '',
    `— *${BRAND}*`,
    pick(FOOTERS),
  ],

  // 15 — brand header plus closing signature
  ({ name, otp, mins }) => [
    pick(HEADERS), '',
    pick(GREETINGS)(name),
    pick(LEAD_INS), '',
    pick(CODE_LINES)(otp), '',
    pick(VALIDITY)(mins), '',
    `_${pick(WARNINGS)}_`, '',
    `— *${BRAND}*`,
  ],

  // 16 — minimal, single detail line
  ({ name, otp, mins }) => [
    pick(GREETINGS)(name),
    pick(LEAD_INS), '',
    `*${otp}*`, '',
    `${pick(VALIDITY)(mins)} ${pick(WARNINGS)}`, '',
    `*${BRAND}*`,
  ],
];

// Remembers the last layout used per number, so a resend never arrives in the
// same shape the user just received.
const lastLayout = new Map();

export function forgetOtpLayout(phone) {
  lastLayout.delete(phone);
}

/**
 * The name comes from a user-filled form, so it may be blank, a phone number,
 * or junk. Never address someone as a string of digits.
 */
export function safeFirstName(userName) {
  const first = String(userName || '').trim().split(/\s+/)[0] || '';
  const letters = first.replace(/[^A-Za-zÀ-ɏ]/g, '');
  if (letters.length < 2) return 'Farmer';
  return first.slice(0, 24);
}

export function buildOtpMessage(otp, userName = 'Farmer', phone = '', expiryMs = 5 * 60 * 1000) {
  const mins = Math.round(expiryMs / 60000);
  const name = safeFirstName(userName);

  const previous = lastLayout.get(phone);
  const choices = LAYOUTS.map((_, i) => i).filter((i) => i !== previous);
  const index = choices[crypto.randomInt(0, choices.length)];
  if (phone) lastLayout.set(phone, index);

  return LAYOUTS[index]({ name, otp, mins })
    .filter((line) => line !== null && line !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const OTP_LAYOUT_COUNT = LAYOUTS.length;

// ---------------------------------------------------------------
// Password reset codes
// The sign-up layouts talk about verifying a number or signing up, which is
// wrong for a reset. Reset messages share the greeting, code, validity and
// warning pools but have their own headers, lead-ins and footers.
// ---------------------------------------------------------------

const RESET_HEADERS = [
  `*${BRAND}* — password reset`,
  `🔐 *${BRAND}* password reset`,
  `*${BRAND}* — reset your password`,
  `🌿 *${BRAND}* account security`,
  `*${BRAND}* | Password reset code`,
];

const RESET_LEAD_INS = [
  'Use this code to reset your password:',
  'Here is the code to set a new password:',
  'Enter this code to reset your account password:',
  'Your password reset code is:',
  'To choose a new password, enter this code:',
  'Use the code below to reset your password:',
];

const RESET_FOOTERS = [
  '_Did not ask to reset your password? Ignore this message — your password stays the same._',
  '_Not you? Your password has not been changed. You can safely ignore this._',
  `_Sent automatically by ${BRAND}. No reply needed._`,
  `_Need help? Call ${BRAND} support on 1800-425-9999._`,
];

const RESET_LAYOUTS = [
  ({ name, otp, mins }) => [
    pick(RESET_HEADERS), '',
    pick(GREETINGS)(name),
    pick(RESET_LEAD_INS), '',
    pick(CODE_LINES)(otp), '',
    pick(VALIDITY)(mins),
    pick(WARNINGS), '',
    pick(RESET_FOOTERS),
  ],
  ({ name, otp, mins }) => [
    `*${otp}* is your *${BRAND}* password reset code.`, '',
    `${pick(GREETINGS)(name)} ${pick(VALIDITY)(mins)}`, '',
    `_${pick(WARNINGS)}_`, '',
    pick(RESET_FOOTERS),
  ],
  ({ name, otp, mins }) => [
    pick(GREETINGS)(name), '',
    pick(RESET_LEAD_INS), '',
    pick(CODE_LINES)(otp), '',
    `• ${pick(VALIDITY)(mins)}`,
    '• Can be used once',
    `• ${pick(WARNINGS)}`, '',
    `— *${BRAND}*`,
  ],
  ({ name, otp, mins }) => [
    pick(RESET_HEADERS), '',
    `${pick(GREETINGS)(name)} ${decap(pick(RESET_LEAD_INS))}`, '',
    pick(CODE_LINES)(otp), '',
    `${pick(VALIDITY)(mins)} ${pick(WARNINGS)}`, '',
    pick(RESET_FOOTERS),
  ],
];

export function buildResetOtpMessage(otp, userName = 'Farmer', phone = '', expiryMs = 5 * 60 * 1000) {
  const mins = Math.round(expiryMs / 60000);
  const name = safeFirstName(userName);
  const key = `reset:${phone}`;

  const previous = lastLayout.get(key);
  const choices = RESET_LAYOUTS.map((_, i) => i).filter((i) => i !== previous);
  const index = choices[crypto.randomInt(0, choices.length)];
  if (phone) lastLayout.set(key, index);

  return RESET_LAYOUTS[index]({ name, otp, mins })
    .filter((line) => line !== null && line !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Security notice sent after a successful reset.
export function buildPasswordChangedMessage(userName = 'Farmer', phone = '') {
  const name = safeFirstName(userName);
  const masked = phone ? `+91 ••••••${String(phone).slice(-4)}` : 'your number';
  return [
    `🔐 *${BRAND}* — password changed`, '',
    `${pick(GREETINGS)(name)} the password for the ${BRAND} account on ${masked} was just changed, and any other devices were signed out.`, '',
    `If this was not you, call ${BRAND} support on 1800-425-9999 right away.`,
  ].join('\n');
}
