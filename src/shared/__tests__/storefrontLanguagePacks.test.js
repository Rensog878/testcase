// The storefront language packs (public/js/lang-*.js) are plain browser
// scripts. Tamil is the reference: every other pack must translate exactly the
// same keys, page texts and patterns, in its own script, with nothing blank.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const PACKS = {
  ta: { global: 'SB_LANG_TA', script: /[஀-௿]/ },
  kn: { global: 'SB_LANG_KN', script: /[ಀ-೿]/ },
  te: { global: 'SB_LANG_TE', script: /[ఀ-౿]/ },
  hi: { global: 'SB_LANG_HI', script: /[ऀ-ॿ]/ },
};
const OTHER_SCRIPTS = /[ऀ-ॿ஀-௿ఀ-౿ಀ-೿ഀ-ൿ]/g;

function loadPack(code) {
  const source = fs.readFileSync(new URL(`../../../public/js/lang-${code}.js`, import.meta.url), 'utf8');
  const window = {};
  vm.runInNewContext(source, { window });
  const pack = window[PACKS[code].global];
  assert.ok(pack, `lang-${code}.js defines window.${PACKS[code].global}`);
  return pack;
}

const packs = Object.fromEntries(Object.keys(PACKS).map(code => [code, loadPack(code)]));
const reference = packs.ta;
const groupsIn = replacement => [...replacement.matchAll(/\$(\d)/g)].map(match => match[1]).sort();

for (const [code, pack] of Object.entries(packs)) {
  test(`${code}: same keys, page texts and patterns as Tamil`, () => {
    assert.deepEqual(Object.keys(pack.keys).sort(), Object.keys(reference.keys).sort());
    assert.deepEqual(Object.keys(pack.text).sort(), Object.keys(reference.text).sort());
    // Array.from: arrays made inside the sandbox fail a strict comparison with ours.
    const sources = patterns => Array.from(patterns, ([pattern]) => pattern.source);
    assert.deepEqual(sources(pack.patterns), sources(reference.patterns));
    pack.patterns.forEach(([pattern, replacement], index) => {
      assert.deepEqual(groupsIn(replacement), groupsIn(reference.patterns[index][1]), `pattern ${pattern} keeps its numbers`);
    });
    assert.equal(typeof pack.languageChanged, 'string');
  });

  test(`${code}: nothing blank, and written in its own script`, () => {
    const values = [...Object.values(pack.keys), ...Object.values(pack.text), ...pack.patterns.map(([, replacement]) => replacement), pack.languageChanged];
    const own = PACKS[code].script;
    let inScript = 0;
    for (const value of values) {
      assert.ok(typeof value === 'string' && value.trim(), `blank value in ${code}`);
      const foreign = (value.match(OTHER_SCRIPTS) || []).filter(char => !own.test(char));
      assert.deepEqual(foreign, [], `"${value}" mixes in another Indian script`);
      if (own.test(value)) inScript += 1;
    }
    // A few values are only symbols or codes ("/", "24/7 ...", "UPI / ...").
    assert.ok(inScript / values.length > 0.97, `${code}: ${inScript} of ${values.length} values use the script`);
  });
}

test('patterns fill in the numbers in every language', () => {
  for (const [code, pack] of Object.entries(packs)) {
    const find = source => pack.patterns.find(([pattern]) => pattern.source === source);
    const [resend, resendText] = find('^Resend in (\\d+)s$');
    assert.match('Resend in 28s'.replace(resend, resendText), /28/, code);
    const [minutes, minutesText] = find('^Try again in (\\d+) min$');
    assert.match('Try again in 12 min'.replace(minutes, minutesText), /12/, code);
    const [digits, digitsText] = find('^Enter all 10 digits \\((\\d+)\\/10$');
    assert.match('Enter all 10 digits (3/10'.replace(digits, digitsText), /\(3\/10$/, code);
  }
});

// Read out to screen readers by the OTP forms (src/shared/useResendCountdown.js).
test('the OTP resend announcements are translated in every language', () => {
  for (const [code, pack] of Object.entries(packs)) {
    assert.ok(pack.text['Code sent on WhatsApp'], code);
    assert.ok(pack.text['You can resend the code now'], code);
  }
});
