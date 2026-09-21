/**
 * Builds public/assets/whatsapp-otp-banner.png, the image the sign-up code is
 * sent under on WhatsApp.
 *
 * It centres the full brand logo (public/assets/brand/logo-full.png) on a
 * white banner and screenshots it with headless Chrome or Edge.
 *
 *   node server/scripts/build-otp-banner.mjs [output.png]
 *
 * Needs Chrome or Edge (set CHROME_PATH if it is not found).
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
const MAX_BYTES = 300 * 1024;

const LOGO_FILE = resolve(ROOT, 'public/assets/brand/logo-full.png');
const LOGO_URL = `data:image/png;base64,${readFileSync(LOGO_FILE).toString('base64')}`;

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

function bannerHtml() {
  return `<!doctype html>
<meta charset="utf-8">
<style>
html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #ffffff; }
body { display: flex; align-items: center; justify-content: center; }
img { height: ${HEIGHT - 80}px; width: auto; }
</style>
<img src="${LOGO_URL}" alt="" />`;
}

async function main() {
  const browser = findBrowser();
  const workDir = mkdtempSync(join(tmpdir(), 'otp-banner-'));
  try {
    const page = join(workDir, 'banner.html');
    writeFileSync(page, bannerHtml());
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
  // WhatsApp caches images by URL: the new file needs a new address.
  const version = (await import('node:crypto')).createHash('sha256').update(readFileSync(OUTPUT)).digest('hex').slice(0, 12);
  console.log(`   Set OTP_BANNER_VERSION = '${version}' in server/otpTemplates.js`);
  if (png.length > MAX_BYTES) console.warn(`⚠️ Over ${MAX_BYTES / 1024} KB. WhatsApp will load it slowly on weak connections.`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
