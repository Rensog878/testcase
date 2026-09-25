import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { preferTranslation } from '../shared/cmsDefaults'

/**
 * Live site content from MongoDB, for the farmer-facing pages.
 *
 * Mirrors useCatalogProducts deliberately, so the app has ONE live-update
 * pattern rather than two:
 *  - fetches /api/cms (public GET; the server strips payment secrets)
 *  - BroadcastChannel('sathya_cms') for instant cross-tab updates when an
 *    admin publishes, so the store tab refreshes without a reload
 *  - re-reads on visibilitychange, so returning to a backgrounded tab is fresh
 *  - AbortController, so a slow response cannot overwrite a newer one
 *
 * localStorage('sathya_cms') is kept as an offline seed only. The server wins
 * whenever it answers: an admin's local draft must never outrank published
 * content for a farmer on another machine.
 */

export const CMS_CHANNEL = 'sathya_cms'

function readLocalCms() {
  try {
    return JSON.parse(localStorage.getItem('sathya_cms') || '{}')
  } catch {
    return {}
  }
}

/**
 * The same piece of content is stored under two different names, because the
 * database seed (server/db.js INITIAL_CMS) and the admin editor
 * (shared/cmsDefaults.js DEFAULT_CONTENT) were written against different key
 * names. `contactPhone` is the canonical one on the server side — WhatsApp
 * order notifications already read it (server/orderNotifications.js) — so a
 * read has to check both rather than silently ignoring content that is
 * genuinely there.
 */
const KEY_ALIASES = {
  banner: ['bannerAnnouncement'],
  advisoryDesc: ['advisorySubtitle'],
  phone: ['contactPhone'],
  email: ['contactEmail']
}

function rawValue(cms, key) {
  if (!cms) return ''
  if (typeof cms[key] === 'string' && cms[key].trim()) return cms[key].trim()
  for (const alias of KEY_ALIASES[key] || []) {
    if (typeof cms[alias] === 'string' && cms[alias].trim()) return cms[alias].trim()
  }
  return ''
}

/**
 * Resolve one piece of site text.
 *
 * Precedence: admin's CMS value -> the translated string -> nothing.
 * Exception: a value still word for word the CMS's built-in English default
 * (saving the CMS page stores the defaults) is not an admin's choice, so a
 * page in Tamil, Hindi, Kannada or Telugu shows its translation there
 * (shared/cmsDefaults.js preferTranslation).
 *
 * The fallback is passed in already translated (t('hero_title')), so a farmer
 * reading Tamil keeps Tamil until an admin deliberately types an override.
 * That override then applies in every language, which is the honest behaviour
 * for a single-value CMS field: only an explicit edit replaces a translation.
 */
export function cmsText(cms, key, translated) {
  return preferTranslation(key, rawValue(cms, key), translated)
}

/**
 * What the admin typed for this key, or null when they have never touched it.
 *
 * cmsText cannot tell "never set" from "deliberately cleared" - both read as
 * '' - so a field the admin emptied came straight back as the built-in copy.
 * This keeps the difference, for the places where clearing a field is how you
 * turn a piece of the page off. It follows the same aliases as cmsText, so an
 * override written under either key name is found.
 */
export function cmsOverride(cms, key) {
  if (!cms) return null
  for (const name of [key, ...(KEY_ALIASES[key] || [])]) {
    if (typeof cms[name] === 'string') return cms[name].trim()
  }
  return null
}

/**
 * The promo ticker. The admin edits it as one textarea, one promo per line, so
 * the number of promos is theirs to choose. Empty means "leave the built-in
 * promos alone", which keeps the strip byte-identical until someone edits it.
 */
export function cmsTickerLines(cms) {
  const raw = rawValue(cms, 'banner')
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

export function useCmsSettings() {
  const [cms, setCms] = useState(readLocalCms)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef(null)

  const fetchCms = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    try {
      const { data } = await axios.get('/api/cms', { signal: abortRef.current.signal })
      if (data && data.success && data.data && typeof data.data === 'object') {
        setCms(data.data)
      }
    } catch (err) {
      // Offline or a failed request keeps whatever is already on screen; the
      // built-in copy is always the final fallback, so nothing renders empty.
      if (!axios.isCancel(err)) console.warn('Could not load site content:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCms()
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [fetchCms])

  useEffect(() => {
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CMS_CHANNEL) : null

    const handleMessage = event => {
      if (event.data === 'cms-changed') fetchCms()
    }
    if (channel) channel.addEventListener('message', handleMessage)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCms()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleMessage)
        channel.close()
      }
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchCms])

  return { cms, loading, refresh: fetchCms }
}

export default useCmsSettings
