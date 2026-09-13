import { useFarmerT } from '../hooks/useFarmerT.js'

// Each language is named in itself, so a Tamil reader finds தமிழ் even while
// the page is in English. On the narrowest phones "English" shows as "EN"
// (farmer.css) so the header still fits; screen readers keep the full name.
const OPTIONS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ta', label: 'தமிழ்', short: null },
]

export default function LanguageToggle() {
  const { lang, setLang, t } = useFarmerT()
  return (
    <div className="fd-lang" role="group" aria-label={t('language.label')}>
      {OPTIONS.map(option => (
        <button
          key={option.code}
          type="button"
          className="fd-lang-option"
          lang={option.code}
          aria-pressed={lang === option.code}
          onClick={() => setLang(option.code)}
        >
          {option.short && <span className="fd-lang-short" aria-hidden="true">{option.short}</span>}
          <span className={option.short ? 'fd-lang-full' : undefined}>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
