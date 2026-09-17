import { useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { TEXT_PACKS, loadLanguagePack, loadStaffLanguagePack, localizeTree, setPageLanguage, watchPageText } from '../storefront/i18n'

// Every page shows the chosen language (Tamil, Kannada, Telugu, Hindi) using
// the language packs in public/js/lang-*.js: the page text is translated in
// place, and text that React adds or changes later is translated as it
// appears. Staff portals (staff = true) also load the staff phrases
// (public/js/lang-staff-*.js). Rendered once in App.jsx, so it keeps working
// across page changes.
export default function PageTranslator({ staff }) {
  const { lang } = useLanguage()

  useEffect(() => {
    let cancelled = false
    loadLanguagePack(lang)
      .then(loaded => (loaded && staff ? loadStaffLanguagePack(lang).then(() => loaded) : loaded))
      .then(loaded => {
      if (cancelled) return
      const applied = loaded ? lang : 'en'
      setPageLanguage(applied)
      // The language actually shown (English when a pack failed to load), so
      // language-specific CSS follows the text.
      document.documentElement.lang = applied
      // Translates what is on the page now (or puts it back in English).
      localizeTree(document.body)
      watchPageText(Boolean(TEXT_PACKS[applied]))
    })
    return () => { cancelled = true }
  }, [lang, staff])

  useEffect(() => () => watchPageText(false), [])

  return null
}
