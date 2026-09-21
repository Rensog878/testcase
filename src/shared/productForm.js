/**
 * A product's physical form, for the "Form" filter and the card label.
 * Powder, Pellets and Tablets are the forms the client asked to filter by;
 * Granules, Liquid and Gel are what the rest of the catalogue is.
 *
 * product.form (set in the database) wins. Until Admin has a field for it,
 * other products are placed by what they are: sold in ml/litres -> Liquid,
 * named gel/jelly -> Gel, granules or a "- G" name -> Granules, and the words
 * tablet / pellet / powder (or WP, SP, WDG, WSG formulations) in the name.
 * '' when nothing says.
 */
export const PRODUCT_FORMS = ['Powder', 'Pellets', 'Tablets', 'Granules', 'Liquid', 'Gel']

const byName = form => PRODUCT_FORMS.find(f => f.toLowerCase() === String(form || '').trim().toLowerCase())

export function productForm(product) {
  if (!product) return ''
  const stored = byName(product.form)
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
export function formCounts(products) {
  const counts = Object.fromEntries(PRODUCT_FORMS.map(f => [f, 0]))
  for (const p of products || []) {
    const f = productForm(p)
    if (f) counts[f] += 1
  }
  return counts
}

export const matchesForm = (product, form) => !form || form === 'all' || productForm(product) === byName(form)
