// A visitor's name and mobile number, required by the "Stay connected" card
// (sections/GuestContactPrompt.jsx) before they have an account. Kept on this
// device only, so the sign-in card can fill them in later: the number on its
// first step, the name on "Your details". Nothing is sent to the server here;
// the number is proved by the WhatsApp code at sign-in, as always.

const CONTACT_KEY = 'sb_guest_contact'

export const MOBILE_RE = /^[6-9]\d{9}$/

export function readGuestContact() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONTACT_KEY) || 'null')
    if (!saved) return null
    const name = String(saved.name || '').trim().slice(0, 80)
    const phone = String(saved.phone || '').replace(/\D/g, '')
    return MOBILE_RE.test(phone) ? { name, phone } : null
  } catch {
    return null
  }
}

export function saveGuestContact({ name, phone }) {
  try {
    localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: String(name).trim(), phone, savedAt: Date.now() }))
  } catch { /* private mode: the card simply asks again next visit */ }
}

