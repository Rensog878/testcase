/**
 * Catalog normalization utilities for Sathyam Bio
 * Provides resilient, typo-tolerant crop, category, and disease matching across Admin and Storefront.
 */

/**
 * Normalizes a crop string by stripping whitespace around slashes, lowercasing, and trimming.
 * e.g., "Paddy / Rice" -> "paddy/rice"
 *       "Paddy/Rice"   -> "paddy/rice"
 *       "Corn / Maize" -> "corn/maize"
 */
export function normalizeCrop(crop) {
  if (!crop) return ''
  return String(crop)
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')
}

/**
 * One crop, many names. A shop tags a product "Corn" while the filter tile
 * says "Maize", or tags "Rice" while the tile says "Paddy", and the two never
 * met: the names share no word, so a real product was invisible under the
 * crop its grower calls it. Each group below is one crop; the first name is
 * only the group's handle, not a preferred spelling - nothing is renamed on
 * screen. Kept to names that are the same crop in Indian agriculture, never
 * to ones that are merely related (sweet potato is not potato).
 */
const CROP_SYNONYM_GROUPS = [
  ['corn', 'maize', 'makka'],
  ['paddy', 'rice'],
  ['groundnut', 'peanut'],
  ['brinjal', 'eggplant', 'aubergine'],
  ['okra', 'lady finger', 'ladies finger', 'bhindi'],
  ['soybean', 'soyabean', 'soya'],
  ['sorghum', 'jowar'],
  ['pearl millet', 'bajra'],
  ['finger millet', 'ragi'],
  ['chickpea', 'bengal gram', 'chana'],
  ['pigeon pea', 'red gram', 'tur', 'arhar'],
  ['capsicum', 'bell pepper', 'shimla mirch'],
  ['chilli', 'chili', 'chillies', 'mirchi'],
  ['turmeric', 'haldi'],
  ['coriander', 'cilantro', 'dhania'],
]

const CROP_SYNONYM_OF = new Map()
for (const group of CROP_SYNONYM_GROUPS) {
  for (const name of group) CROP_SYNONYM_OF.set(name, group[0])
}

/**
 * The handle a single crop name belongs to - the name itself when it has no
 * other names. Input is one already-normalized name, not a "a / b" label.
 */
export function cropHandle(name) {
  const key = String(name || '').trim().toLowerCase()
  return CROP_SYNONYM_OF.get(key) || key
}

/** Every name in a crop label, as handles: "Corn / Maize" -> ['corn']. */
function cropHandles(value) {
  const norm = normalizeCrop(value)
  if (!norm) return []
  return [...new Set(norm.split('/').filter(Boolean).map(cropHandle))]
}

/**
 * Resilient check to determine if a product matches a target crop filter.
 * Handles variations like "Paddy / Rice" vs "Paddy/Rice" vs "Paddy".
 */
export function matchesCrop(productCrops, targetCrop) {
  if (!targetCrop || targetCrop.toLowerCase() === 'all' || targetCrop === 'all') return true
  if (!productCrops) return false

  const target = normalizeCrop(targetCrop)
  if (!target) return true
  const targetParts = cropHandles(targetCrop)

  const cropsList = Array.isArray(productCrops)
    ? productCrops
    : String(productCrops).split(',').map(s => s.trim())

  return cropsList.some(crop => {
    const norm = normalizeCrop(crop)
    if (!norm) return false
    if (norm === 'all crops') return true
    if (norm === target) return true
    // Sub-name matching, on handles, so "paddy" matches "paddy/rice" and
    // "Maize" matches a product tagged "Corn".
    const normParts = cropHandles(crop)
    return normParts.some(np => targetParts.includes(np)) || target.includes(norm) || norm.includes(target)
  })
}

/**
 * Resilient category comparison.
 */
export function matchesCategory(productCategory, filterCategory) {
  if (!filterCategory || filterCategory.toLowerCase() === 'all') return true
  if (!productCategory) return false

  const prod = String(productCategory).trim().toLowerCase()
  const filter = String(filterCategory).trim().toLowerCase()

  if (prod === filter) return true

  // Category synonyms / aliases
  if (filter === 'nutrients' || filter === 'crop nutrition' || filter === 'fertilizer') {
    return prod === 'crop nutrition' || prod === 'nutrients' || prod === 'fertilizer'
  }
  if (filter === 'growth promoters' || filter === 'bio-stimulant' || filter === 'bio-stimulants') {
    return prod === 'growth promoters' || prod === 'bio-stimulant' || prod === 'bio-stimulants'
  }
  if (filter === 'fungicides' || filter === 'fungicide') {
    return prod === 'fungicides' || prod === 'fungicide'
  }
  if (filter === 'insecticides' || filter === 'insecticide') {
    return prod === 'insecticides' || prod === 'insecticide'
  }
  if (filter === 'herbicides' || filter === 'herbicide') {
    return prod === 'herbicides' || prod === 'herbicide'
  }
  if (filter === 'nematicides' || filter === 'nematicide') {
    return prod === 'nematicides' || prod === 'nematicide'
  }

  return prod.includes(filter) || filter.includes(prod)
}

/**
 * Resilient disease / pest comparison.
 */
export function matchesDisease(productDiseases, filterDisease) {
  if (!filterDisease || filterDisease.toLowerCase() === 'all') return true
  if (!productDiseases) return false

  const filter = String(filterDisease).trim().toLowerCase()
  const list = Array.isArray(productDiseases)
    ? productDiseases
    : String(productDiseases).split(',').map(s => s.trim())

  return list.some(d => {
    const norm = String(d).trim().toLowerCase()
    return norm === filter || norm.includes(filter) || filter.includes(norm)
  })
}

/**
 * Collapses the crop registry's near-duplicates into one label each.
 *
 * /api/catalog-options is append-only, so it accumulates several spellings of
 * the same crop: "Paddy / Rice" beside "Paddy/Rice", "Corn / Maize" beside
 * "Corn". matchesCrop already treats them as the same crop, so they select the
 * same products - they only make the filter list look careless and split one
 * crop across two entries.
 *
 * Two labels are the same crop when they normalize identically, or when one is
 * a single name that appears as one of the other's names ("Corn" inside
 * "Corn / Maize"). The longer label wins, being the more descriptive of the
 * two. Labels that merely share a name - "Citrus / Fruits" and
 * "Grapes / Fruits" - are left alone: neither is a single name, so neither is
 * a spelling of the other.
 */
export function isSameCrop(a, b) {
  const left = normalizeCrop(a)
  const right = normalizeCrop(b)
  if (!left || !right) return false
  if (left === right) return true
  const leftParts = cropHandles(a)
  const rightParts = cropHandles(b)
  if (leftParts.length === 1) return rightParts.includes(leftParts[0])
  if (rightParts.length === 1) return leftParts.includes(rightParts[0])
  return false
}

export function dedupeCropLabels(crops) {
  const kept = []
  for (const raw of crops || []) {
    const label = String(raw || '').trim()
    if (!label || !normalizeCrop(label)) continue
    const existing = kept.findIndex(other => isSameCrop(other, label))
    if (existing === -1) kept.push(label)
    else if (label.length > kept[existing].length) kept[existing] = label
  }
  return kept
}
