// The shop's number when the CMS has none (admin CMS field "phone").
export const SUPPORT_PHONE = '+91-8778613372'

/**
 * An Indian mobile as its 10 digits, or null. The same rule as normalizePhone()
 * in server/server.js, so the checkout refuses exactly what the server refuses:
 * "98765 43210" and "+91 98765 43210" pass; "0 98765 43210" and "12345 67890"
 * do not.
 */
export function normalizeIndianMobile(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (/^[6-9]\d{9}$/.test(digits)) return digits
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2)
  return null
}

/**
 * A tel: link for the shop's number as the admin typed it in the CMS:
 * "+91 94432 10987" -> "tel:+919443210987", "94432 10987" -> "tel:+919443210987",
 * "1800-425-9999" -> "tel:18004259999" (toll-free numbers are dialled as is).
 * Returns '' when there is nothing dialable.
 */
export function telHref(value) {
  const raw = String(value ?? '').trim()
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 6 || digits.length > 15) return ''
  if (raw.startsWith('+')) return `tel:+${digits}`
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `tel:+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `tel:+${digits}`
  return `tel:${digits}`
}
