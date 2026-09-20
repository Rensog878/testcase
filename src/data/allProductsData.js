// Products are managed exclusively via the admin panel and fetched live from the database.
// No hardcoded products — admin adds real products from /admin/products.

export const SHOP_CATEGORIES = [
  { id: 'offers', name: 'Offers', iconText: '%', bg: '#dcfce7', border: '#86efac', textColor: '#15803d', image: 'https://media.bighaat.com/categories/Offers_icon.webp', filterCategory: 'Offers' },
  { id: 'urban-gardening', name: 'Urban Gardening', bg: '#e0f2fe', border: '#7dd3fc', textColor: '#0369a1', image: 'https://media.bighaat.com/categories/urban_garden_seeds_ct.webp', filterCategory: 'Urban Gardening' },
  { id: 'sprayers', name: 'Sprayers', bg: '#fef3c7', border: '#fde047', textColor: '#a16207', image: 'https://media.bighaat.com/categories/sprayers_ct.webp', filterCategory: 'Equipments' },
  { id: 'insecticides', name: 'Insecticides', bg: '#ccfbf1', border: '#5eead4', textColor: '#0f766e', image: 'https://media.bighaat.com/categories/insecticides_ct.webp', filterCategory: 'Insecticide' },
  { id: 'herbicides', name: 'Herbicides', bg: '#ffedd5', border: '#fdba74', textColor: '#c2410c', image: 'https://media.bighaat.com/categories/herbicides_ct.webp', filterCategory: 'Herbicide' },
  { id: 'nutrients', name: 'Nutrients', bg: '#fce7f3', border: '#f472b6', textColor: '#be185d', image: 'https://media.bighaat.com/categories/crop_nutrition_ct.webp', filterCategory: 'Crop Nutrition' },
  { id: 'fungicides', name: 'Fungicides', bg: '#e0e7ff', border: '#a5b4fc', textColor: '#4338ca', image: 'https://media.bighaat.com/categories/fungicides_ct.webp', filterCategory: 'Fungicide' },
  { id: 'vegetable-seeds', name: 'Vegetable & Fruit Seeds', bg: '#fef9c3', border: '#fde047', textColor: '#854d0e', image: 'https://media.bighaat.com/categories/Vegetable.webp', filterCategory: 'Seeds' },
  { id: 'growth-promoters', name: 'Growth Promoters', bg: '#f3e8ff', border: '#d8b4fe', textColor: '#7e22ce', image: 'https://media.bighaat.com/categories/plant_growth_promotors_ct.webp', filterCategory: 'Growth Promoters' },
  { id: 'farm-machinery', name: 'Farm Machinery', bg: '#dcfce7', border: '#4ade80', textColor: '#166534', image: 'https://media.bighaat.com/categories/tiller_ct.webp', filterCategory: 'Equipments' },
  { id: 'flower-seeds', name: 'Flower Seeds', bg: '#ffe4e6', border: '#fda4af', textColor: '#be123c', image: 'https://media.bighaat.com/categories/Flowers.webp', filterCategory: 'Seeds' },
  { id: 'animal-husbandry', name: 'Animal Husbandry', bg: '#fef08a', border: '#facc15', textColor: '#713f12', image: 'https://media.bighaat.com/categories/cattle_feed_ct.webp', filterCategory: 'Animal Husbandry' }
];

// Empty arrays — products come from the database only
// The rails these once held are built from the live catalogue in
// AllProducts.jsx (top10PicksList, todaysOffersList, bestSellingList,
// growthPromotersList). They were left here as empty arrays, and
// "Best Selling" still read from one - which is why that section rendered a
// heading and an empty carousel on every device. Nothing imports them now.

export const CROPS_LIST = [
  { id: 'chilli', name: 'Green Chilli', cropCode: 'Chilli', image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=240&auto=format&fit=crop&q=80', popularIssues: 'Thrips, Mites, Fruit Rot, Dieback' },
  { id: 'tomato', name: 'Tomato', cropCode: 'Tomato', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=240&auto=format&fit=crop&q=80', popularIssues: 'Early/Late Blight, Pinworm, Leaf Miner' },
  { id: 'paddy', name: 'Paddy', cropCode: 'Paddy', image: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?w=240&auto=format&fit=crop&q=80', popularIssues: 'Blast, Brown Plant Hopper, Stem Borer' },
  { id: 'cotton', name: 'Cotton', cropCode: 'Cotton', image: 'https://images.unsplash.com/photo-1634337781106-4c6a12b820a1?w=240&auto=format&fit=crop&q=80', popularIssues: 'Whitefly, Pink Bollworm, Jassids' },
  { id: 'brinjal', name: 'Brinjal', cropCode: 'Brinjal', image: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=240&auto=format&fit=crop&q=80', popularIssues: 'Shoot & Fruit Borer, Little Leaf' },
  { id: 'beans', name: 'Beans', cropCode: 'Beans', image: 'https://images.unsplash.com/photo-1551893478-d726eaf0442c?w=240&auto=format&fit=crop&q=80', popularIssues: 'Pod Borer, Rust, Yellow Mosaic' },
  { id: 'bitter-gourd', name: 'Bitter gourd', cropCode: 'Bitter gourd', image: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=240&auto=format&fit=crop&q=80', popularIssues: 'Fruit Fly, Downy Mildew, Powdery Mildew' },
  { id: 'marigold', name: 'Marigold', cropCode: 'Marigold', image: 'https://images.unsplash.com/photo-1590595906931-81f04f0ccebb?w=240&auto=format&fit=crop&q=80', popularIssues: 'Botrytis Blight, Red Spider Mite' },
  { id: 'sugarcane', name: 'Sugarcane', cropCode: 'Sugarcane', image: 'https://images.unsplash.com/photo-1719424668314-a0def541377b?w=240&auto=format&fit=crop&q=80', popularIssues: 'Early Shoot Borer, Red Rot' },
  { id: 'maize', name: 'Maize / Corn', cropCode: 'Maize', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=240&auto=format&fit=crop&q=80', popularIssues: 'Fall Armyworm, Stem Borer' },
  { id: 'wheat', name: 'Wheat', cropCode: 'Wheat', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=240&auto=format&fit=crop&q=80', popularIssues: 'Yellow Rust, Karnal Bunt' },
  { id: 'potato', name: 'Potato', cropCode: 'Potato', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=240&auto=format&fit=crop&q=80', popularIssues: 'Late Blight, Black Scurf, Tuber Moth' }
];

// Canonical pest/disease taxonomy shared by every storefront surface (the
// "Shop by Pest & Disease" tiles here and the Catalog sidebar dropdown in
// src/storefront/data.js, which re-exports this list). `matchValue` is the
// exact string compared against a product's `diseases` array via
// matchesDisease() in src/utils/catalogUtils.js and is also what admins type
// into the "Target Pests / Diseases" field on the product form — keep the two
// in sync (server/db.js DEFAULT_CATALOG_OPTIONS.diseases mirrors these values).
export const PESTS_AND_DISEASES = [
  { id: 'blast', name: 'Rice Blast', subtitle: 'Sheath & Neck Blast', matchValue: 'Blast', image: 'https://media.bighaat.com/categories/fungicides_ct.webp', cureCategory: 'Fungicide' },
  { id: 'rust', name: 'Leaf & Stripe Rust', matchValue: 'Rust', image: 'https://media.bighaat.com/categories/fungicides_ct.webp', cureCategory: 'Fungicide' },
  { id: 'blight', name: 'Early / Late Blight', matchValue: 'Blight', image: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=240&auto=format&fit=crop&q=80', cureCategory: 'Fungicide' },
  { id: 'downy-powdery-mildew', name: 'Downy & Powdery Mildew', matchValue: 'Downy Mildew', image: 'https://media.bighaat.com/categories/fungicides_ct.webp', cureCategory: 'Fungicide' },
  { id: 'leaf-miner', name: 'Leaf Miner', matchValue: 'Leaf Miner', image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=240&auto=format&fit=crop&q=80', cureCategory: 'Insecticide' },
  { id: 'pin-worm', name: 'American Pin worm', subtitle: '(Tomato Leaf Miner)', matchValue: 'Pinworm', image: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=240&auto=format&fit=crop&q=80', cureCategory: 'Insecticide' },
  { id: 'leaf-hoppers', name: 'Leaf hoppers', subtitle: '(Plant hoppers)', matchValue: 'Leaf hopper', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=240&auto=format&fit=crop&q=80', cureCategory: 'Insecticide' },
  { id: 'thrips', name: 'Thrips', matchValue: 'Thrips', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=240&auto=format&fit=crop&q=80', cureCategory: 'Insecticide' },
  { id: 'mites', name: 'Mites', subtitle: 'Bangamia, White, Broad & Two-spotted mites', matchValue: 'Mites', image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=240&auto=format&fit=crop&q=80', cureCategory: 'Insecticide' },
  { id: 'aphids', name: 'Aphids', subtitle: 'Aphids & Jassids', matchValue: 'Aphids', image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=240&auto=format&fit=crop&q=80', cureCategory: 'Insecticide' },
  { id: 'whitefly', name: 'Whitefly', subtitle: 'Whitefly & Thrips', matchValue: 'Whitefly', image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=240&auto=format&fit=crop&q=80', cureCategory: 'Insecticide' },
  { id: 'stem-borer', name: 'Stem & Pink Borer', matchValue: 'Stem Borer', image: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=240&auto=format&fit=crop&q=80', cureCategory: 'Insecticide' },
  { id: 'weeds', name: 'Broadleaf & Grass Weeds', matchValue: 'Weeds', image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=240&auto=format&fit=crop&q=80', cureCategory: 'Herbicide' }
];

// `matchKeywords` lets each tile filter for its own nutrient type (checked
// against a product's name/description/category in AllProducts.jsx) instead
// of every tile falling back to the same generic "Crop Nutrition" query.
export const NUTRIENTS_LIST = [
  { id: 'npk-complex', name: 'NPK Water Soluble', formula: '19:19:19 / 0:52:34 / 12:61:0', image: 'https://media.bighaat.com/categories/npk_fertilisers_ct.png', benefit: 'Fast vegetative & flowering growth', matchKeywords: ['npk', 'water soluble', '19:19:19', '52:34', '12:61'] },
  { id: 'micronutrients', name: 'Micro Nutrients Mix', formula: 'Zn, Fe, Mn, Cu, B, Mo Grade-II', image: 'https://media.bighaat.com/categories/micro_nutrients_ct.webp', benefit: 'Overcomes mineral deficiencies', matchKeywords: ['micronutrient', 'micro nutrient', 'zinc', 'manganese', 'trace element'] },
  { id: 'humic-acid', name: 'Humic & Fulvic Acid', formula: '100% Organic Potassium Humate', image: 'https://media.bighaat.com/categories/humic_acid_ct.webp', benefit: 'Strong root aeration & CEC', matchKeywords: ['humic', 'fulvic', 'humate'] },
  { id: 'bio-fertilizers', name: 'Bio / Organic Fertilizers', formula: 'Azotobacter, PSB, KMB & VAM', image: 'https://media.bighaat.com/categories/bio_organic_fertilisers_ct.webp', benefit: 'Fixes atmospheric nitrogen & phosphorus', matchKeywords: ['bio fertilizer', 'bio-fertilizer', 'organic fertilizer', 'azotobacter', 'psb', 'vam'] },
  { id: 'seaweed-extract', name: 'Seaweed Liquid Extract', formula: 'Ascophyllum Nodosum Organic', image: 'https://media.bighaat.com/categories/seaweed_extract_ct.png', benefit: 'Heat & moisture stress resistance', matchKeywords: ['seaweed', 'ascophyllum'] },
  { id: 'ph-balancers', name: 'pH Balancers & Conditioners', formula: 'Acidic Spray Water Conditioner', image: 'https://media.bighaat.com/categories/ph_balancers_ct.webp', benefit: 'Enhances pesticide absorption by 40%', matchKeywords: ['ph balancer', 'ph conditioner', 'water conditioner', 'acidifier'] },
  { id: 'calcium-boron', name: 'Calcium & Boron Liquid', formula: 'Chelated Ca 11% + B 2%', image: 'https://media.bighaat.com/categories/chemical_fertilisers_ct.webp', benefit: 'Prevents fruit cracking & flower drop', matchKeywords: ['calcium', 'boron', 'chelated ca', 'chelated b'] }
];
