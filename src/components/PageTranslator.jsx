import { useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { TEXT_PACKS, loadLanguagePack, localizeTree, setPageLanguage, watchPageText } from '../storefront/i18n'

// Store pages show the chosen language (Tamil, Kannada, Telugu, Hindi) using
// the language packs in public/js/lang-*.js: the page text is translated in
// place, and text that React adds or changes later is translated as it
// appears. Rendered once in App.jsx, so it keeps working across page changes.
//
// The staff portals (staff = true) are English only. They are worked in all
// day by the same few people, and a language a customer picked on the store
// would otherwise follow the browser into the admin panel. Arriving here puts
// the page back into English and stops the watcher.
export default function PageTranslator({ staff }) {
  const { lang } = useLanguage()

  useEffect(() => {
    let cancelled = false
    if (staff) {
      setPageLanguage('en')
      document.documentElement.lang = 'en'
      localizeTree(document.body)
      watchPageText(false)
      return () => { cancelled = true }
    }
    loadLanguagePack(lang)
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
