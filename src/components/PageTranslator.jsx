import { useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { TEXT_PACKS, loadLanguagePack, localizeTree, setPageLanguage, watchPageText } from '../storefront/i18n'

// Store pages show the chosen language (Tamil, Kannada, Telugu, Hindi) using
// the language packs in public/js/lang-*.js: the page text is translated in
// place, and text that React adds or changes later is translated as it
// appears. Staff portals (enabled = false) stay in English. Rendered once in
// App.jsx, so it keeps working across page changes.
export default function PageTranslator({ enabled }) {
  const { lang } = useLanguage()

  useEffect(() => {
    let cancelled = false
    const wanted = enabled ? lang : 'en'
    loadLanguagePack(wanted).then(loaded => {
      if (cancelled) return
      const applied = loaded ? wanted : 'en'
      setPageLanguage(applied)
      // Translates what is on the page now (or puts it back in English).
      localizeTree(document.body)
      watchPageText(Boolean(TEXT_PACKS[applied]))
    })
    return () => { cancelled = true }
  }, [lang, enabled])

  useEffect(() => () => watchPageText(false), [])

  return null
}
