// A random id for this browser, used to tie guest contact and location
// reports together server-side without any personal data in the id itself.

const VISITOR_KEY = 'sb_visitor_id'

export function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = `v_${(crypto.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}`
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}
