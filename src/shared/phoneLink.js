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
