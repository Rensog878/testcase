/**
 * A product's physical form, for the "Form" filter and the card label.
 * Powder, Pellets and Tablets are the forms the client asked to filter by;
 * Granules, Liquid and Gel are what the rest of the catalogue is.
 *
 * product.form (set on the admin's Products Master form) wins. Without one,
 * other products are placed by what they are: sold in ml/litres -> Liquid,
 * named gel/jelly -> Gel, granules or a "- G" name -> Granules, and the words
 * tablet / pellet / powder (or WP, SP, WDG, WSG formulations) in the name.
 * '' when nothing says.
 *
 * PRODUCT_FORMS is the built-in six - the fallback used before the server's
 * catalogOptions.physicalForms (an admin-extendable, database-backed list
 * seeded with these same six; server/db.js DEFAULT_CATALOG_OPTIONS) has
 * loaded, and in tests, which have no server to ask. Every exported function
 * here takes that live list as an optional last argument; callers with one
 * (the admin form, the storefront filter) should always pass it, so a form an
 * admin has added is recognised as a real value, not dropped as unknown.
 */
export const PRODUCT_FORMS = ['Powder', 'Pellets', 'Tablets', 'Granules', 'Liquid', 'Gel']

const byName = (form, forms = PRODUCT_FORMS) => forms.find(f => f.toLowerCase() === String(form || '').trim().toLowerCase())

export function productForm(product, forms = PRODUCT_FORMS) {
  if (!product) return ''
  const stored = byName(product.form, forms)
  if (stored) return stored
  const name = `${product.name || ''} ${product.tagline || ''}`.toLowerCase()
  const packs = (product.packSizes || []).map(s => String(typeof s === 'object' ? s?.size : s).toLowerCase()).join(' ')
  if (/\btablets?\b/.test(name)) return 'Tablets'
  if (/\bpellets?\b/.test(name)) return 'Pellets'
  if (/\bgel\b|\bjelly\b/.test(name)) return 'Gel'
  if (/\bgranul|[\s–-]g$/.test(String(product.name || '').toLowerCase().trim())) return 'Granules'
  if (/\bml\b|\d\s*ml|litre|liter|\bltr\b|\d\s*l\b/.test(packs)) return 'Liquid'
  if (/\bpowder\b|\b(wp|sp|wdg|wsg|dp)\b/.test(name)) return 'Powder'
  return ''
}

// { form: count } over a product list, for the filter's option counts.
export function formCounts(products, forms = PRODUCT_FORMS) {
  const counts = Object.fromEntries(forms.map(f => [f, 0]))
  for (const p of products || []) {
    const f = productForm(p, forms)
    if (f) counts[f] = (counts[f] || 0) + 1
  }
  return counts
}

export const matchesForm = (product, form, forms = PRODUCT_FORMS) =>
  !form || form === 'all' || productForm(product, forms) === byName(form, forms)
