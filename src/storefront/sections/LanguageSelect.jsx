import { useEffect, useState } from 'react'
import { useStore } from '../StoreContext'
import { LANGUAGES, isLanguageReady } from '../i18n'

// The storefront's language dropdowns (top bar and header). Choosing a
// language loads its pack first; the dropdown shows the language applied.
export default function LanguageSelect({ id, className, appliedLang, withEnglishName = false }) {
  const { changeLanguage } = useStore()
  // " · soon" is added after the first render, as the storefront always did:
  // Chrome keeps a dropdown's first width, so the header stays as compact as
  // before instead of widening to fit the longer labels.
  const [markSoon, setMarkSoon] = useState(false)
  useEffect(() => setMarkSoon(true), [])

  return (
    <select id={id} className={className} value={appliedLang} onChange={event => changeLanguage(event.target.value)}>
      {LANGUAGES.map(language => {
        const label = withEnglishName && language.code !== 'en' ? `${language.native} (${language.english})` : language.native
        const ready = isLanguageReady(language.code)
        return (
          <option key={language.code} value={language.code} disabled={!ready}>
            {ready || !markSoon ? label : `${label} · soon`}
          </option>
        )
      })}
    </select>
  )
}
