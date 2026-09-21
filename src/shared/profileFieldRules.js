/**
 * The customer information form an admin builds (Admin → Profile Form Builder)
 * and the rules every screen that uses it follows: store sign-up, the /register
 * page, Edit profile, the admin customer view and the server.
 *
 * Built-in fields map to the user's own columns (name, phone, crop...), so the
 * rest of the app (orders, advisories, delivery) keeps reading them as before.
 * Fields an admin adds are stored under user.profile[id].
 *
 * Pure functions only, so the rules can be tested without a database.
 */

export const FIELD_TYPES = ['text', 'email', 'tel', 'number', 'date', 'textarea', 'select']

// Only what is shown before the shop's own crop list arrives with the profile
// form (server/server.js, withCatalogCrops). Kept in step with
// DEFAULT_CATALOG_OPTIONS.crops in server/db.js, which is what an admin edits.
export const CROP_CHOICES = [
  'Paddy / Rice',
  'Wheat',
  'Cotton',
  'Tomato',
  'Corn / Maize',
  'Sugarcane',
  'Citrus / Fruits',
  'Grapes / Fruits',
  'Potato',
  'All Crops',
]

// A farmer grows more than one crop. They are kept in the one crop column,
// comma-separated ("Paddy / Rice, Cotton"), so every screen that shows
// user.crop, and the advisories and orders that read it, keep working.
export const MAX_CROPS = 6
export const ALL_CROPS = 'All Crops'

// "Paddy / Rice, Cotton" or ['Paddy / Rice', 'Cotton'] -> ['Paddy / Rice', 'Cotton'].
// Trimmed, blanks and repeats dropped, first spelling kept.
export function cropList(value) {
  const parts = Array.isArray(value) ? value : String(value ?? '').split(',')
  const seen = new Set()
  const out = []
  for (const part of parts) {
    const crop = String(part ?? '').trim().replace(/\s+/g, ' ')
    const key = crop.toLowerCase()
    if (!crop || seen.has(key)) continue
    seen.add(key)
    out.push(crop)
  }
  return out
}

export const joinCrops = list => cropList(list).join(', ')

// Picking or unpicking one crop. "All Crops" stands alone: choosing it clears
// the rest, choosing a crop clears it. Never more than MAX_CROPS.
export function toggleCrop(value, crop) {
  const list = cropList(value)
  const has = list.some(item => item.toLowerCase() === crop.toLowerCase())
  if (has) return joinCrops(list.filter(item => item.toLowerCase() !== crop.toLowerCase()))
  if (crop === ALL_CROPS) return ALL_CROPS
  const rest = list.filter(item => item !== ALL_CROPS)
  return rest.length >= MAX_CROPS ? joinCrops(rest) : joinCrops([...rest, crop])
}

// type: the input it always uses. fixed: cannot be removed. lockRequired /
// lockEditable: the value those switches always have.
export const CORE_FIELDS = {
  name: { type: 'text', fixed: true, lockRequired: true },
  phone: { type: 'tel', fixed: true, lockRequired: true, lockEditable: false },
  email: { type: 'email' },
  village: { type: 'text' },
  district: { type: 'text' },
  state: { type: 'text' },
  crop: { type: 'select', options: CROP_CHOICES },
  acreage: { type: 'number' },
}

export const DEFAULT_PROFILE_FIELDS = [
  { id: 'name', title: 'Full name', type: 'text', required: true, editable: true },
  { id: 'email', title: 'Email address', type: 'email', required: false, editable: true },
  { id: 'phone', title: 'Mobile number', type: 'tel', required: true, editable: false },
  { id: 'village', title: 'Village / town', type: 'text', required: true, editable: true },
  { id: 'district', title: 'District', type: 'text', required: false, editable: true },
  { id: 'state', title: 'State', type: 'text', required: false, editable: true },
  { id: 'crop', title: 'Your crops', type: 'select', required: false, editable: true },
  { id: 'acreage', title: 'Farm size (acres)', type: 'number', required: false, editable: true },
]

// Farm size may be part of an acre (2.5, 0.75): up to two decimal places.
export const ACRE_LIMITS = { min: 0.1, max: 9999, decimals: 2 }

// What an acre box keeps while typing: digits and one point, at most four
// whole digits and two after the point. "2,5" (a comma keyboard) reads as 2.5.
export function acreInput(value) {
  const [whole = '', ...rest] = String(value ?? '').replace(/,/g, '.').replace(/[^\d.]/g, '').split('.')
  const digits = whole.slice(0, 4)
  return rest.length ? `${digits}.${rest.join('').slice(0, ACRE_LIMITS.decimals)}` : digits
}

// One acre more or fewer, keeping the part of an acre already typed.
export function stepAcres(value, delta) {
  const next = Math.round(((Number(value) || 0) + delta) * 100) / 100
  return String(Math.min(ACRE_LIMITS.max, Math.max(ACRE_LIMITS.min, next)))
}
const MAX_FIELDS = 40
const MAX_OPTIONS = 30
// Ids a custom field may never take: they belong to the account itself.
const RESERVED_IDS = new Set(['id', '_id', 'password', 'role', 'status', 'createdBy', 'createdAt', 'updatedAt', 'profile', 'addresses', 'lastLogin', 'department'])

export const isCoreField = id => Object.prototype.hasOwnProperty.call(CORE_FIELDS, id)

const text = (value, max) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)

// Cleans whatever an admin saved (or an older saved form) into a form every
// screen can render: known types, unique safe ids, built-in rules applied, and
// name and mobile number always present.
export function normalizeProfileFields(input) {
  const list = Array.isArray(input) ? input : []
  const seen = new Set()
  const out = []
  list.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object' || out.length >= MAX_FIELDS) return
    let id = String(raw.id || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60)
    if (!id || RESERVED_IDS.has(id)) id = `profile-field-${index + 1}`
    while (seen.has(id)) id = `${id}-x`
    let title = text(raw.title, 60)
    // Forms saved when only one crop could be picked still say so.
    if (id === 'crop' && /^primary crop$/i.test(title)) title = 'Your crops'
    if (!title) return
    seen.add(id)
    const core = CORE_FIELDS[id]
    let type = core ? core.type : (FIELD_TYPES.includes(raw.type) ? raw.type : 'text')
    let options = core?.options || (Array.isArray(raw.options) ? [...new Set(raw.options.map(option => text(option, 60)).filter(Boolean))].slice(0, MAX_OPTIONS) : [])
    // A dropdown with nothing to choose becomes a plain text field.
    if (type === 'select' && !options.length) type = 'text'
    if (type !== 'select') options = []
    out.push({
      id,
      title,
      type,
      required: core?.lockRequired ?? raw.required === true,
      editable: core?.lockEditable ?? raw.editable !== false,
      options,
    })
  })
  for (const id of ['phone', 'name']) {
    if (!seen.has(id)) {
      const fallback = DEFAULT_PROFILE_FIELDS.find(field => field.id === id)
      out.unshift({ ...fallback, options: [] })
    }
  }
  return out
}

// The value a user currently has for a field.
export function profileValueOf(user, field) {
  if (!user) return ''
  const value = isCoreField(field.id)
    ? (field.id === 'crop' ? user.crop || user.primaryCrop : field.id === 'acreage' ? user.acreage || user.landAcres : user[field.id])
    : user.profile?.[field.id]
  return value ?? ''
}

// Checks answers against the form. Returns cleaned values (numbers as numbers)
// and one message per field that needs fixing.
//   only: the field ids to check (others are ignored).
//   partial: a field not present in `values` is left alone (profile edits).
export function validateProfileValues(fields, values, { only, partial = false } = {}) {
  const clean = {}
  const errors = {}
  const source = values || {}
  for (const field of fields) {
    if (only && !only.includes(field.id)) continue
    if (partial && !Object.prototype.hasOwnProperty.call(source, field.id)) continue
    if (field.id === 'crop') {
      const crops = cropList(source.crop).map(crop => text(crop, 60))
      if (crops.length > MAX_CROPS) errors.crop = `Choose up to ${MAX_CROPS} crops.`
      else if (!crops.length && field.required) errors.crop = 'Please choose at least one crop.'
      else clean.crop = joinCrops(crops)
      continue
    }
    const raw = source[field.id]
    const value = field.type === 'textarea' ? String(raw ?? '').trim().slice(0, 500) : text(raw, field.id === 'email' ? 120 : 80)
    if (!value) {
      if (field.required) errors[field.id] = `${field.title} is required.`
      else clean[field.id] = field.type === 'number' ? null : ''
      continue
    }
    const problem = problemWith(field, value)
    if (problem) errors[field.id] = problem
    else clean[field.id] = field.type === 'number' ? Number(value) : field.type === 'email' ? value.toLowerCase() : value
  }
  return { values: clean, errors }
}

function problemWith(field, value) {
  switch (field.type) {
    case 'email':
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? '' : 'Please enter a valid email address.'
    case 'tel':
      return /^[6-9]\d{9}$/.test(value.replace(/\D/g, '')) ? '' : 'Please enter a 10-digit mobile number.'
    case 'number': {
      const number = Number(value)
      if (field.id === 'acreage') {
        const places = /^\d+(\.\d{1,2})?$/.test(value)
        return places && number >= ACRE_LIMITS.min && number <= ACRE_LIMITS.max ? '' : 'Farm size must be 0.1 to 9999 acres, up to 2 decimal places.'
      }
      return Number.isFinite(number) && number >= 0 ? '' : `${field.title} must be a number.`
    }
    case 'date': {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`)
      return date && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? '' : 'Please choose a valid date.'
    }
    case 'select':
      // Built-in crops saved before the list changed stay valid.
      return field.id === 'crop' || field.options.includes(value) ? '' : `Please choose a ${field.title.toLowerCase()} from the list.`
    default:
      // Names are typed in any script: at least two letters, not a number.
      if (field.id === 'name' && (value.match(/\p{L}/gu) || []).length < 2) return 'Please enter your name, not a number.'
      return ''
  }
}

// Splits checked values into the user's own columns and user.profile.
export function splitProfileValues(values) {
  const core = {}
  const profile = {}
  for (const [id, value] of Object.entries(values || {})) {
    if (isCoreField(id)) core[id] = value
    else profile[id] = value
  }
  return { core, profile }
}
