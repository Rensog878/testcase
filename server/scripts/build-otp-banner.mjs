/**
 * Builds public/assets/whatsapp-otp-banner.png, the image the sign-up code is
 * sent under on WhatsApp.
 *
 * It draws the brand row from the top of the sign-in card (AuthModal.jsx
 * .auth-brand, styled in storefront.css) at banner size, and screenshots it
 * with headless Chrome or Edge. Keep the values below in step with that CSS.
 *
 *   node server/scripts/build-otp-banner.mjs [output.png]
 *
 * Needs Chrome or Edge (set CHROME_PATH if it is not found) and internet access
 * for the Plus Jakarta Sans font.
 *
 * Leaf icon: Font Awesome Free 6.5.1, fa-solid fa-leaf. Icons licensed
 * CC BY 4.0, https://fontawesome.com/license/free
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUTPUT = resolve(process.argv[2] || join(ROOT, 'public/assets/whatsapp-otp-banner.png'));

const WIDTH = 1200;
const HEIGHT = 628;
// The brand row on the sign-in card is 34px tall. The banner draws it this many times larger.
const SCALE = 4;
const MAX_BYTES = 300 * 1024;

// storefront.css :root and the desktop .auth-brand rules.
const PRIMARY = '#059669';
const PRIMARY_DARK = '#064e3b';
const TEXT_MUTED = '#475569';
const BG_MAIN = '#f0fdf4';
const WORDMARK = ['SATHYA', 'BIO'];
const TAGLINE = 'Agro Pesticide Store'; // i18n key logo_sub, in English

const LEAF_PATH = 'M272 96c-78.6 0-145.1 51.5-167.7 122.5c33.6-17 71.5-26.5 111.7-26.5h88c8.8 0 16 7.2 16 16s-7.2 16-16 16H288 216s0 0 0 0c-16.6 0-32.7 1.9-48.3 5.4c-25.9 5.9-49.9 16.4-71.4 30.7c0 0 0 0 0 0C38.3 298.8 0 364.9 0 440v16c0 13.3 10.7 24 24 24s24-10.7 24-24V440c0-48.7 20.7-92.5 53.8-123.2C121.6 392.3 190.3 448 272 448l1 0c132.1-.7 239-130.9 239-291.4c0-42.6-7.5-83.1-21.1-119.6c-2.6-6.9-12.7-6.6-16.2-.1C455.9 72.1 418.7 96 376 96L272 96z';

// Google Fonts serves woff2 only to a browser it recognises.
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const px = (cssPx) => `${+(cssPx * SCALE).toFixed(2)}px`;

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) throw new Error('Chrome or Edge was not found. Set CHROME_PATH to its executable.');
  return found;
}

async function download(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return response;
}

// Plus Jakarta Sans, inlined so the screenshot cannot be taken before the font arrives.
async function fontCss() {
  const letters = `${WORDMARK.join(' ')} ${TAGLINE.toUpperCase()}`;
  const cssUrl = `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;800&display=block&text=${encodeURIComponent(letters)}`;
  let css = await (await download(cssUrl, { headers: { 'User-Agent': BROWSER_UA } })).text();

  const fontUrls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)\s]+/g) || [])];
  if (!fontUrls.length) throw new Error('Google Fonts returned no font files');
  for (const url of fontUrls) {
    const bytes = Buffer.from(await (await download(url)).arrayBuffer());
    css = css.replaceAll(url, `data:font/woff2;base64,${bytes.toString('base64')}`);
  }
  return css;
}

function bannerHtml(fonts) {
  return `<!doctype html>
<meta charset="utf-8">
<style>
${fonts}
html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
body {
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse 75% 85% at 50% 50%, #ffffff 40%, ${BG_MAIN} 100%);
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.brand { display: flex; align-items: center; gap: ${px(10)}; }
.icon {
  flex-shrink: 0;
  width: ${px(34)};
  height: ${px(34)};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${px(9)};
  background: linear-gradient(135deg, #16a34a, #15803d);
  box-shadow: 0 ${px(4)} ${px(12)} rgba(22, 163, 74, 0.3);
}
.icon svg { width: ${px(16)}; height: ${px(16)}; fill: #ffffff; }
.words { display: flex; flex-direction: column; text-align: left; }
.text {
  font-size: ${px(20)};
  font-weight: 800;
  line-height: 1.15;
  color: ${PRIMARY_DARK};
  letter-spacing: ${px(-0.5)};
  white-space: nowrap;
}
.text span { color: ${PRIMARY}; }
.sub {
  margin-top: ${px(1)};
  font-size: ${px(10.24)};
  font-weight: 600;
  line-height: 1.2;
  color: ${TEXT_MUTED};
  text-transform: uppercase;
  letter-spacing: ${px(1.2)};
  white-space: nowrap;
}
</style>
<div class="brand">
  <div class="icon"><svg viewBox="0 0 512 512" aria-hidden="true"><path d="${LEAF_PATH}"/></svg></div>
  <div class="words">
    <div class="text">${WORDMARK[0]} <span>${WORDMARK[1]}</span></div>
    <div class="sub">${TAGLINE}</div>
  </div>
</div>`;
}

async function main() {
  const browser = findBrowser();
  const workDir = mkdtempSync(join(tmpdir(), 'otp-banner-'));
  try {
    const page = join(workDir, 'banner.html');
    writeFileSync(page, bannerHtml(await fontCss()));
    mkdirSync(dirname(OUTPUT), { recursive: true });

    execFileSync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${join(workDir, 'profile')}`,
      '--force-device-scale-factor=1',
      `--window-size=${WIDTH},${HEIGHT}`,
      '--virtual-time-budget=3000',
      `--screenshot=${OUTPUT}`,
      pathToFileURL(page).href,
    ], { stdio: 'pipe', timeout: 60_000 });
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch { /* the browser may still hold its profile */ }
  }

  const png = readFileSync(OUTPUT);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== WIDTH || height !== HEIGHT) {
    throw new Error(`The screenshot is ${width}x${height}, expected ${WIDTH}x${HEIGHT}`);
  }
  const kb = Math.round(png.length / 1024);
  console.log(`✅ ${OUTPUT} (${width}x${height}, ${kb} KB)`);
  if (png.length > MAX_BYTES) console.warn(`⚠️ Over ${MAX_BYTES / 1024} KB. WhatsApp will load it slowly on weak connections.`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
