import { useLanguage } from '../context/LanguageContext'
import { Globe } from 'lucide-react'

// Language names only: Windows draws flag emoji as letters ("IN", "GB").
export default function LanguageSwitcher() {
  const { lang, setLang, languages } = useLanguage()

  return (
    <div className="lang-switcher notranslate">
      <Globe size={15} className="lang-switcher-icon" />
      <select
        className="lang-switcher-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Language"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} style={{ background: '#132313', color: '#fff' }}>
            {l.native}
          </option>
        ))}
      </select>
    </div>
  )
}
