import { createContext, useContext, useState, useEffect } from 'react'

// Same order as the storefront's language menu (src/storefront/i18n.js LANGUAGES).
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil',   native: 'தமிழ்',   flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ',  flag: '🇮🇳' },
  { code: 'te', label: 'Telugu',  native: 'తెలుగు',  flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi',   native: 'हिन्दी',  flag: '🇮🇳' },
]

export const TRANSLATIONS = {
  en: {
    brand: 'Sathyam Bio',
    tagline: 'Agricultural ERP & E-Commerce Platform',
    shopProducts: 'Shop Products',
    myCart: 'My Cart',
    myOrders: 'My Orders',
    cropAdvisory: 'Crop Advisory',
    dashboard: 'Dashboard',
    overview: 'Overview',
    analytics: 'Analytics',
    cmsEditor: 'Live CMS Editor',
    productsMaster: 'Products Master',
    orderManagement: 'Order Management',
    subscribers: 'Advisory Subscribers',
    tickets: 'Field Tickets',
    chatRecords: 'Chat Records',
    posBilling: 'POS Billing Counter',
    myDeliveries: 'My Deliveries',
    logout: 'Sign Out',
    welcome: 'Namaste',
    itemsInCart: 'Items in Cart',
    activeOrders: 'Active Orders',
    acresRegistered: 'Acres Registered',
    openTickets: 'Open Tickets',
    quickActions: 'Quick Actions',
    advisoryTitle: 'Get Weekly Crop & Pesticide Recommendations',
    advisorySubtitle: 'Join 15,000+ farmers receiving our free seasonal advisory newsletter.',
    farmerName: 'Farmer Name',
    whatsappNumber: 'WhatsApp Number',
    cropType: 'Crop Type',
    season: 'Season',
    farmSize: 'Farm Size (Acres)',
    getAdvisory: 'Get Instant Advisory',
    payWithRazorpay: 'Pay with Razorpay',
    subtotal: 'Subtotal',
    gst: 'GST (18%)',
    total: 'Total',
    freeDelivery: 'FREE Delivery',
    addToCart: 'Add to Cart',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    searchPlaceholder: 'Search products, crops, pests...',
    allCategories: 'All Categories',
    changeLanguage: 'Language',
  },
  ta: {
    brand: 'சத்யம் பயோ',
    tagline: 'விவசாய ஈ-காமர்ஸ் & ஈஆர்பி தளம்',
    shopProducts: 'மருந்துகள் வாங்க',
    myCart: 'எனது கூடை',
    myOrders: 'எனது ஆர்டர்கள்',
    cropAdvisory: 'பயிர் ஆலோசனை',
    dashboard: 'முகப்பு பலகை',
    overview: 'கண்ணோட்டம்',
    analytics: 'புள்ளிவிவரங்கள்',
    cmsEditor: 'இணையதள திருத்தி',
    productsMaster: 'பொருட்கள் மேலாண்மை',
    orderManagement: 'ஆர்டர்கள் மேலாண்மை',
    subscribers: 'ஆலோசனை சந்தாதாரர்கள்',
    tickets: 'விவசாயி கோரிக்கைகள்',
    chatRecords: 'அரட்டை பதிவுகள்',
    posBilling: 'பில்லிங் கவுண்டர்',
    myDeliveries: 'எனது டெலிவரிகள்',
    logout: 'வெளியேறு',
    welcome: 'வணக்கம்',
    itemsInCart: 'கூடையில் உள்ளவை',
    activeOrders: 'செயலில் உள்ள ஆர்டர்கள்',
    acresRegistered: 'பதிவுசெய்த ஏக்கர்',
    openTickets: 'நிலுவை கோரிக்கைகள்',
    quickActions: 'விரைவு செயல்கள்',
    advisoryTitle: 'வாராந்திர பயிர் மற்றும் பூச்சிக்கொல்லி பரிந்துரைகள்',
    advisorySubtitle: '15,000+ விவசாயிகளுடன் இணைந்து இலவச பயிர் ஆலோசனை பெறுங்கள்.',
    farmerName: 'விவசாயி பெயர்',
    whatsappNumber: 'வாட்ஸ்அப் எண்',
    cropType: 'பயிர் வகை',
    season: 'பருவம்',
    farmSize: 'நில அளவு (ஏக்கர்)',
    getAdvisory: 'உடனடி ஆலோசனை பெற',
    payWithRazorpay: 'ரேசர்பே மூலம் செலுத்தவும்',
    subtotal: 'கூட்டுத்தொகை',
    gst: 'ஜிஎஸ்டி (18%)',
    total: 'மொத்தம்',
    freeDelivery: 'இலவச டெலிவரி',
    addToCart: 'கூடையில் சேர்க்க',
    inStock: 'இருப்பில் உள்ளது',
    outOfStock: 'இருப்பு இல்லை',
    searchPlaceholder: 'மருந்துகள், பயிர்களைத் தேட...',
    allCategories: 'அனைத்து பிரிவுகள்',
    changeLanguage: 'மொழி',
  },
  hi: {
    brand: 'सत्यम बायो',
    tagline: 'कृषि ई-कॉमर्स और ईआरपी प्लेटफॉर्म',
    shopProducts: 'उत्पाद खरीदें',
    myCart: 'मेरी गाड़ी',
    myOrders: 'मेरे ऑर्डर',
    cropAdvisory: 'फसल सलाह',
    dashboard: 'डैशबोर्ड',
    overview: 'अवलोकन',
    analytics: 'एनालिटिक्स',
    cmsEditor: 'लाइव सीएमएस संपादक',
    productsMaster: 'उत्पाद प्रबंधन',
    orderManagement: 'ऑर्डर प्रबंधन',
    subscribers: 'सलाहकार ग्राहक',
    tickets: 'फ़ील्ड टिकट',
    chatRecords: 'चैट रिकॉर्ड',
    posBilling: 'पीओएस बिलिंग काउंटर',
    myDeliveries: 'मेरी डिलीवरी',
    logout: 'लॉग आउट',
    welcome: 'नमस्ते',
    itemsInCart: 'कार्ट में उत्पाद',
    activeOrders: 'सक्रिय ऑर्डर',
    acresRegistered: 'पंजीकृत एकड़',
    openTickets: 'खुले टिकट',
    quickActions: 'त्वरित कार्य',
    advisoryTitle: 'साप्ताहिक फसल और कीटनाशक सिफारिशें प्राप्त करें',
    advisorySubtitle: '15,000+ किसानों से जुड़ें और मुफ्त मौसमी सलाह प्राप्त करें।',
    farmerName: 'किसान का नाम',
    whatsappNumber: 'व्हाट्सएप नंबर',
    cropType: 'फसल का प्रकार',
    season: 'मौसम',
    farmSize: 'खेत का आकार (एकड़)',
    getAdvisory: 'तुरंत सलाह प्राप्त करें',
    payWithRazorpay: 'रेजरपे से भुगतान करें',
    subtotal: 'उप-योग',
    gst: 'जीएसटी (18%)',
    total: 'कुल योग',
    freeDelivery: 'मुफ्त डिलीवरी',
    addToCart: 'कार्ट में जोड़ें',
    inStock: 'उपलब्ध है',
    outOfStock: 'स्टॉक समाप्त',
    searchPlaceholder: 'उत्पाद, फसल, कीट खोजें...',
    allCategories: 'सभी श्रेणियां',
    changeLanguage: 'भाषा',
  },
  te: {
    brand: 'సత్యం బయో',
    tagline: 'వ్యవసాయ ఈ-కామర్స్ & ఈఆర్‌పీ వేదిక',
    shopProducts: 'ఉత్పత్తులు కొనండి',
    myCart: 'నా కార్ట్',
    myOrders: 'నా ఆర్డర్లు',
    cropAdvisory: 'పంట సలహా',
    dashboard: 'డాష్‌బోర్డ్',
    overview: 'అవలోకనం',
    analytics: 'విశ్లేషణలు',
    cmsEditor: 'సీఎమ్ఎస్ ఎడిటర్',
    productsMaster: 'ఉత్పత్తుల మాస్టర్',
    orderManagement: 'ఆర్డర్ నిర్వహణ',
    subscribers: 'సబ్‌స్క్రైబర్లు',
    tickets: 'సపోర్ట్ టిక్కెట్లు',
    chatRecords: 'చాట్ రికార్డులు',
    posBilling: 'పీవోఎస్ బిల్లింగ్',
    myDeliveries: 'నా డెలివరీలు',
    logout: 'లాగ్ అవుట్',
    welcome: 'నమస్కారం',
    itemsInCart: 'కార్ట్‌లోని వస్తువులు',
    activeOrders: 'యాక్టివ్ ఆర్డర్లు',
    acresRegistered: 'నమోదైన ఎకరాలు',
    openTickets: 'ఓపెన్ టిక్కెట్లు',
    quickActions: 'శీఘ్ర చర్యలు',
    advisoryTitle: 'వారపు పంట & పురుగుమందుల సిఫార్సులను పొందండి',
    advisorySubtitle: 'ఉచిత కాలానుగుణ సలహాలను పొందుతున్న 15,000+ రైతులతో చేరండి.',
    farmerName: 'రైతు పేరు',
    whatsappNumber: 'వాట్సాప్ నంబర్',
    cropType: 'పంట రకం',
    season: 'సీజన్',
    farmSize: 'భూమి విస్తీర్ణం (ఎకరాలు)',
    getAdvisory: 'తక్షణ సలహా పొందండి',
    payWithRazorpay: 'రేజర్‌పేతో చెల్లించండి',
    subtotal: 'సబ్‌టోటల్',
    gst: 'జీఎస్‌టీ (18%)',
    total: 'మొత్తం',
    freeDelivery: 'ఉచిత డెలివరీ',
    addToCart: 'కార్ట్‌కి జోడించు',
    inStock: 'స్టాక్ ఉంది',
    outOfStock: 'స్టాక్ లేదు',
    searchPlaceholder: 'ఉత్పత్తులు, పంటలను శోధించండి...',
    allCategories: 'అన్ని వర్గాలు',
    changeLanguage: 'భాష',
  },
  kn: {
    brand: 'ಸತ್ಯಂ ಬಯೋ',
    tagline: 'ಕೃಷಿ ಇ-ಕಾಮರ್ಸ್ ಮತ್ತು ಇಆರ್‌ಪಿ ವೇದಿಕೆ',
    shopProducts: 'ಉತ್ಪನ್ನಗಳನ್ನು ಖರೀದಿಸಿ',
    myCart: 'ನನ್ನ ಕಾರ್ಟ್',
    myOrders: 'ನನ್ನ ಆರ್ಡರ್‌ಗಳು',
    cropAdvisory: 'ಬೆಳೆ ಸಲಹೆ',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    overview: 'ಅವಲೋಕನ',
    analytics: 'ವಿಶ್ಲೇಷಣೆ',
    cmsEditor: 'ಸಿಎಂಎಸ್ ಸಂಪಾದಕ',
    productsMaster: 'ಉತ್ಪನ್ನಗಳ ಮಾಸ್ಟರ್',
    orderManagement: 'ಆರ್ಡರ್ ನಿರ್ವಹಣೆ',
    subscribers: 'ಚಂದಾದಾರರು',
    tickets: 'ಬೆಂಬಲ ಟಿಕೆಟ್‌ಗಳು',
    chatRecords: 'ಚಾಟ್ ದಾಖಲೆಗಳು',
    posBilling: 'ಬಿಲ್ಲಿಂಗ್ ಕೌಂಟರ್',
    myDeliveries: 'ನನ್ನ ಡೆಲಿವರಿಗಳು',
    logout: 'ಸೈನ್ ಔಟ್',
    welcome: 'ನಮಸ್ಕಾರ',
    itemsInCart: 'ಕಾರ್ಟ್‌ನಲ್ಲಿರುವ ವಸ್ತುಗಳು',
    activeOrders: 'ಸಕ್ರಿಯ ಆರ್ಡರ್‌ಗಳು',
    acresRegistered: 'ನೋಂದಾಯಿತ ಎಕರೆಗಳು',
    openTickets: 'ತೆರೆದ ಟಿಕೆಟ್‌ಗಳು',
    quickActions: 'ತ್ವರಿತ ಕ್ರಮಗಳು',
    advisoryTitle: 'ಸಾಪ್ತಾಹಿಕ ಬೆಳೆ ಮತ್ತು ಕೀಟನಾಶಕ ಶಿಫಾರಸುಗಳನ್ನು ಪಡೆಯಿರಿ',
    advisorySubtitle: 'ಉಚಿತ ಸಲಹೆಗಳನ್ನು ಪಡೆಯುತ್ತಿರುವ 15,000+ ರೈತರೊಂದಿಗೆ ಸೇರಿ.',
    farmerName: 'ರೈತರ ಹೆಸರು',
    whatsappNumber: 'ವಾಟ್ಸಾಪ್ ಸಂಖ್ಯೆ',
    cropType: 'ಬೆಳೆ ಪ್ರಕಾರ',
    season: 'ಋತು',
    farmSize: 'ಜಮೀನಿನ ಗಾತ್ರ (ಎಕರೆ)',
    getAdvisory: 'ತಕ್ಷಣದ ಸಲಹೆ ಪಡೆಯಿರಿ',
    payWithRazorpay: 'ರೇಜರ್‌ಪೇ ಮೂಲಕ ಪಾವತಿಸಿ',
    subtotal: 'ಉಪಮೊತ್ತ',
    gst: 'ಜಿಎಸ್‌ಟಿ (18%)',
    total: 'ಒಟ್ಟು',
    freeDelivery: 'ಉಚಿತ ಡೆಲಿವರಿ',
    addToCart: 'ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ',
    inStock: 'ಸ್ಟಾಕ್‌ನಲ್ಲಿದೆ',
    outOfStock: 'ಸ್ಟಾಕ್ ಮುಗಿದಿದೆ',
    searchPlaceholder: 'ಉತ್ಪನ್ನಗಳು, ಬೆಳೆಗಳನ್ನು ಹುಡುಕಿ...',
    allCategories: 'ಎಲ್ಲಾ ವಿಭಾಗಗಳು',
    changeLanguage: 'ಭಾಷೆ',
  }
}

const LanguageContext = createContext(null)

// The storefront (src/storefront) saves the visitor's choice under
// sathya_bio_lang. Reading it first means a farmer who picked Tamil on the
// storefront gets Tamil here too; sathya_lang is this app's older key.
const SHARED_LANG_KEY = 'sathya_bio_lang'
const APP_LANG_KEY = 'sathya_lang'

function readSavedLanguage() {
  try {
    for (const key of [SHARED_LANG_KEY, APP_LANG_KEY]) {
      const saved = localStorage.getItem(key)
      if (TRANSLATIONS[saved]) return saved
    }
  } catch {
    // Storage blocked: fall through to English.
  }
  return 'en'
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readSavedLanguage)

  useEffect(() => {
    try {
      localStorage.setItem(SHARED_LANG_KEY, lang)
      localStorage.setItem(APP_LANG_KEY, lang)
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
    document.documentElement.lang = lang
  }, [lang])

  // A language change in another tab (storefront or app) applies here as well.
  useEffect(() => {
    const onStorage = event => {
      if (event.key === SHARED_LANG_KEY && TRANSLATIONS[event.newValue]) setLang(event.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const t = (key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key
  }

  const changeLanguage = (newLang) => {
    if (TRANSLATIONS[newLang]) {
      setLang(newLang)
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
