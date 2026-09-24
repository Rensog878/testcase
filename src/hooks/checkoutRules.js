// The basket and checkout rules, in one place for the floating checkout
// (useCheckout.js), the storefront, the product pages and the headers. No
// React, browser or network code here, so they run under node --test
// (src/shared/__tests__/checkoutRules.test.js).

export const GUEST_CART_KEY = 'sathya_cart_guest'
// Must match the server's calculation in priceCart() (server/server.js).
export const GST_RATE = 0.18
export const STAFF_HOME = { superadmin: '/superadmin', admin: '/admin', employee: '/employee', delivery: '/delivery', billing: '/billing' }
export const ADDRESS_LABELS = ['Home', 'Office', 'Farm']
// A label the customer types instead ("Godown", "Uncle's house"). The server
// keeps up to 30 characters.
export const CUSTOM_LABEL_MAX = 30
// Shown before each address label. A custom label gets the plain pin.
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

// A saved basket keeps the price and GST rate from when each line was added;
// the server charges today's. So the basket shows today's too: each line takes
// its product's current GST rate, and its pack's current price and MRP where
// the product sets one. Returns the same array when nothing changed.
export function withCurrentProducts(items, products) {
  const byId = new Map((Array.isArray(products) ? products : []).map(p => [String(p.id ?? p._id), p]))
  let changed = false
  const next = items.map(item => {
    const product = byId.get(String(keyOf(item)))
    if (!product) return item
    const update = {}
    const rate = Number(product.gstRate)
    if (product.gstRate !== undefined && product.gstRate !== null && product.gstRate !== '' && Number.isFinite(rate) && rate !== Number(item.gstRate)) update.gstRate = rate
    const pack = item.selectedPack
    const price = Number(product.packagePrices?.[pack])
    if (pack && price > 0 && price !== Number(item.price)) update.price = price
    const mrp = Number(product.packageMrps?.[pack])
    if (pack && mrp > 0 && mrp !== Number(item.originalPrice)) update.originalPrice = mrp
    if (!Object.keys(update).length) return item
    changed = true
    return { ...item, ...update }
  })
  return changed ? next : items
}

// Only the product, pack size and quantity are sent: the server works out every price.
export const orderLine = item => ({ id: keyOf(item), qty: Number(item.qty || 1), selectedPack: item.selectedPack || '' })

export const initialFields = user => ({
  addressLabel: 'Home',
  customerName: user?.name || '',
  customerPhone: user?.phone || user?.mobile || '',
  // Who receives at this address: the delivery team asks for and calls them.
  addressName: user?.name || '',
  addressPhone: user?.phone || user?.mobile || '',
  doorNo: '',
  street: '',
  area: user?.village || '',
  taluk: '',
  pincode: '',
  district: user?.district || '',
  state: STATES.includes(user?.state) ? user.state : '',
  // { lat, lng, accuracy } from "Use my current location"; optional.
  geo: null,
})

// A saved address in the form, keeping the contact details already there.
export function fieldsFromAddress(fields, address) {
  return {
    ...fields,
    ...Object.fromEntries(ADDRESS_KEYS.map(key => [key, address[key] || ''])),
    geo: address.geo || null,
    addressLabel: String(address.label || '').trim() || 'Home',
    // Addresses saved before each had its own number use the contact number.
    addressName: address.name || fields.customerName || '',
    addressPhone: address.phone || fields.customerPhone || '',
  }
}

// An empty address form, keeping the contact details already typed.
export function blankAddress(fields, user) {
  const blank = initialFields(user)
  CONTACT_FIELDS.forEach(key => { blank[key] = fields[key] })
  blank.addressName = fields.customerName || blank.addressName
  blank.addressPhone = fields.customerPhone || blank.addressPhone
  return blank
}

// Every delivery detail an order needs; the checkout marks each with *.
// detailProblems below checks exactly these (a test keeps the two in step).
export const REQUIRED_DETAILS = ['addressLabel', 'addressName', 'addressPhone', 'doorNo', 'pincode', 'street', 'area', 'taluk', 'district', 'state']

// The checkout asks only for the address and the person there. The order's
// contact is the signed-in account (its name and number fill customerName /
// customerPhone); when the account has none, the person at the address is used.
const validPhone = value => /^\d{10}$/.test(String(value || '').replace(/\D/g, '').slice(-10))
export function withContact(fields) {
  const name = String(fields.customerName || '').trim() || String(fields.addressName || '').trim()
  const phone = validPhone(fields.customerPhone) ? fields.customerPhone : fields.addressPhone || ''
  return { ...fields, customerName: name, customerPhone: phone }
}

// The server's checks (readCustomerDetails in server/server.js): a name, a
// 10-digit mobile number and every address field, with a 6-digit PIN code.
// Returns { field: 'required' | 'phone' | 'pincode' | 'state' }, empty when
// the order can go ahead.
export function detailProblems(input) {
  const fields = withContact(input)
  const problems = {}
  const filled = key => String(fields[key] || '').trim() !== ''
  if (!filled('addressLabel')) problems.addressLabel = 'required'
  if (!filled('addressName')) problems.addressName = 'required'
  // An Indian mobile, as the server's normalizePhone() accepts it.
  if (!/^[6-9]\d{9}$/.test(String(fields.addressPhone || '').replace(/\D/g, '').slice(-10))) problems.addressPhone = 'phone'
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
  const f = withContact(fields)
  const addressDetails = {
    label: String(f.addressLabel || '').trim().slice(0, CUSTOM_LABEL_MAX) || 'Home',
    name: String(f.addressName || '').trim(),
    phone: String(f.addressPhone || '').replace(/\D/g, '').slice(-10),
    doorNo: f.doorNo, street: f.street, area: f.area,
    taluk: f.taluk, pincode: f.pincode, district: f.district, state: f.state,
    ...(f.geo && { geo: f.geo }),
  }
  const address = [f.doorNo, f.street, f.area, f.taluk, f.district, f.state, f.pincode].filter(Boolean).join(', ')
  return { ...f, addressDetails, address }
}
