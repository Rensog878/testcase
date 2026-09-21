// The basket and checkout rules, in one place for the floating checkout
// (useCheckout.js), the storefront, the product pages and the headers. No
// React, browser or network code here, so they run under node --test
// (src/shared/__tests__/checkoutRules.test.js).

export const GUEST_CART_KEY = 'sathya_cart_guest'
// Must match the server's calculation in priceCart() (server/server.js).
export const GST_RATE = 0.18
export const STAFF_HOME = { admin: '/admin', employee: '/employee', delivery: '/delivery', billing: '/billing' }
export const ADDRESS_LABELS = ['Home', 'Office', 'Farm']
// Shown before each address label. An address saved with a label that is not
// one of these (older data) gets the plain pin.
export const ADDRESS_EMOJI = { Home: '🏠', Office: '🏢', Farm: '🚜' }
export const addressEmoji = label => ADDRESS_EMOJI[label] || '📍'
export const STATES = ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Other']
const ADDRESS_KEYS = ['doorNo', 'street', 'area', 'taluk', 'pincode', 'district', 'state']
export const CONTACT_FIELDS = ['customerName', 'customerPhone']

// The pop-up's steps and each one's hash, so the phone's Back button goes back
// one step, a shared link opens the right step and a reload returns to it.
export const CHECKOUT_STEPS = ['basket', 'address', 'payment', 'done']
export const STEP_HASH = { basket: 'basket', address: 'checkout-address', payment: 'checkout-payment', done: 'order-confirmed' }
export const stepForHash = hash => {
  const name = String(hash || '').replace(/^#/, '')
  return CHECKOUT_STEPS.find(step => STEP_HASH[step] === name) || null
}
// Hashes that open the sign-in / account card.
export const AUTH_HASHES = new Set(['login', 'auth', 'account'])
// Hashes the shared popups answer on every store page (not page sections).
export const SHARED_POPUP_HASHES = new Set([...AUTH_HASHES, ...Object.values(STEP_HASH)])

export const keyOf = item => item.id || item._id
const samePack = (a, b) => (a.selectedPack || '') === (b.selectedPack || '')
const sameLine = (a, b) => String(keyOf(a)) === String(keyOf(b)) && samePack(a, b)

// Basket lines always use `qty`. Older builds of the All Products page saved
// `quantity`; without this those lines showed "NaN items" and ₹0.
export const normalizeCart = items => (Array.isArray(items) ? items : [])
  .filter(item => item && typeof item === 'object')
  .map(({ quantity, ...item }) => ({
    ...item,
    qty: Math.max(1, Math.floor(Number(item.qty ?? quantity)) || 1),
    price: Number(item.price) || 0,
  }))

export const itemCount = items => items.reduce((sum, item) => sum + item.qty, 0)

export function cartTotals(items, appliedDiscount = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const rateOf = item => Number(item.gstRate !== undefined ? item.gstRate : 18)
  const gstAmount = items.reduce((sum, item) => sum + (item.price * item.qty * rateOf(item) / 100), 0)

  // GST is split equally into CGST and SGST. SGST takes the rupee rounding
  // leaves, so the two always add up to the GST charged.
  const gst = Math.round(gstAmount)
  const cgst = Math.round(gst / 2)
  const sgst = gst - cgst
  // The rate shown beside them: one rate when every item has it, else none.
  const rates = [...new Set(items.map(rateOf))]
  const gstRate = rates.length === 1 ? rates[0] : null
  const igst = gst
  const discount = Math.min(subtotal, Math.max(0, Number(appliedDiscount) || 0))
  const finalSubtotal = Math.max(0, subtotal - discount)
  const total = finalSubtotal + gst

  return { subtotal, discount, finalSubtotal, gst, cgst, sgst, igst, gstRate, total }
}

export function withItemAdded(items, line, quantity = 1) {
  const id = keyOf(line)
  const index = items.findIndex(item => sameLine(item, line))
  const addQty = Math.max(1, Number(quantity) || 1)
  if (index > -1) return items.map((item, i) => (i === index ? { ...item, qty: item.qty + addQty } : item))
  // _id mirrors id so every page keys a line off the same value.
  return [...items, ...normalizeCart([{ ...line, id, _id: id, qty: addQty }])]
}

// A guest basket joins the account's basket at sign-in: the same product in
// the same pack adds up; anything else is added.
export function mergeCarts(accountItems, guestItems) {
  const merged = accountItems.map(item => ({ ...item }))
  guestItems.forEach(item => {
    const existing = merged.find(line => sameLine(line, item))
    if (existing) existing.qty += item.qty
    else merged.push({ ...item })
  })
  return merged
}

// Only the product, pack size and quantity are sent: the server works out every price.
export const orderLine = item => ({ id: keyOf(item), qty: Number(item.qty || 1), selectedPack: item.selectedPack || '' })

export const initialFields = user => ({
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

// A saved address in the form, keeping the contact details already there.
export function fieldsFromAddress(fields, address) {
  const label = address.label || 'Home'
  return {
    ...fields,
    ...Object.fromEntries(ADDRESS_KEYS.map(key => [key, address[key] || ''])),
    addressLabel: ADDRESS_LABELS.includes(label) ? label : fields.addressLabel,
  }
}

// An empty address form, keeping the contact details already typed.
export function blankAddress(fields, user) {
  const blank = initialFields(user)
  CONTACT_FIELDS.forEach(key => { blank[key] = fields[key] })
  return blank
}

// Every delivery detail an order needs; the checkout marks each with *.
// detailProblems below checks exactly these (a test keeps the two in step).
export const REQUIRED_DETAILS = ['customerName', 'customerPhone', 'doorNo', 'pincode', 'street', 'area', 'taluk', 'district', 'state']

// The server's checks (readCustomerDetails in server/server.js): a name, a
// 10-digit mobile number and every address field, with a 6-digit PIN code.
// Returns { field: 'required' | 'phone' | 'pincode' | 'state' }, empty when
// the order can go ahead.
export function detailProblems(fields) {
  const problems = {}
  const filled = key => String(fields[key] || '').trim() !== ''
  if (!filled('customerName')) problems.customerName = 'required'
  if (!/^\d{10}$/.test(String(fields.customerPhone || '').replace(/\D/g, '').slice(-10))) problems.customerPhone = 'phone'
  ;['doorNo', 'street', 'area', 'taluk'].forEach(key => {
    if (!filled(key)) problems[key] = 'required'
  })
  if (!/^\d{6}$/.test(String(fields.pincode || ''))) problems.pincode = 'pincode'
  if (!filled('district')) problems.district = 'required'
  if (!filled('state')) problems.state = 'state'
  return problems
}

// The customer part of an order request: the fields, the address field by
// field, and the one-line address kept for messages.
export function customerDetails(fields) {
  const f = fields
  const addressDetails = {
    label: f.addressLabel || 'Home', doorNo: f.doorNo, street: f.street, area: f.area,
    taluk: f.taluk, pincode: f.pincode, district: f.district, state: f.state,
  }
  const address = [f.doorNo, f.street, f.area, f.taluk, f.district, f.state, f.pincode].filter(Boolean).join(', ')
  return { ...f, addressDetails, address }
}
