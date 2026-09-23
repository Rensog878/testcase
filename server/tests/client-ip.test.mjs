// clientIp() feeds every per-IP rate limit (OTP sends, sign-in, orders). A
// client can put anything at the front of X-Forwarded-For, so only the entries
// our proxies append may count. Run from server/: npm test

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp } from '../http.js';

const req = (xff, socket = '10.0.0.1') => ({
  headers: xff === undefined ? {} : { 'x-forwarded-for': xff },
  socket: { remoteAddress: socket },
});

afterEach(() => { delete process.env.TRUSTED_PROXY_HOPS; });

test('one proxy (default): a faked leading entry is ignored', () => {
  assert.equal(clientIp(req('1.2.3.4, 203.0.113.9')), '203.0.113.9');
  assert.equal(clientIp(req('203.0.113.9')), '203.0.113.9');
});

test('changing the faked entry does not change the address', () => {
  assert.equal(clientIp(req('9.9.9.9, 203.0.113.9')), clientIp(req('8.8.8.8, 7.7.7.7, 203.0.113.9')));
});

test('two proxies: takes the entry the outer proxy appended', () => {
  process.env.TRUSTED_PROXY_HOPS = '2';
  assert.equal(clientIp(req('1.2.3.4, 203.0.113.9, 10.1.1.1')), '203.0.113.9');
});

test('no header, or hops 0: falls back to the socket', () => {
  assert.equal(clientIp(req(undefined)), '10.0.0.1');
  process.env.TRUSTED_PROXY_HOPS = '0';
  assert.equal(clientIp(req('1.2.3.4', '10.0.0.7')), '10.0.0.7');
});
