/**
 * When two products are "the same product" for the catalogue: one name, once.
 * The store lists every product to everyone (a product recommended to one
 * farmer is only sorted first for them), so two products with one name show
 * twice. Used by Admin → Products while typing and by the server on publish.
 *
 * Names are compared ignoring capitals, punctuation, spacing and the shop's
 * own brand in front: "Sathyam Agro Mart WeedClear 24-D" = "weedclear 24 d".
 */
// Longest first, so "sathyam agro mart x" loses the whole brand, not just "sathyam".
const BRAND_PREFIXES = ['sathyam agro mart', 'sathyam bio', 'sathya bio', 'sathyam']

export function productNameKey(name) {
  const plain = String(name ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
  if (BRAND_PREFIXES.includes(plain)) return plain // the brand alone is a name, not a prefix
  const brand = BRAND_PREFIXES.find(prefix => plain.startsWith(`${prefix} `))
  return brand ? plain.slice(brand.length).trim() : plain
}

// The product already using this name, other than `exceptId` (the one being
// edited), or null.
export function findSameNamedProduct(products, name, exceptId) {
  const key = productNameKey(name)
  if (!key) return null
  return (products || []).find(p => p && String(p.id ?? p._id) !== String(exceptId ?? '') && productNameKey(p.name) === key) || null
}

// Groups of products sharing a name: { key: [product, ...] } for keys with more than one.
export function duplicateNameGroups(products) {
  const groups = {}
  for (const p of products || []) {
    const key = productNameKey(p?.name)
    if (key) (groups[key] ||= []).push(p)
  }
  return Object.fromEntries(Object.entries(groups).filter(([, list]) => list.length > 1))
}
