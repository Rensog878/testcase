// English words of the store's crop, pest and category lists, for the
// `vocabulary` argument below.
export function catalogueVocabulary(lists) {
  const words = new Set()
  for (const value of lists.flat()) {
    const name = typeof value === 'string' ? value : `${value?.id || ''} ${value?.name || ''}`
    for (const w of name.toLowerCase().split(/[^a-z-]+/)) if (w.length > 1) words.add(w)
  }
  return words
}

// Voice search in the farmer's own language. The catalogue is in English, so
// a spoken Tamil (Hindi, Kannada, Telugu) phrase is turned into the English
// crop, pest and category words products carry ("நெல் குலை நோய்" ->
// "Paddy Blast"). No React or browser code: tested under node --test
// (__tests__/voiceSearchTerms.test.js).
//
// Two sources, longest phrase first:
//  1. SPOKEN below: how farmers actually say it, including forms a speech
//     service writes that the site's own labels do not use (நெல்லு, மிளகாய்).
//  2. The language pack's page texts (public/js/lang-<code>.js `text`), read
//     backwards: every crop, pest and category label on the site.
// Latin words (product names said in English, "Gold Gel") are kept as heard.

const SPOKEN = {
  ta: {
    // crops
    'நெல்லு': 'Paddy', 'நெல்': 'Paddy', 'அரிசி': 'Paddy', 'பருத்தி': 'Cotton', 'தக்காளி': 'Tomato',
    'கோதுமை': 'Wheat', 'கரும்பு': 'Sugarcane', 'மக்காச்சோளம்': 'Corn', 'சோளம்': 'Corn',
    'திராட்சை': 'Grapes', 'உருளைக்கிழங்கு': 'Potato', 'உருளை': 'Potato', 'வாழை': 'Banana',
    'தென்னை': 'Coconut', 'தேங்காய்': 'Coconut', 'பாக்கு': 'Arecanut', 'மரவள்ளி': 'Tapioca',
    'கிழங்கு': 'Tubers', 'மிளகாய்': 'Chilli', 'வெங்காயம்': 'Onion', 'கத்தரி': 'Brinjal',
    'கத்தரிக்காய்': 'Brinjal', 'நிலக்கடலை': 'Groundnut', 'கடலை': 'Groundnut', 'மஞ்சள்': 'Turmeric',
    'எலுமிச்சை': 'Citrus', 'ஆரஞ்சு': 'Citrus', 'மாம்பழம்': 'Mango', 'காய்கறி': 'Vegetables',
    // pests and diseases
    'குலை நோய்': 'Blast', 'கருகல் நோய்': 'Blight', 'கருகல்': 'Blight', 'துரு நோய்': 'Rust',
    'வெள்ளை ஈ': 'Whitefly', 'வெள்ளைஈ': 'Whitefly', 'அசுவினி': 'Aphids', 'இலைப்பேன்': 'Thrips',
    'சிலந்திப்பேன்': 'Mites', 'சிலந்தி': 'Mites', 'தண்டுத் துளைப்பான்': 'Stem Borer',
    'தண்டு துளைப்பான்': 'Stem Borer', 'துளைப்பான்': 'Borer', 'காய்ப்புழு': 'Fruit Borer',
    'காய் துளைப்பான்': 'Fruit Borer', 'காய்த் துளைப்பான்': 'Fruit Borer',
    'சாம்பல் நோய்': 'Powdery Mildew', 'அடிச்சாம்பல் நோய்': 'Downy Mildew', 'இலைப்புள்ளி': 'Leaf Spot',
    'இலை புள்ளி': 'Leaf Spot', 'வாடல் நோய்': 'Wilt', 'வாடல்': 'Wilt', 'வேர் அழுகல்': 'Root Rot',
    'அழுகல்': 'Rot', 'நூற்புழு': 'Nematode', 'படைப்புழு': 'Armyworm', 'புழு': 'Worm',
    'இலைச்சுருட்டுப்புழு': 'Leaf Folder', 'தத்துப்பூச்சி': 'Leaf hopper', 'களை': 'Weeds', 'களைகள்': 'Weeds',
    // product types
    'பூஞ்சைக்கொல்லி': 'Fungicide', 'பூஞ்சை': 'Fungicide', 'பூச்சிக்கொல்லி': 'Insecticide',
    'களைக்கொல்லி': 'Herbicide', 'உரம்': 'Fertilizer', 'உரங்கள்': 'Fertilizer', 'உயிர் ஊக்கி': 'Bio-Stimulant',
    'வளர்ச்சி ஊக்கி': 'Bio-Stimulant', 'நூற்புழுக்கொல்லி': 'Nematicide', 'விதை': 'Seeds', 'விதைகள்': 'Seeds',
    'ஜெல்': 'Gel', 'பவுடர்': 'Powder', 'திரவம்': 'Liquid', 'குருணை': 'Granules',
  },
  hi: {
    'धान': 'Paddy', 'चावल': 'Paddy', 'कपास': 'Cotton', 'टमाटर': 'Tomato', 'गेहूं': 'Wheat', 'गेहूँ': 'Wheat',
    'गन्ना': 'Sugarcane', 'मक्का': 'Corn', 'अंगूर': 'Grapes', 'आलू': 'Potato', 'केला': 'Banana',
    'नारियल': 'Coconut', 'मिर्च': 'Chilli', 'प्याज': 'Onion', 'बैंगन': 'Brinjal', 'मूंगफली': 'Groundnut',
    'झुलसा': 'Blight', 'सफेद मक्खी': 'Whitefly', 'माहू': 'Aphids', 'थ्रिप्स': 'Thrips', 'तना छेदक': 'Stem Borer',
    'इल्ली': 'Worm', 'खरपतवार': 'Weeds', 'फफूंदनाशक': 'Fungicide', 'कीटनाशक': 'Insecticide',
    'खरपतवारनाशक': 'Herbicide', 'खाद': 'Fertilizer', 'उर्वरक': 'Fertilizer', 'बीज': 'Seeds',
  },
  kn: {
    'ಭತ್ತ': 'Paddy', 'ಅಕ್ಕಿ': 'Paddy', 'ಹತ್ತಿ': 'Cotton', 'ಟೊಮ್ಯಾಟೊ': 'Tomato', 'ಗೋಧಿ': 'Wheat', 'ಕಬ್ಬು': 'Sugarcane',
    'ಮೆಕ್ಕೆಜೋಳ': 'Corn', 'ದ್ರಾಕ್ಷಿ': 'Grapes', 'ಆಲೂಗಡ್ಡೆ': 'Potato', 'ಬಾಳೆ': 'Banana', 'ತೆಂಗು': 'Coconut',
    'ಅಡಿಕೆ': 'Arecanut', 'ಮೆಣಸಿನಕಾಯಿ': 'Chilli', 'ಈರುಳ್ಳಿ': 'Onion', 'ಬದನೆ': 'Brinjal', 'ಶೇಂಗಾ': 'Groundnut',
    'ಬಿಳಿನೊಣ': 'Whitefly', 'ಕಳೆ': 'Weeds', 'ಶಿಲೀಂಧ್ರನಾಶಕ': 'Fungicide', 'ಕೀಟನಾಶಕ': 'Insecticide',
    'ಕಳೆನಾಶಕ': 'Herbicide', 'ಗೊಬ್ಬರ': 'Fertilizer', 'ರಸಗೊಬ್ಬರ': 'Fertilizer', 'ಬೀಜ': 'Seeds',
  },
  te: {
    'వరి': 'Paddy', 'బియ్యం': 'Paddy', 'పత్తి': 'Cotton', 'టమాటా': 'Tomato', 'గోధుమ': 'Wheat', 'చెరకు': 'Sugarcane',
    'మొక్కజొన్న': 'Corn', 'ద్రాక్ష': 'Grapes', 'బంగాళాదుంప': 'Potato', 'అరటి': 'Banana', 'కొబ్బరి': 'Coconut',
    'మిరప': 'Chilli', 'ఉల్లి': 'Onion', 'వంకాయ': 'Brinjal', 'వేరుశనగ': 'Groundnut', 'తెల్లదోమ': 'Whitefly',
    'కలుపు': 'Weeds', 'శిలీంద్రనాశిని': 'Fungicide', 'పురుగుమందు': 'Insecticide', 'కలుపుమందు': 'Herbicide',
    'ఎరువు': 'Fertilizer', 'విత్తనాలు': 'Seeds',
  },
}

// Filler a farmer adds around the words that matter ("... க்கு மருந்து வேண்டும்").
const FILLER = {
  ta: ['மருந்து', 'மருந்துகள்', 'வேண்டும்', 'வேணும்', 'தேவை', 'காட்டு', 'காட்டுங்கள்', 'எனக்கு', 'என்', 'இல்', 'இருக்கு', 'இருக்கிறது', 'பயிர்', 'பயிருக்கு', 'நோய்க்கு', 'க்கு', 'உள்ள', 'ஒரு', 'மற்றும்', 'அல்லது', 'எது', 'என்ன', 'சிறந்த', 'நல்ல'],
  hi: ['दवा', 'दवाई', 'चाहिए', 'के', 'लिए', 'में', 'और', 'मेरी', 'मेरे', 'फसल', 'रोग', 'बताओ', 'दिखाओ'],
  kn: ['ಔಷಧಿ', 'ಬೇಕು', 'ಗೆ', 'ನನ್ನ', 'ಬೆಳೆ', 'ಮತ್ತು'],
  te: ['మందు', 'కావాలి', 'కి', 'నా', 'పంట', 'మరియు'],
}

const INDIAN_SCRIPT = /[ऀ-ॿ஀-௿ఀ-౿ಀ-೿]/
const clean = s => String(s || '').normalize('NFC').replace(/[.,;:!?।॥]/g, ' ').replace(/\s+/g, ' ').trim()

// One dictionary per language: page labels first, then the spoken forms on top.
const dictCache = new Map()
function dictionary(lang, packText, vocabulary) {
  const vocab = vocabulary ? new Set([...vocabulary].map(v => String(v).toLowerCase())) : null
  const key = `${lang}|${packText ? Object.keys(packText).length : 0}|${vocab ? vocab.size : 0}`
  if (dictCache.has(key)) return dictCache.get(key)
  const map = new Map()
  for (const [english, translated] of Object.entries(packText || {})) {
    const phrase = clean(translated)
    // Short labels only (a crop, a pest, a category), never whole sentences
    // or page words like "Hello": every English word must be catalogue vocabulary.
    const englishWords = english.toLowerCase().split(/[\s/]+/).filter(Boolean)
    const catalogue = vocab ? englishWords.every(w => vocab.has(w)) : false
    if (catalogue && phrase && INDIAN_SCRIPT.test(phrase) && phrase.split(' ').length <= 3 && english.length <= 30) {
      if (!map.has(phrase)) map.set(phrase, english.replace(/\s*\/\s*/g, ' ').trim())
    }
  }
  for (const [spoken, english] of Object.entries(SPOKEN[lang] || {})) map.set(clean(spoken), english)
  const phrases = [...map.keys()].sort((a, b) => b.length - a.length)
  const value = { map, phrases }
  dictCache.set(key, value)
  return value
}

/**
 * The English search for what was said. Returns { query, understood }:
 * query  - English words to search with (spoken Latin words kept as heard);
 * understood - true when at least one Indian-language word was recognised,
 *              false when nothing could be turned into catalogue English.
 * vocabulary - English catalogue words (crop, pest and category names); pack
 *              labels are used only when every word of their English is one.
 * English pages, or text with no Indian script, come back unchanged.
 */
export function spokenToCatalogQuery(heard, lang, packText, vocabulary) {
  const text = clean(heard)
  if (!text || !SPOKEN[lang] || !INDIAN_SCRIPT.test(text)) return { query: text, understood: true }
  const { map, phrases } = dictionary(lang, packText, vocabulary)
  const found = []
  let rest = ` ${text} `
  for (const phrase of phrases) {
    // Whole words only, and Tamil suffixes glued on (நெல்லுக்கு, பருத்தியில்).
    const at = rest.indexOf(` ${phrase}`)
    if (at === -1) continue
    found.push({ at, english: map.get(phrase) })
    rest = rest.slice(0, at) + ' '.repeat(phrase.length + 1) + rest.slice(at + phrase.length + 1).replace(/^\S*/, m => ' '.repeat(m.length))
  }
  const filler = new Set(FILLER[lang] || [])
  const latin = rest.split(' ').filter(word => word && !INDIAN_SCRIPT.test(word) && !filler.has(word))
  const english = found.sort((a, b) => a.at - b.at).map(f => f.english)
  const words = [...new Set([...english, ...latin].flatMap(w => w.split(' ')).filter(Boolean))]
  return { query: words.join(' '), understood: english.length > 0 }
}
