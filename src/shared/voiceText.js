// Voice typing helpers for storefront/voice.js. No React or browser code, so
// they run under node --test (__tests__/voiceText.test.js). Number fields have
// no voice typing; these are for names, places and searches.

// Which language to listen in: 'text' follows the site (Tamil, Hindi,
// Kannada, Telugu or English); 'latin' (addresses) stays English so couriers
// can read it. The header search listens in 'text' and turns what it hears
// into English catalogue words (voiceSearchTerms.js).
const SPEECH_LOCALES = { ta: 'ta-IN', hi: 'hi-IN', kn: 'kn-IN', te: 'te-IN' }
export const speechLang = (mode, siteLang) => (mode === 'text' && SPEECH_LOCALES[siteLang]) || 'en-IN'

// "Apple." -> "Apple": the full stop, danda or question mark a speech service
// puts at the end of a phrase. Punctuation inside ("St. Thomas Mount") stays.
export const endPunctuationless = text => String(text).trim().replace(/[\s.,;:!?।॥。…]+$/u, '')
