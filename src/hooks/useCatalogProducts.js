import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const DEFAULT_OPTIONS = {
  categories: ['Fungicide', 'Insecticide', 'Herbicide', 'Bio-Stimulant', 'Fertilizer', 'Nematicide', 'Adjuvant'],
  crops: [],
  storageBatches: [],
  diseases: []
}

/**
 * Unified real-time product catalog hook for Sathyam Bio.
 * 
 * Features:
 * - Fetches products dynamically from MongoDB via /api/products
 * - Supports targeted user personalization (prioritizing products assigned to the logged-in farmer)
 * - Subscribes to BroadcastChannel('sathya_catalog') for instantaneous cross-tab live updates on admin changes
 * - Reconciles catalog on browser tab visibility change
 * - Graceful AbortController handling to prevent stale race conditions
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
  const [products, setProducts] = useState([])
  const [catalogOptions, setCatalogOptions] = useState(DEFAULT_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const abortControllerRef = useRef(null)

  const fetchCatalogOptions = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/catalog-options')
      if (data.success && data.data) {
        setCatalogOptions(data.data)
      }
    } catch (err) {
      console.warn('Could not load dynamic catalog options:', err)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const params = {}
      if (userId) params.userId = userId
      if (category && category !== 'All') params.category = category
      if (crop && crop !== 'all') params.crop = crop
      if (disease && disease !== 'all') params.disease = disease
      if (search && search.trim()) params.search = search.trim()
      if (sortBy) params.sortBy = sortBy
      if (onlineOnly) params.onlineOnly = 'true'

      const { data } = await axios.get('/api/products', {
        params,
        signal: abortControllerRef.current.signal
      })

      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data)
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Failed to load products from database:', err)
        setError(err)
      }
    } finally {
      setLoading(false)
    }
  }, [userId, category, crop, disease, search, sortBy, onlineOnly])

  // Initial load & whenever parameters change
  useEffect(() => {
    fetchProducts()
    fetchCatalogOptions()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchProducts, fetchCatalogOptions])

  // Real-time synchronization via BroadcastChannel & visibilitychange
  useEffect(() => {
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sathya_catalog') : null

    const handleMessage = (event) => {
      if (event.data === 'products-changed') {
        fetchProducts()
        fetchCatalogOptions()
      }
    }

    if (channel) {
      channel.addEventListener('message', handleMessage)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts()
        fetchCatalogOptions()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleMessage)
        channel.close()
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchProducts, fetchCatalogOptions])

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
