// Refer & Earn links: sathyamagromart.com/?ref=SAMXXXXXX. The code is kept
// for 30 days so a friend who opens the link today and signs up next week
// still gets it filled in. The server checks every code again at signup;
// this only saves typing.

const KEY = 'sathya_ref'
const KEEP_MS = 30 * 24 * 60 * 60 * 1000
const CODE = /^SAM[A-HJKMNP-Z2-9]{6}$/

// Same rule as server/referrals.js normalizeReferralCode.
export function normalizeReferralCode(raw) {
  const code = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return CODE.test(code) ? code : ''
}

function safeStorage(win) {
  try { return win.localStorage } catch { return null }
}

// Saves ?ref= from the address bar and removes it, so the code does not stay
// in links the visitor copies onward. Returns the code, or ''.
export function captureReferralFromUrl(win = window, now = Date.now()) {
  let url
  try { url = new URL(win.location.href) } catch { return '' }
  if (!url.searchParams.has('ref')) return ''
  const code = normalizeReferralCode(url.searchParams.get('ref'))
  url.searchParams.delete('ref')
  try { win.history.replaceState(win.history.state, '', `${url.pathname}${url.search}${url.hash}`) } catch { /* keep going */ }
  if (!code) return ''
  try { safeStorage(win)?.setItem(KEY, JSON.stringify({ code, savedAt: now })) } catch { /* private mode */ }
  return code
}

export function storedReferralCode(win = window, now = Date.now()) {
  try {
    const saved = JSON.parse(safeStorage(win)?.getItem(KEY) || 'null')
    if (!saved || now - Number(saved.savedAt) > KEEP_MS) return ''
    return normalizeReferralCode(saved.code)
  } catch {
    return ''
  }
}

export function forgetReferralCode(win = window) {
  try { safeStorage(win)?.removeItem(KEY) } catch { /* nothing to do */ }
}

export function referralShareUrl(code, origin) {
  return `${origin}/?ref=${encodeURIComponent(code)}`
}

// The WhatsApp message a farmer sends a friend.
export function referralShareText({ code, url, welcomeDiscount, minOrder }) {
  return `I buy my crop care products from Sathyam Agro Mart. Join with my code ${code} and get ₹${welcomeDiscount} off your first order of ₹${minOrder} or more: ${url}`
}
