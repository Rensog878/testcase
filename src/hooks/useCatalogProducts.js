import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const DEFAULT_OPTIONS = {
  categories: ['Fungicide', 'Insecticide', 'Herbicide', 'Bio-Stimulant', 'Fertilizer', 'Nematicide', 'Adjuvant'],
  crops: [],
  storageBatches: [],
  diseases: [],
  physicalForms: []
}

// The catalogue is the same catalogue on every page, but the hook is mounted
// separately by the storefront, /products and /categories — so each route
// change used to pay for the whole list again (77 KB, about a second against
// the database) and show skeletons while it waited.
//
// These two caches live for the life of the tab and are shared by every
// instance. What a mount gets back is what the last fetch returned, straight
// away and with no loading state; a fresh request still goes out behind it, so
// the screen always catches up to the server and an admin's edit still lands.
// `inFlight` means two components mounting together make one request, not two.
const productsCache = new Map()
const productsInFlight = new Map()
let optionsCache = null
let optionsInFlight = null

// A product the home, Shop or Categories page has already loaded, so its page
// can show it the moment it is opened (ProductDetail.jsx) while a fresh copy
// is fetched behind it. undefined when this tab has not loaded it yet.
export function findCachedProduct(id) {
  for (const list of productsCache.values()) {
    const hit = list.find(p => String(p.id ?? p._id) === String(id))
    if (hit) return hit
  }
  return undefined
}

function cacheKey(params) {
  return JSON.stringify(params)
}

async function loadProducts(key, params) {
  if (productsInFlight.has(key)) return productsInFlight.get(key)
  const request = axios
    .get('/api/products', { params })
    .then(({ data }) => {
      if (data.success && Array.isArray(data.data)) {
        productsCache.set(key, data.data)
        return data.data
      }
      return productsCache.get(key) || []
    })
    .finally(() => productsInFlight.delete(key))
  productsInFlight.set(key, request)
  return request
}

async function loadOptions() {
  if (optionsInFlight) return optionsInFlight
  optionsInFlight = axios
    .get('/api/catalog-options')
    .then(({ data }) => {
      if (data.success && data.data) optionsCache = data.data
      return optionsCache
    })
    .finally(() => { optionsInFlight = null })
  return optionsInFlight
}

/**
 * Unified real-time product catalog hook for Sathyam Agro Mart.
 *
 * Features:
 * - Fetches products dynamically from MongoDB via /api/products
 * - Serves the tab-wide cache first so a repeat visit renders immediately,
 *   then revalidates in the background
 * - Supports targeted user personalization (prioritizing products assigned to the logged-in farmer)
 * - Subscribes to BroadcastChannel('sathya_catalog') for instantaneous cross-tab live updates on admin changes
 * - Reconciles catalog on browser tab visibility change
 * - Ignores a reply that is no longer the one this component asked for
 */
export function useCatalogProducts({
  userId = '',
  category = 'All',
  crop = 'all',
  disease = 'all',
  search = '',
  sortBy = '',
  onlineOnly = true
} = {}) {
  const params = {}
  if (userId) params.userId = userId
  if (category && category !== 'All') params.category = category
  if (crop && crop !== 'all') params.crop = crop
  if (disease && disease !== 'all') params.disease = disease
  if (search && search.trim()) params.search = search.trim()
  if (sortBy) params.sortBy = sortBy
  if (onlineOnly) params.onlineOnly = 'true'
  const key = cacheKey(params)

  const [products, setProducts] = useState(() => productsCache.get(key) || [])
  const [catalogOptions, setCatalogOptions] = useState(() => optionsCache || DEFAULT_OPTIONS)
  // Nothing cached yet is the only case that has to show a loading state.
  const [loading, setLoading] = useState(() => !productsCache.has(key))
  const [error, setError] = useState(null)

  // A reply is applied only while it is still the key this component wants and
  // the component is still on screen. This replaces the AbortController: the
  // request may now be shared with another component, so cancelling it is no
  // longer ours to do.
  const wantedKey = useRef(key)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const fetchProducts = useCallback(async () => {
    wantedKey.current = key
    const cached = productsCache.get(key)
    if (cached) {
      setProducts(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const list = await loadProducts(key, params)
      if (!mounted.current || wantedKey.current !== key) return
      setProducts(list)
    } catch (err) {
      if (!mounted.current || wantedKey.current !== key) return
      console.error('Failed to load products from database:', err)
      setError(err)
    } finally {
      if (mounted.current && wantedKey.current === key) setLoading(false)
    }
    // `params` is rebuilt every render but is fully described by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const fetchCatalogOptions = useCallback(async () => {
    try {
      const options = await loadOptions()
      if (options && mounted.current) setCatalogOptions(options)
    } catch (err) {
      console.warn('Could not load dynamic catalog options:', err)
    }
  }, [])

  // Initial load & whenever parameters change
  useEffect(() => {
    fetchProducts()
    fetchCatalogOptions()
  }, [fetchProducts, fetchCatalogOptions])

  // Real-time synchronization via BroadcastChannel & visibilitychange
  useEffect(() => {
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sathya_catalog') : null

    // An admin changed something: the cache is wrong, so drop it and reload.
    const handleMessage = (event) => {
      if (event.data === 'products-changed') {
        productsCache.clear()
        optionsCache = null
        fetchProducts()
        fetchCatalogOptions()
      }
    }

    if (channel) {
      channel.addEventListener('message', handleMessage)
    }

    // Coming back to the tab re-checks the server, but quietly: the products
    // already on screen stay there instead of collapsing back to skeletons.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      loadProducts(key, params)
        .then(list => { if (mounted.current && wantedKey.current === key) setProducts(list) })
        .catch(() => { /* keep what is on screen */ })
      loadOptions()
        .then(options => { if (options && mounted.current) setCatalogOptions(options) })
        .catch(() => { /* keep what is on screen */ })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleMessage)
        channel.close()
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProducts, fetchCatalogOptions, key])

  return {
    products,
    catalogOptions,
    loading,
    error,
    refetch: fetchProducts,
    refetchOptions: fetchCatalogOptions
  }
}

export default useCatalogProducts
