// The wishlist's browser side, shared by /products, the product page and
// /wishlist. The server owns the list (GET/POST /api/wishlist): a signed-in
// customer by their token, a guest by the random visitor id below. The ids are
// also cached here so /products can draw its hearts before the server answers.

const VISITOR_KEY = 'sathya_wishlist_visitor'
const IDS_KEY = 'sathya_wishlist_ids'
const VISITOR_ID = /^visitor-[A-Za-z0-9-]{16,80}$/

// This browser's guest id, made on first use. The server ignores it when the
// request carries a sign-in token.
export function wishlistVisitorId(storage = globalThis.localStorage) {
  try {
    let id = storage.getItem(VISITOR_KEY) || ''
    if (!VISITOR_ID.test(id)) {
      const random = globalThis.crypto.randomUUID?.() || Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
      id = `visitor-${random}`
      storage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

export function cachedWishlistIds(storage = globalThis.localStorage) {
  try {
    const ids = JSON.parse(storage.getItem(IDS_KEY) || '[]')
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

export function cacheWishlistIds(ids, storage = globalThis.localStorage) {
  try { storage.setItem(IDS_KEY, JSON.stringify([...new Set(ids)])) } catch { /* private mode */ }
}

// One product saved or removed.
export function cacheWishlistItem(productId, saved, storage = globalThis.localStorage) {
  const ids = cachedWishlistIds(storage).filter(id => id !== productId)
  cacheWishlistIds(saved ? [...ids, productId] : ids, storage)
}

// The server's list (`data` from /api/wishlist) as product ids.
export const wishlistIdsFrom = items => (Array.isArray(items) ? items : []).map(item => item?.productId).filter(Boolean)
