import { ChevronDown, Languages } from 'lucide-react'
import { useFarmerT } from '../hooks/useFarmerT.js'

// Five languages no longer fit as side-by-side buttons in a phone header, so
// this is a native select (the phone's own picker, fully accessible) dressed
// as a pill. Each language is named in itself, so a Kannada reader finds ಕನ್ನಡ
// while the page is in English. Narrow phones show a one-letter mark
// (farmer.css); screen readers get the full name from the select.
const OPTIONS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ta', label: 'தமிழ்', short: 'த' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕ' },
  { code: 'te', label: 'తెలుగు', short: 'తె' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
]

export default function LanguageToggle() {
  const { lang, setLang, t } = useFarmerT()
  const current = OPTIONS.find(option => option.code === lang) || OPTIONS[0]

  return (
    <div className="fd-lang">
      <Languages className="fd-lang-icon" size={18} aria-hidden="true" />
      <span className="fd-lang-value" lang={current.code} aria-hidden="true">
        <span className="fd-lang-full">{current.label}</span>
        <span className="fd-lang-short">{current.short}</span>
      </span>
      <ChevronDown className="fd-lang-chevron" size={16} aria-hidden="true" />
      <select
        className="fd-lang-select"
        value={current.code}
        aria-label={t('language.label')}
        onChange={event => setLang(event.target.value)}
      >
        {OPTIONS.map(option => (
          <option key={option.code} value={option.code} lang={option.code}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}
