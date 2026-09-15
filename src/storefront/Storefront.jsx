import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { matchesDisease } from '../utils/catalogUtils'
import { afterPageTransition } from '../components/home/pageTransition'
import { useBasket, useCheckoutActions } from '../hooks/useCheckout'
import { SHARED_POPUP_HASHES } from '../hooks/checkoutRules'
import { StoreContext } from './StoreContext'
import useCatalogProducts from '../hooks/useCatalogProducts'
import { TEXT_PACKS, isLanguageReady, loadLanguagePack, translationFor } from './i18n'
import { showToast } from './toast'
import { setBodyFlag } from './bodyFlags'
import useModalStates from './useModalStates'
import { startNavDebugPanel } from './navDebug'
import { Header, NavBar, TickerBar, Topbar } from './sections/Header'
import { DealBanner, Hero, StatsStrip, TrustStrip } from './sections/Hero'
import { CategoryGrid, Certifications, CropGrid } from './sections/ShopGrids'
import { Catalog, Trending } from './sections/Catalog'
import { Newsletter, Testimonials } from './sections/Community'
import Footer from './sections/Footer'
import BackToTop from './sections/BackToTop'
import PhotoScannerModal from './sections/PhotoScannerModal'
import Chatbot from './sections/Chatbot'
import WelcomePoster from './sections/WelcomePoster'
import './storefront.css'

// The storefront home page (/): the catalogue and this page's own popups
// (photo scanner, welcome poster). The basket, the floating checkout and the
// sign-in card are shared with every store page (hooks/useCheckout.js, drawn
// by StorePopups.jsx), as are the phone bottom bar and its Menu sheet
// (MobileBottomNav) - all drawn once in App.jsx, so they stay in place when
// moving between pages. Links into this page: #scan, a section id, or
// ?category= / ?crop= from the shared Menu sheet.
// Styles: storefront.css, scoped to this page's wrapper.

const PAGE_TITLE = "Sathya Bio - India's Largest Online Agro Pesticides & Crop Protection Store"
const DEFAULT_FILTERS = { crop: 'all', disease: 'all', category: 'All', search: '' }
const HEADER_CATEGORIES = [
  ['All', 'All Categories'],
  ['Fungicide', 'Fungicides'],
  ['Insecticide', 'Insecticides'],
  ['Herbicide', 'Herbicides'],
  ['Bio-Stimulant', 'Bio-Stimulants'],
  ['Nematicide', 'Nematicides'],
]

function readLocalCms() {
  try { return JSON.parse(localStorage.getItem('sathya_cms') || '{}') } catch { return {} }
}

// Two things need the CMS settings; they share one request per visit.
let cmsSettingsRequest = null
function loadCmsSettings() {
  if (!cmsSettingsRequest) {
    cmsSettingsRequest = fetch('/api/cms')
      .then(response => (response.ok ? response.json() : null))
      .then(json => (json && json.data) || {})
      .catch(() => ({})) // local CMS settings remain available offline
  }
  return cmsSettingsRequest
}

// Whether the welcome poster opens on this visit (CMS audience and frequency,
// and at most once per browser session).
async function shouldShowWelcomePoster() {
  const settings = { ...readLocalCms(), ...(await loadCmsSettings()) }
  let user = null
  try { user = JSON.parse(localStorage.getItem('sathya_user') || 'null') } catch {}
  if (settings.popupAudience === 'farmer' && user?.role !== 'farmer') return false
  let seen = false
  try { seen = localStorage.getItem('sathya_popup_seen') === '1' } catch {}
  if (settings.popupBehavior === 'firstVisit' && seen) return false
  if (settings.popupBehavior === 'returning' && !seen) return false
  try {
    if (sessionStorage.getItem('sathya_popup_session') === '1') return false
    sessionStorage.setItem('sathya_popup_session', '1')
  } catch {}
  try { localStorage.setItem('sathya_popup_seen', '1') } catch {}
  return true
}

export default function Storefront() {
  const { user } = useAuth()
  const { lang, setLang } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const { count, totals } = useBasket()
  const checkout = useCheckoutActions()
  const [modals, modal] = useModalStates()

  const {
    products,
    catalogOptions: rawCatalogOptions,
    loading: catalogLoading,
    refetch: fetchLiveProducts,
    refetchOptions: fetchLiveCatalogOptions
  } = useCatalogProducts({
    userId: user?.id,
    onlineOnly: true
  })

  const catalogOptions = useMemo(() => {
    if (!rawCatalogOptions) return null
    return {
      categories: ['All', ...(rawCatalogOptions.categories || [])],
      crops: [{ id: 'all', name: 'All Crops' }, ...(rawCatalogOptions.crops || []).map(crop => ({ id: crop, name: crop }))],
      diseases: [{ id: 'all', name: 'All Diseases & Pests' }, ...(rawCatalogOptions.diseases || []).map(disease => ({ id: disease, name: disease }))],
    }
  }, [rawCatalogOptions])

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [appliedLang, setAppliedLang] = useState('en')
  const [certifications, setCertifications] = useState({})

  const productsRef = useRef(products)
  productsRef.current = products
  const languageRequest = useRef(0)
  const dismissLanguageToast = useRef(null)
  // The latest values for the actions below, which never change identity.
  const live = useRef({})
  live.current = { user, navigate, setLang, appliedLang }

  const actions = useMemo(() => {
    // ---- popups ----
    // This page's own (photo scanner, welcome poster) open here; the sign-in
    // card and the checkout are the shared ones.
    const { openModal, prewarmModal, closeModal } = modal
    const openSignIn = notice => checkout.openSignIn(notice)
    const handleAccountClick = event => checkout.showAccount(event)

    // ---- catalogue ----
    const scrollToCatalog = () => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
    const setFilter = (name, value) => setFilters(current => ({ ...current, [name]: value }))
    const resetFilters = () => setFilters(DEFAULT_FILTERS)
    const filterByCategory = category => {
      setFilters(current => ({ ...current, category }))
      scrollToCatalog()
    }
    const filterByCrop = crop => {
      setFilters(current => ({ ...current, crop }))
      scrollToCatalog()
    }
    const toggleFilterDrawer = open => setFilterDrawerOpen(current => (typeof open === 'boolean' ? open : !current))

    // ---- basket (hooks/useCheckout.js) ----
    const addToCart = productId => {
      const product = productsRef.current.find(item => item.id === productId)
      if (!product) return
      checkout.addItem({ ...product, selectedPack: product.selectedPack || (Array.isArray(product.packSizes) ? product.packSizes[0] : undefined) })

      if (!live.current.user) {
        showToast(`"${product.name}" added to cart!`, 'success')
        openSignIn('Login or Sign Up is mandatory to access your basket and complete checkout.')
      } else {
        showToast(`"${product.name}" added to basket!`, 'success')
        checkout.openBasket()
      }
    }

    const handleBasketClick = event => {
      event?.stopPropagation?.()
      checkout.openBasket(event)
    }

    // Looks up a real, currently-live product that treats the given disease
    // (e.g. from the photo scanner's diagnosis) instead of the caller
    // guessing/hardcoding a product id that may no longer exist.
    const findRemedyProduct = diseaseKeyword =>
      productsRef.current.find(product => matchesDisease(product.diseases, diseaseKeyword)) || null

    // ---- language ----
    const changeLanguage = async code => {
      if (code === live.current.appliedLang || !isLanguageReady(code)) return
      // Only the latest choice applies if two packs are still loading.
      const request = ++languageRequest.current
      const loaded = await loadLanguagePack(code)
      if (request !== languageRequest.current) return
      if (!loaded) {
        showToast('Could not load this language. Please check your connection and try again.', 'error')
        return
      }
      live.current.setLang(code)
      // A Kannada note never lingers on a page that is now in Hindi.
      dismissLanguageToast.current?.()
      dismissLanguageToast.current = showToast(TEXT_PACKS[code]?.languageChanged || 'Language changed to English', 'success', 2500)
    }

    const openProductPage = productId => live.current.navigate(`/product/${encodeURIComponent(productId)}`)
    const goTo = path => live.current.navigate(path)

    return {
      fetchLiveProducts, fetchLiveCatalogOptions,
      openModal, prewarmModal, closeModal, openSignIn, handleAccountClick,
      scrollToCatalog, setFilter, resetFilters, filterByCategory, filterByCrop, toggleFilterDrawer,
      addToCart, handleBasketClick, changeLanguage, openProductPage, goTo, findRemedyProduct,
    }
  }, [modal, checkout])

  // ---- page lifetime ----
  useLayoutEffect(() => {
    const body = document.body
    body.classList.add('sb-home-active', 'has-bottom-nav')
    const previousTitle = document.title
    document.title = PAGE_TITLE
    return () => {
      body.classList.remove('sb-home-active', 'has-bottom-nav', 'poster-open')
      setBodyFlag('overlay-open', 'storefront', false)
      body.style.overflow = ''
      document.title = previousTitle
    }
  }, [])

  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    cmsSettingsRequest = null
    loadCmsSettings().then(settings => setCertifications({ ...readLocalCms(), ...settings }))
  }, [])

  useEffect(() => {

    // Escape closes this page's top-most open popup. The shared popups
    // (sign-in, checkout) take it first when they are open.
    const onKey = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const open = [...document.querySelectorAll('.sb-home .modal-overlay.active')].pop()
      if (open) actions.closeModal(open.id)
    }
    document.addEventListener('keydown', onKey)

    // Anything marked data-modal-target opens that popup; touch-down warms it.
    const onPointerDown = event => {
      if (event.pointerType === 'mouse' || !(event.target instanceof Element)) return
      const trigger = event.target.closest('.sb-home [data-modal-target]')
      if (trigger) actions.prewarmModal(trigger.getAttribute('data-modal-target'))
    }
    document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true })
    const onClick = event => {
      const trigger = event.target instanceof Element && event.target.closest('.sb-home [data-modal-target]')
      if (trigger) actions.openModal(trigger.getAttribute('data-modal-target'))
    }
    document.addEventListener('click', onClick)

    const stopNavDebug = startNavDebugPanel()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown, { capture: true })
      document.removeEventListener('click', onClick)
      stopNavDebug()
    }
  }, [actions])

  // The welcome poster, a moment after the page appears - never on top of a
  // popup the visitor is already using (such as sign-in from a checkout link).
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      if (!(await shouldShowWelcomePoster()) || cancelled) return
      if (Object.keys(modal.modalsRef.current).length || document.body.classList.contains('overlay-open')) return
      actions.openModal('welcomePosterModal')
    }, 1800)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [actions, modal])

  // Links into the page: #scan, a section id, and ?category= / ?crop= from
  // the shared Menu sheet. #login, #account and the checkout steps belong to
  // the shared popups (hooks/useCheckout.js). Each history entry is handled
  // once: closing a popup goes Back onto the entry before it (the sign-in
  // card, the basket), and a /#scan there must not open the scanner again.
  const handledLocations = useRef(new Set())
  useEffect(() => {
    if (handledLocations.current.has(location.key)) return
    handledLocations.current.add(location.key)

    const params = new URLSearchParams(location.search)
    const category = params.get('category')
    const crop = params.get('crop')
    if (category || crop) setFilters(current => ({ ...current, ...(category && { category }), ...(crop && { crop }) }))

    const hash = decodeURIComponent(location.hash.slice(1))
    if (hash === 'scan') {
      // Arriving from another page, the scanner opens once that page change
      // has finished cross-fading (see pageTransition.js); on this page, at once.
      afterPageTransition().then(() => actions.openModal('photoScannerModal'))
    } else if (hash && !SHARED_POPUP_HASHES.has(hash)) {
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView())
    }
  }, [location.key, location.search, location.hash, actions])

  // Body classes other styles key off (pausing the ticker behind a popup).
  useEffect(() => {
    const blocking = filterDrawerOpen || Object.entries(modals).some(([id, value]) => id !== 'welcomePosterModal' && value)
    setBodyFlag('overlay-open', 'storefront', blocking)
    document.body.classList.toggle('poster-open', modals.welcomePosterModal === 'open')
  }, [modals, filterDrawerOpen])

  useEffect(() => {
    document.body.style.overflow = filterDrawerOpen ? 'hidden' : ''
  }, [filterDrawerOpen])

  // ---- language ----
  // The chosen language is applied once its pack has loaded; until then (or
  // if it cannot load) the page stays in English.
  useEffect(() => {
    let cancelled = false
    loadLanguagePack(lang).then(ok => {
      if (!cancelled) setAppliedLang(ok && isLanguageReady(lang) ? lang : 'en')
    })
    return () => { cancelled = true }
  }, [lang])

  // The rest of the page text is translated app-wide by PageTranslator (App.jsx).

  const t = useCallback(key => translationFor(appliedLang, key) || key, [appliedLang])

  const headerCategories = catalogOptions
    ? catalogOptions.categories.map(value => [value, value === 'All' ? 'All Categories' : value])
    : HEADER_CATEGORIES

  return (
    <StoreContext.Provider value={actions}>
      <div className="sb-home" id="top">
        <TickerBar />
        <Topbar t={t} user={user} appliedLang={appliedLang} />
        <Header t={t} user={user} appliedLang={appliedLang} cartCount={count} cartTotal={totals.total} searchText={filters.search} headerCategories={headerCategories} />
        <NavBar t={t} />
        <Hero t={t} />
        <DealBanner />
        <TrustStrip t={t} />
        <StatsStrip />
        <CategoryGrid t={t} />
        <CropGrid />
        <Certifications settings={certifications} />
        <Catalog t={t} filters={filters} products={products} catalogOptions={catalogOptions} user={user} filterDrawerOpen={filterDrawerOpen} loading={catalogLoading} />
        <Trending t={t} products={products} loading={catalogLoading} />
        <Testimonials />
        <Newsletter />
        <Footer t={t} />
        <BackToTop />
        <PhotoScannerModal state={modals.photoScannerModal} t={t} />
        <Chatbot t={t} />
        <WelcomePoster state={modals.welcomePosterModal} />
      </div>
    </StoreContext.Provider>
  )
}
