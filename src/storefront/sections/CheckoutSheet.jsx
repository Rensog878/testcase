import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useCheckout, useCheckoutActions } from '../../hooks/useCheckout'
import { ADDRESS_LABELS, CHECKOUT_STEPS, STATES } from '../../hooks/checkoutRules'
import { productImage, rupees, useFallbackImage } from '../data'
import { showToast } from '../toast'
import useSwipeToDismiss from '../useSwipeToDismiss'

// Checkout is open for Cash on Delivery only. Online payment (Razorpay) is
// Phase 2 work: its payment option is kept below, commented out.

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

function Field({ name, label, wide, value, problem, onChange, ...inputProps }) {
  const id = `co-${name}`
  return (
    <div className={`co-field${wide ? ' co-field--wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        className="co-input"
        value={value}
        onChange={event => onChange(name, event.target.value)}
        aria-invalid={problem ? 'true' : undefined}
        aria-describedby={problem ? `${id}-error` : undefined}
        {...inputProps}
      />
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

function AddressForm({ fields, errors, saveAddress, busy, actions, field }) {
  return (
    <div className="co-form">
      <div className="co-chips" role="radiogroup" aria-label="Address type">
        {ADDRESS_LABELS.map(label => (
          <label key={label} className={`co-chip${fields.addressLabel === label ? ' is-selected' : ''}`}>
            <input type="radio" name="coAddressLabel" value={label} checked={fields.addressLabel === label} disabled={busy} onChange={() => actions.setField('addressLabel', label)} />
            {label}
          </label>
        ))}
      </div>
      <div className="co-grid">
        {field('doorNo', 'Door no. / house no.', { enterKeyHint: 'next' })}
        {field('pincode', 'PIN code', { inputMode: 'numeric', autoComplete: 'postal-code', enterKeyHint: 'next' })}
        {field('street', 'Street / road', { wide: true, autoComplete: 'address-line1', enterKeyHint: 'next' })}
        {field('area', 'Area / village', { wide: true, autoComplete: 'address-line2', enterKeyHint: 'next' })}
        {field('taluk', 'Taluk', { enterKeyHint: 'next' })}
        {field('district', 'District', { enterKeyHint: 'next' })}
        <div className="co-field co-field--wide">
          <label htmlFor="co-state">State</label>
          <select
            id="co-state"
            name="state"
            className="co-input"
            value={fields.state}
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
      <section className="co-group" aria-labelledby="coContactTitle">
        <h3 id="coContactTitle" className="co-group-title">Contact details</h3>
        <div className="co-grid">
          {field('customerName', 'Full name', { wide: true, autoComplete: 'name', autoCapitalize: 'words', enterKeyHint: 'next' })}
          {field('customerPhone', 'Mobile number', { wide: true, type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 16, enterKeyHint: 'next' })}
        </div>
      </section>

      <section className="co-group" aria-labelledby="coAddressTitle">
        <h3 id="coAddressTitle" className="co-group-title">Deliver to</h3>
        <p className="co-lead">Choose a saved address or add a new one.</p>
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
                    <span className="co-card-label">{address.label || 'Home'}</span>
                    <span className="co-card-line notranslate">{[address.doorNo, address.area].filter(Boolean).join(', ')}</span>
                    <span className="co-card-sub"><span>PIN code</span> <span className="notranslate">{address.pincode}</span></span>
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

function PaymentStep({ checkout, actions }) {
  const { cart, count, draft } = checkout
  const busy = Boolean(checkout.busy)
  const f = draft.fields
  const phone = String(f.customerPhone || '').replace(/\D/g, '').slice(-10)
  const address = [f.doorNo, f.street, f.area, f.taluk, f.district, f.state, f.pincode].filter(Boolean).join(', ')
  const chosen = 'cod' // Phase 2: draft.payment, once online payment is offered again
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
        <p className="co-summary-line notranslate"><strong>{f.customerName}</strong> · +91 {phone.slice(0, 5)} {phone.slice(5)}</p>
        <p className="co-summary-line">
          <span className="co-card-label">{f.addressLabel || 'Home'}</span> <span className="notranslate">{address}</span>
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

      <section className="co-group" aria-labelledby="coPayTitle">
        <h3 id="coPayTitle" className="co-sr">Choose payment</h3>
        <div className="co-cards" role="radiogroup" aria-labelledby="coPayTitle">
          {option('cod', 'fa-money-bill-wave', 'Cash on Delivery', 'Pay when your order arrives')}
          {/* Phase 2: {option('online', 'fa-shield-halved', 'Pay online (UPI / Card)', 'UPI, cards and net banking via Razorpay')} */}
        </div>
        <p className="co-note">
          <i className="fa-solid fa-lock" aria-hidden="true"></i>
          <span>Pay in cash when your order arrives. The amount is calculated on our server, so it can never be changed in the browser.</span>
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
          <div className="cart-summary-row"><span>GST (18%)</span><span>{rupees(totals.gst)}</span></div>
          <div className="cart-summary-row"><span>Delivery</span><span className="cart-free">FREE</span></div>
          <div className="cart-summary-row grand-total"><span>Total</span><span>{rupees(totals.total)}</span></div>
        </div>
        <button type="button" className="btn btn-primary co-main" id="checkoutBtn" onClick={actions.startCheckout}>
          <span><i className="fa-solid fa-lock" aria-hidden="true"></i> Checkout</span>
          <span className="cart-checkout-amount">{rupees(totals.total)}</span>
        </button>
        <p className="cart-secure-note"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i> Cash on delivery · pay when your order arrives</p>
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
  const online = false // Cash on Delivery only until online payment returns (Phase 2)
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
          <span className="co-part"><span>GST (18%)</span> <b>{rupees(totals.gst)}</b></span>
          <span className="co-dot" aria-hidden="true"></span>
          <span className="co-part"><span>Delivery</span> <b className="cart-free">FREE</b></span>
        </p>
        <p className="co-total-grand"><span>Total</span><strong>{rupees(totals.total)}</strong></p>
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
