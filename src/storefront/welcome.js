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

// Where a farmer lands after signing in or creating an account: the home page,
// on a phone and on a desktop alike. It used to be the categories listing,
// which dropped someone who had just signed in straight into a filtered
// catalogue with none of the home page's context — the welcome, the offers,
// the advice. Same path for every screen size, so there is no device branch
// here to keep in step.
export function farmerLandingPath() {
  return '/'
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
