/* Sathya Bio - Complete Unified E-Commerce Engine (CORS & file:// Compatible) */

// --- DATA STORE ---
const CROPS = [
  { id: 'all', name: 'All Crops', icon: 'fa-wheat-awn' },
  { id: 'Paddy/Rice', name: 'Paddy / Rice', icon: 'fa-seedling' },
  { id: 'Wheat', name: 'Wheat', icon: 'fa-wheat-awn' },
  { id: 'Cotton', name: 'Cotton', icon: 'fa-cloud' },
  { id: 'Tomato', name: 'Tomato', icon: 'fa-apple-whole' },
  { id: 'Corn', name: 'Corn / Maize', icon: 'fa-plant-wilt' },
  { id: 'Sugarcane', name: 'Sugarcane', icon: 'fa-cubes-stacked' },
  { id: 'Citrus', name: 'Citrus / Fruits', icon: 'fa-lemon' },
  { id: 'Grapes', name: 'Grapes', icon: 'fa-wine-glass-empty' },
  { id: 'Potato', name: 'Potato', icon: 'fa-circle-dot' }
];

const DISEASES = [
  { id: 'all', name: 'All Diseases & Pests' },
  { id: 'Blast', name: 'Rice Blast & Sheath Blight' },
  { id: 'Blight', name: 'Early / Late Blight' },
  { id: 'Rust', name: 'Leaf Rust & Stripe Rust' },
  { id: 'Aphids', name: 'Aphids & Jassids' },
  { id: 'Whitefly', name: 'Whitefly & Thrips' },
  { id: 'Downy Mildew', name: 'Downy & Powdery Mildew' },
  { id: 'Caterpillars', name: 'Fruit Borer & Caterpillars' },
  { id: 'Stem Borer', name: 'Stem & Pink Borer' },
  { id: 'Weeds', name: 'Broadleaf & Grass Weeds' }
];

const CATEGORIES = [
  'All',
  'Fungicide',
  'Insecticide',
  'Bio-Stimulant',
  'Herbicide',
  'Nematicide'
];

// Product rows in the database still carry the original ./assets/pN.png paths,
// which are 1024x1024 JPEGs of roughly 430KB each. The .webp copies beside them
// are the same pictures at the size they are actually displayed, ~12KB. Map the
// bundled defaults across as they are rendered so stored rows get the small
// file without a data migration; anything else (a CMS upload, a remote URL) is
// passed through untouched.
const FALLBACK_PRODUCT_IMAGE = './assets/p1.webp';

function productImage(product) {
  let src = String((product && product.image) || '').trim();
  // Uploads saved as an empty "data:image/png;base64," are not images.
  if (!src || /^data:image\/[\w+.-]+;base64,?$/i.test(src)) src = FALLBACK_PRODUCT_IMAGE;
  return src.replace(/\.\/assets\/(p[1-4])\.png$/, './assets/$1.webp');
}

// Any product/cart image that fails to load shows the placeholder instead of
// broken-image alt text. Capture phase, because error events do not bubble.
document.addEventListener('error', event => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.fallbackApplied) return;
  if (!img.closest('.product-img-box, .cart-item, .product-modal-hero, #productModalContent')) return;
  img.dataset.fallbackApplied = '1';
  img.src = FALLBACK_PRODUCT_IMAGE;
}, true);

const IMG = {
  fungicide: './assets/p1.webp',
  insecticide: './assets/p2.webp',
  biostim: './assets/p3.webp',
  herbicide: './assets/p4.webp',
};


// --- DYNAMIC DATA STORE (Populated from Backend Database) ---
let PESTICIDES = [
  {
    id: 'sb-01',
    name: 'Sathya Bio BlastShield 75 WP',
    tagline: 'Systemic Bio-Fungicide for Paddy Blast & Neck Rot',
    category: 'Fungicide',
    crops: ['Paddy/Rice', 'Wheat', 'Corn'],
    diseases: ['Blast', 'Rust', 'Downy Mildew'],
    activeIngredient: 'Tricyclazole 75% WP + Bio-Enzyme Fortifier',
    dosage: '120g - 150g per Acre',
    packSizes: ['250g', '500g', '1kg'],
    selectedPack: '500g',
    safetyRating: 'Class III (Eco Friendly)',
    description: 'Advanced systemic bio-fortified fungicide providing protective and curative control against Blast disease in Paddy, Leaf Rust in Wheat, and Neck Blast.',
    detailedDescription: 'Sathya Bio BlastShield 75 WP is a highly specialized systemic fungicide tailored to combat the most stubborn fungal pathogens affecting grain crops. It rapidly penetrates the plant tissue, establishing a protective barrier that stops fungal spore germination and mycelial growth.',
    benefits: [
      'Rapid systemic action offering up to 15 days of protection.',
      'Prevents secondary infections and reduces neck rot incidence.',
      'Enhances grain quality and ensures higher milling yield.',
      'Rainfast within 2 hours of application.'
    ],
    modeOfAction: 'Inhibits melanin biosynthesis in appressoria, preventing the fungus from penetrating the plant cuticle.',
    applicationInstructions: 'Foliar spray at early symptoms or initiation of tillering phase. Dissolve 120g in 150L water per acre.',
    rating: 4.9,
    reviewsCount: 142,
    inStock: true,
    badge: 'Best Seller',
    image: IMG.fungicide,
    price: 680,
    originalPrice: 850,
    discount: '20% OFF'
  },

  {
    id: 'sb-02',
    name: 'Sathya Bio FlyKill Ultra',
    tagline: 'Multi-Action Insecticide for Whitefly & Aphids',
    category: 'Insecticide',
    crops: ['Cotton', 'Tomato', 'Citrus', 'Potato'],
    diseases: ['Whitefly', 'Aphids', 'Caterpillars'],
    activeIngredient: 'Diafenthiuron 50% WP + Botanical Neem Extract',
    dosage: '250g per Acre',
    packSizes: ['250g', '500g'],
    selectedPack: '250g',
    safetyRating: 'Class II (Bee Safe)',
    description: 'Penetrates leaf cuticle rapidly to paralyze sucking pests like Whiteflies, Aphids, and Thrips. Prevents leaf curl virus spread.',
    detailedDescription: 'FlyKill Ultra combines the fast knock-down power of modern chemistry with the sustained repellency of botanical neem extracts. It is highly effective against nymphs and adult stages of sucking pests.',
    benefits: [
      'Translaminar action kills pests hiding on the underside of leaves.',
      'Vapour action ensures broad coverage in dense crop canopies.',
      'Safe for beneficial insects like ladybird beetles.',
      'Phytotonic effect leaves crop greener.'
    ],
    modeOfAction: 'Inhibits mitochondrial respiration in insects, causing immediate paralysis.',
    applicationInstructions: 'Ensure thorough coverage of under-side of leaves. Spray early morning or post-sunset.',
    rating: 4.8,
    reviewsCount: 98,
    inStock: true,
    badge: 'Top Rated',
    image: IMG.insecticide,
    price: 840,
    originalPrice: 1050,
    discount: '20% OFF'
  },

  {
    id: 'sb-03',
    name: 'Sathya Bio BlightStop Pro',
    tagline: 'Dual Action Systemic Fungicide for Blight Control',
    category: 'Fungicide',
    crops: ['Tomato', 'Potato', 'Grapes', 'Citrus'],
    diseases: ['Blight', 'Downy Mildew'],
    activeIngredient: 'Mancozeb 64% + Metalaxyl 8% WP',
    dosage: '500g per Acre',
    packSizes: ['500g', '1kg', '5kg'],
    selectedPack: '1kg',
    safetyRating: 'Class III Low Toxicity',
    description: 'Gold standard dual-action fungicide specifically formulated for Late Blight in Potato/Tomato and Downy Mildew in Grapevines.',
    detailedDescription: 'BlightStop Pro provides unparalleled protection through a two-pronged approach: Mancozeb forms a protective film on the plant surface to prevent spore germination, while Metalaxyl is rapidly absorbed.',
    benefits: [
      'Curative and protective action prevents disease outbreaks.',
      'Excellent rainfastness and prolonged residual activity.',
      'Provides essential Manganese and Zinc micronutrients.'
    ],
    modeOfAction: 'Mancozeb acts as a multi-site contact inhibitor, while Metalaxyl inhibits protein synthesis within fungal pathogens.',
    applicationInstructions: 'Spray before rains or high moisture periods. Safe for crop canopy when used as directed.',
    rating: 4.9,
    reviewsCount: 215,
    inStock: true,
    badge: 'Expert Choice',
    image: IMG.fungicide,
    price: 750,
    originalPrice: 900,
    discount: '17% OFF'
  },

  {
    id: 'sb-04',
    name: 'Sathya Bio RootVigor Gold',
    tagline: '100% Organic Bio-Stimulant & Root Enhancer',
    category: 'Bio-Stimulant',
    crops: ['Paddy/Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Corn', 'Tomato', 'Grapes'],
    diseases: [],
    activeIngredient: 'Humic Acid 18% + Seaweed Extract (Ascophyllum nodosum)',
    dosage: '500ml per Acre',
    packSizes: ['500ml', '1 Litre', '5 Litres'],
    selectedPack: '1 Litre',
    safetyRating: '100% Organic Certified',
    description: 'Accelerates root branching, enhances micro-nutrient absorption, and restores degraded soils. Boosts drought resilience.',
    detailedDescription: 'RootVigor Gold stimulates white feeder root growth and increases soil cation exchange capacity (CEC). It contains natural auxins, cytokinins, and trace minerals.',
    benefits: [
      'Enhances fertilizer utilization efficiency by 25-30%.',
      'Increases white root biomass for better anchoring and nutrient uptake.',
      'Improves drought and heat stress tolerance.'
    ],
    modeOfAction: 'Stimulates root cell division and chelates bound soil nutrients into plant-absorbable forms.',
    applicationInstructions: 'Apply through drip irrigation or drench around crop root zone during early growth stages.',
    rating: 4.9,
    reviewsCount: 310,
    inStock: true,
    badge: '100% Organic',
    image: IMG.biostim,
    price: 990,
    originalPrice: 1250,
    discount: '21% OFF'
  },

  {
    id: 'sb-26',
    name: 'Sathya Bio WeedClear 24-D',
    tagline: 'Systemic Broadleaf Herbicide',
    category: 'Herbicide',
    crops: ['Wheat', 'Corn', 'Sugarcane'],
    diseases: ['Weeds'],
    activeIngredient: '2,4-D Amine Salt 58% SL',
    dosage: '400ml per Acre',
    packSizes: ['400ml', '1 Litre', '5 Litres'],
    selectedPack: '1 Litre',
    safetyRating: 'Class II (Moderate)',
    description: 'Effective and economical post-emergence herbicide for the control of broadleaf weeds in cereals and sugarcane.',
    detailedDescription: 'WeedClear 24-D is a highly systemic herbicide that mimics the action of plant growth hormone auxin, causing uncontrolled growth in susceptible broadleaf weeds.',
    benefits: [
      'Excellent control of tough broadleaf weeds.',
      'Highly selective and safe for grass crops like wheat and sugarcane.',
      'Systemic action ensures complete kill from leaves to roots.'
    ],
    modeOfAction: 'Acts as a synthetic auxin, causing rapid, uncontrolled cell division and growth.',
    applicationInstructions: 'Apply as a foliar spray 30-35 days after sowing when weeds are in 2-4 leaf stage.',
    rating: 4.6,
    reviewsCount: 156,
    inStock: true,
    badge: 'Broadleaf Killer',
    image: IMG.herbicide,
    price: 340,
    originalPrice: 400,
    discount: '15% OFF'
  },

  {
    id: 'sb-27',
    name: 'Sathya Bio AminoBoost Liquid',
    tagline: 'Advanced Amino Acid Bio-Stimulant',
    category: 'Bio-Stimulant',
    crops: ['Tomato', 'Cotton', 'Grapes', 'Citrus', 'Paddy/Rice'],
    diseases: [],
    activeIngredient: 'L-Amino Acids 20% + Seaweed Extract',
    dosage: '250ml per Acre',
    packSizes: ['250ml', '500ml', '1 Litre'],
    selectedPack: '500ml',
    safetyRating: '100% Organic',
    description: 'A powerful anti-stress bio-stimulant that helps crops recover from weather, transplant, and chemical stress.',
    detailedDescription: 'AminoBoost provides plants with ready-made L-amino acids, saving the energy required for their synthesis. This energy is redirected towards growth and flowering.',
    benefits: [
      'Rapidly relieves plant stress from drought, heat, or phytotoxicity.',
      'Enhances pollen germination and fruit set.',
      'Improves efficacy of tank-mixed sprays.'
    ],
    modeOfAction: 'Provides direct precursors for protein synthesis and regulates stomatal opening.',
    applicationInstructions: 'Foliar spray during vegetative growth, pre-flowering, and fruit setting stages.',
    rating: 4.9,
    reviewsCount: 212,
    inStock: true,
    badge: 'Stress Reliever',
    image: IMG.biostim,
    price: 460,
    originalPrice: 550,
    discount: '16% OFF'
  },

  {
    id: 'sb-28',
    name: 'Sathya Bio NeemGuard 10000 PPM',
    tagline: 'Pure Cold-Pressed Bio-Insecticide & Antifeedant',
    category: 'Insecticide',
    crops: ['Paddy/Rice', 'Cotton', 'Tomato', 'Grapes', 'Citrus'],
    diseases: ['Aphids', 'Whitefly', 'Caterpillars'],
    activeIngredient: 'Azadirachtin 1% (10000 PPM) EC',
    dosage: '300ml per Acre',
    packSizes: ['250ml', '500ml', '1 Litre'],
    selectedPack: '500ml',
    safetyRating: '100% Organic Certified',
    description: 'High-potency botanical neem formulation disrupting insect lifecycle, feeding, and egglaying without chemical residues.',
    detailedDescription: 'Sathya Bio NeemGuard 10000 PPM is extracted using high-grade cold-press technology to preserve active Azadirachtin. It acts as an antifeedant, repellent, and insect growth regulator.',
    benefits: [
      'Zero pre-harvest interval - completely safe for organic & export crops.',
      'Inhibits pest resistance development when mixed with chemical sprays.',
      'Safe for beneficial insects.'
    ],
    modeOfAction: 'Disrupts ecdysone hormone systems, preventing molting and suppressing feeding.',
    applicationInstructions: 'Foliar spray at 3ml per Litre water. Apply early morning or evening.',
    rating: 4.9,
    reviewsCount: 184,
    inStock: true,
    badge: '100% Organic',
    image: IMG.insecticide,
    price: 580,
    originalPrice: 720,
    discount: '19% OFF'
  },

  {
    id: 'sb-29',
    name: 'Sathya Bio CopperShield 50 WG',
    tagline: 'Water Dispersible Bio-Bactericide & Contact Fungicide',
    category: 'Fungicide',
    crops: ['Tomato', 'Potato', 'Grapes', 'Citrus'],
    diseases: ['Blight', 'Downy Mildew'],
    activeIngredient: 'Copper Hydroxide 50% WG',
    dosage: '400g per Acre',
    packSizes: ['250g', '500g', '1kg'],
    selectedPack: '500g',
    safetyRating: 'Class III (Eco Friendly)',
    description: 'Advanced WG formulation offering broad-spectrum protective defense against bacterial spot, late blight, and downy mildew.',
    detailedDescription: 'CopperShield 50 WG releases micro-fine copper ions that stick tightly to plant foliage, preventing bacterial and fungal spore germination.',
    benefits: [
      'Disperses instantly in water without clogging nozzles.',
      'Protects foliage against both bacterial spot and fungal blights.',
      'High tenacity & superior rain-fast performance.'
    ],
    modeOfAction: 'Copper ions denature cellular proteins and enzymes in fungal spores and bacterial cell walls.',
    applicationInstructions: 'Mix 2g per Litre water. Apply preventively when disease weather is forecast.',
    rating: 4.7,
    reviewsCount: 129,
    inStock: true,
    badge: 'Bactericide Guard',
    image: IMG.fungicide,
    price: 620,
    originalPrice: 750,
    discount: '17% OFF'
  },

  {
    id: 'sb-30',
    name: 'Sathya Bio SulphaStar 80 WDG',
    tagline: 'Micronutrient Fortified Powdery Mildew & Mite Guard',
    category: 'Fungicide',
    crops: ['Grapes', 'Wheat', 'Sugarcane', 'Citrus'],
    diseases: ['Downy Mildew', 'Rust'],
    activeIngredient: 'Sulphur 80% WDG',
    dosage: '1kg per Acre',
    packSizes: ['1kg', '3kg', '5kg'],
    selectedPack: '1kg',
    safetyRating: 'Class III (Eco Safe)',
    description: 'Dual-action micronutrient fertilizer and contact fungicide for controlling powdery mildew, rust, and red spider mites.',
    detailedDescription: 'SulphaStar 80 WDG delivers elemental sulphur in instantly wettable micro-granules. It satisfies plant sulphur deficiency while creating a hostile environment for mildew spores.',
    benefits: [
      'Boosts chlorophyll formation, oil synthesis, and protein levels.',
      'Controls powdery mildew & spider mites simultaneously.',
      'Granular non-dusty WDG formulation.'
    ],
    modeOfAction: 'Vapour phase oxidation disrupts fungal respiratory chain and mite cell membranes.',
    applicationInstructions: 'Dissolve 2.5g per Litre water. Spray at first sign of powdery mildew.',
    rating: 4.8,
    reviewsCount: 167,
    inStock: true,
    badge: 'Powdery Mildew Care',
    image: IMG.fungicide,
    price: 390,
    originalPrice: 480,
    discount: '18% OFF'
  },

  {
    id: 'sb-31',
    name: 'Sathya Bio StemKill 18.5 SC',
    tagline: 'Broad Spectrum Stem Borer & Leaf Folder Specialist',
    category: 'Insecticide',
    crops: ['Paddy/Rice', 'Sugarcane', 'Corn'],
    diseases: ['Stem Borer', 'Caterpillars'],
    activeIngredient: 'Chlorantraniliprole 18.5% SC',
    dosage: '60ml per Acre',
    packSizes: ['60ml', '150ml'],
    selectedPack: '60ml',
    safetyRating: 'Class III Low Toxicity',
    description: 'Ultra-concentrated systemic insecticide providing extended control of stem borer, leaf folder, and bollworms.',
    detailedDescription: 'StemKill 18.5 SC is absorbed rapidly by plant tissue and translocated throughout stems and leaves to protect tillers.',
    benefits: [
      'Long duration protection - up to 21 days single application.',
      'Prevents dead heart formation and white earheads in paddy.',
      'Preserves beneficial spiders in fields.'
    ],
    modeOfAction: 'Activates insect ryanodine receptors, causing muscle contraction and feeding cessation.',
    applicationInstructions: 'Apply 60ml per acre in 150L water at 20-30 days post transplanting.',
    rating: 4.9,
    reviewsCount: 280,
    inStock: true,
    badge: 'Top Seller',
    image: IMG.insecticide,
    price: 890,
    originalPrice: 1100,
    discount: '19% OFF'
  },

  {
    id: 'sb-32',
    name: 'Sathya Bio BloomMax Super',
    tagline: 'Flower Booster & Fruit Drop Prevention Bio-Stimulant',
    category: 'Bio-Stimulant',
    crops: ['Tomato', 'Cotton', 'Grapes', 'Citrus'],
    diseases: [],
    activeIngredient: 'Nitrobenzene 20% + Boron & Zinc Chelates',
    dosage: '250ml per Acre',
    packSizes: ['250ml', '500ml', '1 Litre'],
    selectedPack: '500ml',
    safetyRating: '100% Non-Toxic',
    description: 'Plant flowering stimulant engineered to trigger abundant flower initiation, prevent flower drop, and enlarge fruit size.',
    detailedDescription: 'BloomMax Super regulates flower-inducing hormones and provides critical micronutrients like Boron and Zinc.',
    benefits: [
      'Increases flower cluster count by up to 35%.',
      'Drastically reduces flower and young fruit drop under heat stress.',
      'Improves fruit color and market price.'
    ],
    modeOfAction: 'Stimulates plant flowering hormones and enhances carbohydrate translocation.',
    applicationInstructions: 'Foliar application at pre-flowering stage and repeat 15 days later.',
    rating: 4.9,
    reviewsCount: 195,
    inStock: true,
    badge: 'Yield Booster',
    image: IMG.biostim,
    price: 520,
    originalPrice: 650,
    discount: '20% OFF'
  },

  {
    id: 'sb-33',
    name: 'Sathya Bio GrassOut 10 EC',
    tagline: 'Selective Post-Emergence Grass Weed Herbicide',
    category: 'Herbicide',
    crops: ['Cotton', 'Tomato', 'Potato', 'Sugarcane'],
    diseases: ['Weeds'],
    activeIngredient: 'Quizalofop-ethyl 10% EC',
    dosage: '300ml per Acre',
    packSizes: ['250ml', '500ml', '1 Litre'],
    selectedPack: '500ml',
    safetyRating: 'Class II (Selective)',
    description: 'Systemic selective herbicide for complete control of annual and perennial grass weeds in broadleaf crops.',
    detailedDescription: 'GrassOut 10 EC targets narrow-leaf grass weeds infesting cotton, tomato, and potato crops without damaging the main crop.',
    benefits: [
      'Highly selective - zero damage to broadleaf crops like cotton & tomato.',
      'Kills tough perennial grasses like Cynodon dactylon.',
      'Rain-fast within 1 hour.'
    ],
    modeOfAction: 'Inhibits acetyl-CoA carboxylase (ACCase) enzyme in grass weeds.',
    applicationInstructions: 'Spray when grass weeds are at 2-4 leaf stage.',
    rating: 4.7,
    reviewsCount: 110,
    inStock: true,
    badge: 'Grass Eliminator',
    image: IMG.herbicide,
    price: 480,
    originalPrice: 580,
    discount: '17% OFF'
  },

  {
    id: 'sb-34',
    name: 'Sathya Bio Trichoderma Viride 1% WP',
    tagline: 'Bio-Control Soil Fungicide for Root Rot & Wilt',
    category: 'Fungicide',
    crops: ['Paddy/Rice', 'Cotton', 'Tomato', 'Sugarcane', 'Grapes'],
    diseases: ['Blight', 'Rust'],
    activeIngredient: 'Trichoderma Viride (Min 2 x 10^8 CFU/g)',
    dosage: '1kg per Acre',
    packSizes: ['1kg', '5kg'],
    selectedPack: '1kg',
    safetyRating: '100% Organic Certified',
    description: 'Antagonistic biological fungicide that parasitizes root rot, collar rot, and Fusarium wilt pathogens in soil.',
    detailedDescription: 'Trichoderma Viride is a beneficial bio-fungal culture that colonizes root zones and destroys soil fungal pathogens.',
    benefits: [
      'Controls seed-borne and soil-borne fungal diseases organically.',
      'Promotes dense root system.',
      'Restores soil biological balance.'
    ],
    modeOfAction: 'Hyperparasitism, antibiosis, and competition around root surfaces.',
    applicationInstructions: 'Mix 1kg with 100kg farmyard manure and incorporate into moist soil.',
    rating: 4.9,
    reviewsCount: 240,
    inStock: true,
    badge: 'Bio-Fungicide',
    image: IMG.fungicide,
    price: 290,
    originalPrice: 380,
    discount: '23% OFF'
  },

  {
    id: 'sb-35',
    name: 'Sathya Bio Pseudomonas 1% WP',
    tagline: 'Bio-Bactericide & Systemic Induced Resistance Activator',
    category: 'Fungicide',
    crops: ['Paddy/Rice', 'Tomato', 'Potato', 'Citrus', 'Wheat'],
    diseases: ['Blight', 'Blast'],
    activeIngredient: 'Pseudomonas fluorescens (Min 2 x 10^8 CFU/g)',
    dosage: '1kg per Acre',
    packSizes: ['1kg', '5kg'],
    selectedPack: '1kg',
    safetyRating: '100% Organic Certified',
    description: 'Potent bio-agent protecting crops against bacterial leaf blight, sheath rot, and damping off.',
    detailedDescription: 'Pseudomonas fluorescens produces siderophores that starve soil pathogens of iron while inducing systemic plant resistance.',
    benefits: [
      'Dual action: bio-bactericide + plant growth promoting rhizobacteria.',
      'Boosts crop vigor and suppresses leaf streak.',
      'Safe for organic farming.'
    ],
    modeOfAction: 'Siderophore iron chelation and production of phenazine antibiotics.',
    applicationInstructions: 'Foliar spray at 10g per Litre water or root drenching.',
    rating: 4.8,
    reviewsCount: 175,
    inStock: true,
    badge: 'Bacterial Guard',
    image: IMG.fungicide,
    price: 310,
    originalPrice: 400,
    discount: '22% OFF'
  }
];


const INITIAL_TICKETS = [
  {
    id: 'TK-8942',
    subject: 'Leaf Yellowing & Stunting in Paddy Field',
    category: 'Field Advisory',
    crop: 'Paddy/Rice',
    severity: 'High',
    status: 'In Progress',
    date: '2026-08-25',
    assignedExpert: 'Dr. Ramesh Agronomist',
    messages: [
      {
        sender: 'Farmer',
        text: 'My 3-acre paddy field leaves are turning light yellow from tips after heavy rainfall.',
        time: '10:15 AM'
      },
      {
        sender: 'Sathya Bio Expert',
        text: 'Hello! This indicates possible Nitrogen leaching or early sheath blight.',
        time: '10:42 AM'
      }
    ]
  }
];


const EXPERTS = [
  {
    id: 'exp-1',
    name: 'Dr. V. K. Sathyanarayana',
    title: 'Chief Agronomist & Soil Pathology Lead',
    experience: '22+ Years Exp',
    specialties: [
      'Soil Nutrient Balancing',
      'Paddy & Wheat Diseases',
      'Organic Bio-stimulants'
    ],
    availability: 'Available Today',
    rating: '4.9 ★ (420+ Calls)',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&q=80'
  },

  {
    id: 'exp-2',
    name: 'Ananya Deshmukh',
    title: 'Senior Crop Protection Specialist',
    experience: '14+ Years Exp',
    specialties: [
      'Cotton Whitefly Control',
      'Horticulture Pest Management'
    ],
    availability: 'Next Available: 2:30 PM',
    rating: '4.8 ★ (315+ Calls)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80'
  }
];


const N8N_WORKFLOW_NODES = [
  {
    id: 1,
    name: 'WhatsApp Webhook',
    type: 'trigger',
    status: 'Active',
    desc: 'Receives farmer incoming message & photo'
  },
  {
    id: 2,
    name: 'AI Disease Parser',
    type: 'action',
    status: 'Success',
    desc: 'Extracts crop type & symptoms'
  },
  {
    id: 3,
    name: 'Catalog Lookup DB',
    type: 'search',
    status: 'Success',
    desc: 'Matches exact fungicide remedy'
  },
  {
    id: 4,
    name: 'WhatsApp Response',
    type: 'response',
    status: 'Ready',
    desc: 'Sends instant dosage & order button'
  }
];


const SAMPLE_DISEASE_DIAGNOSES = [
  {
    keyword: 'blight',
    diseaseName: 'Early / Late Blight',
    cropDetected: 'Tomato / Potato',
    confidence: '96.4%',
    symptoms: 'Dark brown concentric rings on lower leaves.',
    recommendedProduct: 'Sathya Bio BlightStop Pro (500g/acre)',
    productId: 'sb-03'
  }
];


// --- MULTILINGUAL i18n ENGINE ---
const TRANSLATIONS = {
  en: {
    topbar_shipping: 'FREE Shipping on Agro Orders over ₹999',
    logo_sub: 'Agro Pesticide Store',
    search_placeholder: 'Search by crop, disease or chemical e.g. Blast, Paddy...',
    search_btn: 'Search',
    basket_label: 'Basket',
    nav_all_products: 'All Products',
    hero_title: 'Protect Your Crops.\nMaximize Harvest Yield.',
    hero_desc: 'Order 100% bio-certified fungicides, insecticides, and soil enhancers online. Direct express dispatch.',
    hero_shop_btn: 'Shop Catalog',
    hero_soil_btn: 'Upload Soil Report',
    trust_certified: '100% Certified Potency',
    trust_dispatch: 'Same-Day Dispatch',
    trust_whatsapp: 'WhatsApp Support',
    shop_by_category: 'Shop by Category',
    catalog_title: 'Agro Pesticides Store Catalog',
    catalog_subtitle: 'Filter chemicals by target crop, plant disease, or product category',
    filter_title: 'Store Filters',
    filter_crop: 'Filter by Crop',
    filter_disease: 'Filter by Disease / Pest',
    filter_category: 'Category',
    reset_filters: 'Reset All Filters',
    add_to_cart: 'Add to Cart',
    reviews: 'reviews',
    soil_title: 'Soil Test Report Analyzer',
    soil_desc: 'Upload your laboratory soil test document (PDF or image). Our AI engine parses N-P-K levels.',
    soil_upload_btn: 'Upload Soil Report',
    soil_dropzone: 'Drag & Drop Soil Document',
    soil_formats: 'PDF, PNG, JPG supported',
    n8n_title: 'WhatsApp N8N Automation Agent',
    n8n_subtitle: 'See how automated N8N workflows assist farmers via WhatsApp 24/7',
    n8n_test_btn: 'Run N8N Test Flow',
    tickets_title: 'Supporting Ticket System',
    tickets_subtitle: 'Technical field assistance & dosage queries',
    ticket_new_btn: 'Submit Ticket',
    experts_title: 'Connect to a Plant Doctor Expert',
    experts_subtitle: '1-on-1 consultation calls with senior agricultural scientists',
    footer_nav: 'Store Categories',
    footer_crops: 'Top Crops',
    footer_help: 'Customer Support',
    footer_copyright: '© 2026 Sathya Bio Agro Tech Ltd. All rights reserved.',
    chatbot_title: 'Sathya Bio Chat Assistant',
    chat_placeholder: 'Type crop question...',
    chat_welcome: '👋 Welcome to Sathya Bio Agro Support! How can I assist your crop today?',
    checkout_title: 'Complete Your Agro Order',
    field_name: 'Full Name',
    field_phone: 'Mobile Number (For WhatsApp Updates)',
    field_address: 'Farm Delivery Address',
    field_payment: 'Payment Option',
    pay_cod: 'Cash on Delivery (COD) - Pay on Arrival',
    pay_upi: 'UPI / Google Pay / PhonePe',
    pay_bank: 'Net Banking / KCC Card',
    place_order: 'Place Order Now',
    scan_title: 'AI Crop Disease Photo Scanner',
    scan_desc: 'AI will diagnose disease & recommend pesticide',
    advisory_label: 'Account',
    lang_label: 'Language',
    showing_products: 'Showing',
    of_products: 'of',
    products_label: 'products',
    nav_ai_scanner: 'AI Leaf Doctor'
  }
};


// Tamil ships in js/lang-ta.js. The other South Indian languages are listed
// as "coming soon" until their packs exist.
const TEXT_PACKS = {};
if (window.SB_LANG_TA) {
  TRANSLATIONS.ta = window.SB_LANG_TA.keys;
  TEXT_PACKS.ta = window.SB_LANG_TA;
}

const LANGUAGES = [
  { code: 'en', native: 'English', english: 'English', glyph: 'A' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', glyph: 'த' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu', glyph: 'తె' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada', glyph: 'ಕ' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam', glyph: 'മ' },
  { code: 'tulu', native: 'ತುಳು', english: 'Tulu', glyph: 'ತು' },
];
const LANGUAGE_SELECT_IDS = ['langSelectTop', 'langSelectHeader', 'mobileMenuLang'];
const isLanguageReady = code => Boolean(TRANSLATIONS[code]);

let currentLang = (() => {
  let saved = 'en';
  try { saved = localStorage.getItem('sathya_bio_lang') || 'en'; } catch {}
  return isLanguageReady(saved) ? saved : 'en';
})();


// The translation for key, or undefined when no dictionary has it.
function translationFor(key) {
  const dict =
    TRANSLATIONS[currentLang] ||
    TRANSLATIONS['en'];

  return dict[key] || TRANSLATIONS['en'][key];
}


function t(key) {
  return translationFor(key) || key;
}


function setLanguage(langCode) {
  if (!isLanguageReady(langCode)) return;
  currentLang = langCode;
  try { localStorage.setItem('sathya_bio_lang', langCode); } catch {}
  applyTranslations();
  syncLanguageControls();
}

// Every language control (header selects, Menu sheet, quick switch) goes
// through here so they always agree.
function changeLanguage(langCode) {
  if (langCode === currentLang || !isLanguageReady(langCode)) {
    syncLanguageControls();
    return;
  }
  setLanguage(langCode);
  // Product cards build some labels with t(), so they are drawn again.
  renderProducts();
  renderTrendingProducts();
  showToast(langCode === 'ta' ? 'மொழி தமிழுக்கு மாற்றப்பட்டது' : 'Language changed to English', 'success', 2500);
}

function syncLanguageControls() {
  LANGUAGE_SELECT_IDS.forEach(id => {
    const select = document.getElementById(id);
    if (select) select.value = currentLang;
  });
  const lang = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];
  const code = document.getElementById('langQuickCode');
  if (code) code.textContent = currentLang === 'en' ? 'EN' : lang.glyph;
  document.getElementById('langQuickBtn')?.setAttribute('aria-label', `Language: ${lang.english}`);
  document.querySelectorAll('.lang-quick-option').forEach(option => {
    option.setAttribute('aria-checked', String(option.dataset.lang === currentLang));
  });
}

function initLanguageSelector() {
  LANGUAGE_SELECT_IDS
    .map(id => document.getElementById(id))
    .filter(Boolean)
    .forEach(select => {
      [...select.options].forEach(option => {
        if (!isLanguageReady(option.value)) {
          option.disabled = true;
          option.textContent = `${option.textContent} · soon`;
        }
      });
      select.value = currentLang;
      select.addEventListener('change', e => changeLanguage(e.target.value));
    });
}

// Header "EN / த" pill on phones and tablets: a small menu of languages.
function initLanguageQuickSwitch() {
  const button = document.getElementById('langQuickBtn');
  if (!button) return;
  let menu = null;
  let backdrop = null;

  const options = () => [...menu.querySelectorAll('.lang-quick-option:not(:disabled)')];

  const onKey = e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const list = options();
      const at = list.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown' ? (at + 1) % list.length : (at - 1 + list.length) % list.length;
      list[next]?.focus();
    }
  };

  const closeQuietly = () => close({ restoreFocus: false });

  function close({ restoreFocus = true } = {}) {
    if (!menu) return;
    menu.remove();
    backdrop.remove();
    menu = backdrop = null;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', closeQuietly);
    if (restoreFocus) button.focus({ preventScroll: true });
  }

  function open() {
    backdrop = document.createElement('div');
    backdrop.className = 'lang-quick-backdrop';
    backdrop.addEventListener('click', () => close());

    menu = document.createElement('div');
    menu.id = 'langQuickMenu';
    menu.className = 'lang-quick-menu notranslate';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Choose language');

    const title = document.createElement('div');
    title.className = 'lang-quick-title';
    title.textContent = 'மொழி · Language';
    menu.append(title);

    let dividerAdded = false;
    LANGUAGES.forEach(lang => {
      const ready = isLanguageReady(lang.code);
      if (!ready && !dividerAdded) {
        const divider = document.createElement('div');
        divider.className = 'lang-quick-divider';
        menu.append(divider);
        dividerAdded = true;
      }
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'lang-quick-option';
      option.dataset.lang = lang.code;
      option.disabled = !ready;
      option.setAttribute('role', 'menuitemradio');
      option.setAttribute('aria-checked', String(lang.code === currentLang));
      option.innerHTML = `
        <span class="lang-quick-glyph" aria-hidden="true">${lang.glyph}</span>
        <span class="lang-quick-names"><strong>${lang.native}</strong><small>${lang.english}</small></span>
        ${ready ? '<i class="fa-solid fa-check lang-quick-check" aria-hidden="true"></i>' : '<span class="lang-quick-soon">Coming soon</span>'}`;
      option.addEventListener('click', () => {
        close();
        changeLanguage(lang.code);
      });
      menu.append(option);
    });

    menu.style.top = `${Math.round(button.getBoundingClientRect().bottom + 8)}px`;
    document.body.append(backdrop, menu);
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', closeQuietly);
    (menu.querySelector('[aria-checked="true"]') || options()[0])?.focus({ preventScroll: true });
  }

  button.addEventListener('click', () => (menu ? close() : open()));
  syncLanguageControls();
}


function applyTranslations() {

  document
    .querySelectorAll('[data-i18n]')
    .forEach(el => {

      const key =
        el.getAttribute('data-i18n');

      // Keep the text shipped in the HTML, so a key missing from TRANSLATIONS
      // shows that text instead of the raw key.
      if (el.dataset.i18nDefault === undefined) el.dataset.i18nDefault = el.textContent;

      el.textContent =
        translationFor(key) || el.dataset.i18nDefault;
    });


  document
    .querySelectorAll('[data-i18n-placeholder]')
    .forEach(el => {

      const key =
        el.getAttribute('data-i18n-placeholder');

      if (el.dataset.i18nPlaceholderDefault === undefined) el.dataset.i18nPlaceholderDefault = el.placeholder;

      el.placeholder =
        translationFor(key) || el.dataset.i18nPlaceholderDefault;
    });

  document.documentElement.lang = currentLang;
  localizeTree(document.body);
  watchPageText(Boolean(TEXT_PACKS[currentLang]));
}


// ---- Untagged page text (gettext-style: the English text is the key) ----
// Leading/trailing punctuation, symbols and emoji stay as written, so
// "🌾 Paddy / Rice", "Password *" and "Forgot password?" share plain keys.
const TEXT_AFFIX = /^([\s\p{P}\p{S}\p{M}\u200d]*)([\s\S]*?)([\s\p{P}\p{S}]*)$/u;
const SKIP_TEXT = 'script, style, noscript, textarea, [data-i18n], .notranslate, #n8nExecutionLog';
// Text node or element -> { source: English, shown: what we wrote }.
const localizedSources = new WeakMap();

function translatePageText(english) {
  const pack = TEXT_PACKS[currentLang];
  if (!pack) return null;
  const clean = english.replace(/\s+/g, ' ').trim();
  if (!clean) return null;

  let translated = pack.text[clean];
  let before = '';
  let after = '';
  if (!translated) {
    let core;
    [, before, core, after] = clean.match(TEXT_AFFIX);
    translated = pack.text[core];
    if (!translated) {
      const rule = pack.patterns.find(([pattern]) => pattern.test(core));
      if (rule) translated = core.replace(rule[0], rule[1]);
    }
  }
  if (!translated) return null;
  const lead = english.match(/^\s*/)[0];
  const trail = english.match(/\s*$/)[0];
  return `${lead}${before}${translated}${after}${trail}`;
}

// Returns the English source for a node, noticing when page code has since
// replaced the text we wrote.
// Text copied from nodes that were already translated (the ticker clones its
// items to loop) carries no record, so it is mapped back through the packs.
const reverseTextIndex = new Map();

function englishSource(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || !/[^\u0000-\u024F\u2000-\u20CF]/.test(clean)) return text;
  const [, before, core, after] = clean.match(TEXT_AFFIX);
  for (const pack of Object.values(TEXT_PACKS)) {
    if (!reverseTextIndex.has(pack)) {
      reverseTextIndex.set(pack, new Map(Object.entries(pack.text).map(([english, translated]) => [translated, english])));
    }
    const index = reverseTextIndex.get(pack);
    const exact = index.get(clean);
    const english = exact ? exact : index.get(core) && `${before}${index.get(core)}${after}`;
    if (english) return `${text.match(/^\s*/)[0]}${english}${text.match(/\s*$/)[0]}`;
  }
  return text;
}

function localizedValue(target, current) {
  const record = localizedSources.get(target);
  const source = record && current === record.shown ? record.source : englishSource(current);
  const translated = translatePageText(source);
  if (translated) localizedSources.set(target, { source, shown: translated });
  else localizedSources.delete(target);
  return translated ?? source;
}

function localizeTextNode(node) {
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP_TEXT)) return;
  // An <option> without a value submits its text; keep submitting English.
  if (parent.tagName === 'OPTION' && !parent.hasAttribute('value')) {
    parent.setAttribute('value', localizedSources.get(node)?.source ?? node.nodeValue.trim());
  }
  const next = localizedValue(node, node.nodeValue);
  if (node.nodeValue !== next) node.nodeValue = next;
}

function localizePlaceholder(el) {
  if (el.closest(SKIP_TEXT) || el.hasAttribute('data-i18n-placeholder')) return;
  const next = localizedValue(el, el.placeholder);
  if (el.placeholder !== next) el.placeholder = next;
}

function localizeTree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (root.nodeValue.trim()) localizeTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: node => (node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) localizeTextNode(node);
  if (root.matches('[placeholder]')) localizePlaceholder(root);
  root.querySelectorAll('[placeholder]').forEach(localizePlaceholder);
}

// While a non-English pack is active, text that page code adds later (product
// cards, basket, toasts) is translated in the same task, before it paints.
// English visitors never run the observer.
let pageTextObserver = null;

function watchPageText(on) {
  if (!on) {
    pageTextObserver?.disconnect();
    pageTextObserver = null;
    return;
  }
  if (pageTextObserver) return;
  pageTextObserver = new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === 'characterData') localizeTree(record.target);
      else record.addedNodes.forEach(localizeTree);
    });
    // Our own writes are not new content.
    pageTextObserver?.takeRecords();
  });
  pageTextObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}


// --- CORE APPLICATION LOGIC ---

// Signed-out visitors keep a cart in this browser only. Once they sign in the
// cart lives on the server against their user id, so it is private to them and
// follows them to any device.
const GUEST_CART_KEY = 'sathya_cart_guest';

function loadGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart() {
  const token = localStorage.getItem('sathya_token');

  if (!token) {
    try {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    } catch (err) {
      console.warn('Could not persist cart:', err);
    }
    return Promise.resolve();
  }

  return fetch('/api/cart', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items: cart }),
  }).catch(err => console.warn('Could not sync cart:', err));
}

// Pull the signed-in user's cart from the server, merging anything they added
// as a guest before signing in.
async function syncCartFromServer() {
  const token = localStorage.getItem('sathya_token');
  if (!token) {
    cart = loadGuestCart();
    updateCartUI();
    return;
  }

  try {
    const res = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      // Expired or revoked session: fall back to being a guest.
      localStorage.removeItem('sathya_token');
      localStorage.removeItem('sathya_user');
      cart = loadGuestCart();
      updateCartUI();
      checkStorefrontAuth();
      return;
    }
    const json = await res.json();
    const serverCart = json.success && Array.isArray(json.data) ? json.data : [];

    const guestCart = loadGuestCart();
    if (guestCart.length) {
      guestCart.forEach(item => {
        const existing = serverCart.find(i => i.id === item.id);
        if (existing) existing.qty += item.qty;
        else serverCart.push(item);
      });
      localStorage.removeItem(GUEST_CART_KEY);
      cart = serverCart;
      await saveCart();
    } else {
      cart = serverCart;
    }
  } catch (err) {
    console.warn('Could not load cart:', err);
    cart = [];
  }

  updateCartUI();
}

let cart = [];

let currentCropFilter = 'all';
let currentDiseaseFilter = 'all';
let currentCategoryFilter = 'All';
let searchQuery = '';


function initApp() {

  applyTranslations();

  initLanguageSelector();
  initLanguageQuickSwitch();

  initNavigation();

  initCatalog();

  initCart();
  initAdvisorySignup();
  initChatbot();

  initSoilUpload();

  initPhotoScanner();

  initTicketSystem();

  initN8nVisualizer();

  initExpertBooking();

  initModals();

  syncCartFromServer();

  initFormValidation();

  initRegistrationCropChoices();

  initTicker();

  initDealCountdown();

  initStatsCounter();

  initBackToTop();

  checkStorefrontAuth();
  checkUrlAuthTriggers();

  fetchLiveProducts();

  fetchLiveCatalogOptions();

  applyCertificationSettings();
  initPreloaderAndWelcomePoster();
}

function checkUrlAuthTriggers() {
  const hash = window.location.hash;
  const redirectMsg = sessionStorage.getItem('sathya_auth_redirect_msg');

  if ((hash === '#login' || hash === '#auth' || redirectMsg) && !isFarmerLoggedIn()) {
    const msg = redirectMsg || 'Login or Sign Up is mandatory to access your basket and checkout. Please sign in.';
    setAuthNotice(msg);
    switchAuthTab('login');
    openModal('authModal');
    sessionStorage.removeItem('sathya_auth_redirect_msg');
  }
}
window.checkUrlAuthTriggers = checkUrlAuthTriggers;

// Two initialisers need the CMS settings, and each was fetching them
// separately - two round trips on a phone for one payload. Share a single
// in-flight promise so the request happens once per page load.
let cmsSettingsRequest = null;
function loadCmsSettings() {
  if (!cmsSettingsRequest) {
    cmsSettingsRequest = fetch('/api/cms')
      .then(response => (response.ok ? response.json() : null))
      .then(json => (json && json.data) || {})
      .catch(() => ({})); // local CMS settings remain available offline
  }
  return cmsSettingsRequest;
}

async function applyCertificationSettings() {
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem('sathya_cms') || '{}'); } catch { return; }
  settings = { ...settings, ...(await loadCmsSettings()) };

  const title = document.getElementById('certificationsTitle');
  const subtitle = document.getElementById('certificationsSubtitle');
  if (title && settings.certificationsTitle) title.textContent = settings.certificationsTitle;
  if (subtitle) {
    subtitle.textContent = settings.certificationsSubtitle || '';
    subtitle.style.display = settings.certificationsSubtitle ? 'block' : 'none';
  }

  for (let index = 1; index <= 5; index += 1) {
    const image = document.getElementById(`certification${index}Image`);
    const label = document.getElementById(`certification${index}Label`);
    if (image && settings[`certification${index}Image`]) image.src = settings[`certification${index}Image`];
    if (label && settings[`certification${index}Label`]) {
      label.textContent = settings[`certification${index}Label`];
      if (image) image.alt = settings[`certification${index}Label`];
    }
  }
}

function initPreloaderAndWelcomePoster() {
  const preloader = document.getElementById('appPreloader');
  const shouldShowPoster = applyWelcomePosterSettings();
  setTimeout(() => {
    if (preloader) preloader.classList.add('hidden');

    setTimeout(async () => {
      // Never stack the poster on top of a window the visitor is already using
      // (for example the sign-in modal opened by a checkout redirect).
      if (await shouldShowPoster && !document.querySelector('.modal-overlay.active, .modal-overlay.is-opening')) {
        openModal('welcomePosterModal');
      }
    }, 400);
  }, 1400);
}

// Resolves to whether the welcome poster should open on this page load.
async function applyWelcomePosterSettings() {
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem('sathya_cms') || '{}'); } catch {}
  settings = { ...settings, ...(await loadCmsSettings()) };
  const user = (() => { try { return JSON.parse(localStorage.getItem('sathya_user') || 'null'); } catch { return null; } })();
  if (settings.popupAudience === 'farmer' && user?.role !== 'farmer') return false;
  let seen = false;
  try { seen = localStorage.getItem('sathya_popup_seen') === '1'; } catch {}
  if (settings.popupBehavior === 'firstVisit' && seen) return false;
  if (settings.popupBehavior === 'returning' && !seen) return false;
  // At most once per browser session: showing it on every page load blocked
  // the storefront each time a visitor came back from checkout or a product.
  try {
    if (sessionStorage.getItem('sathya_popup_session') === '1') return false;
    sessionStorage.setItem('sathya_popup_session', '1');
  } catch {}
  const image = document.getElementById('welcomePosterImage');
  if (image && settings.popupImage) {
    image.src = settings.popupImage;
    image.style.display = 'block';
  }
  try { localStorage.setItem('sathya_popup_seen', '1'); } catch {}
  return true;
}

function initAdvisorySignup() {
  const form = document.getElementById('advisorySignupForm');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const phone = form.querySelector('input[type="tel"]')?.value.trim();
    const crop = form.querySelector('select')?.value;
    const button = form.querySelector('button');
    if (!phone || !crop) return;
    if (button) button.disabled = true;
    try {
      const response = await fetch('/api/advisory/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, crop })
      });
      if (!response.ok) throw new Error('Subscription failed');
      form.innerHTML = '<div style="padding:12px; color:#16a34a; font-weight:600;">Thank you! Your advisory subscription is confirmed.</div>';
    } catch {
      if (button) button.disabled = false;
      showToast('Unable to save your advisory subscription. Please try again.', 'error');
    }
  });
}


function initTicker() {

  const track =
    document.getElementById(
      'tickerTrack'
    );

  if (!track) return;

  track.innerHTML +=
    track.innerHTML;
}


function initDealCountdown() {

  function getSecondsUntilMidnight() {

    const now =
      new Date();

    const midnight =
      new Date();

    midnight.setHours(
      23,
      59,
      59,
      999
    );

    return Math.floor(
      (midnight - now) / 1000
    );
  }


  function formatCountdown(secs) {

    const h =
      Math.floor(
        secs / 3600
      );

    const m =
      Math.floor(
        (secs % 3600) / 60
      );

    const s =
      secs % 60;

    return {
      h,
      m,
      s
    };
  }


  const hEl = document.getElementById('dealHours');
  const mEl = document.getElementById('dealMins');
  const sEl = document.getElementById('dealSecs');
  const banner = document.querySelector('.deal-banner');

  // Every text change here lays out and repaints the whole page, so on a
  // phone a once-a-second write was a regular hitch under scrolling and
  // sheet slides. Only changed digits are written, and nothing is written
  // while the banner is off-screen or a sheet/popup covers the page. The time
  // is read from the clock on each tick, so skipped ticks never drift.
  let bannerOnScreen = true;
  if (banner && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      bannerOnScreen = entries[entries.length - 1].isIntersecting;
      if (bannerOnScreen) tick();
    }).observe(banner);
  }

  const setDigits = (el, value) => {
    const text = String(value).padStart(2, '0');
    if (el && el.textContent !== text) el.textContent = text;
  };

  function tick() {
    if (!bannerOnScreen || document.body.classList.contains('overlay-open')) return;

    let totalSecs = getSecondsUntilMidnight();
    if (totalSecs <= 0) totalSecs = 86399;

    const { h, m, s } = formatCountdown(totalSecs);
    setDigits(hEl, h);
    setDigits(mEl, m);
    setDigits(sEl, s);
  }

  tick();
  setInterval(tick, 1000);
}


function initStatsCounter() {

  const nums =
    document.querySelectorAll(
      '.stat-number[data-target]'
    );

  if (!nums.length) return;


  const suffixMap = {
    15000: '+',
    48: '',
    95: '%',
    12: '+'
  };


  const observer =
    new IntersectionObserver(
      (entries) => {

        entries.forEach(
          entry => {

            if (
              !entry.isIntersecting
            ) {
              return;
            }


            const el =
              entry.target;


            const target =
              parseInt(
                el.dataset.target,
                10
              );


            const suffix =
              suffixMap[target] ?? '';


            el.dataset.suffix =
              suffix;


            const startTime = performance.now();
            const duration = 1400;

            function animateCount(now) {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // Smooth cubic ease-out curve
              const ease = 1 - Math.pow(1 - progress, 3);
              const current = Math.floor(target * ease);

              el.textContent = current.toLocaleString('en-IN');

              if (progress < 1) {
                requestAnimationFrame(animateCount);
              } else {
                el.textContent = target.toLocaleString('en-IN');
              }
            }

            requestAnimationFrame(animateCount);
            observer.unobserve(el);

          }
        );

      },
      {
        threshold: 0.4
      }
    );


  nums.forEach(
    n => observer.observe(n)
  );
}


function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          btn.classList.toggle('visible', window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );

  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}




function initNavigation() {
  const headerSearchInput = document.getElementById('headerSearchInput');
  const headerSearchBtn = document.getElementById('headerSearchBtn');
  const searchCategorySelect = document.getElementById('searchCategorySelect');

  if (headerSearchInput) {
    headerSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
    // The keyboard's Search key takes the shopper to the results and closes
    // the on-screen keyboard.
    headerSearchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      headerSearchInput.blur();
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (searchCategorySelect) {
    searchCategorySelect.addEventListener('change', (e) => {
      currentCategoryFilter = e.target.value;
      const categorySelect = document.getElementById('categorySelect');

      if (categorySelect) {
        categorySelect.value = e.target.value;
      }

      renderProducts();

      document
        .getElementById('catalog')
        ?.scrollIntoView({
          behavior: 'smooth'
        });
    });
  }

  if (headerSearchBtn) {
    headerSearchBtn.addEventListener('click', () => {
      document
        .getElementById('catalog')
        ?.scrollIntoView({
          behavior: 'smooth'
        });
    });
  }
}

// --- CATALOG & FILTER ENGINE ---
function initCatalog() {
  populateFilterOptions();
  renderProducts();
  renderTrendingProducts();

  const cropSelect = document.getElementById('cropSelect');
  const diseaseSelect = document.getElementById('diseaseSelect');
  const categorySelect = document.getElementById('categorySelect');

  if (cropSelect) {
    cropSelect.addEventListener('change', (e) => {
      currentCropFilter = e.target.value;
      renderProducts();
    });
  }

  if (diseaseSelect) {
    diseaseSelect.addEventListener('change', (e) => {
      currentDiseaseFilter = e.target.value;
      renderProducts();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      currentCategoryFilter = e.target.value;
      renderProducts();
    });
  }
}

function populateFilterOptions() {
  const cropSelect = document.getElementById('cropSelect');
  const diseaseSelect = document.getElementById('diseaseSelect');
  const categorySelect = document.getElementById('categorySelect');

  if (cropSelect) {
    cropSelect.innerHTML = CROPS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  if (diseaseSelect) {
    diseaseSelect.innerHTML = DISEASES.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  }

  if (categorySelect) {
    categorySelect.innerHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  }
}

function renderProducts() {
  const container = document.getElementById('productsGrid');
  const counter = document.getElementById('productsCount');
  if (!container) return;

  const filtered = PESTICIDES.filter(p => {
    const matchCrop = currentCropFilter === 'all' || p.crops.includes(currentCropFilter);
    const matchDisease = currentDiseaseFilter === 'all' || p.diseases.includes(currentDiseaseFilter);
    const matchCategory = currentCategoryFilter === 'All' || p.category === currentCategoryFilter;
    const matchSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery) ||
      p.activeIngredient.toLowerCase().includes(searchQuery);

    return matchCrop && matchDisease && matchCategory && matchSearch;
  });

  if (counter) {
    counter.textContent = `${t('showing_products')} ${filtered.length} ${t('of_products')} ${PESTICIDES.length} ${t('products_label')}`;
  }
  const mobileCountEl = document.getElementById('mobileCatalogCount');
  if (mobileCountEl) {
    mobileCountEl.textContent = `${filtered.length} Products`;
  }
  const mobileFilterBadge = document.getElementById('mobileFilterCountBadge');
  if (mobileFilterBadge) {
    let activeFilterCount = 0;
    if (currentCropFilter !== 'all') activeFilterCount++;
    if (currentDiseaseFilter !== 'all') activeFilterCount++;
    if (currentCategoryFilter !== 'All') activeFilterCount++;
    if (searchQuery !== '') activeFilterCount++;
    if (activeFilterCount > 0) {
      mobileFilterBadge.textContent = activeFilterCount;
      mobileFilterBadge.style.display = 'inline-flex';
    } else {
      mobileFilterBadge.style.display = 'none';
    }
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; background: #ffffff; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
        <i class="fa-solid fa-leaf" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 12px;"></i>
        <h3 style="color: var(--primary-dark);">No products found</h3>
        <p style="color: var(--text-muted); margin-top: 6px;">Try adjusting crop or disease filters.</p>
        <button class="btn btn-outline" style="margin-top: 16px;" onclick="resetFilters()"><i class="fa-solid fa-rotate-left"></i> ${t('reset_filters')}</button>
      </div>
    `;
    return;
  }

  const currentUser = getStoredUser();

  container.innerHTML = filtered.map(p => {
    const isUserTargeted = currentUser && p.targetUserId === currentUser.id;
    // The server marks products for any of the user's crops (userCropMatch, from
    // GET /api/products?userId=). The text match remains for the built-in
    // catalogue shown when the server cannot be reached.
    const isCropMatch = currentUser && (typeof p.userCropMatch === 'boolean'
      ? p.userCropMatch
      : Boolean(currentUser.crop && p.crops && p.crops.some(c => currentUser.crop.toLowerCase().includes(c.toLowerCase()))));
    const tailoredFor = Array.isArray(currentUser?.crops) && currentUser.crops.length > 1 ? 'your crops' : currentUser?.crop;

    let personalBadge = '';
    if (isUserTargeted) {
      personalBadge = `<div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #fff; font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; font-weight: 700; margin-bottom: 6px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-star"></i> Recommended for You</div>`;
    } else if (isCropMatch) {
      personalBadge = `<div style="background: rgba(16, 185, 129, 0.12); color: #10b981; font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; font-weight: 700; margin-bottom: 6px; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-seedling"></i> Tailored for ${tailoredFor}</div>`;
    }

    return `
    <div class="product-card">
      <span class="discount-tag">${p.discount || 'Special Offer'}</span>
      <div class="product-img-box">
        <img loading="lazy" decoding="async" src="${productImage(p)}" alt="${p.name}" />
      </div>
      <div class="card-content">
        <span class="product-category-tag">${p.category}</span>
        ${personalBadge}
        <h3 class="product-name">${p.name}</h3>
        <p class="product-tagline">${p.tagline || ''}</p>

        ${p.reviewsEnabled && p.reviewsCount > 0 ? `<div class="rating-row"><i class="fa-solid fa-star"></i><span style="font-weight: 700;">${Number(p.rating).toFixed(1)}</span><span style="color: var(--text-muted);">(${p.reviewsCount} ${t('reviews')})</span></div>` : '<div class="rating-row" style="color: var(--text-muted);">No verified reviews yet</div>'}

        <div class="price-row">
          <span class="current-price">₹${p.price}</span>
          <span class="original-price">₹${p.originalPrice || p.mrp || p.price}</span>
        </div>

        <div class="pack-sizes-row">
          ${(Array.isArray(p.packSizes) && p.packSizes.length ? p.packSizes : ['250g', '500g', '1kg']).map((pack, idx) => `
            <span class="pack-chip ${idx === 0 ? 'active' : ''}">${pack}</span>
          `).join('')}
        </div>

        <div class="card-btn-row">
          <button class="btn btn-primary add-to-cart-btn" data-id="${p.id}" style="flex: 1;">
            <i class="fa-solid fa-cart-shopping"></i> ${t('add_to_cart')}
          </button>
          <button class="btn btn-outline view-details-btn" data-id="${p.id}">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>
    </div>
  `}).join('');

  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });

  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', () => openProductPage(btn.dataset.id));
  });
}

function renderTrendingProducts() {
  const container = document.getElementById('trendingProductsGrid');
  if (!container) return;

  const trending = PESTICIDES.filter(p => p.badge === 'Best Seller' || p.badge === '100% Organic' || p.rating >= 4.8).slice(0, 4);

  container.innerHTML = trending.map(p => `
    <div class="product-card">
      <span class="discount-tag">${p.discount}</span>
      <div class="product-img-box">
        <img loading="lazy" decoding="async" src="${productImage(p)}" alt="${p.name}" />
      </div>
      <div class="card-content">
        <span class="product-category-tag">${p.category}</span>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-tagline">${p.tagline}</p>

        ${p.reviewsEnabled && p.reviewsCount ? `<div class="rating-row"><i class="fa-solid fa-star"></i><span style="font-weight: 700;">${Number(p.rating).toFixed(1)}</span><span style="color: var(--text-muted);">(${p.reviewsCount} ${t('reviews')})</span></div>` : '<div class="rating-row" style="color: var(--text-muted);">No verified reviews yet</div>'}

        <div class="price-row">
          <span class="current-price">₹${p.price}</span>
          <span class="original-price">₹${p.originalPrice}</span>
        </div>

        <div class="pack-sizes-row">
          ${p.packSizes.map((pack, idx) => `
            <span class="pack-chip ${idx === 0 ? 'active' : ''}">${pack}</span>
          `).join('')}
        </div>

        <div class="card-btn-row">
          <button class="btn btn-primary trending-add-btn" data-id="${p.id}" style="flex: 1;">
            <i class="fa-solid fa-cart-shopping"></i> ${t('add_to_cart')}
          </button>
          <button class="btn btn-outline trending-view-btn" data-id="${p.id}">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.trending-add-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });

  document.querySelectorAll('.trending-view-btn').forEach(btn => {
    btn.addEventListener('click', () => openProductPage(btn.dataset.id));
  });
}

window.toggleMobileFilterDrawer = function(open) {
  const panel = document.getElementById('sidebarPanel');
  const overlay = document.getElementById('sidebarPanelOverlay');
  if (!panel || !overlay) return;
  const isOpen = open !== undefined ? open : !panel.classList.contains('active');
  if (isOpen) {
    panel.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    panel.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  syncOverlayState();
};

window.resetFilters = function() {
  currentCropFilter = 'all';
  currentDiseaseFilter = 'all';
  currentCategoryFilter = 'All';
  searchQuery = '';
  const cs = document.getElementById('cropSelect');
  const ds = document.getElementById('diseaseSelect');
  const cats = document.getElementById('categorySelect');
  const hs = document.getElementById('headerSearchInput');
  if (cs) cs.value = 'all';
  if (ds) ds.value = 'all';
  if (cats) cats.value = 'All';
  if (hs) hs.value = '';
  document.querySelectorAll('.mobile-cat-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.cat === 'All');
  });
  renderProducts();
};

window.renderProducts = renderProducts;

window.filterByCategory = function(cat) {
  currentCategoryFilter = cat;
  const categorySelect = document.getElementById('categorySelect');
  if (categorySelect) categorySelect.value = cat;
  document.querySelectorAll('.mobile-cat-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.cat === cat);
  });
  renderProducts();
  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
};

window.filterByCrop = function(crop) {
  currentCropFilter = crop;
  const cropSelect = document.getElementById('cropSelect');
  if (cropSelect) cropSelect.value = crop;
  renderProducts();
  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
};

// --- SHOPPING CART & BASKET ACCESS CONTROL ---

function isFarmerLoggedIn() {
  try {
    const token = localStorage.getItem('sathya_token');
    const userRaw = localStorage.getItem('sathya_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    return Boolean(user && (token || user.id || user.phone));
  } catch {
    return false;
  }
}
window.isFarmerLoggedIn = isFarmerLoggedIn;

function setAuthNotice(msg) {
  const banner = document.getElementById('authNoticeBanner');
  const bannerText = document.getElementById('authNoticeBannerText');
  if (banner && bannerText) {
    bannerText.textContent = msg || 'Login or Sign Up is mandatory to access your basket and checkout.';
    banner.style.display = 'flex';
  }
}
window.setAuthNotice = setAuthNotice;

function clearAuthNotice() {
  const banner = document.getElementById('authNoticeBanner');
  if (banner) {
    banner.style.display = 'none';
  }
}
window.clearAuthNotice = clearAuthNotice;

// Unified Basket Click Handler for desktop (#cartTrigger) & mobile (#mobileNavCart)
window.handleBasketClick = function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }

  if (!isFarmerLoggedIn()) {
    setAuthNotice('Login or Sign Up is mandatory to access your basket and checkout.');
    switchAuthTab('login');
    openModal('authModal');
    document.getElementById('cartOverlay')?.classList.remove('active');
    return false;
  }

  const cartOverlay = document.getElementById('cartOverlay');
  if (cartOverlay) {
    cartOverlay.classList.add('active');
  }
  updateCartUI();
  return true;
};

// The storefront may run inside an iframe on "/", so navigate the top window.
function goToCartPage() {
  if (!isFarmerLoggedIn()) {
    setAuthNotice('Login or Sign Up is mandatory to access checkout.');
    switchAuthTab('login');
    openModal('authModal');
    document.getElementById('cartOverlay')?.classList.remove('active');
    return;
  }

  if (cart.length === 0) {
    showToast('Your basket is empty. Add products from the catalog first.', 'warning');
    return;
  }

  // Persist first so checkout.html reads the same cart (server for signed-in
  // users), then hand off to the checkout page.
  Promise.resolve(saveCart()).finally(() => {
    window.top.location.href = '/checkout.html';
  });
}

function initCart() {
  const cartTrigger = document.getElementById('cartTrigger');
  const cartDrawer = document.getElementById('cartOverlay');
  const cartClose = document.getElementById('cartCloseBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const mobileNavCart = document.getElementById('mobileNavCart');

  if (cartTrigger) {
    cartTrigger.onclick = (e) => window.handleBasketClick(e);
  }

  if (mobileNavCart) {
    mobileNavCart.onclick = (e) => window.handleBasketClick(e);
  }

  if (cartClose) {
    cartClose.onclick = () => cartDrawer?.classList.remove('active');
  }

  if (cartDrawer) {
    cartDrawer.onclick = (e) => {
      if (e.target === cartDrawer) {
        cartDrawer.classList.remove('active');
      }
    };
  }

  if (checkoutBtn) {
    checkoutBtn.onclick = (e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (!isFarmerLoggedIn()) {
        setAuthNotice('Login or Sign Up is mandatory to access checkout.');
        cartDrawer?.classList.remove('active');
        switchAuthTab('login');
        openModal('authModal');
        return;
      }

      if (cart.length === 0) {
        showToast('Your basket is empty. Add products from the catalog first.', 'warning');
        return;
      }
      goToCartPage();
    };
  }
}

window.addToCart = function(productId) {
  const p = PESTICIDES.find(item => item.id === productId);
  if (!p) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    // _id mirrors id so the React cart page keys off the same value.
    cart.push({ ...p, _id: p.id, qty: 1, selectedPack: p.selectedPack || p.packSizes[0] });
  }

  saveCart();
  updateCartUI();

  if (!isFarmerLoggedIn()) {
    showToast(`"${p.name}" added to cart!`, 'success');
    setAuthNotice('Login or Sign Up is mandatory to access your basket and complete checkout.');
    switchAuthTab('login');
    openModal('authModal');
    document.getElementById('cartOverlay')?.classList.remove('active');
  } else {
    showToast(`"${p.name}" added to basket!`, 'success');
    document.getElementById('cartOverlay')?.classList.add('active');
  }
};

function updateCartUI() {
  const cartBadge = document.getElementById('cartBadge');
  const cartContainer = document.getElementById('cartItemsContainer');
  const subtotalEl = document.getElementById('cartSubtotal');
  const gstEl = document.getElementById('cartGst');
  const drawerTotalEl = document.getElementById('cartDrawerTotal');
  const checkoutAmountEl = document.getElementById('cartCheckoutAmount');
  const itemCountEl = document.getElementById('cartItemCount');
  const grandTotalEl = document.getElementById('cartGrandTotal');
  const drawer = document.querySelector('#cartOverlay .cart-drawer');
  const rupees = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  if (cartBadge) cartBadge.textContent = totalItems;
  const mobileCartBadge = document.getElementById('mobileCartBadge');
  if (mobileCartBadge) mobileCartBadge.textContent = totalItems;

  // Same rule as checkout.html and the server: GST is 18% of the subtotal,
  // rounded. The basket used to show the subtotal as the "Grand Total".
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  if (subtotalEl) subtotalEl.textContent = rupees(subtotal);
  if (gstEl) gstEl.textContent = rupees(gst);
  if (drawerTotalEl) drawerTotalEl.textContent = rupees(total);
  if (checkoutAmountEl) checkoutAmountEl.textContent = rupees(total);
  if (grandTotalEl) grandTotalEl.textContent = rupees(total);
  if (itemCountEl) itemCountEl.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
  if (drawer) drawer.classList.toggle('is-empty', cart.length === 0);

  if (!cartContainer) return;

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon"><i class="fa-solid fa-basket-shopping"></i></div>
        <h4>Your basket is empty</h4>
        <p>Add crop protection products to get started.</p>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('cartOverlay')?.classList.remove('active'); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });">Browse products</button>
      </div>
    `;
    return;
  }

  cartContainer.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-thumb"><img loading="lazy" decoding="async" src="${productImage(item)}" alt="${item.name}" /></div>
      <div class="cart-item-body">
        <h4 class="cart-item-name">${item.name}</h4>
        <div class="cart-item-meta">${item.selectedPack ? `<span class="cart-item-pack">${item.selectedPack}</span>` : ''}<span>${rupees(item.price)} each</span></div>
        <div class="cart-item-foot">
          <div class="cart-stepper" role="group" aria-label="Quantity">
            <button type="button" onclick="updateQty(${idx}, -1)" aria-label="${item.qty <= 1 ? 'Remove item' : 'Decrease quantity'}"><i class="fa-solid ${item.qty <= 1 ? 'fa-trash-can' : 'fa-minus'}"></i></button>
            <span>${item.qty}</span>
            <button type="button" onclick="updateQty(${idx}, 1)" aria-label="Increase quantity"><i class="fa-solid fa-plus"></i></button>
          </div>
          <strong class="cart-item-total">${rupees(item.price * item.qty)}</strong>
        </div>
      </div>
      <button type="button" class="cart-item-remove" onclick="removeFromCart(${idx})" aria-label="Remove from basket"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');
}

window.updateQty = function(index, change) {
  if (cart[index]) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
    updateCartUI();
  }
};

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
};

function openProductModal(productId) {
  const p = PESTICIDES.find(item => item.id === productId);
  if (!p) return;

  const modal = document.getElementById('productModal');
  const container = document.getElementById('productModalContent');
  if (!modal || !container) return;

  modal.querySelector('.modal-card')?.scrollTo(0, 0);
  // Reopening the same product reuses what is already rendered: building it is
  // the popup's one large layout. A catalogue refresh replaces the product
  // objects, so stale content is never reused.
  if (container.renderedProduct === p) {
    openModal('productModal');
    return;
  }
  container.renderedProduct = p;

  const relatedProducts = PESTICIDES.filter(item =>
    item.id !== p.id && (item.category === p.category || item.crops.some(c => p.crops.includes(c)))
  ).slice(0, 4);

  let relatedHTML = '';
  if (relatedProducts.length > 0) {
    relatedHTML = `
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-light);">
        <h4 style="color: var(--primary-dark); margin-bottom: 12px;"><i class="fa-solid fa-sparkles" style="color: var(--accent-amber);"></i> Frequently Bought Together</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">
          ${relatedProducts.map(rel => `
            <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; padding: 8px; text-align: center; cursor: pointer;" onclick="openProductModal('${rel.id}')">
              <img loading="lazy" decoding="async" src="${productImage(rel)}" style="width: 60px; height: 60px; object-fit: contain; margin: 0 auto 4px;" />
              <h5 style="font-size: 0.75rem; color: var(--text-main); margin-bottom: 2px; line-height: 1.2; height: 2.4em; overflow: hidden;">${rel.name}</h5>
              <span style="font-size: 0.82rem; font-weight: 800; color: var(--primary-dark);">₹${rel.price}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="product-modal-hero" style="display: grid; grid-template-columns: 160px 1fr; gap: 16px; align-items: center; margin-bottom: 16px;">
      <div style="background: #f8fafc; border-radius: 12px; padding: 10px; text-align: center; border: 1px solid var(--border-light);">
        <img loading="lazy" decoding="async" src="${productImage(p)}" style="width: 100%; max-height: 140px; object-fit: contain; margin: 0 auto;" />
      </div>
      <div>
        <span style="background: #ecfdf5; color: var(--primary); padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 0.75rem; border: 1px solid #34d399;">${p.category}</span>
        <h2 style="font-size: 1.3rem; margin-top: 4px; color: var(--primary-dark);">${p.name}</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 6px;">${p.tagline}</p>

        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; margin-bottom: 8px;">
          ${p.reviewsEnabled && p.reviewsCount ? `<span style="color: var(--accent-amber);">★★★★★</span><strong>${Number(p.rating).toFixed(1)}</strong><span style="color: var(--text-muted);">(${p.reviewsCount} reviews)</span>` : '<span style="color: var(--text-muted);">No verified reviews yet</span>'}
        </div>

        <div style="display: flex; align-items: baseline; gap: 10px;">
          <span style="font-size: 1.4rem; font-weight: 800; color: var(--primary-dark);">₹${p.price}</span>
          <span style="color: var(--text-dim); text-decoration: line-through;">₹${p.originalPrice}</span>
          <span style="color: #ef4444; font-weight: 700; font-size: 0.82rem;">${p.discount}</span>
        </div>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div>
        <h4 style="color: var(--primary-dark); margin-bottom: 4px; font-size: 0.9rem;"><i class="fa-solid fa-file-lines"></i> Description</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.4;">${p.detailedDescription || p.description}</p>
      </div>

      <div style="background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 0.8rem; border: 1px solid var(--border-light); display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div><strong>Active Ingredient:</strong><br/>${p.activeIngredient}</div>
        <div><strong>Dosage per Acre:</strong><br/>${p.dosage}</div>
      </div>

      <div class="product-modal-actions" style="border-top: 1px solid var(--border-light); padding-top: 12px; display: flex; gap: 10px;">
        <button class="btn btn-primary" onclick="addToCart('${p.id}'); closeModal('productModal');" style="flex: 1; justify-content: center;"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
        <button class="btn btn-gold" onclick="window.open('https://api.whatsapp.com/send?text=Hi%20Sathya%20Bio!%20I%20want%20to%20order%20' + encodeURIComponent('${p.name}'), '_blank')" style="justify-content: center;"><i class="fa-brands fa-whatsapp"></i> Buy via WhatsApp</button>
      </div>

      ${relatedHTML}
    </div>
  `;

  openModal('productModal');
}

function openProductPage(productId) {
  window.location.href = `/product/${encodeURIComponent(productId)}`;
}

window.openProductModal = openProductModal;
window.openProductPage = openProductPage;


// --- CHATBOT LOGIC ---
window.toggleChatbot = function(forceState) {
  const trigger = document.getElementById('chatbotTriggerBtn');
  const windowEl = document.getElementById('chatbotWindow');
  if (!trigger || !windowEl) return;

  const isActive = typeof forceState === 'boolean'
    ? forceState
    : !windowEl.classList.contains('active');

  if (isActive) {
    windowEl.classList.add('active');
    trigger.querySelector('i').className = 'fa-solid fa-xmark';
    document.getElementById('chatbotInput')?.focus();
  } else {
    windowEl.classList.remove('active');
    trigger.querySelector('i').className = 'fa-solid fa-comments';
  }
};

window.sendQuickChat = function(text) {
  const windowEl = document.getElementById('chatbotWindow');
  if (windowEl && !windowEl.classList.contains('active')) {
    window.toggleChatbot(true);
  }
  addChatMessage('user', text);
  setTimeout(() => respondAutoChatbot(text), 500);
};

function initChatbot() {
  const sendBtn  = document.getElementById('chatbotSendBtn');
  const chatInput = document.getElementById('chatbotInput');

  function sendMessage() {
    const text = chatInput?.value.trim();
    if (!text) return;
    addChatMessage('user', text);
    chatInput.value = '';
    setTimeout(() => respondAutoChatbot(text), 500);
  }

  sendBtn?.addEventListener('click', sendMessage);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

function addChatMessage(sender, text) {
  const messagesContainer = document.getElementById('chatbotMessages');
  if (!messagesContainer) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender === 'user' ? 'user-msg' : 'bot-msg'}`;
  msgDiv.innerHTML = text;

  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function respondAutoChatbot(userText) {
  const lower = userText.toLowerCase();
  let reply = '';

  if (lower.includes('blast') || lower.includes('paddy')) {
    reply = `🌾 <strong>Paddy Blast Defense:</strong> We recommend <strong>Sathya Bio BlastShield 75 WP</strong> (₹680) or <strong>Pseudomonas 1% WP</strong>.<br/>
    <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.75rem; margin-top: 6px;" onclick="addToCart('sb-01')"><i class="fa-solid fa-cart-plus"></i> Add BlastShield to Cart</button>`;
  } else if (lower.includes('whitefly') || lower.includes('cotton')) {
    reply = `🐛 <strong>Cotton Whitefly Defense:</strong> Use <strong>Sathya Bio FlyKill Ultra</strong> (₹840) or <strong>NeemGuard 10000 PPM</strong> (₹580). Spray early morning.<br/>
    <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.75rem; margin-top: 6px;" onclick="addToCart('sb-02')"><i class="fa-solid fa-cart-plus"></i> Add FlyKill Ultra to Cart</button>`;
  } else if (lower.includes('soil')) {
    reply = `🌱 <strong>Soil Analyzer:</strong> Upload your soil test lab PDF/image in our Soil Analyzer section to get N-P-K nutrient recommendations.<br/>
    <button class="btn btn-gold" style="padding: 4px 10px; font-size: 0.75rem; margin-top: 6px;" onclick="document.getElementById('soil').scrollIntoView({behavior:'smooth'})"><i class="fa-solid fa-flask"></i> Go to Soil Analyzer</button>`;
  } else if (lower.includes('agronomist') || lower.includes('speak') || lower.includes('doctor')) {
    reply = `📞 <strong>Senior Agronomist Consultation:</strong> Call toll-free <strong>1800-425-9999</strong> or book a 1-on-1 consultation video call.<br/>
    <button class="btn btn-gold" style="padding: 4px 10px; font-size: 0.75rem; margin-top: 6px;" onclick="openModal('expertModal')"><i class="fa-solid fa-calendar-check"></i> Book Agronomist Call</button>`;
  } else if (lower.includes('weed') || lower.includes('herbicide')) {
    reply = `🌿 <strong>Weed Control:</strong> Use <strong>WeedClear 24-D</strong> (₹340) for broadleaf weeds or <strong>GrassOut 10 EC</strong> (₹480) for grass weeds.<br/>
    <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.75rem; margin-top: 6px;" onclick="addToCart('sb-26')"><i class="fa-solid fa-cart-plus"></i> Add WeedClear to Cart</button>`;
  } else {
    reply = `🌿 <strong>Sathya Bio Crop Assistant:</strong> We offer 35+ bio-certified pesticides and crop nutrients for Paddy, Cotton, Tomato, Wheat, Sugarcane, and Grapes. Filter products by crop or disease above!`;
  }

  addChatMessage('bot', reply);
}


// --- SOIL TEST UPLOAD & ANALYSIS ---
function initSoilUpload() {
  const dropzone = document.getElementById('soilDropzone');
  const fileInput = document.getElementById('soilFileInput');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        processSoilDocument(e.target.files[0].name);
      }
    });
  }
}

window.processSoilDocument = function(filename) {
  const resultDiv = document.getElementById('soilAnalysisResult');
  if (!resultDiv) return;

  resultDiv.innerHTML = `
    <div style="text-align: center; padding: 16px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--primary); margin-bottom: 8px;"></i>
      <p style="color: var(--text-muted); font-size: 0.88rem;">Analyzing "${filename}" with Sathya Bio AI Soil Engine...</p>
    </div>
  `;

  setTimeout(() => {
    resultDiv.innerHTML = `
      <div style="background: #f0fdf4; border: 1px solid var(--border-green); border-radius: 8px; padding: 14px; margin-top: 12px;">
        <h4 style="color: var(--primary-dark); margin-bottom: 8px;"><i class="fa-solid fa-square-check" style="color: var(--primary);"></i> Soil Report Processed</h4>
        <p style="font-size: 0.85rem; color: var(--text-main);">Prescription: Apply <strong>Sathya Bio RootVigor Gold (₹990)</strong> to boost root growth and soil organic matter.</p>
        <button class="btn btn-primary" onclick="addToCart('sb-04')" style="margin-top: 10px; font-size: 0.8rem;"><i class="fa-solid fa-cart-plus"></i> Add RootVigor to Cart</button>
      </div>
    `;
  }, 1200);
};



// --- PHOTO SCANNER ---
function initPhotoScanner() {
  const photoFileInput = document.getElementById('diseasePhotoInput');
  const analyzeBtn = document.getElementById('analyzePhotoBtn');

  if (analyzeBtn && photoFileInput) {
    analyzeBtn.addEventListener('click', () => {
      if (photoFileInput.files.length > 0) {
        processPhotoScan(photoFileInput.files[0]);
      } else {
        showToast('Please select a leaf photo first.', 'warning');
      }
    });
  }
}

function processPhotoScan(file) {
  const scanResult = document.getElementById('photoScannerResult');
  if (!scanResult) return;

  scanResult.innerHTML = `
    <div style="text-align: center; padding: 16px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--primary); margin-bottom: 8px;"></i>
      <p style="color: var(--primary); font-weight: 700; margin-top: 8px;">Scanning leaf structure for fungal spores...</p>
    </div>
  `;

  setTimeout(() => {
    const diag = SAMPLE_DISEASE_DIAGNOSES[0];
    scanResult.innerHTML = `
      <div style="background: #ffffff; border: 1px solid var(--border-light); padding: 14px; border-radius: 8px; margin-top: 12px;">
        <span style="background: #fef2f2; color: #ef4444; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">Match: ${diag.confidence}</span>
        <h3 style="margin: 8px 0 4px 0; font-size: 1.05rem; color: var(--primary-dark);">${diag.diseaseName}</h3>
        <p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 8px;">${diag.symptoms}</p>
        <div style="background: #f0fdf4; padding: 8px; border-radius: 6px; font-size: 0.82rem; margin-bottom: 10px;">
          <strong>Remedy:</strong> ${diag.recommendedProduct}
        </div>
        <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="addToCart('${diag.productId}'); closeModal('photoScannerModal');">
          <i class="fa-solid fa-cart-plus"></i> Add Remedy to Cart
        </button>
      </div>
    `;
  }, 1200);
}


// --- TICKETS & N8N & EXPERT ---
let tickets = [...INITIAL_TICKETS];

function initTicketSystem() {
  renderTickets();
  document.getElementById('newTicketForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newId = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
    tickets.unshift({
      id: newId,
      subject: e.target.querySelector('input[type="text"]')?.value || 'Field Inquiry',
      category: 'Field Advisory',
      crop: 'Paddy/Rice',


            severity: 'High',
      status: 'In Progress',
      date: new Date().toISOString().split('T')[0],
      assignedExpert: 'Sathya Bio Advisory Team'
    });
    renderTickets();
    closeModal('ticketModal');
    showToast(`Support ticket ${newId} created successfully.`, 'success');
  });
}

function renderTickets() {
  const container = document.getElementById('ticketListContainer');
  if (!container) return;

  container.innerHTML = tickets.map(t => `
    <div style="background: #ffffff; border: 1px solid var(--border-light); padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="color: var(--text-main); font-size: 0.9rem;">${t.subject}</strong>
        <span style="display: block; font-size: 0.78rem; color: var(--text-muted);">${t.id} | ${t.crop} | ${t.date}</span>
      </div>
      <span style="background: #ecfdf5; color: var(--primary); padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 0.75rem;">${t.status}</span>
    </div>
  `).join('');
}

function initN8nVisualizer() {
  const container = document.getElementById('n8nNodesContainer');
  const testBtn = document.getElementById('testN8nBtn');
  const logEl = document.getElementById('n8nExecutionLog');

  if (container) {
    container.innerHTML = N8N_WORKFLOW_NODES.map(node => `
      <div style="background: #f8fafc; border: 1px solid var(--border-light); border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <strong style="font-size: 0.85rem; color: var(--primary-dark);">${node.name}</strong>
          <span style="display: block; font-size: 0.75rem; color: var(--text-muted);">${node.desc}</span>
        </div>
        <span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700;">${node.status}</span>
      </div>
    `).join('');
  }

  if (testBtn && logEl) {
    testBtn.addEventListener('click', () => {
      logEl.innerHTML = '// Connecting to WhatsApp Webhook...<br/>';
      setTimeout(() => { logEl.innerHTML += '[OK] Incoming message: "My paddy leaves have yellow spots"<br/>'; }, 500);
      setTimeout(() => { logEl.innerHTML += '[OK] AI LLM Node: Extracted Crop="Paddy", Symptoms="Yellow Blast Spots"<br/>'; }, 1000);
      setTimeout(() => { logEl.innerHTML += '[OK] Catalog Node: Matched "BlastShield 75 WP"<br/>'; }, 1500);
      setTimeout(() => { logEl.innerHTML += '<strong style="color:#16a34a;">[SUCCESS] Sent WhatsApp remedy guide & 1-click buy button to +91-9876543210</strong>'; }, 2000);
    });
  }
}

function initExpertBooking() {
  const grid = document.getElementById('expertsGrid');
  if (!grid) return;

  grid.innerHTML = EXPERTS.map(exp => `
    <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 16px; display: flex; gap: 14px; align-items: center;">
      <img loading="lazy" decoding="async" src="${exp.avatar}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);" />
      <div>
        <h4 style="font-size: 0.95rem; color: var(--primary-dark);">${exp.name}</h4>
        <span style="font-size: 0.78rem; color: var(--text-muted); display: block; margin-bottom: 4px;">${exp.title}</span>
        <div style="font-size: 0.75rem; color: var(--primary); font-weight: 700;">${exp.rating}</div>
        <button class="btn btn-outline" style="padding: 4px 12px; font-size: 0.75rem; margin-top: 8px;" onclick="openModal('expertModal')">Book Consultation</button>
      </div>
    </div>
  `).join('');
}


// --- MODALS ENGINE ---
function initModals() {
  initModalPrewarm();
  document.querySelectorAll('[data-modal-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-modal-target');
      if (targetId) openModal(targetId);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    // On phones the "×" text is hidden and drawn as an icon, so name the button.
    if (!btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', 'Close');
    btn.addEventListener('click', () => {
      const overlay = btn.closest('.modal-overlay');
      if (overlay) closeModal(overlay.id);
    });
  });

  // Escape closes the top-most open window (and the cart drawer).
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.modal-overlay.active')].pop();
    if (open) closeModal(open.id);
    else document.getElementById('cartOverlay')?.classList.remove('active');
  });

  initPosterSwipeToDismiss();
  initMobileMenu();
  initFooterAccordions();
  initMobileNavActiveState();
  initNavDebugPanel();
}

// On-device diagnostics for the bottom bar. Open the storefront with
// ?debug=nav to overlay live viewport numbers and outline the bar in red, then
// screenshot it while the bar is hidden. Does nothing without the parameter.
function initNavDebugPanel() {
  if (new URLSearchParams(location.search).get('debug') !== 'nav') return;
  const nav = document.getElementById('mobileBottomNav');
  const vv = window.visualViewport;

  const probe = unit => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:0;left:-9999px;width:1px;height:100${unit};visibility:hidden;pointer-events:none`;
    document.body.appendChild(el);
    return el;
  };
  const vhProbe = probe('vh');
  const dvhProbe = CSS.supports('height', '100dvh') ? probe('dvh') : null;

  const panel = document.createElement('pre');
  panel.id = 'navDebugPanel';
  panel.style.cssText = 'position:fixed;top:130px;left:8px;right:8px;z-index:2147483647;margin:0;padding:8px 10px;background:rgba(0,0,0,0.85);color:#7cfc00;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;border-radius:8px;pointer-events:none';
  document.body.appendChild(panel);
  if (nav) nav.style.outline = '3px solid #ff2d55';

  const describe = el => {
    if (!el) return 'none';
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '';
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}`;
  };

  const render = () => {
    const rect = nav?.getBoundingClientRect();
    const css = nav ? getComputedStyle(nav) : null;
    const visibleBottom = vv ? vv.offsetTop + vv.height : innerHeight;
    // elementFromPoint skips this panel (pointer-events: none).
    const hit = document.elementFromPoint(innerWidth / 2, Math.max(0, visibleBottom - 8));
    const ua = (navigator.userAgent.match(/(SamsungBrowser|Chrome|CriOS|Firefox|Version)\/[\d.]+/g) || []).join(' ');
    const fixed = n => (typeof n === 'number' ? n.toFixed(1) : '-');
    panel.textContent = [
      `ua         ${ua}`,
      `url        ${location.pathname}  top=${window.top === window}`,
      `screen     ${screen.width}x${screen.height} dpr=${devicePixelRatio}`,
      `inner      ${innerWidth}x${innerHeight}  client=${document.documentElement.clientHeight}`,
      `visualVP   h=${fixed(vv?.height)} top=${fixed(vv?.offsetTop)} scale=${vv ? vv.scale.toFixed(2) : '-'}`,
      `100vh=${vhProbe.offsetHeight}  100dvh=${dvhProbe ? dvhProbe.offsetHeight : 'n/a'}`,
      `scrollY    ${Math.round(scrollY)} / ${document.documentElement.scrollHeight}`,
      `nav rect   top=${fixed(rect?.top)} bottom=${fixed(rect?.bottom)} visibleBottom=${fixed(visibleBottom)}`,
      `nav css    bottom=${css?.bottom} margin-bottom=${css?.marginBottom} display=${css?.display}`,
      `bottom hit ${describe(hit)} ${nav && nav.contains(hit) ? '(nav OK)' : '(NOT nav)'}`,
    ].join('\n');
  };

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      render();
    });
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  vv?.addEventListener('resize', queue);
  vv?.addEventListener('scroll', queue);
  // Toolbar animations do not always fire events; keep the numbers fresh.
  setInterval(render, 500);
  render();
}


// A downward swipe dismisses a bottom card or sheet, like a native bottom
// sheet. `scroller` keeps its own scrolling until it is back at the top.
function enableSwipeToDismiss(card, onDismiss, scroller = card) {
  if (!card) return;
  let startX = 0;
  let startY = 0;
  let dy = 0;
  let tracking = false;
  let decided = false;

  const resetDrag = () => {
    card.style.removeProperty('transform');
    card.style.removeProperty('transition');
    card.style.removeProperty('opacity');
  };

  card.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || e.target.closest('select, input, textarea')) return;
    if (scroller && scroller.contains(e.target) && scroller.scrollTop > 0) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dy = 0;
    tracking = true;
    decided = false;
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    if (!tracking) return;
    const moveX = e.touches[0].clientX - startX;
    const moveY = e.touches[0].clientY - startY;
    if (!decided) {
      if (Math.abs(moveX) < 6 && Math.abs(moveY) < 6) return;
      decided = true;
      // Sideways is a chip row scrolling; upward is not a dismiss.
      if (Math.abs(moveX) > Math.abs(moveY) || moveY < 0) {
        tracking = false;
        return;
      }
    }
    dy = Math.max(0, moveY);
    // Stylesheets position these with !important, so the drag must too.
    card.style.setProperty('transition', 'none', 'important');
    card.style.setProperty('transform', `translateY(${dy}px)`, 'important');
    card.style.setProperty('opacity', String(Math.max(0.4, 1 - dy / 320)));
  }, { passive: true });

  const endDrag = () => {
    if (!tracking) return;
    tracking = false;
    if (dy > 70) {
      onDismiss();
      setTimeout(resetDrag, 350);
    } else {
      resetDrag();
    }
  };
  card.addEventListener('touchend', endDrag);
  card.addEventListener('touchcancel', endDrag);
}

// On phones the welcome poster is a card docked above the bottom nav.
function initPosterSwipeToDismiss() {
  const card = document.querySelector('#welcomePosterModal .welcome-poster-card');
  enableSwipeToDismiss(card, () => closeModal('welcomePosterModal'), card?.querySelector('.welcome-poster-body'));

  // Every other popup is a bottom sheet on phones (grab handle at the top);
  // a downward swipe from the top of its content closes it too.
  document.querySelectorAll('.modal-overlay:not(#welcomePosterModal) .modal-card').forEach(sheet => {
    const overlay = sheet.closest('.modal-overlay');
    enableSwipeToDismiss(sheet, () => closeModal(overlay.id), sheet);
  });
}

// ==================== MOBILE MENU SHEET (phones) ====================

// 'is-opening' counts as open, so a second tap during the warm-up frame closes.
function isMobileMenuOpen() {
  const sheet = document.getElementById('mobileMenuSheet');
  return Boolean(sheet && (sheet.classList.contains('active') || sheet.classList.contains('is-opening')));
}

window.toggleMobileMenu = function(open) {
  const sheet = document.getElementById('mobileMenuSheet');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  if (!sheet || !backdrop) return;
  const next = typeof open === 'boolean' ? open : !isMobileMenuOpen();
  if (next === isMobileMenuOpen()) return;

  if (next) {
    refreshMobileMenuAccount();
    closeModal('welcomePosterModal');
    // No scrollTop reset here: touching scroll position forced a layout of the
    // whole page (1,191 objects) on the tap frame. It is reset after closing.
  } else {
    // Back to the top for next time, once the slide-out has finished.
    setTimeout(() => {
      if (!isMobileMenuOpen() && sheet.scrollTop !== 0) sheet.scrollTop = 0;
    }, 450);
  }
  // The closed sheet stays painted just below the screen (responsive.css 7d),
  // so there is nothing to warm up: the slide starts on the next frame.
  sheet.classList.remove('is-opening');
  backdrop.classList.remove('is-opening');
  sheet.classList.toggle('active', next);
  backdrop.classList.toggle('active', next);
  sheet.toggleAttribute('inert', !next);
  sheet.setAttribute('aria-hidden', String(!next));

  const menuBtn = document.getElementById('mobileNavMenu');
  if (menuBtn) {
    menuBtn.setAttribute('aria-expanded', String(next));
    menuBtn.classList.toggle('is-open', next);
    const icon = menuBtn.querySelector('i');
    if (icon) icon.className = next ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  }
  syncOverlayState();
  // The tab highlight reads layout; doing it in this frame forced a style and
  // layout pass right as the sheet starts to slide.
  requestAnimationFrame(updateMobileNavActive);
};

// Menu chips filter the catalogue and take the shopper straight to it.
window.shopFromMenu = function(kind, value) {
  if (kind === 'crop') window.filterByCrop(value);
  else window.filterByCategory(value);
  toggleMobileMenu(false);
  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
};

function refreshMobileMenuAccount() {
  const user = getStoredUser();
  const name = document.getElementById('mmsAccountName');
  const sub = document.getElementById('mmsAccountSub');
  const btn = document.getElementById('mmsAccountBtn');
  if (!name || !sub || !btn) return;
  // Runs on the tap that opens the sheet: rewriting unchanged text replaced the
  // text nodes and forced style and layout right as the slide begins.
  const setText = (el, value) => {
    const shown = localizedSources.get(el.firstChild)?.source ?? el.textContent;
    if (shown !== value) el.textContent = value;
  };
  if (user) {
    setText(name, `Hi, ${user.name || 'Farmer'}`);
    setText(sub, [user.crop, user.village || user.district].filter(Boolean).join(' · ') || 'Signed in');
    setText(btn, 'My Account');
  } else {
    setText(name, 'Welcome to Sathya Bio');
    setText(sub, 'Sign in to track orders & get crop advice');
    setText(btn, 'Sign In');
  }
}

function initMobileMenu() {
  const sheet = document.getElementById('mobileMenuSheet');
  const nav = document.getElementById('mobileBottomNav');
  if (!sheet) return;
  // Painted below the screen while closed; keep it out of focus order.
  sheet.toggleAttribute('inert', !isMobileMenuOpen());

  // Tiles and links in the sheet do their job, then the sheet closes.
  sheet.addEventListener('click', e => {
    if (e.target.closest('a, [data-close-menu]')) toggleMobileMenu(false);
  });

  // Any other bottom-bar tab closes the sheet first. Capture phase, because
  // the basket handler stops propagation.
  nav?.addEventListener('click', e => {
    const item = e.target.closest('.mobile-nav-item');
    if (item && item.id !== 'mobileNavMenu') toggleMobileMenu(false);
  }, true);

  enableSwipeToDismiss(sheet, () => toggleMobileMenu(false));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isMobileMenuOpen()) toggleMobileMenu(false);
  });

  // Rotating or resizing to the desktop layout must not leave it open.
  const desktop = window.matchMedia('(min-width: 769px)');
  const onChange = ev => { if (ev.matches) toggleMobileMenu(false); };
  if (desktop.addEventListener) desktop.addEventListener('change', onChange);
}

// Highlights the bottom-bar tab for where the shopper is.
function updateMobileNavActive() {
  const nav = document.getElementById('mobileBottomNav');
  if (!nav || getComputedStyle(nav).display === 'none') return;
  let key = 'home';
  if (isMobileMenuOpen()) {
    key = 'menu';
  } else {
    const rect = document.getElementById('catalog')?.getBoundingClientRect();
    if (rect && rect.top < window.innerHeight * 0.45 && rect.bottom > 140) key = 'shop';
  }
  nav.querySelectorAll('.mobile-nav-item[data-nav]').forEach(item => {
    const on = item.dataset.nav === key;
    item.classList.toggle('active', on);
    if (on) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

function initMobileNavActiveState() {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateMobileNavActive();
    });
  }, { passive: true });
  updateMobileNavActive();
}

// Footer link groups collapse into accordions on phones.
function initFooterAccordions() {
  document.querySelectorAll('.footer-col-title').forEach(title => {
    const toggle = () => {
      if (!window.matchMedia('(max-width: 768px)').matches) return;
      const open = title.closest('.footer-col').classList.toggle('open');
      title.setAttribute('aria-expanded', String(open));
    };
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

// --- TOAST NOTIFICATIONS ---
// js/toast.js (loaded before this file) provides window.toast: stacked,
// swipeable, accessible notifications shared with checkout and order status,
// styled like the Sonner toasts in the React app. showToast() keeps the
// storefront's call signature. type: 'success' | 'error' | 'warning' | 'info'.
// Returns a function that dismisses the toast.
function showToast(message, type = 'info', duration) {
  const api = window.toast;
  if (!api) {
    console.warn(message);
    return () => {};
  }
  const show = typeof api[type] === 'function' ? api[type] : api;
  const id = show(message, duration ? { duration } : {});
  return () => api.dismiss(id);
}

window.showToast = showToast;

// --- LIVE FORM VALIDATION ---
// Validates while the user types and shows the message directly under the
// field, instead of waiting for submit and firing a toast.

function ensureFieldErrorStyles() {
  if (document.getElementById('sbFieldErrorStyles')) return;
  const style = document.createElement('style');
  style.id = 'sbFieldErrorStyles';
  style.textContent = `
    .sb-field-error {
      display: block;
      margin-top: 4px;
      color: #dc2626;
      font-size: 0.76rem;
      font-weight: 600;
      line-height: 1.3;
    }
    .sb-field-ok {
      display: block;
      margin-top: 4px;
      color: #16a34a;
      font-size: 0.76rem;
      font-weight: 600;
    }
    .sb-input-invalid {
      border-color: #dc2626 !important;
      background: rgba(220, 38, 38, 0.04);
    }
    .sb-input-valid {
      border-color: #16a34a !important;
    }
    .sb-password-rules {
      list-style: none;
      margin: 6px 0 0;
      padding: 0;
      display: grid;
      gap: 2px;
      font-size: 0.74rem;
      color: #6b7280;
      line-height: 1.35;
    }
    .sb-password-rules li.ok {
      color: #16a34a;
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
}

function setFieldError(el, message) {
  if (!el) return;
  ensureFieldErrorStyles();
  el.classList.add('sb-input-invalid');
  el.classList.remove('sb-input-valid');
  el.setAttribute('aria-invalid', 'true');

  let hint = el.parentElement?.querySelector('.sb-field-error, .sb-field-ok');
  if (!hint) {
    hint = document.createElement('small');
    el.parentElement?.appendChild(hint);
  }
  hint.className = 'sb-field-error';
  hint.textContent = message;
}

function setFieldValid(el, message = '') {
  if (!el) return;
  ensureFieldErrorStyles();
  el.classList.remove('sb-input-invalid');
  el.classList.add('sb-input-valid');
  el.removeAttribute('aria-invalid');

  const hint = el.parentElement?.querySelector('.sb-field-error, .sb-field-ok');
  if (!hint) return;
  if (message) {
    hint.className = 'sb-field-ok';
    hint.textContent = message;
  } else {
    hint.remove();
  }
}

function clearField(el) {
  if (!el) return;
  el.classList.remove('sb-input-invalid', 'sb-input-valid');
  el.removeAttribute('aria-invalid');
  el.parentElement?.querySelector('.sb-field-error, .sb-field-ok')?.remove();
}

// Returns true when the field currently holds a valid value.
function validatePhoneField(el) {
  const v = el.value;
  if (!v) { clearField(el); return false; }
  // A bad first digit is wrong from the very first keystroke — say so straight
  // away rather than making them type all ten first.
  if (!/^[6-9]/.test(v)) {
    setFieldError(el, 'An Indian mobile number must start with 6, 7, 8 or 9.');
    return false;
  }
  if (v.length < 10) {
    setFieldError(el, `Enter all 10 digits (${v.length}/10).`);
    return false;
  }
  setFieldValid(el, 'Looks good.');
  return true;
}

// Farmer password rules. The server enforces the same rules in
// server/security.js (passwordRules) - keep the two in step.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd', 'admin123', 'admin1234', 'welcome1',
  'welcome123', 'qwerty123', 'qwertyuiop', 'asdfghjkl', 'iloveyou', 'abc12345', 'abcd1234', 'india123',
  'farmer123', 'sathyabio', 'sathya123', '12345678', '123456789', '1234567890', '11111111', '00000000',
  '87654321', 'test1234', 'letmein1',
]);

function farmerPasswordChecks(password, phone) {
  return [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'At least one letter (a-z)', ok: /[A-Za-z]/.test(password) },
    { label: 'At least one number (0-9)', ok: /\d/.test(password) },
    {
      label: 'Not a common password or your mobile number',
      ok: password.length > 0 && !COMMON_PASSWORDS.has(password.toLowerCase()) && !(phone && password.includes(phone)),
    },
  ];
}

// Shows the password rules under the field, ticking each one off as it is met,
// so people know what to type before they are told it is wrong.
function renderPasswordChecklist(el) {
  ensureFieldErrorStyles();
  let list = el.parentElement?.querySelector('.sb-password-rules');
  if (!list) {
    list = document.createElement('ul');
    list.className = 'sb-password-rules';
    list.setAttribute('aria-live', 'polite');
    el.insertAdjacentElement('afterend', list);
  }

  const phone = document.getElementById('regPhone')?.value?.trim() || '';
  const checks = farmerPasswordChecks(el.value, phone);
  list.replaceChildren(...checks.map(check => {
    const item = document.createElement('li');
    if (check.ok) item.className = 'ok';
    item.textContent = `${check.ok ? '✓' : '○'} ${check.label}`;
    return item;
  }));
  return checks.every(check => check.ok);
}

function validatePasswordField(el) {
  const ok = renderPasswordChecklist(el);
  el.parentElement?.querySelector('.sb-field-error, .sb-field-ok')?.remove();
  el.classList.remove('sb-input-invalid');
  el.removeAttribute('aria-invalid');
  el.classList.toggle('sb-input-valid', ok);
  return ok;
}

function validateNameField(el) {
  const v = el.value.trim();
  if (!v) { clearField(el); return false; }
  if (v.replace(/[^A-Za-zÀ-ɏ]/g, '').length < 2) {
    setFieldError(el, 'Please enter your name, not a number.');
    return false;
  }
  setFieldValid(el);
  return true;
}

// Keeps only the characters a field accepts, as the user types.
function restrictToDigits(el, maxLength) {
  el.setAttribute('inputmode', 'numeric');
  el.addEventListener('input', () => {
    const cleaned = el.value.replace(/\D/g, '').slice(0, maxLength);
    if (cleaned !== el.value) {
      const atEnd = el.selectionStart === el.value.length;
      el.value = cleaned;
      if (!atEnd) el.setSelectionRange(cleaned.length, cleaned.length);
    }
  });
  el.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text') || '';
    el.value = text.replace(/\D/g, '').slice(0, maxLength);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function initFormValidation() {
  const regPhone = document.getElementById('regPhone');
  if (regPhone) {
    restrictToDigits(regPhone, 10);
    regPhone.setAttribute('maxlength', '10');
    regPhone.addEventListener('input', () => validatePhoneField(regPhone));
    regPhone.addEventListener('blur', () => {
      if (!regPhone.value) setFieldError(regPhone, 'Mobile number is required.');
    });
  }

  const regPassword = document.getElementById('regPassword');
  if (regPassword) {
    regPassword.addEventListener('focus', () => renderPasswordChecklist(regPassword));
    regPassword.addEventListener('input', () => validatePasswordField(regPassword));
    // "Not your mobile number" depends on the number, so refresh the list when it changes.
    regPhone?.addEventListener('input', () => {
      if (regPassword.parentElement?.querySelector('.sb-password-rules')) validatePasswordField(regPassword);
    });
  }

  const regName = document.getElementById('regName');
  if (regName) {
    regName.addEventListener('input', () => validateNameField(regName));
  }

  const otpInput = document.getElementById('storefrontOtpInput');
  if (otpInput) {
    restrictToDigits(otpInput, 6);
    otpInput.setAttribute('maxlength', '6');
  }

  const acreage = document.getElementById('regAcreage');
  if (acreage) restrictToDigits(acreage, 4);

  // Sign-in accepts either a mobile number or an email, so characters aren't
  // filtered — only the shape is checked once something has been typed.
  const loginId = document.getElementById('loginIdentifier');
  if (loginId) {
    loginId.addEventListener('input', () => {
      const v = loginId.value.trim();
      if (!v) { clearField(loginId); return; }
      const isPhone = /^\d+$/.test(v);
      if (isPhone && v.length !== 10) setFieldError(loginId, `Mobile number needs 10 digits (${v.length}/10).`);
      else if (isPhone && !/^[6-9]/.test(v)) setFieldError(loginId, 'Number must start with 6, 7, 8 or 9.');
      else if (!isPhone && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) setFieldError(loginId, 'Enter a valid mobile number or email address.');
      else setFieldValid(loginId);
    });
  }
}

window.clearStorefrontFieldErrors = function() {
  ['regName', 'regPhone', 'regPassword', 'loginIdentifier', 'loginPassword']
    .forEach(id => clearField(document.getElementById(id)));
  document.querySelectorAll('.sb-password-rules').forEach(list => list.remove());
};

// Body classes other styles key off, instead of a document-wide :has()
// selector that made every class change re-check the whole page.
function syncOverlayState() {
  const body = document.body;
  const blocking = document.querySelector('.modal-overlay.active:not(#welcomePosterModal), .modal-overlay.is-opening:not(#welcomePosterModal), .mobile-menu-sheet.active, .mobile-menu-sheet.is-opening, .sidebar-panel.active');
  body.classList.toggle('overlay-open', Boolean(blocking));
  body.classList.toggle('poster-open', Boolean(document.getElementById('welcomePosterModal')?.classList.contains('active')));
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal || modal.classList.contains('active')) return;
  const prewarmedAt = Number(modal.dataset.prewarmAt || 0);
  if (modal.classList.contains('is-opening') && !prewarmedAt) return; // already opening
  delete modal.dataset.prewarmAt;

  const start = () => {
    if (!modal.classList.contains('is-opening')) return; // closed meanwhile
    modal.classList.add('active');
    modal.classList.remove('is-opening');
    syncOverlayState();
  };

  // Paint the (still transparent) overlay and promote the card at least one
  // frame before the slide starts, so the animation's first frame is not
  // spent creating and rasterising the layer - the stutter on phones.
  modal.classList.add('is-opening');
  syncOverlayState();
  if (prewarmedAt && performance.now() - prewarmedAt > 20) {
    // Warmed on touch-down (prewarmModal) - the layer is ready: slide now.
    start();
  } else {
    requestAnimationFrame(() => requestAnimationFrame(start));
  }
}

// Touch-down on anything that opens a popup starts its warm-up, so by the time
// the finger lifts (~80-150ms later) the sheet can slide straight away instead
// of waiting two more frames. Not tapped after all (a scroll): cools down.
function prewarmModal(id) {
  const modal = document.getElementById(id);
  if (!modal || modal.classList.contains('active') || modal.classList.contains('is-opening')) return;
  modal.dataset.prewarmAt = String(performance.now());
  modal.classList.add('is-opening');
  clearTimeout(modal._prewarmCooldown);
  modal._prewarmCooldown = setTimeout(() => {
    if (!modal.dataset.prewarmAt) return;
    delete modal.dataset.prewarmAt;
    modal.classList.remove('is-opening');
    syncOverlayState();
  }, 800);
}

function initModalPrewarm() {
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || !(e.target instanceof Element)) return;
    const trigger = e.target.closest('[data-modal-target]');
    if (trigger) {
      prewarmModal(trigger.getAttribute('data-modal-target'));
    } else if (e.target.closest('#headerAccountBtn') || (e.target.closest('#mobileNavCart') && !isFarmerLoggedIn())) {
      prewarmModal('authModal');
    }
  }, { passive: true, capture: true });
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active', 'is-opening');
    delete modal.dataset.prewarmAt;
  }
  if (id === 'authModal' && typeof clearAuthNotice === 'function') clearAuthNotice();
  syncOverlayState();
}

window.openModal = openModal;
window.closeModal = closeModal;


// ==================== AUTHENTICATION & LIVE DATABASE ENGINE ====================

function getStoredUser() {
  try {
    const raw = localStorage.getItem('sathya_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// The farmer dashboard (/farmer) saves the farmer's last orders and profile
// under this prefix so they show without signal (src/farmer/data/resourceCache.js).
function clearFarmerDashboardData() {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith('sathya_fd:'))
      .forEach(key => localStorage.removeItem(key));
  } catch {}
}

async function fetchLiveProducts() {
  const currentUser = getStoredUser();
  const userId = currentUser ? currentUser.id : '';

  try {
    const res = await fetch(`/api/products?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      PESTICIDES = json.data;
      renderProducts();
      renderTrendingProducts();
    }
  } catch (err) {
    console.warn('Backend database loading fallback:', err);
    renderProducts();
    renderTrendingProducts();
  }
}

async function fetchLiveCatalogOptions() {
  try {
    const res = await fetch('/api/catalog-options');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) return;

    const categories = ['All', ...(json.data.categories || [])];
    const crops = [{ id: 'all', name: 'All Crops' }, ...(json.data.crops || []).map(crop => ({ id: crop, name: crop }))];
    const categorySelect = document.getElementById('categorySelect');
    const searchCategorySelect = document.getElementById('searchCategorySelect');
    const cropSelect = document.getElementById('cropSelect');

    if (categorySelect) categorySelect.innerHTML = categories.map(value => `<option value="${value}">${value}</option>`).join('');
    if (searchCategorySelect) searchCategorySelect.innerHTML = categories.map(value => `<option value="${value}">${value === 'All' ? 'All Categories' : value}</option>`).join('');
    if (cropSelect) cropSelect.innerHTML = crops.map(crop => `<option value="${crop.id}">${crop.name}</option>`).join('');
  } catch (err) {
    console.warn('Catalog options unavailable:', err);
  }
}

function checkStorefrontAuth() {
  const user = getStoredUser();
  const accountSub = document.getElementById('headerAccountSub');
  const accountTitle = document.getElementById('headerAccountTitle');
  const accountIcon = document.getElementById('headerAccountIcon');
  const greeting = document.getElementById('topbarUserGreeting');
  const loggedInView = document.getElementById('authLoggedInView');
  const loggedOutView = document.getElementById('authLoggedOutView');
  const adminLink = document.getElementById('adminPortalLink');

  // The farmer dashboard is for farmer accounts only; src/App.jsx guards /farmer the same way.
  const isFarmer = Boolean(user) && user.role === 'farmer';
  [['farmerDashboardLink', 'flex'], ['mmsFarmLink', 'flex'], ['mobileNavFarm', '']].forEach(([id, shown]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = isFarmer ? shown : 'none';
  });
  // Six tabs instead of five: responsive.css tightens the bar so Tamil labels still fit.
  document.getElementById('mobileBottomNav')?.classList.toggle('has-farm-tab', isFarmer);

  if (user) {
    const role = user.role || 'farmer';
    const crop = user.crop || user.primaryCrop || 'All Crops';
    const acreage = user.acreage || user.landAcres || 1;
    if (accountSub) accountSub.textContent = crop;
    if (accountTitle) accountTitle.textContent = (user.name ? user.name.split(' ')[0] : 'Farmer') + ' ▾';
    if (accountIcon) {
      accountIcon.className = 'fa-solid fa-circle-check action-icon';
      accountIcon.style.color = '#10b981';
    }

    if (greeting) {
      greeting.style.display = 'inline-block';
      // Built from nodes, not HTML, because the name and crop are user-entered text.
      const leaf = document.createElement('i');
      leaf.className = 'fa-solid fa-leaf';
      const name = document.createElement('strong');
      name.textContent = user.name || 'Farmer';
      greeting.replaceChildren(leaf, ' Welcome, ', name, ` (${crop})`);
    }

    // Populate logged in modal view
    const initialEl = document.getElementById('loggedInUserInitial');
    const nameEl = document.getElementById('loggedInUserName');
    const roleBadge = document.getElementById('loggedInUserRoleBadge');
    const phoneEl = document.getElementById('loggedInUserPhone');
    const cropEl = document.getElementById('loggedInUserCrop');
    const locEl = document.getElementById('loggedInUserLocation');

    if (initialEl) initialEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = user.name;

    if (roleBadge) {
      roleBadge.textContent = role === 'farmer' ? `🌾 ${crop} Farmer` : `🛡️ ${role.toUpperCase()} Staff`;
    }
    if (phoneEl) phoneEl.textContent = user.phone || user.mobile || 'Verified Customer';
    // Every crop the farmer grows; accounts from before multi-crop support have only `crop`.
    const allCrops = Array.isArray(user.crops) && user.crops.length ? user.crops.join(', ') : crop;
    if (cropEl) cropEl.textContent = `${allCrops} (${acreage} Acres)`;
    if (locEl) locEl.textContent = `${user.village || 'Farm'}, ${user.district || 'Tamil Nadu'}`;

    if (adminLink) {
      adminLink.style.display = user.role === 'admin' ? 'inline-flex' : 'none';
    }

    if (loggedInView) loggedInView.style.display = 'block';
    if (loggedOutView) loggedOutView.style.display = 'none';

  } else {
    if (accountSub) accountSub.textContent = 'Account';
    if (accountTitle) accountTitle.textContent = 'Sign In / Register';

    if (accountIcon) {
      accountIcon.className = 'fa-regular fa-circle-user action-icon';
      accountIcon.style.color = '';
    }

    if (greeting) greeting.style.display = 'none';

    if (loggedInView) loggedInView.style.display = 'none';
    if (loggedOutView) loggedOutView.style.display = 'block';
  }
}

window.addEventListener('storage', event => {
  if (event.key === 'sathya_user' || event.key === 'sathya_token') checkStorefrontAuth();
});

// The admin Products page (src/pages/admin/Products.jsx) announces changes on this channel.
if ('BroadcastChannel' in window) {
  new BroadcastChannel('sathya_catalog').addEventListener('message', event => {
    if (event.data === 'products-changed') {
      fetchLiveProducts();
      fetchLiveCatalogOptions();
    }
  });
}

// Admin may be working in another browser, where the channel can't reach; catch up on return to this tab.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') fetchLiveProducts();
});

window.handleAccountClick = function() {
  if (typeof clearAuthNotice === 'function') clearAuthNotice();
  checkStorefrontAuth();
  openModal('authModal');
};

function switchAuthTab(tab) {
  const loginTabBtn = document.getElementById('authTabLogin');
  const regTabBtn = document.getElementById('authTabRegister');
  const loginForm = document.getElementById('storefrontLoginForm');
  const regForm = document.getElementById('storefrontRegisterForm');

  // Leaving the forgot-password view brings the tabs back.
  const forgotForm = document.getElementById('storefrontForgotForm');
  if (forgotForm) forgotForm.style.display = 'none';
  const tabsBar = document.getElementById('authTabsBar');
  if (tabsBar) tabsBar.style.display = 'flex';

  if (tab === 'login') {
    if (loginTabBtn) {
      loginTabBtn.style.background = 'rgba(52, 211, 153, 0.15)';
      loginTabBtn.style.color = 'var(--primary)';
    }

    if (regTabBtn) {
      regTabBtn.style.background = 'transparent';
      regTabBtn.style.color = 'var(--text-main)';
    }

    if (loginForm) loginForm.style.display = 'flex';
    if (regForm) regForm.style.display = 'none';

  } else {
    if (regTabBtn) {
      regTabBtn.style.background = 'rgba(52, 211, 153, 0.15)';
      regTabBtn.style.color = 'var(--primary)';
    }

    if (loginTabBtn) {
      loginTabBtn.style.background = 'transparent';
      loginTabBtn.style.color = 'var(--text-main)';
    }

    if (loginForm) loginForm.style.display = 'none';
    if (regForm) regForm.style.display = 'flex';
  }
}
window.switchAuthTab = switchAuthTab;

// ============================================================
// FORGOT PASSWORD - WhatsApp code to the registered number
// Step 1: mobile number -> /api/auth/forgot-password/send-otp
// Step 2: code + new password -> /api/auth/forgot-password/reset, which
// signs the user in (and signs every other device out).
// ============================================================

let forgotPhone = '';
let forgotResendTimer = null;

function forgotEls() {
  return {
    form: document.getElementById('storefrontForgotForm'),
    tabs: document.getElementById('authTabsBar'),
    intro: document.getElementById('forgotIntro'),
    stepPhone: document.getElementById('forgotStepPhone'),
    stepReset: document.getElementById('forgotStepReset'),
    phone: document.getElementById('forgotPhone'),
    otp: document.getElementById('forgotOtp'),
    password: document.getElementById('forgotNewPassword'),
    confirm: document.getElementById('forgotConfirmPassword'),
    sendBtn: document.getElementById('forgotSendBtn'),
    resetBtn: document.getElementById('forgotResetBtn'),
    resendBtn: document.getElementById('forgotResendBtn'),
    resendText: document.getElementById('forgotResendText'),
  };
}

function showForgotStep(step) {
  const els = forgotEls();
  if (!els.form) return;
  els.stepPhone.hidden = step !== 'phone';
  els.stepReset.hidden = step !== 'reset';
  els.intro.textContent = step === 'phone'
    ? "Enter your registered mobile number. We'll send a 6-digit code to its WhatsApp."
    : `Enter the code sent to WhatsApp on +91 ${forgotPhone}, then choose a new password.`;
}

function resetForgotForm() {
  const els = forgotEls();
  forgotPhone = '';
  clearInterval(forgotResendTimer);
  ['phone', 'otp', 'password', 'confirm'].forEach(key => {
    if (els[key]) { els[key].value = ''; clearField(els[key]); }
  });
  els.form?.querySelectorAll('.sb-password-rules').forEach(list => list.remove());
}

window.openForgotPassword = function() {
  const els = forgotEls();
  if (!els.form) return;
  document.getElementById('storefrontLoginForm').style.display = 'none';
  document.getElementById('storefrontRegisterForm').style.display = 'none';
  if (els.tabs) els.tabs.style.display = 'none';
  els.form.style.display = 'flex';
  // Carry over a mobile number already typed into the sign-in form.
  const typed = (document.getElementById('loginIdentifier')?.value || '').replace(/\D/g, '');
  if (!els.phone.value && /^[6-9]\d{9}$/.test(typed)) els.phone.value = typed;
  showForgotStep(forgotPhone ? 'reset' : 'phone');
  (forgotPhone ? els.otp : els.phone)?.focus();
};

window.closeForgotPassword = function() {
  const els = forgotEls();
  if (els.form) els.form.style.display = 'none';
  if (els.tabs) els.tabs.style.display = 'flex';
  switchAuthTab('login');
};

window.forgotChangeNumber = function() {
  resetForgotForm();
  showForgotStep('phone');
  forgotEls().phone?.focus();
};

function startForgotResendCountdown(seconds) {
  const els = forgotEls();
  clearInterval(forgotResendTimer);
  let left = Math.max(0, Math.round(Number(seconds) || 0));
  const tick = () => {
    if (!els.resendBtn) return;
    if (left <= 0) {
      clearInterval(forgotResendTimer);
      els.resendBtn.disabled = false;
      els.resendBtn.textContent = 'Resend code';
      els.resendText.textContent = "Didn't get it?";
      return;
    }
    els.resendBtn.disabled = true;
    els.resendBtn.textContent = `Resend in ${left}s`;
    els.resendText.textContent = 'Code sent on WhatsApp.';
    left -= 1;
  };
  tick();
  forgotResendTimer = setInterval(tick, 1000);
}

window.sendForgotPasswordCode = async function(isResend = false) {
  const els = forgotEls();
  const phone = isResend ? forgotPhone : (els.phone?.value || '').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(phone)) {
    if (!isResend) {
      setFieldError(els.phone, 'Enter your 10-digit registered mobile number.');
      els.phone?.focus();
    }
    return;
  }
  if (!isResend) clearField(els.phone);

  if (isResend) {
    if (els.resendBtn) els.resendBtn.disabled = true;
  } else if (els.sendBtn) {
    els.sendBtn.disabled = true;
    els.sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending code...';
  }

  try {
    const res = await fetch('/api/auth/forgot-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => ({}));

    // A code was sent moments ago: go straight to entering it.
    if (res.status === 429 && data.retryAfter) {
      forgotPhone = phone;
      showForgotStep('reset');
      startForgotResendCountdown(data.retryAfter);
      showToast(data.message, 'warning');
      return;
    }
    if (!res.ok || !data.success) {
      showToast(data.message || 'Could not send the reset code. Please try again.', 'error');
      if (isResend && els.resendBtn) els.resendBtn.disabled = false;
      return;
    }

    forgotPhone = phone;
    showForgotStep('reset');
    startForgotResendCountdown(data.resendAfter || 30);
    showToast(data.message || 'Reset code sent on WhatsApp.', 'success', 6000);
    els.otp?.focus();
  } catch (err) {
    showToast('Could not reach the server. Please check your connection.', 'error');
    if (isResend && els.resendBtn) els.resendBtn.disabled = false;
  } finally {
    if (!isResend && els.sendBtn) {
      els.sendBtn.disabled = false;
      els.sendBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Send reset code';
    }
  }
};

// Live checklist under the new password (farmer rules; the server applies the
// stricter staff rules and explains them if they are not met).
function validateResetPassword() {
  const el = document.getElementById('forgotNewPassword');
  if (!el) return false;
  ensureFieldErrorStyles();
  let list = el.nextElementSibling?.classList?.contains('sb-password-rules') ? el.nextElementSibling : null;
  if (!list) {
    list = document.createElement('ul');
    list.className = 'sb-password-rules';
    list.setAttribute('aria-live', 'polite');
    el.insertAdjacentElement('afterend', list);
  }
  const checks = farmerPasswordChecks(el.value, forgotPhone);
  list.replaceChildren(...checks.map(check => {
    const item = document.createElement('li');
    if (check.ok) item.className = 'ok';
    item.textContent = `${check.ok ? '✓' : '○'} ${check.label}`;
    return item;
  }));
  const ok = checks.every(check => check.ok);
  el.classList.toggle('sb-input-valid', ok);
  return ok;
}

window.submitForgotPassword = async function(e) {
  e.preventDefault();
  const els = forgotEls();
  if (!els.stepReset || els.stepReset.hidden) {
    sendForgotPasswordCode(false);
    return;
  }

  const otp = (els.otp?.value || '').replace(/\D/g, '');
  const password = els.password?.value || '';
  const confirm = els.confirm?.value || '';
  let bad = null;

  if (otp.length !== 6) { setFieldError(els.otp, 'Enter the 6-digit code from WhatsApp.'); bad = bad || els.otp; }
  else clearField(els.otp);
  if (!validateResetPassword()) { setFieldError(els.password, 'Your new password does not meet all the rules above.'); bad = bad || els.password; }
  if (!confirm || confirm !== password) { setFieldError(els.confirm, 'Passwords do not match.'); bad = bad || els.confirm; }
  else clearField(els.confirm);
  if (bad) {
    bad.focus();
    return;
  }

  if (els.resetBtn) {
    els.resetBtn.disabled = true;
    els.resetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';
  }

  try {
    const res = await fetch('/api/auth/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: forgotPhone, otp, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      showToast(data.message || 'Could not reset your password. Please try again.', 'error', 6000);
      if (/expired|request a new code/i.test(data.message || '')) els.otp.value = '';
      return;
    }

    localStorage.setItem('sathya_token', data.token);
    localStorage.setItem('sathya_user', JSON.stringify(data.user));
    resetForgotForm();
    closeForgotPassword();
    checkStorefrontAuth();
    closeModal('authModal');
    showToast(data.message || 'Your password has been reset. You are now signed in.', 'success', 5000);

    await syncCartFromServer();

    const ROLE_HOME = { admin: '/admin', employee: '/employee', delivery: '/delivery', billing: '/billing' };
    const home = ROLE_HOME[data.user?.role];
    if (home) {
      window.top.location.href = home;
      return;
    }
    fetchLiveProducts();
  } catch (err) {
    showToast('Could not reach the server. Please check your connection.', 'error');
  } finally {
    if (els.resetBtn) {
      els.resetBtn.disabled = false;
      els.resetBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Reset password &amp; sign in';
    }
  }
};

// Clears "Passwords do not match" as soon as the two fields agree.
function syncResetConfirm() {
  const password = document.getElementById('forgotNewPassword');
  const confirm = document.getElementById('forgotConfirmPassword');
  if (confirm?.value && confirm.value === password?.value) clearField(confirm);
}

document.getElementById('forgotNewPassword')?.addEventListener('input', () => {
  validateResetPassword();
  syncResetConfirm();
});
document.getElementById('forgotConfirmPassword')?.addEventListener('input', syncResetConfirm);
document.getElementById('forgotOtp')?.addEventListener('input', event => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
});
document.getElementById('forgotPhone')?.addEventListener('input', event => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10);
});

window.submitStorefrontLogin = async function(e) {
  e.preventDefault();

  const identifier = document.getElementById('loginIdentifier')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  const btn = document.getElementById('loginSubmitBtn');

  const idEl = document.getElementById('loginIdentifier');
  const pwEl = document.getElementById('loginPassword');
  let bad = null;

  if (!identifier) { setFieldError(idEl, 'Enter your mobile number or email.'); bad = bad || idEl; }
  if (!password) { setFieldError(pwEl, 'Enter your password.'); bad = bad || pwEl; }

  if (bad) {
    bad.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || 'Login failed. Please check your credentials.', 'error');
      return;
    }

    localStorage.setItem('sathya_token', data.token);
    localStorage.setItem('sathya_user', JSON.stringify(data.user));

    checkStorefrontAuth();
    closeModal('authModal');

    // Carry anything added as a guest into this user's own cart before leaving.
    await syncCartFromServer();

    // Staff roles each have their own portal. Farmers have no separate portal
    // any more - they shop, and stay, on the storefront homepage.
    const ROLE_HOME = {
      admin: '/admin',
      employee: '/employee',
      delivery: '/delivery',
      billing: '/billing',
    };

    const home = ROLE_HOME[data.user.role];
    if (home) {
      window.top.location.href = home;
      return;
    }

    fetchLiveProducts();

  } catch (err) {
    showToast('Could not reach the server. Please check your connection.', 'error');

  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Sign In to Sathya Bio';
    }
  }
};

window.handleStorefrontLogout = function() {
  localStorage.removeItem('sathya_token');
  localStorage.removeItem('sathya_user');

  // Never leave one user's cart on screen for the next person on this device.
  cart = [];
  localStorage.removeItem(GUEST_CART_KEY);
  updateCartUI();
  // Nor the orders the farmer dashboard saved.
  clearFarmerDashboardData();

  checkStorefrontAuth();
  fetchLiveProducts();
  closeModal('authModal');
};


// ============================================================
// STOREFRONT REGISTRATION STATE (WhatsApp OTP)
// ============================================================

let storefrontPendingRegistration = null;
let storefrontOtpTimer = null;
let storefrontOtpSeconds = 30;


// ============================================================
// OTHER CROPS ON THE SIGN-UP FORM
// ============================================================

// Tick boxes for other crops the farmer grows, below the primary crop. The
// choices come from the crop registry (GET /api/crops). If that request fails
// the section stays hidden and sign-up works exactly as before.
async function initRegistrationCropChoices() {
  const section = document.getElementById('regOtherCrops');
  const list = document.getElementById('regOtherCropsList');
  const primary = document.getElementById('regCrop');
  if (!section || !list) return;

  try {
    const res = await fetch('/api/crops');
    if (!res.ok) return;
    const json = await res.json();
    const choices = json.success && Array.isArray(json.data) ? json.data : [];
    if (!choices.length) return;

    list.replaceChildren(...choices.map(choice => {
      const label = document.createElement('label');
      label.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 4px 12px; border: 1px solid var(--border-light); border-radius: 999px; font-size: 0.85rem; cursor: pointer;';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.value = choice.label;
      // The English name is the text key lang-ta.js translates.
      label.append(box, ` ${choice.label}`);
      return label;
    }));

    // The primary crop is not offered again as an "other" crop.
    const hidePrimary = () => {
      list.querySelectorAll('label').forEach(label => {
        const box = label.querySelector('input');
        const isPrimary = Boolean(primary) && box.value === primary.value;
        label.style.display = isPrimary ? 'none' : 'inline-flex';
        if (isPrimary) box.checked = false;
      });
    };
    primary?.addEventListener('change', hidePrimary);
    hidePrimary();
    section.hidden = false;
  } catch (err) {
    console.warn('Crop choices unavailable:', err);
  }
}

// ============================================================
// SUBMIT STOREFRONT REGISTRATION (SENDS OTP)
// ============================================================

window.submitStorefrontRegister = async function(e) {
  e.preventDefault();

  const name = document.getElementById('regName')?.value?.trim();
  const phone = document.getElementById('regPhone')?.value?.trim();
  const password = document.getElementById('regPassword')?.value;
  const crop = document.getElementById('regCrop')?.value;
  const otherCrops = [...document.querySelectorAll('#regOtherCropsList input:checked')].map(box => box.value);
  const acreage = document.getElementById('regAcreage')?.value;
  const village = document.getElementById('regVillage')?.value?.trim();
  const btn = document.getElementById('regSubmitBtn');

  // Show problems under each field rather than as one generic message.
  const nameEl = document.getElementById('regName');
  const phoneEl = document.getElementById('regPhone');
  const passEl = document.getElementById('regPassword');
  let firstBad = null;

  if (!name) { setFieldError(nameEl, 'Please enter your name.'); firstBad = firstBad || nameEl; }
  else if (!validateNameField(nameEl)) { firstBad = firstBad || nameEl; }

  if (!phone) { setFieldError(phoneEl, 'Mobile number is required.'); firstBad = firstBad || phoneEl; }
  else if (!validatePhoneField(phoneEl)) { firstBad = firstBad || phoneEl; }

  if (!password) { setFieldError(passEl, 'Please create a password.'); firstBad = firstBad || passEl; }
  else if (!validatePasswordField(passEl)) {
    setFieldError(passEl, 'Your password does not meet all the rules above.');
    firstBad = firstBad || passEl;
  }

  if (firstBad) {
    firstBad.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...';
  }

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      // The number already has an account — send them straight to Sign In with
      // the number filled in, rather than leaving them stuck on an error.
      if (data.alreadyRegistered) {
        switchAuthTab('login');

        const identifier = document.getElementById('loginIdentifier');
        const password = document.getElementById('loginPassword');
        if (identifier) identifier.value = phone;
        if (password) {
          password.value = '';
          password.focus();
        }

        showToast('This number is already registered. Please sign in with your password.', 'info', 6000);
        return;
      }

      showToast(data.message || 'Failed to send OTP. Please check your mobile number.', 'error');
      return;
    }

    storefrontPendingRegistration = {
      name,
      phone,
      password,
      crop,
      crops: [crop, ...otherCrops],
      acreage: Number(acreage) || 1,
      village: village || 'Coimbatore'
    };

    showStorefrontOtpForm(phone, data.resendAfter);

  } catch (err) {
    console.error('Send OTP error:', err);
    showToast('Could not reach the OTP server. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-seedling"></i> Register & Access Deals';
    }
  }
};


// ============================================================
// VERIFY STOREFRONT OTP & COMPLETE REGISTRATION
// ============================================================

window.verifyStorefrontOtp = async function() {

  if (!storefrontPendingRegistration) {
    showToast('Registration session expired. Please register again.', 'warning');
    return;
  }

  const otpInput = document.getElementById('storefrontOtpInput');
  const otp = otpInput?.value?.trim();
  const verifyBtn = document.getElementById('storefrontOtpVerifyBtn');
  const phone = storefrontPendingRegistration.phone;

  if (!otp || otp.length !== 6) {
    showToast('Please enter the 6-digit OTP sent to your WhatsApp.', 'warning');
    return;
  }

  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
  }

  try {

    const verifyRes = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.success) {
      showToast(verifyData.message || 'Invalid OTP. Please try again.', 'error');
      return;
    }

    const regRes = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: storefrontPendingRegistration.name,
        phone: storefrontPendingRegistration.phone,
        password: storefrontPendingRegistration.password,
        crop: storefrontPendingRegistration.crop,
        crops: storefrontPendingRegistration.crops,
        acreage: storefrontPendingRegistration.acreage,
        village: storefrontPendingRegistration.village,
        role: 'farmer'
      })
    });

    const regData = await regRes.json();

    if (!regRes.ok || !regData.success) {
      showToast(regData.message || 'Registration failed after OTP verification.', 'error');
      return;
    }

    clearInterval(storefrontOtpTimer);
    storefrontPendingRegistration = null;

    const otpContainer = document.getElementById('storefrontOtpContainer');
    if (otpContainer) otpContainer.remove();

    const regForm = document.getElementById('storefrontRegisterForm');
    if (regForm) regForm.style.display = 'flex';

    // --------------------------------------------------------
    // SWITCH TO LOGIN
    // --------------------------------------------------------

    switchAuthTab('login');

    // Fill mobile number automatically
    const loginIdentifier =
      document.getElementById('loginIdentifier');

    if (loginIdentifier) {
      loginIdentifier.value = phone;
    }

    // Do NOT automatically login.
    // User must enter password and click Sign In.

    showToast(
      'Registration successful! Please sign in with your mobile number and password.',
      'success',
      6000
    );

  } catch (err) {

    console.error(
      'OTP verification error:',
      err
    );

    showToast(
      'Could not reach the server. Please try again.',
      'error'
    );

  } finally {

    if (verifyBtn) {
      verifyBtn.disabled = false;

      verifyBtn.innerHTML =
        '🔐 Verify OTP';
    }
  }
};


// ============================================================
// RESEND STOREFRONT OTP
// ============================================================

window.resendStorefrontOtp = async function() {

  if (!storefrontPendingRegistration) {
    showToast(
      'Registration session expired. Please register again.',
      'warning'
    );
    return;
  }

  const resendBtn =
    document.getElementById(
      'storefrontOtpResendBtn'
    );

  const phone =
    storefrontPendingRegistration.phone;

  if (resendBtn) {
    resendBtn.disabled = true;

    resendBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
  }

  try {

    const res = await fetch(
      '/api/auth/send-otp',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          name:
            storefrontPendingRegistration.name,

          phone
        })
      }
    );

    const data =
      await res.json();

    if (!res.ok || !data.success) {

      showToast(
        data.message || 'Failed to resend OTP.',
        'error'
      );

      return;
    }

    showToast(
      'A new OTP has been sent to your WhatsApp.',
      'success'
    );

    startStorefrontOtpTimer(data.resendAfter);

  } catch (err) {

    console.error(
      'Resend OTP error:',
      err
    );

    showToast(
      'Could not reach the OTP server.',
      'error'
    );

  } finally {

    if (resendBtn) {

      // Timer controls when it becomes enabled again.
      if (storefrontOtpSeconds > 0) {
        resendBtn.disabled = true;
      }

      resendBtn.innerHTML =
        '🔄 Resend OTP';
    }
  }
};


// ============================================================
// CHANGE STOREFRONT MOBILE NUMBER
// ============================================================

window.changeStorefrontNumber = function() {

  clearInterval(storefrontOtpTimer);
  storefrontPendingRegistration = null;

  const otpContainer =
    document.getElementById(
      'storefrontOtpContainer'
    );

  if (otpContainer) {
    otpContainer.remove();
  }

  const regForm =
    document.getElementById(
      'storefrontRegisterForm'
    );

  if (regForm) {
    regForm.style.display = 'flex';
  }

  const phoneInput =
    document.getElementById('regPhone');

  if (phoneInput) {
    phoneInput.focus();
  }
};


// ============================================================
// SHOW STOREFRONT OTP FORM
// ============================================================

function showStorefrontOtpForm(phone, resendAfter) {

  const regForm =
    document.getElementById('storefrontRegisterForm');

  if (!regForm) {
    console.error('storefrontRegisterForm not found');
    return;
  }

  // Hide registration form
  regForm.style.display = 'none';

  // Remove old OTP container if it exists
  const oldOtp =
    document.getElementById(
      'storefrontOtpContainer'
    );

  if (oldOtp) {
    oldOtp.remove();
  }

  // Create OTP container
  const otpContainer =
    document.createElement('div');

  otpContainer.id =
    'storefrontOtpContainer';

  otpContainer.innerHTML = `
    <div style="
      padding: 10px 0;
      text-align: center;
    ">

      <div style="
        font-size: 42px;
        margin-bottom: 10px;
      ">
        🔐
      </div>

      <h3 style="
        margin-bottom: 8px;
      ">
        Verify Your Mobile Number
      </h3>

      <p style="
        margin-bottom: 20px;
        color: #666;
      ">
        We sent a 6-digit OTP to
        <strong>+91 ${phone}</strong>
      </p>

      <input
        type="text"
        id="storefrontOtpInput"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        placeholder="Enter 6-digit OTP"
        style="
          width: 100%;
          padding: 14px;
          text-align: center;
          font-size: 24px;
          letter-spacing: 8px;
          border: 1px solid #ccc;
          border-radius: 8px;
          box-sizing: border-box;
          margin-bottom: 15px;
        "
      >

      <button
        type="button"
        id="storefrontOtpVerifyBtn"
        onclick="verifyStorefrontOtp()"
        class="btn btn-primary"
        style="
          width: 100%;
          margin-bottom: 12px;
        "
      >
        🔐 Verify OTP
      </button>

      <div style="
        margin: 10px 0;
        color: #666;
      ">
        <span id="storefrontOtpTimer">
          Resend OTP in 00:30
        </span>
      </div>

      <button
        type="button"
        id="storefrontOtpResendBtn"
        onclick="resendStorefrontOtp()"
        class="btn"
        disabled
        style="
          width: 100%;
          margin-bottom: 10px;
        "
      >
        🔄 Resend OTP
      </button>

      <button
        type="button"
        onclick="changeStorefrontNumber()"
        class="btn"
        style="
          width: 100%;
        "
      >
        ← Change Mobile Number
      </button>

    </div>
  `;

  regForm.parentNode.insertBefore(
    otpContainer,
    regForm
  );

  const otpInput =
    document.getElementById(
      'storefrontOtpInput'
    );

  if (otpInput) {
    otpInput.focus();

    otpInput.addEventListener(
      'input',
      () => {
        otpInput.value =
          otpInput.value
            .replace(/\D/g, '')
            .slice(0, 6);
      }
    );

    otpInput.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          verifyStorefrontOtp();
        }
      }
    );
  }

  startStorefrontOtpTimer(resendAfter);
}


// ============================================================
// STOREFRONT OTP RESEND TIMER
// ============================================================

// The wait is decided by the server and varies per request, so it is passed in
// rather than assumed. Falls back to 30s only if the server didn't say.
function startStorefrontOtpTimer(seconds) {

  clearInterval(storefrontOtpTimer);
  storefrontOtpSeconds = Number(seconds) > 0 ? Math.ceil(Number(seconds)) : 30;

  const timerEl = document.getElementById('storefrontOtpTimer');
  const resendBtn = document.getElementById('storefrontOtpResendBtn');

  if (resendBtn) resendBtn.disabled = true;

  function render() {
    if (!timerEl) return;
    if (storefrontOtpSeconds <= 0) {
      timerEl.textContent = 'You can resend the OTP now.';
      return;
    }
    // Can exceed 60s, so render as mm:ss.
    const mm = String(Math.floor(storefrontOtpSeconds / 60)).padStart(2, '0');
    const ss = String(storefrontOtpSeconds % 60).padStart(2, '0');
    timerEl.textContent = `Resend OTP in ${mm}:${ss}`;
  }

  render();

  storefrontOtpTimer = setInterval(() => {
    storefrontOtpSeconds -= 1;

    if (storefrontOtpSeconds <= 0) {
      clearInterval(storefrontOtpTimer);
      if (resendBtn) resendBtn.disabled = false;
    }

    render();
  }, 1000);
}

// ---------------------------------------------------------------------------
// Bootstrap.
//
// This must stay the LAST thing in the file. The script is deferred, so by the
// time it runs document.readyState is already "interactive" and initApp() is
// called on the spot. Anywhere earlier in the file that call would happen
// before the top-level let/const declarations below it had initialised, and
// the first one it touched would throw a TDZ error and abort the rest of the
// script.
// ---------------------------------------------------------------------------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
