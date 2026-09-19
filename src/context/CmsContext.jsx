import { createContext, useContext, useMemo } from 'react'
import useCmsSettings from '../hooks/useCmsSettings'
import { useLanguage } from './LanguageContext'

// One CMS fetch/subscribe cycle for the whole app, not one per component.
//
// Before this, Storefront.jsx, StoreTicker.jsx (the phone ticker) and
// MobileBottomNav.jsx each ran their own useCmsSettings() - three separate
// axios requests, three separate BroadcastChannel listeners, three separate
// pieces of state. They normally agreed, because they all listened for the
// same 'cms-changed' ping, but StoreTicker and MobileBottomNav are mounted
// once at the App root (App.jsx StoreTop/StoreBottom) and never remount on
// navigation, so if a request race or a dropped listener (mobile browsers
// backgrounding tabs, older WebViews without BroadcastChannel) ever desynced
// one copy from another, an admin's edit could show on desktop and not on
// phones (or the other way round) until a full reload. A single provider
// makes that class of bug impossible: every consumer reads the same state.
const CmsContext = createContext(null)

// The shop's own copy in the language being read. An admin types the English
// and, beside it, the translation; this hands every consumer the translated
// value as though it had been typed in that language, so nothing that renders
// CMS text needs to know translations exist.
//
// It has to happen here rather than in the page walker: the hero heading and
// its like carry data-i18n, and the walker skips those by design, because
// their own keys are meant to be the source of their text.
function localizedCms(cms, lang) {
  const saved = cms && cms.translations && cms.translations[lang]
  if (!saved) return cms
  const localized = { ...cms }
  for (const [key, translated] of Object.entries(saved)) {
    // Only a field that is already text can be replaced by text: a stray key
    // cannot invent a setting or overwrite an image.
    if (typeof cms[key] === 'string' && typeof translated === 'string' && translated.trim()) {
      localized[key] = translated
    }
  }
  return localized
}

export function CmsProvider({ children }) {
  const value = useCmsSettings()
  const { lang } = useLanguage()
  const cms = useMemo(() => localizedCms(value.cms, lang), [value.cms, lang])
  return <CmsContext.Provider value={{ ...value, cms }}>{children}</CmsContext.Provider>
}

export function useCms() {
  const ctx = useContext(CmsContext)
  if (!ctx) throw new Error('useCms() must be used inside <CmsProvider>')
  return ctx
}

export { cmsText, cmsTickerLines } from '../hooks/useCmsSettings'
