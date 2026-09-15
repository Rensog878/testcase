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
 * Resilient check to determine if a product matches a target crop filter.
 * Handles variations like "Paddy / Rice" vs "Paddy/Rice" vs "Paddy".
 */
export function matchesCrop(productCrops, targetCrop) {
  if (!targetCrop || targetCrop.toLowerCase() === 'all' || targetCrop === 'all') return true
  if (!productCrops) return false

  const target = normalizeCrop(targetCrop)
  if (!target) return true

  const cropsList = Array.isArray(productCrops)
    ? productCrops
    : String(productCrops).split(',').map(s => s.trim())

  return cropsList.some(crop => {
    const norm = normalizeCrop(crop)
    if (!norm) return false
    if (norm === 'all crops') return true
    if (norm === target) return true
    // Sub-segment matching (e.g. "paddy" matches "paddy/rice")
    const normParts = norm.split('/')
    const targetParts = target.split('/')
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
