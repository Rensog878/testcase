// The sign-up code as a banner image with a caption, and its fallbacks.
// Run from server/: npm test

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Settings must be in place before the modules load. There is no database, so
// sender pacing falls back to working without it, as whatsapp.js allows.
Object.assign(process.env, {
  MONGODB_URI: '',
  WASENDER_API_KEY: 'test-key',
  WASENDER_API_URL: 'https://wasender.test/api/send-message',
  WASENDER_MIN_GAP_MS: '0',
  WASENDER_GAP_JITTER_MS: '0',
  WASENDER_CHECK_NUMBERS: 'off',
});
for (let slot = 2; slot <= 10; slot++) delete process.env[`WASENDER_API_KEY_${slot}`];

const { sendWhatsAppImage } = await import('../whatsapp.js');
const { buildOtpMessage, otpBannerUrl, OTP_BANNER_VERSION, WHATSAPP_CAPTION_LIMIT, OTP_LAYOUT_COUNT } = await import('../otpTemplates.js');
const { isPublicHttpsUrl } = await import('../publicUrl.js');

// Missing-database warnings are expected here.
console.warn = () => {};

const PHONE = '9876543210';
const BANNER = `https://shop.example.com/assets/whatsapp-otp-banner.png?v=${OTP_BANNER_VERSION}`;
const OK = { status: 200, data: { success: true, data: { msgId: 1, status: 'in_progress' } } };

let calls;
let replies;

globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
  const reply = replies.shift();
  if (!reply) throw new Error('Unexpected request');
  if (reply instanceof Error) throw reply;
  return new Response(JSON.stringify(reply.data), { status: reply.status });
};

beforeEach(() => {
  calls = [];
  replies = [];
  delete process.env.PUBLIC_SITE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.OTP_BANNER_URL;
});

test('sends the banner with the code as its caption', async () => {
  replies = [OK];
  const result = await sendWhatsAppImage(PHONE, { imageUrl: BANNER, caption: 'Your code: *123456*' });

  assert.equal(result.image, true);
  assert.equal(result.sender, 'sender 1');
  assert.deepEqual(calls.map((c) => c.body), [{ to: '919876543210', text: 'Your code: *123456*', imageUrl: BANNER }]);
});

test('sends the text alone when WaSender refuses the image', async () => {
  replies = [{ status: 422, data: { success: false, message: 'The image url field must be a valid URL.' } }, OK];
  const result = await sendWhatsAppImage(PHONE, { imageUrl: BANNER, caption: 'Your code: *123456*' });

  assert.equal(result.image, false);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.imageUrl, BANNER);
  assert.deepEqual(calls[1].body, { to: '919876543210', text: 'Your code: *123456*' });
});

test('never sends a second message after a timeout', async () => {
  replies = [Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' })];
  await assert.rejects(
    sendWhatsAppImage(PHONE, { imageUrl: BANNER, caption: '*123456*' }),
    { code: 'TIMEOUT' },
  );
  assert.equal(calls.length, 1);
});

test('never sends a second message after a server error', async () => {
  replies = [{ status: 502, data: { message: 'Bad gateway' } }];
  await assert.rejects(
    sendWhatsAppImage(PHONE, { imageUrl: BANNER, caption: '*123456*' }),
    { code: 'PROVIDER_ERROR' },
  );
  assert.equal(calls.length, 1);
});

test('never sends a second message when the answer is unclear', async () => {
  replies = [{ status: 200, data: { success: false, message: 'Something went wrong' } }];
  await assert.rejects(sendWhatsAppImage(PHONE, { imageUrl: BANNER, caption: '*123456*' }));
  assert.equal(calls.length, 1);
});

test('sends text only when there is no public banner URL', async () => {
  process.env.PUBLIC_SITE_URL = 'http://localhost:3000';
  assert.equal(otpBannerUrl(), null);

  replies = [OK];
  const result = await sendWhatsAppImage(PHONE, { imageUrl: otpBannerUrl(), caption: '*123456*' });
  assert.equal(result.image, false);
  assert.deepEqual(calls.map((c) => c.body), [{ to: '919876543210', text: '*123456*' }]);
});

test('the banner URL comes from the public site address', () => {
  assert.equal(otpBannerUrl(), null);

  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'sathyabio.vercel.app';
  assert.equal(otpBannerUrl(), `https://sathyabio.vercel.app/assets/whatsapp-otp-banner.png?v=${OTP_BANNER_VERSION}`);

  process.env.PUBLIC_SITE_URL = 'https://shop.example.com/';
  assert.equal(otpBannerUrl(), BANNER);

  process.env.OTP_BANNER_URL = 'https://cdn.example.com/banner.png';
  assert.equal(otpBannerUrl(), 'https://cdn.example.com/banner.png');

  process.env.OTP_BANNER_URL = 'http://192.168.1.5/banner.png';
  assert.equal(otpBannerUrl(), null);
});

test('only public HTTPS addresses count as public', () => {
  for (const url of ['https://shop.example.com/a.png', 'https://8.8.8.8/a.png', 'https://fdroid.org/a.png']) {
    assert.equal(isPublicHttpsUrl(url), true, url);
  }
  for (const url of [
    'http://shop.example.com/a.png', 'https://localhost/a.png', 'https://127.0.0.1/a.png',
    'https://10.0.0.2/a.png', 'https://172.20.1.1/a.png', 'https://192.168.0.9/a.png',
    'https://[::1]/a.png', 'https://myshop.local/a.png', 'https://intranet/a.png', 'not a url', '',
  ]) {
    assert.equal(isPublicHttpsUrl(url), false, url);
  }
});

test('every sign-up message fits in a caption and keeps the code in bold', () => {
  const longName = 'Subramaniyapuram-Venkatachalapathy';
  for (let i = 0; i < OTP_LAYOUT_COUNT * 200; i++) {
    const caption = buildOtpMessage('482915', longName, `98765${String(i).padStart(5, '0')}`, 5 * 60 * 1000);
    assert.ok(caption.length <= WHATSAPP_CAPTION_LIMIT, `${caption.length} characters:\n${caption}`);
    assert.match(caption, /\*482915\*/);
  }
});

test('the banner URL changes whenever the banner image does', async () => {
  const { createHash } = await import('node:crypto');
  const { readFileSync } = await import('node:fs');
  const file = readFileSync(new URL('../../public/assets/whatsapp-otp-banner.png', import.meta.url));
  const actual = createHash('sha256').update(file).digest('hex').slice(0, 12);
  assert.equal(OTP_BANNER_VERSION, actual, 'the banner was rebuilt: update OTP_BANNER_VERSION in otpTemplates.js');
});

// Customer codes: Tamil first, then English; welcome vs welcome back.
test('customer codes are Tamil + English, with no Hindi greeting', () => {
  for (let i = 0; i < OTP_LAYOUT_COUNT * 100; i++) {
    for (const isNew of [true, false]) {
      const text = buildOtpMessage('482915', 'Selvi', `98700${String(i).padStart(5, '0')}`, 5 * 60 * 1000, { isNew });
      assert.doesNotMatch(text, /namaste|नमस्ते/i, 'no Hindi greeting');
      assert.match(text, /[\u0B80-\u0BFF]/, 'has Tamil');
      assert.ok(text.indexOf('━') > 0 && /[\u0B80-\u0BFF]/.test(text.slice(0, text.indexOf('━'))), 'Tamil comes first');
      assert.equal((text.match(/\*482915\*/g) || []).length >= 2, true, 'the code in bold in both languages');
      assert.ok(text.length <= WHATSAPP_CAPTION_LIMIT, `${text.length} characters`);
    }
  }
});

test('only a new customer is asked to save the number; a returning one reads no sign-up wording', () => {
  for (let i = 0; i < OTP_LAYOUT_COUNT * 50; i++) {
    const fresh = buildOtpMessage('482915', 'Selvi', `98711${String(i).padStart(5, '0')}`, 5 * 60 * 1000, { isNew: true });
    const back = buildOtpMessage('482915', 'Selvi', `98722${String(i).padStart(5, '0')}`, 5 * 60 * 1000, { isNew: false });
    assert.equal((fresh.match(/📌/g) || []).length, 2, 'save line in Tamil and English');
    assert.match(fresh, /Save this number as|Add this number to your contacts|save this number as/i);
    assert.doesNotMatch(back, /📌/, 'no save line when they already have an account');
    assert.doesNotMatch(back, /sign.?up|signing up|welcome to/i);
    assert.match(back, /மீண்டும்/, 'welcomed back in Tamil');
    assert.doesNotMatch(fresh + back, /do not reply|no reply needed/i, 'replies are welcome');
  }
});

test('a name written in Tamil is kept, and a missing name reads naturally in Tamil', () => {
  const text = buildOtpMessage('482915', 'செல்வி முருகன்', '9873300001', 5 * 60 * 1000, { isNew: false });
  assert.match(text, /செல்வி/);
  const noName = buildOtpMessage('482915', '12345', '9873300002', 5 * 60 * 1000, { isNew: true });
  assert.match(noName, /விவசாயி நண்பரே/);
});
