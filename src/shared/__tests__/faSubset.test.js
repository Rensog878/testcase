// The store ships only the Font Awesome icons it uses (public/assets/fa, built
// by scripts/fa-subset.py). An icon added to the code but not to the subset
// would render as an empty box, so this fails until the script is re-run.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const FA = path.join(ROOT, 'public/assets/fa');
const manifest = JSON.parse(fs.readFileSync(path.join(FA, 'icons.json'), 'utf8'));
const css = fs.readFileSync(path.join(FA, 'fa-subset.css'), 'utf8');

function* sources() {
  const walk = function* (dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== '__tests__') yield* walk(full) }
      else if (/\.(js|jsx|css|html)$/.test(entry.name)) yield full;
    }
  };
  yield* walk(path.join(ROOT, 'src'));
  yield* walk(path.join(ROOT, 'public/js'));
  yield path.join(ROOT, 'index.html');
}

const RERUN = 'run: python scripts/fa-subset.py';

test('every fa-* name in the code is in the subset', () => {
  const missing = new Set();
  for (const file of sources()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [name] of text.matchAll(/\bfa-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
      const known = Object.hasOwn(manifest.icons, name) || new RegExp(`[.-]${name.slice(3)}\\b|--${name}\\b|\\.${name}\\b`).test(css);
      if (!known) missing.add(`${name} (${path.relative(ROOT, file)})`);
    }
  }
  assert.deepEqual([...missing], [], `icons missing from the subset - ${RERUN}`);
});

test('every glyph drawn from CSS content is in the subset', () => {
  const missing = new Set();
  for (const file of sources()) {
    if (!file.endsWith('.css')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const [, cp] of text.matchAll(/content:\s*["']\\(f[0-9a-f]{3})["']/gi)) {
      if (!manifest.codepoints.includes(cp.toLowerCase())) missing.add(`\\${cp} (${path.relative(ROOT, file)})`);
    }
  }
  assert.deepEqual([...missing], [], `glyphs missing from the subset - ${RERUN}`);
});

test('index.html loads the self-hosted subset, not the full CDN file', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /\/assets\/fa\/fa-subset\.css/);
  assert.doesNotMatch(html, /font-awesome\/[\d.]+\/css\/all\.min\.css/);
});
