import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { afterPageTransition } from '../components/home/pageTransition'
import { showToast } from '../storefront/toast'
import { celebrateSignIn, farmerLandingPath } from '../storefront/welcome'
import useModalStates from '../storefront/useModalStates'
import {
  AUTH_HASHES, CHECKOUT_STEPS, CONTACT_FIELDS, GUEST_CART_KEY, STAFF_HOME, STEP_HASH,
  blankAddress, cartTotals, customerDetails, detailProblems, fieldsFromAddress, initialFields,
  itemCount, mergeCarts, normalizeCart, orderLine, stepForHash, withItemAdded,
} from './checkoutRules'

// The store's basket and checkout, shared by every store page: App.jsx wraps
// the routes in CheckoutProvider, and StorePopups.jsx draws the floating
// checkout (sections/CheckoutSheet.jsx) and the sign-in card once. The rules
// live here and nowhere else: the basket (a guest basket in this browser,
// merged into the account's basket on the server at sign-in), saved
// addresses, the address checks, Cash on Delivery, Razorpay, and clearing the
// basket once the order is placed. The storefront, product pages, headers and
// bottom-bar Menu add to the basket and open the pop-up through it.
//
// Each step of the pop-up has its own hash (#basket, #checkout-address,
// #checkout-payment, #order-confirmed): the phone's Back button goes back one
// step and then closes it, a shared link opens the right step, and a reload
// returns to it. The entries the pop-up pushed are counted in history.state
// (checkoutDepth), so closing it goes back past all of them.
//
// Three contexts, so typing in the address form re-renders only the pop-up:
// the actions (never change), the basket (changes with its items) and the
// whole checkout state.

const CHECKOUT_LOGIN_MSG = 'Login or Sign Up is mandatory to access checkout.'
const LINK_LOGIN_MSG = 'Login or Sign Up is mandatory to access your basket and checkout. Please sign in.'
const DRAFT_KEY = 'sathya_checkout_draft'
const ORDER_KEY = 'sathya_checkout_order'
const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
// The panel's slide-out (storefront.css, 7l); the confirmation stays until then.
const CLOSE_MS = 400

const ActionsContext = createContext(null)
const BasketContext = createContext(null)
const StateContext = createContext(null)

// Stable functions: add to the basket, open the pop-up, sign in.
// Pages a farmer stays on after signing in (see afterSignIn).
const STAY_AFTER_SIGN_IN = /^\/(product\/|orders|wishlist|blog\/)/

export const useCheckoutActions = () => useContext(ActionsContext)
// { cart, cartReady, count, totals }
export const useBasket = () => useContext(BasketContext)
// Everything the pop-up draws.
export const useCheckout = () => useContext(StateContext)

const hasToken = () => {
  try { return Boolean(localStorage.getItem('sathya_token')) } catch { return false }
}

function readGuestCart() {
  try { return normalizeCart(JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]')) } catch { return [] }
}
function writeGuestCart(items) {
  try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items)) } catch (err) { console.warn('Could not persist cart:', err) }
}
function clearGuestCart() {
  try { localStorage.removeItem(GUEST_CART_KEY) } catch {}
}

// This tab only: the details being entered and the order just placed, so a
// reload returns to the same step.
function readSession(key) {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null') } catch { return null }
}
function writeSession(key, value) {
  try {
    if (value == null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// mode: 'auto' (pick the latest saved address once they load), 'saved',
// 'edit' (a saved address open in the form) or 'new'.
const newDraft = user => ({ userId: user?.id || '', mode: 'auto', addressId: '', saveAddress: true, payment: 'cod', fields: initialFields(user) })
function readDraft(user) {
  const saved = readSession(DRAFT_KEY)
  if (!saved?.fields || saved.userId !== (user?.id || '')) return newDraft(user)
  return { ...newDraft(user), ...saved, fields: { ...initialFields(user), ...saved.fields } }
}

// Razorpay is not in index.html: it is fetched the first time a payment needs
// it, and after a flaky connection it is tried once more.
let razorpayLoad = null
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  razorpayLoad ||= new Promise(resolve => {
    const script = document.createElement('script')
    script.src = RAZORPAY_SRC
    script.onload = () => resolve(window.Razorpay || null)
    script.onerror = () => {
      razorpayLoad = null
      script.remove()
      resolve(null)
    }
    document.head.append(script)
  })
  return razorpayLoad
}

const withoutKey = (object, key) => {
  if (!(key in object)) return object
  const next = { ...object }
  delete next[key]
  return next
}
const contactOnly = errors => Object.fromEntries(Object.entries(errors).filter(([key]) => CONTACT_FIELDS.includes(key)))

export function CheckoutProvider({ enabled, children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [cart, setCartState] = useState(readGuestCart)
  const [cartReady, setCartReady] = useState(() => !hasToken())
  const [modals, modal] = useModalStates()
  const [authNotice, setAuthNotice] = useState('')
  const [loginRequest, setLoginRequest] = useState(0)
  const [addresses, setAddressesState] = useState(null) // null until loaded
  const [draft, setDraftState] = useState(() => readDraft(user))
  const [errors, setErrors] = useState({})
  const [busy, setBusyState] = useState('') // '' | save | cod | pay | verify
  const [order, setOrder] = useState(() => readSession(ORDER_KEY))

  const step = enabled ? stepForHash(location.hash) : null
  // The step on screen - kept while the pop-up slides away - and which way the
  // last change went, for the step's slide.
  const [view, setView] = useState({ step, shown: step, direction: 'open' })
  if (view.step !== step) {
    const back = view.step && step && CHECKOUT_STEPS.indexOf(step) < CHECKOUT_STEPS.indexOf(view.step)
    setView({ step, shown: step || view.shown, direction: !view.step || !step ? 'open' : back ? 'back' : 'forward' })
  }

  const cartRef = useRef(cart)
  const draftRef = useRef(draft)
  const addressesRef = useRef(addresses)
  const busyRef = useRef('')
  const syncRef = useRef(null) // { userId, promise } - the signed-in basket loading
  const serverCartRef = useRef(false) // the signed-in basket has loaded
  const saveQueue = useRef({ latest: null, running: null })
  const addressesLoading = useRef(false)
  const resumeRef = useRef(false) // sign-in was asked for by Checkout
  const closingRef = useRef(null) // { then } while the pop-up closes
  const dismissPaymentNote = useRef(null) // "Payment not completed", gone once paying again or ordered
  const openerRef = useRef(null)
  // The latest values for the actions below, which never change identity.
  const live = useRef({})
  live.current = { user, logout, location, navigate, step }

  const actions = useMemo(() => {
    const setBusy = value => {
      busyRef.current = value
      setBusyState(value)
    }

    // ---- basket ----
    const setCart = items => {
      cartRef.current = items
      setCartState(items)
    }

    // One save at a time; after the one in flight only the latest basket is
    // sent, so a quick run of + and - taps cannot arrive out of order.
    const putCart = items => {
      const queue = saveQueue.current
      queue.latest = items
      queue.running ||= (async () => {
        while (queue.latest) {
          const next = queue.latest
          queue.latest = null
          await axios.put('/api/cart', { items: next }).catch(err => console.warn('Could not sync cart:', err))
        }
        queue.running = null
      })()
      return queue.running
    }

    // Signed-out visitors keep a basket in this browser only; signed in, it
    // lives on the server against their user id. Until that basket has loaded,
    // changes wait in the guest basket, which is merged in when it does.
    const saveCart = items => {
      setCart(items)
      if (hasToken() && serverCartRef.current) return putCart(items)
      writeGuestCart(items)
      return Promise.resolve()
    }

    const showGuestCart = () => {
      const items = readGuestCart()
      setCart(items)
      setCartReady(true)
      return items
    }

    // The signed-in customer's basket from the server, with anything added as
    // a guest merged in. Asked twice for the same customer, it loads once.
    const loadCart = forUser => {
      if (!forUser || !hasToken()) {
        syncRef.current = null
        serverCartRef.current = false
        return Promise.resolve(showGuestCart())
      }
      if (syncRef.current?.userId === forUser.id) return syncRef.current.promise
      const promise = (async () => {
        try {
          const { data } = await axios.get('/api/cart')
          const guest = readGuestCart()
          const items = mergeCarts(data?.success ? normalizeCart(data.data) : [], guest)
          serverCartRef.current = true
          setCart(items)
          setCartReady(true)
          if (guest.length) {
            clearGuestCart()
            await putCart(items)
          }
          return items
        } catch {
          // An expired session is signed out by AuthContext (401) and carries on
          // as a guest. A network blip should not look like an empty basket
          // either: show this browser's basket and ask the server again later.
          syncRef.current = null
          return showGuestCart()
        }
      })()
      syncRef.current = { userId: forUser.id, promise }
      return promise
    }

    const addItem = (line, quantity = 1) => saveCart(withItemAdded(cartRef.current, line, quantity))

    const updateQty = (index, change) => {
      const current = cartRef.current
      if (!current[index]) return
      const qty = current[index].qty + change
      saveCart(qty <= 0 ? current.filter((_, i) => i !== index) : current.map((item, i) => (i === index ? { ...item, qty } : item)))
    }

    const removeLine = index => saveCart(cartRef.current.filter((_, i) => i !== index))

    const clearBasket = () => {
      clearGuestCart()
      setCart([])
      // The server emptied it with the order; this also outlasts a save still on its way.
      if (hasToken()) putCart([])
    }

    // ---- the pop-up's steps ----
    const depthHere = () => Number(live.current.location.state?.checkoutDepth) || 0
    const hereWithHash = hash => ({ pathname: live.current.location.pathname, search: live.current.location.search, hash })

    const showStep = (target, { replace = false } = {}) => {
      const { step: current } = live.current
      if (target === current) return
      if (!current) {
        const active = document.activeElement
        openerRef.current = active && active !== document.body && !active.closest('.sb-portal') ? active : null
      }
      modal.openModal('checkout')
      const depth = depthHere()
      live.current.navigate(hereWithHash(`#${STEP_HASH[target]}`), { replace, state: { checkoutDepth: replace ? depth : depth + 1 } })
    }

    const closeCheckout = ({ then } = {}) => {
      // Nobody closes it while an order is being placed or paid for.
      if (busyRef.current) return
      modal.closeModal('checkout')
      if (!live.current.step) {
        then?.()
        return
      }
      closingRef.current = { then }
      const depth = depthHere()
      if (depth > 0) live.current.navigate(-depth)
      else live.current.navigate(hereWithHash(''), { replace: true, state: null })
    }

    // Closing landed on a step a link opened (it pushed nothing): drop its hash too.
    const dropStepHash = () => live.current.navigate(hereWithHash(''), { replace: true, state: null })

    const openBasket = event => {
      event?.preventDefault?.()
      if (hasToken() && !serverCartRef.current) loadCart(live.current.user)
      showStep('basket')
    }

    const back = () => {
      const { step: current } = live.current
      if (!current || busyRef.current) return
      if (current === 'basket' || current === 'done') {
        closeCheckout()
        return
      }
      if (depthHere() > 1) live.current.navigate(-1)
      else showStep(CHECKOUT_STEPS[CHECKOUT_STEPS.indexOf(current) - 1], { replace: true })
    }

    // ---- sign-in and the account card ----
    const onAuthHash = () => AUTH_HASHES.has(decodeURIComponent(live.current.location.hash.slice(1)))

    const openSignIn = notice => {
      setAuthNotice(notice || '')
      setLoginRequest(count => count + 1)
      modal.openModal('authModal')
    }
    const openAccount = () => {
      setAuthNotice('')
      modal.openModal('authModal')
    }
    // The profile icons and Menu → My Account, on every store page: the card
    // opens over the page under its own history entry (#account), so the
    // phone's Back button closes it and a reload opens it again. Over the
    // checkout, or already on #account, it just opens.
    const showAccount = event => {
      event?.preventDefault?.()
      if (live.current.step || onAuthHash()) {
        openAccount()
        return
      }
      live.current.navigate(hereWithHash('#account'), { state: { accountCard: true } })
    }
    const prewarmSignIn = () => modal.prewarmModal('authModal')
    const prewarmCheckout = () => modal.prewarmModal('checkout')
    // Closing the card also takes away the hash that opened it: back past the
    // entry showAccount added, or out of the address a #login link opened.
    // Left in place, closing the basket later went Back onto it and opened the
    // card again.
    const closeSignIn = ({ keepHash = false } = {}) => {
      resumeRef.current = false
      modal.closeModal('authModal')
      setAuthNotice('')
      if (keepHash || live.current.step || !onAuthHash()) return
      if (live.current.location.state?.accountCard) live.current.navigate(-1)
      else live.current.navigate(hereWithHash(''), { replace: true, state: null })
    }
    // Leaving the card for another page (a staff portal): that page takes the
    // card's place in history, so Back does not open the card again.
    const leaveSignInFor = path => {
      const replace = onAuthHash() && !live.current.step
      closeSignIn({ keepHash: true })
      live.current.navigate(path, { replace })
    }
    const requireSignIn = () => {
      openSignIn(CHECKOUT_LOGIN_MSG)
      resumeRef.current = true
    }

    // Checkout, on the basket step (and "Proceed to checkout" on a product page).
    const startCheckout = () => {
      if (!live.current.user || !hasToken()) {
        if (!live.current.step) showStep('basket')
        requireSignIn()
        return
      }
      if (!cartRef.current.length) {
        showToast('Your basket is empty. Add products from the catalog first.', 'warning')
        return
      }
      showStep('address')
    }

    // `celebrate` is the sign-in sheet telling us this account was just created,
    // so the full welcome is worth playing. Someone coming back gets their name
    // said back to them instead, and nobody mid-checkout is interrupted at all.
    const afterSignIn = async (signedInUser, { celebrate = false } = {}) => {
      const resume = resumeRef.current
      // Staff roles each have their own portal.
      const home = STAFF_HOME[signedInUser?.role]
      if (home) {
        closeSignIn({ keepHash: true })
        await loadCart(signedInUser)
        leaveSignInFor(home)
        return
      }
      // A farmer who signed in in the middle of something carries on with it:
      // finishing a checkout, the basket filled as a guest, or the page being
      // read (a product, orders, wishlist, an article). Otherwise they go
      // shopping, and the sign-in card's history entry becomes that page.
      const guestItems = readGuestCart().length
      // Two different questions. `midTask` decides where they land: anything in
      // flight means stay put. `midCheckout` decides whether the welcome would
      // interrupt - and a basket filled as a guest is not an interruption, it
      // is just a basket waiting to be merged, so a new farmer still gets
      // their welcome. Only a checkout actually under way skips it.
      const midCheckout = resume || Boolean(live.current.step)
      const midTask = midCheckout || guestItems > 0
      if (midTask || STAY_AFTER_SIGN_IN.test(live.current.location.pathname)) {
        closeSignIn()
        if (celebrate && !midCheckout) celebrateSignIn(signedInUser)
        // Anything added as a guest joins this farmer's basket.
        const items = await loadCart(signedInUser)
        if (resume && items.length) showStep('address')
        else if (guestItems && !live.current.step) showStep('basket')
        return
      }
      if (celebrate) celebrateSignIn(signedInUser)
      leaveSignInFor(farmerLandingPath())
      loadCart(signedInUser)
    }

    // ---- delivery details ----
    const setDraft = update => {
      const next = typeof update === 'function' ? update(draftRef.current) : update
      draftRef.current = next
      setDraftState(next)
      writeSession(DRAFT_KEY, next)
    }

    const chooseAddress = id => {
      const address = addressesRef.current?.find(item => item.id === id)
      if (!address) return
      setDraft(d => ({ ...d, mode: 'saved', addressId: id, fields: fieldsFromAddress(d.fields, address) }))
      setErrors(contactOnly)
    }

    const addNewAddress = () => {
      setDraft(d => ({ ...d, mode: 'new', addressId: '', fields: blankAddress(d.fields, live.current.user) }))
      setErrors(contactOnly)
    }

    const editAddress = () => setDraft(d => ({ ...d, mode: 'edit' }))

    const setAddresses = list => {
      addressesRef.current = list
      setAddressesState(list)
      if (!list) return
      // First time here: the most recently used address, or the form when there is none.
      const d = draftRef.current
      const kept = (d.mode === 'saved' || d.mode === 'edit') && list.some(item => item.id === d.addressId)
      if (d.mode === 'new' || kept) return
      if (list.length) chooseAddress(list[list.length - 1].id)
      else setDraft({ ...d, mode: 'new', addressId: '' })
    }

    const loadAddresses = async () => {
      if (addressesLoading.current) return
      addressesLoading.current = true
      try {
        const { data } = await axios.get('/api/addresses')
        setAddresses(data?.success && Array.isArray(data.data) ? data.data : [])
      } catch {
        setAddresses([])
      } finally {
        addressesLoading.current = false
      }
    }

    // A new customer on this device starts from their own details and addresses.
    const resetForUser = forUser => {
      const next = readDraft(forUser)
      draftRef.current = next
      setDraftState(next)
      addressesRef.current = null
      setAddressesState(null)
      setErrors({})
    }

    const setField = (name, value) => {
      let clean = value
      if (name === 'pincode') clean = value.replace(/\D/g, '').slice(0, 6)
      if (name === 'customerPhone') clean = value.replace(/[^\d+ ]/g, '')
      setDraft(d => ({ ...d, fields: { ...d.fields, [name]: clean } }))
      setErrors(current => withoutKey(current, name))
    }
    const setSaveAddress = on => setDraft(d => ({ ...d, saveAddress: on }))
    const setPayment = method => setDraft(d => ({ ...d, payment: method }))

    // The first field to fix, once a form that was closed has rendered.
    const focusField = name => requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.getElementById(`co-${name}`)
      el?.focus({ preventScroll: true })
      el?.scrollIntoView({ block: 'center' })
    }))

    const continueToPayment = async () => {
      if (busyRef.current) return
      const d = draftRef.current
      const problems = detailProblems(d.fields)
      const bad = Object.keys(problems)
      setErrors(problems)
      if (bad.length) {
        // A saved address missing a field opens in the form, so it can be filled in.
        if (d.mode === 'saved' && bad.some(key => !CONTACT_FIELDS.includes(key))) setDraft({ ...d, mode: 'edit' })
        focusField(bad[0])
        return
      }
      if (d.mode !== 'saved' && d.saveAddress) {
        setBusy('save')
        try {
          const { addressDetails } = customerDetails(d.fields)
          const { data } = await axios.post('/api/addresses', { ...addressDetails, id: d.mode === 'edit' ? d.addressId : undefined })
          if (Array.isArray(data?.data)) {
            const list = data.data
            addressesRef.current = list
            setAddressesState(list)
            const saved = d.mode === 'edit' ? list.find(item => item.id === d.addressId) : list[list.length - 1]
            if (saved) setDraft(current => ({ ...current, mode: 'saved', addressId: saved.id }))
          }
        } catch {
          showToast('Could not save this address.', 'error')
          setBusy('')
          return
        }
        setBusy('')
      }
      showStep('payment')
    }

    // ---- placing the order ----
    // Checked again here: a reload or another tab may have changed things.
    const detailsForOrder = () => {
      const fields = draftRef.current.fields
      const problems = detailProblems(fields)
      if (Object.keys(problems).length) {
        setErrors(problems)
        showStep('address', { replace: true })
        return null
      }
      if (!cartRef.current.length) {
        showToast('Your basket is empty. Add products from the catalog first.', 'warning')
        return null
      }
      return customerDetails(fields)
    }

    const finishOrder = (placed, whatsapp) => {
      dismissPaymentNote.current?.()
      const items = cartRef.current
      const confirmed = {
        id: placed?.id || placed?._id || '',
        total: Number(placed?.total ?? cartTotals(items).total),
        paid: placed?.paymentStatus === 'Paid',
        expectedDeliveryDate: placed?.expectedDeliveryDate || null,
        whatsapp: whatsapp === 'sent',
      }
      writeSession(ORDER_KEY, confirmed)
      setOrder(confirmed)
      clearBasket()
      setDraft(newDraft(live.current.user))
      setErrors({})
      setBusy('')
      showStep('done', { replace: true })
    }

    // Cash on delivery: no payment gateway, the order is recorded straight away.
    const placeCodOrder = async () => {
      const details = detailsForOrder()
      if (!details) return
      setBusy('cod')
      try {
        const { data } = await axios.post('/api/orders', { ...details, items: cartRef.current.map(orderLine) })
        if (!data?.success) throw new Error(data?.message)
        finishOrder(data.data, data.whatsapp)
      } catch (err) {
        showToast(err?.response?.data?.message || err?.message || 'Unable to place order. Please try again.', 'error')
        setBusy('')
      }
    }

    // Razorpay: the server prices the basket and verifies the signature. Its
    // window opens over the pop-up; closed without paying, the payment step is
    // just as it was.
    const payOnline = async () => {
      const details = detailsForOrder()
      if (!details) return
      dismissPaymentNote.current?.()
      setBusy('pay')
      const Razorpay = await loadRazorpay()
      if (!Razorpay) {
        showToast('Payment library did not load. Please refresh and try again.', 'error')
        setBusy('')
        return
      }
      try {
        const items = cartRef.current
        const { data } = await axios.post('/api/payments/create-order', { items: items.map(orderLine), customer: details })
        if (!data?.success) throw new Error(data?.message || 'Could not start payment')
        const { razorpayOrderId, amount, currency, keyId } = data.data

        new Razorpay({
          key: keyId,
          order_id: razorpayOrderId,
          amount,
          currency,
          name: 'Sathyam Bio',
          description: `${items.length} item(s) — Crop Inputs`,
          // Razorpay only accepts the contact prefill with its country code.
          prefill: { name: details.customerName, contact: '+91' + String(details.customerPhone).replace(/\D/g, '').slice(-10) },
          theme: { color: '#15803d' },
          modal: {
            ondismiss: () => {
              setBusy('')
              dismissPaymentNote.current = showToast('Payment not completed. You can try again or choose Cash on Delivery.', 'info')
            },
          },
          handler: async response => {
            setBusy('verify')
            try {
              const { data: verified } = await axios.post('/api/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
              if (!verified?.success) throw new Error(verified?.message || 'Payment verification failed')
              finishOrder(verified.data, verified.whatsapp)
            } catch (err) {
              showToast(err?.response?.data?.message || err?.message || 'Payment verification failed', 'error')
              setBusy('')
            }
          },
        }).open()
      } catch (err) {
        showToast(err?.response?.data?.message || err?.message || 'Failed to start payment', 'error')
        setBusy('')
      }
    }

    // One tap only: the ref is set before the button has re-rendered as busy.
    const placeOrder = () => {
      if (busyRef.current) return
      // Cash on Delivery only for now; online payment returns in Phase 2.
      // if (draftRef.current.payment === 'online') payOnline()
      placeCodOrder()
    }

    const trackOrder = () => closeCheckout({ then: () => live.current.navigate('/orders') })

    const browseProducts = () => closeCheckout({
      then: () => {
        if (live.current.location.pathname === '/') document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
        else live.current.navigate('/products')
      },
    })

    const restoreFocus = () => {
      const opener = openerRef.current
      openerRef.current = null
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }

    const signOut = () => {
      live.current.logout(false)
      live.current.user = null
      // Never leave one customer's basket or address on screen for the next person on this device.
      syncRef.current = null
      serverCartRef.current = false
      clearGuestCart()
      setCart([])
      setCartReady(true)
      writeSession(DRAFT_KEY, null)
      writeSession(ORDER_KEY, null)
      setOrder(null)
      resetForUser(null)
      closeSignIn()
    }

    return {
      loadCart, showGuestCart, addItem, updateQty, removeLine,
      showStep, openBasket, startCheckout, back, closeCheckout, dropStepHash, trackOrder, browseProducts, restoreFocus,
      openSignIn, openAccount, showAccount, closeSignIn, leaveSignInFor, requireSignIn, afterSignIn, signOut, prewarmSignIn, prewarmCheckout,
      loadAddresses, resetForUser, chooseAddress, addNewAddress, editAddress, setField, setSaveAddress, setPayment,
      continueToPayment, placeOrder,
    }
  }, [modal])

  // The basket: the account's on the server once signed in, otherwise this browser's.
  useEffect(() => {
    if (enabled) actions.loadCart(user)
  }, [enabled, user?.id, actions])

  const draftOwner = useRef(user?.id || '')
  useEffect(() => {
    const id = user?.id || ''
    if (draftOwner.current === id) return
    draftOwner.current = id
    actions.resetForUser(user)
  }, [user?.id, actions])

  // Another tab changed the guest basket.
  useEffect(() => {
    const onStorage = event => {
      if (event.key === GUEST_CART_KEY && !hasToken()) actions.showGuestCart()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [actions])

  const count = itemCount(cart)
  // The header basket and anything else listening show this count.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sathya:cart-count', { detail: count }))
  }, [count])

  // #login / #auth and #account open the sign-in card on any store page.
  // Arriving from another page, it opens once that page change has finished
  // cross-fading (pageTransition.js); on the same page, at once.
  const handledLocation = useRef(null)
  useEffect(() => {
    if (!enabled || handledLocation.current === location.key) return
    handledLocation.current = location.key
    const hash = decodeURIComponent(location.hash.slice(1))
    let redirectMsg = null
    try { redirectMsg = sessionStorage.getItem('sathya_auth_redirect_msg') } catch {}
    if ((hash === 'login' || hash === 'auth' || redirectMsg) && !live.current.user) {
      try { sessionStorage.removeItem('sathya_auth_redirect_msg') } catch {}
      afterPageTransition().then(() => actions.openSignIn(redirectMsg || LINK_LOGIN_MSG))
    } else if (hash === 'account') {
      afterPageTransition().then(() => actions.openAccount())
    }
  }, [enabled, location.key, location.hash, actions])

  // The phone's Back button (or any other change of address) away from
  // #account / #login closes the card that hash opened.
  const lastHash = useRef(location.hash)
  useEffect(() => {
    const was = decodeURIComponent(lastHash.current.slice(1))
    lastHash.current = location.hash
    if (!AUTH_HASHES.has(was) || AUTH_HASHES.has(decodeURIComponent(location.hash.slice(1)))) return
    if (modal.modalsRef.current.authModal) actions.closeSignIn({ keepHash: true })
  }, [location.key, location.hash, actions, modal])

  // The pop-up follows the step in the address: opened by a link, the Back
  // button or a reload as much as by a tap.
  useEffect(() => {
    if (step) {
      if (closingRef.current) actions.dropStepHash()
      else afterPageTransition().then(() => { if (live.current.step) modal.openModal('checkout') })
      return
    }
    modal.closeModal('checkout')
    const closing = closingRef.current
    closingRef.current = null
    closing?.then?.()
  }, [step, actions, modal])

  // Steps that cannot be shown yet go where they can.
  const detailsReady = Object.keys(detailProblems(draft.fields)).length === 0
  useEffect(() => {
    if (!step || closingRef.current) return
    if (step === 'done') {
      if (!order) actions.closeCheckout()
      return
    }
    // Back from the confirmation: the order is placed, so the pop-up closes.
    if (order) {
      actions.closeCheckout()
      return
    }
    if (step === 'basket') return
    // Signed out (or the session expired): the basket, with the sign-in card.
    if (!user) {
      actions.showStep('basket', { replace: true })
      actions.requireSignIn()
      return
    }
    if (!cartReady) return
    if (!cart.length) actions.showStep('basket', { replace: true })
    else if (step === 'payment' && !detailsReady) actions.showStep('address', { replace: true })
  }, [step, order, user, cartReady, cart.length, detailsReady, actions])

  useEffect(() => {
    if ((step === 'address' || step === 'payment') && user && addresses === null) actions.loadAddresses()
  }, [step, user, addresses, actions])

  // The confirmation goes once the pop-up has slid away.
  useEffect(() => {
    if (step || !order) return undefined
    const timer = setTimeout(() => {
      writeSession(ORDER_KEY, null)
      setOrder(null)
    }, CLOSE_MS)
    return () => clearTimeout(timer)
  }, [step, order])

  const totals = useMemo(() => cartTotals(cart), [cart])
  const basket = useMemo(() => ({ cart, cartReady, count, totals }), [cart, cartReady, count, totals])
  const state = {
    ...basket, step, shown: view.shown, direction: view.direction, modals, authNotice, loginRequest,
    user, addresses, draft, errors, busy, order,
  }

  return createElement(ActionsContext.Provider, { value: actions },
    createElement(BasketContext.Provider, { value: basket },
      createElement(StateContext.Provider, { value: state }, children)))
}
