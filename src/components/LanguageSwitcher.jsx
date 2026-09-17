import { useLanguage } from '../context/LanguageContext'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, languages } = useLanguage()

  return (
    <div className="lang-switcher">
      <Globe size={15} className="lang-switcher-icon" />
      <select
        className="lang-switcher-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Language"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} style={{ background: '#132313', color: '#fff' }}>
            {l.flag} {l.native}
          </option>
        ))}
      </select>
    </div>
  )
}
