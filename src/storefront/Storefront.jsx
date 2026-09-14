import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { afterPageTransition } from '../components/home/pageTransition'
import { StoreContext } from './StoreContext'
import { PESTICIDES } from './data'
import { TEXT_PACKS, isLanguageReady, loadLanguagePack, translationFor } from './i18n'
import { showToast } from './toast'
import { startNavDebugPanel } from './navDebug'
import { Header, NavBar, TickerBar, Topbar } from './sections/Header'
import { DealBanner, Hero, StatsStrip, TrustStrip } from './sections/Hero'
import { CategoryGrid, Certifications, CropGrid } from './sections/ShopGrids'
import { Catalog, Trending } from './sections/Catalog'
import { Newsletter, Testimonials } from './sections/Community'
import Footer from './sections/Footer'
import BackToTop from './sections/BackToTop'
import CartDrawer from './sections/CartDrawer'
import PhotoScannerModal from './sections/PhotoScannerModal'
import Chatbot from './sections/Chatbot'
import WelcomePoster from './sections/WelcomePoster'
import AuthModal from './sections/AuthModal'
import './storefront.css'

// The storefront home page (/): catalogue, basket, sign-in and the popups.
// Styles: storefront.css, scoped to this page's wrapper. The phone bottom bar
// and its Menu sheet are shared with every store page (MobileBottomNav, drawn
// once in App.jsx), so they stay in place when moving between pages; its home
// links arrive here as #login, #account, #basket, #scan, a section id, or
// ?category= / ?crop=.

const GUEST_CART_KEY = 'sathya_cart_guest'
const STAFF_HOME = { admin: '/admin', employee: '/employee', delivery: '/delivery', billing: '/billing' }
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

const storedToken = () => {
  try { return localStorage.getItem('sathya_token') } catch { return null }
}

function readGuestCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

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
  const { user, logout } = useAuth()
  const { lang, setLang } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const [products, setProducts] = useState(PESTICIDES)
  const [catalogOptions, setCatalogOptions] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [cart, setCartState] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [modals, setModals] = useState({})
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const [loginRequest, setLoginRequest] = useState(0)
  const [appliedLang, setAppliedLang] = useState('en')
  const [certifications, setCertifications] = useState({})

  const cartRef = useRef(cart)
  const productsRef = useRef(products)
  const modalsRef = useRef(modals)
  const prewarmRef = useRef({})
  const languageRequest = useRef(0)
  const dismissLanguageToast = useRef(null)
  // The latest values for the actions below, which never change identity.
  const live = useRef({})
  live.current = { user, logout, navigate, setLang, appliedLang }

  const actions = useMemo(() => {
    const setCart = next => {
      cartRef.current = next
      setCartState(next)
    }

    // Signed-out visitors keep a basket in this browser only. Once signed in
    // the basket lives on the server against their user id.
    const saveCart = (items = cartRef.current) => {
      const token = storedToken()
      if (!token) {
        try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items)) } catch (err) { console.warn('Could not persist cart:', err) }
        return Promise.resolve()
      }
      return fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      }).catch(err => console.warn('Could not sync cart:', err))
    }

    // Pull the signed-in user's basket from the server, merging anything they
    // added as a guest before signing in.
    const syncCartFromServer = async () => {
      const token = storedToken()
      if (!token) {
        setCart(readGuestCart())
        return
      }
      try {
        const res = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } })
        if (res.status === 401) {
          // Expired or revoked session: carry on as a guest.
          live.current.logout(false)
          setCart(readGuestCart())
          return
        }
        const json = await res.json()
        const serverCart = json.success && Array.isArray(json.data) ? json.data : []
        const guestCart = readGuestCart()
        if (guestCart.length) {
          guestCart.forEach(item => {
            const existing = serverCart.find(i => i.id === item.id)
            if (existing) existing.qty += item.qty
            else serverCart.push(item)
          })
          try { localStorage.removeItem(GUEST_CART_KEY) } catch {}
          setCart(serverCart)
          await saveCart(serverCart)
        } else {
          setCart(serverCart)
        }
      } catch (err) {
        console.warn('Could not load cart:', err)
        setCart([])
      }
    }

    const fetchLiveProducts = async (forUser = live.current.user) => {
      const userId = (forUser && forUser.id) || ''
      try {
        const res = await fetch(`/api/products?userId=${encodeURIComponent(userId)}&onlineOnly=true`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          productsRef.current = json.data
          setProducts(json.data)
        }
      } catch (err) {
        console.warn('Backend database loading fallback:', err)
      }
    }

    const fetchLiveCatalogOptions = async () => {
      try {
        const res = await fetch('/api/catalog-options')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!json.success) return
        setCatalogOptions({
          categories: ['All', ...(json.data.categories || [])],
          crops: [{ id: 'all', name: 'All Crops' }, ...(json.data.crops || []).map(crop => ({ id: crop, name: crop }))],
        })
      } catch (err) {
        console.warn('Catalog options unavailable:', err)
      }
    }

    // ---- popups ----
    const setModal = (id, value) => {
      const next = { ...modalsRef.current }
      if (value) next[id] = value
      else delete next[id]
      modalsRef.current = next
      setModals(next)
    }

    // The overlay is painted (still transparent) at least one frame before the
    // card slides, so the first frame of the animation is not spent creating
    // the layer - the stutter on phones. A popup warmed on touch-down slides on
    // the next frame: the tap's own task already renders the link it followed
    // (/#account), and starting the slide in it too made one long task (traced:
    // ~270ms on a 4x slower CPU) instead of two short ones.
    const openModal = id => {
      const current = modalsRef.current[id]
      const warm = prewarmRef.current[id]
      if (current === 'open' || (current === 'opening' && !warm)) return
      if (warm) clearTimeout(warm.timer)
      delete prewarmRef.current[id]
      const start = () => {
        if (modalsRef.current[id] === 'opening') setModal(id, 'open')
      }
      // Warmed, it is already 'opening'; setting it again only re-renders the page.
      if (current !== 'opening') setModal(id, 'opening')
      if (warm && performance.now() - warm.at > 20) requestAnimationFrame(start)
      else requestAnimationFrame(() => requestAnimationFrame(start))
    }

    // Touch-down on anything that opens a popup starts its warm-up; not tapped
    // after all (a scroll), it cools down.
    const prewarmModal = id => {
      if (modalsRef.current[id]) return
      prewarmRef.current[id] = {
        at: performance.now(),
        timer: setTimeout(() => {
          if (!prewarmRef.current[id]) return
          delete prewarmRef.current[id]
          setModal(id, undefined)
        }, 800),
      }
      setModal(id, 'opening')
    }

    const closeModal = id => {
      const warm = prewarmRef.current[id]
      if (warm) clearTimeout(warm.timer)
      delete prewarmRef.current[id]
      setModal(id, undefined)
      if (id === 'authModal') setAuthNotice('')
    }

    const openSignIn = notice => {
      setAuthNotice(notice)
      setLoginRequest(count => count + 1)
      openModal('authModal')
    }

    const handleAccountClick = () => {
      setAuthNotice('')
      openModal('authModal')
    }

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

    // ---- basket ----
    const addToCart = productId => {
      const product = productsRef.current.find(item => item.id === productId)
      if (!product) return
      const current = cartRef.current
      const existing = current.find(item => item.id === productId)
      const next = existing
        ? current.map(item => (item === existing ? { ...item, qty: item.qty + 1 } : item))
        // _id mirrors id so the checkout page keys off the same value.
        : [...current, { ...product, _id: product.id, qty: 1, selectedPack: product.selectedPack || (Array.isArray(product.packSizes) ? product.packSizes[0] : undefined) }]
      setCart(next)
      saveCart(next)

      if (!live.current.user) {
        showToast(`"${product.name}" added to cart!`, 'success')
        setCartOpen(false)
        openSignIn('Login or Sign Up is mandatory to access your basket and complete checkout.')
      } else {
        showToast(`"${product.name}" added to basket!`, 'success')
        setCartOpen(true)
      }
    }

    const updateQty = (index, change) => {
      const current = cartRef.current
      if (!current[index]) return
      const qty = current[index].qty + change
      const next = qty <= 0 ? current.filter((_, i) => i !== index) : current.map((item, i) => (i === index ? { ...item, qty } : item))
      setCart(next)
      saveCart(next)
    }

    const removeFromCart = index => {
      const next = cartRef.current.filter((_, i) => i !== index)
      setCart(next)
      saveCart(next)
    }

    const handleBasketClick = event => {
      event?.preventDefault?.()
      event?.stopPropagation?.()
      if (!live.current.user) {
        setCartOpen(false)
        openSignIn('Login or Sign Up is mandatory to access your basket and checkout.')
        return
      }
      setCartOpen(true)
    }

    const goToCheckout = () => {
      if (!live.current.user) {
        setCartOpen(false)
        openSignIn('Login or Sign Up is mandatory to access checkout.')
        return
      }
      if (!cartRef.current.length) {
        showToast('Your basket is empty. Add products from the catalog first.', 'warning')
        return
      }
      // Saved first, so the checkout page reads the same basket.
      Promise.resolve(saveCart()).finally(() => live.current.navigate('/checkout'))
    }

    // ---- account ----
    const afterSignIn = async signedInUser => {
      closeModal('authModal')
      // Carry anything added as a guest into this user's own basket before leaving.
      await syncCartFromServer()
      // Staff roles each have their own portal; farmers stay on the storefront.
      const home = STAFF_HOME[signedInUser?.role]
      if (home) {
        live.current.navigate(home)
        return
      }
      fetchLiveProducts(signedInUser)
    }

    const signOut = () => {
      live.current.logout(false)
      live.current.user = null
      // Never leave one user's basket on screen for the next person on this device.
      setCart([])
      try { localStorage.removeItem(GUEST_CART_KEY) } catch {}
      fetchLiveProducts(null)
      closeModal('authModal')
    }

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
      saveCart, syncCartFromServer, fetchLiveProducts, fetchLiveCatalogOptions,
      openModal, prewarmModal, closeModal, openSignIn, handleAccountClick,
      scrollToCatalog, setFilter, resetFilters, filterByCategory, filterByCrop, toggleFilterDrawer,
      addToCart, updateQty, removeFromCart, handleBasketClick, goToCheckout, setCartOpen,
      afterSignIn, signOut, changeLanguage, openProductPage, goTo,
    }
  }, [])

  // ---- page lifetime ----
  useLayoutEffect(() => {
    const body = document.body
    body.classList.add('sb-home-active', 'has-bottom-nav')
    const previousTitle = document.title
    document.title = PAGE_TITLE
    return () => {
      body.classList.remove('sb-home-active', 'has-bottom-nav', 'overlay-open', 'poster-open')
      body.style.overflow = ''
      document.title = previousTitle
    }
  }, [])

  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    cmsSettingsRequest = null
    actions.syncCartFromServer()
    actions.fetchLiveProducts()
    actions.fetchLiveCatalogOptions()
    loadCmsSettings().then(settings => setCertifications({ ...readLocalCms(), ...settings }))
  }, [actions])

  useEffect(() => {
    // The admin Products page announces changes on this channel.
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sathya_catalog') : null
    const onCatalog = event => {
      if (event.data !== 'products-changed') return
      actions.fetchLiveProducts()
      actions.fetchLiveCatalogOptions()
    }
    channel?.addEventListener('message', onCatalog)
    // Admin may be working in another browser; catch up on return to this tab.
    const onVisible = () => { if (document.visibilityState === 'visible') actions.fetchLiveProducts() }
    document.addEventListener('visibilitychange', onVisible)

    // Escape closes the top-most open popup (or the basket drawer).
    const onKey = event => {
      if (event.key !== 'Escape') return
      const open = [...document.querySelectorAll('.sb-home .modal-overlay.active')].pop()
      if (open) actions.closeModal(open.id)
      else actions.setCartOpen(false)
    }
    document.addEventListener('keydown', onKey)

    // Anything marked data-modal-target opens that popup; touch-down warms it.
    // So does touch-down on account: the header button here, or on phones the
    // header row's account link (StoreHeader, /#account on this page).
    const onPointerDown = event => {
      if (event.pointerType === 'mouse' || !(event.target instanceof Element)) return
      const trigger = event.target.closest('.sb-home [data-modal-target]')
      if (trigger) actions.prewarmModal(trigger.getAttribute('data-modal-target'))
      else if (event.target.closest('#headerAccountBtn, .sb-store-head a[href="/#account"]')) actions.prewarmModal('authModal')
    }
    document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true })
    const onClick = event => {
      const trigger = event.target instanceof Element && event.target.closest('.sb-home [data-modal-target]')
      if (trigger) actions.openModal(trigger.getAttribute('data-modal-target'))
    }
    document.addEventListener('click', onClick)

    const stopNavDebug = startNavDebugPanel()
    return () => {
      channel?.close()
      document.removeEventListener('visibilitychange', onVisible)
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
      if (!(await shouldShowWelcomePoster()) || cancelled || Object.keys(modalsRef.current).length) return
      actions.openModal('welcomePosterModal')
    }, 1800)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [actions])

  // Links into the page: #login / #auth, #account, #basket, #scan, a section
  // id, and ?category= / ?crop= from the shared Menu sheet.
  const handledLocation = useRef(null)
  useEffect(() => {
    if (handledLocation.current === location.key) return
    handledLocation.current = location.key

    const params = new URLSearchParams(location.search)
    const category = params.get('category')
    const crop = params.get('crop')
    if (category || crop) setFilters(current => ({ ...current, ...(category && { category }), ...(crop && { crop }) }))

    const hash = decodeURIComponent(location.hash.slice(1))
    let redirectMsg = null
    try { redirectMsg = sessionStorage.getItem('sathya_auth_redirect_msg') } catch {}
    // Arriving from another page, a popup opens once that page change has
    // finished cross-fading (see pageTransition.js); on this page, at once.
    const whenArrived = open => { afterPageTransition().then(open) }
    if ((hash === 'login' || hash === 'auth' || redirectMsg) && !live.current.user) {
      const notice = redirectMsg || 'Login or Sign Up is mandatory to access your basket and checkout. Please sign in.'
      try { sessionStorage.removeItem('sathya_auth_redirect_msg') } catch {}
      whenArrived(() => actions.openSignIn(notice))
    } else if (hash === 'account') {
      whenArrived(() => actions.handleAccountClick())
    } else if (hash === 'basket') {
      whenArrived(() => actions.handleBasketClick())
    } else if (hash === 'scan') {
      whenArrived(() => actions.openModal('photoScannerModal'))
    } else if (hash && hash !== 'login' && hash !== 'auth') {
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView())
    }
  }, [location.key, location.search, location.hash, actions])

  // Body classes other styles key off (pausing the ticker behind a popup).
  useEffect(() => {
    const blocking = filterDrawerOpen || Object.entries(modals).some(([id, value]) => id !== 'welcomePosterModal' && value)
    document.body.classList.toggle('overlay-open', blocking)
    document.body.classList.toggle('poster-open', modals.welcomePosterModal === 'open')
  }, [modals, filterDrawerOpen])

  useEffect(() => {
    document.body.style.overflow = filterDrawerOpen ? 'hidden' : ''
  }, [filterDrawerOpen])

  // The shared bottom bar and the header basket show this count.
  useEffect(() => {
    const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)
    window.dispatchEvent(new CustomEvent('sathya:cart-count', { detail: count }))
  }, [cart])

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

  const count = cart.reduce((sum, item) => sum + item.qty, 0)
  // Same rule as the checkout page and the server: GST is 18% of the subtotal, rounded.
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const gst = Math.round(subtotal * 0.18)
  const total = subtotal + gst
  const headerCategories = catalogOptions
    ? catalogOptions.categories.map(value => [value, value === 'All' ? 'All Categories' : value])
    : HEADER_CATEGORIES

  return (
    <StoreContext.Provider value={actions}>
      <div className="sb-home" id="top">
        <TickerBar />
        <Topbar t={t} user={user} appliedLang={appliedLang} />
        <Header t={t} user={user} appliedLang={appliedLang} cartCount={count} cartTotal={total} searchText={filters.search} headerCategories={headerCategories} />
        <NavBar t={t} />
        <Hero t={t} />
        <DealBanner />
        <TrustStrip t={t} />
        <StatsStrip />
        <CategoryGrid t={t} />
        <CropGrid />
        <Certifications settings={certifications} />
        <Catalog t={t} filters={filters} products={products} catalogOptions={catalogOptions} user={user} filterDrawerOpen={filterDrawerOpen} />
        <Trending t={t} products={products} />
        <Testimonials />
        <Newsletter />
        <Footer t={t} />
        <BackToTop />
        <CartDrawer open={cartOpen} cart={cart} count={count} subtotal={subtotal} gst={gst} total={total} />
        <PhotoScannerModal state={modals.photoScannerModal} t={t} />
        <Chatbot t={t} />
        <WelcomePoster state={modals.welcomePosterModal} />
        <AuthModal t={t} state={modals.authModal} user={user} notice={authNotice} loginRequest={loginRequest} />
      </div>
    </StoreContext.Provider>
  )
}
