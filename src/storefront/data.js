// Storefront catalogue data.
// Products are loaded dynamically from MongoDB via /api/products.

export const CROPS = [
  { id: 'all', name: 'All Crops', icon: 'fa-wheat-awn' },
  { id: 'Paddy/Rice', name: 'Paddy / Rice', icon: 'fa-seedling' },
  { id: 'Wheat', name: 'Wheat', icon: 'fa-wheat-awn' },
  { id: 'Cotton', name: 'Cotton', icon: 'fa-cloud' },
  { id: 'Tomato', name: 'Tomato', icon: 'fa-apple-whole' },
  { id: 'Corn', name: 'Corn / Maize', icon: 'fa-plant-wilt' },
  { id: 'Sugarcane', name: 'Sugarcane', icon: 'fa-cubes-stacked' },
  { id: 'Citrus', name: 'Citrus / Fruits', icon: 'fa-lemon' },
  { id: 'Grapes', name: 'Grapes', icon: 'fa-wine-glass-empty' },
  { id: 'Potato', name: 'Potato', icon: 'fa-circle-dot' },
]

export const DISEASES = [
  { id: 'all', name: 'All Diseases & Pests' },
  { id: 'Blast', name: 'Rice Blast & Sheath Blight' },
  { id: 'Blight', name: 'Early / Late Blight' },
  { id: 'Rust', name: 'Leaf Rust & Stripe Rust' },
  { id: 'Aphids', name: 'Aphids & Jassids' },
  { id: 'Whitefly', name: 'Whitefly & Thrips' },
  { id: 'Downy Mildew', name: 'Downy & Powdery Mildew' },
  { id: 'Caterpillars', name: 'Fruit Borer & Caterpillars' },
  { id: 'Stem Borer', name: 'Stem & Pink Borer' },
  { id: 'Weeds', name: 'Broadleaf & Grass Weeds' },
]

export const CATEGORIES = ['All', 'Fungicide', 'Insecticide', 'Bio-Stimulant', 'Herbicide', 'Nematicide']

// Fallback product image if product photo fails to load
export const FALLBACK_PRODUCT_IMAGE = '/assets/p1.webp'

export function productImage(product) {
  let src = String((product && product.image) || '').trim()
  // Uploads saved as an empty "data:image/png;base64," are not images.
  if (!src || /^data:image\/[\w+.-]+;base64,?$/i.test(src)) src = FALLBACK_PRODUCT_IMAGE
  return src.replace(/^\.\/assets\/(p[1-4])\.png$/, '/assets/$1.webp').replace(/^\.\/assets\//, '/assets/')
}

// Any product or basket image that fails to load shows the placeholder instead of broken-image alt text.
export function useFallbackImage(event) {
  const img = event.currentTarget
  if (img.dataset.fallbackApplied) return
  img.dataset.fallbackApplied = '1'
  img.src = FALLBACK_PRODUCT_IMAGE
}

// Products are managed exclusively via the admin panel and fetched live from the database.
// Empty array fallback — single source of truth from MongoDB.
export const PESTICIDES = []

export const SAMPLE_DISEASE_DIAGNOSES = [
  {
    keyword: 'blast',
    diseaseName: 'Rice Blast & Sheath Blight',
    cropDetected: 'Paddy / Rice',
    confidence: '98.2%',
    symptoms: 'Spindle-shaped lesions with greyish center and dark brown margin on leaves.',
    recommendedProduct: 'Sathya Bio BlastShield 75 WP (120g/acre)',
    productId: 'sb-01',
  },
  {
    keyword: 'whitefly',
    diseaseName: 'Whitefly & Aphid Infestation',
    cropDetected: 'Cotton / Tomato',
    confidence: '94.7%',
    symptoms: 'Yellowing of leaves, sticky honeydew secretion with black sooty mold.',
    recommendedProduct: 'Sathya Bio FlyKill Ultra (250g/acre)',
    productId: 'sb-02',
  },
  {
    keyword: 'blight',
    diseaseName: 'Early / Late Blight',
    cropDetected: 'Tomato / Potato',
    confidence: '96.4%',
    symptoms: 'Dark brown concentric rings on lower leaves.',
    recommendedProduct: 'Sathya Bio BlightStop Pro (500g/acre)',
    productId: 'sb-03',
  },
]

export const WHATSAPP_EXPERT_URL = 'https://wa.me/919442562423?text=Hello%20Sathya%20Bio%20Expert%2C%20I%20need%20crop%20advice'

export const rupees = value => `₹${Number(value || 0).toLocaleString('en-IN')}`
