import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'

// Basket + checkout (/checkout). Replaces public/checkout.html, which now
// redirects here. Styles: index.css, "CHECKOUT".
//
// Signed-out visitors keep their basket in this browser under sathya_cart_guest
// (the key public/js/app.js writes); signed-in customers have theirs on the
// server against their user id. Both are read here, and a guest basket is
// merged into the account, so the basket never appears to vanish at checkout.

const GUEST_CART_KEY = 'sathya_cart_guest'
const GST_RATE = 0.18 // must match the server's calculation in /api/payments/create-order
const PLACEHOLDER_IMAGE = '/assets/p1.webp'
const LOGIN_MSG = 'Login or Sign Up is mandatory to access your basket and checkout. Please sign in.'
const EXPIRED_MSG = 'Your session expired. Please sign in again to access checkout.'
const ADDRESS_LABELS = ['Home', 'Office', 'Farm']
const STATES = ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Other']
const ADDRESS_KEYS = ['doorNo', 'street', 'area', 'taluk', 'pincode', 'district', 'state']

const keyOf = item => item.id || item._id
// Only the product, pack size and quantity are sent: the server works out every price.
const orderLine = item => ({ id: keyOf(item), qty: Number(item.qty || 1), selectedPack: item.selectedPack || '' })
const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN')
const itemCount = items => items.reduce((sum, item) => sum + Number(item.qty || 1), 0)

const readGuestCart = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const clearGuestCart = () => {
  try { localStorage.removeItem(GUEST_CART_KEY) } catch {}
}

const saveCart = items => axios.put('/api/cart', { items }).catch(() => {})

// Keeps the header basket count (StoreHeader) in step with this page.
const announceCount = items => window.dispatchEvent(new CustomEvent('sathya:cart-count', { detail: itemCount(items) }))

// Empty "data:image/...;base64," uploads are not images; use the placeholder
// (the storefront does the same).
const thumbnailOf = item => {
  const image = String(item.image || item.imageUrl || '').trim()
  return !image || /^data:image\/[\w+.-]+;base64,?$/i.test(image) ? PLACEHOLDER_IMAGE : image
}

const initialFields = user => ({
  addressLabel: 'Home',
  customerName: user?.name || '',
  customerPhone: user?.phone || user?.mobile || '',
  doorNo: '',
  street: '',
  area: user?.village || '',
  taluk: '',
  pincode: '',
  district: user?.district || '',
  state: STATES.includes(user?.state) ? user.state : '',
})

const hasSession = user => Boolean(user && localStorage.getItem('sathya_token'))

export default function Checkout() {
  const { user, loading: sessionLoading } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState([])
  const [cartReady, setCartReady] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [savedAddressId, setSavedAddressId] = useState('')
  const [fields, setFields] = useState(() => initialFields(user))
  const [saveAddress, setSaveAddress] = useState(true)
  const [step, setStep] = useState('address') // address | payment
  const [busy, setBusy] = useState('') // '' | save | cod | pay
  const redirecting = useRef(false)
  const loadedFor = useRef(null)
  const paymentStepRef = useRef(null)

  // Checkout is for signed-in customers only. The storefront reads the message
  // and opens its sign-in sheet.
  const goToSignIn = message => {
    if (redirecting.current) return
    redirecting.current = true
    try { sessionStorage.setItem('sathya_auth_redirect_msg', message) } catch {}
    window.location.replace('/storefront.html#login')
  }

  useEffect(() => {
    if (!sessionLoading && !hasSession(user)) goToSignIn(LOGIN_MSG)
  }, [sessionLoading, user])

  useEffect(() => {
    if (!hasSession(user) || loadedFor.current === user.id) return
    loadedFor.current = user.id

    const loadCart = async () => {
      try {
        const { data } = await axios.get('/api/cart')
        const items = data?.success && Array.isArray(data.data) ? data.data : []
        const guestCart = readGuestCart()
        if (guestCart.length) {
          guestCart.forEach(item => {
            const existing = items.find(i => keyOf(i) === keyOf(item) && i.selectedPack === item.selectedPack)
            if (existing) existing.qty = Number(existing.qty || 1) + Number(item.qty || 1)
            else items.push(item)
          })
          clearGuestCart()
          await saveCart(items)
        }
        return items
      } catch (err) {
        // A 401 also signs the customer out (AuthContext).
        if (err?.response?.status === 401) {
          goToSignIn(EXPIRED_MSG)
          return null
        }
        // The server cart is the real one, but a network blip should not look
        // like an empty basket, so fall back to whatever this browser holds.
        return readGuestCart()
      }
    }

    loadCart().then(items => {
      if (!items) return
      setCart(items)
      setCartReady(true)
      announceCount(items)
    })
    axios.get('/api/addresses')
      .then(({ data }) => setSavedAddresses(data?.success && Array.isArray(data.data) ? data.data : []))
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (step === 'payment') paymentStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.qty || 1), 0)
    const gst = Math.round(subtotal * GST_RATE)
    return { subtotal, gst, total: subtotal + gst }
  }, [cart])

  const setQty = (id, qty) => {
    const next = qty < 1
      ? cart.filter(i => String(keyOf(i)) !== String(id))
      : cart.map(i => (String(keyOf(i)) === String(id) ? { ...i, qty } : i))
    setCart(next)
    saveCart(next)
    announceCount(next)
  }

  const updateField = event => {
    const { name, value } = event.target
    setFields(current => ({ ...current, [name]: value }))
  }

  const chooseSavedAddress = id => {
    setSavedAddressId(id)
    const address = savedAddresses.find(item => item.id === id)
    if (!address) return
    setFields(current => ({
      ...current,
      ...Object.fromEntries(ADDRESS_KEYS.map(key => [key, address[key] || ''])),
      addressLabel: ADDRESS_LABELS.includes(address.label || 'Home') ? (address.label || 'Home') : current.addressLabel,
    }))
  }

  const customerDetails = () => {
    const f = fields
    const addressDetails = {
      label: f.addressLabel || 'Home', doorNo: f.doorNo, street: f.street, area: f.area,
      taluk: f.taluk, pincode: f.pincode, district: f.district, state: f.state,
    }
    const address = [f.doorNo, f.street, f.area, f.taluk, f.district, f.state, f.pincode].filter(Boolean).join(', ')
    const phoneOk = /^\d{10}$/.test(String(f.customerPhone || '').replace(/\D/g, '').slice(-10))
    if (!f.customerName || !phoneOk || !f.doorNo || !f.street || !f.area || !f.taluk || !/^\d{6}$/.test(f.pincode || '') || !f.district || !f.state) {
      toast.warning('Please complete your name, mobile number, and every delivery address field.')
      return null
    }
    return { ...f, addressDetails, address }
  }

  const continueToPayment = async () => {
    const details = customerDetails()
    if (!details) return
    if (saveAddress) {
      setBusy('save')
      try {
        await axios.post('/api/addresses', { ...details.addressDetails, id: savedAddressId || undefined })
      } catch {
        toast.error('Could not save this address.')
        setBusy('')
        return
      }
      setBusy('')
    }
    setStep('payment')
  }

  // Cash on delivery: no payment gateway, the order is recorded straight away.
  const placeCodOrder = async () => {
    const details = customerDetails()
    if (!details) return
    setBusy('cod')
    try {
      const { data } = await axios.post('/api/orders', { ...details, items: cart.map(orderLine) })
      if (!data?.success) throw new Error(data?.message)
      clearGuestCart()
      setCart([])
      announceCount([])
      await saveCart([])
      toast.success('Order placed.', {
        description: (data.whatsapp === 'sent' ? 'We have sent the order and delivery details to your WhatsApp. ' : '') + 'Track it below.',
      })
      navigate('/orders')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to place order. Please try again.')
      setBusy('')
    }
  }

  // Razorpay: the server prices the basket and verifies the signature.
  const payOnline = async () => {
    const details = customerDetails()
    if (!details) return
    if (!window.Razorpay) {
      toast.error('Payment library did not load. Please refresh and try again.')
      return
    }
    setBusy('pay')
    try {
      const { data } = await axios.post('/api/payments/create-order', { items: cart.map(orderLine), customer: details })
      if (!data?.success) throw new Error(data?.message || 'Could not start payment')
      const { razorpayOrderId, amount, currency, keyId } = data.data

      new window.Razorpay({
        key: keyId,
        order_id: razorpayOrderId,
        amount,
        currency,
        name: 'Sathya Bio',
        description: `${cart.length} item(s) — Crop Inputs`,
        // Razorpay only accepts the contact prefill with its country code.
        prefill: { name: details.customerName, contact: '+91' + String(details.customerPhone).replace(/\D/g, '').slice(-10) },
        theme: { color: '#15803d' },
        modal: { ondismiss: () => setBusy('') },
        handler: async response => {
          try {
            const { data: verified } = await axios.post('/api/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            if (!verified?.success) throw new Error(verified?.message || 'Payment verification failed')
            clearGuestCart()
            setCart([])
            announceCount([])
            toast.success('Payment successful. Your order is confirmed.', {
              description: verified.whatsapp === 'sent' ? 'We have sent the order and delivery details to your WhatsApp.' : undefined,
            })
            navigate('/orders')
          } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Payment verification failed')
            setBusy('')
          }
        },
      }).open()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to start payment')
      setBusy('')
    }
  }

  if (!hasSession(user) || !cartReady) {
    return (
      <div className="sb-checkout-page">
        <h1>Your basket</h1>
        <p className="sb-checkout-muted">Loading your basket...</p>
      </div>
    )
  }

  return (
    <div className="sb-checkout-page">
      <a href="/storefront.html" className="sb-checkout-back">← Back to store</a>
      <h1>Your basket</h1>

      {!cart.length ? (
        <div className="checkout-items">
          <div className="empty">Your basket is empty.<br /><br /><a href="/storefront.html">Browse products</a></div>
        </div>
      ) : (
        <>
          <div className="checkout-items">
            {cart.map((item, index) => {
              const id = keyOf(item)
              const qty = Number(item.qty || 1)
              const meta = [item.category, item.selectedPack].filter(Boolean).join(' · ')
              return (
                <div className="checkout-line" key={`${id}-${item.selectedPack || ''}-${index}`}>
                  <div className="checkout-line-thumb">
                    <img
                      src={thumbnailOf(item)}
                      alt=""
                      loading="lazy"
                      onError={event => {
                        if (!event.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) event.currentTarget.src = PLACEHOLDER_IMAGE
                      }}
                    />
                  </div>
                  <div className="checkout-line-body">
                    <div className="checkout-line-name">{item.name || 'Item'}</div>
                    {meta && <div className="checkout-line-meta">{meta}</div>}
                  </div>
                  <div className="qty">
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQty(id, qty - 1)}>−</button>
                    <span>{qty}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => setQty(id, qty + 1)}>+</button>
                  </div>
                  <strong>{rupees(Number(item.price || 0) * qty)}</strong>
                  <button type="button" className="link-btn" aria-label={`Remove ${item.name || 'item'}`} onClick={() => setQty(id, 0)}>Remove</button>
                </div>
              )
            })}
          </div>

          <div className="totals">
            <div><span>Subtotal</span><span>{rupees(totals.subtotal)}</span></div>
            <div><span>GST (18%)</span><span>{rupees(totals.gst)}</span></div>
            <div><span>Delivery</span><span className="totals-free">FREE</span></div>
            <div className="grand"><span>Total</span><span>{rupees(totals.total)}</span></div>
          </div>

          <form className="checkout-form" onSubmit={event => event.preventDefault()}>
            {step === 'address' ? (
              <section className="checkout-step">
                <div className="checkout-step-heading">
                  <span>1</span>
                  <div><h2>Delivery details</h2><p>Choose a saved address or add a new one.</p></div>
                </div>
                <select className="saved-address-select" aria-label="Saved addresses" value={savedAddressId} onChange={event => chooseSavedAddress(event.target.value)}>
                  <option value="">Add a new address</option>
                  {savedAddresses.map(address => (
                    <option key={address.id} value={address.id}>
                      {`${address.label || 'Address'} — ${address.doorNo}, ${address.area}, ${address.pincode}`}
                    </option>
                  ))}
                </select>
                <div className="address-labels">
                  {ADDRESS_LABELS.map(label => (
                    <label key={label}>
                      <input type="radio" name="addressLabel" value={label} checked={fields.addressLabel === label} onChange={updateField} /> {label}
                    </label>
                  ))}
                </div>
                <div className="checkout-fields-grid">
                  <input name="customerName" placeholder="Full name" autoComplete="name" required value={fields.customerName} onChange={updateField} />
                  <input name="customerPhone" placeholder="Mobile number" type="tel" autoComplete="tel" required value={fields.customerPhone} onChange={updateField} />
                  <input name="doorNo" placeholder="Door no. / house no." required value={fields.doorNo} onChange={updateField} />
                  <input name="street" placeholder="Street / road" autoComplete="address-line1" required value={fields.street} onChange={updateField} />
                  <input name="area" placeholder="Area / village" autoComplete="address-line2" required value={fields.area} onChange={updateField} />
                  <input name="taluk" placeholder="Taluk" required value={fields.taluk} onChange={updateField} />
                  <input name="pincode" placeholder="PIN code" inputMode="numeric" maxLength={6} autoComplete="postal-code" required value={fields.pincode} onChange={updateField} />
                  <input name="district" placeholder="District" required value={fields.district} onChange={updateField} />
                  <select name="state" required aria-label="State" value={fields.state} onChange={updateField}>
                    <option value="">Select state</option>
                    {STATES.map(state => <option key={state}>{state}</option>)}
                  </select>
                </div>
                <label className="save-address-check">
                  <input type="checkbox" checked={saveAddress} onChange={event => setSaveAddress(event.target.checked)} /> Save this address for future orders
                </label>
                <button type="button" className="primary checkout-next-btn" disabled={busy === 'save'} onClick={continueToPayment}>
                  Continue to payment
                </button>
              </section>
            ) : (
              <section className="checkout-step" ref={paymentStepRef}>
                <div className="checkout-step-heading">
                  <span>2</span>
                  <div><h2>Choose payment</h2><p>Review your address, then complete the order.</p></div>
                </div>
                <div className="selected-address-summary">
                  {`${fields.addressLabel || 'Home'}: ${[fields.doorNo, fields.street, fields.area, fields.taluk, fields.district, fields.state, fields.pincode].filter(Boolean).join(', ')}`}
                </div>
                <div className="checkout-actions">
                  <button type="button" className="secondary edit-address-btn" disabled={Boolean(busy)} onClick={() => setStep('address')}>Edit address</button>
                  <button type="button" className="secondary cod-btn" disabled={Boolean(busy)} onClick={placeCodOrder}>Cash on Delivery</button>
                  <button type="button" className="primary pay-btn" disabled={Boolean(busy)} onClick={payOnline}>
                    <i className="fa-solid fa-lock" aria-hidden="true"></i> Pay online (UPI / Card)
                  </button>
                </div>
              </section>
            )}
            <p className="pay-note">Online payments are processed by Razorpay. The amount is calculated on our server, so it can never be changed in the browser.</p>
          </form>
        </>
      )}
    </div>
  )
}
