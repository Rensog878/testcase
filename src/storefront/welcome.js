// The welcome celebration shown once a farmer has signed in. The flag goes in
// sessionStorage as well as an event, so a sign-in on /login that navigates to
// the store still gets it once StorePopups mounts there.

export const WELCOME_KEY = 'sb_welcome_pending'
export const WELCOME_EVENT = 'sb:welcome'

export function celebrateSignIn(user) {
  const detail = { name: String(user?.name || '').trim() }
  try { sessionStorage.setItem(WELCOME_KEY, JSON.stringify(detail)) } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(WELCOME_EVENT, { detail }))
}

export function takePendingWelcome() {
  try {
    const raw = sessionStorage.getItem(WELCOME_KEY)
    if (!raw) return null
    sessionStorage.removeItem(WELCOME_KEY)
    return JSON.parse(raw)
  } catch {
    return null
  }
}
