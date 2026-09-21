/**
 * The sign-in code in text a farmer copied from WhatsApp: the code alone
 * ("260024", "260 024") or the whole message ("Your code: *260024* ...").
 * Returns the six digits, or '' when there is no code or more than one
 * different one (guessing would sign in with the wrong code).
 */
export function otpFromText(text) {
  const value = String(text ?? '').slice(0, 2000)
  const bare = value.replace(/[\s-]/g, '')
  if (/^\d{6}$/.test(bare)) return bare
  const codes = new Set(value.match(/(?<!\d)\d{6}(?!\d)/g) || [])
  return codes.size === 1 ? [...codes][0] : ''
}
