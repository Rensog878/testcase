// The OTP resend countdown runs to a deadline, so a timer that was throttled
// or paused (background tab, locked phone) shows the right number on waking.

import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createResendCountdown, resendLabel, resendWaitSeconds } from '../useResendCountdown.js';

let clock;
let ticks;
let done;
let countdown;

beforeEach(() => {
  clock = 1_700_000_000_000;
  ticks = [];
  done = 0;
  mock.method(Date, 'now', () => clock);
  mock.timers.enable({ apis: ['setInterval'] });
  globalThis.document = new EventTarget();
  countdown = createResendCountdown({ onTick: left => ticks.push(left), onDone: () => { done += 1; } });
});

afterEach(() => {
  countdown.halt();
  mock.timers.reset();
  mock.restoreAll();
  delete globalThis.document;
});

// Real time passing: the clock and the 250ms ticks move together.
function wait(ms) {
  for (let passed = 0; passed < ms; passed += 250) {
    clock += 250;
    mock.timers.tick(250);
  }
}

const readsOfTheClock = () => Date.now.mock.callCount();

test('starts at the server\'s wait and counts down once a second', () => {
  countdown.start(45);
  assert.deepEqual(ticks, [45]);
  wait(3000);
  assert.deepEqual(ticks, [45, 44, 43, 42]);
});

test('after the clock jumps 20s with no ticks, the next tick shows the right time', () => {
  countdown.start(45);
  clock += 20_000;
  assert.deepEqual(ticks, [45]);

  clock += 250;
  mock.timers.tick(250);
  // 45s - 20.25s = 24.75s, shown as 25.
  assert.deepEqual(ticks, [45, 25]);
});

test('coming back to the tab shows the right time without waiting for a tick', () => {
  countdown.start(45);
  clock += 20_000;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(ticks, [45, 25]);
});

test('reaches 0 exactly once, then stops', () => {
  countdown.start(30);
  clock += 60_000;
  wait(250);
  assert.deepEqual(ticks, [30, 0]);
  assert.equal(done, 1);

  const reads = readsOfTheClock();
  wait(5000);
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(readsOfTheClock(), reads, 'nothing runs after 0');
  assert.deepEqual(ticks, [30, 0]);
  assert.equal(done, 1);
});

test('counts all the way down and restarts cleanly', () => {
  countdown.start(3);
  wait(5000);
  assert.deepEqual(ticks, [3, 2, 1, 0]);
  assert.equal(done, 1);

  countdown.start(2);
  wait(2000);
  assert.deepEqual(ticks, [3, 2, 1, 0, 2, 1, 0]);
  assert.equal(done, 2);
});

test('starting again replaces the running countdown', () => {
  countdown.start(45);
  wait(5000);
  countdown.start(30);
  assert.equal(ticks.at(-1), 30);

  // One timer and one tab listener: each tick or tab return reads the clock once.
  let reads = readsOfTheClock();
  clock += 250;
  mock.timers.tick(250);
  assert.equal(readsOfTheClock() - reads, 1);
  reads = readsOfTheClock();
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(readsOfTheClock() - reads, 1);
});

test('clear stops the countdown and goes back to no code sent', () => {
  countdown.start(45);
  countdown.clear();
  assert.equal(ticks.at(-1), null);
  const reads = readsOfTheClock();
  wait(2000);
  assert.equal(readsOfTheClock(), reads);
});

test('without a number from the server the wait is 60s, never less', () => {
  for (const missing of [undefined, null, '', '45', NaN, Infinity, {}]) {
    assert.equal(resendWaitSeconds(missing), 60, String(missing));
  }
  countdown.start(undefined);
  assert.deepEqual(ticks, [60]);
});

test('server waits are whole seconds within a sane range', () => {
  assert.equal(resendWaitSeconds(45), 45);
  assert.equal(resendWaitSeconds(44.2), 45);
  assert.equal(resendWaitSeconds(0), 1);
  assert.equal(resendWaitSeconds(-5), 1);
  assert.equal(resendWaitSeconds(3600), 3600);
  assert.equal(resendWaitSeconds(99_999), 3600);
});

test('the label counts seconds, or minutes for an hourly limit', () => {
  assert.equal(resendLabel(45), 'Resend in 45s');
  assert.match(resendLabel(45), /^Resend in (\d+)s$/, 'the wording the language packs translate');
  assert.equal(resendLabel(60), 'Resend in 60s');
  assert.equal(resendLabel(61), 'Try again in 2 min');
  assert.equal(resendLabel(3600), 'Try again in 60 min');
  assert.match(resendLabel(3600), /^Try again in (\d+) min$/);
  assert.equal(resendLabel(0), 'Resend code');
  assert.equal(resendLabel(null), 'Resend code');
});
