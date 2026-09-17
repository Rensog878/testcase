import { createContext, useContext } from 'react'
import useCmsSettings from '../hooks/useCmsSettings'

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

export function CmsProvider({ children }) {
  const value = useCmsSettings()
  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>
}

export function useCms() {
  const ctx = useContext(CmsContext)
  if (!ctx) throw new Error('useCms() must be used inside <CmsProvider>')
  return ctx
}

export { cmsText, cmsTickerLines } from '../hooks/useCmsSettings'
