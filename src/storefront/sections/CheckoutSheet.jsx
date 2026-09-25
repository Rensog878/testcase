import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useCheckout, useCheckoutActions } from '../../hooks/useCheckout'
import { ADDRESS_LABELS, CHECKOUT_STEPS, CUSTOM_LABEL_MAX, addressEmoji, REQUIRED_DETAILS, STATES } from '../../hooks/checkoutRules'
import { productImage, rupees, useFallbackImage } from '../data'
import { showToast } from '../toast'
import useSwipeToDismiss from '../useSwipeToDismiss'
import VoiceButton from './VoiceButton'
import { addressAt, currentPosition, locationSupported } from '../location'

// The floating checkout: Basket → Delivery details → Payment → Order
// confirmed, in one popup over whichever store page the customer is on
// (drawn once by StorePopups.jsx). What it does - the basket, addresses,
// checks, placing the order, paying - is all in hooks/useCheckout.js; this
// file draws it. Styles: storefront.css, "7l. FLOATING CHECKOUT"; step 1
// keeps the basket card design ("7e").

const STEP_LABELS = { basket: 'Basket', address: 'Address', payment: 'Payment', done: 'Done' }
const STEP_TITLES = { basket: 'Your Basket', address: 'Delivery details', payment: 'Choose payment', done: 'Order confirmed' }
const STEP_ICONS = { basket: 'fa-bag-shopping', address: 'fa-location-dot', payment: 'fa-wallet', done: 'fa-circle-check' }
const PROBLEM_TEXT = {
  required: 'This field is required.',
  phone: 'Enter a 10-digit mobile number.',
  pincode: 'Enter a 6-digit PIN code.',
  state: 'Choose a state.',
}
const BUSY_TEXT = {
  save: 'Saving address...',
  cod: 'Placing your order...',
  pay: 'Opening secure payment...',
  verify: 'Confirming your payment...',
}

// An address label with its emoji: 🏠 Home, 🏢 Office, 🚜 Farm. The emoji is
// decoration (hidden from screen readers) and its own node, so the page
// translator still sees the plain word.
const AddressLabel = ({ label }) => <><span className="co-emoji" aria-hidden="true">{addressEmoji(label)}</span>{label}</>

// "CGST 9%": half the GST rate, when the basket has one rate. One text node
// (tax names are not translated), styled like the other row labels.
const taxLabel = (name, rate) => (rate !== null ? `${name} ${+(rate / 2).toFixed(2)}%` : name)

const Spinner = ({ label }) => <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> {label}</>

const itemsLabel = count => `${count} ${count === 1 ? 'item' : 'items'}`

// The server sends the day as YYYY-MM-DD (India time); shown as that same day.
function deliveryDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number)
  const date = year && month && day ? new Date(year, month - 1, day) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
}

function FieldError({ id, problem }) {
  if (!problem) return null
  return <small id={`${id}-error`} className="co-error"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {PROBLEM_TEXT[problem]}</small>
}

// The * after a required field's label. Screen readers hear "required" from
// the input's aria-required instead, so the symbol itself is hidden from them.
const RequiredMark = () => <span className="co-req" aria-hidden="true">*</span>
const isRequired = name => REQUIRED_DETAILS.includes(name)
// How each field listens (VoiceButton): the address in English so the courier
// can read it, names in the site's language. Number fields have no mic.
const VOICE_MODE = { customerName: 'text', addressName: 'text', addressLabel: 'text', doorNo: 'latin', street: 'latin', area: 'latin', taluk: 'latin', district: 'latin' }

function Field({ name, label, wide, value, problem, onChange, ...inputProps }) {
  const id = `co-${name}`
  const required = isRequired(name)
  return (
    <div className={`co-field${wide ? ' co-field--wide' : ''}`}>
      <label htmlFor={id}>{label}{required && <RequiredMark />}</label>
      <div className={VOICE_MODE[name] ? 'sb-voice-wrap has-voice' : 'sb-voice-wrap'}>
        <input
          id={id}
          name={name}
          className="co-input"
          value={value}
          aria-required={required || undefined}
          onChange={event => onChange(name, event.target.value)}
          aria-invalid={problem ? 'true' : undefined}
          aria-describedby={problem ? `${id}-error` : undefined}
          {...inputProps}
        />
        {VOICE_MODE[name] && <VoiceButton htmlFor={id} mode={VOICE_MODE[name]} disabled={inputProps.disabled} />}
      </div>
      <FieldError id={id} problem={problem} />
    </div>
  )
}

// NOT RENDERED YET, AND IT MUST NOT BE until the server applies the discount.
// /api/orders and /api/payments/create-order both price the basket themselves
// (priceCart) and know nothing about coupons, so showing this box would take a
// code, show the shopper a lower total, and then charge them the full amount.
// Finishing it means applying the validated coupon inside priceCart, on the
// server, and storing the code on the order - not passing a discount up from
// here, which anyone could edit.
function CouponBox({ subtotal, onApplyCoupon, appliedCoupon, onRemoveCoupon }) {
  const [couponCode, setCouponCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleApply = async () => {
    if (!couponCode.trim()) return
    setLoading(true)
    try {
      const { data } = await axios.post('/api/coupons/validate', {
        code: couponCode,
        cartTotal: subtotal
      })
      if (data.success && data.data) {
        onApplyCoupon(data.data)
        showToast(data.message, 'success')
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid coupon code', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (appliedCoupon) {
    return (
      <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 700, color: '#34d399', fontSize: '0.88rem' }}>🎟️ {appliedCoupon.code} Applied</span>
          <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Discount: {rupees(appliedCoupon.discount)}</small>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onRemoveCoupon} style={{ padding: '2px 8px', fontSize: '0.8rem', color: '#ef4444' }}>Remove</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
      <input
        type="text"
        placeholder="Coupon Code (e.g. SATHYA10)"
        value={couponCode}
        onChange={e => setCouponCode(e.target.value.toUpperCase())}
        style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
      />
      <button
        type="button"
        className="btn btn-outline"
        onClick={handleApply}
        disabled={loading || !couponCode.trim()}
        style={{ fontSize: '0.82rem', padding: '6px 12px' }}
      >
        {loading ? 'Applying...' : 'Apply'}
      </button>
    </div>
  )
}

function BasketStep({ cart, cartReady, actions }) {
  if (!cart.length && !cartReady) {
    return <p className="co-loading"><Spinner label="Loading your basket..." /></p>
  }
  if (!cart.length) {
    return (
      <div className="cart-empty">
        <div className="cart-empty-icon"><i className="fa-solid fa-basket-shopping" aria-hidden="true"></i></div>
        <h4>Your basket is empty</h4>
        <p>Add crop protection products to get started.</p>
        <button type="button" className="btn btn-primary" onClick={actions.browseProducts}>Browse products</button>
      </div>
    )
  }
  return (
    <div className="cart-items-container">
      {cart.map((item, idx) => (
        <div className="cart-item" key={`${item.id}-${item.selectedPack || ''}-${idx}`}>
          <div className="cart-item-thumb"><img loading="lazy" decoding="async" src={productImage(item)} alt={item.name} onError={useFallbackImage} /></div>
          <div className="cart-item-body">
            <h4 className="cart-item-name">{item.name}</h4>
            <div className="cart-item-meta">
              {item.selectedPack && <span className="cart-item-pack">{item.selectedPack}</span>}
              {item.hsnCode && <span className="badge badge-blue" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>HSN: {item.hsnCode}</span>}
              <span>{rupees(item.price)} each</span>
            </div>
            <div className="cart-item-foot">
              <div className="cart-stepper" role="group" aria-label="Quantity">
                <button type="button" onClick={() => actions.updateQty(idx, -1)} aria-label={item.qty <= 1 ? 'Remove item' : 'Decrease quantity'}>
                  <i className={`fa-solid ${item.qty <= 1 ? 'fa-trash-can' : 'fa-minus'}`}></i>
                </button>
                <span>{item.qty}</span>
                <button type="button" onClick={() => actions.updateQty(idx, 1)} aria-label="Increase quantity"><i className="fa-solid fa-plus"></i></button>
              </div>
              <strong className="cart-item-total">{rupees(item.price * item.qty)}</strong>
            </div>
          </div>
          <button type="button" className="cart-item-remove" onClick={() => actions.removeLine(idx)} aria-label="Remove from basket"><i className="fa-solid fa-xmark"></i></button>
        </div>
      ))}
    </div>
  )
}

// "Use my current location": the GPS point goes on the address (and the
// order), and the address found there fills the fields. The door number is
// never guessed, and a street already typed is kept. Styles: storefront.css 7o.
function LocateButton({ fields, busy, actions }) {
  const [status, setStatus] = useState('') // '' | 'gps' | 'lookup'
  const [problem, setProblem] = useState('')
  if (!locationSupported) return null
  const working = Boolean(status)

  const locate = async () => {
    if (working) return
    setProblem('')
    setStatus('gps')
    try {
      const point = await currentPosition()
      actions.setField('geo', point)
      setStatus('lookup')
      const found = await addressAt(point)
      Object.entries(found).forEach(([key, value]) => {
        if (key === 'street' && String(fields.street || '').trim()) return
        actions.setField(key, value)
      })
      if (Object.keys(found).length) showToast('Address filled from your location. Please check it and add your door number.', 'success')
      else showToast('Location saved. Please type your address below.', 'info')
      requestAnimationFrame(() => document.getElementById('co-doorNo')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
    } catch (err) {
      setProblem(err.message)
    } finally {
      setStatus('')
    }
  }

  const geo = fields.geo
  return (
    <div className="co-locate">
      {geo && !working ? (
        <div className="co-locate-done" role="status">
          <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
          <span className="co-locate-text">
            <strong>Location added</strong>
            {Number.isFinite(geo.accuracy) && <span className="co-locate-sub"> Accurate to about <span className="notranslate">{geo.accuracy} m</span></span>}
          </span>
          <button type="button" className="co-link" disabled={busy} onClick={locate}>Update</button>
          <button type="button" className="co-link" disabled={busy} onClick={() => actions.setField('geo', null)}>Remove</button>
        </div>
      ) : (
        <button type="button" className="co-locate-btn" disabled={busy || working} onClick={locate} aria-busy={working || undefined}>
          <i className={`fa-solid ${working ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`} aria-hidden="true"></i>
          <span className="co-locate-text">
            <strong>{status === 'gps' ? 'Finding your location...' : status === 'lookup' ? 'Getting your address...' : 'Use my current location'}</strong>
            {!working && <span className="co-locate-sub">Fills your address from GPS and helps our delivery team find you</span>}
          </span>
        </button>
      )}
      {problem && <p className="co-locate-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {problem}</p>}
    </div>
  )
}

function AddressForm({ fields, errors, saveAddress, busy, actions, field }) {
  // The heading is always a text box the customer can change; Home, Office and
  // Farm are one-tap fills for it. Anything else typed is a custom heading.
  const heading = String(fields.addressLabel || '').trim()
  return (
    <div className="co-form">
      <div className="co-grid co-grid--single">
        {field('addressLabel', 'Address heading', { wide: true, maxLength: CUSTOM_LABEL_MAX, placeholder: 'e.g. Home, Godown, Uncle’s house', enterKeyHint: 'next', 'aria-describedby': errors.addressLabel ? 'co-addressLabel-error' : 'coLabelHint' })}
      </div>
      <p className="co-form-hint" id="coLabelHint">Type any name, or tap one:</p>
      <div className="co-chips" role="group" aria-label="Quick headings">
        {ADDRESS_LABELS.map(label => {
          const on = heading.toLowerCase() === label.toLowerCase()
          return (
            <button type="button" key={label} className={`co-chip${on ? ' is-selected' : ''}`} aria-pressed={on} disabled={busy} onClick={() => actions.setField('addressLabel', label)}>
              <AddressLabel label={label} />
            </button>
          )
        })}
      </div>
      <LocateButton fields={fields} busy={busy} actions={actions} />
      <div className="co-grid">
        {field('addressName', 'Name of person at this address', { wide: true, autoComplete: 'name', autoCapitalize: 'words', enterKeyHint: 'next' })}
        {field('addressPhone', 'Mobile number at this address', { wide: true, type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 16, enterKeyHint: 'next' })}
        {field('doorNo', 'Door no. / house no.', { enterKeyHint: 'next' })}
        {field('pincode', 'PIN code', { inputMode: 'numeric', autoComplete: 'postal-code', enterKeyHint: 'next' })}
        {field('street', 'Street / road', { wide: true, autoComplete: 'address-line1', enterKeyHint: 'next' })}
        {field('area', 'Area / village', { wide: true, autoComplete: 'address-line2', enterKeyHint: 'next' })}
        {field('taluk', 'Taluk', { enterKeyHint: 'next' })}
        {field('district', 'District', { enterKeyHint: 'next' })}
        <div className="co-field co-field--wide">
          <label htmlFor="co-state">State<RequiredMark /></label>
          <select
            id="co-state"
            name="state"
            className="co-input"
            value={fields.state}
            aria-required="true"
            disabled={busy}
            onChange={event => actions.setField('state', event.target.value)}
            aria-invalid={errors.state ? 'true' : undefined}
            aria-describedby={errors.state ? 'co-state-error' : undefined}
          >
            <option value="">Select state</option>
            {STATES.map(state => <option key={state} value={state}>{state}</option>)}
          </select>
          <FieldError id="co-state" problem={errors.state} />
        </div>
      </div>
      <label className="co-check">
        <input type="checkbox" checked={saveAddress} disabled={busy} onChange={event => actions.setSaveAddress(event.target.checked)} />
        <span>Save this address for future orders</span>
      </label>
    </div>
  )
}

function AddressStep({ checkout, actions }) {
  const { addresses, draft, errors } = checkout
  const busy = Boolean(checkout.busy)
  const fields = draft.fields
  const field = (name, label, props = {}) => (
    <Field name={name} label={label} value={fields[name]} problem={errors[name]} onChange={actions.setField} disabled={busy} {...props} />
  )
  const selectedId = draft.mode === 'saved' || draft.mode === 'edit' ? draft.addressId : ''
  const formOpen = draft.mode === 'new' || draft.mode === 'edit' || (addresses !== null && !addresses.length)

  return (
    <>
      <section className="co-group" aria-labelledby="coAddressTitle">
        <h3 id="coAddressTitle" className="co-group-title">Deliver to</h3>
        <p className="co-lead">Choose a saved address or add a new one.</p>
        {formOpen && <p className="co-req-key"><RequiredMark /> <span>Required</span></p>}
        {addresses === null ? (
          <div className="co-cards">
            <span className="co-sr" role="status">Loading your addresses...</span>
            <div className="co-skeleton" aria-hidden="true"></div>
            <div className="co-skeleton" aria-hidden="true"></div>
          </div>
        ) : (
          <div className="co-cards" role="radiogroup" aria-labelledby="coAddressTitle">
            {[...addresses].reverse().map(address => {
              const selected = address.id === selectedId
              return (
                <label key={address.id} className={`co-card${selected ? ' is-selected' : ''}`}>
                  <input type="radio" name="coAddress" value={address.id} checked={selected} disabled={busy} onChange={() => actions.chooseAddress(address.id)} />
                  <span className="co-card-mark" aria-hidden="true"></span>
                  <span className="co-card-body">
                    <span className="co-card-label"><AddressLabel label={address.label || 'Home'} /></span>
                    <span className="co-card-line notranslate">{[address.doorNo, address.area].filter(Boolean).join(', ')}</span>
                    <span className="co-card-sub"><span>PIN code</span> <span className="notranslate">{address.pincode}</span></span>
                    {(address.name || address.phone) && (
                      <span className="co-card-sub"><i className="fa-solid fa-user" aria-hidden="true"></i> <span className="notranslate">{[address.name, address.phone && `+91 ${address.phone.slice(0, 5)} ${address.phone.slice(5)}`].filter(Boolean).join(' · ')}</span></span>
                    )}
                  </span>
                </label>
              )
            })}
            <label className={`co-card co-card--new${draft.mode === 'new' ? ' is-selected' : ''}`}>
              <input type="radio" name="coAddress" value="new" checked={draft.mode === 'new'} disabled={busy} onChange={actions.addNewAddress} />
              <span className="co-card-plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span>
              <span className="co-card-body"><span className="co-card-title">Add a new address</span></span>
            </label>
          </div>
        )}
        {draft.mode === 'saved' && selectedId && (
          <button type="button" className="co-link" disabled={busy} onClick={actions.editAddress}>
            <i className="fa-solid fa-pen" aria-hidden="true"></i> Edit address
          </button>
        )}
        {formOpen && <AddressForm fields={fields} errors={errors} saveAddress={draft.saveAddress} busy={busy} actions={actions} field={field} />}
      </section>
    </>
  )
}

// Refer & Earn at checkout: the welcome offer applies by itself; points only
// when the farmer ticks the box. The amounts come from the server.
function RewardsBox({ rewards, usePoints, busy, onUsePoints }) {
  if (!rewards || (!rewards.welcomeDiscount && !rewards.pointsAllowed)) return null
  return (
    <section className="co-group co-rewards" aria-labelledby="coRewardsTitle">
      <h3 id="coRewardsTitle" className="co-group-title"><i className="fa-solid fa-award" aria-hidden="true"></i> Rewards</h3>
      {rewards.welcomeDiscount > 0 && (
        <p className="co-reward-line">
          <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
          <span>Welcome offer applied</span>
          <b className="notranslate">-{rupees(rewards.welcomeDiscount)}</b>
        </p>
      )}
      {rewards.pointsAllowed > 0 && (
        <label className="co-reward-line co-reward-toggle">
          <input type="checkbox" checked={usePoints} disabled={busy} onChange={event => onUsePoints(event.target.checked)} />
          <span>{`Use ${rewards.pointsAllowed} of my ${rewards.balance} points`}</span>
          <b className="notranslate">-{rupees(rewards.pointsAllowed)}</b>
        </label>
      )}
    </section>
  )
}

function PaymentStep({ checkout, actions }) {
  const { cart, count, draft } = checkout
  const busy = Boolean(checkout.busy)
  const f = draft.fields
  const addressPhone = String(f.addressPhone || '').replace(/\D/g, '').slice(-10)
  const receiver = String(f.addressName || '').trim() || f.customerName
  const address = [f.doorNo, f.street, f.area, f.taluk, f.district, f.state, f.pincode].filter(Boolean).join(', ')
  const chosen = draft.payment === 'online' ? 'online' : 'cod'
  const option = (value, icon, title, sub) => (
    <label className={`co-card co-pay${chosen === value ? ' is-selected' : ''}`}>
      <input type="radio" name="coPayment" value={value} checked={chosen === value} disabled={busy} onChange={() => actions.setPayment(value)} />
      <span className="co-card-mark" aria-hidden="true"></span>
      <span className="co-card-body">
        <span className="co-card-title">{title}</span>
        <span className="co-card-sub">{sub}</span>
      </span>
      <span className="co-pay-icon" aria-hidden="true"><i className={`fa-solid ${icon}`}></i></span>
    </label>
  )

  return (
    <>
      <p className="co-lead">Review your address, then complete the order.</p>
      <section className="co-group co-summary" aria-labelledby="coDeliverTitle">
        <div className="co-summary-head">
          <h3 id="coDeliverTitle" className="co-group-title"><i className="fa-solid fa-location-dot" aria-hidden="true"></i> Deliver to</h3>
          <button type="button" className="co-link" disabled={busy} onClick={actions.back}>Change</button>
        </div>
        <p className="co-summary-line notranslate"><strong>{receiver}</strong> · +91 {addressPhone.slice(0, 5)} {addressPhone.slice(5)}</p>
        <p className="co-summary-line">
          <span className="co-card-label"><AddressLabel label={f.addressLabel || 'Home'} /></span> <span className="notranslate">{address}</span>
        </p>
      </section>

      <div className="co-mini">
        {cart.slice(0, 4).map((item, index) => (
          <span className="co-mini-thumb" key={`${item.id}-${item.selectedPack || ''}-${index}`}>
            <img src={productImage(item)} alt="" loading="lazy" decoding="async" onError={useFallbackImage} />
          </span>
        ))}
        {cart.length > 4 && <span className="co-mini-more notranslate">+{cart.length - 4}</span>}
        <span className="co-mini-count">{itemsLabel(count)}</span>
      </div>

      <RewardsBox rewards={checkout.rewards} usePoints={draft.usePoints === true} busy={busy} onUsePoints={actions.setUsePoints} />

      <section className="co-group" aria-labelledby="coPayTitle">
        <h3 id="coPayTitle" className="co-sr">Choose payment</h3>
        <div className="co-cards" role="radiogroup" aria-labelledby="coPayTitle">
          {option('cod', 'fa-money-bill-wave', 'Cash on Delivery', 'Pay when your order arrives')}
          {option('online', 'fa-shield-halved', 'Pay online (UPI / Card)', 'UPI, cards and net banking via Razorpay')}
        </div>
        <p className="co-note">
          <i className="fa-solid fa-lock" aria-hidden="true"></i>
          <span>{chosen === 'online' ? 'Online payments are processed by Razorpay. The amount is calculated on our server, so it can never be changed in the browser.' : 'Pay in cash when your order arrives. The amount is calculated on our server, so it can never be changed in the browser.'}</span>
        </p>
      </section>
    </>
  )
}

function DoneStep({ order }) {
  if (!order) return null
  const date = deliveryDate(order.expectedDeliveryDate)
  return (
    <div className="co-done">
      <div className="co-done-badge" aria-hidden="true"><i className="fa-solid fa-check"></i></div>
      <p className="co-done-lead">Thank you! Your order has been placed.</p>
      <dl className="co-facts">
        <div><dt>Order number</dt><dd className="notranslate">{order.id}</dd></div>
        <div><dt>{order.paid ? 'Amount paid' : 'Amount to pay on delivery'}</dt><dd>{rupees(order.total)}</dd></div>
        <div><dt>Payment</dt><dd>{order.paid ? 'Paid online' : 'Cash on Delivery'}</dd></div>
        {date && <div><dt>Expected delivery</dt><dd className="notranslate">{date}</dd></div>}
      </dl>
      {order.whatsapp && (
        <p className="co-done-note">
          <i className="fa-brands fa-whatsapp" aria-hidden="true"></i>
          <span>We have sent the order and delivery details to your WhatsApp.</span>
        </p>
      )}
    </div>
  )
}

function SheetFooter({ step, checkout, actions }) {
  const { cart, totals, busy, draft } = checkout
  if (step === 'basket') {
    if (!cart.length) return null
    return (
      <div className="cart-footer co-foot">
        <div className="cart-summary">
          <div className="cart-summary-row"><span>Subtotal</span><span>{rupees(totals.subtotal)}</span></div>
          <div className="cart-summary-row"><span className="notranslate">{taxLabel('CGST', totals.gstRate)}</span><span>{rupees(totals.cgst)}</span></div>
          <div className="cart-summary-row"><span className="notranslate">{taxLabel('SGST', totals.gstRate)}</span><span>{rupees(totals.sgst)}</span></div>
          <div className="cart-summary-row"><span>Delivery</span><span className="cart-free">FREE</span></div>
          <div className="cart-summary-row grand-total"><span>Total</span><span>{rupees(totals.total)}</span></div>
        </div>
        <button type="button" className="btn btn-primary co-main" id="checkoutBtn" onClick={actions.startCheckout}>
          <span><i className="fa-solid fa-lock" aria-hidden="true"></i> Checkout</span>
          <span className="cart-checkout-amount">{rupees(totals.total)}</span>
        </button>
        <p className="cart-secure-note"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i> Secure payment · UPI, cards or cash on delivery</p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="cart-footer co-foot">
        <button type="button" className="btn btn-primary co-main co-main--center" onClick={actions.trackOrder}>
          <i className="fa-solid fa-truck-fast" aria-hidden="true"></i> Track order
        </button>
        <button type="button" className="btn btn-outline co-secondary" onClick={() => actions.closeCheckout()}>Continue shopping</button>
      </div>
    )
  }

  const paying = step === 'payment'
  const online = draft.payment === 'online'
  // Only the payment step knows the farmer's rewards (asked from the server).
  const discount = paying ? Number(checkout.rewards?.discount) || 0 : 0
  let label
  if (busy) label = <Spinner label={BUSY_TEXT[busy]} />
  else if (!paying) label = <><span>Continue to payment</span><i className="fa-solid fa-arrow-right" aria-hidden="true"></i></>
  else label = <><i className={`fa-solid ${online ? 'fa-lock' : 'fa-circle-check'}`} aria-hidden="true"></i> {online ? 'Pay securely' : 'Place order'}</>

  return (
    <div className="cart-footer co-foot">
      <div className="co-total">
        <p className="co-total-parts">
          <span className="co-part"><span>Subtotal</span> <b>{rupees(totals.subtotal)}</b></span>
          <span className="co-dot" aria-hidden="true"></span>
          <span className="co-part"><span className="notranslate">{taxLabel('CGST', totals.gstRate)}</span> <b>{rupees(totals.cgst)}</b></span>
          <span className="co-dot" aria-hidden="true"></span>
          <span className="co-part"><span className="notranslate">{taxLabel('SGST', totals.gstRate)}</span> <b>{rupees(totals.sgst)}</b></span>
          <span className="co-dot" aria-hidden="true"></span>
          <span className="co-part"><span>Delivery</span> <b className="cart-free">FREE</b></span>
          {discount > 0 && (
            <>
              <span className="co-dot" aria-hidden="true"></span>
              <span className="co-part co-part--save"><span>Rewards</span> <b>-{rupees(discount)}</b></span>
            </>
          )}
        </p>
        <p className="co-total-grand"><span>Total</span><strong>{rupees(discount > 0 ? checkout.rewards.payable : totals.total)}</strong></p>
      </div>
      <button
        type="button"
        className={`btn btn-primary co-main${paying || busy ? ' co-main--center' : ''}`}
        disabled={Boolean(busy)}
        aria-busy={busy ? 'true' : undefined}
        onClick={paying ? actions.placeOrder : actions.continueToPayment}
      >
        {label}
      </button>
    </div>
  )
}

export default function CheckoutSheet() {
  const checkout = useCheckout()
  const actions = useCheckoutActions()
  const { shown, direction, modals, cart, cartReady, count, busy } = checkout
  const state = modals.checkout
  const panelRef = useRef(null)
  const bodyRef = useRef(null)
  const rendered = useRef(false)
  useSwipeToDismiss(panelRef, () => actions.closeCheckout(), () => bodyRef.current)

  // Each step starts at the top with its heading focused: screen readers
  // announce it, and a phone keyboard left open by the address form closes.
  // The sign-in card, when open on top, keeps the focus.
  const isOpen = state === 'open'
  useEffect(() => {
    if (!isOpen || !shown) return
    bodyRef.current?.scrollTo(0, 0)
    if (document.querySelector('#authModal.active, #authModal.is-opening')) return
    const title = document.getElementById('coTitle')
    title?.focus({ preventScroll: true })
    // The browser can refuse while the popup is still becoming visible; once more on the next frame.
    if (title && document.activeElement !== title) requestAnimationFrame(() => title.focus({ preventScroll: true }))
  }, [isOpen, shown])

  const className = ['co-overlay', state === 'opening' && 'is-opening', state === 'open' && 'active'].filter(Boolean).join(' ')
  // Nothing inside until it first opens (no basket images loading unseen).
  if (state) rendered.current = true
  if (!rendered.current) return <div id="checkoutSheet" className={className}></div>

  const current = shown || 'basket'
  const stepIndex = CHECKOUT_STEPS.indexOf(current)
  const busyNow = Boolean(busy)

  return (
    <div id="checkoutSheet" className={className} onClick={event => { if (event.target === event.currentTarget) actions.closeCheckout() }}>
      <div ref={panelRef} className="co-panel" role="dialog" aria-modal="true" aria-labelledby="coTitle">
        <div className="cart-header co-head">
          {(current === 'address' || current === 'payment') && (
            <button type="button" className="co-icon-btn" disabled={busyNow} onClick={actions.back} aria-label="Back">
              <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
            </button>
          )}
          <div className="cart-header-title">
            <h2 id="coTitle" className="co-title" tabIndex={-1}>
              <i className={`fa-solid ${STEP_ICONS[current]}`} aria-hidden="true"></i> {STEP_TITLES[current]}
            </h2>
            <span className="cart-header-count">{current === 'basket' ? itemsLabel(count) : `Step ${stepIndex + 1} of ${CHECKOUT_STEPS.length}`}</span>
          </div>
          <button type="button" className="cart-close-btn" disabled={busyNow} onClick={() => actions.closeCheckout()} aria-label="Close checkout">&times;</button>
        </div>

        {!(current === 'basket' && !cart.length) && (
          <ol className="co-steps" aria-label="Checkout steps">
            {CHECKOUT_STEPS.map((name, index) => (
              <li key={name} className={index < stepIndex ? 'is-done' : undefined} aria-current={index === stepIndex ? 'step' : undefined}>
                <span className="co-steps-bar" aria-hidden="true"></span>
                <span className="co-steps-label">{STEP_LABELS[name]}</span>
              </li>
            ))}
          </ol>
        )}

        <div ref={bodyRef} className="co-body">
          <div key={current} className={`co-step co-step--${current}${current === 'basket' && !cart.length ? ' is-empty' : ''}`} data-direction={direction}>
            {current === 'basket' && <BasketStep cart={cart} cartReady={cartReady} actions={actions} />}
            {current === 'address' && <AddressStep checkout={checkout} actions={actions} />}
            {current === 'payment' && <PaymentStep checkout={checkout} actions={actions} />}
            {current === 'done' && <DoneStep order={checkout.order} />}
          </div>
        </div>

        <SheetFooter step={current} checkout={checkout} actions={actions} />
        <p className="co-sr" role="status" aria-live="polite">{busy ? BUSY_TEXT[busy] : ''}</p>
      </div>
    </div>
  )
}
